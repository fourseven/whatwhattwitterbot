TwitterRule = function (doc) {
  _.extend(this, doc);
  this.initTwitterClient();
};

_.extend(TwitterRule.prototype, {
  initTwitterClient: function () {
    console.log("Initializing Twitter Client");
    var bot = this.bot();
    if (bot && Meteor.isServer) {
      var config = {
        access_token:         bot.accessToken,
        access_token_secret:  bot.accessTokenSecret
        };
      this.twitterClient = twitApi.initForBot(config);
    }
  }
});

var surrogate = function(){};
surrogate.prototype = TwitterRule.prototype;

TwitterRepeatRule = function (doc) {
  TwitterRule.call(this, doc);
};
TwitterRepeatRule.prototype = new surrogate();
TwitterRepeatRule.prototype.constructor = TwitterRepeatRule;

_.extend(TwitterRepeatRule.prototype, {
  resolveTwitterUid: function() {
    console.log("Resolving Twitter ID " + this.repeatSource);
    if (this.repeatSource) {
      var rule = this;
      Meteor.call('resolveTwitterUid', this.repeatSource, this.botId, function (error, result) {
        if (result) {
          TwitterRules.update(rule._id, {$set: {repeatSourceId: result.id}});
        }
      });
    }
  },


  startListening: function () {
    console.log("Start listening");
    this.stream = this.twitterClient.stream('statuses/filter', { follow: this.repeatSourceId });
    this.stream.on('tweet', function(tweet) {
      if (!tweet.in_reply_to_status_id) {
        console.log(tweet);
      }
    });
  },

  start: function () {
    console.log("starting repeat rule");
    if (Meteor.isServer) {
      if (this.twitterClient) {
        if (!this.repeatSourceId) {
          this.resolveTwitterUid();
        } else {
          this.startListening();
        }
      }
    }
  }
});

_.extend(TwitterRule.prototype, {
  start: function () {
    console.log("starting rule");
  },
  stop: function () {
    console.log("stopping rule");
  },
  bot: function () {
    return TwitterBots.findOne({_id: this.botId});
  }
});

TwitterRules = new Meteor.Collection('twitter-rules', {
  transform: function (doc) {
    switch (doc.type) {
    case 'repeat':
    console.log("made new repeat rule");
      return new TwitterRepeatRule(doc);
    default:
      return new TwitterRule(doc);
    }
  }
});

TwitterRules.start = function () {
  var repeatRules = TwitterRules.find({type: 'repeat'});
  var handle = repeatRules.observeChanges({
    added: function (id, fields) {
      var rule = TwitterRules.findOne({_id: id});
      rule.start();
    },
    changed: function (id, fields) {
      var rule = TwitterRules.findOne({_id: id});
      if (_.has(fields, 'active')) {
        (fields.active && rule.repeatSourceId) ? rule.start() : rule.stop();
      }
      if (_.has(fields, 'repeatSource')) {
        rule.resolveTwitterUid();
      }

      if (_.has(fields, 'repeatSourceId')) {
        (rule.active) ? rule.start() : rule.stop();
      }
    }
  });
};

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

    Template.twitterRules.botName = function() {
      var bot = TwitterBots.findOne({_id: Session.get('currentBotId')});
      if (!bot) return "";
      return "@" + bot.screenName;
    };

    Template.ruleRepeat.created = function () {
      setRuleToSession('repeat');
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
}
