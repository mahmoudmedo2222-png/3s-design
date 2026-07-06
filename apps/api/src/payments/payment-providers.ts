export const paymentProviders = ['manual', 'paypal', 'paymob', 'fawry'] as const;

export type PaymentProvider = (typeof paymentProviders)[number];

export function isPaymentProvider(value: string): value is PaymentProvider {
  return paymentProviders.includes(value as PaymentProvider);
}
