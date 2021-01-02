import { getPrices } from '../price'

test('get usdt price', () => {
  return getPrices('usdt').then(result => {
    console.log(result)
    expect(result['usdt']).toBeCloseTo(1.0, 1)
  });
});


test('get prices of usdt, eth, and invalid token', () => {
  return getPrices(['usdt', 'eth', 'invalidtoken123']).then(result => {
    console.log(result)
    expect(result['usdt']).toBeCloseTo(1.0, 1)
    expect(result['eth']).not.toBeNaN()
    expect(result['invalidtoken123']).toBeNull()
  });
});
