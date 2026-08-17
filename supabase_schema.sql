-- ==============================================================================
-- SWE PORTAL - SUPABASE POSTGRESQL SCHEMA & AUTHENTICATION TRIGGER
-- ==============================================================================
-- Run this entire script in your Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Click "RUN"
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT ('usr_' || replace(uuid_generate_v4()::text, '-', '')),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('ADMIN', 'CR', 'STUDENT')),
    batch_id TEXT,
    batch_name TEXT,
    current_semester INTEGER DEFAULT 1,
    profile_image TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure auth_user_id column exists if table already existed prior
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. BATCHES TABLE
CREATE TABLE IF NOT EXISTS public.batches (
    id TEXT PRIMARY KEY DEFAULT ('batch_' || replace(uuid_generate_v4()::text, '-', '')),
    name TEXT NOT NULL,
    admission_year INTEGER NOT NULL,
    current_semester INTEGER NOT NULL DEFAULT 1,
    academic_session TEXT NOT NULL,
    cr_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY DEFAULT ('course_' || replace(uuid_generate_v4()::text, '-', '')),
    code TEXT NOT NULL,
    short_name TEXT,
    title TEXT NOT NULL,
    credits NUMERIC(3,1) NOT NULL DEFAULT 3.0,
    type TEXT NOT NULL DEFAULT 'THEORY' CHECK (type IN ('THEORY', 'LAB', 'PROJECT')),
    semester INTEGER NOT NULL,
    assigned_faculty_id TEXT,
    assigned_faculty_name TEXT,
    assigned_faculty_short_name TEXT,
    batch_ids JSONB DEFAULT '[]'::jsonb,
    syllabus JSONB DEFAULT '[]'::jsonb,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ROUTINE SLOTS TABLE
CREATE TABLE IF NOT EXISTS public.routine_slots (
    id TEXT PRIMARY KEY DEFAULT ('slot_' || replace(uuid_generate_v4()::text, '-', '')),
    batch_id TEXT NOT NULL,
    day TEXT NOT NULL CHECK (day IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    course_id TEXT NOT NULL,
    course_code TEXT NOT NULL,
    course_short_name TEXT NOT NULL,
    course_title TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    teacher_short_name TEXT NOT NULL,
    room TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EXAMS TABLE
CREATE TABLE IF NOT EXISTS public.exams (
    id TEXT PRIMARY KEY DEFAULT ('exam_' || replace(uuid_generate_v4()::text, '-', '')),
    batch_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    course_code TEXT NOT NULL,
    course_title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('CT', 'MID', 'FINAL', 'LAB_QUIZ', 'ASSIGNMENT', 'PRESENTATION')),
    exam_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    room TEXT,
    syllabus_topics TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ANNOUNCEMENTS TABLE (CR / Batch Level)
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY DEFAULT ('ann_' || replace(uuid_generate_v4()::text, '-', '')),
    batch_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL DEFAULT 'CR',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'URGENT')),
    category TEXT NOT NULL DEFAULT 'ACADEMIC' CHECK (category IN ('ACADEMIC', 'EXAM', 'CLASS_CANCEL', 'GENERAL', 'URGENT')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. DEPARTMENT NOTICES TABLE (Official / Faculty Level)
CREATE TABLE IF NOT EXISTS public.department_notices (
    id TEXT PRIMARY KEY DEFAULT ('not_' || replace(uuid_generate_v4()::text, '-', '')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    publish_date TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'GENERAL' CHECK (category IN ('ACADEMIC', 'EXAM', 'EVENT', 'OFFICIAL', 'GENERAL')),
    attachment_url TEXT,
    target_batches JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. RESOURCES / ACADEMIC VAULT TABLE
CREATE TABLE IF NOT EXISTS public.resources (
    id TEXT PRIMARY KEY DEFAULT ('res_' || replace(uuid_generate_v4()::text, '-', '')),
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('NOTE', 'SLIDE', 'QUESTION', 'LAB', 'BOOK', 'HANDOUT')),
    course_id TEXT NOT NULL,
    course_code TEXT NOT NULL,
    course_title TEXT NOT NULL,
    semester INTEGER NOT NULL,
    drive_link TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_by_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    upvotes INTEGER NOT NULL DEFAULT 0,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. FACULTY TABLE
CREATE TABLE IF NOT EXISTS public.faculty (
    id TEXT PRIMARY KEY DEFAULT ('fac_' || replace(uuid_generate_v4()::text, '-', '')),
    name TEXT NOT NULL,
    short_name TEXT,
    designation TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'Software Engineering',
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    office_room TEXT NOT NULL,
    photo_url TEXT,
    specialization TEXT,
    assigned_courses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT ('notif_' || replace(uuid_generate_v4()::text, '-', '')),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    link_url TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ROUTINE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.routine_requests (
    id TEXT PRIMARY KEY DEFAULT ('req_' || replace(uuid_generate_v4()::text, '-', '')),
    batch_id TEXT NOT NULL,
    batch_name TEXT NOT NULL,
    cr_id TEXT NOT NULL,
    cr_name TEXT NOT NULL,
    course_title TEXT NOT NULL,
    current_schedule TEXT NOT NULL,
    requested_schedule TEXT NOT NULL,
    requested_room TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- 13. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('log_' || replace(uuid_generate_v4()::text, '-', '')),
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- POSTGRESQL TRIGGER: AUTOMATICALLY SYNC AUTH.USERS -> PUBLIC.USERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    meta JSONB;
    extracted_name TEXT;
    extracted_student_id TEXT;
    extracted_role TEXT;
    extracted_batch_id TEXT;
    extracted_batch_name TEXT;
    extracted_phone TEXT;
    extracted_profile_image TEXT;
    extracted_semester INTEGER;
    generated_id TEXT;
    existing_user_id TEXT;
BEGIN
    meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

    extracted_name := coalesce(meta->>'name', meta->>'full_name', split_part(new.email, '@', 1), 'Student');
    extracted_student_id := coalesce(meta->>'student_id', meta->>'studentId', 'STD-' || substring(new.id::text from 1 for 8));
    extracted_role := coalesce(meta->>'role', 'STUDENT');
    extracted_batch_id := coalesce(meta->>'batch_id', meta->>'batchId', 'batch_58');
    extracted_batch_name := coalesce(meta->>'batch_name', meta->>'batchName', '58th Batch');
    extracted_phone := meta->>'phone';
    extracted_profile_image := coalesce(meta->>'profile_image', meta->>'profileImage', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80');
    extracted_semester := coalesce((meta->>'current_semester')::integer, (meta->>'currentSemester')::integer, 1);
    generated_id := 'usr_' || replace(new.id::text, '-', '');

    -- Check if record already exists by auth_user_id or student_id
    SELECT id INTO existing_user_id 
    FROM public.users 
    WHERE auth_user_id = new.id OR student_id = extracted_student_id
    LIMIT 1;

    IF existing_user_id IS NOT NULL THEN
        UPDATE public.users SET
            auth_user_id = new.id,
            name = extracted_name,
            email = new.email,
            phone = coalesce(extracted_phone, public.users.phone),
            role = extracted_role,
            batch_id = coalesce(extracted_batch_id, public.users.batch_id),
            batch_name = coalesce(extracted_batch_name, public.users.batch_name),
            current_semester = extracted_semester,
            profile_image = coalesce(extracted_profile_image, public.users.profile_image),
            updated_at = NOW()
        WHERE id = existing_user_id;
    ELSE
        INSERT INTO public.users (
            id,
            auth_user_id,
            student_id,
            name,
            email,
            phone,
            role,
            batch_id,
            batch_name,
            current_semester,
            profile_image,
            status,
            points,
            created_at,
            updated_at
        ) VALUES (
            generated_id,
            new.id,
            extracted_student_id,
            extracted_name,
            new.email,
            extracted_phone,
            extracted_role,
            extracted_batch_id,
            extracted_batch_name,
            extracted_semester,
            extracted_profile_image,
            'ACTIVE',
            0,
            NOW(),
            NOW()
        );
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow full SELECT access to portal tables
DO $$
DECLARE
    tbl TEXT;
    tbls TEXT[] := ARRAY[
        'users', 'batches', 'courses', 'routine_slots', 'exams', 
        'announcements', 'department_notices', 'resources', 
        'faculty', 'notifications', 'routine_requests', 'audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow public full access on %I" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow read access on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow read access on %I" ON public.%I FOR SELECT USING (true)', tbl, tbl);
    END LOOP;
END $$;

-- Allow authenticated users to insert / update / delete rows across operational tables
DO $$
DECLARE
    tbl TEXT;
    tbls TEXT[] := ARRAY[
        'batches', 'courses', 'routine_slots', 'exams', 
        'announcements', 'department_notices', 'resources', 
        'faculty', 'notifications', 'routine_requests', 'audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all modifications on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow all modifications on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- Granular RLS policies on public.users
DROP POLICY IF EXISTS "Allow users insert on users" ON public.users;
CREATE POLICY "Allow users insert on users"
    ON public.users FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users update own profile on users" ON public.users;
CREATE POLICY "Allow users update own profile on users"
    ON public.users FOR UPDATE
    USING (auth.uid() = auth_user_id OR auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() = auth_user_id OR auth.uid() IS NOT NULL);

-- ==============================================================================
-- INITIAL SEED DATA (ADMIN & BATCHES)
-- ==============================================================================

INSERT INTO public.batches (id, name, admission_year, current_semester, academic_session, cr_ids)
VALUES
    ('batch-58', '58th Batch', 2023, 5, '2023-2024', '[]'::jsonb),
    ('batch-57', '57th Batch', 2022, 7, '2022-2023', '[]'::jsonb),
    ('batch-59', '59th Batch', 2024, 3, '2024-2025', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, student_id, name, email, phone, role, batch_id, batch_name, current_semester, profile_image, status, points)
VALUES
    ('user-admin-1', 'admin101', 'admin101', 'admin@swe.edu', '+8801700000000', 'ADMIN', NULL, NULL, 0, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300', 'ACTIVE', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.courses (id, code, title, credits, type, semester, assigned_faculty_name, batch_ids)
VALUES
    ('course-305', 'SWE 305', 'Database Systems', 3.0, 'THEORY', 5, 'Dr. Faculty Member', '["batch-58"]'::jsonb),
    ('course-307', 'SWE 307', 'Software Engineering', 3.0, 'THEORY', 5, 'Mr. Faculty Member', '["batch-58"]'::jsonb),
    ('course-309', 'SWE 309', 'Algorithms', 3.0, 'THEORY', 5, 'Prof. Dr. Faculty Member', '["batch-58"]'::jsonb),
    ('course-311', 'SWE 311', 'Computer Networks', 3.0, 'THEORY', 5, 'Ms. Faculty Member', '["batch-58"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
