// file: twitter.js
var twit = Npm.require("twit");
var options;
var init = function(options, config) {
  return new twit(_.extend(options, config));
};

twitApi = {
  get: function(options) {
    return new twit(options);
  },
  config: function (_options) {
    options = _options;
  },
  initForBot: function (botTokens) {
    return _.partial(init, options)(botTokens);
  }
};

if (Meteor.isServer) {
  Meteor.startup(function() {
    var Future = Npm.require('fibers/future');
    Meteor.methods({
      searchTwitterUser: function (username, currentBotId) {
        var fut = new Future();
        var bot = TwitterBots.findOne({_id: currentBotId});
        var config = {
          access_token:         bot.accessToken,
          access_token_secret:  bot.accessTokenSecret
        };
        var twitterClient = twitApi.initForBot(config);
        twitterClient.get('users/search', {q: username}, function (error, reply) {
          fut['return'](reply);
        });
        return fut.wait();
      },
      resolveTwitterUid: function (username, currentBotId) {
        var fut = new Future();
        var bot = TwitterBots.findOne({_id: currentBotId});
        var config = {
          access_token:         bot.accessToken,
          access_token_secret:  bot.accessTokenSecret
        };
        var twitterClient = twitApi.initForBot(config);
        twitterClient.get('users/show', {screen_name: username}, function (error, reply) {
          fut['return'](reply);
        });
        return fut.wait();
      }
    });
  });
}
