import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format USD cents as a USD dollar string: $1,234.56 */
export function formatUSD(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(cents / 100)
}

/**
 * Format USD cents as a GMD (Gambian Dalasi) string using the current exchange rate.
 * The DB stores all prices in USD cents; GMD is a display layer.
 * @param usdCents  Amount in USD cents (as stored in DB)
 * @param rate      USD → GMD exchange rate (e.g. 70 means $1 = D70)
 */
export function formatGMD(usdCents: number, rate: number) {
  const gmd = (usdCents / 100) * rate
  return new Intl.NumberFormat('en-GM', {
    style: 'currency',
    currency: 'GMD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(gmd)
}

/**
 * Dual-currency label: GMD as primary, USD as secondary.
 * Returns an object so the caller can render them differently.
 */
export function dualPrice(usdCents: number, rate: number) {
  return { gmd: formatGMD(usdCents, rate), usd: formatUSD(usdCents) }
}

/** @deprecated Use formatGMD(cents, rate) — formatMoney assumed cents were already GMD */
export function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-GM', {
    style: 'currency',
    currency: 'GMD',
    minimumFractionDigits: 2
  }).format(cents / 100)
}

export function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(dateStr))
}
