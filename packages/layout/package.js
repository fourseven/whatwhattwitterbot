Package.describe({
  summary: "Layout support with yield"
});

Package.on_use(function (api) {
  api.use([
    "handlebars",
    "underscore",
    "templating"
  ], "client");

  api.add_files([
    "layout.js"
  ], "client");

  api.export("Layout");
});
