-- ==============================================================================
-- 001_harmony_schema.sql - Unified Initial Schema
-- ==============================================================================

-- ==============================================================================
-- QUERY 1: Custom Types
-- ==============================================================================
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'colaborador', 'student');
CREATE TYPE student_status AS ENUM ('Activo', 'Pausa', 'Cesado');
CREATE TYPE plan_type AS ENUM ('Mensual', 'Trimestral', 'Semestral');
CREATE TYPE frequency_type AS ENUM ('1 vez por semana', '2 veces por semana');
CREATE TYPE session_status AS ENUM ('Programada', 'Completada', 'Cancelada', 'Ausente');

-- ==============================================================================
-- QUERY 2: Tables
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
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    observation TEXT,
    google_event_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- QUERY 3: Triggers (updated_at)
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- QUERY 4: Triggers (Data Sync)
-- ==============================================================================
CREATE OR REPLACE FUNCTION sync_profile_to_student()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.phone IS DISTINCT FROM OLD.phone) OR (NEW.email IS DISTINCT FROM OLD.email) THEN
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
-- QUERY 5: Triggers (Invitations)
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
-- QUERY 6: RPCs and Helpers
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_workspace(user_id UUID)
RETURNS UUID AS $$
  SELECT workspace_id FROM profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- create_owner_workspace (Used for initial registration of owners)
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


-- check_invitation_details (Used in UI to check invitation role & suggested name)
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


-- handle_user_registration (Handles joining via invitation or falling back to owner creation)
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


-- ==============================================================================
-- QUERY 7: Storage Buckets
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');


-- ==============================================================================
-- QUERY 8: Enable RLS and Policies
-- ==============================================================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Workspaces Policies
CREATE POLICY "Workspace full access for Owner" ON workspaces
FOR ALL USING (id = get_user_workspace(auth.uid()) AND get_user_role(auth.uid()) = 'owner');

CREATE POLICY "Workspace read access for Admin/Student/Colaborador" ON workspaces
FOR SELECT USING (id = get_user_workspace(auth.uid()));

-- Workspace Invitations Policies
CREATE POLICY "Admins can manage invitations" ON workspace_invitations
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.workspace_id = workspace_invitations.workspace_id 
        AND profiles.role IN ('admin', 'owner')
    )
);

-- Profiles Policies
CREATE POLICY "Profiles read access for same workspace" ON profiles
FOR SELECT USING (workspace_id = get_user_workspace(auth.uid()));

CREATE POLICY "Profiles self update" ON profiles
FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Profiles insert from admin/owner" ON profiles
FOR INSERT WITH CHECK (
    workspace_id = get_user_workspace(auth.uid()) 
    AND get_user_role(auth.uid()) IN ('admin', 'owner')
);

CREATE POLICY "Profiles delete from admin/owner" ON profiles
FOR DELETE USING (
    workspace_id = get_user_workspace(auth.uid()) 
    AND get_user_role(auth.uid()) IN ('admin', 'owner')
);

-- Students Policies
CREATE POLICY "Students full access for Owner/Admin" ON students
FOR ALL USING (
    workspace_id = get_user_workspace(auth.uid()) 
    AND get_user_role(auth.uid()) IN ('admin', 'owner')
);

CREATE POLICY "Students read access for Student themselves" ON students
FOR SELECT USING (
    profile_id = auth.uid()
);

-- Sessions Policies
CREATE POLICY "Sessions full access for Owner/Admin" ON sessions
FOR ALL USING (
    workspace_id = get_user_workspace(auth.uid()) 
    AND get_user_role(auth.uid()) IN ('admin', 'owner')
);

CREATE POLICY "Sessions read access for Student themselves" ON sessions
FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
);
