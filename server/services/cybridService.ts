// Mock Cybrid API service
export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  spread?: number;
}

const exchangeRates: { [key: string]: ExchangeRate } = {
  'USD_USDC': {
    from: 'USD',
    to: 'USDC',
    rate: 1.0,
    timestamp: new Date(),
    spread: 0.001
  },
  'USDC_USD': {
    from: 'USDC',
    to: 'USD',
    rate: 0.999,
    timestamp: new Date(),
    spread: 0.001
  }
};

export const getExchangeRate = async (from: string, to: string): Promise<ExchangeRate | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  const key = `${from}_${to}`;
  const rate = exchangeRates[key];

  if (rate) {
    // Add small random variation to simulate market fluctuation
    const variation = (Math.random() - 0.5) * 0.002; // ±0.1%
    return {
      ...rate,
      rate: rate.rate + variation,
      timestamp: new Date()
    };
  }

  return null;
};

export const getSupportedCurrencies = () => {
  return ['USD', 'USDC'];
};

export const calculateConversion = async (amount: number, from: string, to: string) => {
  const rateData = await getExchangeRate(from, to);
  if (!rateData) {
    throw new Error(`Exchange rate not available for ${from} to ${to}`);
  }

  const convertedAmount = amount * rateData.rate;
  const fee = amount * 0.005; // 0.5% fee

  return {
    originalAmount: amount,
    convertedAmount,
    exchangeRate: rateData.rate,
    fee,
    totalAmount: convertedAmount - fee,
    timestamp: rateData.timestamp
  };
};