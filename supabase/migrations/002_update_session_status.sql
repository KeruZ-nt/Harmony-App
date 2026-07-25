-- Migración para añadir los nuevos estados a session_status
ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'Asistió';
ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'Falta';
ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'Reprogramada';
ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'Feriado';
