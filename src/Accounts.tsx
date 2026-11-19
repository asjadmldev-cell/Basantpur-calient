import { useState } from 'react';
import { ArrowUpRight, ReceiptText, Search, Wallet } from 'lucide-react';
import { accountEntry, accountSummary } from './accounts-model';
import { currency } from './receipt-model';
import type { SavedReceipt } from './workspace-backend';
import './accounts.css';

export default function Accounts({ receipts, onOpen, onNew }: { receipts: SavedReceipt[]; onOpen: (id: string) => void; onNew: () => void }) {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('All bills');
  const summary = accountSummary(receipts);
  const rows = receipts.map(accountEntry).filter(row => {
    const r = row.receipt;
    return `${r.id} ${r.customer} ${r.data?.customer.phone || ''}`.toLowerCase().includes(query.trim().toLowerCase()) &&
      (filter === 'All bills' || (filter === 'Balance due' ? (row.due ?? 0) > 0 : row.status === 'Paid'));
  });
  const filtered = accountSummary(rows.map(row => row.receipt));
  return <section className="workspace-page accounts-page">
    <div className="history-heading"><div><span className="eyebrow">HISAAB KITAAB</span><h2>Sales, payments & balances</h2><p>Amounts from your saved receipts. Updated whenever you save, edit or remove a bill.</p></div><button className="primary" onClick={onNew}><ReceiptText size={17}/> New receipt</button></div>
    <div className="accounts-totals" aria-label="Account totals">
      {[{ label: 'Total billed', value: summary.billed, note: `${receipts.length} saved receipts`, tone: 'violet' }, { label: 'Amount received', value: summary.received, note: 'Payments entered on receipts', tone: 'green' }, { label: 'Balance due', value: summary.due, note: `${summary.dueCount} bills with unpaid balance`, tone: 'orange' }].map(card => <div className={'accounts-total ' + card.tone} key={card.label}><span>{card.label}<Wallet size={18}/></span><strong>{currency(card.value)}</strong><small>{card.note}</small></div>)}
    </div>
    {summary.unknownCount > 0 && <p className="accounts-note">{summary.unknownCount} older receipt summaries have no payment details. Their billed amounts are included; received and due totals exclude them.</p>}
    <div className="history-list"><div className="history-list-head"><h3>Receipt ledger <span>{rows.length}</span></h3><div className="accounts-filters"><label className="history-search"><Search size={17}/><input aria-label="Search accounts" placeholder="Customer, bill number or phone…" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="Payment status" value={filter} onChange={e => setFilter(e.target.value)}>{['All bills', 'Balance due', 'Paid'].map(option => <option key={option}>{option}</option>)}</select></div></div>
      {rows.length ? <div className="history-table-wrap"><table><thead><tr><th>Customer / bill</th><th>Date</th><th>Billed</th><th>Received</th><th>Due</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map(row => <tr key={row.receipt.id}><td><b>{row.receipt.customer}</b><small>{row.receipt.id}</small><small>{row.receipt.data?.customer.phone}</small></td><td>{row.receipt.date}</td><td>{currency(row.total)}</td><td>{row.received === null ? 'Not recorded' : currency(row.received)}</td><td><strong>{row.due === null ? 'Not recorded' : currency(row.due)}</strong></td><td><span className={'payment-status ' + row.status.toLowerCase()}>{row.status}</span></td><td>{row.receipt.data ? <button className="text-button" onClick={() => onOpen(row.receipt.id)}>View / update bill <ArrowUpRight size={14}/></button> : <span>Legacy summary</span>}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Shown bills</th><th>{currency(filtered.billed)}</th><th>{currency(filtered.received)}</th><th>{currency(filtered.due)}</th><td colSpan={2}/></tr></tfoot></table></div> : <div className="empty"><ReceiptText size={36}/><h3>{receipts.length ? 'No matching bills' : 'Your accounts start with your first receipt'}</h3><p>{receipts.length ? 'Change the search or payment filter.' : 'Generate a receipt and enter the amount received to track the remaining balance.'}</p></div>}
    </div>
    <p className="accounts-note">To record a payment, open its bill, choose Edit details, update the total Amount received, then Generate & save receipt. These are receipt balances; expenses and profit are not tracked here.</p>
  </section>;
}
