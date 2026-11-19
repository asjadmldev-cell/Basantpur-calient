import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = await build({ entryPoints: [new URL('../src/cloud-workspace.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node' });
const { CloudWorkspace } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

// In-memory PostgREST contract double. Live database RLS still needs a configured project/login.
const records = new Map();
let fail = false;
const key = row => `${row.owner_id}:${row.kind}:${row.record_id}`;
function client(owner) {
  return { from(table) {
    assert.equal(table, 'computer_care_records');
    let action = 'read', body, options, filters = [], start = 0, end = Infinity;
    const query = {
      select() { return query; },
      eq(field, value) { filters.push([field, value]); return query; },
      order() { return query; },
      range(a, b) { start = a; end = b; return query; },
      insert(value) { action = 'insert'; body = value; return query; },
      upsert(value, config) { action = 'upsert'; body = value; options = config; return query; },
      update(value) { action = 'update'; body = value; return query; },
      delete() { action = 'delete'; return query; },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          if (fail) return { data: null, error: { message: 'Network unavailable' } };
          const matches = row => row.owner_id === owner && filters.every(([field, value]) => row[field] === value);
          const selected = [...records.values()].filter(matches).sort((a,b) => a.record_id.localeCompare(b.record_id));
          if (action === 'read') return { data: structuredClone(selected.slice(start, end + 1)), error: null };
          if (action === 'update') { selected.forEach(row => records.set(key(row), { ...row, ...structuredClone(body) })); return { data: selected, error: null }; }
          if (action === 'delete') { selected.forEach(row => records.delete(key(row))); return { data: selected, error: null }; }
          const changed = [];
          for (const row of Array.isArray(body) ? body : [body]) {
            assert.equal(row.owner_id, owner, 'writes carry the authenticated owner');
            const existing = records.get(key(row));
            if (existing && action === 'insert') return { data: null, error: { code: '23505', message: 'duplicate' } };
            if (existing && options?.ignoreDuplicates) continue;
            records.set(key(row), structuredClone(row)); changed.push(row);
          }
          return { data: changed, error: null };
        }).then(resolve, reject);
      },
    };
    return query;
  } };
}
const a = new CloudWorkspace(client('owner-a'), 'owner-a', 'project');
const b = new CloudWorkspace(client('owner-a'), 'owner-a', 'project');
const other = new CloudWorkspace(client('owner-b'), 'owner-b', 'project');
await a.initialize(); await b.initialize(); await other.initialize();
assert.equal((await a.loadProducts()).length, 67);
await a.saveProduct({ id: 800, name: 'My camera', brand: 'Test', sku: 'TEST', image: 'data:image/png;base64,a' });
assert.equal((await b.loadProducts()).find(p => p.id === 800).image, 'data:image/png;base64,a');
assert.equal((await other.loadProducts()).length, 67);
await assert.rejects(a.saveProduct({id:800,name:'Overwrite'}), /already exists/);
const receipt = { id: 'CC-test', customer: 'Customer', total: 42, data: { id: 'CC-test', issuedAt: '2026-11-19', items: [] } };
await a.saveReceipt(receipt);
assert.equal(receipt.data.cloudVersion, 1);
const first = (await a.loadReceipts())[0];
const stale = (await b.loadReceipts())[0];
first.total = 84; await a.saveReceipt(first);
assert.equal(first.data.cloudVersion, 2);
stale.total = 99;
await assert.rejects(b.saveReceipt(stale), /changed on another device/);
assert.equal((await b.loadReceipts())[0].total, 84);
assert.equal((await other.loadReceipts()).length, 0);
const oldCopy = structuredClone(first);
await b.deleteReceipt(first.id);
await assert.rejects(a.saveReceipt(oldCopy), /changed on another device/);
assert.equal((await a.loadReceipts()).length, 0, 'saving a deleted bill cannot resurrect it');
await a.saveProfile({ name: 'Shared shop', logo: 'data:image/png;base64,logo' });
await b.refreshProfile(); assert.equal(b.profile.name, 'Shared shop');
await other.refreshProfile(); assert.equal(other.profile, undefined);

const camera = (await a.loadProducts()).find(p => p.name === 'Camera');
const imported = await a.importLocal({ products: [{ ...camera, price: 2000, pricePending: false }], receipts: [{ ...receipt, total: 123 }] });
assert.equal(imported.imported, 2);
await b.initialize();
assert.equal((await b.loadProducts()).find(p => p.id === camera.id).price, 2000, 'initialization preserves updated catalog prices');
await a.importLocal({ products: [{ ...camera, price: 5 }], receipts: [{ ...receipt, total: 5 }] });
assert.equal((await a.loadProducts()).find(p => p.id === camera.id).price, 2000);
assert.equal((await a.loadReceipts())[0].total, 123, 'repeat import preserves existing cloud bills');
for (let i = 0; i < 1100; i++) records.set(`owner-a:receipt:page-${i}`, { owner_id: 'owner-a', kind: 'receipt', record_id: `page-${i}`, revision: 1, payload: { id: `page-${i}` } });
assert.equal((await a.loadReceipts()).length, 1101, 'all pages load beyond 1,000 rows');
fail = true;
await assert.rejects(a.saveProduct({id:900}), /Network unavailable/);
await assert.rejects(a.loadReceipts(), /Network unavailable/);
fail = false;
assert.ok(!(await a.loadProducts()).some(p => p.id === 900), 'failed cloud save is not reported as local success');

const adapter = await build({ entryPoints: [new URL('../src/workspace-backend.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node' });
const { configureWorkspace, draftStorage } = await import('data:text/javascript;base64,' + Buffer.from(adapter.outputFiles[0].text).toString('base64'));
const local = new Map();
globalThis.localStorage = { getItem: k => local.get(k) ?? null, setItem: (k,v) => local.set(k,v), removeItem: k => local.delete(k) };
configureWorkspace(a); draftStorage.setItem('bill-draft', 'owner A private draft');
configureWorkspace(other); assert.equal(draftStorage.getItem('bill-draft'), null);
configureWorkspace(a); assert.equal(draftStorage.getItem('bill-draft'), 'owner A private draft');
configureWorkspace(); assert.equal(draftStorage.getItem('bill-draft'), null);
console.log('Cloud adapter checks passed: independent records, device reload, owner scoping, stale edit rejection, delete protection, safe imports, images/profile, pagination, failure handling and private local drafts.');
