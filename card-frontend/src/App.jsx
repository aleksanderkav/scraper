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
      
      // Fetch cards with their latest price data
      const apiUrl = `${supabaseUrl}/rest/v1/cards?select=*,card_prices(latest_average,price_count,last_updated)&order=created_at.desc`
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
        // Process the data to flatten the nested price information
        const processedCards = data.map(card => ({
          ...card,
          latest_price: card.card_prices?.[0]?.latest_average || null,
          price_count: card.card_prices?.[0]?.price_count || 0,
          last_price_update: card.card_prices?.[0]?.last_updated || null
        }))
        
        setCards(processedCards)
        console.log('✅ Cards state updated with', processedCards.length, 'cards')
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative pb-12">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Card Scraper
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Search and collect trading card data
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                🔍 Search for Cards
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Enter a card name to scrape current market prices
              </p>
            </div>
            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <label htmlFor="search" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Card Name & Condition
                </label>
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., Pikachu PSA 10, Charizard PSA 9, Blastoise PSA 8"
                  className="w-full px-6 py-4 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                  required
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Include the card name and condition (PSA grade) for best results
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none text-lg shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Scraping Prices...
                  </div>
                ) : (
                  '🚀 Search & Scrape Prices'
                )}
              </button>
            </form>
            
            {/* Status Message */}
            {searchStatus && (
              <div className={`mt-6 p-4 rounded-xl border-2 ${
                searchStatus.includes('Error') 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200' 
                  : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              }`}>
                <div className="flex items-center">
                  <span className="text-lg mr-2">
                    {searchStatus.includes('Error') ? '❌' : '✅'}
                  </span>
                  <span className="font-medium">{searchStatus}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Library */}
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  📚 Card Library
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Your collection of scraped trading cards with current market prices
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={fetchCards}
                  disabled={libraryLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-lg transition duration-200 flex items-center"
                >
                  {libraryLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <span className="mr-1">🔄</span>
                      Refresh
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    console.log('=== DEBUG: Current cards state ===')
                    console.log('Cards array:', cards)
                    console.log('Cards length:', cards.length)
                    console.log('Library loading:', libraryLoading)
                    console.log('Environment variables:')
                    console.log('- VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
                    console.log('- VITE_SUPABASE_ANON_KEY (first 20 chars):', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
                    console.log('=== END DEBUG ===')
                  }}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition duration-200"
                >
                  🐛 Debug
                </button>
                <button
                  onClick={checkDatabaseDirectly}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition duration-200"
                >
                  🔍 Check DB
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Found {cards.length} card(s)</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {cards.map((card, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden group">
                      {/* Card Header */}
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
                        <h3 className="font-bold text-lg truncate">
                          {card.name || 'Unknown Card'}
                        </h3>
                        <p className="text-blue-100 text-sm opacity-90">
                          Card #{card.id}
                        </p>
                      </div>
                      
                      {/* Card Content */}
                      <div className="p-4 space-y-3">
                        {/* Price Information */}
                        {card.latest_price ? (
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                Latest Price
                              </span>
                              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                ${card.latest_price.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-green-600 dark:text-green-400">
                                {card.price_count} price entries
                              </span>
                              {card.last_price_update && (
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  Updated: {new Date(card.last_price_update).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                              No price data available
                            </p>
                          </div>
                        )}
                        
                        {/* Card Details */}
                        <div className="space-y-2">
                          {card.condition && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Condition:</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{card.condition}</span>
                            </div>
                          )}
                          
                          {card.source && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Source:</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{card.source}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Footer */}
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
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
