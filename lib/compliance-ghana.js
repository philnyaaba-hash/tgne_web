export const COMPLIANCE_CATEGORIES = {
  CORPORATE: 'Corporate & ORC',
  TAX: 'Tax & revenue',
  PENSIONS: 'Employment & pensions',
  EMPLOYMENT: 'Employment & labour',
  DATA: 'Data protection',
  REAL_ESTATE: 'Real estate licensing',
  LAND: 'Land & property',
  LOCAL: 'Local permits'
};

export const COMPLIANCE_FREQUENCIES = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUAL: 'Annual',
  ONCE: 'One-time',
  EVENT: 'Per transaction'
};

export const COMPLIANCE_STATUSES = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  FILED: 'Filed',
  WAIVED: 'Not applicable',
  OVERDUE: 'Overdue'
};

export const COMPLIANCE_DISCLAIMER =
  'Operational checklist based on published Ghanaian requirements, not legal advice. Rates, fees and filing windows change; confirm due dates with the company accountant and the relevant authority.';

export const GHANA_AUTHORITIES = [
  { key: 'GRA', name: 'Ghana Revenue Authority', scope: 'TIN, corporate tax, VAT, PAYE, withholding tax, stamp duty', url: 'https://gra.gov.gh/' },
  { key: 'ORC', name: 'Office of the Registrar of Companies', scope: 'Incorporation, annual returns, beneficial ownership', url: 'https://orc.gov.gh/' },
  { key: 'SSNIT', name: 'Social Security and National Insurance Trust', scope: 'Employer registration and Tier 1 contributions', url: 'https://www.ssnit.org.gh/' },
  { key: 'NPRA', name: 'National Pensions Regulatory Authority', scope: 'Tier 2 and Tier 3 occupational schemes', url: 'https://npra.gov.gh/' },
  { key: 'DPC', name: 'Data Protection Commission', scope: 'Data controller registration and renewals', url: 'https://dataprotection.org.gh/' },
  { key: 'REAC', name: 'Real Estate Agency Council', scope: 'Firm, broker and agent licences, transaction certificates', url: 'https://reac.gov.gh/' },
  { key: 'LC', name: 'Lands Commission', scope: 'Registration of land documents and titles', url: 'https://www.lc.gov.gh/' },
  { key: 'GNFS', name: 'Ghana National Fire Service', scope: 'Fire certificates for premises', url: 'https://gnfs.gov.gh/' },
  { key: 'GIPC', name: 'Ghana Investment Promotion Centre', scope: 'Foreign-investment registration and annual renewal', url: 'https://www.gipc.gov.gh/' }
];

