const config = {
  consumer_key: process.env.TWITTER_API_KEY, 
  consumer_secret: process.env.TWITTER_API_KEY_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
}

// Using the Twit node package
// https://github.com/ttezel/twit
const Twit = require('twit');

// Making a Twit object for connection to the API
var T = new Twit(config);

test('test tweet', () => {
  // This is a random number bot
  var tweet = 'Here\'s a random number between 0 and 100: ' + Math.floor(Math.random()*100);

  // Post that tweet!
  T.post('statuses/update', { status: tweet }, tweeted);

  // Callback for when the tweet is sent
  function tweeted(err, data, response) {
    if (err) {
      console.log(err);
      expect(false).toBe(true)
    } else {
      console.log('Success: ' + data.text);
      expect(true).toBe(true)
      //console.log(response);
    }
  };
  
});