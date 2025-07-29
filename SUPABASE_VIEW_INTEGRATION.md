# Supabase View Integration Guide

## ✅ New `cards_with_prices` View

The new view simplifies data fetching by joining `cards` and `card_prices` tables automatically.

### View Schema:
```sql
-- The view provides these fields:
- id              (from cards.id)
- name            (from cards.name) 
- created_at      (from cards.created_at)
- latest_price    (from card_prices.average_price)
- last_price_update (from card_prices.last_seen)
- price_count     (from card_prices.price_count, defaults to 1)
```

## 🔧 Frontend Code Updates

### ✅ **Correct Usage (Read-Only)**

```javascript
// ✅ GOOD: Read cards with prices
const fetchCardsWithPrices = async () => {
  const { data: cards, error } = await supabase
    .from('cards_with_prices')
    .select('id, name, latest_price, last_price_update, price_count')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching cards:', error);
    return [];
  }
  
  return cards;
};

// ✅ GOOD: Filter cards with valid prices
const fetchCardsWithValidPrices = async () => {
  const { data: cards, error } = await supabase
    .from('cards_with_prices')
    .select('*')
    .gt('latest_price', 0)  // Now works correctly!
    .order('latest_price', { ascending: false });
    
  return cards || [];
};

// ✅ GOOD: Search cards by name
const searchCards = async (searchTerm) => {
  const { data: cards } = await supabase
    .from('cards_with_prices')
    .select('*')
    .ilike('name', `%${searchTerm}%`)
    .gt('latest_price', 0);
    
  return cards || [];
};
```

### ❌ **Remove These Patterns**

```javascript
// ❌ REMOVE: No more complex joins needed
const { data: cards } = await supabase
  .from('cards')
  .select(`
    *,
    card_prices (
      latest_average,
      price_count,
      last_updated
    )
  `);

// ❌ REMOVE: No more manual mapping
const cardsWithPrices = cards?.map(card => ({
  ...card,
  latest_price: card.card_prices?.[0]?.latest_average || 0,
  price_count: card.card_prices?.[0]?.price_count || 0
}));

// ❌ REMOVE: No insert/update/delete operations on view
await supabase.from('cards_with_prices').insert({...});  // This will fail!
await supabase.from('cards_with_prices').update({...});  // This will fail!
await supabase.from('cards_with_prices').delete();       // This will fail!
```

## 🎯 **Common Frontend Patterns**

### 1. **Card List Component**
```javascript
const CardList = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCards = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('cards_with_prices')
        .select('*')
        .gt('latest_price', 0)
        .order('latest_price', { ascending: false })
        .limit(50);
        
      setCards(data || []);
      setLoading(false);
    };

    loadCards();
  }, []);

  return (
    <div>
      {cards.map(card => (
        <div key={card.id}>
          <h3>{card.name}</h3>
          <p>Latest Price: ${card.latest_price}</p>
          <p>Price Count: {card.price_count}</p>
          <p>Last Updated: {new Date(card.last_price_update).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
};
```

### 2. **Price Range Filter**
```javascript
const PriceRangeFilter = ({ onFilter }) => {
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);

  const handleFilter = async () => {
    const { data } = await supabase
      .from('cards_with_prices')
      .select('*')
      .gte('latest_price', minPrice)
      .lte('latest_price', maxPrice)
      .order('latest_price', { ascending: false });
      
    onFilter(data || []);
  };

  return (
    <div>
      <input 
        type="number" 
        value={minPrice} 
        onChange={e => setMinPrice(Number(e.target.value))}
        placeholder="Min Price"
      />
      <input 
        type="number" 
        value={maxPrice} 
        onChange={e => setMaxPrice(Number(e.target.value))}
        placeholder="Max Price"
      />
      <button onClick={handleFilter}>Filter</button>
    </div>
  );
};
```

### 3. **Real-time Updates**
```javascript
const useCardsWithPrices = () => {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    // Initial load
    const loadCards = async () => {
      const { data } = await supabase
        .from('cards_with_prices')
        .select('*')
        .order('created_at', { ascending: false });
      setCards(data || []);
    };

    loadCards();

    // Subscribe to changes (the view will update when underlying tables change)
    const subscription = supabase
      .channel('cards_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cards'
      }, () => {
        loadCards(); // Refresh when cards table changes
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'card_prices'
      }, () => {
        loadCards(); // Refresh when card_prices table changes
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  return cards;
};
```

## 🚨 **Things to Check/Remove**

### 1. **Remove Manual Joins**
Look for and remove code like:
```javascript
// Remove these patterns:
.select('*, card_prices(*)')
.select('cards.*, card_prices.latest_average')
// Replace with simple:
.select('*') // on cards_with_prices view
```

### 2. **Remove Manual Mapping**
```javascript
// Remove manual mapping logic:
const mapped = cards.map(card => ({
  ...card,
  latest_price: card.card_prices?.[0]?.latest_average || 0
}));

// The view already provides latest_price directly!
```

### 3. **Update Filter Logic**
```javascript
// Old (might not work properly):
.filter(card => card.card_prices?.[0]?.latest_average > 0)

// New (works correctly):
.gt('latest_price', 0)
```

### 4. **Remove Write Operations**
Make sure you're not trying to insert/update/delete on the view:
```javascript
// Remove any code doing this:
await supabase.from('cards_with_prices').insert({...});
await supabase.from('cards_with_prices').update({...});
await supabase.from('cards_with_prices').delete();

// Data changes should still go through original tables:
await supabase.from('cards').insert({...});        // ✅ OK
await supabase.from('card_prices').insert({...});  // ✅ OK
```

## 📊 **Benefits of the View**

1. **Simplified Queries**: No more complex joins in frontend code
2. **Consistent Data**: All cards automatically include price information
3. **Better Performance**: Database handles the join efficiently
4. **Type Safety**: Fields are consistently typed (latest_price is always numeric)
5. **Cleaner Code**: Removes manual mapping and null checking

## 🔄 **Migration Checklist**

- [ ] Replace all `cards` + `card_prices` joins with `cards_with_prices` queries
- [ ] Remove manual mapping of `latest_average` to `latest_price` 
- [ ] Update filters to use `latest_price` field directly
- [ ] Remove any insert/update/delete operations on the view
- [ ] Test that price filtering (> 0) now works correctly
- [ ] Update TypeScript types if using TypeScript
- [ ] Remove any debug/console.log statements related to price mapping

The view makes your frontend code much cleaner and more reliable! 🎉