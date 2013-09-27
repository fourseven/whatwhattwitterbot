TwitterBots = new Meteor.Collection('twitter-bots');

TwitterBots.register = function(botName) {
  var userId = Meteor.userId();
  return TwitterBots.insert({name: botName, owner: userId});
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
    return doc.owner === userId;
  }
});

if (Meteor.isClient) {

}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
