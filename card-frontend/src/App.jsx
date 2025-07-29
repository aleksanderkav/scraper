import { useState, useEffect } from 'react'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [deployTime] = useState(() => new Date().toLocaleString())

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  // Fetch cards on component mount
  useEffect(() => {
    fetchCards()
  }, [])

  const fetchCards = async () => {
    try {
      setLibraryLoading(true)
      console.log('=== FETCHING CARDS DEBUG ===')
      
      // First, try to fetch just the cards to ensure basic functionality works
      const apiUrl = `${supabaseUrl}/rest/v1/cards?select=*&order=created_at.desc`
      console.log('Full API URL:', apiUrl)
      
      const headers = {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
      
      const response = await fetch(apiUrl, { headers })
      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Cards API error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Raw API response:', data)
      console.log('✅ Number of cards:', data.length)
      
      if (Array.isArray(data)) {
        // For now, just set the basic card data without price information
        setCards(data)
        console.log('✅ Cards state updated with', data.length, 'cards')
        
        // If we have cards, try to fetch price data separately
        if (data.length > 0) {
          console.log('Attempting to fetch price data for cards...')
          await fetchPriceData(data)
        }
      } else {
        console.error('❌ Response is not an array:', typeof data)
        setCards([])
      }
    } catch (error) {
      console.error('❌ Error fetching cards:', error)
      console.error('❌ Error details:', error.message)
      setSearchStatus('Error loading card library')
    } finally {
      setLibraryLoading(false)
      console.log('=== END FETCHING CARDS DEBUG ===')
    }
  }

  const fetchPriceData = async (cards) => {
    try {
      console.log('=== FETCHING PRICE DATA ===')
      console.log('Cards to match with prices:', cards.map(c => ({ id: c.id, name: c.name })))
      
             // OPTION B: Use Supabase join query for better performance and reliability
       const joinUrl = `${supabaseUrl}/rest/v1/cards?select=*,card_prices(average_price,last_seen)&order=created_at.desc`
      
      const headers = {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
      
      console.log('Trying Supabase join query:', joinUrl)
      
      try {
        const response = await fetch(joinUrl, { headers })
        console.log('Join query response status:', response.status)
        
        if (response.ok) {
          const joinedData = await response.json()
          console.log('✅ Join query successful with', joinedData.length, 'cards')
          console.log('Sample joined data:', joinedData[0])
          
                     // Process the joined data
           const updatedCards = joinedData.map(card => {
             const priceData = card.card_prices?.[0] // Get first price entry
             console.log(`Card ${card.name} (${card.id}):`, {
               hasPriceData: !!priceData,
               priceData: priceData,
               average_price: priceData?.average_price,
               last_seen: priceData?.last_seen
             })
             
             return {
               ...card,
               latest_price: priceData?.average_price || null,
               price_count: 1, // Set to 1 since we're not using price_entries yet
               last_price_update: priceData?.last_seen || null
             }
           })
          
          console.log('Updated cards with prices:', updatedCards.map(c => ({ 
            name: c.name, 
            latest_price: c.latest_price, 
            price_count: c.price_count,
            last_price_update: c.last_price_update
          })))
          
          // Check if any cards actually got prices
          const cardsWithPrices = updatedCards.filter(c => c.latest_price && c.latest_price > 0)
          console.log(`📊 Cards with prices: ${cardsWithPrices.length}/${updatedCards.length}`)
          
          // CRITICAL DEBUGGING: Check why cardsWithPrices might be empty
          console.log('=== CRITICAL DEBUGGING: Why no prices? ===')
          console.log('All updated cards:', updatedCards.map(c => ({
            name: c.name,
            latest_price: c.latest_price,
            latest_price_type: typeof c.latest_price,
            latest_price_truthy: !!c.latest_price,
            latest_price_gt_zero: c.latest_price > 0,
            price_count: c.price_count,
            last_price_update: c.last_price_update
          })))
          
          // Log one of the cardsWithPrices objects to verify structure
          if (cardsWithPrices.length > 0) {
            console.log('=== VERIFICATION: Sample card with prices ===')
            console.log('Sample card object:', {
              name: cardsWithPrices[0].name,
              latest_price: cardsWithPrices[0].latest_price,
              last_price_update: cardsWithPrices[0].last_price_update,
              price_count: cardsWithPrices[0].price_count,
              id: cardsWithPrices[0].id
            })
            console.log('=== END VERIFICATION ===')
          } else {
            console.log('⚠️ NO CARDS WITH PRICES FOUND!')
            console.log('This means all cards have latest_price as null, 0, or falsy')
            console.log('Check the "All updated cards" log above to see the actual values')
          }
          console.log('=== END CRITICAL DEBUGGING ===')
          
          if (cardsWithPrices.length === 0) {
            console.log('⚠️ WARNING: No cards received price data from join query')
            console.log('Falling back to separate queries...')
            
            // Fallback to original approach
            return await fetchPriceDataFallback(cards)
          }
          
          setCards(updatedCards)
          console.log('✅ Cards updated with price data from join query')
          return
        } else {
          const errorText = await response.text()
          console.log('❌ Join query failed:', errorText)
          console.log('Falling back to separate queries...')
        }
      } catch (error) {
        console.log('❌ Join query error:', error.message)
        console.log('Falling back to separate queries...')
      }
      
      // Fallback to original approach
      await fetchPriceDataFallback(cards)
      
    } catch (error) {
      console.error('❌ Error fetching price data:', error)
    } finally {
      console.log('=== END FETCHING PRICE DATA ===')
    }
  }

  const fetchPriceDataFallback = async (cards) => {
    try {
      console.log('=== FALLBACK: SEPARATE QUERIES ===')
      
      // OPTION A: Use Map for efficient lookup
      const priceMap = new Map()
      
      // Fetch all price data
      const priceResponse = await fetch(`${supabaseUrl}/rest/v1/card_prices?select=*`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (priceResponse.ok) {
        const priceData = await priceResponse.json()
        console.log('✅ Fetched', priceData.length, 'price entries')
        
        // Build price map for efficient lookup
        priceData.forEach(price => {
          if (price.card_id) {
            priceMap.set(price.card_id.toString(), price)
          }
        })
        
        console.log('Price map size:', priceMap.size)
        console.log('Sample price map entries:', Array.from(priceMap.entries()).slice(0, 3))
        
        // Map cards with robust UUID comparison
        const updatedCards = cards.map(card => {
          const cardId = card.id?.toString()
          const priceData = priceMap.get(cardId)
          
          console.log(`Card ${card.name} (${cardId}):`, {
            found: !!priceData,
            priceData: priceData,
            average_price: priceData?.average_price,
            last_seen: priceData?.last_seen
          })
          
          return {
            ...card,
            latest_price: priceData?.average_price || null,
            price_count: 1, // Set to 1 since we're not using price_entries yet
            last_price_update: priceData?.last_seen || null
          }
        })
        
        console.log('Updated cards with prices:', updatedCards.map(c => ({ 
          name: c.name, 
          latest_price: c.latest_price, 
          price_count: c.price_count,
          last_price_update: c.last_price_update
        })))
        
        // Check if any cards actually got prices
        const cardsWithPrices = updatedCards.filter(c => c.latest_price && c.latest_price > 0)
        console.log(`📊 Cards with prices: ${cardsWithPrices.length}/${updatedCards.length}`)
        
        if (cardsWithPrices.length === 0) {
          console.log('⚠️ WARNING: No cards received price data despite successful fetch')
          console.log('This suggests a mapping issue between card IDs and price data')
          
          // CRITICAL DEBUGGING: Show the actual data structures
          console.log('=== CRITICAL DEBUGGING ===')
          console.log('First 3 cards:', cards.slice(0, 3).map(c => ({ id: c.id, name: c.name, id_type: typeof c.id })))
          console.log('First 3 price entries:', Array.from(priceMap.entries()).slice(0, 3).map(([key, value]) => ({ 
            card_id: key, 
            card_id_type: typeof key,
            average_price: value.average_price,
            last_seen: value.last_seen,
            all_keys: Object.keys(value)
          })))
          
          // Test ID matching manually
          const firstCard = cards[0]
          const firstPriceKey = Array.from(priceMap.keys())[0]
          const firstPrice = priceMap.get(firstPriceKey)
          console.log('ID Matching Test:')
          console.log('- Card ID:', firstCard?.id, 'Type:', typeof firstCard?.id)
          console.log('- Price card_id:', firstPriceKey, 'Type:', typeof firstPriceKey)
          console.log('- Direct match:', firstCard?.id === firstPriceKey)
          console.log('- String match:', firstCard?.id?.toString() === firstPriceKey)
          
          // CRITICAL: Test the actual mapping logic that's failing
          console.log('=== MAPPING LOGIC TEST ===')
          const testCard = cards[0]
          const testPriceKey = Array.from(priceMap.keys())[0]
          const testPrice = priceMap.get(testPriceKey)
          
          // Test all the strategies from the code
          const strategy1 = testPriceKey === testCard.id
          const strategy2 = testPriceKey === testCard.id?.toString()
          
          console.log('Strategy 1 (Exact match):', strategy1)
          console.log('Strategy 2 (String match):', strategy2)
          
          // Show what the mapping would produce
          const mappedCard = {
            ...testCard,
            latest_price: testPrice?.average_price || null,
            price_count: 1, // Set to 1 since we're not using price_entries yet
            last_price_update: testPrice?.last_seen || null
          }
          console.log('Mapped card result:', {
            name: mappedCard.name,
            latest_price: mappedCard.latest_price,
            price_count: mappedCard.price_count,
            last_price_update: mappedCard.last_price_update
          })
          console.log('=== END MAPPING LOGIC TEST ===')
          console.log('=== END CRITICAL DEBUGGING ===')
        }
        
        setCards(updatedCards)
        console.log('✅ Cards updated with price data from fallback')
      } else {
        const errorText = await priceResponse.text()
        console.log('❌ Price data fetch failed:', errorText)
      }
    } catch (error) {
      console.error('❌ Fallback error:', error)
    } finally {
      console.log('=== END FALLBACK: SEPARATE QUERIES ===')
    }
  }
        
        console.log('Updated cards with prices:', updatedCards.map(c => ({ 
          name: c.name, 
          latest_price: c.latest_price, 
          price_count: c.price_count 
        })))
        
        // Check if any cards actually got prices
        const cardsWithPrices = updatedCards.filter(c => c.latest_price && c.latest_price > 0)
        console.log(`📊 Cards with prices: ${cardsWithPrices.length}/${updatedCards.length}`)
        
        // CRITICAL DEBUGGING: Check why cardsWithPrices might be empty in fallback
        console.log('=== FALLBACK DEBUGGING: Why no prices? ===')
        console.log('All fallback cards:', updatedCards.map(c => ({
          name: c.name,
          latest_price: c.latest_price,
          latest_price_type: typeof c.latest_price,
          latest_price_truthy: !!c.latest_price,
          latest_price_gt_zero: c.latest_price > 0,
          price_count: c.price_count,
          last_price_update: c.last_price_update
        })))
        
        if (cardsWithPrices.length === 0) {
          console.log('⚠️ WARNING: No cards received price data despite successful fetch')
          console.log('This suggests a mapping issue between card IDs and price data')
          
          // CRITICAL DEBUGGING: Show the actual data structures
          console.log('=== CRITICAL DEBUGGING ===')
          console.log('First 3 cards:', cards.slice(0, 3).map(c => ({ id: c.id, name: c.name, id_type: typeof c.id })))
          console.log('First 3 price entries:', priceData.slice(0, 3).map(p => ({ 
            card_id: p.card_id, 
            card_id_type: typeof p.card_id,
            latest_average: p.latest_average,
            all_keys: Object.keys(p)
          })))
          
          // Test ID matching manually
          const firstCard = cards[0]
          const firstPrice = priceData[0]
          console.log('ID Matching Test:')
          console.log('- Card ID:', firstCard?.id, 'Type:', typeof firstCard?.id)
          console.log('- Price card_id:', firstPrice?.card_id, 'Type:', typeof firstPrice?.card_id)
          console.log('- Direct match:', firstCard?.id === firstPrice?.card_id)
          console.log('- String match:', firstCard?.id?.toString() === firstPrice?.card_id?.toString())
          console.log('- UUID without dashes:', firstCard?.id?.replace(/-/g, '') === firstPrice?.card_id?.toString())
          
          // CRITICAL: Test the actual mapping logic that's failing
          console.log('=== MAPPING LOGIC TEST ===')
          const testCard = cards[0]
          const testPrice = priceData[0]
          
          // Test all the strategies from the code
          const strategy1 = testPrice.card_id === testCard.id
          const strategy2 = testPrice.card_id && testCard.id && testPrice.card_id.toString() === testCard.id.toString()
          const strategy3 = testPrice.card_id && testCard.id && testPrice.card_id.toString().substring(0, 8) === testCard.id.substring(0, 8)
          const strategy4 = typeof testPrice.card_id === 'number' && testCard.id && testPrice.card_id.toString() === testCard.id.replace(/-/g, '').substring(0, 8)
          
          console.log('Strategy 1 (Exact match):', strategy1)
          console.log('Strategy 2 (String conversion):', strategy2)
          console.log('Strategy 3 (First 8 chars):', strategy3)
          console.log('Strategy 4 (Number to UUID):', strategy4)
          
          // Show what the mapping would produce
          const mappedCard = {
            ...testCard,
            latest_price: testPrice?.latest_average || null,
            price_count: testPrice?.price_count || 0,
            last_price_update: testPrice?.last_updated || null
          }
          console.log('Mapped card result:', {
            name: mappedCard.name,
            latest_price: mappedCard.latest_price,
            price_count: mappedCard.price_count,
            last_price_update: mappedCard.last_price_update
          })
          console.log('=== END MAPPING LOGIC TEST ===')
          console.log('=== END CRITICAL DEBUGGING ===')
        }
        
        setCards(updatedCards)
        console.log('✅ Cards updated with price data')
      } else {
        console.log('⚠️ No price data found with any approach')
      }
    } catch (error) {
      console.error('❌ Error fetching price data:', error)
      // Don't fail the whole operation if price data fails
    } finally {
      console.log('=== END FETCHING PRICE DATA ===')
    }
  }

  const checkDatabaseDirectly = async () => {
    try {
      console.log('=== DIRECT DATABASE CHECK ===')
      
      // Method 1: Try different query approaches
      const queries = [
        { name: 'All cards', url: `${supabaseUrl}/rest/v1/cards?select=*` },
        { name: 'Cards with limit', url: `${supabaseUrl}/rest/v1/cards?select=*&limit=10` },
        { name: 'Cards ordered by created_at', url: `${supabaseUrl}/rest/v1/cards?select=*&order=created_at.desc` },
        { name: 'Cards with specific columns', url: `${supabaseUrl}/rest/v1/cards?select=id,name,created_at` },
        { name: 'Count cards', url: `${supabaseUrl}/rest/v1/cards?select=count` }
      ]
      
      for (const query of queries) {
        console.log(`\n--- Testing: ${query.name} ---`)
        const response = await fetch(query.url, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json'
          }
        })
        
        console.log(`Response status: ${response.status}`)
        if (response.ok) {
          const data = await response.json()
          console.log(`✅ ${query.name} result:`, data)
          console.log(`✅ Data type:`, typeof data)
          console.log(`✅ Data length:`, Array.isArray(data) ? data.length : 'N/A')
        } else {
          const errorText = await response.text()
          console.log(`❌ ${query.name} failed:`, errorText)
        }
      }
      
      // Method 2: Try to check if the table exists and has data
      console.log('\n--- Checking table structure ---')
      const tableCheckUrl = `${supabaseUrl}/rest/v1/cards?select=*&limit=1`
      const tableResponse = await fetch(tableCheckUrl, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Table check response status:', tableResponse.status)
      if (tableResponse.ok) {
        const tableData = await tableResponse.json()
        console.log('✅ Table structure check:', tableData)
        console.log('✅ Table exists and is accessible')
      } else {
        const tableError = await tableResponse.text()
        console.log('❌ Table structure check failed:', tableError)
      }
      
    } catch (error) {
      console.error('❌ Direct database check error:', error)
    } finally {
      console.log('=== END DIRECT DATABASE CHECK ===')
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    try {
      setLoading(true)
      setSearchStatus('Searching...')

      const response = await fetch(`${supabaseUrl}/functions/v1/card-scraper`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: searchQuery })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('=== CARD SCRAPER RESPONSE ===')
      console.log('Full response:', result)
      console.log('Response type:', typeof result)
      console.log('Response keys:', Object.keys(result))
      console.log('=== END CARD SCRAPER RESPONSE ===')
      setSearchStatus('Card scraped successfully!')
      setSearchQuery('')
      
      // Refresh the card library immediately and then again after a delay
      await fetchCards()
      
      // Also refresh after a longer delay to ensure the card is fully processed
      setTimeout(async () => {
        console.log('Refreshing card library after delay...')
        await fetchCards()
      }, 2000)
    } catch (error) {
      console.error('Error scraping card:', error)
      setSearchStatus('Error scraping card. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16 space-y-12">
        {/* Main Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-2xl mb-8 shadow-xl">
            <span className="text-3xl">🎴</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent mb-6 leading-tight">
            Trading Card Price Tracker
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed font-medium">
            Track and analyze trading card prices from eBay and other marketplaces
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-3xl shadow-2xl p-10 md:p-12 border border-white/30 dark:border-gray-700/60">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
                <span className="text-2xl">🔍</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Search for Cards
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg md:text-xl font-medium">
                Enter a card name to scrape current market prices
              </p>
            </div>
            <form onSubmit={handleSearch} className="space-y-8">
              <div>
                <label htmlFor="search" className="block text-base font-bold text-gray-700 dark:text-gray-300 mb-4">
                  Card Name & Condition
                </label>
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., Pikachu PSA 10, Charizard PSA 9"
                  className="w-full px-8 py-5 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-300 shadow-lg"
                  required
                />
                <p className="mt-4 text-base text-gray-500 dark:text-gray-400 font-medium">
                  Include the card name and condition (PSA grade) for best results
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-5 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:transform-none text-xl shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-white mr-4"></div>
                    <span className="text-lg">Scraping Prices...</span>
                  </div>
                ) : (
                  '🚀 Search & Scrape Prices'
                )}
              </button>
            </form>
            
            {/* Status Message */}
            {searchStatus && (
              <div className={`mt-8 p-6 rounded-2xl border-2 ${
                searchStatus.includes('Error') 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200' 
                  : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              }`}>
                <div className="flex items-center">
                  <span className="text-2xl mr-4">
                    {searchStatus.includes('Error') ? '❌' : '✅'}
                  </span>
                  <span className="font-bold text-lg">{searchStatus}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Library */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-3xl shadow-2xl p-10 md:p-12 border border-white/30 dark:border-gray-700/60">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-600 rounded-2xl mr-4 shadow-lg">
                  <span className="text-xl">📚</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                  Card Library
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-lg md:text-xl font-medium">
                Your collection of scraped trading cards with current market prices
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={fetchCards}
                disabled={libraryLoading}
                className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-indigo-700 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-2xl py-4 px-8 text-base font-bold transition-all duration-300 transform hover:scale-105 disabled:transform-none flex items-center shadow-xl"
              >
                {libraryLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    <span className="text-base">Loading...</span>
                  </>
                ) : (
                  <>
                    <span className="mr-3 text-lg">🔄</span>
                    <span className="text-base">Refresh</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  console.log('=== DEBUG: Current cards state ===')
                  console.log('Cards array:', cards)
                  console.log('Cards length:', cards.length)
                  console.log('Library loading:', libraryLoading)
                  
                  // Show first card structure
                  if (cards.length > 0) {
                    console.log('=== FIRST CARD STRUCTURE ===')
                    console.log('First card:', cards[0])
                    console.log('First card keys:', Object.keys(cards[0]))
                    console.log('Price fields:')
                    console.log('- latest_price:', cards[0].latest_price, 'Type:', typeof cards[0].latest_price)
                    console.log('- price_count:', cards[0].price_count, 'Type:', typeof cards[0].price_count)
                    console.log('- last_price_update:', cards[0].last_price_update, 'Type:', typeof cards[0].last_price_update)
                    console.log('=== END FIRST CARD STRUCTURE ===')
                  }
                  
                  console.log('Environment variables:')
                  console.log('- VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
                  console.log('- VITE_SUPABASE_ANON_KEY (first 20 chars):', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
                  console.log('=== END DEBUG ===')
                }}
                className="bg-gradient-to-r from-yellow-500 via-yellow-600 to-orange-600 hover:from-yellow-600 hover:via-orange-600 hover:to-orange-700 text-white rounded-2xl py-4 px-8 text-base font-bold transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                🐛 Debug
              </button>
              <button
                onClick={checkDatabaseDirectly}
                className="bg-gradient-to-r from-red-500 via-red-600 to-pink-600 hover:from-red-600 hover:via-pink-600 hover:to-pink-700 text-white rounded-2xl py-4 px-8 text-base font-bold transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                🔍 Check DB
              </button>
              <button
                onClick={() => fetchPriceData(cards)}
                className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:from-orange-600 hover:via-red-600 hover:to-red-700 text-white rounded-2xl py-4 px-8 text-base font-bold transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                💰 Test Prices
              </button>
              <button
                onClick={async () => {
                  console.log('=== DIRECT PRICE DATA CHECK ===')
                  try {
                    const response = await fetch(`${supabaseUrl}/rest/v1/card_prices?select=*&limit=3`, {
                      headers: {
                        'apikey': supabaseAnonKey,
                        'Authorization': `Bearer ${supabaseAnonKey}`,
                        'Content-Type': 'application/json'
                      }
                    })
                    if (response.ok) {
                      const data = await response.json()
                      console.log('Direct price data sample:', data)
                      console.log('Price data structure:', data.map(item => ({
                        keys: Object.keys(item),
                        values: Object.values(item)
                      })))
                      
                      // Also check the first card to see the ID format
                      const firstCardResponse = await fetch(`${supabaseUrl}/rest/v1/cards?select=*&limit=1`, {
                        headers: {
                          'apikey': supabaseAnonKey,
                          'Authorization': `Bearer ${supabaseAnonKey}`,
                          'Content-Type': 'application/json'
                        }
                      })
                      if (firstCardResponse.ok) {
                        const cardData = await firstCardResponse.json()
                        console.log('First card data:', cardData[0])
                        console.log('ID comparison:')
                        console.log('- Card ID:', cardData[0]?.id, 'Type:', typeof cardData[0]?.id)
                        console.log('- Price card_id:', data[0]?.card_id, 'Type:', typeof data[0]?.card_id)
                        console.log('- Match test:', cardData[0]?.id === data[0]?.card_id)
                        
                        // CRITICAL: Test the actual mapping logic
                        console.log('=== MAPPING TEST ===')
                        const testCard = cardData[0]
                        const testPrice = data[0]
                        
                        // Test all matching strategies
                        console.log('Strategy 1 - Direct match:', testCard?.id === testPrice?.card_id)
                        console.log('Strategy 2 - String match:', testCard?.id?.toString() === testPrice?.card_id?.toString())
                        console.log('Strategy 3 - UUID without dashes:', testCard?.id?.replace(/-/g, '') === testPrice?.card_id?.toString())
                        console.log('Strategy 4 - First 8 chars:', testCard?.id?.substring(0, 8) === testPrice?.card_id?.toString().substring(0, 8))
                        
                        // Show what the card would look like after mapping
                        const mappedCard = {
                          ...testCard,
                          latest_price: testPrice?.latest_average || null,
                          price_count: testPrice?.price_count || 0,
                          last_price_update: testPrice?.last_updated || null
                        }
                        console.log('Mapped card result:', {
                          name: mappedCard.name,
                          latest_price: mappedCard.latest_price,
                          price_count: mappedCard.price_count,
                          last_price_update: mappedCard.last_price_update
                        })
                        console.log('=== END MAPPING TEST ===')
                      }
                    }
                  } catch (error) {
                    console.error('Error checking price data:', error)
                  }
                  console.log('=== END DIRECT PRICE DATA CHECK ===')
                }}
                className="bg-gradient-to-r from-purple-500 via-purple-600 to-pink-600 hover:from-purple-600 hover:via-pink-600 hover:to-pink-700 text-white rounded-2xl py-4 px-8 text-base font-bold transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                🔍 Check Price Data
              </button>
            </div>
          </div>
            
            {libraryLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading cards...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">No cards found. Start by searching for a card above.</p>
                <p className="text-xs text-gray-500 mt-2">Debug: Cards array length is {cards.length}</p>
              </div>
            ) : (
              <div>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 font-bold">Found {cards.length} card(s)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {cards.map((card, index) => (
                    <div key={index} className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/40 dark:border-gray-700/60 overflow-hidden group transform hover:-translate-y-2">
                      {/* Card Header */}
                      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 p-6 text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                        <div className="relative">
                          <h3 className="font-bold text-xl truncate mb-2">
                            {card.name || 'Unknown Card'}
                          </h3>
                          <p className="text-blue-100 text-sm opacity-90 font-medium">
                            #{card.id?.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                      
                      {/* Card Content */}
                      <div className="p-6 space-y-5">
                        {/* Price Information */}
                        {card.latest_price && card.latest_price > 0 ? (
                          <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-5 border-2 border-green-200 dark:border-green-800 shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-base font-bold text-green-800 dark:text-green-200">
                                💰 Latest Price
                              </span>
                              <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                                ${card.latest_price.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="bg-green-100 dark:bg-green-800 px-3 py-2 rounded-full text-sm font-semibold text-green-700 dark:text-green-300">
                                📊 {card.price_count} entries
                              </span>
                              {card.last_price_update && (
                                <span className="bg-green-100 dark:bg-green-800 px-3 py-2 rounded-full text-sm font-semibold text-green-700 dark:text-green-300">
                                  📅 {new Date(card.last_price_update).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-5 border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                            <div className="text-center">
                              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full mb-3">
                                <span className="text-blue-600 dark:text-blue-400 text-lg">⏳</span>
                              </div>
                              <p className="text-base text-blue-800 dark:text-blue-200 font-bold">
                                Price data will be updated soon
                              </p>
                              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                Card Added Successfully
                              </p>
                              {/* Debug info */}
                              <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                <p>Debug: latest_price = {card.latest_price}</p>
                                <p>Debug: price_count = {card.price_count}</p>
                                <p>Debug: last_price_update = {card.last_price_update}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Card Details */}
                        <div className="space-y-4">
                          {card.condition && (
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                              <span className="text-base text-gray-600 dark:text-gray-400 font-medium">Condition:</span>
                              <span className="text-base font-bold text-gray-900 dark:text-white">{card.condition}</span>
                            </div>
                          )}
                          
                          {card.source && (
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                              <span className="text-base text-gray-600 dark:text-gray-400 font-medium">Source:</span>
                              <span className="text-base font-bold text-gray-900 dark:text-white">{card.source}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Footer */}
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-500 dark:text-gray-500 text-center font-medium">
                            Added: {new Date(card.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Footer with deployment time */}
      <footer className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <span className="text-xs text-gray-400 bg-white/80 dark:bg-gray-900/80 px-3 py-1 rounded shadow-sm">
          Last deployed: {deployTime}
        </span>
      </footer>
    </div>
  )
}

export default App
