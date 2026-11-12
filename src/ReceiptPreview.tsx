import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Pencil, Printer, ReceiptText, Trash2 } from 'lucide-react';
import ReceiptDocument from './ReceiptDocument';
import type { ReceiptData } from './receipt-model';
import './receipt-preview.css';
export default function ReceiptPreview({data,loading,error,onDelete}:{data?:ReceiptData;loading:boolean;error:string;onDelete?:(id:string)=>Promise<void>|void}){
 const sheet=useRef<HTMLDivElement>(null);
 const [preparing,setPreparing]=useState(false),[printError,setPrintError]=useState('');
 useEffect(()=>{const title=document.title;if(data)document.title=`${data.id} — ${data.store.name} Invoice`;return()=>{document.title=title}},[data]);
 async function print(){
  setPreparing(true);setPrintError('');
  try{
   await document.fonts.ready;
   const images=Array.from(sheet.current?.querySelectorAll('img')||[]);
   await Promise.all(images.map(img=>img.decode()));
   window.print();
  }catch{setPrintError('The logo could not be loaded for printing. Reload this preview and try again.')}
  finally{setPreparing(false)}
 }
 return <main className="receipt-preview-page">
  <header className="receipt-preview-header"><a href="#/receipts" className="preview-back"><ArrowLeft size={17}/> Receipts</a><div className="preview-document-label"><ReceiptText size={20}/><span>Invoice preview<small>{data?.id||'Computer Care'}</small></span></div><div className="preview-actions">{data&&<a className="secondary" href={'#/receipt/'+encodeURIComponent(data.id)}><Pencil size={15}/> Edit bill</a>}{data&&onDelete&&<button className="secondary danger-btn" onClick={()=>{if(window.confirm(`Delete receipt ${data.id}? This cannot be undone.`)){onDelete(data.id)}}}><Trash2 size={15}/> Remove</button>}<button className="primary" onClick={print} disabled={!data||loading||preparing}><Printer size={16}/>{preparing?'Preparing…':'Print / Save PDF'}</button></div></header>
  <div className="receipt-preview-help">A4 document · To download a PDF, choose <b>Save as PDF</b> or <b>PDF → Save as PDF</b> in the print dialog.</div>
  {printError&&<p className="preview-error" role="alert">{printError}</p>}
  <div className="receipt-preview-sheet" ref={sheet}>{loading?<div className="preview-state" role="status">Loading your saved receipt…</div>:error?<div className="preview-state" role="alert"><h2>Unable to load this receipt</h2><p>{error}</p><button className="secondary" onClick={()=>location.reload()}>Retry</button></div>:data?<ReceiptDocument data={data}/>:<div className="preview-state"><ReceiptText size={35}/><h2>Receipt not found</h2><p>Open this receipt in the browser where it was saved.</p><a className="secondary" href="#/receipts">View saved receipts</a></div>}</div>
 </main>;
}
