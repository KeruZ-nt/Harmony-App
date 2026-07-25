DO $$
DECLARE
    r RECORD;
    v_start TIMESTAMPTZ;
BEGIN
    -- Buscamos todas las clases que caen el 28 de Julio de 2026 (hora Perú)
    FOR r IN 
        SELECT id, student_id, start_time 
        FROM sessions 
        WHERE (start_time AT TIME ZONE 'America/Lima')::date = '2026-07-28'
    LOOP
        v_start := r.start_time;
        
        -- Desplazamos esa clase y TODAS las siguientes del mismo día de la semana
        UPDATE sessions
        SET 
            start_time = start_time + INTERVAL '7 days',
            end_time = end_time + INTERVAL '7 days'
        WHERE 
            student_id = r.student_id 
            AND start_time >= v_start
            AND EXTRACT(DOW FROM start_time AT TIME ZONE 'America/Lima') = EXTRACT(DOW FROM v_start AT TIME ZONE 'America/Lima');
            
    END LOOP;
END;
$$;