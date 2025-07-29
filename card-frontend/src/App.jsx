import { useState, useEffect } from 'react'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [deployTime] = useState(() => new Date().toLocaleString())
  
  // Version tracking - prominently displayed
  const APP_VERSION = '3.3.0'
  // Static build date - only changes when we actually deploy
  const BUILD_DATE = '29/07/2025, 14:20:00'
  const DEPLOY_TIME = '29/07/2025, 14:20:00'

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  // Fetch cards on component mount
  useEffect(() => {
    fetchCards()
  }, [])

  const fetchCards = async () => {
    try {
      setLibraryLoading(true)
      console.log('=== FETCHING CARDS WITH PRICES (v3.3.0) ===')
      
      // Using the new cards_with_prices view as single source of truth
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
        // Comprehensive debugging for price display
        if (cardsWithPrices.length > 0) {
          console.log('=== COMPREHENSIVE CARD ANALYSIS ===')
          cardsWithPrices.slice(0, 5).forEach((card, index) => {
            console.log(`Card ${index + 1} - ${card.name}:`, {
              id: card.id,
              name: card.name,
              latest_price: card.latest_price,
              price_count: card.price_count,
              last_price_update: card.last_price_update,
              created_at: card.created_at,
              hasPrice: card.latest_price && card.latest_price > 0,
              priceType: typeof card.latest_price,
              priceValue: card.latest_price,
              willDisplayPrice: card.latest_price && card.latest_price > 0
            })
          })
          
          // Summary statistics
          const cardsWithPrices = cardsWithPrices.filter(card => card.latest_price && card.latest_price > 0)
          const cardsWithoutPrices = cardsWithPrices.filter(card => !card.latest_price || card.latest_price <= 0)
          
          console.log('📊 PRICE SUMMARY:', {
            totalCards: cardsWithPrices.length,
            cardsWithPrices: cardsWithPrices.length,
            cardsWithoutPrices: cardsWithoutPrices.length,
            percentageWithPrices: ((cardsWithPrices.length / cardsWithPrices.length) * 100).toFixed(1) + '%'
          })
          console.log('=== END COMPREHENSIVE ANALYSIS ===')
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

  const testBackendIntegration = async () => {
    try {
      console.log('=== BACKEND INTEGRATION TEST ===')
      
      // Test 1: Direct view access
      const response = await fetch(`${supabaseUrl}/rest/v1/cards_with_prices?select=*&limit=3`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log(`View test status: ${response.status}`)
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ View test result:`, data)
        
        // Test each card's price data
        data.forEach((card, index) => {
          console.log(`Card ${index + 1} - ${card.name}:`, {
            latest_price: card.latest_price,
            price_count: card.price_count,
            last_price_update: card.last_price_update,
            hasPrice: card.latest_price && card.latest_price > 0,
            priceType: typeof card.latest_price,
            willDisplayPrice: card.latest_price && card.latest_price > 0
          })
        })
        
        // Test price display logic
        const cardsWithPrices = data.filter(card => card.latest_price && card.latest_price > 0)
        const cardsWithoutPrices = data.filter(card => !card.latest_price || card.latest_price <= 0)
        
        console.log(`📊 Test Summary:`, {
          totalCards: data.length,
          cardsWithPrices: cardsWithPrices.length,
          cardsWithoutPrices: cardsWithoutPrices.length,
          samplePriceCard: cardsWithPrices[0]?.name,
          sampleNoPriceCard: cardsWithoutPrices[0]?.name
        })
      } else {
        const errorText = await response.text()
        console.log(`❌ View test failed:`, errorText)
      }
    } catch (error) {
      console.error('❌ Backend test error:', error)
    } finally {
      console.log('=== END BACKEND TEST ===')
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-blue-900 dark:via-blue-800 dark:to-blue-700">
      {/* PROMINENT VERSION DISPLAY - TOP OF PAGE */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white shadow-lg border-b-4 border-blue-400">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-2 sm:mb-0">
              <span className="text-xl sm:text-2xl font-bold">🎴 Trading Card Tracker</span>
              <span className="text-base sm:text-lg font-bold bg-white/30 px-3 py-2 rounded-full border-2 border-white/50 shadow-lg">
                v{APP_VERSION}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm sm:text-base">
              <span className="font-medium">Built: {BUILD_DATE}</span>
              <span className="hidden sm:inline font-bold">•</span>
              <span className="font-medium">Deployed: {DEPLOY_TIME}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT - ADJUSTED FOR FIXED HEADER */}
      <div className="pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 space-y-6 sm:space-y-8 lg:space-y-12">
          {/* Main Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-2xl mb-6 sm:mb-8 shadow-xl">
              <span className="text-2xl sm:text-3xl">🎴</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent mb-4 sm:mb-6 leading-tight">
              Trading Card Price Tracker
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-slate-600 dark:text-slate-300 max-w-4xl mx-auto leading-relaxed font-medium px-4">
              Track and analyze trading card prices from eBay and other marketplaces
            </p>
            
            {/* Status Info */}
            <div className="mt-6 p-4 sm:p-6 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/30 dark:via-emerald-900/30 dark:to-teal-900/30 backdrop-blur-sm rounded-2xl border-2 border-green-200 dark:border-green-700 shadow-lg mx-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 lg:gap-6 text-sm sm:text-base text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="font-bold text-green-700 dark:text-green-300 text-base sm:text-lg">✅ Backend Integration Active</span>
                  <span className="text-slate-400 text-base sm:text-lg">•</span>
                  <span className="font-medium">cards_with_prices view</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-slate-400 text-base sm:text-lg">•</span>
                  <span className="font-medium">Real-time price data</span>
                </div>
              </div>
              <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-green-200 dark:border-green-700">
                <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium text-center sm:text-left">
                  🔧 Latest backend integration • 💰 Price display active • 🚀 Scrape integration ready • 📱 Mobile optimized • 🔵 Blue background test
                </p>
              </div>
            </div>
          </div>

          {/* Search Form */}
          <div className="max-w-2xl sm:max-w-3xl mx-auto px-2 sm:px-4">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl p-4 sm:p-6 lg:p-8 xl:p-10 border border-white/30 dark:border-slate-700/60">
              <div className="text-center mb-6 sm:mb-8 lg:mb-10">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 lg:mb-6 shadow-lg">
                  <span className="text-lg sm:text-xl lg:text-2xl">🔍</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-3 lg:mb-4">
                  Search for Cards
                </h2>
                <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-slate-600 dark:text-slate-300 font-medium">
                  Enter a card name to scrape current market prices
                </p>
              </div>
              <form onSubmit={handleSearch} className="space-y-6 sm:space-y-8">
                <div>
                  <label htmlFor="search" className="block text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 mb-3 sm:mb-4">
                    Card Name & Condition
                  </label>
                  <input
                    type="text"
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., Pikachu PSA 10, Charizard PSA 9"
                    className="w-full px-4 sm:px-8 py-4 sm:py-5 text-base sm:text-lg border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-700 dark:text-white transition-all duration-300 shadow-lg"
                    required
                  />
                  <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
                    Include the card name and condition (PSA grade) for best results
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:transform-none text-lg sm:text-xl shadow-xl"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 sm:h-7 sm:w-7 border-b-2 border-white mr-3 sm:mr-4"></div>
                      <span className="text-base sm:text-lg">Scraping Prices...</span>
                    </div>
                  ) : (
                    '🚀 Search & Scrape Prices'
                  )}
                </button>
              </form>
              
              {/* Status Message */}
              {searchStatus && (
                <div className={`mt-6 sm:mt-8 p-4 sm:p-6 rounded-2xl border-2 ${
                  searchStatus.includes('Error') 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200' 
                    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                }`}>
                  <div className="flex items-center">
                    <span className="text-xl sm:text-2xl mr-3 sm:mr-4">
                      {searchStatus.includes('Error') ? '❌' : '✅'}
                    </span>
                    <span className="font-bold text-base sm:text-lg">{searchStatus}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card Library */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl p-4 sm:p-6 lg:p-8 xl:p-10 border border-white/30 dark:border-slate-700/60">
                          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 sm:mb-8 lg:mb-10 gap-4 sm:gap-6 lg:gap-8">
                <div>
                  <div className="flex items-center mb-2 sm:mb-3 lg:mb-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl mr-2 sm:mr-3 lg:mr-4 shadow-lg">
                      <span className="text-base sm:text-lg lg:text-xl">📚</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 dark:text-white">
                      Card Library
                    </h2>
                  </div>
                  <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-slate-600 dark:text-slate-300 font-medium">
                    Your collection of scraped trading cards with current market prices
                  </p>
                </div>
                              <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-4">
                <button
                  onClick={fetchCards}
                  disabled={libraryLoading}
                  className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-indigo-700 hover:to-indigo-800 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl sm:rounded-2xl py-2 sm:py-3 lg:py-4 px-4 sm:px-6 lg:px-8 text-xs sm:text-sm lg:text-base font-bold transition-all duration-300 transform hover:scale-105 disabled:transform-none flex items-center shadow-lg sm:shadow-xl"
                >
                  {libraryLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-3"></div>
                      <span className="text-sm sm:text-base">Loading...</span>
                    </>
                  ) : (
                    <>
                      <span className="mr-2 sm:mr-3 text-base sm:text-lg">🔄</span>
                      <span className="text-sm sm:text-base">Refresh</span>
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
                      console.log('Price display logic:')
                      console.log('- card.latest_price && card.latest_price > 0:', cards[0].latest_price && cards[0].latest_price > 0)
                      console.log('- card.latest_price value:', cards[0].latest_price)
                      console.log('- card.latest_price > 0:', cards[0].latest_price > 0)
                      console.log('=== END FIRST CARD STRUCTURE ===')
                    }
                    
                    console.log('Environment variables:')
                    console.log('- VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
                    console.log('- VITE_SUPABASE_ANON_KEY (first 20 chars):', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
                    console.log('=== END DEBUG ===')
                  }}
                  className="bg-gradient-to-r from-yellow-500 via-yellow-600 to-orange-600 hover:from-yellow-600 hover:via-orange-600 hover:to-orange-700 text-white rounded-xl sm:rounded-2xl py-2 sm:py-3 lg:py-4 px-4 sm:px-6 lg:px-8 text-xs sm:text-sm lg:text-base font-bold transition-all duration-300 transform hover:scale-105 shadow-lg sm:shadow-xl"
                >
                  🐛 Debug Prices
                </button>
                <button
                  onClick={testBackendIntegration}
                  className="bg-gradient-to-r from-red-500 via-red-600 to-pink-600 hover:from-red-600 hover:via-pink-600 hover:to-pink-700 text-white rounded-xl sm:rounded-2xl py-2 sm:py-3 lg:py-4 px-4 sm:px-6 lg:px-8 text-xs sm:text-sm lg:text-base font-bold transition-all duration-300 transform hover:scale-105 shadow-lg sm:shadow-xl"
                >
                  🔍 Test Backend
                </button>
              </div>
            </div>
              
            {libraryLoading ? (
              <div className="text-center py-6 sm:py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm sm:text-base">Loading cards...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">No cards found. Start by searching for a card above.</p>
                <p className="text-xs text-slate-500 mt-2">Debug: Cards array length is {cards.length}</p>
              </div>
            ) : (
              <div>
                {/* Quick Stats */}
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 border border-blue-200 dark:border-blue-700">
                  <div className="flex flex-wrap justify-center sm:justify-between items-center gap-3 sm:gap-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400">{cards.length}</span>
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Total Cards</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">
                        {cards.filter(card => card.latest_price && card.latest_price > 0).length}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">With Prices</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {cards.filter(card => !card.latest_price || card.latest_price <= 0).length}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">No Prices</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600 dark:text-purple-400">
                        ${cards.reduce((sum, card) => sum + (card.latest_price || 0), 0).toFixed(2)}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Total Value</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-4 sm:mb-6 font-bold">Found {cards.length} card(s)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 xl:gap-8">
                  {cards.map((card, index) => (
                    <div key={index} className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 border border-white/40 dark:border-slate-700/60 overflow-hidden group transform hover:-translate-y-1 sm:hover:-translate-y-2">
                      {/* Card Header */}
                                              <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 p-3 sm:p-4 lg:p-6 text-white relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                          <div className="relative">
                            <h3 className="font-bold text-base sm:text-lg lg:text-xl truncate mb-1 sm:mb-2 leading-tight">
                              {card.name || 'Unknown Card'}
                            </h3>
                            <p className="text-blue-100 text-xs sm:text-sm opacity-90 font-medium">
                              #{card.id?.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                      
                      {/* Card Content */}
                      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-5">
                        {/* Price Information */}
                        {card.latest_price && card.latest_price > 0 ? (
                                                      <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border-2 border-green-200 dark:border-green-800 shadow-lg">
                                                          <div className="flex justify-between items-center mb-2 sm:mb-3 lg:mb-4">
                                <span className="text-xs sm:text-sm lg:text-base font-bold text-green-800 dark:text-green-200">
                                  💰 Latest Price
                                </span>
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 dark:text-green-400">
                                  ${card.latest_price.toFixed(2)}
                                </span>
                              </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                              <span className="bg-green-100 dark:bg-green-800 px-2 sm:px-3 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300 text-center">
                                📊 {card.price_count} entries
                              </span>
                              {card.last_price_update && (
                                <span className="bg-green-100 dark:bg-green-800 px-2 sm:px-3 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300 text-center">
                                  📅 {new Date(card.last_price_update).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/20 dark:via-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-4 sm:p-5 border-2 border-orange-200 dark:border-orange-800 shadow-lg">
                            <div className="text-center">
                              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-800 rounded-full mb-2 sm:mb-3">
                                <span className="text-orange-600 dark:text-orange-400 text-base sm:text-lg">💰</span>
                              </div>
                              <p className="text-sm sm:text-base text-orange-800 dark:text-orange-200 font-bold mb-2 sm:mb-3">
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
                                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                              >
                                🚀 Scrape Prices
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Card Details */}
                        <div className="space-y-3 sm:space-y-4">
                          {card.condition && (
                            <div className="flex justify-between items-center p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                              <span className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">Condition:</span>
                              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{card.condition}</span>
                            </div>
                          )}
                          
                          {card.source && (
                            <div className="flex justify-between items-center p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                              <span className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">Source:</span>
                              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{card.source}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Footer */}
                        <div className="pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-500 text-center font-medium">
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
    </div>
  )
}

export default App
