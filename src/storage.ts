import type { Product } from './catalog-model';
import type { ReceiptData } from './receipt-model';
export type SavedReceipt={id:string;customer:string;total:number;date:string;data?:ReceiptData};
const database=new Promise<IDBDatabase>((resolve,reject)=>{
 const request=indexedDB.open('computer-gear-workspace',1);
 request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('receipts',{keyPath:'id'});db.createObjectStore('products',{keyPath:'id'})};
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
async function all<T>(store:string):Promise<T[]>{const db=await database;return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly'),request=tx.objectStore(store).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function put(store:string,value:unknown):Promise<void>{const db=await database;return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Save cancelled'))})}
export const saveStoredReceipt=(receipt:SavedReceipt)=>put('receipts',receipt);
export const saveStoredProduct=(product:Product)=>put('products',product);
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
 const blob=new Blob([JSON.stringify({format:'computer-gear-backup',version:1,exportedAt:new Date().toISOString(),receipts,products},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='computer-gear-backup-'+new Date().toISOString().slice(0,10)+'.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
