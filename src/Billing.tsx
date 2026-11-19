import { draftStorage, isCloudWorkspace, storedProfile, workspaceBackend } from './workspace-backend';
import { useEffect, useRef, useState } from 'react';
import ProductPicker, { receiptProductName, type BillingProduct } from './ProductPicker';
import { loadBillDraft } from './storage';
import { ReceiptText, Plus, Trash2, ArrowLeft, ArrowRight, Printer, Check, Upload, Monitor, Store, UserRound, ShoppingBag, CreditCard, Save } from 'lucide-react';
import ReceiptDocument from './ReceiptDocument';
import { calculateInvoice, calculateReceipt, createReceiptId, currency, defaultStore, validateReceipt, type ReceiptData, type ReceiptItem, type StoreProfile } from './receipt-model';
import './receipt.css';
import './invoice.css';
type Props={products:BillingProduct[];categories:string[];initialItems:Record<number,number>;existing?:ReceiptData;onSave:(data:ReceiptData)=>Promise<void>;onDelete?:(id:string)=>Promise<void>|void};
function loadProfile():StoreProfile{
 try{
  const saved=storedProfile()||{};
  const profile={...defaultStore,...saved};
  if(profile.name==='TechStore'||profile.name==='Computer Gear'){
   profile.name=defaultStore.name;
   if(!profile.logo||profile.logo==='/computer-gear-logo.png')profile.logo=defaultStore.logo;
   if(profile.tagline==='Computer & IT Hardware'||profile.tagline==='Computer Components & IT Hardware')profile.tagline=defaultStore.tagline;
   if(profile.email==='info@computergear.in')profile.email=defaultStore.email;
  }
  return profile;
 }catch{return {...defaultStore}}
}
function emptyReceipt(products:BillingProduct[],initial:Record<number,number>):ReceiptData{return {id:createReceiptId(),issuedAt:new Date().toISOString(),store:loadProfile(),customer:{name:'',phone:'',email:'',address:'',gstin:''},items:products.filter(p=>initial[p.id]>0).map(p=>({id:String(p.id),name:receiptProductName(p),sku:p.sku||'TS-'+String(p.id).padStart(4,'0'),qty:initial[p.id],unitPrice:p.price,pricePending:p.pricePending})),discount:0,received:0,paymentMethod:'UPI',reference:'',notes:''}}
export default function Billing({products,categories,initialItems,existing,onSave,onDelete}:Props){
 const draftKey='computer-care-bill-draft-'+(existing?.id||'new');
 const [restored]=useState(()=>{try{return {data:loadBillDraft(draftKey),error:''}}catch{return {data:undefined,error:'Your saved draft could not be read. Download a backup before clearing browser data.'}}});
 const [data,setData]=useState<ReceiptData>(()=>restored.data||(existing?structuredClone(existing):emptyReceipt(products,initialItems)));
 const [draftStatus,setDraftStatus]=useState(restored.data?'Draft restored · saved in this browser':'Changes save automatically in this browser');
 const itemList=useRef<HTMLDivElement>(null);
 const [preview,setPreview]=useState(Boolean(existing&&!restored.data)),[saved,setSaved]=useState(Boolean(existing&&!restored.data)),[error,setError]=useState(restored.error),[profileSaved,setProfileSaved]=useState(false);
 const [saving,setSaving]=useState(false);
 const cloud=useRef(workspaceBackend()).current;
 const profileTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const pendingProfile=useRef<StoreProfile|undefined>(undefined);
 const profileQueue=useRef<Promise<void>>(Promise.resolve());
 function persistProfile(store:StoreProfile){
  const request=profileQueue.current.catch(()=>{}).then(async()=>{
   if(cloud)await cloud.saveProfile(store);
   else localStorage.setItem('techstore-store-profile',JSON.stringify(store));
  });
  profileQueue.current=request;return request;
 }
 function profileFailure(){setProfileSaved(false);setError('Shop details could not sync. Check your connection and use Remember store details to retry.');window.dispatchEvent(new CustomEvent('computer-care-cloud-error',{detail:'Shop details could not sync. Reopen the bill draft and use Remember store details to retry.'}))}
 useEffect(()=>()=>{clearTimeout(profileTimer.current);if(pendingProfile.current)void persistProfile(pendingProfile.current).catch(()=>window.dispatchEvent(new CustomEvent('computer-care-cloud-error',{detail:'Shop details could not sync. Your bill draft still contains them on this device.'})))},[]);

 useEffect(()=>{if(existing||restored.data||!data.items.length)return;try{draftStorage.setItem(draftKey,JSON.stringify(data));setDraftStatus('Draft saved automatically in this browser')}catch{setDraftStatus('Draft not saved');setError('Could not save your draft. Browser storage may be full.')}} ,[]);
 const totals=calculateInvoice(data);
 const errorMessage=validateReceipt(data);
 function patch(values:Partial<ReceiptData>){
  const next={...data,...values};setData(next);setSaved(false);setError('');
  try{draftStorage.setItem(draftKey,JSON.stringify(next));setDraftStatus('Draft saved automatically in this browser')}catch{setDraftStatus('Draft not saved');setError('Could not save your draft. Browser storage may be full. Keep this page open and free some storage before retrying.')}
 }

 function storePatch(values:Partial<StoreProfile>){
  const store={...data.store,...values};patch({store});setProfileSaved(false);
  if(!cloud){try{localStorage.setItem('techstore-store-profile',JSON.stringify(store));setProfileSaved(true)}catch{profileFailure()}return}
  pendingProfile.current=store;clearTimeout(profileTimer.current);
  profileTimer.current=setTimeout(()=>{pendingProfile.current=undefined;void persistProfile(store).then(()=>setProfileSaved(true)).catch(profileFailure)},600);
 }

 function itemPatch(id:string,values:Partial<ReceiptItem>){patch({items:data.items.map(item=>item.id===id?{...item,...values}:item)})}
 function addProduct(p:BillingProduct){const found=data.items.find(item=>item.id===String(p.id));if(found){itemPatch(found.id,{qty:Math.min(999,found.qty+1)})}else{patch({items:[...data.items,{id:String(p.id),name:receiptProductName(p),sku:p.sku||'TS-'+String(p.id).padStart(4,'0'),qty:1,unitPrice:p.price,pricePending:p.pricePending}]})}requestAnimationFrame(()=>{const input=itemList.current?.querySelector<HTMLInputElement>(`[data-quantity-id="${p.id}"]`);input?.focus();input?.select()})}
 async function saveProfile(){
  clearTimeout(profileTimer.current);pendingProfile.current=undefined;setProfileSaved(false);
  try{await persistProfile(data.store);setProfileSaved(true);setError('')}catch{profileFailure()}
 }

 async function makePreview(){
  if(errorMessage){setError(errorMessage);return}
  setSaving(true);setError('');
  try{const snapshot=structuredClone(data);await onSave(snapshot);setData(snapshot);try{draftStorage.removeItem(draftKey)}catch{/* The completed bill is already saved. */}setSaved(true);setPreview(true);window.scrollTo({top:0,behavior:'instant'})}
  catch(error){setError(error instanceof Error?error.message:'Receipt could not be saved. Your details are still here. Please retry before leaving this page.')}
  finally{setSaving(false)}
 }
 async function uploadLogo(file?:File){if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>1024*1024){setError('Choose a PNG, JPG or WebP logo smaller than 1 MB.');return}try{const logo=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file)});storePatch({logo})}catch{setError('Could not read this logo. Please try another image.')}}
 return <div className={'billing-workspace '+(preview?'preview-mode':'')}>
  <div className="billing-workspace-heading"><span className="billing-icon"><ReceiptText size={24}/></span><div><span className="eyebrow">COMPUTER CARE BILLING</span><h2>{preview?'Your receipt, ready to share.':'A professional receipt. In minutes.'}</h2><p>{preview?'Automatically saved. Print, download as PDF or edit your bill.':'Add your customer and products. Your draft saves automatically as you work.'}</p></div></div>
  {error&&<p className="billing-error" role="alert">{error}</p>}
  {existing?.cloudVersion&&data.cloudVersion!==existing.cloudVersion&&<div className="billing-error" role="alert">This receipt has a newer saved version. Your draft is still on this device. <button className="secondary" onClick={()=>{if(window.confirm('Discard this unsaved draft and open the latest saved receipt?')){draftStorage.removeItem(draftKey);setData(structuredClone(existing));setSaved(true);setError('');setPreview(true)}}}>Use latest saved receipt</button></div>}
  {!preview?<><div className="billing-steps"><span className="current">1 <b>Add details</b></span><i/><span>2 <b>Generate & save</b></span><i/><span>3 <b>Print / PDF</b></span></div>
  <details className="store-settings" open><summary><Store size={18}/><span>Store identity & contact details<small>Your logo and details appear at the top of every receipt.</small></span><span className="editable-label">EDITABLE</span></summary>
   <div className="store-settings-content"><div className="logo-upload-row"><div className="logo-preview">{data.store.logo?<img src={data.store.logo} alt="Store logo preview"/>:<Monitor size={32}/>}</div><div><label className="logo-upload-label"><Upload size={15}/> Upload store logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadLogo(e.target.files?.[0])}/></label><small>PNG, JPG or WebP · Up to 1 MB</small></div>{data.store.logo&&<button className="text-button" onClick={()=>storePatch({logo:''})}>Remove logo</button>}</div>
   <div className="form-grid"><label>Store name *<input value={data.store.name} maxLength={80} onChange={e=>storePatch({name:e.target.value})}/></label><label>Tagline / business type<input value={data.store.tagline} maxLength={100} onChange={e=>storePatch({tagline:e.target.value})}/></label><label className="full-field">Full store address *<textarea rows={2} placeholder="Shop / building, street, city, state and PIN code" value={data.store.address} maxLength={500} onChange={e=>storePatch({address:e.target.value})}/></label><label>Store phone<input type="tel" value={data.store.phone} maxLength={30} onChange={e=>storePatch({phone:e.target.value})}/></label><label>Store email<input type="email" placeholder="billing@yourstore.com" value={data.store.email} maxLength={100} onChange={e=>storePatch({email:e.target.value})}/></label><label>Store GSTIN (optional)<input value={data.store.gstin} maxLength={15} placeholder="Enter your registered GSTIN" onChange={e=>storePatch({gstin:e.target.value.toUpperCase()})}/></label><div className="profile-save"><button className="secondary" onClick={saveProfile}>{profileSaved?<Check size={15}/>:<Save size={15}/>} {profileSaved?'Store details saved':'Remember store details'}</button><small>{isCloudWorkspace()?'Shop details sync to your account.':'Saved only in this browser.'}</small></div></div></div>
  </details>
  <section className="billing-section"><h3><UserRound size={18}/> Customer details <span>Optional for walk-in customers</span></h3><div className="form-grid"><label>Customer name<input value={data.customer.name} maxLength={100} placeholder="Walk-in customer" onChange={e=>patch({customer:{...data.customer,name:e.target.value}})}/></label><label>Mobile number<input type="tel" value={data.customer.phone} maxLength={30} placeholder="Customer’s mobile number" onChange={e=>patch({customer:{...data.customer,phone:e.target.value}})}/></label><label className="full-field">Billing address<textarea rows={2} value={data.customer.address} maxLength={500} placeholder="Street, city, state and PIN code" onChange={e=>patch({customer:{...data.customer,address:e.target.value}})}/></label><label>Email<input type="email" value={data.customer.email} maxLength={100} placeholder="customer@example.com" onChange={e=>patch({customer:{...data.customer,email:e.target.value}})}/></label><label>Customer GSTIN (optional)<input value={data.customer.gstin} maxLength={15} placeholder="GSTIN, if applicable" onChange={e=>patch({customer:{...data.customer,gstin:e.target.value.toUpperCase()}})}/></label></div></section>
  <section className="billing-section"><h3><ShoppingBag size={18}/> Products & pricing <button className="text-button" onClick={()=>patch({items:[...data.items,{id:crypto.randomUUID(),name:'',sku:'',qty:1,unitPrice:0}]})}><Plus size={14}/> Add custom item</button></h3><ProductPicker products={products} categories={categories} onSelect={addProduct}/>
  <div className="editable-items" ref={itemList}>{data.items.length>0&&<div className="item-grid item-grid-head"><span>Product / description</span><span>Qty</span><span>Unit price (₹)</span><span>Amount</span><span/></div>}{data.items.map(item=><div className="item-grid" key={item.id}><div><input aria-label="Item description" value={item.name} maxLength={220} placeholder="Product or service name" onChange={e=>itemPatch(item.id,{name:e.target.value})}/><input className="item-sku" aria-label={`Brand / company for ${item.name}`} value={item.brand||''} maxLength={60} placeholder="Brand / company (optional)" onChange={e=>itemPatch(item.id,{brand:e.target.value})}/><input className="item-sku" aria-label="SKU" value={item.sku} maxLength={40} placeholder="SKU (optional)" onChange={e=>itemPatch(item.id,{sku:e.target.value})}/></div><input type="number" data-quantity-id={item.id} aria-label={`Quantity for ${item.name}`} min="1" max="999" step="1" value={item.qty} onChange={e=>itemPatch(item.id,{qty:Number(e.target.value)})}/><input type="number" aria-label={`Unit price for ${item.name}`} min="0" max="10000000" step="0.01" value={item.pricePending?'':item.unitPrice} placeholder="Price" aria-required="true" onChange={e=>itemPatch(item.id,{unitPrice:Number(e.target.value),pricePending:e.target.value===''})}/><b>{item.pricePending?'—':currency(calculateReceipt([item],0,0).subtotal)}</b><button className="remove" aria-label={`Remove ${item.name}`} onClick={()=>patch({items:data.items.filter(x=>x.id!==item.id)})}><Trash2 size={16}/></button></div>)}{!data.items.length&&<p className="bill-placeholder">Select a product above or add a custom item.</p>}</div></section>
  <section className="billing-section"><h3><CreditCard size={18}/> Payment & additional details</h3><div className="form-grid"><label>Payment method<select value={data.paymentMethod} onChange={e=>patch({paymentMethod:e.target.value})}>{['UPI','Cash','Card','Bank transfer','Credit / Due'].map(v=><option key={v}>{v}</option>)}</select></label><label>Payment reference<input placeholder="UPI / transaction reference" value={data.reference} maxLength={80} onChange={e=>patch({reference:e.target.value})}/></label><label>Additional discount (₹)<input type="number" min="0" max={totals.subtotal} step="0.01" value={data.discount} onChange={e=>patch({discount:Number(e.target.value)})}/></label><label>Amount received (₹)<span className="received-label"><input type="number" min="0" max={totals.total} step="0.01" value={data.received} onChange={e=>patch({received:Number(e.target.value)})}/><button type="button" aria-label="Set amount received to full total" onClick={()=>patch({received:Math.max(0,totals.total)})}>Full amount</button></span></label><label>Tax calculation<select value={data.tax?.mode||'none'} onChange={e=>patch({tax:{mode:e.target.value as 'none'|'split'|'igst',rate:data.tax?.rate||18}})}><option value="none">No tax</option><option value="split">CGST + SGST</option><option value="igst">IGST</option></select></label>{data.tax?.mode&&data.tax.mode!=='none'&&<label>Total tax rate (%)<input type="number" min="0" max="100" step="0.01" value={data.tax.rate} onChange={e=>patch({tax:{...data.tax!,rate:Number(e.target.value)}})}/><small>{data.tax.mode==='split'?`${data.tax.rate/2}% CGST + ${data.tax.rate/2}% SGST`:'Applied after discount'}</small></label>}<label className="full-field">Notes<textarea rows={2} placeholder="Serial numbers, warranty notes or other details…" value={data.notes} maxLength={1000} onChange={e=>patch({notes:e.target.value})}/></label><label className="full-field">Terms & conditions<textarea rows={2} value={data.store.terms} maxLength={1000} onChange={e=>storePatch({terms:e.target.value})}/></label></div></section>
  <div className="billing-final-summary"><div><span>Subtotal</span><b>{currency(totals.subtotal)}</b></div><div><span>Discount / Tax</span><b>− {currency(data.discount)} / + {currency(totals.taxTotal)}</b></div><div className="summary-total"><span>Grand total</span><strong>{currency(totals.total)}</strong></div><div><span>Balance due</span><b>{currency(totals.balance)}</b></div></div><div className="billing-editor-footer"><p role="status">{draftStatus}. Generate the receipt to add it to Receipts.</p><button className="primary" disabled={saving} onClick={makePreview}><ReceiptText size={17}/>{saving?'Saving…':'Generate & save receipt'} <ArrowRight size={16}/></button></div>
  </>:<><div className="receipt-preview-toolbar"><button className="secondary" onClick={()=>{setPreview(false)}}><ArrowLeft size={15}/> Edit details</button><span>A4 · Print-ready receipt</span></div><ReceiptDocument data={data}/><div className="receipt-actions"><span>{saved?<><Check size={14}/> {isCloudWorkspace()?'Saved to your cloud account':'Saved on this device'}</>:'Save changes to update this receipt.'}</span>{existing&&onDelete&&<button className="secondary danger-btn" onClick={()=>{if(window.confirm(`Delete receipt ${data.id}? This cannot be undone.`)){onDelete(data.id)}}}><Trash2 size={15}/> Remove receipt</button>}<button className="secondary" disabled={saved||saving} onClick={makePreview}><Save size={16}/>{saved?'Saved automatically':saving?'Saving…':'Save changes'}</button><button className="primary" onClick={()=>window.print()}><Printer size={16}/> Print / Save PDF</button></div></>}
 </div>;
}
