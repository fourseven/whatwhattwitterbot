if (Meteor.isClient) {
  Template.hello.greeting = function () {
    return "Welcome to whatwhattwitterbot.";
  };

  Template.hello.events({
    'click input' : function () {
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined')
        console.log("You pressed the button");
    }
  });

  Template.twitterBots.bots = function() {
    return TwitterBots.find();
  };
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
