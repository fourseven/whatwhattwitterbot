if (Meteor.isClient) {
  Template.hello.showBots = function() {
    return !!Meteor.user();
  };
  Template.hello.showRules = function() {
    return !!Session.get('currentBotId');
  };
  Template.hello.showSchedules = function() {
    return !!Session.get('currentBotId');
  };
  Template.hello.botName = function() {
    var bot = TwitterBots.findOne({_id: Session.get('currentBotId')});
    if (!bot) return "";
    return bot.screenName;
  };

  Template.hello.events({
    'click [data-add-bot]' : function () {
      // template data, if any, is available in 'this'
      TwitterBots.register();
    },
    'click .banner .sign-in': function (event) {
      event.preventDefault();
      Accounts._loginButtonsSession.set('dropdownVisible', true);                                                                // 8
      Deps.flush();
    }
  });

  Template.twitterBots.bots = function() {
    return TwitterBots.find();
  };

  Template.twitterBots.events({
    'click .remove': function(event) {
      event.preventDefault();
      TwitterBots.remove({_id: this._id});
    },
    'click .bot-button': function (event) {
      Session.set('currentBotId', this._id);
    }
  });

  var userWasLoggedIn = false;
  Deps.autorun(function (c) {
    if(!Meteor.userId()) {
      if(userWasLoggedIn) {
        Session.set('currentBotId', null);
      }
    } else {
      var bot = TwitterBots.find().fetch();
      if (bot.length && !Session.get('currentBotId')) {
        Session.set('currentBotId', bot[0]._id);
      }
      userWasLoggedIn = true;
    }
  });

  // Reset active bot if bot gets removed.
  Deps.autorun(function (c) {
    var bot = TwitterBots.findOne({_id: Session.get('currentBotId')});
    if (!bot) {
      Session.set('currentBotId', null);
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    Accounts.loginServiceConfiguration.remove({});
    var config = JSON.parse(Assets.getText('oauth.json'));
    Accounts.loginServiceConfiguration.insert(config);
  });
}
