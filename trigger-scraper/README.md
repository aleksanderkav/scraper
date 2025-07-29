# Trigger Scraper Edge Function

This Supabase Edge Function calls your Railway scraper endpoint and stores the results in your database.

## Features

- ✅ Calls the scraper endpoint with the provided query
- ✅ Parses the JSON response from the scraper
- ✅ Inserts new cards if they don't exist in the `cards` table
- ✅ Inserts individual price entries into the `price_entries` table
- ✅ Updates or inserts average prices in the `card_prices` table
- ✅ Comprehensive error handling and logging
- ✅ Safe and idempotent operations

## Database Schema

The function expects these tables in your Supabase database:

```sql
-- Cards table
CREATE TABLE cards (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Price entries table
CREATE TABLE price_entries (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES cards(id),
  price DECIMAL(10,2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL
);

-- Card prices summary table
CREATE TABLE card_prices (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES cards(id) UNIQUE,
  average_price DECIMAL(10,2) NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL
);
```

## Environment Variables

Set these environment variables in your Supabase project:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for admin access)
- `SCRAPER_URL`: Your Railway scraper endpoint URL (optional, defaults to placeholder)

## Deployment

1. Deploy to Supabase using the CLI:
   ```bash
   supabase functions deploy trigger-scraper
   ```

2. Set environment variables:
   ```bash
   supabase secrets set SUPABASE_URL=your_supabase_url
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   supabase secrets set SCRAPER_URL=https://your-railway-app.railway.app
   ```

## Usage

### Invoke the function:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/trigger-scraper \
  -H "Authorization: Bearer your_anon_key" \
  -H "Content-Type: application/json" \
  -d '{"query": "Pikachu PSA 10"}'
```

### Response format:

**Success:**
```json
{
  "success": true,
  "message": "Data successfully processed and stored",
  "card_id": 123,
  "prices_inserted": 5,
  "average_price": 150.25,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**No prices found:**
```json
{
  "message": "No prices found for this query",
  "query": "Rare Card XYZ",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error:**
```json
{
  "error": "Internal server error",
  "details": "Error message here"
}
```

## How it works

1. **Input validation**: Validates the query parameter
2. **Scraper call**: Calls your Railway scraper endpoint
3. **Card management**: Creates or retrieves the card record
4. **Price storage**: Inserts individual price entries
5. **Summary update**: Updates the average price and last seen date
6. **Error handling**: Comprehensive error logging and user-friendly responses

## Safety Features

- **Idempotent**: Can be called multiple times safely
- **Error logging**: All database errors are logged
- **Input validation**: Validates query parameter
- **CORS support**: Handles preflight requests
- **Graceful degradation**: Handles cases with no prices found 