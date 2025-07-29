import { useState, useEffect } from 'react'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [libraryLoading, setLibraryLoading] = useState(true)
  
  // Version tracking - prominently displayed
  const APP_VERSION = '4.1.2'
  const BUILD_DATE = '29/07/2025, 14:45:00'
  const DEPLOY_TIME = '29/07/2025, 14:45:00'
  const CACHE_BUSTER = '2025-07-29-20-50-00' // Force cache refresh

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  useEffect(() => {
    fetchCards()
  }, [])

  const fetchCards = async () => {
    try {
      setLibraryLoading(true)
      console.log('=== FETCHING CARDS WITH PRICES (v4.1.2) ===')
      
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

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price)
  }

  const getPriceColor = (price) => {
    if (price >= 100) return 'from-violet-600 to-purple-600'
    if (price >= 50) return 'from-orange-500 to-red-500'
    return 'from-emerald-500 to-teal-500'
  }

  const getPriceBadgeColor = (price) => {
    if (price >= 100) return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700'
    if (price >= 50) return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700'
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/30 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900">
      {/* Clean Modern Header */}
      <div className="relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-sm">
                <span className="text-xl">🎴</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Trading Card Tracker
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  v{APP_VERSION} • Live Market Prices
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                🟢 Live
              </div>
              <div className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                🚀 v{APP_VERSION}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacious Hero Section */}
      <div className="relative py-24 sm:py-32 lg:py-40 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-16">
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent mb-8 leading-tight">
              Track Card Prices
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Discover real-time market prices for trading cards from eBay and other marketplaces
            </p>
          </div>

          {/* Clean Search Form */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-8">
              <form onSubmit={handleSearch} className="space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    Search for Cards
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., Pikachu PSA 10, Charizard PSA 9"
                    className="w-full px-4 py-4 text-lg border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white transition-colors"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-4 px-6 rounded-xl text-lg transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      <span>Scraping Prices...</span>
                    </div>
                  ) : (
                    '🚀 Search & Scrape Prices'
                  )}
                </button>
              </form>
              
              {searchStatus && (
                <div className={`mt-6 p-4 rounded-xl border ${
                  searchStatus.includes('Error') 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' 
                    : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                }`}>
                  <div className="flex items-center">
                    <span className="text-lg mr-3">
                      {searchStatus.includes('Error') ? '❌' : '✅'}
                    </span>
                    <span className="font-medium">{searchStatus}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Card Library */}
      <div className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-12">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm">
                  <span className="text-xl">📚</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Card Library
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400">
                    Your collection of tracked cards
                  </p>
                </div>
              </div>
              <button
                onClick={fetchCards}
                disabled={libraryLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                {libraryLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span>Loading...</span>
                  </div>
                ) : (
                  '🔄 Refresh'
                )}
              </button>
            </div>
            
            {libraryLoading ? (
              <div className="text-center py-24">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full shadow-sm mb-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
                <p className="text-lg text-slate-600 dark:text-slate-400">Loading your card collection...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-24">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-400 rounded-full shadow-sm mb-6">
                  <span className="text-2xl">📭</span>
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                  <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                    Found {cards.length} card{cards.length !== 1 ? 's' : ''}
                  </p>
                  <div className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    💰 Live Prices
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {cards.map((card, index) => (
                    <div 
                      key={index} 
                      className="group bg-white dark:bg-slate-700 rounded-xl shadow-sm hover:shadow-lg border border-slate-200 dark:border-slate-600 overflow-hidden transition-all duration-200 hover:-translate-y-1"
                    >
                      {/* Clean Card Header */}
                      <div className="bg-slate-50 dark:bg-slate-600 px-6 py-4 border-b border-slate-200 dark:border-slate-500">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-lg truncate mb-1">
                          {card.name || 'Unknown Card'}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                          #{card.id?.substring(0, 8)}...
                        </p>
                      </div>
                      
                      {/* Clean Card Content */}
                      <div className="p-6 space-y-4">
                        {card.latest_price && card.latest_price > 0 ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                Latest Price
                              </span>
                              <span className={`text-2xl font-bold bg-gradient-to-r ${getPriceColor(card.latest_price)} bg-clip-text text-transparent`}>
                                {formatPrice(card.latest_price)}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between gap-2">
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${getPriceBadgeColor(card.latest_price)}`}>
                                📊 {card.price_count} entries
                              </span>
                              {card.last_price_update && (
                                <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">
                                  📅 {new Date(card.last_price_update).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full mb-4">
                              <span className="text-xl">💰</span>
                            </div>
                            <p className="font-medium text-orange-700 dark:text-orange-300 mb-4">
                              No Price Data
                            </p>
                            <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                              🚀 Scrape Prices
                            </button>
                          </div>
                        )}
                        
                        {/* Clean Card Footer */}
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
                          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
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