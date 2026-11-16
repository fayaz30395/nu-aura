#!/usr/bin/env python3
"""Static: list controller handler methods with NO method- or class-level authorization annotation.
Output: file:line  HTTP  path  [class-path]  (one per line) + summary. Independent re-derivation of RbacAnnotationCoverageTest."""
import re, glob, sys, os
ROOT = "/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend/src/main/java"
AUTH = re.compile(r"@(RequiresPermission|PreAuthorize|Secured|RolesAllowed|RequiresWebhookScope|PermitAll)\b")
MAP = re.compile(r"@(Get|Post|Put|Delete|Patch|Request)Mapping\b(\([^)]*\))?")
rows, total = [], 0
for f in sorted(glob.glob(ROOT + "/**/*Controller*.java", recursive=True)):
    src = open(f, errors="ignore").read().split("\n")
    text = "\n".join(src)
    if "@RestController" not in text and "@Controller" not in text:
        continue
    cm = re.search(r"((?:@\w+(?:\([^)]*\))?\s*\n)+)\s*public\s+(?:final\s+)?class", text)
    cls_ann = cm.group(1) if cm else ""
    cls_auth = bool(AUTH.search(cls_ann))
    cls_path = (re.search(r"@RequestMapping\((?:value\s*=\s*)?\{?\"([^\"]*)\"", cls_ann) or [None, ""])[1]
    i = 0
    while i < len(src):
        line = src[i]
        m = MAP.search(line)
        if m and m.group(1) != "Request" and line.strip().startswith("@"):
            # collect annotation block until method signature line
            j = i
            block = []
            while j < len(src) and not re.search(r"\b(public|protected|private)\b.*\(", src[j]) and j < i + 15:
                block.append(src[j]); j += 1
            # also look upward for annotations belonging to this method
            k = i - 1
            up = []
            while k >= 0 and src[k].strip().startswith("@"):
                up.append(src[k]); k -= 1
            ann = "\n".join(up + block)
            total += 1
            if not (AUTH.search(ann) or cls_auth):
                pm = re.search(r"\"([^\"]*)\"", line)
                rows.append((os.path.relpath(f, ROOT), i + 1, m.group(1).upper(), (cls_path + (pm.group(1) if pm else "")) or "/"))
            i = j
        i += 1
for r in rows:
    print("%s:%d\t%s\t%s" % r)
print("# handlers scanned: %d ; without any authz annotation: %d" % (total, len(rows)), file=sys.stderr)
