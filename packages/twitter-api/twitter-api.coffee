# file: twitter.js
twit = Npm.require("twit")
options = undefined
init = (options, config) ->
  new twit(_.extend(options, config))

twitApi =
  get: (options) ->
    new twit(options)

  config: (_options) ->
    options = _options

  initForBot: (botTokens) ->
    _.partial(init, options) botTokens

if Meteor.isServer
  Meteor.startup ->
    Future = Npm.require("fibers/future")
    Meteor.methods
      searchTwitterUser: (username, currentBotId) ->
        fut = new Future()
        bot = TwitterBots.findOne(_id: currentBotId)

        twitterClient = twitApi.initForBot(bot.getAuth())
        twitterClient.get "users/search",
          q: username
        , (error, reply) ->
          fut["return"] reply

        fut.wait()

      resolveTwitterUid: (username, currentBotId) ->
        fut = new Future()
        bot = TwitterBots.findOne(_id: currentBotId)

        twitterClient = twitApi.initForBot(bot.getAuth())
        twitterClient.get "users/show",
          screen_name: username
        , (error, reply) ->
          fut["return"] reply

        fut.wait()

