-- ==============================================================================
-- 001_harmony_schema_v2.sql - Unified Initial Schema (Redesigned for Robust RLS)
-- ==============================================================================

-- ==============================================================================
-- 1. DROP EXISTING CONSTRUCTS (For clean re-runs during development)
-- ==============================================================================
DROP TRIGGER IF EXISTS delete_invitation_on_profile_insert_trigger ON profiles CASCADE;
DROP TRIGGER IF EXISTS sync_profile_to_student_trigger ON profiles CASCADE;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions CASCADE;
DROP TRIGGER IF EXISTS update_students_updated_at ON students CASCADE;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles CASCADE;

DROP FUNCTION IF EXISTS delete_invitation_on_profile_insert() CASCADE;
DROP FUNCTION IF EXISTS sync_profile_to_student() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_user_registration(UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS check_invitation_details(TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_owner_workspace(UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_auth_user_workspace() CASCADE;
DROP FUNCTION IF EXISTS get_auth_user_role() CASCADE;

DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS workspace_invitations CASCADE;
DROP TABLE IF EXISTS blocked_days CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;

DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS frequency_type CASCADE;
DROP TYPE IF EXISTS plan_type CASCADE;
DROP TYPE IF EXISTS student_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;


-- ==============================================================================
-- 2. CUSTOM TYPES
-- ==============================================================================
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'colaborador', 'student');
CREATE TYPE student_status AS ENUM ('Activo', 'Pausa', 'Cesado');
CREATE TYPE plan_type AS ENUM ('Mensual', 'Trimestral', 'Semestral');
CREATE TYPE frequency_type AS ENUM ('1 vez por semana', '2 veces por semana');
CREATE TYPE session_status AS ENUM ('Programada', 'Completada', 'Cancelada', 'Ausente', 'Asistió', 'Falta', 'Reprogramada', 'Feriado');
CREATE TYPE session_type AS ENUM ('Regular', 'Reprogramación', 'Cambio de Horario');


-- ==============================================================================
-- 3. TABLES DEFINITION
-- ==============================================================================
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    google_calendar_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, email)
);

CREATE TABLE blocked_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason TEXT NOT NULL DEFAULT 'Feriado',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, date)
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'student',
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    schedule_days TEXT,
    grade_level TEXT,
    birth_date DATE,
    age INTEGER,
    
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    
    plan plan_type DEFAULT 'Mensual',
    frequency frequency_type DEFAULT '1 vez por semana',
    status student_status DEFAULT 'Activo',
    start_date DATE DEFAULT CURRENT_DATE,
    next_payment_date DATE,
    cese_date DATE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status session_status DEFAULT 'Programada',
    type session_type DEFAULT 'Regular',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    observation TEXT,
    google_event_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==============================================================================
-- 4. HELPER FUNCTIONS FOR RLS (Security Definer, Zero Params = Safe)
-- ==============================================================================
-- These functions fetch the current user's workspace and role securely.
-- Because they take no parameters and read auth.uid(), they are safe from injection.
CREATE OR REPLACE FUNCTION get_auth_workspace_id()
RETURNS UUID AS $$
  SELECT workspace_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- WORKSPACES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Workspaces: Read access for members" ON workspaces
FOR SELECT USING (id = get_auth_workspace_id());

CREATE POLICY "Workspaces: Full access for owners" ON workspaces
FOR ALL USING (id = get_auth_workspace_id() AND get_auth_user_role() = 'owner')
WITH CHECK (id = get_auth_workspace_id() AND get_auth_user_role() = 'owner');

-- ------------------------------------------------------------------------------
-- WORKSPACE INVITATIONS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Invitations: Admins and Owners can manage" ON workspace_invitations
FOR ALL USING (
    workspace_id = get_auth_workspace_id() 
    AND get_auth_user_role() IN ('admin', 'owner')
)
WITH CHECK (
    workspace_id = get_auth_workspace_id() 
    AND get_auth_user_role() IN ('admin', 'owner')
);

-- ------------------------------------------------------------------------------
-- BLOCKED DAYS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Blocked Days: Full access for staff" ON blocked_days
FOR ALL USING (
    workspace_id = get_auth_workspace_id()
    AND get_auth_user_role() IN ('admin', 'owner', 'colaborador')
)
WITH CHECK (
    workspace_id = get_auth_workspace_id()
    AND get_auth_user_role() IN ('admin', 'owner', 'colaborador')
);

CREATE POLICY "Blocked Days: Students can view" ON blocked_days
FOR SELECT USING (
    workspace_id = get_auth_workspace_id()
);

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Profiles: Read access for workspace members" ON profiles
FOR SELECT USING (workspace_id = get_auth_workspace_id());

CREATE POLICY "Profiles: Users can update their own profile" ON profiles
FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Profiles: Admins and Owners can insert/delete" ON profiles
FOR INSERT WITH CHECK (
    workspace_id = get_auth_workspace_id() 
    AND get_auth_user_role() IN ('admin', 'owner')
);

