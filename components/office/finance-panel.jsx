'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api, downloadApiFile, Empty, Field, formatDate, Icon, jsonBody, money,
  Modal, PageHeading, Panel, readFileBase64, Stat, StatusBadge
} from './ui';

const TABS = [
  { key: 'invoices', label: 'Invoices' },
  { key: 'payments', label: 'Payments' },
  { key: 'expenses', label: 'Expenses' }
];

export default function FinancePanel({ user, notify, fail }) {
  const [data, setData] = useState({ invoices: [], payments: [], expenses: [], summary: {} });
  const [tab, setTab] = useState('invoices');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(undefined);
  const [paymentForm, setPaymentForm] = useState(undefined);
  const [expenseForm, setExpenseForm] = useState(undefined);

  const canManage = user.permissions.includes('finance.manage');
  const canApprove = user.permissions.includes('finance.approve');
  const canExport = user.permissions.includes('finance.export');

  const load = useCallback(async () => {
    try {
      setData(await api('/api/office/finance'));
    } catch (reason) {
      fail(reason.message);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => { load(); }, [load]);

  const summary = data.summary || {};
  const currency = summary.currency || 'GHS';

  async function saveInvoice(payload, invoice) {
    setBusy(true);
    try {
      if (invoice) {
        await api('/api/office/finance/invoices/' + encodeURIComponent(invoice.id), { method: 'PATCH', ...jsonBody(payload) });
        notify('Invoice ' + invoice.number + ' updated.');
      } else {
        await api('/api/office/finance/invoices', { method: 'POST', ...jsonBody(payload) });
        notify('Invoice created.');
      }
      setInvoiceForm(undefined);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateInvoiceStatus(invoice, status) {
    setBusy(true);
    try {
      await api('/api/office/finance/invoices/' + encodeURIComponent(invoice.id), { method: 'PATCH', ...jsonBody({ status }) });
      notify('Invoice ' + invoice.number + ' marked ' + status.toLowerCase() + '.');
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function savePayment(payload) {
    setBusy(true);
    try {
      await api('/api/office/finance/payments', { method: 'POST', ...jsonBody(payload) });
      notify('Payment recorded.');
      setPaymentForm(undefined);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveExpense(payload) {
    setBusy(true);
    try {
      await api('/api/office/finance/expenses', { method: 'POST', ...jsonBody(payload) });
      notify('Expense recorded and pending approval.');
      setExpenseForm(undefined);
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateExpense(expense, status) {
    setBusy(true);
    try {
      await api('/api/office/finance/expenses/' + encodeURIComponent(expense.id), { method: 'PATCH', ...jsonBody({ status }) });
      notify('Expense marked ' + status.toLowerCase() + '.');
      await load();
    } catch (reason) {
      fail(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    try {
      await downloadApiFile('/api/office/finance?format=csv', 'finance-report.csv');
      notify('Finance report exported.');
    } catch (reason) {
      fail(reason.message);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="FINANCE"
        title="Finance desk"
        description="Invoices, receipts, and operational expenses. Financial access is restricted to authorized roles."
        actions={<>
          {canExport ? <button className="office-button secondary" type="button" onClick={exportCsv}><Icon name="download" size={15} /> Export</button> : null}
          {canManage ? <button className="office-button primary" type="button" onClick={() => setInvoiceForm(null)}><Icon name="plus" size={15} /> New invoice</button> : null}
        </>}
      />

      <div className="office-stat-grid">
        <Stat label="Invoiced" value={money(summary.invoiced, currency)} hint={(summary.invoiceCount || 0) + ' invoices'} icon="report" />
        <Stat label="Collected" value={money(summary.collected, currency)} hint="All recorded payments" icon="money" tone="positive" />
        <Stat label="Outstanding" value={money(summary.outstanding, currency)} hint={(summary.openInvoices || 0) + ' open invoices'} icon="alert" tone={summary.outstanding ? 'warn' : ''} />
        <Stat label="Net position" value={money(summary.netPosition, currency)} hint="Collected less approved expenses" icon="grid" tone={(summary.netPosition || 0) >= 0 ? 'positive' : 'danger'} />
      </div>

      <div className="office-tabbar">
        {TABS.map((item) => <button key={item.key} type="button" className={tab === item.key ? 'active' : ''} onClick={() => setTab(item.key)}>{item.label}<span>{data[item.key]?.length || 0}</span></button>)}
      </div>

      {tab === 'invoices' ? (
        <Panel
          title="Invoices"
          subtitle="Track issued invoices, balances, and settlement."
          action={canManage ? <button className="office-button secondary" type="button" onClick={() => setPaymentForm({ invoice: null })}><Icon name="money" size={15} /> Record payment</button> : null}
        >
          <div className="office-table-wrap">
            <table className="office-table">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {data.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><strong>{invoice.number}</strong><small>{invoice.description}</small></td>
                    <td><strong>{invoice.customerName}</strong><small>{invoice.customerEmail || 'No email'}</small></td>
                    <td>{money(invoice.amount, invoice.currency)}</td>
                    <td>{money(invoice.paid, invoice.currency)}</td>
                    <td className={invoice.balance > 0 ? 'office-text-warn' : ''}>{money(invoice.balance, invoice.currency)}</td>
                    <td><strong>Issued {formatDate(invoice.issueDate)}</strong><small>Due {formatDate(invoice.dueDate)}</small></td>
                    <td><StatusBadge value={invoice.status} /></td>
                    <td><div className="office-row-actions">
                      {canManage && invoice.status !== 'VOID' && invoice.balance > 0 ? <button type="button" onClick={() => setPaymentForm({ invoice })}>Pay</button> : null}
                      {canManage ? <button type="button" onClick={() => setInvoiceForm(invoice)}>Edit</button> : null}
                      {canManage && invoice.status === 'DRAFT' ? <button type="button" onClick={() => updateInvoiceStatus(invoice, 'SENT')}>Send</button> : null}
                      {canManage && invoice.status !== 'VOID' && invoice.balance > 0 ? <button type="button" className="text-danger" onClick={() => updateInvoiceStatus(invoice, 'VOID')}>Void</button> : null}
                    </div></td>
                  </tr>
                ))}
                {!data.invoices.length ? <Empty colSpan={8}>{loading ? 'Loading invoices…' : 'No invoices recorded yet.'}</Empty> : null}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {tab === 'payments' ? (
        <Panel
          title="Payments"
          subtitle="Receipts recorded against invoices or unallocated payments."
          action={canManage ? <button className="office-button secondary" type="button" onClick={() => setPaymentForm({ invoice: null })}><Icon name="plus" size={15} /> Record payment</button> : null}
        >
          <div className="office-table-wrap">
            <table className="office-table">
              <thead><tr><th>Date</th><th>Payer</th><th>Invoice</th><th>Method</th><th>Reference</th><th>Amount</th><th>Recorded by</th></tr></thead>
              <tbody>
                {data.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.receivedAt)}</td>
                    <td><strong>{payment.payerName}</strong><small>{payment.note || '—'}</small></td>
                    <td>{payment.invoice ? <><strong>{payment.invoice.number}</strong><small>{payment.invoice.customerName}</small></> : 'Unallocated'}</td>
                    <td>{payment.method}</td>
                    <td>{payment.reference || '—'}</td>
                    <td><strong>{money(payment.amount, currency)}</strong></td>
                    <td>{payment.recordedBy?.name || '—'}</td>
                  </tr>
                ))}
                {!data.payments.length ? <Empty colSpan={7}>{loading ? 'Loading payments…' : 'No payments recorded yet.'}</Empty> : null}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {tab === 'expenses' ? (
        <Panel
          title="Expenses"
          subtitle="Operational spending with approval control."
          action={canManage ? <button className="office-button secondary" type="button" onClick={() => setExpenseForm(true)}><Icon name="plus" size={15} /> Record expense</button> : null}
        >
          <div className="office-table-wrap">
            <table className="office-table">
              <thead><tr><th>Date</th><th>Expense</th><th>Vendor</th><th>Amount</th><th>Recorded by</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {data.expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatDate(expense.incurredAt)}</td>
                    <td><strong>{expense.category}</strong><small>{expense.description}</small>{expense.receiptUrl ? <small><a href={expense.receiptUrl} target="_blank" rel="noreferrer">View receipt</a></small> : null}</td>
                    <td>{expense.vendor || '—'}</td>
                    <td><strong>{money(expense.amount, currency)}</strong></td>
                    <td>{expense.recordedBy?.name || '—'}<small>{expense.approvedBy ? 'Approved by ' + expense.approvedBy.name : ''}</small></td>
                    <td><StatusBadge value={expense.status} /></td>
                    <td><div className="office-row-actions">
                      {canApprove && expense.status === 'PENDING' ? <><button type="button" onClick={() => updateExpense(expense, 'APPROVED')}>Approve</button><button type="button" className="text-danger" onClick={() => updateExpense(expense, 'REJECTED')}>Reject</button></> : null}
                      {canManage && expense.status === 'APPROVED' ? <button type="button" onClick={() => updateExpense(expense, 'PAID')}>Mark paid</button> : null}
                      {!canApprove && expense.status === 'PENDING' ? <span className="office-muted">Awaiting approval</span> : null}
                    </div></td>
                  </tr>
                ))}
                {!data.expenses.length ? <Empty colSpan={7}>{loading ? 'Loading expenses…' : 'No expenses recorded yet.'}</Empty> : null}
              </tbody>
            </table>
          </div>
          <p className="office-hint-line">Pending claims {money(summary.expensesPending, currency)} · approved {money(summary.expensesApproved, currency)} · recorded {money(summary.expensesRecorded, currency)}.</p>
        </Panel>
      ) : null}

      {invoiceForm !== undefined ? (
        <InvoiceForm invoice={invoiceForm} currency={currency} busy={busy} onClose={() => setInvoiceForm(undefined)} onSave={(payload) => saveInvoice(payload, invoiceForm)} />
      ) : null}

      {paymentForm !== undefined ? (
        <PaymentForm invoices={data.invoices} initialInvoice={paymentForm?.invoice} currency={currency} busy={busy} onClose={() => setPaymentForm(undefined)} onSave={savePayment} />
      ) : null}

      {expenseForm !== undefined ? (
        <ExpenseForm currency={currency} busy={busy} onClose={() => setExpenseForm(undefined)} onSave={saveExpense} />
      ) : null}
    </>
  );
}

function InvoiceForm({ invoice, currency, busy, onClose, onSave }) {
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      number: form.get('number') || undefined,
      customerName: form.get('customerName'),
      customerEmail: form.get('customerEmail'),
      description: form.get('description'),
      amount: form.get('amount'),
      currency,
      issueDate: form.get('issueDate') || undefined,
      dueDate: form.get('dueDate') || null,
      status: form.get('status')
    });
  }
  return (
    <Modal title={invoice ? 'Edit invoice ' + invoice.number : 'New invoice'} eyebrow="FINANCE" description="Invoices are visible only to authorized finance roles." onClose={onClose}>
      <form onSubmit={submit}>
        <div className="office-form-grid">
          {!invoice ? <Field label="Invoice number" hint="Leave blank to generate automatically."><input name="number" maxLength={40} placeholder="INV-2026-001" /></Field> : null}
          <Field label="Customer"><input name="customerName" defaultValue={invoice?.customerName || ''} required maxLength={150} /></Field>
          <Field label="Customer email"><input name="customerEmail" type="email" defaultValue={invoice?.customerEmail || ''} maxLength={254} /></Field>
          <Field label="Amount"><input name="amount" type="number" min="0.01" step="0.01" defaultValue={invoice?.amount ?? ''} required /></Field>
          <Field label="Status">
            <select name="status" defaultValue={invoice?.status || 'DRAFT'}>
              <option value="DRAFT">Draft</option><option value="SENT">Sent</option><option value="PAID">Paid</option><option value="VOID">Void</option>
            </select>
          </Field>
          <Field label="Issue date"><input name="issueDate" type="date" defaultValue={invoice ? String(invoice.issueDate).slice(0, 10) : new Date().toISOString().slice(0, 10)} /></Field>
          <Field label="Due date"><input name="dueDate" type="date" defaultValue={invoice?.dueDate ? String(invoice.dueDate).slice(0, 10) : ''} /></Field>
          <Field label="Description" full><textarea name="description" defaultValue={invoice?.description || ''} required maxLength={500} rows={2} /></Field>
        </div>
        <footer className="office-modal-actions">
          <button className="office-button secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : invoice ? 'Save invoice' : 'Create invoice'}</button>
        </footer>
      </form>
    </Modal>
  );
}

function PaymentForm({ invoices, initialInvoice, currency, busy, onClose, onSave }) {
  const openInvoices = invoices.filter((invoice) => invoice.status !== 'VOID' && invoice.balance > 0);
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      invoiceId: form.get('invoiceId'),
      payerName: form.get('payerName'),
      amount: form.get('amount'),
      method: form.get('method'),
      reference: form.get('reference'),
      receivedAt: form.get('receivedAt') || undefined,
      note: form.get('note')
    });
  }
  return (
    <Modal title="Record payment" eyebrow="FINANCE" description="Allocate a receipt to an invoice or record it as an unallocated payment." onClose={onClose}>
      <form onSubmit={submit}>
        <div className="office-form-grid">
          <Field label="Invoice" full>
            <select name="invoiceId" defaultValue={initialInvoice?.id || ''}>
              <option value="">Unallocated payment</option>
              {openInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number} · {invoice.customerName} · {money(invoice.balance, currency)} outstanding</option>)}
            </select>
          </Field>
          <Field label="Payer"><input name="payerName" defaultValue={initialInvoice?.customerName || ''} required maxLength={150} /></Field>
          <Field label="Amount"><input name="amount" type="number" min="0.01" step="0.01" defaultValue={initialInvoice?.balance ?? ''} required /></Field>
          <Field label="Method">
            <select name="method" defaultValue="CASH"><option>CASH</option><option>BANK_TRANSFER</option><option>MOBILE_MONEY</option><option>CHEQUE</option><option>CARD</option></select>
          </Field>
          <Field label="Reference"><input name="reference" maxLength={60} /></Field>
          <Field label="Received date"><input name="receivedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
          <Field label="Note" full><input name="note" maxLength={300} /></Field>
        </div>
        <footer className="office-modal-actions">
          <button className="office-button secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Recording…' : 'Record payment'}</button>
        </footer>
      </form>
    </Modal>
  );
}

