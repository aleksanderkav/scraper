-- Database schema for card scraping application
-- Run this in your Supabase SQL editor

-- cards table
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- price_entries table
CREATE TABLE IF NOT EXISTS price_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- card_prices table (summary table)
CREATE TABLE IF NOT EXISTS card_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE UNIQUE,
  average_price NUMERIC NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
CREATE INDEX IF NOT EXISTS idx_price_entries_card_id ON price_entries(card_id);
CREATE INDEX IF NOT EXISTS idx_price_entries_timestamp ON price_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_card_prices_card_id ON card_prices(card_id);

-- Enable Row Level Security (RLS)
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can access all data" ON cards
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all data" ON price_entries
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all data" ON card_prices
  FOR ALL USING (auth.role() = 'service_role');

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for card_prices table
CREATE TRIGGER update_card_prices_updated_at 
  BEFORE UPDATE ON card_prices 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 