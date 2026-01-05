/**
 * Centralized formatting utilities for consistent display across UI and reports
 */

export function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { 
    style: "currency", 
    currency: "USD", 
    maximumFractionDigits: 0 
  })
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString()
}

export function formatPercent(n: number, decimals: number = 1): string {
  return `${n.toFixed(decimals)}%`
}


