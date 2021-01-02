import FileCache from '../common/fileCache'

test('set and get cache', () => {
    var cache = new FileCache('cache_name')
    cache.set('key1', 1)
    cache['key2'] = '2'
    expect(cache.get('key1')).toBe(1)
    expect(cache['key2']).toBe('2')
});


test('cache expire time', () => {
  const delay = t => new Promise(resolve => setTimeout(resolve, t))
  var cache = new FileCache('cache_name', 1)
  cache.set('a', 1)
  expect(cache.get('a')).toBe(1)
  return delay(1500).then(_ => {
      expect(cache.get('a')).toBeNull()
  })
});

test('dump and load from file', () => {
    var cache = new FileCache('cache_name')
    cache.set('a', 1)
    cache.set('b', 'hello')
    cache.dumpToFile(() => {
        var loadedCache = new FileCache('cache_name')
        loadedCache.loadFromFile(() => {
            expect(loadedCache.get('a')).toBe(1)
            expect(loadedCache.get('b')).toBe('hello')
        })
    })
})