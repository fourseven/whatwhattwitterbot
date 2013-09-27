if (Meteor.isClient) {
  Template.hello.greeting = function () {
    return "Welcome to whatwhattwitterbot.";
  };

  Template.hello.events({
    'click input[data-add-bot]' : function () {
      // template data, if any, is available in 'this'
      TwitterBots.register();
    }
  });

  Template.twitterBots.bots = function() {
    return TwitterBots.find();
  };
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    Accounts.loginServiceConfiguration.remove({});
    var config = JSON.parse(Assets.getText('oauth.json'));
    Accounts.loginServiceConfiguration.insert(config);
  });
}
