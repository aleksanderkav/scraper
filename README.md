# Supabase Edge Function - Card Scraper

A Supabase Edge Function that scrapes card prices and stores them in the database.

## Function: `card-scraper`

This edge function:
1. Accepts POST requests with a card query
2. Calls an external scraper API to get price data
3. Stores the data in Supabase tables (cards, price_entries, card_prices)

### Usage

```bash
curl -X POST https://jvkxyjycpomtzfngocge.supabase.co/functions/v1/card-scraper \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"query": "Pikachu PSA 10"}'
```

### Response

```json
{
  "status": "success",
  "message": "Data processed successfully",
  "data": {
    "cardInserted": true,
    "priceEntriesInserted": 3,
    "cardPriceUpdated": true
  }
}
```

### Database Schema

The function works with these tables:

- **cards**: `{ id (UUID, PK), name (TEXT) }`
- **price_entries**: `{ id (UUID), card_id (UUID), price (NUMERIC), timestamp (TIMESTAMP) }`
- **card_prices**: `{ id (UUID), card_id (UUID), average_price (NUMERIC), last_seen (TIMESTAMP) }`

### Environment Variables

Set these in your Supabase project:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### Deployment

1. Connect this repository to your Supabase project
2. Push changes to trigger automatic deployment
3. Or use Supabase CLI: `supabase functions deploy card-scraper`
