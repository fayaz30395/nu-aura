"""Compute Flyway-compatible CRC32 checksums for migration files and diff vs a TSV of (version, checksum) from flyway_schema_history.
Flyway ChecksumCalculator: CRC32 over UTF-8 bytes of each line (line terminators stripped, BOM stripped on first line), as signed int32.
usage: python3 -I flyway_checksum.py <migration_dir> <db_tsv>"""
import sys, os, re, zlib

def flyway_crc(path):
    crc = 0
    with open(path, 'r', encoding='utf-8', newline='') as f:
        data = f.read()
    if data.startswith('﻿'):
        data = data[1:]
    for line in re.split(r'\r\n|\r|\n', data):
        crc = zlib.crc32(line.encode('utf-8'), crc)
    # readLine() yields no trailing empty line when file ends with newline
    if re.search(r'(\r\n|\r|\n)$', data):
        crc = 0
        for line in re.split(r'\r\n|\r|\n', data)[:-1]:
            crc = zlib.crc32(line.encode('utf-8'), crc)
    return crc - (1 << 32) if crc >= (1 << 31) else crc

mdir, tsv = sys.argv[1], sys.argv[2]
files = {}
for n in os.listdir(mdir):
    m = re.match(r'^V(\d+(?:[._]\d+)?)__.*\.sql$', n)
    if m:
        files[m.group(1).replace('_', '.')] = (n, flyway_crc(os.path.join(mdir, n)))
db = {}
for row in open(tsv):
    p = row.rstrip('\n').split('\t')
    if len(p) >= 4 and p[0]:
        db[p[0]] = (p[1], int(p[2]) if p[2] else None, p[3])
match = mism = 0
for v in sorted(set(files) | set(db), key=lambda x: [int(t) for t in x.split('.')]):
    f, d = files.get(v), db.get(v)
    if f and d:
        if f[1] == d[1]: match += 1
        else:
            mism += 1; print(f'MISMATCH V{v}: file={f[1]} db={d[1]} success={d[2]} {f[0]}')
    elif f: print(f'PENDING (file, not applied) V{v} {f[0]}')
    else: print(f'APPLIED BUT NO FILE V{v} db_desc={d[0]} success={d[2]}')
print(f'SUMMARY files={len(files)} applied={len(db)} checksum_match={match} mismatch={mism}')
