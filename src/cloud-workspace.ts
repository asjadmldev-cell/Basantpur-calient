import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from './catalog-model';
import type { StoreProfile } from './receipt-model';
import { suppliedProducts } from './supplied-catalog';
import type { LocalSnapshot, SavedReceipt, WorkspaceBackend } from './workspace-backend';

type Kind = 'product' | 'receipt' | 'profile';
type RecordRow = { owner_id: string; kind: Kind; record_id: string; payload: unknown; revision: number };
const TABLE = 'computer_care_records';
const conflict = 'This record changed on another device. Reload before editing it again; your draft is still saved on this device.';
function check(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.code === '42P01' || error.code === 'PGRST205' || error.code === '42501') {
    throw new Error('Database setup is incomplete. Run supabase/setup.sql in the Supabase SQL Editor, then retry.');
  }
  if (error.code === '23505') throw new Error('This product code or receipt already exists. Refresh and use a unique code.');
  throw new Error(error.message || 'Cloud request failed. Check your connection and retry.');
}
function equal(a: unknown, b: unknown): boolean {
  const sorted = (v: any): any => Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sorted(v[k])])) : v;
  return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
}

export class CloudWorkspace implements WorkspaceBackend {
  readonly scope: string;
  profile?: StoreProfile;
  private receiptVersions = new Map<string, number>();
  constructor(private client: SupabaseClient, private owner: string, project: string) { this.scope = `${project}:${owner}`; }
  private row(kind: Kind, id: string, payload: unknown): RecordRow {
    return { owner_id: this.owner, kind, record_id: id, payload, revision: 1 };
  }
  private async rows(kind: Kind): Promise<RecordRow[]> {
    const rows: RecordRow[] = [];
    // Explicit pagination avoids silently dropping records at Supabase's row limit.
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await this.client.from(TABLE).select('*').eq('owner_id', this.owner)
        .eq('kind', kind).order('record_id').range(offset, offset + 499);
      check(error); rows.push(...(data || []));
      if (!data || data.length < 500) return rows;
    }
  }
  async initialize() {
    const { error } = await this.client.from(TABLE).upsert(suppliedProducts.map(p => this.row('product', String(p.id), p)),
      { onConflict: 'owner_id,kind,record_id', ignoreDuplicates: true });
    check(error);
    await this.refreshProfile();
  }
  async refreshProfile() { this.profile = (await this.rows('profile')).find(row => row.record_id === 'store')?.payload as StoreProfile | undefined; }
  async loadProducts(): Promise<Product[]> { return (await this.rows('product')).map(row => row.payload as Product); }
  async loadReceipts(): Promise<SavedReceipt[]> {
    return (await this.rows('receipt')).map(row => {
      this.receiptVersions.set(row.record_id, row.revision);
      const receipt = row.payload as SavedReceipt;
      if (receipt.data) receipt.data.cloudVersion = row.revision;
      return receipt;
    }).sort((a, b) => (b.data?.issuedAt || '').localeCompare(a.data?.issuedAt || ''));
  }
  async saveProduct(product: Product) {
    // The product editor creates new records; duplicate IDs/SKUs must never overwrite existing stock.
    const { error } = await this.client.from(TABLE).insert(this.row('product', String(product.id), product));
    check(error);
  }
  async saveReceipt(receipt: SavedReceipt) {
    const version = receipt.data?.cloudVersion;
    const next = (version || 0) + 1;
    const payload = structuredClone(receipt);
    if (payload.data) delete payload.data.cloudVersion;
    if (version) {
      const { data, error } = await this.client.from(TABLE).update({ payload, revision: next })
        .eq('owner_id', this.owner).eq('kind', 'receipt').eq('record_id', receipt.id).eq('revision', version).select('record_id');
      check(error); if (!data?.length) throw new Error(conflict);
    } else {
      const { error } = await this.client.from(TABLE).insert(this.row('receipt', receipt.id, payload));
      check(error);
    }
    if (receipt.data) receipt.data.cloudVersion = next;
    this.receiptVersions.set(receipt.id, next);
  }
  async deleteReceipt(id: string) {
    const version = this.receiptVersions.get(id);
    if (!version) throw new Error('Refresh receipts before deleting this record.');
    const { data, error } = await this.client.from(TABLE).delete().eq('owner_id', this.owner)
      .eq('kind', 'receipt').eq('record_id', id).eq('revision', version).select('record_id');
    check(error); if (!data?.length) throw new Error(conflict);
    this.receiptVersions.delete(id);
  }
  async saveProfile(profile: StoreProfile) {
    const { error } = await this.client.from(TABLE).upsert(this.row('profile', 'store', profile), { onConflict: 'owner_id,kind,record_id' });
    check(error); this.profile = profile;
  }
  async importLocal(snapshot: LocalSnapshot) {
    const [products, receipts, profiles] = await Promise.all([this.rows('product'), this.rows('receipt'), this.rows('profile')]);
    let imported = 0, skipped = 0;
    for (const product of snapshot.products) {
      const existing = products.find(row => row.record_id === String(product.id));
      const original = suppliedProducts.find(p => p.id === product.id);
      if (existing && equal(existing.payload, product)) { skipped++; continue; }
      if (existing) {
        // Only pristine catalog seeds may be replaced. Preserve changes made on other devices.
        if (!original || !equal(existing.payload, original)) { skipped++; continue; }
        const { data, error } = await this.client.from(TABLE).update({ payload: product, revision: existing.revision + 1 })
          .eq('owner_id', this.owner).eq('kind', 'product').eq('record_id', String(product.id))
          .eq('revision', existing.revision).select('record_id');
        check(error); if (data?.length) imported++; else skipped++;
      } else {
        const sameSku = product.sku && products.some(row => (row.payload as Product).sku?.toLowerCase() === product.sku?.toLowerCase());
        if (sameSku) { skipped++; continue; }
        const { data, error } = await this.client.from(TABLE).upsert(this.row('product', String(product.id), product),
          { onConflict: 'owner_id,kind,record_id', ignoreDuplicates: true }).select('record_id');
        check(error); if (data?.length) imported++; else skipped++;
      }
    }
    for (const receipt of snapshot.receipts) {
      if (receipts.some(row => row.record_id === receipt.id)) { skipped++; continue; }
      const payload = structuredClone(receipt);
      if (payload.data) delete payload.data.cloudVersion;
      const { data, error } = await this.client.from(TABLE).upsert(this.row('receipt', receipt.id, payload),
        { onConflict: 'owner_id,kind,record_id', ignoreDuplicates: true }).select('record_id');
      check(error); if (data?.length) imported++; else skipped++;
    }
    if (snapshot.profile && !profiles.length) {
      const { error } = await this.client.from(TABLE).upsert(this.row('profile', 'store', snapshot.profile),
        { onConflict: 'owner_id,kind,record_id', ignoreDuplicates: true });
      check(error);
      this.profile = (await this.rows('profile'))[0]?.payload as StoreProfile | undefined;
    }
    return { imported, skipped };
  }
}
