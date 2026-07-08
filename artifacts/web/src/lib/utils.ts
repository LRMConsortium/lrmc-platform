import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-GM', {
    style: 'currency',
    currency: 'GMD',
    minimumFractionDigits: 2
  }).format(cents / 100)
}

export function formatUSD(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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
