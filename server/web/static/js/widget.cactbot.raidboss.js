var DATA_PATH = "/static/lib/cactbot/ui/raidboss/data";
var LOAD_SCRIPTS = [
    "/static/lib/cactbot/ui/raidboss/timeline.js",
    "/static/lib/cactbot/resources/regexes.js",
    "/static/lib/cactbot/resources/fights.js"
];
var CACTBOT_LOCALE_NAME = "en";
var JOB_ROLE_LIST = {
    "dps-melee"     : [
        "MNK", "SAM", "NIN", "DRG"
    ],
    "dps-caster"    : [
        "BLM", "SMN", "RDM"
    ],
    "dps-ranged"    : [
        "BRD", "MCH"
    ],
    "tank"          : [
        "PLD", "DRK", "WAR"
    ],
    "healer"        : [
        "AST", "SCH", "WHM"
    ]
};
var RETRIGGER_DELAY = 3000;


/**
 * Cactbot raidboss widget
 * @see https://github.com/quisquous/cactbot
 */
class WidgetCactbotRaidboss extends WidgetBase
{

    constructor()
    {
        super()
        this.triggers = {};
        this.timelines = {};
        this.zoneName = "";
        this.startRegexs = [];
        this.endRegexs = [];
        this.ready = false;
        this.activeTimeline = null;
        this.activeTriggers = [];
        this.delayTriggers = [];
        this.tickTimeout = null;
        this.alertTimeout = null;
        this.myData = null;
        if (!("characterName" in this.userConfig)) {
            this.userConfig["characterName"] = null;
            this._saveUserConfig();
        }
        if (!("tts" in this.userConfig)) {
            this.userConfig["tts"] = false;
            this._saveUserConfig();
        }
        if (!("beep" in this.userConfig)) {
            this.userConfig["beep"] = false;
            this._saveUserConfig();
        }
    }

    getName()
    {
        return "cactbot-raidboss";
    }

    getTitle()
    {
        return "Cactbot (raidboss)";
    }

    getOptions()
    {
        var options = super.getOptions();
        var t = this;
        options.push(
            new WidgetOption(
                "Configuration",
                "/static/img/opt_config.png",
                function() { t._showOptionConfig(); }
            )
        )
        return options;
    }

    add()
    {
        super.add()
        var bodyElement = this.getBodyElement();
        if (!bodyElement) {
            return;
        }
        // add scripts
        for (var i in LOAD_SCRIPTS) {
            var scriptElement = document.createElement("script");
            scriptElement.src = LOAD_SCRIPTS[i];
            bodyElement.appendChild(scriptElement);
        }
        // add alert area
        var alertElement = document.createElement("div");
        alertElement.classList.add("cactbotAlert", "textCenter", "textBold");
        bodyElement.appendChild(alertElement);
        // add timer container
        var timerContainerElement = document.createElement("div");
        timerContainerElement.classList.add("cactbotTimerContainer");
        bodyElement.appendChild(timerContainerElement);
        // reset
        this.reset();
        // fetch data
        this._fetchAll();
        // hook events
        var t = this;
        window.addEventListener("act:encounter", function(e) { t._onEncounter(e); });
        window.addEventListener("act:logLine", function(e) { t._onLogLine(e); });
        window.addEventListener("act:combatant", function(e) { t._onCombatant(e); });
    }

    showOptionHelp()
    {
        var helpText ="";
        helpText += "--- Cactbot Raidboss Widget ---\n";
        helpText += "Displays timeline of raid encounter using the ACT cactbot overlay.\n";
        helpText += "https://github.com/quisquous/cactbot";
        alert(helpText);
    }

    /**
     * Reset the display.
     */
    reset()
    {
        if (this.activeTimeline) {
            this.activeTimeline.Stop();
            delete this.activeTimeline;
            this.activeTimeline = null;
            this.activeTriggers = [];
        }
        this.getBodyElement().getElementsByClassName("cactbotTimerContainer")[0].innerHTML = "";
    }

