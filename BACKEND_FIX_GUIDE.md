# Backend Fix Guide: Proper Price Data Synchronization

## 🎯 **Problem Solved**

The Edge Function now properly calculates and syncs price data from `price_entries` to `card_prices` table, ensuring your frontend always gets the correct aggregated data.

## ✅ **What's Fixed**

### **1. Updated Edge Function Logic**
- ✅ Now calculates `average_price` from all `price_entries` for each card
- ✅ Uses `MAX(timestamp)` for `last_seen` (most recent entry)
- ✅ Properly upserts data into `card_prices` table
- ✅ Includes fallback to scraper data if RPC function unavailable

### **2. New RPC Function**
- ✅ `calculate_card_price_summary(card_uuid)` function created
- ✅ Calculates: `average_price`, `last_seen`, `price_count`
- ✅ Uses all historical price entries for accurate averages

## 🚀 **Setup Steps**

### **Step 1: Create the RPC Function**
Go to: https://supabase.com/dashboard/project/jvkxyjycpomtzfngocge/sql

Run this SQL:
```sql
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

GRANT EXECUTE ON FUNCTION calculate_card_price_summary(UUID) TO service_role;
```

### **Step 2: Sync Existing Data**
Run this SQL to fix all existing card_prices:
```sql
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
```

### **Step 3: Verify the Fix**
Run this query to see the corrected data:
```sql
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
```

## 📊 **Expected Frontend Data Structure**

After the fix, your frontend will receive this structure from `card_prices`:

```json
{
  "id": "uuid",
  "card_id": "uuid", 
  "average_price": 142.74,
  "last_seen": "2025-07-29T02:15:58.468637+00:00",
  "created_at": "2025-07-29T02:15:58.468637+00:00",
  "updated_at": "2025-07-29T02:15:58.468637+00:00"
}
```

## 🔄 **How It Works Now**

1. **Scraper runs** → Inserts individual prices into `price_entries`
2. **Edge Function calculates** → Uses RPC function to get aggregated data
3. **card_prices updated** → Upserts calculated `average_price` and `last_seen`
4. **Frontend receives** → Accurate, up-to-date price summaries

## 🧪 **Test the Fix**

1. **Run the SQL scripts** above
2. **Test the Edge Function**:
   ```bash
   curl -X POST https://jvkxyjycpomtzfngocge.supabase.co/functions/v1/card-scraper \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -d '{"query": "Test Card"}'
   ```
3. **Check card_prices table** - should have accurate averages
4. **Verify frontend** - should now display correct price data

## 🎉 **Result**

Your frontend will now receive the exact structure it expects:
- ✅ `latest_price` = `card_prices.average_price`
- ✅ `last_price_update` = `card_prices.last_seen`  
- ✅ `price_count` = count from `price_entries` (can be calculated)

The backend is now properly synchronized! 🚀 