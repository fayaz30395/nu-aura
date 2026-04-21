-- V138__okr_objective_performance_indexes.sql
-- Fix: F-05 P1 — /api/v1/okr/objectives/my and /api/v1/okr/company/objectives slow (>4s).
-- Root cause: missing composite indexes on objectives(tenant_id, owner_id), objectives(tenant_id, objective_level),
-- and key_results(objective_id) caused sequential scans + N+1. The service layer now batch-loads
-- key results via findAllByObjectiveIdIn(...) which needs an index on key_results.objective_id.

-- Composite index for /objectives/my — WHERE tenant_id = ? AND owner_id = ?
CREATE INDEX IF NOT EXISTS idx_objectives_tenant_owner
    ON objectives(tenant_id, owner_id)
    WHERE is_deleted = false;

-- Composite index for /company/objectives — WHERE tenant_id = ? AND objective_level = 'COMPANY'
CREATE INDEX IF NOT EXISTS idx_objectives_tenant_level
    ON objectives(tenant_id, objective_level)
    WHERE is_deleted = false;

-- Composite index for cycle-filtered views — WHERE tenant_id = ? AND cycle_id = ?
CREATE INDEX IF NOT EXISTS idx_objectives_tenant_cycle
    ON objectives(tenant_id, cycle_id)
    WHERE is_deleted = false;

-- Supports batch key-result load via findAllByObjectiveIdIn(...)
CREATE INDEX IF NOT EXISTS idx_key_results_objective
    ON key_results(objective_id)
    WHERE is_deleted = false;

-- Supports check-in lookups by objective (used by /objectives/{id}/check-ins)
CREATE INDEX IF NOT EXISTS idx_okr_check_ins_objective
    ON okr_check_ins(objective_id);

CREATE INDEX IF NOT EXISTS idx_okr_check_ins_key_result
    ON okr_check_ins(key_result_id);
