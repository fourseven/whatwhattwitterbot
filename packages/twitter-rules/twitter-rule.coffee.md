The base twitter rule class.

      class @TwitterRule
        constructor: (doc) ->
          _.extend this, doc
          @initTwitterClient()
          return @

Sets up the twitter client against the bot

        initTwitterClient: ->
          console.log "Initializing Twitter Client"
          bot = @bot()
          if bot && Meteor.isServer
            config = bot.getAuth()
            @twitterClient = twitApi.initForBot(config)

`sourceName` is a twitter user's name (the source to listen to), and `resolveCallback` gets called with the result from twitter

        resolveTwitterUid: (sourceName, resolveCallback) ->
          console.log "Resolving Twitter ID " + sourceName
          if sourceName
            Meteor.call "resolveTwitterUid", sourceName, @botId, resolveCallback

Usual actions for the bots (to be overridden by superclass)

        start: ->
          console.log "starting rule"
        stop: ->
          console.log "stopping rule"

        startListening: ->
          console.log "Start listening"

        stopListening: ->
          console.log "Stop listening"

        bot: ->
          TwitterBots.findOne(_id: @botId)

        nextAction: (tweet) ->
          console.log("nextAction called")
          console.log(tweet)

        logAction: (tweet) ->
          console.log("logAction called")
          console.log("Reply/RT caught, but not important. It was by: " + tweet.user.screen_name)

      class @TwitterRepeatRule extends TwitterRule
        constructor: (doc) ->
          super

        resolveCallback: (error, result) =>
          if result
            TwitterRules.update @_id,
              $set:
                repeatSourceId: result.id

        createStream: ->
          @stream ||= @twitterClient.stream("statuses/filter", {follow: @repeatSourceId})

        tweetCallback: (tweet) =>
          if (!tweet.in_reply_to_status_id || @repeatMentions) && tweet.user.id == @repeatSourceId
            @nextAction(tweet)
          else
            @logAction(tweet)

        startListening: ->
          super
          @createStream().on "tweet", @tweetCallback

        stopListening: ->
          super
          @createStream().stop()

        start: ->
          super
          if Meteor.isServer
            unless @repeatSourceId
              @resolveTwitterUid(@sourceName, @resolveCallback)
            else
              @startListening()

        stop: ->
          super
          @stopListening()

      class @TwitterHashtagRule extends TwitterRule
        constructor: (doc) ->
          super

        createStream: ->
          @stream ||= @twitterClient.stream("statuses/filter", {track: @hashtag})

        tweetCallback: (tweet) =>
          @nextAction(tweet)

        startListening: ->
          super
          @createStream().on "tweet", @tweetCallback

        stopListening: ->
          super
          @createStream().stop()

        start: ->
          super
          @startListening() if Meteor.isServer

        stop: ->
          super
          @stopListening() if Meteor.isServer
