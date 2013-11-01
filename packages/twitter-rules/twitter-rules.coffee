class TwitterRepeatRule extends TwitterRule
  constructor: (doc) ->
    super

  resolveTwitterUid: ->
    console.log "Resolving Twitter ID " + @repeatSource
    if @repeatSource
      rule = this
      Meteor.call "resolveTwitterUid", @repeatSource, @botId, (error, result) ->
        if result
          TwitterRules.update rule._id,
            $set:
              repeatSourceId: result.id

  startListening: ->
    console.log "Start listening"
    rule = this
    @stream = @twitterClient.stream("statuses/filter",
      follow: @repeatSourceId
    )
    @stream.on "tweet", (tweet) ->
      if (!tweet.in_reply_to_status_id || rule.repeatMentions) && tweet.user.id == rule.repeatSourceId
        console.log tweet
      else
        console.log "Reply/RT caught, but not important. It was by: " + tweet.user.screen_name

  start: ->
    super
    if Meteor.isServer
      if @twitterClient
        unless @repeatSourceId
          @resolveTwitterUid()
        else
          @startListening()


TwitterRules = new Meteor.Collection "twitter-rules",
  transform: (doc) ->
    TwitterRules.factory(doc)

_.extend TwitterRules,
  start: ->
    repeatRules = TwitterRules.find(type: "repeat")
    handle = repeatRules.observeChanges
      added: (id, fields) ->
        rule = TwitterRules.findOne(_id: id)
        rule.start()

      changed: (id, fields) ->
        rule = TwitterRules.findOne(_id: id)
        if _.has(fields, "active")
          (if (fields.active and rule.repeatSourceId) then rule.start() else rule.stop())
        if _.has(fields, "repeatSource")
          rule.resolveTwitterUid()
        if _.has(fields, "repeatSourceId")
          (if (rule.active) then rule.start() else rule.stop())

  factory: (doc) ->
    switch doc.type
      when "repeat"
        console.log "made new repeat rule"
        new TwitterRepeatRule(doc)
      else
        new TwitterRule(doc)

TwitterRules.allow
  insert: (userId, doc) ->
    return false  if TwitterRules.findOne({},
      type: doc.type
      botId: doc.botId
    )
    userId and doc.ownerId is userId

  update: (userId, doc, fields, modifier) ->

    # can only change your own documents
    doc.ownerId is userId

  remove: (userId, doc) ->

    # can only remove your own documents
    doc.ownerId is userId

if Meteor.isClient
  Meteor.subscribe "twitter-rules"
  searchTwitterUser = _.debounce((value, callback) ->
    currentBotId = Session.get("currentBotId")
    resultsArray = []
    Meteor.call "searchTwitterUser", value, currentBotId, (error, result) ->
      resultsArray = result.map((item) ->
        item.screen_name
      )
      callback resultsArray

  , 1000)
  Meteor.startup ->
    setRuleToSession = (type) ->
      rules = Session.get("rules") or {}
      selectedRule = TwitterRules.findOne(
        type: type
        botId: Session.get("currentBotId")
      )
      rules[type] = (if (selectedRule) then selectedRule._id else `undefined`)
      Session.set "rules", rules

    getRuleFromSession = (type) ->
      rules = Session.get("rules") or {}
      TwitterRules.findOne _id: rules[type]

    Template.twitterRules.botName = ->
      bot = TwitterBots.findOne(_id: Session.get("currentBotId"))
      return ""  unless bot
      "@" + bot.screenName

    Template.ruleRepeat.created = ->
      setRuleToSession "repeat"

    Template.ruleRepeat.repeatSource = ->
      rule = getRuleFromSession("repeat")
      (if rule then rule.repeatSource else "")

    Template.ruleRepeat.helpers checkedHelper: (objectName) ->
      rule = getRuleFromSession("repeat")
      (if (rule and rule[objectName]) then "checked='checked'" else `undefined`)

    Template.ruleRepeat.events
      "click [data-collapse]": (event) ->
        value = !!$(event.target).attr("checked")
        currentBotId = Session.get("currentBotId")
        Meteor.call "updateRule", currentBotId, "repeat",
          active: value


      submit: (event) ->
        event.preventDefault()
        currentBotId = Session.get("currentBotId")
        temp = $(event.target).serializeArray()
        data = {}
        temp.map (x) ->
          data[x.name] = x.value

        Meteor.call "updateRule", currentBotId, "repeat", data


if Meteor.isServer
  Meteor.publish "twitter-rules", ->
    TwitterRules.find ownerId: @userId

  Meteor.startup ->

    # var Future = Npm.require('fibers/future');
    Meteor.methods
      updateRule: (currentBotId, type, values) ->
        console.log "running update for " + type + " with values: " + console.dir(values)
        TwitterRules.upsert
          ownerId: Meteor.userId()
          botId: currentBotId
          type: "repeat"
        ,
          $set: values


      clearRules: ->
        TwitterRules.remove {}

