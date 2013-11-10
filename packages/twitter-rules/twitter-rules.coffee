TwitterRules = new Meteor.Collection "twitter-rules",
  transform: (doc) ->
    TwitterRules.factory(doc)

_.extend TwitterRules,
  start: ->
    repeatRules = TwitterRules.find(type: "repeat")
    handle = repeatRules.observeChanges
      added: (id, fields) ->
        rule = TwitterRules.findOne(_id: id)
        rule.start() if (rule.active && rule.repeatSourceId)

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
      when "hashtag"
        console.log "made new hashtag rule"
        new TwitterHashtagRule(doc)
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

    _.extend Template.ruleRepeat,
      created: ->
        setRuleToSession "repeat"
      repeatSource: ->
        rule = getRuleFromSession("repeat")
        (if rule then rule.repeatSource else "")

    Template.ruleRepeat.helpers
      checkedHelper: (objectName) ->
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
        console.dir data
        Meteor.call "updateRule", currentBotId, "repeat", data

    Template.twitterRules.noRules = ->
      TwitterRules.find().count() == 0

    Template.twitterRules.activeRules = ->
      TwitterRules.find()

    Template.twitterRules.events
      "dragstart [draggable]": (event) ->
        console.log "dragstart"
        event.target.style.opacity = '0.4'
        event.dataTransfer.effectAllowed = 'copy'
        event.dataTransfer.setData('text/plain', $(event.target).data('rule-type'))
        event.dataTransfer.source = event.target

      "dragend [draggable]": (event) ->
        console.log "dragend"
        event.target.style.opacity = '1.0'
        event.preventDefault()

      "dragover .rules-active": (event) ->
        console.log "dragover"
        event.preventDefault()

      "drop": (event) ->
        event.dataTransfer.dropEffect = "copy"
        console.log "dropped #{event.target.innerHTML}"
        event.preventDefault()
        type = event.dataTransfer.getData('text/plain')
        TwitterRules.insert
          type: type
          botId: Session.get('currentBotId')
          ownerId: Meteor.userId()


if Meteor.isServer
  Meteor.publish "twitter-rules", ->
    TwitterRules.find ownerId: @userId

  Meteor.startup ->

    # var Future = Npm.require('fibers/future');
    Meteor.methods
      updateRule: (currentBotId, type, values) ->
        console.log "running update for " + type + " with values: " + console.log(values)
        TwitterRules.upsert
          ownerId: Meteor.userId()
          botId: currentBotId
          type: "repeat"
        ,
          $set: values

      clearRules: ->
        TwitterRules.remove {}

