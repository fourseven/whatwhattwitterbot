@TwitterBot = class TwitterBot
  constructor:(doc) ->
    _.extend @, doc
  owner: ->
    Meteor.users.findOne _id: @ownerId
  rules: ->
    []
  schedules: ->
    []
  getAuth: ->
    access_token: @accessToken
    access_token_secret: @accessTokenSecret


# Turn twitter bot array into twitter bot objects
TwitterBots = new Meteor.Collection("twitter-bots",
  transform: (doc) ->
    new TwitterBot(doc)
)
TwitterBots.register = ->
  # request twitter credentials
  Twitter.requestCredential (twitterKey) ->

    # On callback talk to server with credentials and setup bot
    Meteor.call "registerBot", twitterKey, (error, result) ->
      Session.set "currentBotId", result  unless error


# return TwitterBots.insert({name: botName, ownerId: userId});
TwitterBots.allow
  insert: (userId, doc) ->
    return false  if not doc.name or TwitterBots.findOne({},
      name: doc.name
    )
    userId and doc.ownerId is userId

  update: (userId, doc, fields, modifier) ->

    # can only change your own documents
    doc.ownerId is userId

  remove: (userId, doc) ->

    # can only remove your own documents
    doc.ownerId is userId

if Meteor.isClient
  Meteor.subscribe "twitter-bots"

if Meteor.isServer
  Meteor.publish "twitter-bots", ->
    TwitterBots.find
      ownerId: @userId
    ,
      fields:
        accessToken: 0
        accessTokenSecret: 0


  # code to run on server at startup
  Meteor.startup ->

    # Allow twitter profile images
    #BrowserPolicy.content.allowImageOrigin("http://*.twimg.com");
    Meteor.methods
      registerBot: (twitterKey) ->
        twitterResult = Twitter.retrieveCredential(twitterKey)
        bot = TwitterBots.findOne(id: twitterResult.serviceData.id)
        unless bot
          twitterResult.serviceData.ownerId = Meteor.userId()
          TwitterBots.insert twitterResult.serviceData
        else
          bot._id

      clearBots: ->
        TwitterBots.remove({})
