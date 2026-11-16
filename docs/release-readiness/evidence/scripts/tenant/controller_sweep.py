#!/usr/bin/env python3
"""Static sweep of Spring MVC mappings vs authorization annotations. Textual, not a Java parser:
class-level annotations are inherited by methods; method-level override. Output TSV on stdout."""
import re, sys, pathlib
root = pathlib.Path(sys.argv[1])
perm_const = {}
for m in re.finditer(r'public static final String (\w+)\s*=\s*"([^"]+)"', (root/'common/security/Permission.java').read_text()):
    perm_const[m.group(1)] = m.group(2)
MAP = re.compile(r'@(Get|Post|Put|Patch|Delete|Request)Mapping\s*(?:\(([^)]*)\))?')
def paths(args):
    if not args: return ['']
    ps = re.findall(r'"([^"]*)"', args.split('method')[0]) or ['']
    return ps
def perms(block):
    out = []
    for m in re.finditer(r'@RequiresPermission\s*\(([^)]*)\)', block):
        args = m.group(1)
        out += [perm_const[c] for c in re.findall(r'\b([A-Z][A-Z0-9_]+)\b', args) if c in perm_const]
        out += re.findall(r'"([A-Za-z_]+:[A-Za-z_]+)"', args)
    return out
rows = []
for f in sorted((root/'api').rglob('*Controller.java')) + sorted((root).rglob('*Controller.java')):
    pass
seen = set()
for f in sorted(root.rglob('*Controller.java')):
    if f in seen: continue
    seen.add(f)
    src = f.read_text()
    cm = re.search(r'public\s+(?:final\s+)?class\s+(\w+)', src)
    if not cm: continue
    cls = cm.group(1)
    pre = src[:cm.start()]
    cls_ann = pre[pre.rfind(';')+1:]
    base = ''
    rm = re.search(r'@RequestMapping\s*\(([^)]*)\)', cls_ann)
    if rm: base = (paths(rm.group(1)) or [''])[0]
    cls_perms = perms(cls_ann); cls_pre = bool(re.search(r'@PreAuthorize|@Secured|@RolesAllowed', cls_ann))
    cls_feat = bool(re.search(r'@RequiresFeature', cls_ann))
    body = src[cm.end():]
    for mm in MAP.finditer(body):
        kind = mm.group(1)
        if kind == 'Request' and False: continue
        # method annotations block: from previous method end to the signature line
        start = max(body.rfind('}\n', 0, mm.start()), 0)
        sig = re.compile(r'\)\s*\{|;\s*$').search(body, mm.end())
        head = body[start:mm.start()]
        # annotations after the mapping up to method signature
        tail_end = body.find(' public ', mm.end())
        tail = body[mm.end():tail_end if tail_end > 0 else mm.end()+600]
        ann = head + mm.group(0) + tail
        mp = paths(mm.group(2))
        mperms = perms(ann); mpre = re.findall(r'@PreAuthorize\s*\(\s*"([^"]*)"', ann)
        nb = body.find('@', mm.end()+len(tail)); 
        mbody = body[mm.end()+len(tail): body.find('\n    @', mm.end()+len(tail)+5) if body.find('\n    @', mm.end()+len(tail)+5)>0 else mm.end()+len(tail)+1500]
        prog = bool(re.search(r'SecurityContext\.(requirePermission|hasPermission|hasAnyPermission|isSuperAdmin|isTenantAdmin|isHRAdmin|hasRole|hasAnyRole|requireRole)|securityService\.|hasPermission\(|AccessDeniedException|isAdmin', mbody))
        pub = bool(re.search(r'@PermitAll|@Public|@PreAuthorize\s*\(\s*"permitAll', ann))
        verb = {'Get':'GET','Post':'POST','Put':'PUT','Patch':'PATCH','Delete':'DELETE','Request':'ANY'}[kind]
        if kind == 'Request' and '@RequestMapping' in ann and tail.strip()[:0] == '': pass
        for p in mp:
            full = (base.rstrip('/') + '/' + p.lstrip('/')).rstrip('/') or '/'
            rows.append((cls, verb, full, ','.join(sorted(set(mperms or cls_perms))), ';'.join(mpre), 'PUBLIC' if pub else '', str(bool(mperms or cls_perms)), str(bool(mpre or cls_pre)), str(prog)))
print('controller\tverb\tpath\tperms\tpreauthorize\tpublic_ann\thas_perm\thas_preauth\tprogrammatic')
for r in rows: print('\t'.join(r))
