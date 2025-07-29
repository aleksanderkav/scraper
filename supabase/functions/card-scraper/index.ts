import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ScraperResponse {
  query: string
  prices: number[]
  average: number
  timestamp: string
}

interface RequestBody {
  query: string
}

interface DatabaseResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    cardInserted: boolean
    priceEntriesInserted: number
    cardPriceUpdated: boolean
  }
  error?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: 'Method not allowed. Only POST requests are supported.' 
      } as DatabaseResponse),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Parse request body
    const body: RequestBody = await req.json()
    
    if (!body.query || typeof body.query !== 'string') {
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          message: 'Invalid request body. "query" field is required and must be a string.' 
        } as DatabaseResponse),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client using built-in context
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://jvkxyjycpomtzfngocge.supabase.co'
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseServiceKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call external scraper API
    const encodedQuery = encodeURIComponent(body.query)
    const scraperUrl = `https://scraper-production-22f6.up.railway.app/scrape?query=${encodedQuery}`
    
    const scraperResponse = await fetch(scraperUrl)
    
    if (!scraperResponse.ok) {
      throw new Error(`Scraper API error: ${scraperResponse.status} ${scraperResponse.statusText}`)
    }

    const scraperData: ScraperResponse = await scraperResponse.json()
    
    if (!scraperData.prices || !Array.isArray(scraperData.prices) || scraperData.prices.length === 0) {
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          message: 'No prices found in scraper response' 
        } as DatabaseResponse),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if card exists, insert if not
    let cardId: string
    let cardInserted = false
    
    const { data: existingCard, error: cardCheckError } = await supabase
      .from('cards')
      .select('id')
      .eq('name', body.query)
      .single()

    if (cardCheckError && cardCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Error checking card existence: ${cardCheckError.message}`)
    }

    if (existingCard) {
      cardId = existingCard.id
    } else {
      // Insert new card
      const { data: newCard, error: cardInsertError } = await supabase
        .from('cards')
        .insert({ name: body.query })
        .select('id')
        .single()

      if (cardInsertError) {
        throw new Error(`Error inserting card: ${cardInsertError.message}`)
      }

      cardId = newCard.id
      cardInserted = true
    }

    // Insert price entries
    const priceEntries = scraperData.prices.map(price => ({
      card_id: cardId,
      price: price,
      timestamp: scraperData.timestamp
    }))

    const { error: priceInsertError } = await supabase
      .from('price_entries')
      .insert(priceEntries)

    if (priceInsertError) {
      throw new Error(`Error inserting price entries: ${priceInsertError.message}`)
    }

    // Check if card_prices record exists
    const { data: existingCardPrice, error: cardPriceCheckError } = await supabase
      .from('card_prices')
      .select('id')
      .eq('card_id', cardId)
      .single()

    let cardPriceUpdated = false

    if (cardPriceCheckError && cardPriceCheckError.code !== 'PGRST116') {
      throw new Error(`Error checking card price existence: ${cardPriceCheckError.message}`)
    }

    if (existingCardPrice) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('card_prices')
        .update({
          average_price: scraperData.average,
          last_seen: scraperData.timestamp
        })
        .eq('card_id', cardId)

      if (updateError) {
        throw new Error(`Error updating card price: ${updateError.message}`)
      }
      cardPriceUpdated = true
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('card_prices')
        .insert({
          card_id: cardId,
          average_price: scraperData.average,
          last_seen: scraperData.timestamp
        })

      if (insertError) {
        throw new Error(`Error inserting card price: ${insertError.message}`)
      }
      cardPriceUpdated = true
    }

    // Return success response
    const response: DatabaseResponse = {
      status: 'success',
      message: 'Data processed successfully',
      data: {
        cardInserted,
        priceEntriesInserted: scraperData.prices.length,
        cardPriceUpdated
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    
    const errorResponse: DatabaseResponse = {
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
}) 