    /**
     * Show configuration options.
     */
    _showOptionConfig()
    {
        Modal.reset();
        Modal.open();
        var t = this;
        Modal.addSection("General");
        Modal.addText("Enter your character name to recieve alerts and callouts specific to you.");
        Modal.addTextbox(
            "name",
            "Character Name",
            t.userConfig["characterName"],
            function(name, value) {
                t.userConfig["characterName"] = value.trim();
                t._saveUserConfig();
            }
        );
        Modal.addSection("Audio");
        Modal.addCheckbox(
            "tts",
            "Enable TTS Alerts",
            this.userConfig["tts"],
            function(name, checked) {
                t.userConfig["tts"] = checked;
                t._saveUserConfig();
            }
        );
        Modal.addCheckbox(
            "beep",
            "Enable Alert Beep",
            this.userConfig["beep"],
            function(name, checked) {
                t.userConfig["beep"] = checked;
                t._saveUserConfig();
            }
        );
    }

    /**
     * Fetch data from given uri.
     * @param {string} uri 
     * @param {Function} callback
     */
    _fetch(uri, callback)
    {
        var request = new XMLHttpRequest();
        request.open("GET", uri, true);
        request.send();
        var callback = callback;
        request.addEventListener("load", function(e) {
            console.log(">> Cactbot (raidboss), fetched " + uri + ".");
            if (callback) {
                callback(e.target);
            }
        });
        request.addEventListener("error", function(e) {
            throw e;
        });
        request.addEventListener("abort", function(e) {
            throw e;
        });
    }

    /**
     * Download data from server.
     */
    _fetchAll()
    {
        console.log(">> Cactbot (raidboss), fetching data.");
        var t = this;
        this._fetch(DATA_PATH + "/manifest.txt", function(request) {
            var data = request.response.split("\n");
            var totalDataFiles = 0;
            for (var i in data) {
                data[i] = data[i].trim();
                if (!data[i]) {
                    continue;
                }
                totalDataFiles++;
            }             
            for (var i in data) {
                data[i] = data[i].trim();
                if (!data[i]) {
                    continue;
                }
                var type = data[i].split("/")[0];
                switch (type)
                {
                    case "timelines":
                    {
                        t._fetch(
                            DATA_PATH + "/" + data[i],
                            function(request) {
                                t.timelines[request.responseURL.split("/").slice(-1)[0]] = request.response;
                                if (Object.keys(t.timelines).length + Object.keys(t.triggers).length >= totalDataFiles) {
                                    t._init();
                                }
                            }
                        );
                        break;
                    }
                    case "triggers":
                    {
                        t._fetch(
                            DATA_PATH + "/" + data[i],
                            function(request) {
                                t.triggers[request.responseURL.split("/").slice(-1)[0]] = eval(request.response)[0];
                                if (Object.keys(t.timelines).length + Object.keys(t.triggers).length >= totalDataFiles) {
                                    t._init();
                                }
                            }
                        );
                        break;
                    }
                }
            }
        });
    }

    /**
     * Init once all data files are loaded.
     */
    _init()
    {
        this.ready = true;
        console.log(">> Cactbot (raidboss), ready!");
        this._loadTimelineForZone()
    }

    /**
     * Update zone name, match to timeline.
     * @param {Event} event 
     */
    _onEncounter(event)
    {
        if (!event.detail.Active && this.activeTimeline) {
            this.activeTimeline.Stop();
        }
        if (event.detail.Zone != this.zoneName) {
            this.reset();
            this.zoneName = event.detail.Zone;
            this._loadTimelineForZone();
        }
    }

