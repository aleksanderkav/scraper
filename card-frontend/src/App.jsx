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
      console.log('Supabase URL:', supabaseUrl)
      console.log('Supabase Anon Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...')
      
      const apiUrl = `${supabaseUrl}/rest/v1/cards?select=*`
      console.log('Full API URL:', apiUrl)
      
      const headers = {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
      console.log('Request headers:', headers)
      
      const response = await fetch(apiUrl, { headers })
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Cards API error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Raw API response:', data)
      console.log('✅ Number of cards:', data.length)
      console.log('✅ Cards array:', data)
      
      if (Array.isArray(data)) {
        setCards(data)
        console.log('✅ Cards state updated with', data.length, 'cards')
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
      
      // Method 1: Try direct SQL query via REST API
      const sqlUrl = `${supabaseUrl}/rest/v1/rpc/exec_sql`
      const sqlResponse = await fetch(sqlUrl, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'SELECT * FROM cards ORDER BY created_at DESC LIMIT 5;'
        })
      })
      
      console.log('SQL query response status:', sqlResponse.status)
      
      if (sqlResponse.ok) {
        const sqlData = await sqlResponse.json()
        console.log('✅ Direct SQL query result:', sqlData)
      } else {
        const errorText = await sqlResponse.text()
        console.log('❌ SQL query failed:', errorText)
        
        // Method 2: Try alternative approach - check table structure
        console.log('Trying alternative approach...')
        const tableInfoUrl = `${supabaseUrl}/rest/v1/cards?select=*&limit=1`
        const tableResponse = await fetch(tableInfoUrl, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json'
          }
        })
        
        console.log('Table info response status:', tableResponse.status)
        if (tableResponse.ok) {
          const tableData = await tableResponse.json()
          console.log('✅ Table structure check:', tableData)
        } else {
          const tableError = await tableResponse.text()
          console.log('❌ Table structure check failed:', tableError)
        }
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Search for Cards
            </h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Card Name
                </label>
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., Pikachu PSA 10"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition duration-200"
              >
                {loading ? 'Searching...' : 'Search Card'}
              </button>
            </form>
            
            {/* Status Message */}
            {searchStatus && (
              <div className={`mt-4 p-3 rounded-md ${
                searchStatus.includes('Error') 
                  ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' 
                  : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              }`}>
                {searchStatus}
              </div>
            )}
          </div>
        </div>

        {/* Card Library */}
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Card Library
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={fetchCards}
                  disabled={libraryLoading}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm rounded-md transition duration-200"
                >
                  {libraryLoading ? 'Loading...' : 'Refresh'}
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
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-md transition duration-200"
                >
                  Debug
                </button>
                <button
                  onClick={checkDatabaseDirectly}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition duration-200"
                >
                  Check DB
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
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {card.name || 'Unknown Card'}
                    </h3>
                    {card.price && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Price: {card.price}
                      </p>
                    )}
                    {card.condition && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Condition: {card.condition}
                      </p>
                    )}
                    {card.source && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Source: {card.source}
                      </p>
                    )}
                    {card.created_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Added: {new Date(card.created_at).toLocaleDateString()}
                      </p>
                    )}
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
