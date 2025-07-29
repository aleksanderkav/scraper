import { useState, useEffect } from 'react'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [libraryLoading, setLibraryLoading] = useState(true)
  
  // Version tracking - prominently displayed
  const APP_VERSION = '4.1.1'
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
      console.log('=== FETCHING CARDS WITH PRICES (v4.1.1) ===')
      
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
    if (price >= 100) return 'from-purple-600 to-pink-600'
    if (price >= 50) return 'from-orange-600 to-red-600'
    return 'from-emerald-600 to-teal-600'
  }

  const getPriceBadgeColor = (price) => {
    if (price >= 100) return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700'
    if (price >= 50) return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700'
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-100/50 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900">
      {/* Enhanced Modern Header */}
      <div className="relative overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-b border-white/30 dark:border-slate-700/60 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-indigo-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/25">
                <span className="text-2xl">🎴</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  Trading Card Tracker
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  v{APP_VERSION} • Live Market Prices
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/25">
                🟢 Live
              </div>
              <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 animate-pulse">
                🚀 v{APP_VERSION}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Hero Section */}
      <div className="relative py-20 sm:py-24 lg:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-12 sm:mb-16">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent mb-8 leading-tight">
              Track Card Prices
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed font-medium">
              Discover real-time market prices for trading cards from eBay and other marketplaces
            </p>
          </div>

          {/* Enhanced Search Form */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/40 dark:border-slate-700/60 p-8 sm:p-10">
              <form onSubmit={handleSearch} className="space-y-8">
                <div>
                  <label className="block text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    🔍 Search for Cards
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., Pikachu PSA 10, Charizard PSA 9"
                    className="w-full px-6 py-5 text-lg border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-700 dark:text-white transition-all duration-300 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-5 px-8 rounded-2xl text-xl shadow-xl shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 disabled:transform-none"
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
                <div className={`mt-8 p-6 rounded-2xl border-2 ${
                  searchStatus.includes('Error') 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200' 
                    : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                }`}>
                  <div className="flex items-center">
                    <span className="text-2xl mr-4">
                      {searchStatus.includes('Error') ? '❌' : '✅'}
                    </span>
                    <span className="font-semibold text-lg">{searchStatus}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Card Library */}
      <div className="px-4 sm:px-6 lg:px-8 pb-20 sm:pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/40 dark:border-slate-700/60 p-8 sm:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-600 rounded-2xl shadow-lg shadow-purple-500/25">
                  <span className="text-2xl">📚</span>
                </div>
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                    Card Library
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Your collection of tracked cards
                  </p>
                </div>
              </div>
              <button
                onClick={fetchCards}
                disabled={libraryLoading}
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 disabled:transform-none"
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
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-full shadow-lg shadow-blue-500/25 mb-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
                </div>
                <p className="text-xl text-slate-600 dark:text-slate-400 font-medium">Loading your card collection...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full shadow-lg shadow-slate-400/25 mb-6">
                  <span className="text-4xl">📭</span>
                </div>
                <h3 className="text-2xl font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  No cards found
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">
                  Start by searching for a card above to build your collection
                </p>
              </div>
            ) : (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                  <p className="text-xl font-semibold text-slate-700 dark:text-slate-300">
                    Found {cards.length} card{cards.length !== 1 ? 's' : ''}
                  </p>
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/25">
                    💰 Live Prices
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                  {cards.map((card, index) => (
                    <div 
                      key={index} 
                      className="group bg-white/90 dark:bg-slate-700/90 backdrop-blur-xl rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 hover:shadow-2xl hover:shadow-slate-300/50 dark:hover:shadow-slate-800/50 transition-all duration-300 border border-white/40 dark:border-slate-600/60 overflow-hidden transform hover:-translate-y-2"
                    >
                      {/* Enhanced Card Header */}
                      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 p-5 text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/5"></div>
                        <div className="relative">
                          <h3 className="font-bold text-lg sm:text-xl truncate mb-2 leading-tight">
                            {card.name || 'Unknown Card'}
                          </h3>
                          <p className="text-slate-300 text-sm opacity-90 font-medium">
                            #{card.id?.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                      
                      {/* Enhanced Card Content */}
                      <div className="p-5 space-y-5">
                        {card.latest_price && card.latest_price > 0 ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                Latest Price
                              </span>
                              <span className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${getPriceColor(card.latest_price)} bg-clip-text text-transparent`}>
                                ${card.latest_price.toFixed(2)}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between gap-2">
                              <span className={`px-3 py-2 rounded-xl text-xs font-semibold border ${getPriceBadgeColor(card.latest_price)}`}>
                                📊 {card.price_count} entries
                              </span>
                              {card.last_price_update && (
                                <span className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
                                  📅 {new Date(card.last_price_update).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-400 to-red-500 rounded-full mb-4 shadow-lg shadow-orange-400/25">
                              <span className="text-2xl">💰</span>
                            </div>
                            <p className="font-semibold text-orange-700 dark:text-orange-300 mb-4 text-lg">
                              No Price Data
                            </p>
                            <button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg shadow-orange-500/25">
                              🚀 Scrape Prices
                            </button>
                          </div>
                        )}
                        
                        {/* Enhanced Card Footer */}
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
                          <p className="text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
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