    /**
     * Process log line.
     * @param {Event} event 
     */
    _onLogLine(event)
    {
        if (!this.ready || !this.activeTimeline) {
            return;
        }
        // check for 'start' event
        if (this.startRegexs && this.activeTimeline.timebase <= 0) {
            for (var i in this.startRegexs) {
                if (event.detail.LogLine.match(this.startRegexs[i])) {
                    this.activeTimeline.SyncTo(1);
                    break;
                }
            }
        }
        // check for 'end' event
        if (this.endRegexs && this.activeTimeline.timebase > 0) {
            for (var i in this.endRegexs) {
                if (event.detail.LogLine.match(this.endRegexs[i])) {
                    this.activeTimeline.Stop();
                    return;
                }
            }
        }
        // push log line to active timeline
        this.activeTimeline.OnLogLine(event.detail.LogLine);
        // process triggers
        if (this.activeTriggers) {
            for (var i in this.activeTriggers) {
                var trigger = this.activeTriggers[i];
                var matches = event.detail.LogLine.match(trigger.localRegex);
                if (matches) {
                    if ("delaySeconds" in trigger) {
                        var t = this;
                        setTimeout(
                            function(trigger) { t._executeTrigger(trigger, matches); },
                            trigger.delaySeconds * 1000,
                            trigger,
                            matches
                        );
                        continue;
                    }
                    this._executeTrigger(trigger, matches);
                }
            }
        }
    }

    /**
     * Process combatant.
     * @param {Event} event 
     */
    _onCombatant(event)
    {
        if (
            this.userConfig["characterName"] && 
            event.detail.Name.trim().toLowerCase() == this.userConfig["characterName"].trim().toLowerCase() &&
            (
                !this.myData || this.myData.me != event.detail.Name || this.myData.job.toUpperCase() != event.detail.Job.toUpperCase()
            )
        ) {
            var myRole = null;
            for (var role in JOB_ROLE_LIST) {
                if (JOB_ROLE_LIST[role].indexOf(event.detail.Job.toUpperCase()) != -1) {
                    myRole = role;
                    break;
                }
            }
            this.myData = {
                "me"        : event.detail.Name,
                "job"       : event.detail.Job.toUpperCase(),
                "role"      : myRole,
                "lang"      : CACTBOT_LOCALE_NAME,
                "currentHP" : 1,
                "ShortName" : function(name) { return name; },
                ParseLocaleFloat: parseFloat,
                "StopCombat": () => this.activeTimeline.Stop(),
            };
            console.log(">> Cactbot (raidboss), set player data,", this.myData);
        }
    }

    /**
     * Load timeline for current zone.
     */
    _loadTimelineForZone()
    {
        if (!this.ready || !this.zoneName) {
            return;
        }
        this.reset();

        // TEST
        //this.zoneName = "Sigmascape V1.0 (Savage)";

        var t = this;
        // load start/end regexs
        for (var i in gBossFightTriggers) {
            if (this.zoneName.match(gBossFightTriggers[i].zoneRegex)) {
                this.startRegexs.push(new RegExp(gBossFightTriggers[i].startRegex));
                this.endRegexs.push(new RegExp(gBossFightTriggers[i].endRegex));
            }
        }

        for (var key in this.triggers) {
            if (!("timelineFile" in this.triggers[key])) {
                continue;
            }
            if (this.zoneName.match(this.triggers[key].zoneRegex)) {
                console.log(">> Cactbot (raidboss), load timeline for zone " + this.zoneName + ".");
                var timelineFile = this.triggers[key].timelineFile;
                var timelineData = this.timelines[timelineFile];
                this.activeTimeline = new Timeline(
                    timelineData,
                    null,
                    this.triggers[key].triggers,
                    {
                        "MaxNumberOfTimerBars" : 5
                    }
                );
                // add active triggers
                this.activeTriggers = [];
                var localName = CACTBOT_LOCALE_NAME.toLowerCase();
                localName = CACTBOT_LOCALE_NAME.substr(0, 1).toUpperCase() + CACTBOT_LOCALE_NAME.substr(1).toUpperCase();
                for (var i in this.triggers[key].triggers) {
                    var trigger = this.triggers[key].triggers[i];
                    // parse regex
                    var regex = trigger.regex;
                    if (("regex" + localName) in trigger) {
                        regex = trigger["regex" + localName];
                    }
                    regex = Regexes.Parse(regex);
                    trigger.localRegex  = regex;
                    this.activeTriggers.push(trigger);
                }
                // hook events
                this.activeTimeline.SetAddTimer(function(currentTime, eventData, active) {
                    console.log(">> Cactbot (raidboss), new timer, ", currentTime, eventData, active);
                    t._setTimer(currentTime, eventData, active);
                });
                this.activeTimeline.SetRemoveTimer(function(eventData, expired) {
                    console.log(">> Cactbot (raidboss), remove timer, ", eventData, expired);
                    t._removeTimer(eventData, expired);
                });

                // TEST
                /*this.activeTimeline.OnLogLine(":Engage!");
                setTimeout(
                    function() {
                        t._onLogLine({"detail" : {"LogLine" : "14:28B1:Phantom Train starts using Doom Strike on Minda Silva"}});
                    },
                    1000
                )
                setTimeout(
                    function() {
                        t._onLogLine({"detail" : {"LogLine" : "14:28B1:Phantom Train starts using Doom Strike on Minda Silva"}});
                    },
                    3000
                )*/
                break;
            }
        }
    }

