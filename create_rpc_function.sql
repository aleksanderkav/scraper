-- Create RPC function to calculate card price summary
-- Run this in your Supabase SQL editor

CREATE OR REPLACE FUNCTION calculate_card_price_summary(card_uuid UUID)
RETURNS TABLE (
  average_price NUMERIC,
  last_seen TIMESTAMP WITH TIME ZONE,
  price_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(pe.price)::NUMERIC as average_price,
    MAX(pe.timestamp) as last_seen,
    COUNT(*) as price_count
  FROM price_entries pe
  WHERE pe.card_id = card_uuid;
END;
$$;

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION calculate_card_price_summary(UUID) TO service_role;

-- Test the function (optional)
-- SELECT * FROM calculate_card_price_summary('5f4bbd4a-4dbf-4724-b76d-73e622d20e63'); 