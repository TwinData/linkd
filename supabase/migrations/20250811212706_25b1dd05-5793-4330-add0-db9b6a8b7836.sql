-- Create analytics functions for reporting

-- Function to get user transaction statistics
CREATE OR REPLACE FUNCTION public.get_user_transaction_stats(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  transaction_count bigint,
  total_amount_kd numeric,
  total_amount_kes numeric,
  total_payout_kes numeric,
  avg_amount_kd numeric,
  avg_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.owner_id as user_id,
    COUNT(*)::bigint as transaction_count,
    SUM(t.amount_kd) as total_amount_kd,
    SUM(t.amount_kes) as total_amount_kes,
    SUM(t.payout_kes) as total_payout_kes,
    AVG(t.amount_kd) as avg_amount_kd,
    AVG(t.rate_kes_per_kd) as avg_rate
  FROM transactions t
  WHERE (start_date IS NULL OR t.created_at >= start_date)
    AND (end_date IS NULL OR t.created_at <= end_date)
    AND t.status = 'completed'
  GROUP BY t.owner_id
  ORDER BY transaction_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get client transaction patterns
CREATE OR REPLACE FUNCTION public.get_client_transaction_patterns(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  client_email text,
  transaction_count bigint,
  total_amount_kd numeric,
  total_payout_kes numeric,
  avg_amount_kd numeric,
  avg_payout_kes numeric,
  first_transaction timestamp with time zone,
  last_transaction timestamp with time zone,
  days_between_transactions numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    c.email as client_email,
    COUNT(t.*)::bigint as transaction_count,
    COALESCE(SUM(t.amount_kd), 0) as total_amount_kd,
    COALESCE(SUM(t.payout_kes), 0) as total_payout_kes,
    COALESCE(AVG(t.amount_kd), 0) as avg_amount_kd,
    COALESCE(AVG(t.payout_kes), 0) as avg_payout_kes,
    MIN(t.created_at) as first_transaction,
    MAX(t.created_at) as last_transaction,
    CASE 
      WHEN COUNT(t.*) > 1 THEN 
        EXTRACT(EPOCH FROM (MAX(t.created_at) - MIN(t.created_at))) / (86400 * (COUNT(t.*) - 1))
      ELSE NULL 
    END as days_between_transactions
  FROM clients c
  LEFT JOIN transactions t ON c.id = t.client_id 
    AND (start_date IS NULL OR t.created_at >= start_date)
    AND (end_date IS NULL OR t.created_at <= end_date)
    AND t.status = 'completed'
  GROUP BY c.id, c.name, c.email
  ORDER BY transaction_count DESC, total_amount_kd DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get rate analysis
CREATE OR REPLACE FUNCTION public.get_rate_analysis(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  rate_kes_per_kd numeric,
  transaction_count bigint,
  total_volume_kd numeric,
  avg_transaction_amount_kd numeric,
  rate_rank bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.rate_kes_per_kd,
    COUNT(*)::bigint as transaction_count,
    SUM(t.amount_kd) as total_volume_kd,
    AVG(t.amount_kd) as avg_transaction_amount_kd,
    RANK() OVER (ORDER BY t.rate_kes_per_kd DESC) as rate_rank
  FROM transactions t
  WHERE (start_date IS NULL OR t.created_at >= start_date)
    AND (end_date IS NULL OR t.created_at <= end_date)
    AND t.status = 'completed'
  GROUP BY t.rate_kes_per_kd
  ORDER BY t.rate_kes_per_kd DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get monthly Sarah's share analysis
CREATE OR REPLACE FUNCTION public.get_sarahs_share_analysis(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  period text,
  total_transactions bigint,
  total_volume_kd numeric,
  total_payout_kes numeric,
  total_agent_share_kd numeric,
  sarahs_share_percentage numeric,
  sarahs_share_amount_kes numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('month', t.created_at), 'YYYY-MM') as period,
    COUNT(*)::bigint as total_transactions,
    SUM(t.amount_kd) as total_volume_kd,
    SUM(t.payout_kes) as total_payout_kes,
    SUM(t.agent_share_kd) as total_agent_share_kd,
    CASE 
      WHEN SUM(t.payout_kes) > 0 THEN 
        (SUM(t.agent_share_kd * t.rate_kes_per_kd) / SUM(t.payout_kes)) * 100
      ELSE 0 
    END as sarahs_share_percentage,
    SUM(t.agent_share_kd * t.rate_kes_per_kd) as sarahs_share_amount_kes
  FROM transactions t
  WHERE (start_date IS NULL OR t.created_at >= start_date)
    AND (end_date IS NULL OR t.created_at <= end_date)
    AND t.status = 'completed'
  GROUP BY DATE_TRUNC('month', t.created_at)
  ORDER BY period DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get transaction type analysis
CREATE OR REPLACE FUNCTION public.get_transaction_type_analysis(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  transaction_type text,
  transaction_count bigint,
  total_volume_kd numeric,
  total_payout_kes numeric,
  avg_amount_kd numeric,
  percentage_of_total numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH type_stats AS (
    SELECT 
      COALESCE(t.type, 'Unknown') as transaction_type,
      COUNT(*)::bigint as transaction_count,
      SUM(t.amount_kd) as total_volume_kd,
      SUM(t.payout_kes) as total_payout_kes,
      AVG(t.amount_kd) as avg_amount_kd
    FROM transactions t
    WHERE (start_date IS NULL OR t.created_at >= start_date)
      AND (end_date IS NULL OR t.created_at <= end_date)
      AND t.status = 'completed'
    GROUP BY COALESCE(t.type, 'Unknown')
  ),
  total_count AS (
    SELECT SUM(transaction_count) as total_transactions
    FROM type_stats
  )
  SELECT 
    ts.transaction_type,
    ts.transaction_count,
    ts.total_volume_kd,
    ts.total_payout_kes,
    ts.avg_amount_kd,
    CASE 
      WHEN tc.total_transactions > 0 THEN 
        (ts.transaction_count::numeric / tc.total_transactions::numeric) * 100
      ELSE 0 
    END as percentage_of_total
  FROM type_stats ts
  CROSS JOIN total_count tc
  ORDER BY ts.transaction_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;