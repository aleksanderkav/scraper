# Scheduled Scraper for Railway

A Python script that runs on Railway with cron scheduling to automatically scrape predefined card queries and store the data in Supabase.

## Features

- ✅ **Predefined queries**: Easy-to-modify list of search queries
- ✅ **Concurrent processing**: Processes multiple queries efficiently
- ✅ **Rate limiting**: Prevents overwhelming the scraper endpoint
- ✅ **Comprehensive logging**: Detailed logs for monitoring and debugging
- ✅ **Error handling**: Graceful handling of failures
- ✅ **Modular design**: Easy to add/remove queries
- ✅ **Database integration**: Stores data in Supabase tables

## Architecture

```
scheduled_scraper.py
├── SupabaseClient (REST API interactions)
├── ScraperClient (HTTP requests to scraper endpoint)
└── ScheduledScraper (Main orchestration)
```

## Database Schema

The script expects these tables in your Supabase database:

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

Set these in your Railway project:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SCRAPER_URL=https://your-railway-scraper.railway.app
```

## Predefined Queries

The script comes with these default queries (easily modifiable):

```python
self.search_queries = [
    "Charizard PSA 10",
    "Pikachu PSA 9", 
    "Blastoise holo",
    "Venusaur 1st edition",
    "Mewtwo PSA 8",
    "Gyarados holo",
    "Alakazam PSA 9",
    "Machamp 1st edition",
    "Gengar holo",
    "Dragonite PSA 10"
]
```

## Adding/Removing Queries

### Programmatically:
```python
scraper = ScheduledScraper()
scraper.add_query("New Card PSA 10")
scraper.remove_query("Old Card")
```

### By editing the script:
Simply modify the `search_queries` list in the `ScheduledScraper.__init__()` method.

## Deployment on Railway

### 1. Create a new Railway project
```bash
railway init scheduled-scraper
```

### 2. Add the files
- `scheduled_scraper.py` - Main script
- `requirements_scheduler.txt` - Dependencies
- `railway_scheduler.json` - Railway configuration

### 3. Set environment variables
```bash
railway variables set SUPABASE_URL=https://your-project.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
railway variables set SCRAPER_URL=https://your-railway-scraper.railway.app
```

### 4. Deploy
```bash
railway up
```

## Scheduling Options

### Option 1: Railway Cron (Recommended)
Use Railway's built-in cron functionality in the dashboard:
- Go to your Railway project
- Navigate to Settings → Cron Jobs
- Add a new cron job: `python scheduled_scraper.py`
- Set schedule (e.g., `0 */6 * * *` for every 6 hours)

### Option 2: External Cron Service
Use services like:
- **GitHub Actions** (free)
- **Cron-job.org** (free)
- **EasyCron** (paid)

### Option 3: Manual Cron Setup
If running on a server with cron:
```bash
# Edit crontab
crontab -e

# Add this line to run every 6 hours
0 */6 * * * cd /app && python scheduled_scraper.py >> /var/log/scheduled_scraper.log 2>&1
```

## Monitoring and Logs

### Log Files
- `scheduled_scraper.log` - Application logs
- Railway logs available in the dashboard

### Sample Output
```
2024-01-15 10:00:00 - INFO - Starting scheduled scrape for 10 queries
2024-01-15 10:00:01 - INFO - Successfully scraped 'Charizard PSA 10': 5 prices found
2024-01-15 10:00:02 - INFO - Created new card: Charizard PSA 10 (ID: 123)
2024-01-15 10:00:02 - INFO - Inserted 5 price entries
2024-01-15 10:00:02 - INFO - Created new card price for card_id 123
2024-01-15 10:00:02 - INFO - Successfully processed query: Charizard PSA 10 - 5 prices, avg: $150.25
2024-01-15 10:00:15 - INFO - Scheduled scrape completed: 8/10 successful in 15.23s
```

### Performance Metrics
The script returns performance metrics:
```json
{
  "success_count": 8,
  "total_count": 10,
  "duration_seconds": 15.23,
  "timestamp": "2024-01-15T10:00:15.123456Z"
}
```

## Error Handling

The script handles various error scenarios:
- **Network failures**: Retries and logs errors
- **Database errors**: Logs detailed error messages
- **Invalid responses**: Graceful degradation
- **Rate limiting**: Built-in semaphore for concurrent requests

## Testing

### Manual Test
```bash
python scheduled_scraper.py
```

### Test with Custom Queries
```python
scraper = ScheduledScraper()
scraper.search_queries = ["Test Card PSA 10"]  # Override for testing
await scraper.run_scheduled_scrape()
```

## Troubleshooting

### Common Issues

1. **Environment variables not set**
   - Check Railway variables in dashboard
   - Verify all required variables are present

2. **Database connection issues**
   - Verify Supabase URL and service role key
   - Check database schema matches expected format

3. **Scraper endpoint unreachable**
   - Verify SCRAPER_URL is correct
   - Check if scraper service is running

4. **Rate limiting**
   - Adjust semaphore value in code (default: 3 concurrent requests)
   - Add delays between requests if needed

### Debug Mode
Enable debug logging by modifying the logging level:
```python
logging.basicConfig(level=logging.DEBUG)
```

## Security Considerations

- Uses Supabase service role key for database access
- Environment variables for sensitive configuration
- No hardcoded credentials
- Rate limiting to prevent abuse

## Cost Optimization

- **Concurrent processing**: Reduces total execution time
- **Efficient database operations**: Bulk inserts and upserts
- **Logging to files**: Reduces external service calls
- **Configurable scheduling**: Run only when needed 