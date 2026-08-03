/**
 * Helper utility to fetch live USD to TRY exchange rate from open forex API
 */
export const fetchLiveUsdRate = async (): Promise<number | null> => {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.rates && typeof data.rates.TRY === 'number') {
      return Number(data.rates.TRY.toFixed(2));
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch live exchange rate:', err);
    return null;
  }
};
