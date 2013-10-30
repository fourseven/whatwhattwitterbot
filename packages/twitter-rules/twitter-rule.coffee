class @TwitterRule
  constructor: (doc) ->
    _.extend this, doc
    @initTwitterClient()
    return @
  initTwitterClient: ->
    console.log "Initializing Twitter Client"
    bot = @bot()
    if bot and Meteor.isServer
      config =
        access_token: bot.accessToken
        access_token_secret: bot.accessTokenSecret

      @twitterClient = twitApi.initForBot(config)
  start: ->
    console.log "starting rule"
  stop: ->
    console.log "stopping rule"
  bot: ->
    TwitterBots.findOne _id: @botId
