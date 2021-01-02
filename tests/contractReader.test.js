import { routerDecoder, factoryDecoder, readPairBasic, readTokenBasic } from '../contractReader.js'

test('readPairBasic', () => {
  return readPairBasic('0x97C4adc5d28A86f9470C70DD91Dc6CC2f20d2d4D').then(info => {
    expect(info.token0.toLowerCase()).toBe('0x853d955acef822db058eb8505911ed77f175b99e');
    expect(info.token1.toLowerCase()).toBe('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
  });
});


test('readTokenBasic', () => {
  return readTokenBasic('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48').then(info => {
    expect(info.decimals).toBe(6);
    expect(info.symbol).toBe('USDC');
  });
});