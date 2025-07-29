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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-100 to-indigo-200 dark:from-purple-900 dark:via-pink-800 dark:to-indigo-700">
      {/* BRIGHT RED DEPLOYMENT BANNER */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-2 font-bold text-lg animate-pulse">
        🚨 DEPLOYMENT v4.1.0 SUCCESSFUL - ENHANCED FEATURES ACTIVE 🚨
      </div>
      
      {/* VERSION HEADER */}
      <div className="fixed top-12 left-0 right-0 z-40 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <span className="text-xl font-bold">🎴 Trading Card Tracker</span>
            <span className="bg-white/30 px-3 py-2 rounded-full font-bold animate-pulse">
              🚀 v{APP_VERSION} 🚀
            </span>
          </div>
        </div>
      </div>
    
      <div className="pt-36 pb-8">
        <div className="max-w-7xl mx-auto px-4 space-y-8">
          {/* Main Header */}
          <div className="text-center">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              Trading Card Price Tracker v4.1.0
            </h1>
            <p className="text-xl text-slate-600 mb-6">
              Track and analyze trading card prices from eBay and other marketplaces
            </p>
          </div>

          {/* Search Form */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/90 rounded-3xl shadow-2xl p-8">
              <h2 className="text-3xl font-bold text-center mb-6">🔍 Search for Cards</h2>
              <form onSubmit={handleSearch} className="space-y-6">
                <div>
                  <label className="block font-bold mb-3">Card Name & Condition</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., Pikachu PSA 10, Charizard PSA 9"
                    className="w-full px-6 py-4 text-lg border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl text-xl shadow-xl"
                >
                  {loading ? 'Scraping Prices...' : '🚀 Search & Scrape Prices'}
                </button>
              </form>
              
              {searchStatus && (
                <div className={`mt-6 p-4 rounded-2xl border-2 ${
                  searchStatus.includes('Error') ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
                }`}>
                  <span className="font-bold">{searchStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card Library */}
          <div className="bg-white/90 rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">📚 Card Library</h2>
              <button
                onClick={fetchCards}
                disabled={libraryLoading}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold"
              >
                {libraryLoading ? 'Loading...' : '🔄 Refresh'}
              </button>
            </div>
            
            {libraryLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2">Loading cards...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-8">
                <p>No cards found. Start by searching for a card above.</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-bold mb-6">Found {cards.length} card(s)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {cards.map((card, index) => (
                    <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
                        <h3 className="font-bold text-lg truncate">{card.name || 'Unknown Card'}</h3>
                        <p className="text-blue-100 text-sm">#{card.id?.substring(0, 8)}...</p>
                      </div>
                      <div className="p-4">
                        {card.latest_price && card.latest_price > 0 ? (
                          <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-bold text-green-800">💰 Latest Price</span>
                              <span className="text-2xl font-bold text-green-600">
                                ${card.latest_price.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="bg-green-100 px-3 py-1 rounded-full text-green-700">
                                📊 {card.price_count} entries
                              </span>
                              {card.last_price_update && (
                                <span className="bg-green-100 px-3 py-1 rounded-full text-green-700">
                                  📅 {new Date(card.last_price_update).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200 text-center">
                            <p className="font-bold text-orange-800 mb-3">No Price Data Available</p>
                            <button className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold">
                              🚀 Scrape Prices
                            </button>
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <p className="text-sm text-slate-500 text-center">
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