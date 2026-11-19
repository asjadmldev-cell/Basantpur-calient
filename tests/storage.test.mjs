import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
const bundled = await build({entryPoints:[new URL('../src/storage.ts',import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm'});
const code=bundled.outputFiles[0].text;
let serial = 0;
const fresh = () => import('data:text/javascript;base64,' + Buffer.from(code + '\n//' + serial++).toString('base64'));
const values = new Map();
let full = false;
globalThis.localStorage = {getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(full)throw new Error('QuotaExceededError');values.set(key,value)},removeItem:key=>values.delete(key)};
const key = 'computer-care-local-workspace';
const old = {id:'old',customer:'Old customer',date:'yesterday',total:100};
values.set('techstore-receipts', JSON.stringify([old]));
let storage = await fresh();
assert.deepEqual(await storage.loadReceipts(),[old]);
const imported=await storage.loadProducts();
assert.equal(imported.length,67);
assert.equal(imported.filter(p=>p.name==='Camera').length,1);
assert.ok(imported.every(p=>p.pricePending&&p.quantity===undefined));
assert.ok(imported.some(p=>p.name==='Motherboard H80'));
assert.ok(imported.some(p=>p.name==='Motherboard 500'));
assert.ok(imported.some(p=>p.name==='Motherboard 550'));
const importedCount=imported.length;
await Promise.all([storage.saveStoredProduct({id:101,name:'SSD',brand:'Kingston'}),storage.saveStoredProduct({id:102,name:'RAM',brand:'Crucial'})]);
assert.equal((await storage.loadProducts()).length,importedCount+2,'parallel saves preserve both products');
await storage.saveStoredReceipt({...old,total:250});
await storage.saveStoredReceipt({id:'new',customer:'New customer',total:300});
storage = await fresh();
assert.equal((await storage.loadProducts()).length,importedCount+2,'products survive reload');
assert.equal((await storage.loadReceipts()).find(row=>row.id==='old').total,250,'latest edit survives reload');
await storage.deleteStoredReceipt('old');
storage = await fresh();
assert.ok(!(await storage.loadReceipts()).some(row=>row.id==='old'),'deleted receipt is not reimported from legacy storage');
const before = values.get(key);
full = true;
await assert.rejects(storage.saveStoredProduct({id:103,name:'Cannot save'}));
assert.equal(values.get(key),before,'failed save preserves existing workspace');
full = false;
values.set(key,'broken');
await assert.rejects(storage.loadProducts());
assert.equal(values.get(key),'broken','corrupt data is not silently overwritten');
values.set(key,before);
values.set('draft',JSON.stringify({id:'draft',store:{name:'Store'},customer:{name:'Customer'},items:[{name:'SSD — Kingston',qty:2}]}));
assert.equal(storage.loadBillDraft('draft').items[0].qty,2);
// Simulate migration from the two previous browser databases.
values.delete(key);
const previous = {'computer-gear-workspace':{receipts:[old],products:[{id:201,name:'Old product'}]},'computer-care-workspace':{receipts:[{...old,total:700}],products:[{id:201,name:'Updated product'}]}};
globalThis.indexedDB = {
 databases:async()=>Object.keys(previous).map(name=>({name})),
 open(name){
  const request={};
  queueMicrotask(()=>{
   const rows=previous[name];
   request.result={objectStoreNames:{contains:store=>store in rows},close(){},transaction(stores,mode){assert.equal(mode,'readonly');const tx={objectStore:store=>({getAll:()=>({result:rows[store]})})};queueMicrotask(()=>tx.oncomplete());return tx}};
   request.onsuccess();
  });
  return request;
 }
};
storage=await fresh();
assert.equal((await storage.loadReceipts()).find(row=>row.id==='old').total,700,'newer database wins during migration');
assert.equal((await storage.loadProducts())[0].name,'Updated product');
await storage.deleteStoredReceipt('old');
storage=await fresh();
assert.ok(!(await storage.loadReceipts()).some(row=>row.id==='old'),'migration runs only once');
console.log('Storage checks passed: migration, reload, updates, concurrent saves, deletion, drafts, quota failures and corrupt data.');

// Existing localStorage workspaces receive the user's list without replacing products or bills.
values.set(key,JSON.stringify({version:1,receipts:[old],products:[{id:900,name:'My existing product',brand:'My brand',price:75}]}));
storage=await fresh();
assert.equal((await storage.loadProducts()).length,68);
assert.equal((await storage.loadReceipts())[0].id,old.id);
const camera=(await storage.loadProducts()).find(p=>p.name==='Camera');
await storage.saveStoredProduct({...camera,price:1200,pricePending:false});
storage=await fresh();
assert.equal((await storage.loadProducts()).length,68,'reloading does not duplicate imports');
assert.equal((await storage.loadProducts()).find(p=>p.name==='Camera').price,1200,'import does not overwrite updated prices');
console.log('Catalog checks passed: 67 products, original model labels, one-time import, existing records preserved and no invented prices/stock.');
