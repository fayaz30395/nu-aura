# 📨 What to Tell the Target System

Copy one of these messages depending on who will handle the import.

---

## 🤖 For Claude/AI Assistant on Target System

**Copy and paste this:**

```
I received NU-AURA database migration files. Please help me import them.

Read these files in order:
1. START_HERE.md
2. INSTRUCTIONS_FOR_TARGET_SYSTEM.md
3. Check what files I have and guide me through import

My system:
- OS: [fill in: Linux/macOS/Windows]
- Docker: [Yes/No]
- Files I have: [list your .sql or .tar.gz files]

Expected after import:
- 9 users
- 9 employees
- 44 permissions
- 275 tables

Guide me step by step to import the database.
```

---

## 👨‍💻 For Human System Administrator

**Send this email/message:**

```
Subject: NU-AURA Database Migration - Import Instructions

Hi,

I'm sending you the NU-AURA database export for import on your system.

PACKAGE CONTENTS:
- Database backup files (SQL or Docker volume)
- Complete documentation
- Automated import scripts

QUICK START:
1. Open the file: START_HERE.md
2. Choose your import method (SQL or Docker volume)
3. Follow the commands provided

EASIEST METHOD (if you have Docker):
scp nuaura_migration_*.sql.gz your-server:/tmp/
ssh your-server "gunzip /tmp/*.sql.gz && docker exec -i postgres psql -U hrms -d postgres < /tmp/*.sql"

VERIFICATION:
docker exec postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM users;"
Expected: 9 users

Full documentation included in:
- START_HERE.md (main guide)
- INSTRUCTIONS_FOR_TARGET_SYSTEM.md (step-by-step)
- MIGRATION_INSTRUCTIONS.md (troubleshooting)

Let me know if you need help!
```

---

## 🔧 For Technical Team (Slack/Teams)

**Post this:**

```
🚀 NU-AURA Database Migration Package Ready

**What:** Database export with full docs and scripts
**Size:** 123 KB (SQL) or 20 MB (Docker volume)
**Data:** 9 users, 9 employees, 275 tables, 28 MB database

**Quick Import (Docker):**
```bash
scp db-backups/nuaura_migration_*.sql.gz target:/tmp/
ssh target "gunzip /tmp/*.sql.gz && docker exec -i postgres psql -U hrms -d postgres < /tmp/*.sql"
```

**Docs:** START_HERE.md
**Support:** INSTRUCTIONS_FOR_TARGET_SYSTEM.md

Need help? Share error logs from: `docker logs postgres`
```

---

## 📝 For Documentation/Runbook

**Add this section:**

```markdown
# NU-AURA Database Import Procedure

## Prerequisites
- Docker with PostgreSQL container
- Access to migration package files
- User: hrms, Database: hrms_dev

## Import Steps

1. **Transfer files**
   ```bash
   scp nuaura_migration_*.sql.gz target:/tmp/
   ```

2. **Import database**
   ```bash
   gunzip /tmp/nuaura_migration_*.sql.gz
   docker exec -i postgres psql -U hrms -d postgres < /tmp/nuaura_migration_*.sql
   ```

3. **Verify**
   ```bash
   docker exec postgres psql -U hrms -d hrms_dev -c "SELECT COUNT(*) FROM users;"
   ```
   Expected: 9

## Troubleshooting
See: INSTRUCTIONS_FOR_TARGET_SYSTEM.md

## Documentation
- START_HERE.md - Quick start
- DB_MIGRATION_GUIDE.md - Complete guide
- QUICK_IMPORT.txt - Command reference
```

---

## 🎯 Simple Version (Non-Technical Users)

**Tell them:**

```
Hi! I'm sending you database files. Here's what to do:

1. Download all the files I sent
2. Find the file named "START_HERE.md"
3. Open it (it's a text file)
4. Follow the instructions under "Path A"

If you get stuck:
- Look at "INSTRUCTIONS_FOR_TARGET_SYSTEM.md"
- Or run the "auto-import.sh" script

The files will create a database with:
- 9 users
- 9 employees
- All the data from the old system

Need help? Share the "START_HERE.md" file with your IT person.
```

---

## 📦 File Transfer Commands

### Via SCP (Most Common)

```bash
# Transfer SQL package (recommended)
scp -r db-backups/ user@target-server:/tmp/

# Or transfer Docker volume package
scp docker-exports/postgres-volume-*.tar.gz user@target-server:/tmp/
```

### Via Cloud Storage (if no direct access)

```bash
# Upload to cloud
# Google Drive, Dropbox, AWS S3, etc.
# Then share download link

# On target system, download and import
wget https://your-cloud-link/nuaura_migration.sql.gz
gunzip nuaura_migration.sql.gz
docker exec -i postgres psql -U hrms -d postgres < nuaura_migration.sql
```

### Via USB/External Drive

```bash
# Copy entire scripts folder to USB
cp -r scripts/ /Volumes/USB/

# On target system
cp -r /media/USB/scripts/ ~/
cd ~/scripts
./auto-import.sh
```

---

## ✅ Verification Message Template

**After import, send this confirmation:**

```
✅ NU-AURA Database Import - Verification Results

Import Date: [DATE]
Target System: [SERVER NAME]

Row Counts:
- Users: [ACTUAL] (Expected: 9)
- Employees: [ACTUAL] (Expected: 9)
- Permissions: [ACTUAL] (Expected: 44)
- Tables: [ACTUAL] (Expected: 275)

Status: [SUCCESS / FAILED]

Backend Status:
- Configuration updated: [YES/NO]
- Application started: [YES/NO]
- Login tested: [YES/NO]

Issues: [NONE or describe issues]

Commands used:
[paste commands you ran]
```

---

## 🆘 If Import Fails

**Request this information:**

```
Import failed. Please provide:

1. Error message:
   [paste full error]

2. System info:
   - OS: [run: uname -a]
   - Docker version: [run: docker --version]
   - PostgreSQL version: [run: docker exec postgres psql --version]

3. Files you have:
   [run: ls -lh *.sql* *.tar.gz]

4. Logs:
   [run: docker logs postgres --tail 50]

5. Container status:
   [run: docker ps -a | grep postgres]

Share this in the support channel or with your AI assistant.
```

---

Choose the appropriate message above based on your target audience! 🚀

---

**Quick Summary:**
- **For AI:** Use the "For Claude/AI Assistant" message
- **For humans:** Use the "For Human System Administrator" message
- **For teams:** Use the "For Technical Team" message
- **Simple users:** Use the "Simple Version" message

All messages include enough context to get started with the import process.
