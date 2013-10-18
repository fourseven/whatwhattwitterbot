Package.describe({
  summary: "/* fill me in */"
});

Package.on_use(function (api, where) {
  api.use(['underscore'], ['client', 'server']);
  api.use(['templating'], 'client');
  api.add_files('twitter-rules.js', ['client', 'server']);

  api.add_files('twitter-rules.html', 'client');

  api.export('TwitterRules');

});

Package.on_test(function (api) {
  api.use('twitter-rules');

  api.add_files('twitter-rules_tests.js', ['client', 'server']);
});
