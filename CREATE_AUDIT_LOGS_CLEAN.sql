-- ============================================
-- CLEAN AUDIT LOGS SETUP
-- Copy and paste this ENTIRE script into Supabase SQL Editor and run it
-- ============================================

-- Step 1: Create the audit_logs table
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

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Step 3: Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (now table exists)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
    DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;
    DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Step 5: Create new policies
CREATE POLICY "Authenticated users can view audit logs"
    ON audit_logs
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert audit logs"
    ON audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Step 6: Create the log_audit function
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

-- Step 7: Test the setup (creates a test log)
DO $$
BEGIN
    PERFORM log_audit(
        'SYSTEM_SETUP',
        'audit_system',
        NULL,
        NULL,
        '{"message": "Audit logs system successfully initialized", "timestamp": "' || NOW() || '"}'::jsonb
    );
END $$;

-- Step 8: Verify everything worked
SELECT 
    'Setup Complete!' as status,
    COUNT(*) as test_logs_created,
    MAX(created_at) as last_log_time
FROM audit_logs;