export const COMPLIANCE_OBLIGATIONS = [
  {
    key: 'gra_tin',
    title: 'Tax Identification Number (TIN)',
    authority: 'Ghana Revenue Authority',
    category: 'TAX',
    statute: 'Revenue Administration Act, 2016 (Act 915)',
    frequency: 'ONCE',
    schedule: { kind: 'once' },
    description: 'Register the company with the GRA and obtain a TIN before filing returns, paying staff, or registering land documents.',
    evidence: 'TIN certificate or GRA registration letter',
    portal: 'https://gra.gov.gh/'
  },
  {
    key: 'orc_incorporation',
    title: 'Company registration',
    authority: 'Office of the Registrar of Companies',
    category: 'CORPORATE',
    statute: 'Companies Act, 2019 (Act 992)',
    frequency: 'ONCE',
    schedule: { kind: 'once' },
    description: 'Hold the certificate of incorporation, constitution, and beneficial ownership declaration. Keep the registered office and directors current.',
    evidence: 'Certificate of incorporation and company profile',
    portal: 'https://orc.gov.gh/'
  },
  {
    key: 'orc_annual_return',
    title: 'Annual return and financial statements',
    authority: 'Office of the Registrar of Companies',
    category: 'CORPORATE',
    statute: 'Companies Act, 2019 (Act 992)',
    frequency: 'ANNUAL',
    schedule: { kind: 'annual', month: 5, day: 30 },
    description: 'File the annual return with audited financial statements and update beneficial ownership. The ORC announces its filing window each year; the 2026 window was extended to 30 June.',
    evidence: 'ORC filing receipt and stamped financial statements',
    portal: 'https://orc.gov.gh/'
  },
  {
    key: 'cit_return',
    title: 'Corporate income tax return',
    authority: 'Ghana Revenue Authority',
    category: 'TAX',
    statute: 'Income Tax Act, 2015 (Act 896)',
    frequency: 'ANNUAL',
    schedule: { kind: 'annual', month: 3, day: 30 },
    description: 'File the final corporate income tax return with audited accounts within four months of the 31 December year-end.',
    evidence: 'GRA acknowledgement and audited accounts',
    portal: 'https://gra.gov.gh/'
  },
  {
    key: 'cit_provisional',
    title: 'Provisional corporate tax instalments',
    authority: 'Ghana Revenue Authority',
    category: 'TAX',
    statute: 'Income Tax Act, 2015 (Act 896)',
    frequency: 'QUARTERLY',
    schedule: { kind: 'quarterly', months: [2, 5, 8, 11] },
    description: 'Pay four provisional instalments based on estimated chargeable income, due at the end of March, June, September, and December.',
    evidence: 'GRA payment receipts for each instalment',
    portal: 'https://gra.gov.gh/'
  },
  {
    key: 'paye',
    title: 'PAYE return and payment',
    authority: 'Ghana Revenue Authority',
    category: 'TAX',
    statute: 'Income Tax Act, 2015 (Act 896)',
    frequency: 'MONTHLY',
    schedule: { kind: 'monthly', dueDay: 15 },
    description: 'File and pay PAYE deducted from the previous month payroll by the 15th of the following month.',
    evidence: 'GRA PAYE return acknowledgement and payment receipt',
    portal: 'https://gra.gov.gh/'
  },
  {
    key: 'wht',
    title: 'Withholding tax return and payment',
    authority: 'Ghana Revenue Authority',
    category: 'TAX',
    statute: 'Income Tax Act, 2015 (Act 896)',
    frequency: 'MONTHLY',
    schedule: { kind: 'monthly', dueDay: 15 },
    description: 'File and pay withholding tax deducted on rent, professional services, and contracts by the 15th of the following month.',
    evidence: 'GRA WHT return acknowledgement and payment receipt',
    portal: 'https://gra.gov.gh/'
  },
  {
    key: 'vat',
    title: 'VAT, NHIL and GETFund return',
    authority: 'Ghana Revenue Authority',
    category: 'TAX',
    statute: 'Value Added Tax Act, 2013 (Act 870)',
    frequency: 'MONTHLY',
    schedule: { kind: 'monthly', dueDay: 'last' },
    description: 'File and pay VAT and the associated levies by the last working day of the month following the tax period. Only applies if the company is VAT-registered.',
    evidence: 'GRA VAT return acknowledgement and payment receipt',
    portal: 'https://gra.gov.gh/',
    conditional: true
  },
  {
    key: 'ssnit_tier1',
    title: 'SSNIT Tier 1 contributions',
    authority: 'Social Security and National Insurance Trust',
    category: 'PENSIONS',
    statute: 'National Pensions Act, 2008 (Act 766)',
    frequency: 'MONTHLY',
    schedule: { kind: 'monthly', dueDay: 14 },
    description: 'Remit statutory Tier 1 employer and employee contributions and submit the monthly contribution report by the 14th.',
    evidence: 'SSNIT contribution report and payment receipt',
    portal: 'https://www.ssnit.org.gh/'
  },
  {
    key: 'ssnit_tier2',
    title: 'Tier 2 occupational pension',
    authority: 'National Pensions Regulatory Authority',
    category: 'PENSIONS',
    statute: 'National Pensions Act, 2008 (Act 766)',
    frequency: 'MONTHLY',
    schedule: { kind: 'monthly', dueDay: 14 },
    description: 'Remit the mandatory employer Tier 2 contribution to the approved occupational scheme trustee and submit the employee schedule by the 14th.',
    evidence: 'Trustee remittance receipt and contribution schedule',
    portal: 'https://npra.gov.gh/'
  },
  {
    key: 'ssnit_employer_registration',
    title: 'SSNIT employer registration',
    authority: 'Social Security and National Insurance Trust',
    category: 'PENSIONS',
    statute: 'National Pensions Act, 2008 (Act 766)',
    frequency: 'ONCE',
    schedule: { kind: 'once' },
    description: 'Register as an employer and obtain an employer number before the first payroll run.',
    evidence: 'SSNIT employer registration certificate',
    portal: 'https://www.ssnit.org.gh/'
  },
  {
    key: 'dpc_registration',
    title: 'Data controller registration',
    authority: 'Data Protection Commission',
    category: 'DATA',
    statute: 'Data Protection Act, 2012 (Act 843)',
    frequency: 'ONCE',
    schedule: { kind: 'once' },
    description: 'Register before processing personal data, appoint a data protection supervisor, and renew every two years. DPC compliance checks began on 5 October 2026.',
    evidence: 'DPC registration certificate and renewal receipt',
    portal: 'https://dataprotection.org.gh/'
  },
  {
    key: 'reac_firm_licence',
    title: 'Real estate firm licence',
    authority: 'Real Estate Agency Council',
    category: 'REAL_ESTATE',
    statute: 'Real Estate Agency Act, 2020 (Act 1047)',
    frequency: 'ANNUAL',
    schedule: { kind: 'annual', month: 11, day: 31 },
    description: 'Firms, brokers, and agents that sell, let, or manage property for others need a REAC licence, renewable every year.',
    evidence: 'Current REAC licence certificate',
    portal: 'https://reac.gov.gh/',
    conditional: true
  },
  {
    key: 'reac_transaction_certificate',
    title: 'REAC transaction certificate',
    authority: 'Real Estate Agency Council',
    category: 'REAL_ESTATE',
    statute: 'Real Estate Agency Act, 2020 (Act 1047)',
    frequency: 'EVENT',
    schedule: { kind: 'event' },
    description: 'Obtain a transaction certificate for each brokerage transaction and verify both parties identification before completing the deal.',
    evidence: 'REAC transaction certificate for the deal',
    portal: 'https://reac.gov.gh/',
    conditional: true
  },
  {
    key: 'bop',
    title: 'Business Operating Permit',
    authority: 'District Assembly',
    category: 'LOCAL',
    statute: 'Local Governance Act, 2016 (Act 936); LI 2407',
    frequency: 'ANNUAL',
    schedule: { kind: 'annual', month: 2, day: 31 },
    description: 'Apply to the district assembly where the business operates and renew annually. Requirements, fees, and renewal months vary by assembly.',
    evidence: 'Current Business Operating Permit',
    portal: null
  },
  {
    key: 'fire_certificate',
    title: 'Fire certificate',
    authority: 'Ghana National Fire Service',
    category: 'LOCAL',
    statute: 'Ghana National Fire Service Act, 1997 (Act 537)',
    frequency: 'ANNUAL',
    schedule: { kind: 'annual', month: 11, day: 31 },
    description: 'Obtain and renew the fire certificate for office, warehouse, and customer-facing premises after the GNFS inspection.',
    evidence: 'Current GNFS fire certificate',
    portal: 'https://gnfs.gov.gh/',
    conditional: true
  },
  {
    key: 'stamp_duty',
    title: 'Stamp duty on property instruments',
    authority: 'Ghana Revenue Authority',
    category: 'LAND',
    statute: 'Stamp Duty Act, 2005 (Act 689)',
    frequency: 'EVENT',
    schedule: { kind: 'event' },
    description: 'Stamp leases, transfers, and charges within two months of execution before presenting them for registration.',
    evidence: 'Stamped instrument and GRA payment receipt',
    portal: 'https://gra.gov.gh/'
  },
  {
    key: 'land_registration',
    title: 'Registration of land documents',
    authority: 'Lands Commission',
    category: 'LAND',
    statute: 'Land Act, 2020 (Act 1036)',
    frequency: 'EVENT',
    schedule: { kind: 'event' },
    description: 'Register stamped instruments and title documents at the Lands Commission. Registration is compulsory under Act 1036 and late instruments attract penalties.',
    evidence: 'Lands Commission registration receipt and title document',
    portal: 'https://www.lc.gov.gh/'
  },
  {
    key: 'labour_contracts',
    title: 'Written employment particulars',
    authority: 'Ministry of Employment and Labour Relations',
    category: 'EMPLOYMENT',
    statute: 'Labour Act, 2003 (Act 651)',
    frequency: 'EVENT',
    schedule: { kind: 'event' },
    description: 'Issue written particulars within two months of hiring and keep records of hours, leave, and termination. The National Labour Commission handles disputes.',
    evidence: 'Signed employment contract and personnel file',
    portal: null
  },
  {
    key: 'gipc_registration',
    title: 'GIPC registration and annual renewal',
    authority: 'Ghana Investment Promotion Centre',
    category: 'CORPORATE',
    statute: 'Ghana Investment Promotion Centre Act, 2013 (Act 865); Act 1173 (2026)',
    frequency: 'ANNUAL',
    schedule: { kind: 'annual', month: 11, day: 31 },
    description: 'Enterprises with foreign participation must register with GIPC and renew annually under the 2026 framework.',
    evidence: 'GIPC registration certificate and renewal receipt',
    portal: 'https://www.gipc.gov.gh/',
    conditional: true
  }
];

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function dateAt(year, month, day) {
  const safeDay = day === 'last' ? lastDayOfMonth(year, month) : Math.min(day, lastDayOfMonth(year, month));
  return new Date(Date.UTC(year, month, safeDay, 12));
}

