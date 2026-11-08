/* LandLedger — expense entry actions */
'use strict';

const EXPENSE_EVIDENCE_MAX_COUNT = 5;
const EXPENSE_EVIDENCE_MAX_SIZE = 8 * 1024 * 1024;
const EXPENSE_EVIDENCE_MAX_DIMENSION = 1440;

function expenseEvidenceHTML() {
  const items = state.expenseEvidenceDraft || [];
  return '<div class="expense-evidence-list">' + items.map((item, index) =>
    '<div class="expense-evidence-thumb"><button type="button" class="expense-evidence-preview" data-action="preview-expense-evidence" data-evidence-index="' + index + '" aria-label="Preview ' + esc(item.name) + '"><img src="' + esc(item.dataUrl) + '" alt="' + esc(item.name) + '"></button><span><strong>' + esc(item.name) + '</strong><small>Image evidence</small></span><button type="button" class="mini-btn" data-action="remove-expense-evidence" data-evidence-index="' + index + '" aria-label="Remove ' + esc(item.name) + '">' + icon('x', 13) + '</button></div>'
  ).join('') + '</div>';
}

function updateExpenseEvidencePreview() {
  const wrap = $('#expenseEvidencePreview');
  if (wrap) wrap.innerHTML = expenseEvidenceHTML();
  const count = $('#expenseEvidenceCount');
  if (count) count.textContent = state.expenseEvidenceDraft.length + ' of ' + EXPENSE_EVIDENCE_MAX_COUNT + ' images';
  const add = $('#add-expense-evidence');
  if (add) add.disabled = state.expenseEvidenceDraft.length >= EXPENSE_EVIDENCE_MAX_COUNT;
}

