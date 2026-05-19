# scripts/

| Namespace | Contents |
|---|---|
| `dev/` | Developer loop: `start-dev.sh`, `stop-dev.sh` |
| `agents/` | Agent orchestration readiness and task launchers |
| `db/` | Database utilities: export/import, manual migration, promote-superadmin, seed README, backups/ |
| `docker/` | Docker container utilities: db export/import, full export, init-db, volume export, exports/ |
| `qa/` | E2E orchestration, screenshot, AI test, compact-design apply, qa-orchestrator/ |
| `setup/` | One-time host setup: claude-personal, iTerm install, claude-commands |

Root orchestration shortcuts:

```bash
./scripts/agents/ready.sh
./scripts/ruflo-start.sh
./scripts/ruflo-pipeline.sh feature "Add employee document expiry reminders"
```

See `DB_MIGRATION_GUIDE.md` for migration instructions and `db/README.md` for seed data.
