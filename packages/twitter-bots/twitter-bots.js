TwitterBot = function (doc) {
  _.extend(this, doc);
};
_.extend(TwitterBot.prototype, {
  owner: function () {
    return Meteor.users.findOne({_id: this.ownerId});
  },

  rules: function () {
    return [];
  },

  schedules: function () {
    return [];
  }
});


// Turn twitter bot array into twitter bot objects
TwitterBots = new Meteor.Collection('twitter-bots', {
  transform: function (doc) {
    return new TwitterBot(doc);
  }
});

TwitterBots.register = function() {
  // request twitter credentials
  Twitter.requestCredential(function (twitterKey) {
    // On callback talk to server with credentials and setup bot
    Meteor.call('registerBot', twitterKey, function (error, result) {
      if (!error) {
        Session.set('currentBotId', result);
      }
    });
  });
  // return TwitterBots.insert({name: botName, ownerId: userId});
};

TwitterBots.allow({
  insert: function (userId, doc) {
    if (!doc.name || TwitterBots.findOne({}, {name: doc.name})) return false;
    return (userId && doc.ownerId === userId);
  },
  update: function (userId, doc, fields, modifier) {
    // can only change your own documents
    return doc.ownerId === userId;
  },
  remove: function (userId, doc) {
    // can only remove your own documents
    return doc.ownerId === userId;
  }
});

if (Meteor.isClient) {
  Meteor.subscribe('twitter-bots');
}
if (Meteor.isServer) {
  Meteor.publish("twitter-bots", function () {
    return TwitterBots.find({ownerId: this.userId}, {fields: {accessToken: 0, accessTokenSecret: 0}});
  });


  // code to run on server at startup
  Meteor.startup(function () {
    // Allow twitter profile images
    BrowserPolicy.content.allowImageOrigin("http://*.twimg.com");

    Meteor.methods({
      registerBot: function(twitterKey) {
        var twitterResult = Twitter.retrieveCredential(twitterKey);
        var bot = TwitterBots.findOne({id: twitterResult.serviceData.id});
        if (!bot) {
          twitterResult.serviceData.ownerId = Meteor.userId();
          return TwitterBots.insert(twitterResult.serviceData);
        } else {
          return bot._id;
        }
      },
      clearBots: function() {
        TwitterBots.remove({});
      }
    });
  });
}
