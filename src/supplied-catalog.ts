import type { Product } from './catalog-model';

// User's four handwritten lists, supplied 19 November 2026.
// Keep model labels as written; no inferred prices, stock or unspecified brands.
export const suppliedCatalogImport = 'handwritten-products-2026-11-19-v1';
const groups: { category: number; brand: string; names: string[] }[] = [
 { category: 20, brand: '', names: [
  'Desktop Cabinet', 'Desktop Fan', 'RAM', 'SSD', 'HDD', 'DVD Writer',
  'WiFi Receiver', 'Graphics Card', 'Speaker', 'Headphone',
  'Desktop Power Cable', 'Monitor', 'VGA Cable', 'HDMI Cable',
  'Motherboard H61', 'Motherboard H80', 'Motherboard H55', 'Motherboard 945',
  'Motherboard 310', 'Motherboard 410', 'Motherboard 500', 'Motherboard 550', 'Motherboard 110',
 ] },
 { category: 20, brand: 'Intel', names: ['Intel Processor'] },
 { category: 20, brand: 'AMD', names: ['AMD Processor'] },
 { category: 21, brand: '', names: [
  'Laptop Screen', 'Laptop Motherboard', 'Laptop Adaptor', 'Laptop Caddy', 'Laptop Power Cable',
 ] },
 { category: 22, brand: 'Epson', names: [
  'Epson 3110 Head Cable', 'Epson 3110 Head Connector Cable', 'Epson 3110 Encoder',
  'Epson 3110 Decoder', 'Epson 3110 Scanner Cable', 'Epson 3110 Scanner Motor Cable',
  'Epson 3110 Panel Cable', 'Epson 3110 Belt', 'Epson 3150 Panel Cable', 'Epson 3110 Encoder Cable',
 ] },
 { category: 23, brand: 'HP', names: [
  'HP 1005 Teflon', 'HP 1005 Brother Roller', 'HP 1005 Pickup Assembly', 'HP 1005 Main Motor',
  'HP 1005 Laser Scanner', 'HP 1005 Top Cover', 'HP 1005 Display', 'HP 1005 Scanner Motor',
  'HP 1005 Scanner', 'HP 1005 Gear Set', 'HP 1005 Fuser (Heater)', 'HP 1005 Display Cable',
  'HP 1005 Logic Card', 'HP 1005 Scanner Cable', 'HP 1005 Pickup Gear', 'HP 1005 Feeder Gear', 'HP 1005 Main Gear',
 ] },
 { category: 24, brand: 'Canon', names: [
  'Canon Head Cable', 'Canon Panel Cable', 'Canon Scanner Cable', 'Canon Pickup Gear Assembly',
 ] },
 { category: 25, brand: '', names: ['12A Cartridge', '88A Cartridge', '925 Cartridge', '36A Cartridge', '110 Cartridge'] },
 { category: 26, brand: '', names: ['Camera'] },
];
export const suppliedProducts: Product[] = groups.flatMap(group => group.names.map(name => ({
 name, brand: group.brand, category: group.category, price: 0, mrp: 0, pricePending: true,
 custom: true, rating: 0, reviews: 0, tag: 'YOUR PRODUCT',
 spec: name === 'Monitor' ? 'Select size and company when billing.' : '',
}))).map((product, index) => ({ ...product, id: 202611190001 + index, sku: `CC-LIST-${String(index + 1).padStart(3, '0')}` }));

export function mergeSuppliedProducts(products: Product[]): Product[] {
 const sameName = (value: string) => value.trim().toLowerCase();
 const additions = suppliedProducts.filter(incoming => !products.some(existing =>
  existing.id === incoming.id || existing.sku === incoming.sku ||
  (sameName(existing.name) === sameName(incoming.name) && sameName(existing.brand) === sameName(incoming.brand))
 ));
 return [...products, ...additions];
}
