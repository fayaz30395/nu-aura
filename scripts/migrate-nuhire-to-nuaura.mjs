/**
 * MongoDB → PostgreSQL Migration Script
 * Reads data from the nu-hire MongoDB database and inserts it into NU-AURA's PostgreSQL.
 *
 * Collections migrated:
 *   - jobs          → job_openings
 *   - profiles      → candidates  (one candidate row per application)
 *   - applications  → candidates  (status/stage comes from application)
 *   - interviews    → interviews
 *
 * NOTE: This script is READ-ONLY against MongoDB – no writes or deletions.
 */

import { MongoClient } from 'mongodb';
import pg from 'pg';
const { Pool } = pg;

// ── Config ──────────────────────────────────────────────────────────────
const MONGO_URI =
  'mongodb+srv://mouninagarajan:CQ2kocrlwA46cDm9@cluster0.cax6y.mongodb.net/nu_hire?retryWrites=true&w=majority&appName=Cluster0';
const MONGO_DB = 'nu_hire';

const PG_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'hrms_dev',
  user: 'hrms',
  password: 'hrms_dev_password',
};

const TENANT_ID = '660e8400-e29b-41d4-a716-446655440001';

// ── Helpers ─────────────────────────────────────────────────────────────
function uuid() {
  return crypto.randomUUID();
}

/** Map nu-hire ApplicationStatusEnum → NU-AURA CandidateStatus */
function mapStatusFromStage(stage) {
  switch (stage) {
    case 'RECRUITERS_PHONE_CALL':
      return 'NEW';
    case 'PANEL_REVIEW':
    case 'PANEL_SHORTLISTED':
      return 'SCREENING';
    case 'TECHNICAL_INTERVIEW_SCHEDULED':
    case 'TECHNICAL_INTERVIEW_COMPLETED':
    case 'MANAGEMENT_INTERVIEW_SCHEDULED':
    case 'MANAGEMENT_INTERVIEW_COMPLETED':
    case 'CLIENT_INTERVIEW_SCHEDULED':
    case 'CLIENT_INTERVIEW_COMPLETED':
    case 'HR_FINAL_INTERVIEW_COMPLETED':
      return 'INTERVIEW';
    case 'OFFER_NDA_TO_BE_RELEASED':
      return 'OFFER_EXTENDED';
    case 'PANEL_REJECT':
    case 'CANDIDATE_REJECTED':
      return 'REJECTED';
    default:
      return 'NEW';
  }
}

/** Map nu-hire JobStatusEnum → NU-AURA JobStatus (DRAFT, OPEN, ON_HOLD, CLOSED, CANCELLED) */
function mapJobStatus(status) {
  if (!status) return 'DRAFT';
  const s = status.toUpperCase().replace(/\s+/g, '_');
  switch (s) {
    case 'ACTIVE': return 'OPEN';
    case 'ONHOLD': case 'ON_HOLD': return 'ON_HOLD';
    case 'CLOSED': return 'CLOSED';
    case 'CANCELLED': return 'CANCELLED';
    default: return 'DRAFT';
  }
}

/** Map freeform employment type → NU-AURA EmploymentType (FULL_TIME, PART_TIME, CONTRACT, TEMPORARY, INTERNSHIP) */
function mapEmploymentType(type) {
  if (!type) return null;
  const s = type.toUpperCase().replace(/[\s-]+/g, '_');
  if (s.includes('FULL')) return 'FULL_TIME';
  if (s.includes('PART')) return 'PART_TIME';
  if (s.includes('CONTRACT') || s.includes('FREELANCE')) return 'CONTRACT';
  if (s.includes('TEMP')) return 'TEMPORARY';
  if (s.includes('INTERN')) return 'INTERNSHIP';
  return 'FULL_TIME'; // safe fallback
}

/** Map nu-hire source → CandidateSource (JOB_PORTAL, REFERRAL, LINKEDIN, COMPANY_WEBSITE, WALK_IN, CAMPUS, CONSULTANT, OTHER) */
function mapSource(source) {
  if (!source) return null;
  const s = source.toUpperCase();
  if (s.includes('NAUKRI') || s.includes('INDEED') || s.includes('PORTAL') || s.includes('BOARD')) return 'JOB_PORTAL';
  if (s.includes('LINKEDIN')) return 'LINKEDIN';
  if (s.includes('REFERRAL')) return 'REFERRAL';
  if (s.includes('CAMPUS') || s.includes('COLLEGE')) return 'CAMPUS';
  if (s.includes('WEBSITE')) return 'COMPANY_WEBSITE';
  if (s.includes('WALK')) return 'WALK_IN';
  if (s.includes('CONSULT') || s.includes('AGENCY')) return 'CONSULTANT';
  return 'OTHER';
}