    /**
     * Add/update timer.
     * @param {integer} currentTime 
     * @param {dict} eventData 
     * @param {boolean} active 
     */
    _setTimer(currentTime, eventData, active)
    {
        // update existing
        var timerElement = this.getBodyElement().getElementsByClassName("cactbotTimer-" + eventData.id)[0];
        if (timerElement) {
            timerElement.classList.remove("active");
            if (active) {
                timerElement.classList.add("active");
            }
            return;
        }
        // main timer element
        var timerElement = document.createElement("div");
        timerElement.classList.add(
            "cactbotTimer",
            "cactbotTimer-" + eventData.id
        );
        timerElement.setAttribute("data-time", eventData.time);
        timerElement.setAttribute("data-name", eventData.name);
        timerElement.setAttribute("data-sort", eventData.sortKey);
        if (active) {
            timerElement.classList.add("active");
        }
        // time text element
        var timeTextElement = document.createElement("div");
        timeTextElement.classList.add("cactbotTimerText");
        timeTextElement.innerText = "--"
        timerElement.appendChild(timeTextElement);
        // add event name element
        var eventNameElement = document.createElement("div");
        eventNameElement.classList.add("cactbotTimerEventName");
        eventNameElement.innerText = eventData.text;
        timerElement.appendChild(eventNameElement);
        // add
        this.getBodyElement().getElementsByClassName("cactbotTimerContainer")[0].appendChild(timerElement);
        this._sortTimers()
        this._tickTimers();
    }

    /**
     * Delete timer.
     * @param {dict} eventData 
     * @param {boolean} expired 
     */
    _removeTimer(eventData, expired)
    {
        var timerElement = this.getBodyElement().getElementsByClassName("cactbotTimer-" + eventData.id)[0];
        if (!timerElement) {
            return;
        }
        timerElement.remove();
        this._sortTimers();
    }

    /**
     * Sort all timers by their sort key.
     */
    _sortTimers()
    {
        if (!this.activeTimeline) {
            return;
        }
        var timerContainer = this.getBodyElement().getElementsByClassName("cactbotTimerContainer")[0];
        var timerElementNodes = timerContainer.getElementsByClassName("cactbotTimer");
        var timerElementsList = [];
        for (var i = 0; i < timerElementNodes.length; i++) {
            timerElementsList.push(timerElementNodes[i]);
        }
        timerElementsList.sort(function(a, b) {
            return a.getAttribute("data-time") > b.getAttribute("data-time");
        });
        for (var i in timerElementsList) {
            timerContainer.appendChild(timerElementsList[i]);
        }
    }

