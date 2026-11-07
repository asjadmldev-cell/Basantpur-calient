import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Monitor, Search, MapPin, Phone, UserRound, ShoppingCart, Menu, Home, LayoutGrid, Sparkles, Star, BadgePercent, Info, Mail, Cpu, CircuitBoard, MemoryStick, HardDrive, Zap, PcCase, Fan, Laptop, Keyboard, Wifi, Printer, Cable, BriefcaseBusiness, FileKey, Gamepad2, ChevronRight, ArrowRight, Truck, ShieldCheck, Award, Headphones, RotateCcw, ReceiptText, Plus, Minus, X, Trash2, Check, Heart, SlidersHorizontal, ChevronDown, CreditCard, CheckCircle2 } from 'lucide-react';
import './styles.css';
import extraProducts from './extra-products.json';
import productImages from './product-images.json';
import Billing from './Billing';
import { calculateInvoice, type ReceiptData } from './receipt-model';
import './branding.css';
import Dashboard, { type WorkspaceView } from './Dashboard';
import AddProduct from './AddProduct';
import ReceiptHistory from './ReceiptHistory';
import ReceiptPreview from './ReceiptPreview';
import { loadReceipts, loadProducts, saveStoredReceipt, saveStoredProduct, downloadBackup, type SavedReceipt } from './storage';
import type { Product } from './catalog-model';
import './workspace.css';
const categories = [
 ['Processors (CPU)',Cpu],['Graphics Cards (GPU)',CircuitBoard],['Motherboards',CircuitBoard],['RAM / Memory',MemoryStick],['Storage (HDD / SSD)',HardDrive],['Power Supply (PSU)',Zap],['PC Cabinets',PcCase],['Cooling Systems',Fan],['Monitors',Monitor],['Laptops & Computers',Laptop],['Peripherals',Keyboard],['Networking',Wifi],['Printers & Scanners',Printer],['UPS & Power',Zap],['Cables & Connectors',Cable],['Computer Accessories',BriefcaseBusiness],['Software & Licenses',FileKey],['Gaming Accessories',Gamepad2],['Desktop & Mini PCs',Monitor],['Expansion & Capture Cards',CircuitBoard],
] as const;
const sampleProducts:Product[]=[
{id:1,name:'Intel Core i7-14700K Processor',brand:'INTEL',price:38999,mrp:44999,category:0,rating:4.8,reviews:212,tag:'BEST SELLER',spec:'20 cores • 28 threads • Up to 5.6 GHz'},
{id:2,name:'MSI GeForce RTX 4060 8GB Graphics Card',brand:'MSI',price:32999,mrp:36999,category:1,rating:4.7,reviews:186,tag:'POPULAR',spec:'8GB GDDR6 • DLSS 3 • Dual fan'},
{id:3,name:'Corsair Vengeance RGB DDR5 16GB',brand:'CORSAIR',price:6999,mrp:7999,category:3,rating:4.8,reviews:97,tag:'NEW ARRIVAL',spec:'16GB (8GB × 2) • 6000MHz • RGB'},
{id:4,name:'Samsung 990 PRO 1TB NVMe SSD',brand:'SAMSUNG',price:8999,mrp:10299,category:4,rating:4.9,reviews:315,tag:'GREAT VALUE',spec:'PCIe 4.0 • Up to 7,450 MB/s'},
{id:5,name:'LG UltraGear 27″ Gaming Monitor',brand:'LG',price:17999,mrp:19999,category:8,rating:4.7,reviews:189,tag:'BEST SELLER',spec:'27-inch QHD • 165Hz • IPS panel'},
{id:6,name:'Ant Esports ICE-300 Gaming Cabinet',brand:'ANT ESPORTS',price:3499,mrp:3999,category:6,rating:4.6,reviews:143,tag:'OFFER',spec:'Mid tower • ARGB fans • Tempered glass'},
{id:7,name:'MSI PRO B760M-A Motherboard',brand:'MSI',price:13999,mrp:15999,category:2,rating:4.8,reviews:84,tag:'NEW ARRIVAL',spec:'LGA 1700 • DDR5 • Micro ATX'},
{id:8,name:'Corsair CV650 650W Power Supply',brand:'CORSAIR',price:5299,mrp:6199,category:5,rating:4.7,reviews:68,tag:'GREAT VALUE',spec:'650W • 80 Plus Bronze'},
{id:9,name:'DeepCool AG400 ARGB CPU Cooler',brand:'DEEPCOOL',price:2199,mrp:2799,category:7,rating:4.7,reviews:115,tag:'OFFER',spec:'120mm fan • 4 heat pipes • ARGB'},
{id:10,name:'ASUS Vivobook 15 Laptop',brand:'ASUS',price:49999,mrp:58999,category:9,rating:4.6,reviews:89,tag:'NEW ARRIVAL',spec:'Intel Core i5 • 16GB RAM • 512GB SSD'},
{id:11,name:'RGB Gaming Keyboard & Mouse Combo',brand:'ANT ESPORTS',price:1499,mrp:1999,category:10,rating:4.5,reviews:124,tag:'OFFER',spec:'Backlit keyboard • 3200 DPI mouse'},
{id:12,name:'TP-Link Archer Dual Band Router',brand:'TP-LINK',price:2499,mrp:3199,category:11,rating:4.7,reviews:96,tag:'POPULAR',spec:'AC1200 • Dual band • 4 antennas'},
{id:13,name:'HP DeskJet All-in-One Printer',brand:'HP',price:5999,mrp:7499,category:12,rating:4.5,reviews:72,tag:'POPULAR',spec:'Print • Scan • Copy'},
{id:14,name:'APC 600VA Backup UPS',brand:'APC',price:3299,mrp:3999,category:13,rating:4.7,reviews:114,tag:'GREAT VALUE',spec:'600VA • Battery backup • Surge protection'},
{id:15,name:'High Speed HDMI Cable 2m',brand:'BELKIN',price:499,mrp:799,category:14,rating:4.6,reviews:87,tag:'OFFER',spec:'4K compatible • Gold-plated connectors'},
{id:16,name:'15.6″ Professional Laptop Bag',brand:'TARGUS',price:1299,mrp:1799,category:15,rating:4.7,reviews:53,tag:'POPULAR',spec:'Padded laptop sleeve • Water resistant'},
{id:17,name:'Windows 11 Home License',brand:'MICROSOFT',price:10499,mrp:12499,category:16,rating:4.8,reviews:74,tag:'POPULAR',spec:'1 PC • Digital license'},
{id:18,name:'Ergonomic RGB Gaming Chair',brand:'ANT ESPORTS',price:12999,mrp:16999,category:17,rating:4.6,reviews:61,tag:'NEW ARRIVAL',spec:'Reclining back • Lumbar cushion'},
...extraProducts,
];
const money=(n:number)=>'₹'+n.toLocaleString('en-IN',{maximumFractionDigits:2});
const readStorage=(key:string,fallback:any)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
function Crop({box,className=''}:{box:number[];className?:string}) {return <svg className={className} viewBox={box.join(' ')} preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="/reference.png" width="1536" height="1024"/></svg>}
function ProductImage({product}:{product:Product}) {
 const src=product.image||(productImages as Record<string,string>)[String(product.id)];
 if(!src)return <span className="product-placeholder"><Monitor size={45}/></span>;
 return <img className="product-art" src={src} alt={product.name} loading="lazy" decoding="async" width="480" height="360"/>;
}
type Cart=Record<number,number>;
function App(){
 const [path,setPath]=useState(()=>location.hash.slice(1)||'/dashboard');
 const [customProducts,setCustomProducts]=useState<Product[]>([]),[loading,setLoading]=useState(true),[storageError,setStorageError]=useState('');
 const products=[...sampleProducts,...customProducts];
 const page:WorkspaceView=path==='/products/new'?'add-product':path.startsWith('/receipt/')||path==='/billing/new'?'billing':path==='/receipts'?'receipts':path==='/products'?'products':path==='/statistics'?'statistics':'dashboard';
 function go(path:string){location.hash=path;setPath(path);window.scrollTo({top:0,behavior:'instant'})}
 function navigate(view:WorkspaceView){go(view==='add-product'?'/products/new':view==='billing'?'/billing/new':'/'+view)}
 useEffect(()=>{const change=()=>setPath(location.hash.slice(1)||'/dashboard');window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[]);

 const [query,setQuery]=useState(''),[category,setCategory]=useState<number|null>(null),[tab,setTab]=useState('All Products'),[sort,setSort]=useState('Featured');
 const [cart,setCart]=useState<Cart>(()=>readStorage('techstore-cart',{})),[wishlist,setWishlist]=useState<number[]>([]),[panel,setPanel]=useState<string|null>(null),[selected,setSelected]=useState<Product|null>(null),[toast,setToast]=useState('');
 const [billingInitial,setBillingInitial]=useState<Cart>({}),[billingKey,setBillingKey]=useState(0),[receipts,setReceipts]=useState<SavedReceipt[]>([]);
 const openedReceipt=path.startsWith('/receipt/')?receipts.find(r=>r.id===decodeURIComponent(path.slice(9)))?.data:undefined;
 useEffect(()=>{let active=true;Promise.all([loadReceipts(),loadProducts()]).then(([rows,items])=>{if(active){setReceipts(rows);setCustomProducts(items)}}).catch(()=>{if(active)setStorageError('Browser storage could not be opened. Please enable website storage and reload before creating bills.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 const productSection=useRef<HTMLElement>(null), dialogRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{localStorage.setItem('techstore-cart',JSON.stringify(cart))},[cart]);
 useEffect(()=>{if(toast){const timer=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(timer)}},[toast]);
 const overlay=Boolean(panel||selected);
 useEffect(()=>{if(!overlay)return;const previous=document.activeElement as HTMLElement;document.body.style.overflow='hidden';const timer=setTimeout(()=>dialogRef.current?.querySelector<HTMLElement>('button,input')?.focus(),0);function key(e:KeyboardEvent){if(e.key==='Escape'){setPanel(null);setSelected(null)}if(e.key==='Tab'){const nodes=dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,a[href],textarea,summary');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}document.addEventListener('keydown',key);return()=>{clearTimeout(timer);document.body.style.overflow='';document.removeEventListener('keydown',key);previous?.focus()}},[overlay]);
 const notify=(msg:string)=>setToast(msg);
 const add=(p:Product)=>{setCart(v=>({...v,[p.id]:(v[p.id]||0)+1}));notify('Added to your cart')};
 const update=(setter:React.Dispatch<React.SetStateAction<Cart>>,id:number,delta:number)=>setter(old=>{const next={...old,[id]:(old[id]||0)+delta};if(next[id]<=0)delete next[id];return next});
 const count=Object.values(cart).reduce((a,b)=>a+b,0);
 const total=(items:Cart)=>products.reduce((sum,p)=>sum+p.price*(items[p.id]||0),0);
 const startBilling=(items:Cart={})=>{setBillingInitial({...items});setBillingKey(k=>k+1);setPanel(null);setSelected(null);go('/billing/new')};
 const browse=(cat:number|null=null,newTab='All Products')=>{go('/products');setCategory(cat);setTab(newTab);setQuery('');setTimeout(()=>productSection.current?.scrollIntoView({behavior:'smooth',block:'start'}),20)};
 let visible=products.filter(p=>(category===null||p.category===category)&&(!query||`${p.name} ${p.brand} ${p.sku||'TS-'+String(p.id).padStart(4,'0')}`.toLowerCase().includes(query.toLowerCase()))&&(tab!=='New Arrivals'||p.tag==='NEW ARRIVAL')&&(tab!=='Best Sellers'||p.rating>=4.8)&&(tab!=='Offers'||(p.mrp-p.price)/p.mrp>=.15));
 if(sort==='Price: low to high')visible.sort((a,b)=>a.price-b.price);if(sort==='Price: high to low')visible.sort((a,b)=>b.price-a.price);if(sort==='Top rated')visible.sort((a,b)=>b.rating-a.rating);
 const close=()=>{setPanel(null);setSelected(null)};
 const saveReceipt=async(data:ReceiptData)=>{
  const row:SavedReceipt={id:data.id,customer:data.customer.name||'Walk-in customer',total:calculateInvoice(data).total,date:new Date(data.issuedAt).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'}),data};
  await saveStoredReceipt(row);setReceipts(old=>[row,...old.filter(r=>r.id!==row.id)]);notify('Receipt saved automatically');
  history.replaceState(null,'','#/receipt/'+encodeURIComponent(data.id));setPath('/receipt/'+encodeURIComponent(data.id));
 };
 const addProduct=async(product:Omit<Product,'id'>)=>{
  const sku=product.sku?.trim();if(sku&&products.some(p=>(p.sku||'TS-'+String(p.id).padStart(4,'0')).toLowerCase()===sku.toLowerCase()))throw new Error('SKU already exists');
  const row={...product,id:Math.max(Date.now(),...products.map(p=>p.id))+1};await saveStoredProduct(row);setCustomProducts(old=>[...old,row]);setQuery(row.name);setCategory(null);setTab('All Products');notify('Product saved to your catalog');
 };
 const workspace=storageError?<section className="workspace-page"><p className="billing-error" role="alert">{storageError}</p><button className="secondary" onClick={()=>location.reload()}>Retry</button></section>:loading?<div className="workspace-page">Loading your saved workspace…</div>:page==='billing'?<section className="workspace-page billing-page"><div className="billing-page-nav"><button className="back-link" onClick={()=>go('/receipts')}>← All receipts</button><button className="secondary" onClick={()=>startBilling()}><Plus size={15}/> New bill</button></div>{path.startsWith('/receipt/')&&!openedReceipt?<div className="empty"><h2>Receipt not found on this device.</h2><button onClick={()=>go('/receipts')}>View saved receipts</button></div>:<Billing key={path+'-'+billingKey} products={products} initialItems={billingInitial} existing={openedReceipt} onSave={saveReceipt}/>}</section>:page==='receipts'?<ReceiptHistory receipts={receipts} onNew={()=>startBilling()} onBackup={()=>downloadBackup(receipts,customProducts)}/>:page==='add-product'?<AddProduct categories={categories.map(c=>c[0])} onSave={addProduct} onBack={()=>go('/products')}/>:undefined;
 if(path.startsWith('/receipt-preview/')){
  const id=path.slice('/receipt-preview/'.length);
  const receipt=receipts.find(r=>encodeURIComponent(r.id)===id)?.data;
  return <ReceiptPreview data={receipt} loading={loading} error={storageError}/>;
 }
 return <>
 <Dashboard view={page} onNavigate={navigate} workspace={workspace} onAddProduct={()=>go('/products/new')} products={products} receipts={receipts} cartCount={count} query={query} onQuery={q=>{setQuery(q);setCategory(null);setTab('All Products')}} onReceipt={()=>startBilling()} onReceipts={()=>go('/receipts')} onCart={()=>setPanel('cart')} onBuild={()=>setPanel('build')} onSupport={()=>setPanel('contact')} onProduct={id=>setSelected(products.find(p=>p.id===id)!)} imageFor={p=><ProductImage product={products.find(x=>x.id===p.id)!}/>}><main>
 <div className="catalog-actions"><span>Your catalog · {products.length} products</span><button className="primary" onClick={()=>go('/products/new')}><Plus size={16}/> Add Product</button></div><section className="categories-section"><div className="section-title"><div><span className="eyebrow">FIND YOUR NEXT UPGRADE</span><h2>Shop by Category</h2></div><button className="text-button" onClick={()=>browse(null,'All Products')}>View all products <ArrowRight size={15}/></button></div><div className="category-grid">{categories.map(([name],i)=><button className={'category-tile '+(category===i?'selected':'')} onClick={()=>browse(i)} key={name}><ProductImage product={products.find(p=>p.category===i)!}/><span>{name}</span></button>)}</div></section>
 <section className="products-section" ref={productSection}><div className="section-title products-title"><div><span className="eyebrow">EVERYTHING FOR YOUR SETUP</span><h2>{query?`Results for “${query}”`:category!==null?categories[category][0]:tab==='All Products'?'Computers, Parts & Accessories':tab}</h2></div><div className="tabs">{['All Products','New Arrivals','Best Sellers','Offers'].map(t=><button key={t} className={tab===t?'selected':''} onClick={()=>setTab(t)}>{t}</button>)}</div></div>{true&&<div className="filter-bar"><span>{visible.length} products found {category!==null&&<button onClick={()=>setCategory(null)}>Clear category <X size={12}/></button>}</span><label><SlidersHorizontal size={14}/><select value={sort} onChange={e=>setSort(e.target.value)}>{['Featured','Price: low to high','Price: high to low','Top rated'].map(v=><option key={v}>{v}</option>)}</select></label></div>}
 <div className="product-grid" aria-label="Product catalog">{visible.map(p=><article className="product-card" key={p.id}><div className="product-top"><span className={'product-tag '+(p.tag==='NEW ARRIVAL'?'new':'')}>{p.tag}</span><button className={wishlist.includes(p.id)?'heart liked':'heart'} aria-label={`${wishlist.includes(p.id)?'Remove':'Save'} ${p.name}`} onClick={()=>{setWishlist(old=>old.includes(p.id)?old.filter(x=>x!==p.id):[...old,p.id]);notify(wishlist.includes(p.id)?'Removed from favorites':'Saved to favorites for this visit')}}><Heart size={16}/></button></div><button className="product-image-button" onClick={()=>setSelected(p)} aria-label={`View ${p.name}`}><ProductImage product={p}/></button><div className="product-info"><small className="brand">{p.brand}</small><button className="product-name" onClick={()=>setSelected(p)}>{p.name}</button>{!p.custom&&<div className="rating"><Star size={12} fill="currentColor"/><b>{p.rating.toFixed(1)}</b><span>({p.reviews})</span><span className="stock-dot"/></div>}<div className="pricing"><div><strong>{money(p.price)}</strong><del>{money(p.mrp)}</del></div>{p.mrp>p.price&&<span className="discount">-{Math.round((1-p.price/p.mrp)*100)}%</span>}<button onClick={()=>add(p)} aria-label={`Add ${p.name} to cart`}><ShoppingCart size={17}/></button></div></div></article>)}</div>{visible.length===0&&<div className="empty"><Search size={32}/><h3>No products found</h3><p>Try another product name or category.</p><button className="primary" onClick={()=>browse(null,'All Products')}>Browse all products</button></div>}</section>
 <section className="bottom-banner"><div className="banner-icon"><ReceiptText size={28}/></div><div><h3>Less time billing. More time building.</h3><p>Create a clean receipt in a few clicks, right from your storefront.</p></div><button onClick={()=>startBilling()}>Open quick billing <ArrowRight size={17}/></button></section><footer><a className="footer-logo" href="#"><img src="/computer-gear-logo.png" alt=""/>Computer <span>Gear</span></a><p>Your next upgrade starts here.</p><span>Storefront design preview · Sample products & prices</span></footer></main></Dashboard>
 {overlay&&<div className="overlay" onClick={close}><div className={'dialog '+(panel==='billing'?'billing-dialog':'')+(panel==='cart'?' cart-dialog':'')} role="dialog" aria-modal="true" aria-label={selected?selected.name:panel||'Details'} ref={dialogRef} onClick={e=>e.stopPropagation()}><button className="close" aria-label="Close dialog" onClick={close}><X size={22}/></button>
 {selected&&<><div className="detail-art"><ProductImage product={selected}/></div><span className="eyebrow">{selected.brand} · {selected.sku||'TS-'+String(selected.id).padStart(4,'0')}</span><h2>{selected.name}</h2><p className="muted">{selected.spec}</p>{!selected.custom&&<div className="detail-rating"><Star size={16} fill="currentColor"/>{selected.rating.toFixed(1)} <span>({selected.reviews} sample reviews)</span></div>}<h2>{money(selected.price)} <del className="muted small">{money(selected.mrp)}</del></h2><p className="stock"><CheckCircle2 size={16}/> In stock in demo catalog</p><button className="primary wide" onClick={()=>add(selected)}><ShoppingCart size={18}/> Add to Cart</button></>}
 {panel==='cart'&&<><span className="eyebrow">YOUR NEXT UPGRADE</span><h2>Shopping Cart <span className="muted">({count})</span></h2>{count===0?<div className="empty"><ShoppingCart size={40}/><h3>Your setup is waiting</h3><p>Add some hardware to get started.</p><button className="primary" onClick={()=>{close();browse(null,'All Products')}}>Explore products</button></div>:<><div className="cart-items">{products.filter(p=>cart[p.id]).map(p=><div className="cart-row" key={p.id}><ProductImage product={p}/><div><b>{p.name}</b><small>{money(p.price)}</small><div className="quantity"><button onClick={()=>update(setCart,p.id,-1)} aria-label={`Decrease ${p.name}`}><Minus size={13}/></button><span>{cart[p.id]}</span><button onClick={()=>update(setCart,p.id,1)} aria-label={`Increase ${p.name}`}><Plus size={13}/></button></div></div><button className="remove" aria-label={`Remove ${p.name}`} onClick={()=>setCart(c=>{const v={...c};delete v[p.id];return v})}><Trash2 size={17}/></button></div>)}</div><div className="cart-total"><span>Subtotal</span><b>{money(total(cart))}</b></div><p className="muted small">Design preview — no payment will be collected.</p><button className="primary wide" onClick={()=>startBilling(cart)}>Create receipt preview <ArrowRight size={17}/></button></> }</>}
 {panel==='build'&&<><span className="eyebrow">BUILD YOUR DREAM PC</span><h2>Every great build starts here.</h2><p className="muted">Choose your components and add them to your cart. Start with the part that matters most to you.</p><div className="build-options">{[0,1,2,3,4,5,6,7].map(i=>{const [name,Icon]=categories[i];return <button key={i} onClick={()=>{close();browse(i)}}><Icon/><span>{name}</span><ChevronRight size={17}/></button>})}</div><p className="muted small">Component compatibility should be checked before purchase.</p></>}
 {['about','store','contact'].includes(panel||'')&&<><span className="info-icon">{panel==='about'?<Monitor size={34}/>:panel==='store'?<MapPin size={34}/>:<Headphones size={34}/>}</span><span className="eyebrow">WELCOME TO COMPUTER GEAR</span><h2>{panel==='about'?'Good hardware. Great possibilities.':panel==='store'?'Your neighborhood tech store.':'Let’s build something great.'}</h2><p className="muted">{panel==='about'?'A storefront concept for computer enthusiasts, gamers and everyday creators. Discover components, accessories and the tools to power your next idea.':'Our team can help you choose components, plan a PC build or find your next upgrade.'}</p><div className="contact-detail"><MapPin/>New Delhi, India</div><div className="contact-detail"><Phone/>+91 98765 43210</div><div className="contact-detail"><CheckCircle2/>Monday – Saturday · 10 AM – 8 PM</div><p className="muted small">Sample store information from the design reference.</p><button className="primary wide" onClick={()=>{close();browse(null,'All Products')}}>Explore our catalog <ArrowRight size={17}/></button></>}
 </div></div>}
 {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}</div>}
 </>;
}

createRoot(document.getElementById('root')!).render(<App/>);
