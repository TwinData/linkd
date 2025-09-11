-- Add results field to promotions table
ALTER TABLE public.promotions 
ADD COLUMN results text;

-- Add index for better query performance on active promotions
CREATE INDEX idx_promotions_active_dates ON public.promotions(active, starts_at, ends_at) WHERE active = true;