    _tickTimers()
    {
        if (this.tickTimeout) {
            clearTimeout(this.tickTimeout);
        }
        if (!this.activeTimeline) {
            return;
        }
        var fightNow = (new Date() - this.activeTimeline.timebase) / 1000;
        var timerContainer = this.getBodyElement().getElementsByClassName("cactbotTimerContainer")[0];
        var timerElementNodes = timerContainer.getElementsByClassName("cactbotTimer");
        for (var i = 0; i < timerElementNodes.length; i++) {
            var timerTextElement = timerElementNodes[i].getElementsByClassName("cactbotTimerText")[0];
            var time = Math.floor(timerElementNodes[i].getAttribute("data-time") - fightNow);
            if (!this._isValidParseNumber(time)) {
                time = 0;
            }
            timerTextElement.innerText = (time < 10 ? "0" : "") + time;
        }
        // call again
        var t = this;
        this.tickTimeout = setTimeout(function() {
            t._tickTimers();
        }, 1000);
    }

    /**
     * Execute trigger, display alert and tts.
     * @param {object} trigger
     * @param {array} matches
     */
    _executeTrigger(trigger, matches)
    {
        console.log(">> Cactbot (raidboss), trigger, ", trigger, matches);
        // check if recently triggered, ignore if so
        var index = this.activeTriggers.indexOf(trigger);
        if (index > -1 && this.delayTriggers.indexOf(index) > -1) {
            return;
        }
        // add to recent trigger list
        if (index > -1) {
            this.delayTriggers.push(index);
            var t = this;
            // set timeout to remove from recent trigger list
            setTimeout(
                function(i) {
                    var delayTriggerIndex = t.delayTriggers.indexOf(i);
                    if (delayTriggerIndex > -1) {
                        t.delayTriggers.splice(delayTriggerIndex, 1);
                    }
                },
                RETRIGGER_DELAY,
                index
            );
        }
        // get alert element
        var alertElement = this.getBodyElement().getElementsByClassName("cactbotAlert")[0];
        // must have 'myData'
        if (!this.myData) {
            return;
        }
        // check condition
        if ("condition" in trigger) {
            if (!trigger.condition(this.myData, matches)) {
                return;
            }
        }
        // pre run
        if ("preRun" in trigger) {
            trigger.preRun(this.myData, matches);
        }
        // display alert
        var alertTextTypes = ["infoText", "alertText", "alarmText"];
        for (var i in alertTextTypes) {
            if (alertTextTypes[i] in trigger) {
                var alertText = trigger[alertTextTypes[i]];
                if (typeof(alertText) == "function") {
                    alertText = alertText(this.myData, matches);
                }
                if (!alertText) {
                    continue;
                }
                if (typeof(alertText) == "object") {
                    alertText = alertText[CACTBOT_LOCALE_NAME];
                }
                if (typeof(alertText) != "undefined" && alertText) {
                    alertElement.innerText = alertText
                    if (this.userConfig["beep"]) { this._playAlertSound(); }
                    var t = this;
                    if (this.alertTimeout) {
                        clearTimeout(this.alertTimeout)
                    }
                    this.alertTimeout = setTimeout(
                        function() {
                            t.getBodyElement().getElementsByClassName("cactbotAlert")[0].innerText = "";
                        },
                        5000
                    );
                }
            }
        }
        // tts
        if (this.userConfig["tts"] && "tts" in trigger) {
            var tts = trigger.tts;
            if (typeof(tts) == "function") {
                tts = tts(this.myData, matches);
            }
            if (typeof(tts) == "object") {
                tts = tts[CACTBOT_LOCALE_NAME];
            }
            if (typeof(tts) != "undefined" && tts) {
                var u = new SpeechSynthesisUtterance(tts);
                speechSynthesis.speak(u);
            }
        }
        // post run
        if ("run" in trigger) {
            trigger.run(this.myData, trigger);
        }
    }

