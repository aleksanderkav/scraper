import { useState, useEffect } from 'react'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [libraryLoading, setLibraryLoading] = useState(true)
  
  // Version tracking - prominently displayed
  const APP_VERSION = '4.1.0'
  const BUILD_DATE = '29/07/2025, 14:45:00'
  const DEPLOY_TIME = '29/07/2025, 14:45:00'
  const CACHE_BUSTER = '2025-07-29-14-50-00' // Force cache refresh

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  useEffect(() => {
    fetchCards()
  }, [])

  const fetchCards = async () => {
    try {
      setLibraryLoading(true)
      console.log('=== FETCHING CARDS WITH PRICES (v4.1.0) ===')
      
      const apiUrl = `${supabaseUrl}/rest/v1/cards_with_prices?select=*&order=created_at.desc`
      const headers = {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
      
      const response = await fetch(apiUrl, { headers })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const cardsWithPrices = await response.json()
      if (Array.isArray(cardsWithPrices)) {
        setCards(cardsWithPrices)
        console.log('✅ Cards updated successfully')
      } else {
        setCards([])
      }
    } catch (error) {
      console.error('❌ Error fetching cards:', error)
      setSearchStatus('Error loading card library')
    } finally {
      setLibraryLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    try {
      setLoading(true)
      setSearchStatus('Scraping prices...')

      const scraperUrl = `https://scraper-production-22f6.up.railway.app/scrape?query=${encodeURIComponent(searchQuery)}`
      const response = await fetch(scraperUrl)
      const result = await response.json()

      if (result.status === 'success') {
        setSearchStatus('✅ Card scraped successfully! Refreshing library...')
        setSearchQuery('')
        setTimeout(() => {
          fetchCards()
          setSearchStatus('')
        }, 2000)
      } else {
        setSearchStatus('❌ Failed to scrape card. Please try again.')
      }
    } catch (error) {
      console.error('Error scraping card:', error)
      setSearchStatus('❌ Error scraping card. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getPriceColor = (price) => {
    if (price >= 100) return 'from-purple-500 to-pink-500'
    if (price >= 50) return 'from-orange-500 to-red-500'
    return 'from-green-500 to-emerald-500'
  }

  const getPriceBadgeColor = (price) => {
    if (price >= 100) return 'bg-purple-100 text-purple-800 border-purple-200'
    if (price >= 50) return 'bg-orange-100 text-orange-800 border-orange-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Modern Header */}
      <div className="relative overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-white/20 dark:border-slate-700/50 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <span className="text-2xl">🎴</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Trading Card Tracker
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  v{APP_VERSION} • Live Prices
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                🟢 Live
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg animate-pulse">
                🚀 v{APP_VERSION}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h2 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent mb-6">
              Track Card Prices
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Discover real-time market prices for trading cards from eBay and other marketplaces
            </p>
          </div>

          {/* Search Form */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8">
              <form onSubmit={handleSearch} className="space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    🔍 Search for Cards
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., Pikachu PSA 10, Charizard PSA 9"
                    className="w-full px-6 py-4 text-lg border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-700 dark:text-white transition-all duration-300 shadow-lg"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-4 px-8 rounded-2xl text-xl shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none"
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
              
              {searchStatus && (
                <div className={`mt-6 p-4 rounded-2xl border-2 ${
                  searchStatus.includes('Error') 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200' 
                    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                }`}>
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">
                      {searchStatus.includes('Error') ? '❌' : '✅'}
                    </span>
                    <span className="font-semibold">{searchStatus}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Library */}
      <div className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                  <span className="text-2xl">📚</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Card Library
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Your collection of tracked cards
                  </p>
                </div>
              </div>
              <button
                onClick={fetchCards}
                disabled={libraryLoading}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 disabled:transform-none"
              >
                {libraryLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    <span>Loading...</span>
                  </div>
                ) : (
                  '🔄 Refresh'
                )}
              </button>
            </div>
            
            {libraryLoading ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
                <p className="text-lg text-slate-600 dark:text-slate-400">Loading your card collection...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full shadow-lg mb-4">
                  <span className="text-3xl">📭</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  No cards found
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Start by searching for a card above to build your collection
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                    Found {cards.length} card{cards.length !== 1 ? 's' : ''}
                  </p>
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    💰 Live Prices
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {cards.map((card, index) => (
                    <div 
                      key={index} 
                      className="group bg-white/80 dark:bg-slate-700/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 dark:border-slate-600/50 overflow-hidden transform hover:-translate-y-2"
                    >
                      {/* Card Header */}
                      <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                        <div className="relative">
                          <h3 className="font-bold text-lg truncate mb-1">
                            {card.name || 'Unknown Card'}
                          </h3>
                          <p className="text-slate-300 text-sm opacity-90">
                            #{card.id?.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                      
                      {/* Card Content */}
                      <div className="p-4 space-y-4">
                        {card.latest_price && card.latest_price > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                Latest Price
                              </span>
                              <span className={`text-2xl font-bold bg-gradient-to-r ${getPriceColor(card.latest_price)} bg-clip-text text-transparent`}>
                                ${card.latest_price.toFixed(2)}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriceBadgeColor(card.latest_price)}`}>
                                📊 {card.price_count} entries
                              </span>
                              {card.last_price_update && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                  📅 {new Date(card.last_price_update).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-full mb-3 shadow-lg">
                              <span className="text-xl">💰</span>
                            </div>
                            <p className="font-semibold text-orange-700 dark:text-orange-300 mb-3">
                              No Price Data
                            </p>
                            <button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg">
                              🚀 Scrape Prices
                            </button>
                          </div>
                        )}
                        
                        {/* Card Footer */}
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-600">
                          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                            Added: {new Date(card.created_at).toLocaleDateString()}
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