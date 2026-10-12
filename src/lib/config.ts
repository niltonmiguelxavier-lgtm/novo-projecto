export const config = { appName: import.meta.env.VITE_APP_NAME || 'Nevon Pay', apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787/api', paymentMode: import.meta.env.VITE_PAYMENT_MODE || 'sandbox' } as const;
export const isSandbox = config.paymentMode !== 'live';
