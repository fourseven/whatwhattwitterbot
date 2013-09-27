Layout = {
  render: function (options, context) {
    if (!context.layout) return options.fn(context);

    return Template[context.layout](_.extend(context, {
      "yield": function (opts) {
        var html = options.fn(context);
        return new Handlebars.SafeString(html);
      }
    }));
  },
  helper: function (name, getOpts) {
    Handlebars.registerHelper(name, function (options) {
      var opts = _.isFunction(getOpts) && getOpts(options.hash) || {};
      var context = _.extend(opts, this);
      var layout = Layout.render(options, context);

      return new Handlebars.SafeString(layout);
    });
  }
};