    /**
     * Play 'alert' sound.
     */
    _playAlertSound()
    {
        var snd = new Audio("data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA//uQZAUAB1WI0PZugAAAAAoQwAAAEk3nRd2qAAAAACiDgAAAAAAABCqEEQRLCgwpBGMlJkIz8jKhGvj4k6jzRnqasNKIeoh5gI7BJaC1A1AoNBjJgbyApVS4IDlZgDU5WUAxEKDNmmALHzZp0Fkz1FMTmGFl1FMEyodIavcCAUHDWrKAIA4aa2oCgILEBupZgHvAhEBcZ6joQBxS76AgccrFlczBvKLC0QI2cBoCFvfTDAo7eoOQInqDPBtvrDEZBNYN5xwNwxQRfw8ZQ5wQVLvO8OYU+mHvFLlDh05Mdg7BT6YrRPpCBznMB2r//xKJjyyOh+cImr2/4doscwD6neZjuZR4AgAABYAAAABy1xcdQtxYBYYZdifkUDgzzXaXn98Z0oi9ILU5mBjFANmRwlVJ3/6jYDAmxaiDG3/6xjQQCCKkRb/6kg/wW+kSJ5//rLobkLSiKmqP/0ikJuDaSaSf/6JiLYLEYnW/+kXg1WRVJL/9EmQ1YZIsv/6Qzwy5qk7/+tEU0nkls3/zIUMPKNX/6yZLf+kFgAfgGyLFAUwY//uQZAUABcd5UiNPVXAAAApAAAAAE0VZQKw9ISAAACgAAAAAVQIygIElVrFkBS+Jhi+EAuu+lKAkYUEIsmEAEoMeDmCETMvfSHTGkF5RWH7kz/ESHWPAq/kcCRhqBtMdokPdM7vil7RG98A2sc7zO6ZvTdM7pmOUAZTnJW+NXxqmd41dqJ6mLTXxrPpnV8avaIf5SvL7pndPvPpndJR9Kuu8fePvuiuhorgWjp7Mf/PRjxcFCPDkW31srioCExivv9lcwKEaHsf/7ow2Fl1T/9RkXgEhYElAoCLFtMArxwivDJJ+bR1HTKJdlEoTELCIqgEwVGSQ+hIm0NbK8WXcTEI0UPoa2NbG4y2K00JEWbZavJXkYaqo9CRHS55FcZTjKEk3NKoCYUnSQ0rWxrZbFKbKIhOKPZe1cJKzZSaQrIyULHDZmV5K4xySsDRKWOruanGtjLJXFEmwaIbDLX0hIPBUQPVFVkQkDoUNfSoDgQGKPekoxeGzA4DUvnn4bxzcZrtJyipKfPNy5w+9lnXwgqsiyHNeSVpemw4bWb9psYeq//uQZBoABQt4yMVxYAIAAAkQoAAAHvYpL5m6AAgAACXDAAAAD59jblTirQe9upFsmZbpMudy7Lz1X1DYsxOOSWpfPqNX2WqktK0DMvuGwlbNj44TleLPQ+Gsfb+GOWOKJoIrWb3cIMeeON6lz2umTqMXV8Mj30yWPpjoSa9ujK8SyeJP5y5mOW1D6hvLepeveEAEDo0mgCRClOEgANv3B9a6fikgUSu/DmAMATrGx7nng5p5iimPNZsfQLYB2sDLIkzRKZOHGAaUyDcpFBSLG9MCQALgAIgQs2YunOszLSAyQYPVC2YdGGeHD2dTdJk1pAHGAWDjnkcLKFymS3RQZTInzySoBwMG0QueC3gMsCEYxUqlrcxK6k1LQQcsmyYeQPdC2YfuGPASCBkcVMQQqpVJshui1tkXQJQV0OXGAZMXSOEEBRirXbVRQW7ugq7IM7rPWSZyDlM3IuNEkxzCOJ0ny2ThNkyRai1b6ev//3dzNGzNb//4uAvHT5sURcZCFcuKLhOFs8mLAAEAt4UWAAIABAAAAAB4qbHo0tIjVkUU//uQZAwABfSFz3ZqQAAAAAngwAAAE1HjMp2qAAAAACZDgAAAD5UkTE1UgZEUExqYynN1qZvqIOREEFmBcJQkwdxiFtw0qEOkGYfRDifBui9MQg4QAHAqWtAWHoCxu1Yf4VfWLPIM2mHDFsbQEVGwyqQoQcwnfHeIkNt9YnkiaS1oizycqJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
        snd.play();
    }

}