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
      console.log('=== FETCHING CARDS WITH PRICES ===')
      
      const apiUrl = `${supabaseUrl}/rest/v1/cards_with_prices?select=*&order=created_at.desc`
      console.log('API URL:', apiUrl)
      
      const headers = {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
      
      const response = await fetch(apiUrl, { headers })
      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Failed to fetch cards with prices:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const cardsWithPrices = await response.json()
      console.log('✅ Fetched', cardsWithPrices.length, 'cards with prices')
      
      if (Array.isArray(cardsWithPrices)) {
        // Log sample card structure
        if (cardsWithPrices.length > 0) {
          console.log('=== SAMPLE CARD ===')
          console.log('Sample:', {
            name: cardsWithPrices[0].name,
            latest_price: cardsWithPrices[0].latest_price,
            price_count: cardsWithPrices[0].price_count,
            last_price_update: cardsWithPrices[0].last_price_update
          })
          console.log('=== END SAMPLE ===')
        }
        
        setCards(cardsWithPrices)
        console.log('✅ Cards updated successfully')
      } else {
        console.error('❌ Response is not an array:', typeof cardsWithPrices)
        setCards([])
      }
    } catch (error) {
      console.error('❌ Error fetching cards:', error)
      setSearchStatus('Error loading card library')
    } finally {
      setLibraryLoading(false)
      console.log('=== END FETCHING CARDS ===')
    }
  }

  // Removed old fallback logic - no longer needed with cards_with_prices view

  const checkDatabaseDirectly = async () => {
    try {
      console.log('=== TESTING CARDS_WITH_PRICES VIEW ===')
      
      const response = await fetch(`${supabaseUrl}/rest/v1/cards_with_prices?select=*&limit=3`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log(`Response status: ${response.status}`)
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ View test result:`, data)
        console.log(`✅ Sample card:`, data[0])
      } else {
        const errorText = await response.text()
        console.log(`❌ View test failed:`, errorText)
      }
      
    } catch (error) {
      console.error('❌ View test error:', error)
    } finally {
      console.log('=== END VIEW TEST ===')
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
                          <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/20 dark:via-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-5 border-2 border-orange-200 dark:border-orange-800 shadow-lg">
                            <div className="text-center">
                              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-full mb-3">
                                <span className="text-orange-600 dark:text-orange-400 text-lg">💰</span>
                              </div>
                              <p className="text-base text-orange-800 dark:text-orange-200 font-bold mb-3">
                                No Price Data Available
                              </p>
                              <button
                                onClick={async () => {
                                  try {
                                    const scraperUrl = `https://scraper-production-22f6.up.railway.app/scrape?query=${encodeURIComponent(card.name)}`
                                    console.log('Scraping prices for:', card.name)
                                    console.log('Scraper URL:', scraperUrl)
                                    
                                    const response = await fetch(scraperUrl)
                                    const result = await response.json()
                                    
                                    console.log('Scraper result:', result)
                                    
                                    if (result.status === 'success') {
                                      // Refresh the card library to show updated prices
                                      setTimeout(() => {
                                        fetchCards()
                                      }, 2000)
                                    }
                                  } catch (error) {
                                    console.error('Error scraping prices:', error)
                                  }
                                }}
                                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                              >
                                🚀 Scrape Prices
                              </button>
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
