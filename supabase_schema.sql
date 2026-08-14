-- ==============================================================================
-- SWE PORTAL - SUPABASE POSTGRESQL SCHEMA
-- ==============================================================================
-- Run this entire script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Click "RUN"
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT ('usr_' || uuid_generate_v4()),
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

-- 3. BATCHES TABLE
CREATE TABLE IF NOT EXISTS public.batches (
    id TEXT PRIMARY KEY DEFAULT ('batch_' || uuid_generate_v4()),
    name TEXT NOT NULL,
    admission_year INTEGER NOT NULL,
    current_semester INTEGER NOT NULL DEFAULT 1,
    academic_session TEXT NOT NULL,
    cr_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY DEFAULT ('course_' || uuid_generate_v4()),
    code TEXT NOT NULL,
    short_name TEXT,
    title TEXT NOT NULL,
    credits NUMERIC(3,1) NOT NULL DEFAULT 3.0,
    type TEXT NOT NULL DEFAULT 'THEORY' CHECK (type IN ('THEORY', 'LAB', 'PROJECT')),
    semester INTEGER NOT NULL,
    assigned_faculty_id TEXT,
    assigned_faculty_name TEXT,
    batch_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ROUTINE SLOTS TABLE
CREATE TABLE IF NOT EXISTS public.routine_slots (
    id TEXT PRIMARY KEY DEFAULT ('rout_' || uuid_generate_v4()),
    batch_id TEXT NOT NULL,
    day TEXT NOT NULL CHECK (day IN ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY')),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    course_id TEXT NOT NULL,
    course_code TEXT NOT NULL,
    course_short_name TEXT,
    course_title TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    teacher_short_name TEXT,
    room TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EXAMS TABLE
CREATE TABLE IF NOT EXISTS public.exams (
    id TEXT PRIMARY KEY DEFAULT ('exam_' || uuid_generate_v4()),
    batch_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    course_code TEXT NOT NULL,
    course_title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'MIDTERM',
    title TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TEXT,
    room TEXT,
    description TEXT,
    created_by TEXT,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY DEFAULT ('ann_' || uuid_generate_v4()),
    batch_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    publish_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'IMPORTANT', 'URGENT')),
    created_by TEXT,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. DEPARTMENT NOTICES TABLE
CREATE TABLE IF NOT EXISTS public.department_notices (
    id TEXT PRIMARY KEY DEFAULT ('notice_' || uuid_generate_v4()),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'GENERAL' CHECK (category IN ('GENERAL', 'REGISTRATION', 'EXAM', 'SEMINAR', 'HOLIDAY', 'URGENT')),
    publish_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_important BOOLEAN NOT NULL DEFAULT FALSE,
    attachment_url TEXT,
    created_by TEXT,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. RESOURCES (QUESTION BANK, NOTES, LAB REPORTS) TABLE
CREATE TABLE IF NOT EXISTS public.resources (
    id TEXT PRIMARY KEY DEFAULT ('res_' || uuid_generate_v4()),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('QUESTION', 'NOTE', 'LAB')),
    course_id TEXT NOT NULL,
    course_code TEXT NOT NULL,
    course_title TEXT NOT NULL,
    semester INTEGER NOT NULL,
    academic_year INTEGER NOT NULL,
    exam_type TEXT,
    faculty_name TEXT,
    target_batch TEXT,
    lab_category TEXT,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size TEXT,
    file_type TEXT,
    uploader_id TEXT NOT NULL,
    uploader_student_id TEXT NOT NULL,
    uploader_name TEXT NOT NULL,
    uploader_batch_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    rejection_reason TEXT,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

-- 10. FACULTY TABLE
CREATE TABLE IF NOT EXISTS public.faculty (
    id TEXT PRIMARY KEY DEFAULT ('fac_' || uuid_generate_v4()),
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
    id TEXT PRIMARY KEY DEFAULT ('notif_' || uuid_generate_v4()),
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
    id TEXT PRIMARY KEY DEFAULT ('req_' || uuid_generate_v4()),
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
    id TEXT PRIMARY KEY DEFAULT ('log_' || uuid_generate_v4()),
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

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

-- Allow public read & write operations with the anon API key
DO $$
BEGIN
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.users FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Allow public insert access" ON public.users FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow public update access" ON public.users FOR UPDATE USING (true)';

    EXECUTE 'CREATE POLICY "Allow public read access" ON public.batches FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.courses FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.routine_slots FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.exams FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.announcements FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.department_notices FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.resources FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Allow public insert access" ON public.resources FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.faculty FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.notifications FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.routine_requests FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Allow public insert access" ON public.routine_requests FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.audit_logs FOR SELECT USING (true)';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- INITIAL SEED DATA (DEFAULT BATCHES, USERS & COURSES)
-- ==============================================================================

INSERT INTO public.batches (id, name, admission_year, current_semester, academic_session, cr_ids)
VALUES
    ('batch-9', 'SWE 9th Batch', 2023, 5, '2023-2024', '["user-cr-1"]'::jsonb),
    ('batch-8', 'SWE 8th Batch', 2022, 7, '2022-2023', '["user-cr-2"]'::jsonb),
    ('batch-10', 'SWE 10th Batch', 2024, 3, '2024-2025', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, student_id, name, email, phone, role, batch_id, batch_name, current_semester, profile_image, status, points)
VALUES
    ('user-admin-1', 'ADMIN-001', 'Dr. Shahriar Hossain (Dept Head & Admin)', 'admin@swe.edu', '+8801700000000', 'ADMIN', NULL, NULL, 0, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300', 'ACTIVE', 0),
    ('user-cr-1', '252-134-001', 'Mahmudul Hasan (CR - 9th Batch)', 'cr9@swe.edu', '+8801711112222', 'CR', 'batch-9', 'SWE 9th Batch', 5, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300', 'ACTIVE', 0),
    ('user-student-1', '252-134-022', 'Rashedul Hasan', 'rashedul@swe.edu', '+8801812345678', 'STUDENT', 'batch-9', 'SWE 9th Batch', 5, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300', 'ACTIVE', 120)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.courses (id, code, title, credits, type, semester, assigned_faculty_name, batch_ids)
VALUES
    ('course-305', 'SWE 305', 'Database Systems', 3.0, 'THEORY', 5, 'Dr. Tanvir Rahman', '["batch-9"]'::jsonb),
    ('course-307', 'SWE 307', 'Software Engineering', 3.0, 'THEORY', 5, 'Mr. Imran Hossain', '["batch-9"]'::jsonb),
    ('course-309', 'SWE 309', 'Algorithms', 3.0, 'THEORY', 5, 'Prof. Dr. Ahsan Habib', '["batch-9"]'::jsonb),
    ('course-311', 'SWE 311', 'Computer Networks', 3.0, 'THEORY', 5, 'Ms. Nusrat Jahan', '["batch-9"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
