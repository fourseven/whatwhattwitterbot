Package.describe({
  summary: "Twit npm package"
});
// file: package.js
Npm.depends({
    'twit': '1.1.11'
});

Package.on_use(function(api) {
  api.use('coffeescript',['client','server']);
  api.use('underscore', 'server');
  api.add_files('twitter-api.coffee', 'server');

  api.export('twitApi');
});
