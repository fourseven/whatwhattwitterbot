TwitterBots = new Meteor.Collection('twitter-bots');

TwitterBots.register = function() {
  // request twitter credentials
  Twitter.requestCredential(function (twitterKey) {
    // On callback talk to server with credentials and setup bot
    Meteor.call('registerBot', twitterKey);
  });
  // return TwitterBots.insert({name: botName, owner: userId});
};

TwitterBots.allow({
  insert: function (userId, doc) {
    if (!doc.name || TwitterBots.findOne({}, {name: doc.name})) return false;
    return (userId && doc.owner === userId);
  },
  update: function (userId, doc, fields, modifier) {
    // can only change your own documents
    return doc.owner === userId;
  },
  remove: function (userId, doc) {
    // can only remove your own documents
    return true; //doc.owner === userId;
  }
});

if (Meteor.isClient) {
  Meteor.subscribe('twitter-bots');
}
if (Meteor.isServer) {
  Meteor.publish("twitter-bots", function () {
    return TwitterBots.find({owner: this.userId}, {fields: {accessToken: 0, accessTokenSecret: 0}});
  });



  Meteor.startup(function () {
    Meteor.methods({
      registerBot: function(twitterKey) {
        var twitterResult = Twitter.retrieveCredential(twitterKey);
        if (!TwitterBots.findOne({}, {id: twitterResult.serviceData.id})) {
          _.extend(twitterResult.serviceData, {owner: Meteor.userId()});
          TwitterBots.insert(twitterResult.serviceData);
        }
        return true;
      }
    });
    // code to run on server at startup
  });
}
