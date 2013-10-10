// file: twitter.js
twitter = Npm.require("twitter");
twitterApi = {
  get: function(options) {
    return new twitter(options);
  }
};
