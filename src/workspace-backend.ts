import type { Product } from './catalog-model';
import type { ReceiptData, StoreProfile } from './receipt-model';

export type SavedReceipt = { id: string; customer: string; total: number; date: string; data?: ReceiptData };
export type LocalSnapshot = { products: Product[]; receipts: SavedReceipt[]; profile?: StoreProfile };
export interface WorkspaceBackend {
  scope: string;
  loadProducts(): Promise<Product[]>;
  loadReceipts(): Promise<SavedReceipt[]>;
  saveProduct(product: Product): Promise<void>;
  saveReceipt(receipt: SavedReceipt): Promise<void>;
  deleteReceipt(id: string): Promise<void>;
  saveProfile(profile: StoreProfile): Promise<void>;
  refreshProfile(): Promise<void>;
  profile?: StoreProfile;
}
let backend: WorkspaceBackend | undefined;
export function configureWorkspace(value?: WorkspaceBackend) { backend = value; }
export function workspaceBackend() { return backend; }
export function isCloudWorkspace() { return Boolean(backend); }

// Unfinished forms and cart stay on this device, isolated by project and account.
export const draftStorage = {
  key(key: string) { return backend ? `computer-care:${backend.scope}:${key}` : key; },
  getItem(key: string) { return localStorage.getItem(this.key(key)); },
  setItem(key: string, value: string) { localStorage.setItem(this.key(key), value); },
  removeItem(key: string) { localStorage.removeItem(this.key(key)); },
};
export function storedProfile(): StoreProfile | undefined {
  if (backend) return backend.profile;
  return JSON.parse(localStorage.getItem('techstore-store-profile') || 'null') || undefined;
}
export async function saveStoreProfile(profile: StoreProfile) {
  if (backend) { await backend.saveProfile(profile); return; }
  localStorage.setItem('techstore-store-profile', JSON.stringify(profile));
}
