# Supabase Database Setup Instructions

## 🚀 Quick Setup (2 minutes)

### Step 1: Create Database Tables

1. **Open Supabase Dashboard**: https://supabase.com/dashboard/project/jvkxyjycpomtzfngocge/sql

2. **Copy this SQL** and paste it in the SQL editor:

```sql
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

-- card_prices table
CREATE TABLE IF NOT EXISTS card_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE UNIQUE,
  average_price NUMERIC NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
CREATE INDEX IF NOT EXISTS idx_price_entries_card_id ON price_entries(card_id);
CREATE INDEX IF NOT EXISTS idx_price_entries_timestamp ON price_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_card_prices_card_id ON card_prices(card_id);

-- Enable RLS
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_prices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role can access all data" ON cards
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all data" ON price_entries
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all data" ON card_prices
  FOR ALL USING (auth.role() = 'service_role');
```

3. **Click "Run"** to execute the SQL

### Step 2: Set Environment Variable

1. **Go to Edge Functions**: https://supabase.com/dashboard/project/jvkxyjycpomtzfngocge/functions
2. **Click on "card-scraper"**
3. **Go to "Settings" tab**
4. **Add environment variable**:
   - **Name**: `SERVICE_ROLE_KEY`
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2a3h5anljcG9tdHpmbmdvY2dlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc1MzU5MywiZXhwIjoyMDY5MzI5NTkzfQ.pclTEBqSXQ-VLQ5kbJ30-aNApwIR6Naei_mfB3HZS78`

### Step 3: Test the Function

After completing steps 1 and 2, test with:

```bash
curl -X POST https://jvkxyjycpomtzfngocge.supabase.co/functions/v1/card-scraper \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2a3h5anljcG9tdHpmbmdvY2dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NTM1OTMsImV4cCI6MjA2OTMyOTU5M30.r3p4y2sl2RFROdKN-MsAsI1Z_8TBn6tK-aZ2claU32Q" \
  -d '{"query": "Pikachu PSA 10"}'
```

## ✅ What You Should See

After setup, you should see:
- **3 tables** in Table Editor: `cards`, `price_entries`, `card_prices`
- **1 function** in Edge Functions: `card-scraper`
- **Successful API responses** when testing

## 🔧 Troubleshooting

If you get errors:
1. Make sure you ran the SQL in the correct project
2. Check that the environment variable is set correctly
3. Verify the function is deployed and active 