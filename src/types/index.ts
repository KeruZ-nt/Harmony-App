export type UserRole = 'owner' | 'admin' | 'student';
export type StudentStatus = 'Activo' | 'Pausa' | 'Cesado';
export type PlanType = 'Mensual' | 'Trimestral' | 'Semestral';
export type FrequencyType = '1 vez por semana' | '2 veces por semana';

export interface Profile {
  id: string;
  workspace_id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  logo_url?: string;
  google_calendar_token: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  workspace_id: string;
  profile_id: string | null;
  
  first_name: string;
  last_name: string;
  schedule_days: string | null;
  grade_level: string | null;
  birth_date: string | null;
  age: number | null;
  
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  
  plan: PlanType;
  frequency: FrequencyType;
  status: StudentStatus;
  start_date: string;
  next_payment_date: string | null;
  cese_date: string | null;
  
  created_at: string;
}

export interface Session {
  id: string;
  workspace_id: string;
  student_id: string;
  start_time: string; // ISO String
  end_time: string; // ISO String
  observation: string | null;
  status: 'Programada' | 'Asistió' | 'Falta' | 'Feriado' | 'Reprogramada' | 'Corrida' | string; // Keep flexible as requested, defaulting to Programada/Asistió
  google_event_id: string | null;
  created_at: string;
  students?: {
    first_name: string;
    last_name: string;
    plan: PlanType;
    status: StudentStatus;
  };
}
