// PayHero configuration
export const PAYHERO_CONFIG = {
  BASE_URL: import.meta.env.VITE_PAYHERO_BASE_URL || 'https://backend.payhero.co.ke',
  ACCOUNT_ID: import.meta.env.VITE_PAYHERO_ACCOUNT_ID || '1615',
  CHANNEL_ID: import.meta.env.VITE_PAYHERO_CHANNEL_ID || '2060',
  AUTH_TOKEN: import.meta.env.VITE_PAYHERO_AUTH_TOKEN || 'Basic aTRCRDhKZmFZY0xZVUdHbjdEdlM6Z2pyaGlCbUxUMmIwSm8wOHk5WFlzbzhpYjNORnZEaDRLUmtjaFhDNA==',
  CALLBACK_URL: import.meta.env.VITE_PAYHERO_CALLBACK_URL || 'https://backend.payhero.co.ke/api/v2/transaction-status',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || ''  // Empty string for relative paths
};

// PayHero API endpoints - exact endpoints as per documentation
export const PAYHERO_ENDPOINTS = {
  INITIATE_PAYMENT: '/api/v2/payments',  // https://backend.payhero.co.ke/api/v2/payments
  CHECK_STATUS: '/api/v2/transaction-status',  // https://backend.payhero.co.ke/api/v2/transaction-status
  WEBHOOK: '/api/v2/payments/webhook'
};

// Payment providers supported by PayHero
export const PAYMENT_PROVIDERS = {
  MPESA: 'm-pesa',
  AIRTEL: 'airtel-money',
  TKASH: 't-kash'
} as const;

// Currency codes
export const CURRENCIES = {
  KES: 'KES',
  USD: 'USD'
} as const;

export type PaymentProvider = typeof PAYMENT_PROVIDERS[keyof typeof PAYMENT_PROVIDERS];
export type Currency = typeof CURRENCIES[keyof typeof CURRENCIES];
