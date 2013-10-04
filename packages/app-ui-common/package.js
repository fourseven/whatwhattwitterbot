Package.describe({
  summary: "Common UI Elements (modals etc)"
});

Package.on_use(function (api) {
  api.use([
    "layout"
  ], "client");

  api.add_files([
    "app-ui-common.js",
    "app-ui-common.html"
  ], "client");

  api.export("AppUI");
});
