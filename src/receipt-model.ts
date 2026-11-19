export type ReceiptItem = { id: string; name: string; sku: string; qty: number; unitPrice: number; pricePending?: boolean; brand?: string };
export type StoreProfile = { name: string; tagline: string; address: string; phone: string; email: string; gstin: string; logo: string; terms: string };
export type TaxConfig = { mode: 'none' | 'split' | 'igst'; rate: number };
export type ReceiptData = { cloudVersion?: number; tax?: TaxConfig; id: string; issuedAt: string; store: StoreProfile; customer: { name: string; phone: string; email: string; address: string; gstin: string }; items: ReceiptItem[]; discount: number; received: number; paymentMethod: string; reference: string; notes: string };
export const defaultStore: StoreProfile = { name: 'Computer Care', tagline: 'Computer Components & IT Hardware', address: 'Main Road, Madarpur, Near Jalal Market, Siwan, Bihar – 841226', phone: '+91 98765 43210', email: 'info@computercare.in', gstin: '', logo: '/computer-care-logo.png', terms: 'Please retain this receipt for service and warranty enquiries. Product warranties are subject to the manufacturer’s terms.' };
export const currency = (value: number) => new Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', minimumFractionDigits:2}).format(value);
export const paise = (value: number) => Math.round(value * 100);
export function calculateReceipt(items: ReceiptItem[], discount: number, received: number) {
 const subtotalPaise = items.reduce((sum,item)=>sum+paise(item.unitPrice)*item.qty,0);
 const grandPaise=subtotalPaise-paise(discount);
 return {subtotal:subtotalPaise/100,total:grandPaise/100,balance:(grandPaise-paise(received))/100,quantity:items.reduce((sum,item)=>sum+item.qty,0)};
}
export function calculateInvoice(data: Pick<ReceiptData,'items'|'discount'|'received'|'tax'>) {
 const base=calculateReceipt(data.items,data.discount,0);
 const mode=data.tax?.mode||'none',rate=data.tax?.rate||0;
 const taxablePaise=paise(base.total);
 const splitPaise=mode==='split'?Math.round(taxablePaise*rate/200):0;
 const igstPaise=mode==='igst'?Math.round(taxablePaise*rate/100):0;
 const taxPaise=splitPaise*2+igstPaise;
 const total=(taxablePaise+taxPaise)/100;
 return {...base,taxable:base.total,cgst:splitPaise/100,sgst:splitPaise/100,igst:igstPaise/100,taxTotal:taxPaise/100,total,balance:(taxablePaise+taxPaise-paise(data.received))/100};
}
export function validateReceipt(data: ReceiptData) {
 if(!data.store.name.trim()) return 'Enter your store name.';
 if(!data.store.address.trim()) return 'Enter your store address.';
 if(!data.items.length) return 'Add at least one product to your receipt.';
 for(const item of data.items){
  if(!item.name.trim()) return 'Every item needs a product name.';
  if(item.pricePending) return `Enter the unit price for ${item.name}.`;
  if(!Number.isInteger(item.qty)||item.qty<1||item.qty>999) return 'Item quantities must be whole numbers from 1 to 999.';
  if(!Number.isFinite(item.unitPrice)||item.unitPrice<0||item.unitPrice>10000000) return 'Enter a valid unit price between ₹0 and ₹1,00,00,000.';
 }
 const subtotal=calculateReceipt(data.items,0,0).subtotal;
 if(!Number.isFinite(data.discount)||data.discount<0||paise(data.discount)>paise(subtotal)) return 'Discount must be between zero and the subtotal.';
 if(data.tax&&(!['none','split','igst'].includes(data.tax.mode)||!Number.isFinite(data.tax.rate)||data.tax.rate<0||data.tax.rate>100)) return 'Enter a tax rate from 0 to 100%.';
 const total=calculateInvoice(data).total;
 if(!Number.isFinite(data.received)||data.received<0||paise(data.received)>paise(total)) return 'Amount received must be between zero and the grand total.';
 if(!Number.isFinite(Date.parse(data.issuedAt))) return 'Enter a valid receipt date.';
 return '';
}
const ones=['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function words(n:number):string {
 if(n<20)return ones[n];
 if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+words(n%10):'');
 for(const [base,label] of [[10000000,'Crore'],[100000,'Lakh'],[1000,'Thousand'],[100,'Hundred']] as const){if(n>=base)return words(Math.floor(n/base))+' '+label+(n%base?' '+words(n%base):'');}
 return '';
}
export function amountInWords(value:number){const p=paise(value);return 'Rupees '+words(Math.floor(p/100))+(p%100?' and '+words(p%100)+' Paise':'')+' Only';}
export function createReceiptId(){return 'CC-'+new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}).replaceAll('-','')+'-'+crypto.randomUUID().slice(0,8).toUpperCase();}
