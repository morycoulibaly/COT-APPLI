// Pour lister les devises 
export const SUPPORTED_CURRENCIES = ['CFA'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export const DEFAULT_CURRENCY: SupportedCurrency = 'CFA';