TwitterBots = new Meteor.Collection('twitter-bots');

TwitterBots.register = function() {
  var userId = Meteor.userId();
  Twitter.requestCredential(function (twitterKey) {
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

}
if (Meteor.isServer) {
  Meteor.startup(function () {
    Meteor.methods({
      registerBot: function(twitterKey) {
        var twitterResult = Twitter.retrieveCredential(twitterKey);
        console.log("server registerBot called " + console.dir(twitterResult));
        var bot_attrs = _.extend(twitterResult.serviceData, {owner: Meteor.userId()});
        if (!TwitterBots.findOne({}, {id: twitterResult.serviceData.id})) {
          TwitterBots.insert(twitterResult.serviceData);
        }
        return true;
      }
    });
    // code to run on server at startup
  });
}