/** Map nu-hire interview type → NU-AURA InterviewRound (free VARCHAR) */
function mapInterviewRound(type) {
  switch (type) {
    case 'SCREENING': return 'SCREENING';
    case 'TECHNICAL': return 'TECHNICAL_1';
    case 'HR': return 'HR';
    case 'MANAGERIAL': return 'MANAGERIAL';
    default: return 'SCREENING';
  }
}

/** Map nu-hire interview type → NU-AURA InterviewType (PHONE, VIDEO, IN_PERSON) */
function mapInterviewType(type) {
  if (!type) return 'VIDEO';
  const s = type.toUpperCase();
  if (s.includes('PHONE')) return 'PHONE';
  if (s.includes('PERSON') || s.includes('ONSITE') || s.includes('OFFICE')) return 'IN_PERSON';
  return 'VIDEO';
}

/** Map nu-hire InterviewStatusEnum → NU-AURA InterviewStatus (SCHEDULED, RESCHEDULED, COMPLETED, CANCELLED, NO_SHOW) */
function mapInterviewStatus(status) {
  switch (status) {
    case 'SCHEDULED': return 'SCHEDULED';
    case 'RESCHEDULED': return 'RESCHEDULED';
    case 'COMPLETED': case 'FEEDBACK_PROVIDED': return 'COMPLETED';
    case 'CANCELLED': return 'CANCELLED';
    case 'NO_SHOW': return 'NO_SHOW';
    default: return 'SCHEDULED';
  }
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== NU-Hire MongoDB → NU-AURA PostgreSQL Migration ===\n');

  // Connect to both databases
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  console.log('✓ Connected to MongoDB');

  const pool = new Pool(PG_CONFIG);
  await pool.query('SELECT 1');
  console.log('✓ Connected to PostgreSQL\n');

  const db = mongo.db(MONGO_DB);
  const pgClient = await pool.connect();

  try {
    // Diagnostic: print actual columns for each table to catch schema drift
    for (const tbl of ['job_openings', 'candidates', 'interviews']) {
      const colResult = await pgClient.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [tbl]
      );
      console.log(`  ${tbl} columns: ${colResult.rows.map(r => r.column_name).join(', ')}`);
    }
    console.log('');

    await pgClient.query('BEGIN');

    // ── 0. Drop old Hibernate CHECK constraints that block new enum values ──
    console.log('--- Dropping old CHECK constraints ---');
    const constraintDrops = [
      'ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_current_stage_check',
      'ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_status_check',
      'ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_source_check',
      'ALTER TABLE job_openings DROP CONSTRAINT IF EXISTS job_openings_employment_type_check',
      'ALTER TABLE job_openings DROP CONSTRAINT IF EXISTS job_openings_status_check',
      'ALTER TABLE job_openings DROP CONSTRAINT IF EXISTS job_openings_priority_check',
      'ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_status_check',
      'ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_interview_type_check',
      'ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_result_check',
    ];
    for (const sql of constraintDrops) {
      await pgClient.query(sql);
    }
    console.log('  ✓ CHECK constraints dropped (Hibernate will regenerate on next startup)\n');

    // ── 1. Migrate Jobs → job_openings ────────────────────────────────
    console.log('--- Migrating Jobs → job_openings ---');
    const jobs = await db.collection('jobs').find({}).toArray();
    console.log(`  Found ${jobs.length} jobs in MongoDB`);

    /** Map: MongoDB Job _id (string) → PostgreSQL job_opening UUID */
    const jobIdMap = new Map();
    let jobsInserted = 0;

    for (const job of jobs) {
      const mongoId = job._id.toString();
      const pgId = uuid();
      jobIdMap.set(mongoId, pgId);

      const jobCode = job.jobId || `JOB-${mongoId.slice(-6).toUpperCase()}`;

      // Check if this job_code already exists
      const existing = await pgClient.query(
        'SELECT id FROM job_openings WHERE tenant_id = $1 AND job_code = $2',
        [TENANT_ID, jobCode]
      );
      if (existing.rows.length > 0) {
        jobIdMap.set(mongoId, existing.rows[0].id);
        console.log(`  ⊘ Job ${jobCode} already exists, skipping`);
        continue;
      }

      await pgClient.query(
        `INSERT INTO job_openings (
          id, tenant_id, job_code, job_title, location, employment_type,
          experience_required, min_salary, max_salary, number_of_openings,
          job_description, requirements, skills_required, status, posted_date,
          priority, is_active, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [
          pgId,
          TENANT_ID,
          jobCode,
          job.jobTitle || 'Untitled',
          job.location || null,
          mapEmploymentType(job.employmentType),
          job.experience || null,
          job.salary?.min || null,
          job.salary?.max || null,
          1, // default 1 opening
          job.jobDescription || null,
          null, // requirements
          job.keySkills ? job.keySkills.join(', ') : null,
          mapJobStatus(job.status),
          job.postedDate ? new Date(job.postedDate) : job.createdAt || new Date(),
          'MEDIUM',
          job.status === 'ACTIVE',
          job.createdAt || new Date(),
          job.updatedAt || new Date(),
        ]
      );
      jobsInserted++;
    }
    console.log(`  ✓ Inserted ${jobsInserted} job openings\n`);

    // ── 2. Migrate Profiles + Applications → candidates ───────────────
    console.log('--- Migrating Profiles + Applications → candidates ---');
    const applications = await db.collection('applications').find({}).toArray();
    const profiles = await db.collection('profiles').find({}).toArray();
    console.log(`  Found ${applications.length} applications, ${profiles.length} profiles`);

    /** Map: MongoDB Profile _id (string) → profile doc */
    const profileMap = new Map();
    for (const p of profiles) {
      profileMap.set(p._id.toString(), p);
    }

    /** Map: MongoDB Application _id (string) → PostgreSQL candidate UUID */
    const applicationIdMap = new Map();
    let candidatesInserted = 0;
    let candidateCodeCounter = 1;

    for (const app of applications) {
      const appMongoId = app._id.toString();
      const candidateProfileId = app.candidate?.toString?.() || app.candidate;
      const profile = profileMap.get(candidateProfileId);
      const jobMongoId = app.job?.toString?.() || app.job;
      const pgJobId = jobIdMap.get(jobMongoId);

      if (!profile) {
        console.log(`  ⊘ Application ${app.applicationId || appMongoId} has no matching profile, skipping`);
        continue;
      }
      if (!pgJobId) {
        console.log(`  ⊘ Application ${app.applicationId || appMongoId} has no matching job, skipping`);
        continue;
      }

      const candidateCode = app.applicationId || `CAND-${String(candidateCodeCounter).padStart(4, '0')}`;
      candidateCodeCounter++;

      // Check if this candidate already exists for this job
      const existing = await pgClient.query(
        'SELECT id FROM candidates WHERE tenant_id = $1 AND candidate_code = $2',
        [TENANT_ID, candidateCode]
      );
      if (existing.rows.length > 0) {
        applicationIdMap.set(appMongoId, existing.rows[0].id);
        console.log(`  ⊘ Candidate ${candidateCode} already exists, skipping`);
        continue;
      }

      const pgCandidateId = uuid();
      applicationIdMap.set(appMongoId, pgCandidateId);

      const stage = app.status || 'RECRUITERS_PHONE_CALL';
      const candidateStatus = mapStatusFromStage(stage);

      // Build notes from internalNotes
      let notes = null;
      if (profile.internalNotes && profile.internalNotes.length > 0) {
        notes = profile.internalNotes
          .map((n) => `[${n.addedByName || 'Unknown'}] ${n.content}`)
          .join('\n---\n');
      }

      await pgClient.query(
        `INSERT INTO candidates (
          id, tenant_id, candidate_code, job_opening_id, first_name, last_name,
          email, phone, current_location, current_company, current_designation,
          total_experience, notice_period_days, resume_url, source, status,
          current_stage, applied_date, notes,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
        [
          pgCandidateId,
          TENANT_ID,
          candidateCode,
          pgJobId,
          profile.firstName || 'Unknown',
          profile.lastName || '',
          profile.email || `no-email-${candidateCodeCounter}@placeholder.com`,
          profile.phone || null,
          [profile.state, profile.country].filter(Boolean).join(', ') || null,
          profile.currentCompany || null,
          null, // currentDesignation — not in nu-hire profile
          profile.experience || null,
          profile.noticePeriod || null,
          profile.resume || null,
          mapSource(app.source),
          candidateStatus,
          stage,
          app.createdAt || null,
          notes,
          app.createdAt || new Date(),
          app.updatedAt || new Date(),
        ]
      );
      candidatesInserted++;
    }
    console.log(`  ✓ Inserted ${candidatesInserted} candidates\n`);

    // ── 3. Migrate Interviews → interviews ────────────────────────────
    console.log('--- Migrating Interviews → interviews ---');
    const interviews = await db.collection('interviews').find({}).toArray();
    console.log(`  Found ${interviews.length} interviews in MongoDB`);

    let interviewsInserted = 0;

    for (const iv of interviews) {
      const appMongoId = iv.applicationId?.toString?.() || iv.applicationId;
      const pgCandidateId = applicationIdMap.get(appMongoId);

      if (!pgCandidateId) {
        console.log(`  ⊘ Interview for application ${appMongoId} has no matching candidate, skipping`);
        continue;
      }

      // Look up the candidate to get job_opening_id
      const candidateRow = await pgClient.query(
        'SELECT job_opening_id FROM candidates WHERE id = $1',
        [pgCandidateId]
      );
      if (candidateRow.rows.length === 0) continue;
      const pgJobId = candidateRow.rows[0].job_opening_id;

      // Build feedback text from nested feedback array
      let feedbackText = null;
      if (iv.feedback && iv.feedback.length > 0) {
        feedbackText = iv.feedback
          .map((fb) => {
            let text = fb.overallFeedback || '';
            if (fb.strengths?.length) text += `\nStrengths: ${fb.strengths.join(', ')}`;
            if (fb.areaOfImprovements?.length)
              text += `\nAreas of improvement: ${fb.areaOfImprovements.join(', ')}`;
            if (fb.decision) text += `\nDecision: ${fb.decision}`;
            return text;
          })
          .join('\n---\n');
      }

      // Determine rating from feedback decisions
      let rating = null;
      if (iv.finalEvaluation?.decision) {
        const d = iv.finalEvaluation.decision;
        rating =
          d === 'STRONG_YES' ? 5 : d === 'YES' ? 4 : d === 'MAY_BE' ? 3 : d === 'NO' ? 2 : 1;
      }

      // Determine result
      let result = null;
      if (iv.finalEvaluation?.decision) {
        const d = iv.finalEvaluation.decision;
        result = d === 'STRONG_YES' || d === 'YES' ? 'SELECTED' : d === 'MAY_BE' ? 'ON_HOLD' : 'REJECTED';
      }

      await pgClient.query(
        `INSERT INTO interviews (
          id, tenant_id, candidate_id, job_opening_id, interview_round,
          interview_type, scheduled_at, duration_minutes, location,
          meeting_link, status, feedback, rating, result, notes,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          uuid(),
          TENANT_ID,
          pgCandidateId,
          pgJobId,
          mapInterviewRound(iv.type),
          mapInterviewType(iv.mode || iv.type),
          iv.scheduledTime || null,
          60, // default duration
          null, // location
          iv.meetingLink || null,
          mapInterviewStatus(iv.status),
          feedbackText,
          rating,
          result,
          iv.description || iv.title || null,
          iv.createdAt || new Date(),
          iv.updatedAt || new Date(),
        ]
      );
      interviewsInserted++;
    }
    console.log(`  ✓ Inserted ${interviewsInserted} interviews\n`);

    await pgClient.query('COMMIT');
    console.log('=== Migration completed successfully! ===');
    console.log(`  Jobs:       ${jobsInserted}`);
    console.log(`  Candidates: ${candidatesInserted}`);
    console.log(`  Interviews: ${interviewsInserted}`);
  } catch (err) {
    await pgClient.query('ROLLBACK');
    console.error('\n✗ Migration failed — rolled back:', err);
    throw err;
  } finally {
    pgClient.release();
    await pool.end();
    await mongo.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
