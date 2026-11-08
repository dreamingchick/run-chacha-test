"""Restore lossless image sources kept as Base64 text in the repository."""
from pathlib import Path
import base64,hashlib,json

root=Path(__file__).resolve().parents[1]
assets=root/'dist'/'assets'
assets.mkdir(parents=True,exist_ok=True)
for source in (root/'asset-data').glob('*.base64'):
    (assets/source.name.removesuffix('.base64')).write_bytes(base64.b64decode(source.read_text(encoding='ascii'),validate=True))
manifest=json.loads((root/'dist'/'release.json').read_text(encoding='utf8'))
for name,expected in manifest['files'].items():
    file=root/'dist'/name
    if name=='_headers':continue # GitHub Pages does not interpret this optional hosting file.
    actual=hashlib.sha256(file.read_bytes()).hexdigest()
    if actual!=expected:raise RuntimeError(f'File integrity mismatch: {name}')
(root/'dist'/'.nojekyll').touch()
print(f'Restored {len(list(assets.iterdir()))} image assets; release integrity verified.')
