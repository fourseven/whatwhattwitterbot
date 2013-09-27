Package.describe({
  summary: "Code for twitter bots"
});

Package.on_use(function (api, where) {
  api.use(['standard-app-packages', 'accounts-base', 'accounts-oauth', 'twitter', 'underscore'], ['client', 'server']);
  api.add_files('twitter-bots.js', ['client', 'server']);

  api.export('TwitterBots');
});

Package.on_test(function (api) {
  api.use('twitter-bots');

  api.add_files('twitter-bots_tests.js', ['client', 'server']);
});
