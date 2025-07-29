-- Sync all card_prices with calculated data from price_entries
-- Run this in your Supabase SQL editor

-- First, create the RPC function if it doesn't exist
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

-- Now sync all existing card_prices with calculated data
WITH calculated_prices AS (
  SELECT 
    c.id as card_id,
    cp.average_price as calculated_average,
    cp.last_seen as calculated_last_seen,
    cp.price_count as calculated_count
  FROM cards c
  CROSS JOIN LATERAL calculate_card_price_summary(c.id) cp
)
UPDATE card_prices 
SET 
  average_price = cp.calculated_average,
  last_seen = cp.calculated_last_seen,
  updated_at = NOW()
FROM calculated_prices cp
WHERE card_prices.card_id = cp.card_id;

-- Verify the sync worked
SELECT 
  c.name,
  c.id as card_id,
  cp.average_price,
  cp.last_seen,
  COUNT(pe.id) as actual_price_count
FROM cards c
LEFT JOIN card_prices cp ON c.id = cp.card_id
LEFT JOIN price_entries pe ON c.id = pe.card_id
GROUP BY c.id, c.name, cp.average_price, cp.last_seen
ORDER BY c.created_at DESC; 