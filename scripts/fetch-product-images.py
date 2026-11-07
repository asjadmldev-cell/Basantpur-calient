import concurrent.futures, json, pathlib, subprocess
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]
choices={2:5,4:2,6:4,7:0,9:5,10:1,11:1,14:6,15:4,16:2,19:3,24:0,25:1,27:1,28:1,29:5,30:1,31:2,32:1,35:5,36:5}
data=json.loads((root/'image-candidates.json').read_text())
def fetch(row):
    id=row['id']; urls=row['urls']; preferred=choices.get(id,0)
    urls=urls[preferred:preferred+1]+[u for i,u in enumerate(urls) if i!=preferred]
    for url in urls[:5]:
        out=root/'public/products'/f'product-{id}.jpg'
        result=subprocess.run(['curl','-f','-L','--max-time','18','-s',url,'-o',str(out)],capture_output=True)
        if result.returncode: continue
        try:
            with Image.open(out) as im:
                width,height=im.size; im.verify()
            if width<150 or height<100: continue
            return {'id':id,'image':f'/products/product-{id}.jpg','source':url,'width':width,'height':height}
        except Exception: continue
    return {'id':id,'error':'No usable image'}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    results=list(pool.map(fetch,data))
(root/'src/product-images.json').write_text(json.dumps({r['id']:r['image'] for r in results if 'image' in r},indent=2))
(root/'product-image-sources.json').write_text(json.dumps(results,indent=2))
print(json.dumps({'downloaded':sum('image' in r for r in results),'failures':[r for r in results if 'error' in r]}))
