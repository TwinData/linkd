-- Create report_schedules table for scheduling reports
CREATE TABLE IF NOT EXISTS public.report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('transactions', 'clients', 'float_deposits')),
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week integer CHECK (frequency != 'weekly' OR (day_of_week >= 0 AND day_of_week <= 6)),
  day_of_month integer CHECK (frequency != 'monthly' OR (day_of_month >= 1 AND day_of_month <= 31)),
  time_of_day time NOT NULL,
  email_recipients text[] NOT NULL,
  report_name text NOT NULL,
  report_description text,
  is_active boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER update_report_schedules_updated_at
  BEFORE UPDATE ON public.report_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own report schedules"
  ON public.report_schedules FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own report schedules"
  ON public.report_schedules FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own report schedules"
  ON public.report_schedules FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own report schedules"
  ON public.report_schedules FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Admin policies using text comparison to avoid enum issues
CREATE POLICY "Admins can view all report schedules"
  ON public.report_schedules FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'superadmin'))
  );

CREATE POLICY "Admins can manage all report schedules"
  ON public.report_schedules FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'superadmin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'superadmin'))
  );
