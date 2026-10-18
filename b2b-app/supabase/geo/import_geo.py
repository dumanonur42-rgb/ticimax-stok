# Loads approximate Türkiye province + company-network ranges from DB-IP Lite (CC BY 4.0, https://db-ip.com)
# into public.geo_city / public.geo_org. Usage: SUPABASE_ACCESS_TOKEN=... python3 import_geo.py 2026-10
import bisect, csv, gzip, io, ipaddress, json, os, sys, urllib.request

REF = 'wxcbajukvxmerdjaikuw'
HERE = os.path.dirname(os.path.abspath(__file__))
MONTH = sys.argv[1]
FIX = {'Istanbul': 'İstanbul', 'Canakkale': 'Çanakkale', 'Hakkâri': 'Hakkari'}


def download(kind):
    url = f'https://download.db-ip.com/free/dbip-{kind}-lite-{MONTH}.csv.gz'
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'curl/8'})) as r:
        return csv.reader(io.TextIOWrapper(gzip.GzipFile(fileobj=io.BytesIO(r.read())), encoding='utf-8'))


def key(ip):
    a = ipaddress.ip_address(ip)
    return (a.version, int(a))


def province(region):
    name = region.removesuffix(' Province').strip()
    return FIX.get(name, name)


def merge(rows):
    out = []
    for start, end, value in rows:
        if out and out[-1][2] == value and out[-1][1][0] == start[0] and out[-1][1][1] + 1 == start[1]:
            out[-1][1] = end
        else:
            out.append([start, end, value])
    return out


cities = sorted((key(r[0]), key(r[1]), province(r[4])) for r in download('city') if r[3] == 'TR' and r[4].strip())
cities = merge(cities)
starts = [c[0] for c in cities]
companies = set(json.load(open(os.path.join(HERE, 'company_asns.json'))))
orgs = []
for r in download('asn'):
    if not r[2] or int(r[2]) not in companies:
        continue
    s, e = key(r[0]), key(r[1])
    i = bisect.bisect_right(starts, e) - 1
    if i >= 0 and cities[i][1] >= s and cities[i][0][0] == s[0]:
        orgs.append((s, e, r[3].strip()))
orgs = merge(sorted(orgs))


def ip(k):
    return str(ipaddress.ip_address(k[1]) if k[0] == 4 else ipaddress.IPv6Address(k[1]))


def lit(v):
    return "'" + v.replace("'", "''") + "'"


def query(sql):
    req = urllib.request.Request(
        f'https://api.supabase.com/v1/projects/{REF}/database/query',
        data=json.dumps({'query': sql}).encode(),
        headers={'Authorization': f"Bearer {os.environ['SUPABASE_ACCESS_TOKEN']}", 'Content-Type': 'application/json'},
        method='POST')
    with urllib.request.urlopen(req) as r:
        return r.read()


def values(rows):
    return ','.join(f"({lit(ip(s))}::inet,{lit(ip(e))}::inet,{lit(v)})" for s, e, v in rows)


query('create table if not exists public.geo_city_next (like public.geo_city including all);'
      'create table if not exists public.geo_org_next (like public.geo_org including all);'
      'truncate public.geo_city_next, public.geo_org_next;')
for table, rows in (('geo_city_next', cities), ('geo_org_next', orgs)):
    for i in range(0, len(rows), 4000):
        query(f'insert into public.{table} (ip_from, ip_to, {"city" if table.startswith("geo_city") else "org"}) values {values(rows[i:i + 4000])};')
query('begin;'
      'truncate public.geo_city, public.geo_org;'
      'insert into public.geo_city select * from public.geo_city_next;'
      'insert into public.geo_org select * from public.geo_org_next;'
      'drop table public.geo_city_next, public.geo_org_next;'
      'commit;')
print(f'geo_city {len(cities)} rows, geo_org {len(orgs)} rows')
