import type { Product } from './catalog-model';
import type { ReceiptData } from './receipt-model';
export type SavedReceipt={id:string;customer:string;total:number;date:string;data?:ReceiptData};
async function migrateOldDatabase(newDb:IDBDatabase){
 try{
  await new Promise<void>((resolve)=>{
   const req=indexedDB.open('computer-gear-workspace',1);
   req.onerror=()=>resolve();
   req.onsuccess=()=>{
    const oldDb=req.result;
    try{
     const names=Array.from(oldDb.objectStoreNames);
     if(!names.includes('receipts')&&!names.includes('products')){oldDb.close();return resolve()}
     const txOld=oldDb.transaction(names,'readonly');
     const receiptsReq=names.includes('receipts')?txOld.objectStore('receipts').getAll():null;
     const productsReq=names.includes('products')?txOld.objectStore('products').getAll():null;
     txOld.oncomplete=()=>{
      const oldReceipts:SavedReceipt[]=receiptsReq?.result||[];
      const oldProducts:Product[]=productsReq?.result||[];
      if(oldReceipts.length||oldProducts.length){
       const txNew=newDb.transaction(['receipts','products'],'readwrite');
       for(const r of oldReceipts)txNew.objectStore('receipts').put(r);
       for(const p of oldProducts)txNew.objectStore('products').put(p);
      }
      oldDb.close();
      resolve();
     };
     txOld.onerror=()=>{oldDb.close();resolve()};
    }catch{oldDb.close();resolve()}
   };
  });
 }catch{}
}
const database=new Promise<IDBDatabase>((resolve,reject)=>{
 const request=indexedDB.open('computer-care-workspace',1);
 request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('receipts'))db.createObjectStore('receipts',{keyPath:'id'});if(!db.objectStoreNames.contains('products'))db.createObjectStore('products',{keyPath:'id'})};
 request.onsuccess=async()=>{const db=request.result;await migrateOldDatabase(db);resolve(db)};
 request.onerror=()=>reject(request.error);
});
async function all<T>(store:string):Promise<T[]>{const db=await database;return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly'),request=tx.objectStore(store).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function put(store:string,value:unknown):Promise<void>{const db=await database;return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Save cancelled'))})}
async function remove(store:string,key:IDBValidKey):Promise<void>{const db=await database;return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Delete cancelled'))})}
export const saveStoredReceipt=(receipt:SavedReceipt)=>put('receipts',receipt);
export const saveStoredProduct=(product:Product)=>put('products',product);
export async function deleteStoredReceipt(id:string){
 await remove('receipts',id);
 try{
  const parsed=JSON.parse(localStorage.getItem('techstore-receipts')||'[]');
  if(Array.isArray(parsed)){
   const filtered=parsed.filter((r:any)=>r?.id!==id);
   localStorage.setItem('techstore-receipts',JSON.stringify(filtered));
  }
 }catch{}
}
export const loadProducts=()=>all<Product>('products');
export async function loadReceipts(){
 const records=await all<SavedReceipt>('receipts');
 // Preserve existing browser receipts when moving to the larger local database.
 let legacy:SavedReceipt[]=[];try{const parsed=JSON.parse(localStorage.getItem('techstore-receipts')||'[]');if(Array.isArray(parsed))legacy=parsed}catch{/* Old browser data stays untouched. */}
 const existing=new Set(records.map(r=>r.id));
 for(const row of legacy){if(row?.id&&!existing.has(row.id)){await saveStoredReceipt(row);records.push(row)}}
 return records.sort((a,b)=>(b.data?.issuedAt||'').localeCompare(a.data?.issuedAt||''));
}
export function downloadBackup(receipts:SavedReceipt[],products:Product[]){
 const blob=new Blob([JSON.stringify({format:'computer-care-backup',version:1,exportedAt:new Date().toISOString(),receipts,products},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='computer-care-backup-'+new Date().toISOString().slice(0,10)+'.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
