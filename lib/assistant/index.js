import {
  TOPIC_DEFINITIONS,
  assistantStatus,
  canUseTopic,
  parseQuestion,
  topicSuggestions
} from './intents.js';
import {
  auditSnapshot,
  attendanceSnapshot,
  clientSnapshot,
  financeSnapshot,
  pipelineSnapshot,
  staffSnapshot,
  surveySnapshot,
  visitorSnapshot
} from './data.js';
import {
  auditAnswer,
  attendanceAnswer,
  clientAnswer,
  financeAnswer,
  formatMoney,
  helpAnswer,
  overviewAnswer,
  pipelineAnswer,
  restrictedAnswer,
  staffAnswer,
  surveyAnswer,
  visitorAnswer
} from './answers.js';

function suggestionsFor(user, topic) {
  const def = TOPIC_DEFINITIONS[topic];
  if (def && canUseTopic(user, topic)) return def.suggestions;
  return topicSuggestions(user).slice(0, 3);
}

async function overviewResult(db, user, now) {
  const sections = [];
  const jobs = [];

  if (canUseTopic(user, 'visitors')) {
    jobs.push(visitorSnapshot(db, 'today', now).then((snapshot) => {
      sections.push({
        label: 'Visitors',
        text: snapshot.insideCount + ' on site, ' + snapshot.awaitingCount + ' awaiting approval, ' + snapshot.rangeTotal + ' visits today.'
      });
    }));
  }
  if (canUseTopic(user, 'staff')) {
    jobs.push(staffSnapshot(db, now).then((snapshot) => {
      sections.push({ label: 'Staff', text: snapshot.active + ' active of ' + snapshot.total + '.' });
    }));
  }
  if (canUseTopic(user, 'attendance')) {
    jobs.push(attendanceSnapshot(db, 'today', user, now).then((snapshot) => {
      sections.push({
        label: 'Attendance',
        text: snapshot.canViewAll
          ? snapshot.summary.present + ' in today, ' + snapshot.summary.late + ' late.'
          : snapshot.myRecord ? 'Your attendance is recorded today.' : 'No attendance record for you today.'
      });
    }));
  }
  if (canUseTopic(user, 'finance')) {
    jobs.push(financeSnapshot(db, 'month', now).then((snapshot) => {
      sections.push({
        label: 'Finance',
        text: formatMoney(snapshot.outstanding, snapshot.currency) + ' outstanding; '
          + formatMoney(snapshot.collected, snapshot.currency) + ' collected this month.'
      });
    }));
  }
  if (canUseTopic(user, 'survey')) {
    jobs.push(surveySnapshot(db, user, now).then((snapshot) => {
      sections.push({
        label: 'Surveying',
        text: snapshot.activeProjects + ' active projects, ' + snapshot.overdue + ' tasks overdue.'
      });
    }));
  }
  if (canUseTopic(user, 'audit')) {
    jobs.push(auditSnapshot(db, 'week', now).then((snapshot) => {
      sections.push({ label: 'Audit', text: snapshot.total + ' events this week.' });
    }));
  }
  if (canUseTopic(user, 'clients')) {
    jobs.push(clientSnapshot(db, 'month', now).then((snapshot) => {
      sections.push({ label: 'Clients', text: snapshot.total + ' on record, ' + snapshot.newClients + ' new this month.' });
    }));
  }
  if (canUseTopic(user, 'pipeline')) {
    jobs.push(pipelineSnapshot(db, 'week', now).then((snapshot) => {
      sections.push({
        label: 'Storefront',
        text: (snapshot.reservations.PENDING || 0) + ' reservations awaiting payment, ' + snapshot.newReservations + ' new this week.'
      });
    }));
  }

  await Promise.all(jobs);
  const order = ['Visitors', 'Staff', 'Attendance', 'Finance', 'Surveying', 'Audit', 'Clients', 'Storefront'];
  sections.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  return {
    answer: overviewAnswer(sections),
    topic: 'overview',
    generatedBy: 'local',
    data: { sections },
    suggestions: topicSuggestions(user)
  };
}

export const localAdapter = {
  id: 'local',
  async answer({ question, user, db, now = new Date() }) {
    const { topic, range } = parseQuestion(question);

    if (topic === 'help') {
      return {
        answer: helpAnswer(user),
        topic: 'help',
        generatedBy: 'local',
        data: {},
        suggestions: topicSuggestions(user)
      };
    }

    if (!canUseTopic(user, topic)) {
      return {
        answer: restrictedAnswer(topic),
        topic,
        generatedBy: 'local',
        data: { restricted: true },
        suggestions: topicSuggestions(user)
      };
    }

    if (topic === 'overview') {
      return overviewResult(db, user, now);
    }

    let answer;
    let data;
    if (topic === 'visitors') {
      data = await visitorSnapshot(db, range, now);
      answer = visitorAnswer(data);
    } else if (topic === 'staff') {
      data = await staffSnapshot(db, now);
      answer = staffAnswer(data);
    } else if (topic === 'attendance') {
      data = await attendanceSnapshot(db, range, user, now);
      answer = attendanceAnswer(data);
    } else if (topic === 'finance') {
      data = await financeSnapshot(db, range, now);
      answer = financeAnswer(data);
    } else if (topic === 'survey') {
      data = await surveySnapshot(db, user, now);
      answer = surveyAnswer(data);
    } else if (topic === 'clients') {
      data = await clientSnapshot(db, range, now);
      answer = clientAnswer(data);
    } else if (topic === 'pipeline') {
      data = await pipelineSnapshot(db, range, now);
      answer = pipelineAnswer(data);
    } else {
      data = await auditSnapshot(db, range, now);
      answer = auditAnswer(data, now);
    }

    return { answer, topic, generatedBy: 'local', data, suggestions: suggestionsFor(user, topic) };
  }
};

export async function answerQuestion(input, { adapter = localAdapter } = {}) {
  if (!adapter || typeof adapter.answer !== 'function') {
    throw new Error('Assistant adapter must provide an answer function.');
  }
  return adapter.answer(input);
}

/**
 * Adapter seam for a future LLM. `buildContext({ user, db, now })` must return a
 * permission-filtered snapshot only; the completion function receives that JSON
 * and must not be trusted to enforce permissions on its own.
 */
export function createLlmAdapter({ complete, buildContext, model = 'assistant' } = {}) {
  if (typeof complete !== 'function' || typeof buildContext !== 'function') {
    throw new Error('createLlmAdapter requires complete and buildContext functions.');
  }
  return {
    id: 'llm',
    async answer({ question, user, db, now = new Date() }) {
      const context = await buildContext({ user, db, now });
      const text = await complete({
        model,
        system: 'You are LandLedger Assistant. Answer only from the supplied JSON context. If the answer is not present, say so. Never invent names, amounts, or counts. Keep answers short.',
        prompt: JSON.stringify({ question, context })
      });
      return {
        answer: String(text || '').trim() || 'I could not find that in the live office data.',
        topic: 'llm',
        generatedBy: model,
        data: { context },
        suggestions: topicSuggestions(user)
      };
    }
  };
}

export { assistantStatus, canUseTopic, parseQuestion };
