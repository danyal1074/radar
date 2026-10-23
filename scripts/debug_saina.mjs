import { BaravardPriceEstimationProvider } from '../lib/estimation/baravard.ts';
import { BenchmarkPriceEstimationProvider } from '../lib/estimation/benchmark.ts';
import { getDailyCarPrices } from '../lib/daily-prices/service.ts';
import { lookupDailyPrice } from '../lib/daily-prices/lookup.ts';
import { fetchLiveDivarClusterEstimate } from '../lib/daily-prices/divar-market.ts';

async function test() {
  const input = {
    make: 'ساینا',
    model: 'ساینا S اتومات مدل 1402',
    year: 1402,
    title: 'ساینا S اتومات مدل 1402',
    mileage_km: 10000,
  };

  console.log('Testing input:', input);

  console.log('\n--- 1. Testing fetchLiveDivarClusterEstimate ---');
  try {
    const divar = await fetchLiveDivarClusterEstimate(input);
    console.log('Divar result:', divar);
  } catch (e) {
    console.log('Divar error:', e.message);
  }

  console.log('\n--- 2. Testing lookupDailyPrice ---');
  const daily = await getDailyCarPrices();
  const benchmarkPrice = lookupDailyPrice(
    daily,
    input.make,
    input.model,
    input.year,
    input.title
  );
  console.log('lookupDailyPrice result:', benchmarkPrice);

  console.log('\n--- 3. Testing BenchmarkPriceEstimationProvider ---');
  const benchProvider = new BenchmarkPriceEstimationProvider();
  const benchRes = await benchProvider.estimate(input);
  console.log('benchRes:', benchRes);

  console.log('\n--- 4. Testing BaravardPriceEstimationProvider ---');
  const baravardProvider = new BaravardPriceEstimationProvider();
  const baravardRes = await baravardProvider.estimate(input);
  console.log('baravardRes:', baravardRes);
}

test();
