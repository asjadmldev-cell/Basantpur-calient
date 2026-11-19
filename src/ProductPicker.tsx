import { useEffect, useId, useRef, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import type { Product } from './catalog-model';
import ProductPhoto from './ProductPhoto';
import { currency } from './receipt-model';
export type BillingProduct = Pick<Product, 'id' | 'name' | 'brand' | 'price' | 'category' | 'sku' | 'quantity' | 'pricePending' | 'image'>;
export function receiptProductName(product: BillingProduct) {
 const brand = product.brand.trim();
 return brand && !product.name.toLowerCase().includes(brand.toLowerCase()) ? `${product.name} — ${brand}` : product.name;
}
export default function ProductPicker({ products, categories, onSelect }: { products: BillingProduct[]; categories: string[]; onSelect: (product: BillingProduct) => void }) {
 const [query, setQuery] = useState(''), [open, setOpen] = useState(false), [active, setActive] = useState(0);
 const id = useId(), list = useRef<HTMLDivElement>(null);
 const matches = products.filter(product => `${product.name} ${product.brand} ${categories[product.category] || ''} ${product.sku || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
 useEffect(() => { list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);
 function select(product: BillingProduct) { onSelect(product); setQuery(''); setOpen(false); setActive(0); }
 return <div className="product-picker" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
  <label className="billing-search"><span className="sr-only">Search receipt products</span><Search size={17}/><input role="combobox" aria-expanded={open} aria-controls={id} aria-autocomplete="list" aria-activedescendant={open && matches[active] ? `${id}-${matches[active].id}` : undefined} placeholder="Select product · search name, brand or category…" value={query} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); }} onKeyDown={event => {
   if (event.key === 'Escape') { setOpen(false); return; }
   if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(value => Math.max(0, Math.min(matches.length - 1, value + (event.key === 'ArrowDown' ? 1 : -1)))); }
   if (event.key === 'Enter' && open && matches[active]) { event.preventDefault(); select(matches[active]); }
  }}/></label>
  {open && <div className="product-picker-popup"><div className="product-picker-caption">{matches.length} products · Select to add to your bill</div><div className="product-picker-list" id={id} ref={list} role="listbox" aria-label="Available products">{matches.map((product, index) => <button type="button" tabIndex={-1} role="option" aria-selected={index === active} id={`${id}-${product.id}`} key={product.id} onMouseDown={event => event.preventDefault()} onClick={() => select(product)} onMouseEnter={() => setActive(index)}><ProductPhoto product={product} className="picker-photo"/><span className="picker-product-text"><strong>{product.name}</strong><small>{product.brand||'Brand not specified'} · {categories[product.category]}{product.sku ? ` · ${product.sku}` : ''}</small><small>{product.pricePending?'Enter price when billing':currency(product.price)}{product.quantity !== undefined ? ` · In stock: ${product.quantity}` : ''}</small></span><Plus size={17}/></button>)}</div>{!matches.length && <p className="product-picker-empty">{products.length ? 'No matching products. Try another name or brand.' : 'Your catalog is empty. Add a product with its brand and category first, or add a custom item below.'}</p>}</div>}
 </div>;
}
