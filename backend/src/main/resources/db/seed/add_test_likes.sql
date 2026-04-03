-- ============================================================
-- Create test employees + add likes to the most recent wall post
-- Run: docker exec -i hrms-postgres psql -U hrms -d hrms_dev < backend/src/main/resources/db/seed/add_test_likes.sql
-- ============================================================

DO
$$
DECLARE
v_post_id UUID;
    v_tenant_id
UUID;
    v_count
INT := 0;
    v_user_id
UUID;
    v_emp_id
UUID;
    v_existing_user_id
UUID;
    v_existing_emp_id
UUID;
    v_email
TEXT;
    v_emp_code
TEXT;
    v_names
TEXT[][] := ARRAY[
        ARRAY['Arjun', 'Patel'],
        ARRAY['Priya', 'Sharma'],
        ARRAY['Rahul', 'Verma'],
        ARRAY['Meera', 'Nair'],
        ARRAY['Vikram', 'Singh'],
        ARRAY['Kavitha', 'Rajan'],
        ARRAY['Deepa', 'Kumar'],
        ARRAY['Ananya', 'Reddy']
    ];
    v_designations
TEXT[] := ARRAY[
        'Senior Engineer', 'Product Manager', 'Tech Lead',
        'UX Designer', 'DevOps Engineer', 'QA Lead',
        'HR Manager', 'Data Analyst'
    ];
    i
INT;
BEGIN
SELECT id, tenant_id
INTO v_post_id, v_tenant_id
FROM social_posts
WHERE is_deleted = false
ORDER BY created_at DESC LIMIT 1;

IF
v_post_id IS NULL THEN
        RAISE NOTICE 'No active social posts found!';
        RETURN;
END IF;

    RAISE
NOTICE 'Post: % (tenant: %)', v_post_id, v_tenant_id;

FOR i IN 1..8 LOOP
        v_email := lower(v_names[i][1]) || '.' || lower(v_names[i][2]) || '@nulogic.io';
        v_emp_code
:= 'EMP-' || LPAD((1000 + i)::TEXT, 4, '0');

        -- Check if user already exists
SELECT id
INTO v_existing_user_id
FROM users
WHERE email = v_email
  AND tenant_id = v_tenant_id;

IF
v_existing_user_id IS NULL THEN
            v_user_id := gen_random_uuid();
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash,
                   status, mfa_enabled, is_deleted, version,
                   created_at, updated_at)
VALUES (v_user_id, v_tenant_id, v_email,
        v_names[i][1], v_names[i][2],
        '$2a$10$dummyhashnotusedforlogin000000000000000000000000000000',
        'ACTIVE', false, false, 0,
        NOW() - interval '30 days', NOW());
RAISE
NOTICE 'Created user: %', v_email;
ELSE
            v_user_id := v_existing_user_id;
            RAISE
NOTICE 'User exists: %', v_email;
END IF;

        -- Check if employee already exists
SELECT id
INTO v_existing_emp_id
FROM employees
WHERE employee_code = v_emp_code
  AND tenant_id = v_tenant_id;

IF
v_existing_emp_id IS NULL THEN
            v_emp_id := gen_random_uuid();
INSERT INTO employees (id, tenant_id, user_id, employee_code, first_name, last_name,
                       designation, status, employment_type, joining_date,
                       is_deleted, version, created_at, updated_at)
VALUES (v_emp_id, v_tenant_id, v_user_id, v_emp_code,
        v_names[i][1], v_names[i][2], v_designations[i],
        'ACTIVE', 'FULL_TIME', (NOW() - interval '180 days'):: date,
        false, 0, NOW() - interval '30 days', NOW());
RAISE
NOTICE 'Created employee: % %', v_names[i][1], v_names[i][2];
ELSE
            v_emp_id := v_existing_emp_id;
            RAISE
NOTICE 'Employee exists: % %', v_names[i][1], v_names[i][2];
END IF;

        -- Add like if not already liked
        IF
NOT EXISTS (SELECT 1 FROM post_reactions WHERE post_id = v_post_id AND employee_id = v_emp_id) THEN
            INSERT INTO post_reactions (id, tenant_id, post_id, employee_id, reaction_type, created_at)
            VALUES (gen_random_uuid(), v_tenant_id, v_post_id, v_emp_id, 'LIKE', NOW() - (i * interval '10 minutes'));
            v_count
:= v_count + 1;
            RAISE
NOTICE 'Added like from: % %', v_names[i][1], v_names[i][2];
ELSE
            RAISE NOTICE 'Already liked by: % %', v_names[i][1], v_names[i][2];
END IF;
END LOOP;

    -- Update denormalized likes_count
UPDATE social_posts
SET likes_count = (SELECT COUNT(*) FROM post_reactions WHERE post_id = v_post_id)
WHERE id = v_post_id;

RAISE
NOTICE 'Done! Added % new likes. Total: %',
        v_count,
        (SELECT COUNT(*) FROM post_reactions WHERE post_id = v_post_id);
END $$;

-- Verify
SELECT sp.content                             AS post,
       CONCAT(e.first_name, ' ', e.last_name) AS liked_by,
       e.designation,
       pr.reaction_type,
       pr.created_at
FROM post_reactions pr
       JOIN social_posts sp ON sp.id = pr.post_id
       JOIN employees e ON e.id = pr.employee_id
WHERE sp.is_deleted = false
ORDER BY pr.created_at DESC;
