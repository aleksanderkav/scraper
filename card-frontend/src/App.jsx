import { useState, useEffect } from 'react'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [deployTime] = useState(() => new Date().toLocaleString())
  
  // Version tracking
  const APP_VERSION = '2.4.0'
  const BUILD_DATE = new Date().toLocaleString()

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
        // Enhanced debugging for price display
        if (cardsWithPrices.length > 0) {
          console.log('=== DETAILED CARD ANALYSIS ===')
          cardsWithPrices.slice(0, 3).forEach((card, index) => {
            console.log(`Card ${index + 1}:`, {
              name: card.name,
              latest_price: card.latest_price,
              price_count: card.price_count,
              last_price_update: card.last_price_update,
              hasPrice: card.latest_price && card.latest_price > 0,
              priceType: typeof card.latest_price,
              priceValue: card.latest_price
            })
          })
          console.log('=== END DETAILED ANALYSIS ===')
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
      console.log('=== COMPREHENSIVE VIEW TEST ===')
      
      const response = await fetch(`${supabaseUrl}/rest/v1/cards_with_prices?select=*&limit=5`, {
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
        
        console.log(`📊 Summary:`, {
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
      console.error('❌ View test error:', error)
    } finally {
      console.log('=== END COMPREHENSIVE TEST ===')
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 space-y-8 sm:space-y-12">
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
          
          {/* Version Info */}
          <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-blue-200 dark:border-blue-700 shadow-lg mx-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 lg:gap-6 text-sm sm:text-base text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="font-bold text-blue-700 dark:text-blue-300 text-base sm:text-lg">v{APP_VERSION}</span>
                <span className="text-slate-400 text-base sm:text-lg">•</span>
                <span className="font-medium">Built: {BUILD_DATE}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-slate-400 text-base sm:text-lg">•</span>
                <span className="font-medium">Deployed: {deployTime}</span>
              </div>
            </div>
            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-blue-200 dark:border-blue-700">
              <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium text-center sm:text-left">
                🔧 Using cards_with_prices view • 💰 Price display active • 🚀 Scrape integration ready • 📱 Mobile optimized
              </p>
            </div>
          </div>
        </div>

        {/* Search Form */}
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 xl:p-12 border border-white/30 dark:border-slate-700/60">
            <div className="text-center mb-8 sm:mb-10">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-2xl mb-4 sm:mb-6 shadow-lg">
                <span className="text-xl sm:text-2xl">🔍</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">
                Search for Cards
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 font-medium">
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
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 xl:p-12 border border-white/30 dark:border-slate-700/60">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 sm:mb-10 gap-6 sm:gap-8">
            <div>
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-600 rounded-2xl mr-3 sm:mr-4 shadow-lg">
                  <span className="text-lg sm:text-xl">📚</span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white">
                  Card Library
                </h2>
              </div>
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 font-medium">
                Your collection of scraped trading cards with current market prices
              </p>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <button
                onClick={fetchCards}
                disabled={libraryLoading}
                className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-indigo-700 hover:to-indigo-800 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-2xl py-3 sm:py-4 px-6 sm:px-8 text-sm sm:text-base font-bold transition-all duration-300 transform hover:scale-105 disabled:transform-none flex items-center shadow-xl"
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
                className="bg-gradient-to-r from-yellow-500 via-yellow-600 to-orange-600 hover:from-yellow-600 hover:via-orange-600 hover:to-orange-700 text-white rounded-2xl py-3 sm:py-4 px-6 sm:px-8 text-sm sm:text-base font-bold transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                🐛 Debug Prices
              </button>
              <button
                onClick={checkDatabaseDirectly}
                className="bg-gradient-to-r from-red-500 via-red-600 to-pink-600 hover:from-red-600 hover:via-pink-600 hover:to-pink-700 text-white rounded-2xl py-3 sm:py-4 px-6 sm:px-8 text-sm sm:text-base font-bold transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                🔍 Check DB
              </button>
              <button
                onClick={async () => {
                  console.log('=== COMPREHENSIVE VIEW TEST ===')
                  try {
                    const response = await fetch(`${supabaseUrl}/rest/v1/cards_with_prices?select=*&limit=5`, {
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
                      
                      console.log(`📊 Summary:`, {
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
                    console.error('❌ View test error:', error)
                  }
                  console.log('=== END COMPREHENSIVE TEST ===')
                }}
                className="bg-gradient-to-r from-purple-500 via-purple-600 to-pink-600 hover:from-purple-600 hover:via-pink-600 hover:to-pink-700 text-white rounded-2xl py-3 sm:py-4 px-6 sm:px-8 text-sm sm:text-base font-bold transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                🔍 Test View & Prices
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
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-6 sm:mb-8 font-bold">Found {cards.length} card(s)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                  {cards.map((card, index) => (
                    <div key={index} className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/40 dark:border-slate-700/60 overflow-hidden group transform hover:-translate-y-2">
                      {/* Card Header */}
                      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 p-4 sm:p-6 text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                        <div className="relative">
                          <h3 className="font-bold text-lg sm:text-xl truncate mb-1 sm:mb-2">
                            {card.name || 'Unknown Card'}
                          </h3>
                          <p className="text-blue-100 text-xs sm:text-sm opacity-90 font-medium">
                            #{card.id?.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                      
                      {/* Card Content */}
                      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                        {/* Price Information */}
                        {card.latest_price && card.latest_price > 0 ? (
                          <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-4 sm:p-5 border-2 border-green-200 dark:border-green-800 shadow-lg">
                            <div className="flex justify-between items-center mb-3 sm:mb-4">
                              <span className="text-sm sm:text-base font-bold text-green-800 dark:text-green-200">
                                💰 Latest Price
                              </span>
                              <span className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
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
        {/* Footer with deployment time */}
        <footer className="fixed bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <span className="text-xs text-slate-400 bg-white/80 dark:bg-slate-900/80 px-2 sm:px-3 py-1 rounded shadow-sm">
            Last deployed: {deployTime}
          </span>
        </footer>
      </div>
    </div>
  )
}

export default App
