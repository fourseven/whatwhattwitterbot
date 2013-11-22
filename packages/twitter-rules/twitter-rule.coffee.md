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

        resolveTwitterUid: (sourceName, resolveCallback = ->) ->
          console.log "Resolving Twitter ID " + sourceName
          if sourceName
            Meteor.call "resolveTwitterUid", sourceName, @botId, (err, result) =>
              uid = result.id_str
              console.log ("The document id was #{@_id}")
              TwitterRules.update({_id: @_id}, {$set: {repeatSourceId: uid}})
              resolveCallback(uid)

Usual actions for the bots (to be overridden by superclass)

        start: ->
          console.log "starting rule"
          return (@bot() && @twitterClient)
        stop: ->
          console.log "stopping rule"

        startListening: ->
          console.log "Start listening"
          Meteor.isServer

        stopListening: ->
          console.log "Stop listening"
          Meteor.isServer

        bot: ->
          TwitterBots.findOne(_id: @botId)

        nextAction: (tweet) ->
          console.log("nextAction called")
          console.log(tweet)
          if @nextActionId
            nextRule = TwitterRules.findOne { _id: @nextActionId }
            nextRule.actionCallback(tweet) if nextRule

        logAction: (tweet) ->
          console.log("logAction called")
          console.log("Reply/RT caught, but not important. It was by: " + tweet.user.screen_name)

        actionCallback: (tweet) ->
          @nextAction(tweet)

        isValid: () ->
          false

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
          console.log("Tweet userId was #{tweet.user.id_str}")
          console.log("Saved userId was #{@repeatSourceId}")
          console.log("tweet.in_reply_to_status_id was #{tweet.in_reply_to_status_id}")

          if (!tweet.in_reply_to_status_id || @repeatMentions) && tweet.user.id_str == @repeatSourceId
            @nextAction(tweet)
          else
            @logAction(tweet)

        startListening: ->
          @createStream().on "tweet", @tweetCallback if super

        stopListening: ->
          super
          @createStream().stop() if @createStream().request

        start: ->
          if Meteor.isServer && super
            unless @repeatSourceId
              console.log("TwitterRepeatRule starting but calling resolveTwitterUid first/instead")
              @resolveTwitterUid(@repeatSource, @resolveCallback)
            else
              @startListening()

        stop: ->
          super
          @stopListening()

        isValid: () ->
          valid = @repeatSource && @repeatSourceId
          console.log("RepeatRule is valid? #{@repeatSource} #{@repeatSourceId}")
          return valid


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
          @twitterClient.get 'followers/ids', { screen_name: @bot().screenName }, (err, reply) ->
            if err
              console.log err
            else
              console.log reply
          super

      # class @TwitterReplaceTextRule extends TwitterRule
      #   constructor: (doc) ->
      #     super

      #   actionCallback: (tweet) ->
      #     tweet.text.replace(@in_text, @out_text)

