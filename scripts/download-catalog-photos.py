"""Re-download original catalog reference photos using their recorded source URLs.
Existing assets are kept. Run with network access: python3 scripts/download-catalog-photos.py
"""
import concurrent.futures
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]

def download(row):
    destination = ROOT / 'public' / row['image'].lstrip('/')
    if destination.exists():
        return None
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(destination.suffix + '.download')
    result = subprocess.run(['curl', '-fLsS', '--max-time', '30', row['sourceImage'], '-o', str(partial)], capture_output=True)
    if result.returncode:
        partial.unlink(missing_ok=True)
        return row['name']
    partial.replace(destination)
    return None

if __name__ == '__main__':
    rows = json.loads((ROOT / 'catalog-photo-sources.json').read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        failed = [name for name in pool.map(download, rows) if name]
    if failed:
        raise SystemExit('Could not download: ' + ', '.join(failed))
    print(f'All {len(rows)} catalog photo files are available.')
