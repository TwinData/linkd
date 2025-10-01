-- ============================================
-- FIXED AUDIT LOGS SETUP (No users table dependency)
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Drop existing table if you want a fresh start
-- DROP TABLE IF EXISTS audit_logs CASCADE;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view audit logs
-- (No users table needed - just checks if user is logged in)
CREATE POLICY "Authenticated users can view audit logs"
    ON audit_logs
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy: System can insert audit logs
CREATE POLICY "System can insert audit logs"
    ON audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Function to log audit trail
CREATE OR REPLACE FUNCTION log_audit(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
) RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Get user email
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        user_id,
        user_email,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        v_user_id,
        v_user_email,
        p_action,
        p_entity_type,
        p_entity_id,
        p_old_values,
        p_new_values
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert a test log to verify everything works
SELECT log_audit(
    'SYSTEM_SETUP',
    'audit_system',
    NULL,
    NULL,
    '{"message": "Audit logs system initialized"}'::jsonb
);

-- Verify the test log was created
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1;
