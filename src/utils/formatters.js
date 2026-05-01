/**
 * Number and currency formatters
 */

const currencyFormatters = {
  USD: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }),
  ARS: new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

export function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined || isNaN(amount)) return '—'
  return currencyFormatters[currency]?.format(amount) || `$${amount.toFixed(2)}`
}

export function formatPrice(price, currency = 'USD') {
  if (price === null || price === undefined || isNaN(price)) return '—'
  if (currency === 'ARS') {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: price > 1000 ? 0 : 2,
      maximumFractionDigits: price > 1000 ? 0 : 2
    }).format(price)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 6 : 2
  }).format(price)
}

export function formatPercent(value) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatPnL(value, currency = 'USD') {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${formatCurrency(Math.abs(value), currency)}`
}

export function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return '—'
  if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
  return num.toFixed(decimals)
}

export function formatDate(date) {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export function formatTime(date) {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function timeAgo(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diff = now - d

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes}min`
  if (hours < 24) return `hace ${hours}h`
  if (days < 7) return `hace ${days}d`
  return formatDate(d)
}