function compressExpenseEvidence(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read ' + file.name + '.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Could not open ' + file.name + '.'));
      image.onload = () => {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        if (!width || !height) { reject(new Error('Image dimensions are invalid for ' + file.name + '.')); return; }
        const scale = Math.min(1, EXPENSE_EVIDENCE_MAX_DIMENSION / Math.max(width, height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d');
        if (!context) { reject(new Error('Could not prepare ' + file.name + ' for storage.')); return; }
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        try {
          resolve({ id: S.uid('evidence-'), name: file.name, type: 'image/jpeg', dataUrl: canvas.toDataURL('image/jpeg', 0.78) });
        } catch (error) {
          reject(new Error('Could not compress ' + file.name + ' for storage.'));
        }
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function addExpenseEvidence(files) {
  const picked = Array.from(files || []);
  if (!picked.length) return;
  const remaining = EXPENSE_EVIDENCE_MAX_COUNT - state.expenseEvidenceDraft.length;
  if (picked.length > remaining) { toast('You can attach up to ' + EXPENSE_EVIDENCE_MAX_COUNT + ' images per expense.', 'warn'); return; }
  const invalid = picked.find((file) => !/^image\/(?:jpeg|png|webp|gif)$/i.test(file.type || ''));
  if (invalid) { toast('Expense evidence must be a JPEG, PNG, WebP or GIF image.', 'warn'); return; }
  const tooLarge = picked.find((file) => file.size > EXPENSE_EVIDENCE_MAX_SIZE);
  if (tooLarge) { toast('Choose evidence images under 8 MB each.', 'warn'); return; }
  const additions = [];
  try {
    for (const file of picked) additions.push(await compressExpenseEvidence(file));
  } catch (error) {
    toast(error.message || 'Could not process the selected evidence.', 'error');
    return;
  }
  state.expenseEvidenceDraft = state.expenseEvidenceDraft.concat(additions);
  updateExpenseEvidencePreview();
}

function removeExpenseEvidence(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.expenseEvidenceDraft.length) return;
  state.expenseEvidenceDraft.splice(index, 1);
  updateExpenseEvidencePreview();
}

function previewExpenseEvidence(index) {
  const item = state.expenseEvidenceDraft[index];
  if (!item) { toast('Expense image not found.', 'error'); return; }
  openModal({
    title: item.name,
    subtitle: 'Compressed image evidence attached to this expense.',
    size: 'wide',
    body: '<div class="expense-evidence-large"><img src="' + esc(item.dataUrl) + '" alt="' + esc(item.name) + '"></div>',
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Close</button>'
  });
}

function viewExpenseEvidence(expenseId) {
  const expense = (data.expenses || []).find((item) => item.id === expenseId);
  if (!expense || !Array.isArray(expense.evidence) || !expense.evidence.length) { toast('No image evidence is attached to this expense.', 'warn'); return; }
  openModal({
    title: 'Expense evidence',
    subtitle: expense.description,
    size: 'wide',
    body: '<div class="expense-evidence-gallery">' + expense.evidence.map((item) =>
      '<figure><img src="' + esc(item.dataUrl) + '" alt="' + esc(item.name) + '"><figcaption>' + esc(item.name) + '</figcaption></figure>'
    ).join('') + '</div>',
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Close</button>'
  });
}

function openExpenseForm(expenseId) {
  if (!requirePermission('expenses.manage')) return;
  const expense = expenseId ? (data.expenses || []).find((item) => item.id === expenseId) : null;
  if (expenseId && !expense) { toast('Expense not found.', 'error'); return; }
  const item = expense || { date: todayValue(), category: 'Operations', description: '', amount: '', paidTo: '', method: 'Mobile Money', reference: '', notes: '' };
  state.expenseEvidenceDraft = (item.evidence || []).map((image) => Object.assign({}, image));
  const categories = EXPENSE_CATEGORIES.map((category) =>
    '<option value="' + esc(category) + '"' + (item.category === category ? ' selected' : '') + '>' + esc(category) + '</option>'
  ).join('');
  const methods = ['Cash', 'Mobile Money', 'Bank transfer', 'Cheque', 'Card', 'Other'].map((method) =>
    '<option value="' + esc(method) + '"' + (item.method === method ? ' selected' : '') + '>' + esc(method) + '</option>'
  ).join('');
  openModal({
    title: expense ? 'Edit expense' : 'Record an expense',
    subtitle: 'Keep operating costs and supporting references in your transaction ledger.',
    size: 'wide',
    body: '<form id="expense-form" novalidate><input type="hidden" id="expenseId" value="' + esc(item.id || '') + '"><div class="form-grid">' +
      '<div class="field"><label for="expenseDescription">Description <span class="req">*</span></label><input id="expenseDescription" value="' + esc(item.description) + '" placeholder="Site clearing" autofocus><span class="error"></span></div>' +
      '<div class="field"><label for="expenseAmount">Amount (GH₵) <span class="req">*</span></label><input id="expenseAmount" type="number" min="0.01" step="0.01" value="' + esc(item.amount) + '" placeholder="0.00"><span class="error"></span></div>' +
      '<div class="field"><label for="expenseDate">Date <span class="req">*</span></label><input id="expenseDate" type="date" value="' + esc(item.date) + '"><span class="error"></span></div>' +
      '<div class="field"><label for="expenseCategory">Category <span class="req">*</span></label><select id="expenseCategory">' + categories + '</select></div>' +
      '<div class="field"><label for="expensePaidTo">Paid to</label><input id="expensePaidTo" value="' + esc(item.paidTo || '') + '" placeholder="Supplier or recipient"></div>' +
      '<div class="field"><label for="expenseMethod">Payment method</label><select id="expenseMethod">' + methods + '</select></div>' +
      '<div class="field full"><label for="expenseReference">Reference</label><input id="expenseReference" value="' + esc(item.reference || '') + '" placeholder="Transfer ID, invoice number or receipt reference"></div>' +
      '<div class="field full"><label for="expenseNotes">Notes</label><textarea id="expenseNotes" placeholder="Additional accounting notes…">' + esc(item.notes || '') + '</textarea></div>' +
      '<div class="field full"><label>Image evidence</label><div class="expense-evidence-picker"><div><strong>Attach photos of receipts, invoices or work completed</strong><small>JPEG, PNG, WebP or GIF · max 8 MB each · compressed before saving</small></div><div class="expense-evidence-controls"><span id="expenseEvidenceCount">' + state.expenseEvidenceDraft.length + ' of ' + EXPENSE_EVIDENCE_MAX_COUNT + ' images</span><button type="button" class="btn btn-ghost btn-sm" id="add-expense-evidence" data-action="pick-expense-evidence">' + icon('upload', 13) + ' Add images</button></div><input type="file" id="expenseEvidenceInput" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden></div><div id="expenseEvidencePreview">' + expenseEvidenceHTML() + '</div></div>' +
    '</div></form>',
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>' +
      '<button type="submit" form="expense-form" class="btn btn-primary">' + icon('check', 15) + ' Save expense</button>'
  });
}

function saveExpenseFromForm() {
  if (!requirePermission('expenses.manage')) return;
  clearFieldErrors($('#expense-form'));
  const id = inputValue('expenseId');
  const description = inputValue('expenseDescription');
  const amount = numberValue('expenseAmount');
  const date = inputValue('expenseDate');
  let valid = true;
  if (!description) { fieldError($('#expenseDescription'), 'Enter an expense description.'); valid = false; }
  if (!Number.isFinite(amount) || amount <= 0) { fieldError($('#expenseAmount'), 'Enter an amount greater than zero.'); valid = false; }
  if (!date || isNaN(S.parseDate(date).getTime())) { fieldError($('#expenseDate'), 'Choose a valid expense date.'); valid = false; }
  if (!valid) return;
  const payload = {
    description,
    amount: Math.round(amount * 100) / 100,
    date,
    category: $('#expenseCategory').value,
    paidTo: inputValue('expensePaidTo'),
    method: $('#expenseMethod').value,
    reference: inputValue('expenseReference'),
    notes: inputValue('expenseNotes'),
    evidence: state.expenseEvidenceDraft.map((item) => Object.assign({}, item))
  };
  if (!Array.isArray(data.expenses)) data.expenses = [];
  const previousExpenses = data.expenses.slice();
  const previousActivities = (data.activities || []).slice();
  const financeSnapshot = window.FinanceApp ? FinanceApp.snapshot(data) : null;
  let expense;
  let previousExpense = null;
  if (id) {
    expense = data.expenses.find((item) => item.id === id);
    if (!expense) { toast('Expense not found.', 'error'); return; }
    previousExpense = Object.assign({}, expense);
    Object.assign(expense, payload);
    try {
      if (window.FinanceApp) FinanceApp.updateExpense(data, expense, previousExpense);
    } catch (err) {
      Object.assign(expense, previousExpense);
      if (window.FinanceApp) FinanceApp.restore(data, financeSnapshot);
      toast(err && err.message ? err.message : 'The expense could not be posted to the ledger.', 'error');
      return;
    }
    addActivity('expense', 'Updated expense: ' + expense.description, accountingMoney(expense.amount), expense.id);
  } else {
    expense = Object.assign({ id: S.uid('expense-'), ledgerRevision: 0, createdAt: new Date().toISOString() }, payload);
    data.expenses.push(expense);
    try {
      if (window.FinanceApp) FinanceApp.recordExpense(data, expense);
    } catch (err) {
      data.expenses = previousExpenses;
      if (window.FinanceApp) FinanceApp.restore(data, financeSnapshot);
      toast(err && err.message ? err.message : 'The expense could not be posted to the ledger.', 'error');
      return;
    }
    addActivity('expense', 'Recorded expense: ' + expense.description, accountingMoney(expense.amount), expense.id);
  }
  const result = S.save(data);
  if (!result.ok) {
    if (previousExpense) Object.assign(expense, previousExpense);
    data.expenses = previousExpenses;
    data.activities = previousActivities;
    if (window.FinanceApp) FinanceApp.restore(data, financeSnapshot);
    handleSaveResult(result);
    return;
  }
  handleSaveResult(result);
  if (window.Notify && !id) Notify.event('expense', 'Expense recorded · ' + expense.description + ' · ' + accountingMoney(expense.amount));
  state.expenseEvidenceDraft = [];
  closeModal();
  refresh();
  toast(id ? 'Expense updated.' : 'Expense recorded.');
}

function deleteExpense(expenseId) {
  if (!requirePermission('expenses.manage')) return;
  const expense = (data.expenses || []).find((item) => item.id === expenseId);
  if (!expense) { toast('Expense not found.', 'error'); return; }
  confirmAction({
    title: 'Delete this expense?',
    message: 'Remove "' + expense.description + '" (' + accountingMoney(expense.amount) + ') from the workspace? Its ledger entry will be reversed and the audit trail will keep both records.',
    confirmText: 'Delete expense'
  }).then((ok) => {
    if (!ok) return;
    const previousExpenses = data.expenses;
    const previousActivities = (data.activities || []).slice();
    const financeSnapshot = window.FinanceApp ? FinanceApp.snapshot(data) : null;
    try {
      if (window.FinanceApp) FinanceApp.voidExpense(data, expense, 'Expense deleted');
    } catch (err) {
      if (window.FinanceApp) FinanceApp.restore(data, financeSnapshot);
      toast(err && err.message ? err.message : 'The expense could not be reversed in the ledger.', 'error');
      return;
    }
    data.expenses = previousExpenses.filter((item) => item.id !== expenseId);
    addActivity('expense', 'Deleted expense: ' + expense.description, accountingMoney(expense.amount), null);
    const result = S.save(data);
    if (!result.ok) {
      data.expenses = previousExpenses;
      data.activities = previousActivities;
      if (window.FinanceApp) FinanceApp.restore(data, financeSnapshot);
      handleSaveResult(result);
      return;
    }
    handleSaveResult(result);
    refresh();
    toast('Expense deleted and reversed in the ledger.');
  });
}
