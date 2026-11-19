import { mergeSuppliedProducts, suppliedCatalogImport } from './supplied-catalog';
import type { Product } from './catalog-model';
import type { ReceiptData } from './receipt-model';
import { workspaceBackend, draftStorage, type SavedReceipt, type LocalSnapshot } from './workspace-backend';
export type { SavedReceipt } from './workspace-backend';
type Workspace = { version: 1; catalogImports?: string[]; receipts: SavedReceipt[]; products: Product[] };
const KEY = 'computer-care-local-workspace';
let initialization: Promise<void> | undefined;
function readWorkspace(): Workspace | null {
 const raw = localStorage.getItem(KEY);
 if (raw === null) return null;
 const value = JSON.parse(raw);
 if (value.version !== 1 || !Array.isArray(value.receipts) || !Array.isArray(value.products)) throw new Error('Saved workspace could not be read');
 return value;
}
// Existing databases are read once for migration. All new writes use localStorage.
async function readPreviousDatabase(name: string): Promise<Partial<Workspace>> {
 if (typeof indexedDB === 'undefined') return {};
 if (indexedDB.databases && !(await indexedDB.databases()).some(db => db.name === name)) return {};
 return new Promise((resolve, reject) => {
  const request = indexedDB.open(name);
  let absent = false;
  request.onupgradeneeded = () => { absent = true; request.transaction?.abort(); };
  request.onerror = () => absent ? resolve({}) : reject(request.error);
  request.onblocked = () => reject(new Error('Close other workspace tabs and retry'));
  request.onsuccess = () => {
   const db = request.result;
   const stores = ['receipts', 'products'].filter(store => db.objectStoreNames.contains(store));
   if (!stores.length) { db.close(); resolve({}); return; }
   const transaction = db.transaction(stores, 'readonly');
   const receipts = stores.includes('receipts') ? transaction.objectStore('receipts').getAll() : null;
   const products = stores.includes('products') ? transaction.objectStore('products').getAll() : null;
   transaction.oncomplete = () => { db.close(); resolve({ receipts: receipts?.result || [], products: products?.result || [] }); };
   transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error); };
  };
 });
}
async function migrateLegacyWorkspace() {
 if (readWorkspace()) return;
 const legacy = JSON.parse(localStorage.getItem('techstore-receipts') || '[]');
 if (!Array.isArray(legacy)) throw new Error('Old receipts could not be read');
 const older = await readPreviousDatabase('computer-gear-workspace');
 const previous = await readPreviousDatabase('computer-care-workspace');
 const receipts = new Map<string, SavedReceipt>();
 const products = new Map<number, Product>();
 for (const row of [...legacy, ...(older.receipts || []), ...(previous.receipts || [])]) if (row?.id) receipts.set(row.id, row);
 for (const row of [...(older.products || []), ...(previous.products || [])]) if (row?.id) products.set(row.id, row);
 if (!readWorkspace()) localStorage.setItem(KEY, JSON.stringify({ version: 1, receipts: [...receipts.values()], products: [...products.values()] }));
}
async function initialize() {
 await migrateLegacyWorkspace();
 const data = readWorkspace()!;
 if (!data.catalogImports?.includes(suppliedCatalogImport)) {
  data.products = mergeSuppliedProducts(data.products);
  data.catalogImports = [...(data.catalogImports || []), suppliedCatalogImport];
  localStorage.setItem(KEY, JSON.stringify(data));
 }
}
async function workspace(): Promise<Workspace> {
 initialization ??= initialize().catch(error => { initialization = undefined; throw error; });
 await initialization;
 const value = readWorkspace();
 if (!value) throw new Error('Saved workspace is missing. Please reload.');
 return value;
}
export async function saveStoredReceipt(receipt: SavedReceipt) {
 const cloud = workspaceBackend();
 if (cloud) return cloud.saveReceipt(receipt);
 await workspace();
 const data = readWorkspace()!;
 data.receipts = [receipt, ...data.receipts.filter(row => row.id !== receipt.id)];
 localStorage.setItem(KEY, JSON.stringify(data));
}
export async function saveStoredProduct(product: Product) {
 const cloud = workspaceBackend();
 if (cloud) return cloud.saveProduct(product);
 await workspace();
 const data = readWorkspace()!;
 data.products = [...data.products.filter(row => row.id !== product.id), product];
 localStorage.setItem(KEY, JSON.stringify(data));
}
export async function deleteStoredReceipt(id: string) {
 const cloud = workspaceBackend();
 if (cloud) { await cloud.deleteReceipt(id); draftStorage.removeItem('computer-care-bill-draft-' + id); return; }
 await workspace();
 const data = readWorkspace()!;
 data.receipts = data.receipts.filter(row => row.id !== id);
 localStorage.setItem(KEY, JSON.stringify(data));
 localStorage.removeItem('computer-care-bill-draft-' + id);
}
export async function loadProducts() { return workspaceBackend()?.loadProducts() ?? (await workspace()).products; }
export async function loadReceipts() {
 const cloud = workspaceBackend();
 if (cloud) return cloud.loadReceipts();
 return (await workspace()).receipts.sort((a, b) => (b.data?.issuedAt || '').localeCompare(a.data?.issuedAt || ''));
}
export function loadBillDraft(key: string): ReceiptData | undefined {
 const raw = draftStorage.getItem(key);
 if (!raw) return;
 const value = JSON.parse(raw);
 if (!value?.id || !value.store || !value.customer || !Array.isArray(value.items)) throw new Error('Saved draft could not be read');
 return value;
}
// Only called after an explicit import request. Original browser records remain intact.
export async function localSnapshot(): Promise<LocalSnapshot> {
 const data = await workspace();
 const profile = JSON.parse(localStorage.getItem('techstore-store-profile') || 'null') || undefined;
 return { products: data.products, receipts: data.receipts, profile };
}
export function downloadBackup(receipts: SavedReceipt[], products: Product[]) {
 const blob = new Blob([JSON.stringify({ format: 'computer-care-backup', version: 1, exportedAt: new Date().toISOString(), receipts, products }, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob), anchor = document.createElement('a');
 anchor.href = url; anchor.download = 'computer-care-backup-' + new Date().toISOString().slice(0, 10) + '.json'; anchor.click();
 setTimeout(() => URL.revokeObjectURL(url), 1000);
}
