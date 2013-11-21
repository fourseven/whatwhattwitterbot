TwitterRules = new Meteor.Collection "twitter-rules",
  transform: (doc) ->
    TwitterRules.factory(doc)

_.extend TwitterRules,
  start: ->
    repeatRules = TwitterRules.find(type: "repeat")
    handle = repeatRules.observeChanges
      added: (id, fields) ->
        console.log "repeat rule added"
        rule = TwitterRules.findOne(_id: id)
        rule.start() if (rule.isValid())

      changed: (id, fields) ->
        console.log "A repeat rule was changed!"
        rule = TwitterRules.findOne(_id: id)
        # if _.has(fields, "active")
        #   (if (fields.active and rule.repeatSourceId) then rule.start() else rule.stop())
        if _.has(fields, "repeatSource")
          console.log "repeatSource was changed, calling resolveTwitterUid"
          rule.resolveTwitterUid rule.repeatSource
        if _.has(fields, "repeatSourceId")
          (if (rule.isValid()) then rule.start() else rule.stop())

  factory: (doc) ->
    switch doc.type
      when "repeat"
        console.log "made new repeat rule"
        new TwitterRepeatRule(doc)
      when "hashtag"
        console.log "made new hashtag rule"
        new TwitterHashtagRule(doc)
      when "retweet"
        console.log "made new retweet rule"
        new TwitterRetweetRule(doc)
      when "tweet"
        console.log "made new post tweet rule"
        new TwitterPostTweetRule(doc)
      when "replace"
        console.log "made new replace text rule"
        new TwitterReplaceTextRule(doc)
      else
        new TwitterRule(doc)

TwitterRules.allow
  insert: (userId, doc) ->
    console.log "user: #{userId}, doc: #{JSON.stringify(doc)}"
    return false if TwitterRules.findOne(
      type: doc.type
      botId: doc.botId
    )

    allowed = (userId && doc.ownerId == userId)
    console.log "allowed was #{!!allowed}"
    return allowed

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

  Layout.helper "ruleHelper", (options) ->
    layout: "rule_#{options.layout}"

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

    _.extend Template.rule_repeat,
      created: ->
        setRuleToSession "repeat"
      repeatSource: ->
        rule = getRuleFromSession("repeat")
        (if rule then rule.repeatSource else "")

    Template.rule_repeat.helpers
      checkedHelper: (objectName) ->
        rule = getRuleFromSession("repeat")
        (if (rule and rule[objectName]) then "checked='checked'" else `undefined`)

    Template.rule_repeat.events
      submit: (event) ->
        event.preventDefault()
        currentBotId = Session.get("currentBotId")
        temp = $(event.target).serializeArray()
        data = {}
        temp.map (x) ->
          data[x.name] = x.value
        console.log "data from submit of update rule was #{JSON.stringify(data)}"
        Meteor.call "updateRule", currentBotId, "repeat", data

    Template.twitterRules.noRules = ->
      TwitterRules.find().count() == 0

    Template.rulesActive.activeRules = ->
      TwitterRules.find()

    Template.rulesActive.ruleTypes = ->
      ["retweet","tweet","replace"]

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

    Template.rulesActive.events
      "click .new_filter": (event) ->
        unless $(".filter_list:visible").length
          $(event.currentTarget).parent()
          .find("select")
          .first()
          .clone()
          .appendTo(event.currentTarget)
          .show()

      "change .filter_list": (event) ->
        rule = $(event.currentTarget).val()
        rule_form = $(event.currentTarget).first().parent()
        $("#rule-#{rule}")
        .first()
        .parent()
        .clone()
        .appendTo(rule_form)
        .show()
        $(event.currentTarget).remove()
if Meteor.isServer
  Meteor.publish "twitter-rules", ->
    TwitterRules.find ownerId: @userId

  Meteor.startup ->

    # var Future = Npm.require('fibers/future');
    Meteor.methods
      updateRule: (currentBotId, type, values) ->
        console.log "running update for " + type + " with values: " + JSON.stringify(values)
        TwitterRules.upsert
          ownerId: Meteor.userId()
          botId: currentBotId
          type: "repeat"
        ,
          $set: values

      clearRules: ->
        TwitterRules.remove({})

