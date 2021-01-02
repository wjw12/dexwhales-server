const { promisify } = require("util")
const redis = require("redis")
const client = redis.createClient("redis://dexwhale.nrknya.0001.use1.cache.amazonaws.com:6379")
const getAsync = promisify(client.get).bind(client)

const DELAY = 1500

test('read and write to redis', () => {
  const delay = t => new Promise(resolve => setTimeout(resolve, t))
  var obj = { number: 12, word: 'hello' }
  client.set('a', JSON.stringify(obj), redis.print)
  
  return delay(DELAY).then(() => {
      return getAsync('a')
  })
  .then(result => {
      var newObj = JSON.parse(result)
      expect(newObj.number).toBe(12)
      expect(newObj.word).toBe('hello')
  })
  
});

client.on("error", function(error) {
  console.error(error)
})
