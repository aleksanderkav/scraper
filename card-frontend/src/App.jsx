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
      
      // Try different approaches to fetch price data
      const approaches = [
        // Approach 1: Fetch all price data
        `${supabaseUrl}/rest/v1/card_prices?select=*`,
        // Approach 2: Fetch with specific columns
        `${supabaseUrl}/rest/v1/card_prices?select=card_id,latest_average,price_count,last_updated`,
        // Approach 3: Try price_entries table instead
        `${supabaseUrl}/rest/v1/price_entries?select=*`
      ]
      
      const headers = {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
      
      let priceData = null
      let successfulApproach = null
      
      for (let i = 0; i < approaches.length; i++) {
        const url = approaches[i]
        console.log(`Trying approach ${i + 1}:`, url)
        
        try {
          const response = await fetch(url, { headers })
          console.log(`Approach ${i + 1} response status:`, response.status)
          
          if (response.ok) {
            const data = await response.json()
            console.log(`✅ Approach ${i + 1} data:`, data)
            
            if (Array.isArray(data) && data.length > 0) {
              priceData = data
              successfulApproach = i + 1
              break
            }
          } else {
            const errorText = await response.text()
            console.log(`❌ Approach ${i + 1} failed:`, errorText)
          }
        } catch (error) {
          console.log(`❌ Approach ${i + 1} error:`, error.message)
        }
      }
      
      if (priceData && successfulApproach) {
        console.log(`✅ Using approach ${successfulApproach} with ${priceData.length} price entries`)
        console.log('Sample price data:', priceData[0]) // Debug the structure
        
        // Update cards with price information based on the successful approach
        const updatedCards = cards.map(card => {
          let cardPrice = null
          
          if (successfulApproach === 1 || successfulApproach === 2) {
            // card_prices table approach
            cardPrice = priceData.find(price => price.card_id === card.id)
            console.log(`Card ${card.name} (${card.id}):`, cardPrice) // Debug each card
            return {
              ...card,
              latest_price: cardPrice?.latest_average || null,
              price_count: cardPrice?.price_count || 0,
              last_price_update: cardPrice?.last_updated || null
            }
          } else if (successfulApproach === 3) {
            // price_entries table approach
            const cardEntries = priceData.filter(entry => entry.card_id === card.id)
            const latestEntry = cardEntries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
            return {
              ...card,
              latest_price: latestEntry?.price || null,
              price_count: cardEntries.length,
              last_price_update: latestEntry?.created_at || null
            }
          }
          
          return card
        })
        
        console.log('Updated cards with prices:', updatedCards.map(c => ({ 
          name: c.name, 
          latest_price: c.latest_price, 
          price_count: c.price_count 
        })))
        
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-10">
        {/* Main Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
            <span className="text-2xl">🎴</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-4">
            Trading Card Price Tracker
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Track and analyze trading card prices from eBay and other marketplaces
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-10 border border-white/20 dark:border-gray-700/50">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mb-4">
                <span className="text-xl">🔍</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                Search for Cards
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg">
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
                  placeholder="e.g., Pikachu PSA 10, Charizard PSA 9"
                  className="w-full px-6 py-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-300 shadow-sm"
                  required
                />
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Include the card name and condition (PSA grade) for best results
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none text-lg shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    <span>Scraping Prices...</span>
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
                  <span className="text-xl mr-3">
                    {searchStatus.includes('Error') ? '❌' : '✅'}
                  </span>
                  <span className="font-medium">{searchStatus}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Library */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-10 border border-white/20 dark:border-gray-700/50">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-6">
            <div>
              <div className="flex items-center mb-3">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl mr-3">
                  <span className="text-lg">📚</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  Card Library
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg">
                Your collection of scraped trading cards with current market prices
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchCards}
                disabled={libraryLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl py-3 px-6 text-sm font-semibold transition-all duration-300 transform hover:scale-105 disabled:transform-none flex items-center shadow-lg"
              >
                {libraryLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🔄</span>
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
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-xl py-3 px-6 text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                🐛 Debug
              </button>
              <button
                onClick={checkDatabaseDirectly}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl py-3 px-6 text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                🔍 Check DB
              </button>
              <button
                onClick={() => fetchPriceData(cards)}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl py-3 px-6 text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                💰 Test Prices
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
                <p className="text-base text-gray-600 dark:text-gray-400 mb-6 font-medium">Found {cards.length} card(s)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {cards.map((card, index) => (
                    <div key={index} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 dark:border-gray-700/50 overflow-hidden group transform hover:-translate-y-1">
                      {/* Card Header */}
                      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 p-5 text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                        <div className="relative">
                          <h3 className="font-bold text-lg truncate mb-1">
                            {card.name || 'Unknown Card'}
                          </h3>
                          <p className="text-blue-100 text-sm opacity-90">
                            #{card.id?.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                      
                      {/* Card Content */}
                      <div className="p-5 space-y-4">
                        {/* Price Information */}
                        {card.latest_price && card.latest_price > 0 ? (
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                                Latest Price
                              </span>
                              <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                ${card.latest_price.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-green-600 dark:text-green-400">
                              <span className="bg-green-100 dark:bg-green-800 px-2 py-1 rounded-full">
                                {card.price_count} entries
                              </span>
                              {card.last_price_update && (
                                <span className="bg-green-100 dark:bg-green-800 px-2 py-1 rounded-full">
                                  {new Date(card.last_price_update).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 shadow-sm">
                            <div className="text-center">
                              <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full mb-2">
                                <span className="text-blue-600 dark:text-blue-400 text-sm">⏳</span>
                              </div>
                              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                                Price data will be updated soon
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Card Details */}
                        <div className="space-y-3">
                          {card.condition && (
                            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Condition:</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{card.condition}</span>
                            </div>
                          )}
                          
                          {card.source && (
                            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Source:</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{card.source}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Footer */}
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
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
