import { calculateInvoice, paise } from './receipt-model';
import type { SavedReceipt } from './workspace-backend';

export type AccountEntry = {
  receipt: SavedReceipt;
  total: number;
  received: number | null;
  due: number | null;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Unknown';
};
export function accountEntry(receipt: SavedReceipt): AccountEntry {
  const data = receipt.data;
  if (!data || !Number.isFinite(data.received)) {
    return { receipt, total: receipt.total, received: null, due: null, status: 'Unknown' };
  }
  const invoice = calculateInvoice(data);
  return {
    receipt, total: invoice.total, received: paise(data.received) / 100, due: invoice.balance,
    status: paise(invoice.balance) <= 0 ? 'Paid' : paise(data.received) > 0 ? 'Partial' : 'Unpaid',
  };
}
export function accountSummary(receipts: SavedReceipt[]) {
  const entries = receipts.map(accountEntry);
  return {
    billed: entries.reduce((sum, row) => sum + paise(row.total), 0) / 100,
    received: entries.reduce((sum, row) => sum + paise(row.received ?? 0), 0) / 100,
    due: entries.reduce((sum, row) => sum + paise(row.due ?? 0), 0) / 100,
    dueCount: entries.filter(row => (row.due ?? 0) > 0).length,
    unknownCount: entries.filter(row => row.status === 'Unknown').length,
  };
}
