const defaultApiBaseUrl =
  'https://novo-projecto.niltonmiguelxavier.workers.dev/api/v1';

export const config = {
  appName: import.meta.env.VITE_APP_NAME || 'Nevon Pay',

  apiBaseUrl: (
    import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl
  ).replace(/\/$/, ''),

  paymentMode: import.meta.env.VITE_PAYMENT_MODE || 'sandbox',
} as const;

export const isSandbox = config.paymentMode !== 'live';
