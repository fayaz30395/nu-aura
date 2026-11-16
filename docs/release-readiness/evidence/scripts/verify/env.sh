#!/bin/bash
# Usage: . env.sh ; exports demo/test pw without printing. Demo pw is the documented one in the runbook.
export NUAURA_JAR_DIR=/private/tmp/claude-504/-Users-fayaz-m-IdeaProjects-nulogic-nu-aura/31fd4514-1941-4084-b1c8-e1a40e6df684/scratchpad/pay
export NUAURA_DEMO_PW="$(grep -o 'all `[^`]*`' /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/AUTONOMOUS-UI-E2E-RUNBOOK.md | head -1 | sed 's/all `//;s/`//')"
export NUAURA_TEST_PW="$(cat $NUAURA_JAR_DIR/vfy_pw.txt)"
export PYTHONPATH=/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/scripts/pay
