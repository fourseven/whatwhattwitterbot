TwitterRule = function (doc) {
  _.extend(this, doc);
};

TwitterRepeatRule = function (doc) {
  TwitterRule.call(this);
};

// inherit TwitterRule
TwitterRepeatRule.prototype = new TwitterRule();

// correct the constructor pointer because it points to Person
TwitterRepeatRule.prototype.constructor = TwitterRepeatRule;
TwitterRepeatRule.prototype.start = function () {
  console.log("starting repeat rule");

};


_.extend(TwitterRule.prototype, {
  start: function () {
    console.log("starting rule");
  },
  stop: function () {
    console.log("stopping rule");
  }
});

TwitterRules = new Meteor.Collection('twitter-rules', {
  transform: function (doc) {
    switch (doc.type) {
    case 'repeat':
      return new TwitterRepeatRule(doc);
    default:
      return new TwitterRule(doc);
    }
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

  var searchTwitterUser = _.debounce(function(value, callback){
    var currentBotId = Session.get('currentBotId');
    resultsArray = [];
    Meteor.call('searchTwitterUser', value, currentBotId, function (error, result){
      resultsArray = result.map(function(item) {
        return item.screen_name;
      });
      callback(resultsArray);
    });
  }, 1000);
  Meteor.startup(function() {
    var setRuleToSession = function (type) {
      var rules = Session.get('rules') || {};
      var selectedRule = TwitterRules.findOne({type: type, botId: Session.get('currentBotId')});
      rules[type] = (selectedRule) ? selectedRule._id : undefined;
      Session.set('rules', rules);
    };

    var getRuleFromSession = function(type) {
      var rules = Session.get('rules') || {};
      return TwitterRules.findOne({_id: rules[type]});
    };

    Template.ruleRepeat.created = function () {
      setRuleToSession('repeat');
    };

    Template.twitterRules.botName = function() {
      var bot = TwitterBots.findOne({_id: Session.get('currentBotId')});
      if (!bot) return "";
      return "@" + bot.screenName;
    };

    Template.ruleRepeat.repeatSource = function () {
      var rule = getRuleFromSession('repeat');
      return rule ? rule.repeatSource : '';
    };

    Template.ruleRepeat.helpers({
      checkedHelper: function (objectName) {
        var rule = getRuleFromSession('repeat');
        return (rule && rule[objectName]) ? "checked='checked'" : undefined;
      }
    });

    Template.ruleRepeat.events({
      'click [data-collapse]': function (event) {
        var value = !!$(event.target).attr('checked');
        var currentBotId = Session.get('currentBotId');
        Meteor.call('updateRule', currentBotId, 'repeat', {active: value});
      },
      'submit': function (event) {
        event.preventDefault();
        var currentBotId = Session.get('currentBotId');
        var temp = $(event.target).serializeArray();
        var data = {};
        temp.map(function(x){data[x.name] = x.value;});
        Meteor.call('updateRule', currentBotId, 'repeat', data);
      }
    });
  });
}

if (Meteor.isServer) {
  Meteor.publish("twitter-rules", function () {
    return TwitterRules.find({ownerId: this.userId});
  });
  Meteor.startup(function() {
    // var Future = Npm.require('fibers/future');
    Meteor.methods({
      updateRule: function (currentBotId, type, values) {
        console.log("running update for " + type + " with values: " + console.dir(values));
        TwitterRules.upsert({ownerId: Meteor.userId(), botId: currentBotId, type: 'repeat'}, {$set: values});
      },
      clearRules: function() {
        TwitterRules.remove({});
      }
    });
  });

  var repeatRules = TwitterRules.find({type: 'repeat'});
  var handle = repeatRules.observeChanges({
    added: function (id, fields) {
      var rule = TwitterRules.findOne({_id: id});
      rule.start();
    },
    changed: function (id, fields) {
      if (_.has(fields, 'active')) {
        var rule = TwitterRules.findOne({_id: id});
        (fields.active) ? rule.start() : rule.stop();
      }
    }
  });
}
