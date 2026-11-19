import photos from './catalog-photos.json';
import type { Product } from './catalog-model';
type Photo = { image: string; sourcePage: string; reference: boolean };
export function productPhoto(product?: Pick<Product, 'id' | 'image'>): Photo | undefined {
 if (!product) return;
 if (product.image) return { image: product.image, sourcePage: '', reference: false };
 return (photos as Record<string, Photo>)[String(product.id)];
}
