--liquibase formatted sql

--changeset hrms:084-ai-recruitment-1
CREATE TABLE IF NOT EXISTS candidate_match_scores (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    candidate_id UUID NOT NULL,
    job_opening_id UUID NOT NULL,
    overall_match_score DOUBLE PRECISION NOT NULL,
    skills_match_score DOUBLE PRECISION,
    experience_match_score DOUBLE PRECISION,
    education_match_score DOUBLE PRECISION,
    cultural_fit_score DOUBLE PRECISION,
    matching_criteria TEXT,
    strengths TEXT,
    gaps TEXT,
    recommendation VARCHAR(50),
    ai_model_version VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--changeset hrms:084-ai-recruitment-2
CREATE INDEX IF NOT EXISTS idx_candidate_match_scores_tenant ON candidate_match_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_candidate_match_scores_candidate ON candidate_match_scores(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_match_scores_job ON candidate_match_scores(job_opening_id);
CREATE INDEX IF NOT EXISTS idx_candidate_match_scores_score ON candidate_match_scores(overall_match_score DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_match_scores_unique ON candidate_match_scores(tenant_id, candidate_id, job_opening_id);

--changeset hrms:084-ai-recruitment-3
-- Add AI-related columns to candidates table for parsed resume data
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parsed_skills TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parsed_education TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parsed_experience TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_parsed_at TIMESTAMP;

--changeset hrms:084-ai-recruitment-4
-- Add AI-generated columns to job_openings table
ALTER TABLE job_openings ADD COLUMN IF NOT EXISTS ai_generated_description TEXT;
ALTER TABLE job_openings ADD COLUMN IF NOT EXISTS ai_interview_questions TEXT;
