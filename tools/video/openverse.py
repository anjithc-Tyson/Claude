"""Openverse client: search and download openly licensed images and audio, with attribution.

usage:
  openverse.py search images "diamond ring" [--commercial] [--modify] [--n 10] [--license cc0,by]
  openverse.py search audio  "elegant piano" [--commercial] [--n 10]
  openverse.py get images <id> OUT_DIR        # downloads the file and appends to OUT_DIR/ATTRIBUTION.txt

Anonymous access works with lower rate limits. For higher limits, register an app at
https://api.openverse.org/v1/#tag/auth and set OPENVERSE_CLIENT_ID / OPENVERSE_CLIENT_SECRET.
"""
import argparse, json, os, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://api.openverse.org/v1'
UA = 'takshila-video-tools/1.0'
TOKEN_CACHE = os.path.expanduser('~/.cache/openverse_token.json')


def token():
    cid, secret = os.environ.get('OPENVERSE_CLIENT_ID'), os.environ.get('OPENVERSE_CLIENT_SECRET')
    if not (cid and secret):
        return None
    try:
        t = json.load(open(TOKEN_CACHE))
        if t['expires'] > time.time() + 60:
            return t['access_token']
    except Exception:
        pass
    body = urllib.parse.urlencode({'grant_type': 'client_credentials', 'client_id': cid, 'client_secret': secret}).encode()
    r = json.load(urllib.request.urlopen(urllib.request.Request(f'{API}/auth_tokens/token/', body, {'User-Agent': UA}), timeout=30))
    os.makedirs(os.path.dirname(TOKEN_CACHE), exist_ok=True)
    json.dump({'access_token': r['access_token'], 'expires': time.time() + r['expires_in']}, open(TOKEN_CACHE, 'w'))
    return r['access_token']


def call(path, params=None):
    url = f'{API}/{path}' + ('?' + urllib.parse.urlencode(params) if params else '')
    h = {'User-Agent': UA}
    t = token()
    if t:
        h['Authorization'] = f'Bearer {t}'
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=30))


def search(kind, q, n=10, commercial=False, modify=False, license=None, extra=None):
    p = {'q': q, 'page_size': n, 'mature': 'false'}
    lt = [x for x, on in (('commercial', commercial), ('modification', modify)) if on]
    if lt:
        p['license_type'] = ','.join(lt)
    if license:
        p['license'] = license
    p.update(extra or {})
    return call(f'{kind}/', p)['results']


def get(kind, ident, out_dir):
    d = call(f'{kind}/{ident}/')
    os.makedirs(out_dir, exist_ok=True)
    ext = (d.get('filetype') or os.path.splitext(urllib.parse.urlparse(d['url']).path)[1].lstrip('.') or ('jpg' if kind == 'images' else 'mp3'))
    ext = {'mp32': 'mp3', 'jpeg': 'jpg'}.get(ext.lower(), ext.lower())
    path = os.path.join(out_dir, f'{ident}.{ext}')
    req = urllib.request.Request(d['url'], headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=120) as r, open(path, 'wb') as f:
            f.write(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"{d.get('provider')} refused the download ({e.code}); open {d['foreign_landing_url']} instead")
    with open(os.path.join(out_dir, 'ATTRIBUTION.txt'), 'a') as f:
        f.write(f"{os.path.basename(path)}: {d['attribution']}\n  source: {d['foreign_landing_url']}\n")
    return path, d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['search', 'get'])
    ap.add_argument('kind', choices=['images', 'audio'])
    ap.add_argument('arg')
    ap.add_argument('out', nargs='?')
    ap.add_argument('--n', type=int, default=10)
    ap.add_argument('--commercial', action='store_true')
    ap.add_argument('--modify', action='store_true')
    ap.add_argument('--license')
    ap.add_argument('--source', help='e.g. jamendo,wikimedia_audio,ccmixter or flickr,wikimedia')
    a = ap.parse_args()
    if a.cmd == 'search':
        for r in search(a.kind, a.arg, a.n, a.commercial, a.modify, a.license, {'source': a.source} if a.source else None):
            dims = f"{r.get('width')}x{r.get('height')}" if a.kind == 'images' else f"{round((r.get('duration') or 0) / 1000)}s"
            print(f"{r['id']}  {r['license']} {r.get('license_version') or ''}  {dims}  {r.get('provider')}  {r['title'][:60]!r}")
    else:
        path, d = get(a.kind, a.arg, a.out or '.')
        print(path); print(d['attribution'])


if __name__ == '__main__':
    sys.exit(main())
