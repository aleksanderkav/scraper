-- Debug UUID matching between cards and card_prices tables
-- Run this in your Supabase SQL editor

-- 1. Check for cards without price data
SELECT 
  c.id as card_id,
  c.name as card_name,
  cp.card_id as price_card_id,
  cp.average_price,
  CASE 
    WHEN cp.card_id IS NULL THEN 'MISSING PRICE DATA'
    ELSE 'HAS PRICE DATA'
  END as status
FROM cards c
LEFT JOIN card_prices cp ON c.id = cp.card_id
ORDER BY c.created_at DESC;

-- 2. Check for orphaned price entries (price data without cards)
SELECT 
  cp.card_id as orphaned_card_id,
  cp.average_price,
  cp.last_seen,
  CASE 
    WHEN c.id IS NULL THEN 'ORPHANED PRICE DATA'
    ELSE 'CARD EXISTS'
  END as status
FROM card_prices cp
LEFT JOIN cards c ON cp.card_id = c.id
WHERE c.id IS NULL;

-- 3. Check data types and formats
SELECT 
  'cards.id' as column_name,
  pg_typeof(id) as data_type,
  length(id::text) as uuid_length
FROM cards 
LIMIT 1;

SELECT 
  'card_prices.card_id' as column_name,
  pg_typeof(card_id) as data_type,
  length(card_id::text) as uuid_length
FROM card_prices 
LIMIT 1;

-- 4. Test exact matching with a specific card
SELECT 
  c.id as card_id,
  c.name,
  cp.card_id as price_card_id,
  cp.average_price,
  c.id = cp.card_id as exact_match,
  c.id::text = cp.card_id::text as string_match
FROM cards c
LEFT JOIN card_prices cp ON c.id = cp.card_id
WHERE c.name LIKE '%Pikachu%'
ORDER BY c.created_at DESC; 