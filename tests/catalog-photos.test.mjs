import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { build } from 'esbuild';
const load = async file => {
 const result = await build({entryPoints:[new URL(file,import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm'});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
};
const { suppliedProducts } = await load('../src/supplied-catalog.ts');
const { productPhoto } = await load('../src/product-photo.ts');
const sources=JSON.parse(readFileSync(new URL('../catalog-photo-sources.json',import.meta.url),'utf8'));
assert.equal(sources.length,67);
for(const product of suppliedProducts){
 const photo=productPhoto(product);
 assert.ok(photo,`Missing photo: ${product.name}`);
 assert.ok(photo.image.startsWith('/catalog-photos/'));
 const file=new URL('../public'+photo.image,import.meta.url);
 assert.ok(existsSync(file),`Missing local file: ${product.name}`);
 assert.ok(statSync(file).size>800,`Empty image: ${product.name}`);
 const source=sources.find(row=>row.id===product.id);
 assert.equal(source.image,photo.image);
 assert.ok(source.sourcePage.startsWith('https://'));
 assert.ok(source.width>=120&&source.height>=120);
 assert.equal(photo.reference,true);
}
const own=productPhoto({...suppliedProducts[0],image:'data:image/png;base64,uploaded'});
assert.equal(own.image,'data:image/png;base64,uploaded');
assert.equal(own.reference,false);
assert.equal(productPhoto({id:-1}),undefined);
console.log('Photo checks passed: all 67 products have local real-image assets, source records, valid dimensions, and uploaded photos retain priority.');
