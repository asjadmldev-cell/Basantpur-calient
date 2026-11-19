import { useState } from 'react';
import { Package } from 'lucide-react';
import type { Product } from './catalog-model';
import { productPhoto } from './product-photo';
export default function ProductPhoto({ product, className = '' }: { product?: Pick<Product, 'id' | 'name' | 'image'>; className?: string }) {
 const photo = productPhoto(product);
 const [failed, setFailed] = useState('');
 if (!photo || failed === photo.image) return <span className={`product-placeholder ${className}`} role="img" aria-label={product?.name || 'Product'}><Package size={40}/></span>;
 return <img className={`product-art ${className}`} src={photo.image} alt={`${product?.name}${photo.reference ? ' — reference photo' : ''}`} loading="lazy" decoding="async" width="640" height="480" onError={() => setFailed(photo.image)}/>;
}