function ExpenseForm({ currency, busy, onClose, onSave }) {
  const [receipt, setReceipt] = useState('');
  const [error, setError] = useState('');

  async function chooseReceipt(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await readFileBase64(file, 1.3 * 1024 * 1024);
      setReceipt('data:' + result.mimeType + ';base64,' + result.data);
      setError('');
    } catch (reason) {
      setError(reason.message);
    }
  }

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      category: form.get('category'),
      vendor: form.get('vendor'),
      description: form.get('description'),
      amount: form.get('amount'),
      incurredAt: form.get('incurredAt') || undefined,
      note: form.get('note'),
      receiptUrl: receipt || undefined
    });
  }

  return (
    <Modal title="Record expense" eyebrow="FINANCE" description={'Expenses are recorded in ' + currency + ' and require approval before payment.'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="office-form-grid">
          <Field label="Category"><input name="category" required maxLength={80} placeholder="Transport, utilities, supplies" /></Field>
          <Field label="Vendor"><input name="vendor" maxLength={150} /></Field>
          <Field label="Amount"><input name="amount" type="number" min="0.01" step="0.01" required /></Field>
          <Field label="Date incurred"><input name="incurredAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
          <Field label="Description" full><textarea name="description" required maxLength={500} rows={2} /></Field>
          <Field label="Note" full><input name="note" maxLength={300} /></Field>
          <Field label="Receipt" full hint="Attach a PDF or image up to 1.3 MB, or paste an HTTPS receipt link.">
            <div className="office-receipt-row">
              <label className="office-button secondary file-button"><Icon name="upload" size={15} /> Choose file<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={chooseReceipt} hidden /></label>
              <input value={receipt.startsWith('data:') ? 'Receipt attached' : receipt} onChange={(event) => setReceipt(event.target.value)} placeholder="https://…" readOnly={receipt.startsWith('data:')} />
              {receipt ? <button type="button" className="office-link-button" onClick={() => setReceipt('')}>Clear</button> : null}
            </div>
          </Field>
        </div>
        {error ? <p className="office-error" role="alert">{error}</p> : null}
        <footer className="office-modal-actions">
          <button className="office-button secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="office-button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Record expense'}</button>
        </footer>
      </form>
    </Modal>
  );
}
