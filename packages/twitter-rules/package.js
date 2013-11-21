Package.describe({
  summary: "/* fill me in */"
});

Package.on_use(function (api, where) {
  api.use(['underscore', 'twitter-bots', 'twitter-api'], ['client', 'server']);
  api.use('coffeescript',['client','server']);
  api.use(['templating', 'layout'], 'client');

  api.add_files('twitter-rule.coffee.md', ['client', 'server']);
  api.add_files('twitter-rules.coffee', ['client', 'server']);

  api.add_files('server/twitter-rules.js', 'server');

  api.add_files('twitter-rules.html', 'client');

  api.export('TwitterRules');

});

Package.on_test(function (api) {
  api.use('twitter-rules');

  api.add_files('twitter-rules_tests.js', ['client', 'server']);
});
