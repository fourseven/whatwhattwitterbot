Package.describe({
  summary: "Twitter official npm package"
});
// file: package.js
Npm.depends({
    'twitter': '0.1.18'
});

Package.on_use(function(api) {
    api.add_files('twitter-api.js', 'server');
});
