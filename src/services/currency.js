/**
 * Currency Service
 * DolarAPI — Free, no auth required
 * Provides all Argentine dollar rates (Blue, MEP, CCL, Oficial, etc.)
 */

const DOLAR_API_BASE = 'https://dolarapi.com/v1'

// Cache for exchange rates
let rateCache = {
  data: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000 // 5 minutes
}

/**
 * Get all dollar rates from DolarAPI
 */
export async function getAllDollarRates() {
  const now = Date.now()

  if (rateCache.data && (now - rateCache.timestamp) < rateCache.ttl) {
    return rateCache.data
  }

  try {
    const response = await fetch(`${DOLAR_API_BASE}/dolares`)
    if (!response.ok) throw new Error(`DolarAPI error: ${response.status}`)

    const data = await response.json()

    // Normalize the data
    const rates = {}
    data.forEach(rate => {
      rates[rate.casa] = {
        name: rate.nombre,
        buy: rate.compra,
        sell: rate.venta,
        updatedAt: rate.fechaActualizacion
      }
    })

    rateCache = { data: rates, timestamp: now, ttl: rateCache.ttl }
    return rates
  } catch (err) {
    console.error('Failed to fetch dollar rates:', err)
    // Return cached data if available, even if stale
    if (rateCache.data) return rateCache.data
    throw err
  }
}

/**
 * Get specific dollar rate
 * @param {string} type - blue, bolsa (MEP), contadoconliqui (CCL), oficial, mayorista, tarjeta, cripto
 */
export async function getDollarRate(type = 'blue') {
  const rates = await getAllDollarRates()
  return rates[type] || null
}

/**
 * Convert USD to ARS
 * @param {number} usdAmount
 * @param {string} dollarType - blue, bolsa, contadoconliqui, oficial
 * @param {string} operation - 'buy' or 'sell' (default: 'sell' for converting from USD)
 */
export async function convertUsdToArs(usdAmount, dollarType = 'blue', operation = 'venta') {
  const rate = await getDollarRate(dollarType)
  if (!rate) return null

  const exchangeRate = operation === 'buy' ? rate.buy : rate.sell
  return {
    arsAmount: usdAmount * exchangeRate,
    rate: exchangeRate,
    type: dollarType,
    typeName: rate.name,
    updatedAt: rate.updatedAt
  }
}

/**
 * Convert ARS to USD
 */
export async function convertArsToUsd(arsAmount, dollarType = 'blue', operation = 'compra') {
  const rate = await getDollarRate(dollarType)
  if (!rate) return null

  const exchangeRate = operation === 'buy' ? rate.buy : rate.sell
  return {
    usdAmount: arsAmount / exchangeRate,
    rate: exchangeRate,
    type: dollarType,
    typeName: rate.name,
    updatedAt: rate.updatedAt
  }
}

/**
 * Dollar type display names (Spanish)
 */
export const DOLLAR_TYPES = {
  blue: { label: 'Dólar Blue', description: 'Mercado informal' },
  bolsa: { label: 'Dólar MEP', description: 'Bolsa / MEP' },
  contadoconliqui: { label: 'Dólar CCL', description: 'Contado con liquidación' },
  oficial: { label: 'Dólar Oficial', description: 'Banco Nación' },
  tarjeta: { label: 'Dólar Tarjeta', description: 'Compras con tarjeta' },
  cripto: { label: 'Dólar Cripto', description: 'Exchanges crypto' },
  mayorista: { label: 'Dólar Mayorista', description: 'Mercado mayorista' }
}
