-- Fix RLS policies to allow public read access
-- Run this in your Supabase SQL editor

-- Enable RLS on cards table (if not already enabled)
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Service role can access all data" ON cards;
DROP POLICY IF EXISTS "Service role can access all data" ON price_entries;
DROP POLICY IF EXISTS "Service role can access all data" ON card_prices;

-- Create new policies that allow both service role and public read access
CREATE POLICY "Allow public read access to cards" ON cards
  FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to cards" ON cards
  FOR ALL USING (auth.role() = 'service_role');

-- For price_entries table
CREATE POLICY "Allow public read access to price_entries" ON price_entries
  FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to price_entries" ON price_entries
  FOR ALL USING (auth.role() = 'service_role');

-- For card_prices table
CREATE POLICY "Allow public read access to card_prices" ON card_prices
  FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to card_prices" ON card_prices
  FOR ALL USING (auth.role() = 'service_role'); 