-- ==============================================================================
-- 012_blocked_days_table.sql
-- ==============================================================================

CREATE TABLE blocked_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason TEXT NOT NULL DEFAULT 'Feriado', -- 'Feriado' or 'Reservado'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, date)
);

ALTER TABLE blocked_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspaces can view their own blocked days" 
ON blocked_days FOR SELECT 
USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Workspaces can insert their own blocked days" 
ON blocked_days FOR INSERT 
WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Workspaces can delete their own blocked days" 
ON blocked_days FOR DELETE 
USING (workspace_id IN (
    SELECT workspace_id FROM profiles WHERE id = auth.uid()
));