export function currentCycle(obligation, now = new Date()) {
  const schedule = obligation.schedule || { kind: 'once' };
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  if (schedule.kind === 'monthly') {
    const dueMonth = month === 11 ? 0 : month + 1;
    const dueYear = month === 11 ? year + 1 : year;
    return {
      period: year + '-' + String(month + 1).padStart(2, '0'),
      dueDate: dateAt(dueYear, dueMonth, schedule.dueDay)
    };
  }

  if (schedule.kind === 'quarterly') {
    const quarter = Math.floor(month / 3);
    const dueMonth = schedule.months[quarter];
    return {
      period: year + '-Q' + (quarter + 1),
      dueDate: dateAt(year, dueMonth, 'last')
    };
  }

  if (schedule.kind === 'annual') {
    return {
      period: String(year),
      dueDate: dateAt(year, schedule.month, schedule.day)
    };
  }

  if (schedule.kind === 'event') {
    return { period: 'ONGOING', dueDate: null };
  }

  return { period: 'ONCE', dueDate: null };
}

export function effectiveStatus(item, now = new Date()) {
  if (item.status === 'FILED' || item.status === 'WAIVED') return item.status;
  if (!item.dueDate) return item.status;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(item.dueDate).getTime() < today ? 'OVERDUE' : item.status;
}

export function daysUntil(dueDate, now = new Date()) {
  if (!dueDate) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((new Date(dueDate).getTime() - today) / 86400000);
}

export function complianceStats(items, now = new Date()) {
  const year = now.getUTCFullYear();
  const open = items.filter((item) => item.status === 'PENDING' || item.status === 'IN_PROGRESS');
  const overdue = open.filter((item) => effectiveStatus(item, now) === 'OVERDUE');
  const overdueIds = new Set(overdue.map((item) => item.id));
  const dueSoon = open.filter((item) => {
    if (overdueIds.has(item.id)) return false;
    const days = daysUntil(item.dueDate, now);
    return days != null && days >= 0 && days <= 30;
  });
  const filedThisYear = items.filter((item) => {
    if (item.status !== 'FILED' || !item.filedAt) return false;
    return new Date(item.filedAt).getUTCFullYear() === year;
  });
  const tracked = open.length + filedThisYear.length;
  return {
    score: tracked ? Math.round(((tracked - overdue.length) / tracked) * 100) : 100,
    overdue: overdue.length,
    dueSoon: dueSoon.length,
    filedThisYear: filedThisYear.length,
    open: open.length
  };
}
