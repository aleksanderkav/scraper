# Railway Deployment Guide - Pokemon Card Price Tracker

## 🚀 Quick Deploy to Railway

### 1. **Deploy Main Scraper API** (Already Done ✅)
Your scraper API is live at: `https://scraper-production-22f6.up.railway.app`

### 2. **Create Scheduled Scraper Service**

#### Option A: Deploy as Separate Railway Service
1. Create new Railway project
2. Connect this GitHub repository
3. Set as "scheduler" service type
4. Add environment variables (see below)
5. Set cron schedule: `0 */6 * * *` (every 6 hours)

#### Option B: Add to Existing Railway Project
1. Go to your existing Railway project
2. Add new service from same GitHub repo
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `python scheduled_scraper.py`

### 3. **Environment Variables for Railway**

Set these in Railway dashboard:

```bash
# Supabase Configuration (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Scraper API URL (Required)
SCRAPER_API_URL=https://scraper-production-22f6.up.railway.app

# Optional: Customize delays
SCRAPE_DELAY_SECONDS=8
```

### 4. **Supabase Database Setup**

Run this SQL in your Supabase project:

```sql
-- Cards table
CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual price entries
CREATE TABLE price_entries (
    id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES cards(id),
    price DECIMAL(10,2) NOT NULL,
    source TEXT DEFAULT 'ebay',
    query TEXT,
    scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Latest average prices
CREATE TABLE card_prices (
    id SERIAL PRIMARY KEY,
    card_id INTEGER UNIQUE REFERENCES cards(id),
    latest_average DECIMAL(10,2),
    price_count INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the cards_with_prices view for easy frontend querying
CREATE VIEW cards_with_prices AS
SELECT 
    c.id,
    c.name,
    c.created_at,
    COALESCE(cp.latest_average, 0) as latest_price,
    cp.last_updated as last_price_update,
    COALESCE(cp.price_count, 1) as price_count
FROM cards c
LEFT JOIN card_prices cp ON c.id = cp.card_id;

-- Create indexes for better performance
CREATE INDEX idx_price_entries_card_id ON price_entries(card_id);
CREATE INDEX idx_price_entries_scraped_at ON price_entries(scraped_at);
CREATE INDEX idx_card_prices_card_id ON card_prices(card_id);
CREATE INDEX idx_cards_name ON cards(name);
```

## 📊 **Expanded Card Queries** (47 Total)

### High-Value PSA 10 Cards:
- Charizard PSA 10
- Blastoise PSA 10  
- Venusaur PSA 10
- Mewtwo PSA 10
- Lugia PSA 10

### Affordable PSA 9 Tier:
- Charizard PSA 9
- Pikachu PSA 9
- Blastoise PSA 9
- Venusaur PSA 9

### Classic Base Set Holos:
- Alakazam, Machamp, Gyarados
- Zapdos, Moltres, Articuno
- Magneton, Hitmonchan

### Premium Japanese Cards:
- Japanese Charizard PSA
- Japanese Pikachu PSA
- Japanese Blastoise PSA

### Modern High-Value:
- Charizard VMAX PSA
- Umbreon VMAX PSA
- Sylveon VMAX PSA

### Vintage Specials:
- Shadowless Charizard PSA
- First Edition Charizard PSA
- Trophy Pikachu PSA

### Rare Sets:
- Shining Gyarados/Magikarp PSA
- Crystal Charizard PSA
- Neo Genesis Lugia PSA

## ⚡ **Expected Performance**

### Scraping Stats:
- **47 queries** processed per run
- **8-second delays** between requests (respectful to eBay)
- **~6-8 minutes** total runtime per cycle
- **Every 6 hours** = 4 runs per day = **188 queries/day**

### Data Collection:
- **~10 prices per card** = ~470 price points per run
- **~1,880 prices per day**
- **~13,160 prices per week**

## 🔧 **Monitoring & Logs**

### Railway Logs Will Show:
```
🚀 Starting Pokemon card price scraping at 2024-01-15T10:00:00Z
📊 Processing 47 card queries
🔗 API: https://scraper-production-22f6.up.railway.app

📋 [1/47] Charizard PSA 10
🔍 Fetching price data for: Charizard PSA 10
✅ Found 10 prices for 'Charizard PSA 10' - Avg: $290.64
📝 Created new card: Charizard PSA 10
💾 Inserted 10 price entries
📊 Created price record: $290.64
✅ Successfully processed: Charizard PSA 10 ($290.64)

⏳ Waiting 8 seconds...
```

### Success Metrics:
- **90%+ success rate** expected
- **Average $100-500** for PSA 10 cards
- **Average $50-300** for PSA 9 cards
- **Realistic price ranges** for all tiers

## 🚨 **Troubleshooting**

### Common Issues:

1. **"Missing environment variables"**
   - Set SUPABASE_URL and SUPABASE_ANON_KEY in Railway

2. **"Table doesn't exist"**
   - Run the SQL schema in Supabase

3. **"API timeout errors"**
   - Normal for some queries, scraper has built-in retries

4. **"Rate limiting"**
   - 8-second delays prevent most rate limiting issues

### Manual Testing:
```bash
# Test single query
curl "https://scraper-production-22f6.up.railway.app/scrape?query=Charizard%20PSA%2010"

# Check Railway logs for detailed output
```

## 📈 **Future Enhancements**

### Easy to Add:
- More card queries (just edit the list)
- Different PSA grades (PSA 8, PSA 7)
- Other TCGs (Magic, Yu-Gi-Oh)
- Price alerts/notifications
- Historical trend analysis

This system will automatically collect comprehensive Pokemon card pricing data 24/7! 🎯