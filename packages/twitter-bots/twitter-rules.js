TwitterRule = function () {};

TwitterRules = new Meteor.Collection('twitter-rules', {
  transform: function (doc) {
    return new TwitterRule(doc);
  }
});

TwitterRules.allow({
  insert: function (userId, doc) {
    if (TwitterRules.findOne({}, {type: doc.type, botId: doc.botId})) return false;
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
  Meteor.subscribe('twitter-rules');
}
if (Meteor.isServer) {
  Meteor.publish("twitter-rules", function () {
    return TwitterRules.find({ownerId: this.userId});
  });
}
