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
          return (@bot() && @twitterClient)
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
          nextRule = TwitterRules.findOne { _id: @nextActionId }
          nextRule.actionCallback(tweet) if nextRule

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
          throw "twitterClient undefined" unless @twitterClient
          @stream ||= @twitterClient.stream("statuses/filter", {follow: @repeatSourceId})

        tweetCallback: (tweet) =>
          if (!tweet.in_reply_to_status_id || @repeatMentions) && tweet.user.id == @repeatSourceId
            @nextAction(tweet)
          else
            @logAction(tweet)

        startListening: ->
          @createStream().on "tweet", @tweetCallback if super

        stopListening: ->
          super
          @createStream().stop()

        start: ->
          if Meteor.isServer && super
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

      class @TwitterPostTweetRule extends TwitterRule

        constructor: (doc) ->
          super

        actionCallback: (tweet) ->
          @twitterClient.post "statuses/update", {status: tweet.text}, (err, reply) ->
            if err
              console.log err
            else
              console.log reply
          super
      class @TwitterRetweetRule extends TwitterRule

        constructor: (doc) ->
          super

        actionCallback: (tweet) ->
          @twitterClient.post "statuses/retweet/:id", { id: tweet.id_str }, (err, reply) ->
            if err
              console.log err
            else
              console.log reply
          super
      class @TwitterTweetFollowersRule extends TwitterRule

        constructor: (doc) ->
          super

        actionCallback: (tweet) ->
          @twitterClient.get('followers/ids', { screen_name: @bot().screenName }, (err, reply) ->
            if err
              console.log err
            else
              console.log reply
              # reply.follower_ids.each
              #   @twitterClient.post "statuses/update", { status: tweet.text, in_reply_to_user_id: id_to_str}, (err, reply) ->
              #     if err
              #       console.log err
              #     else
              #       console.log reply
          super