CREATE POLICY "Profiles: Admins and Owners can delete" ON profiles
FOR DELETE USING (
    workspace_id = get_auth_workspace_id() 
    AND get_auth_user_role() IN ('admin', 'owner')
);

-- ------------------------------------------------------------------------------
-- STUDENTS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Students: Staff has full access" ON students
FOR ALL USING (
    workspace_id = get_auth_workspace_id() 
    AND get_auth_user_role() IN ('admin', 'owner', 'colaborador')
)
WITH CHECK (
    workspace_id = get_auth_workspace_id() 
    AND get_auth_user_role() IN ('admin', 'owner', 'colaborador')
);

CREATE POLICY "Students: Students can read their own data" ON students
FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Students: Allow update contact by trigger" ON students
FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- ------------------------------------------------------------------------------
-- SESSIONS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Sessions: Staff has full access" ON sessions
FOR ALL USING (
    workspace_id = get_auth_workspace_id() 
    AND get_auth_user_role() IN ('admin', 'owner', 'colaborador')
)
WITH CHECK (
    workspace_id = get_auth_workspace_id() 
    AND get_auth_user_role() IN ('admin', 'owner', 'colaborador')
);

CREATE POLICY "Sessions: Students can read their own sessions" ON sessions
FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
);


-- ==============================================================================
-- 6. STORAGE BUCKETS & POLICIES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars: Publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Avatars: Users can upload their own" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Avatars: Users can update their own" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Avatars: Users can delete their own" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');


-- ==============================================================================
-- 7. AUTOMATIC TIMESTAMPS (Triggers)
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- 8. DATA SYNC TRIGGERS
-- ==============================================================================
-- This trigger safely copies phone/email changes from profiles to students.
CREATE OR REPLACE FUNCTION sync_profile_to_student()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.phone IS DISTINCT FROM OLD.phone) OR (NEW.email IS DISTINCT FROM OLD.email) THEN
    -- Only update if the contact actually exists in students
    UPDATE students
    SET 
      contact_phone = COALESCE(NEW.phone, contact_phone),
      contact_email = COALESCE(NEW.email, contact_email)
    WHERE profile_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_profile_to_student_trigger
AFTER UPDATE OF phone, email ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_profile_to_student();


-- ==============================================================================
-- 9. INVITATION CLEANUP TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION delete_invitation_on_profile_insert()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM workspace_invitations 
    WHERE workspace_id = NEW.workspace_id AND email = NEW.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER delete_invitation_on_profile_insert_trigger
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION delete_invitation_on_profile_insert();


-- ==============================================================================
-- 10. BUSINESS LOGIC RPCs (Registration and Checking)
-- ==============================================================================
CREATE OR REPLACE FUNCTION create_owner_workspace(
    user_id UUID,
    p_workspace_name TEXT,
    p_full_name TEXT,
    p_email TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_workspace_id UUID;
BEGIN
    INSERT INTO workspaces (name) VALUES (p_workspace_name) RETURNING id INTO v_workspace_id;
    INSERT INTO profiles (id, workspace_id, role, full_name, email)
    VALUES (user_id, v_workspace_id, 'owner', p_full_name, p_email);
END;
$$;

CREATE OR REPLACE FUNCTION check_invitation_details(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invite RECORD;
    v_student RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_invite FROM workspace_invitations WHERE email = p_email ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('has_invitation', false);
    END IF;

    v_result := jsonb_build_object('has_invitation', true, 'role', v_invite.role);

    IF v_invite.role = 'student' THEN
        SELECT first_name, last_name INTO v_student FROM students WHERE contact_email = p_email AND workspace_id = v_invite.workspace_id LIMIT 1;
        IF FOUND THEN
            v_result := jsonb_set(v_result, '{suggested_name}', to_jsonb(trim(v_student.first_name || ' ' || COALESCE(v_student.last_name, ''))));
        END IF;
    END IF;
    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION handle_user_registration(
    p_user_id UUID,
    p_workspace_name TEXT,
    p_full_name TEXT,
    p_email TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invite RECORD;
    v_workspace_id UUID;
BEGIN
    SELECT * INTO v_invite FROM workspace_invitations WHERE email = p_email ORDER BY created_at DESC LIMIT 1;

    IF FOUND THEN
        v_workspace_id := v_invite.workspace_id;
        INSERT INTO profiles (id, workspace_id, role, full_name, email)
        VALUES (p_user_id, v_workspace_id, v_invite.role, p_full_name, p_email);

        IF v_invite.role = 'student' THEN
            UPDATE students SET profile_id = p_user_id 
            WHERE workspace_id = v_workspace_id AND contact_email = p_email AND profile_id IS NULL;
        END IF;

        DELETE FROM workspace_invitations WHERE id = v_invite.id;
    ELSE
        INSERT INTO workspaces (name) VALUES (p_workspace_name) RETURNING id INTO v_workspace_id;
        INSERT INTO profiles (id, workspace_id, role, full_name, email)
        VALUES (p_user_id, v_workspace_id, 'owner', p_full_name, p_email);
    END IF;
END;
$$;
