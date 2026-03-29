export function convertToUSD(amount: number, fromCurrency: string, rates: Record<string, number>): number {
  if (fromCurrency === 'USD') return parseFloat(amount.toString());
  const rate = rates[fromCurrency];
  if (!rate) throw new Error(`Unknown currency: ${fromCurrency}`);
  return parseFloat((amount / rate).toFixed(2));
}
