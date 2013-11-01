if (Meteor.isServer) {
  Tinytest.add('TwitterBot getAuth', function (test) {
    Factory.define('twitter-bot', TwitterBot).sequence('_id');
    var bot = Factory.build('twitter-bot', {accessToken: "1", accessTokenSecret: "2"});
    var auth = bot.getAuth();
    test.equal(auth.access_token, "1");
    test.equal(auth.access_token_secret, "2");
  });
}
