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
        this.activeTriggers = null;
        this.tickTimeout = null;
        this.alertTimeout = null;
        this.myData = null;
        if (!("characterName" in this.userConfig)) {
            this.userConfig["characterName"] = null;
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
            this.activeTriggers = null;
            this.myData = null;
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
        Modal.addText(
            "name",
            "Character Name",
            t.userConfig["characterName"],
            function(name, value) {
                t.userConfig["characterName"] = value.trim();
                t._saveUserConfig();
            }
        );
        Modal.addCheckbox(
            "tts",
            "Enable TTS Alerts",
            this.userConfig["tts"],
            function(name, checked) {
                t.userConfig["tts"] = checked;
                t._saveUserConfig();
            }
        )
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
            for (var i in this.activeTriggers.triggers) {
                var trigger = this.activeTriggers.triggers[i];
                var matches = event.detail.LogLine.match(trigger.regex);
                if (matches) {
                    if ("delaySeconds" in trigger) {
                        var t = this;
                        setTimeout(
                            function(trigger) { t._displayAlert(trigger, matches); },
                            trigger.delaySeconds * 1000,
                            trigger,
                            matches
                        );
                        return;
                    }
                    this._displayAlert(trigger, matches);
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
            event.detail.Name == this.userConfig["characterName"] &&
            (
                !this.myData || this.myData.me != event.detail.Name || this.myData.job != event.detail.Job
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
                "me"        : this.userConfig["characterName"],
                "job"       : event.detail.Job.toUpperCase(),
                "role"      : myRole,
                "lang"      : CACTBOT_LOCALE_NAME,
                "currentHP" : 1,
                "ShortName" : function(name) { return name; },
                ParseLocaleFloat: parseFloat,
            };
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
        //this.zoneName = "Sigmascape V4.0 (Savage)";

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
                this.activeTriggers = this.triggers[key];
                this.activeTimeline.SetAddTimer(function(currentTime, eventData, active) {
                    console.log(">> Cactbot (raidboss), new timer, ", currentTime, eventData, active);
                    t._setTimer(currentTime, eventData, active);
                });
                this.activeTimeline.SetRemoveTimer(function(eventData, expired) {
                    console.log(">> Cactbot (raidboss), remove timer, ", eventData, expired);
                    t._removeTimer(eventData, expired);
                });
                // TEST
                /*
                this.activeTimeline.OnLogLine(" 15:........:Kefka:28EC:");
                setTimeout(
                    function() {
                        t._onLogLine({"detail" : {"LogLine" : "Kefka starts using Future's End"}});
                    },
                    1000
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
     * Display trigger alert and tts.
     * @param {object} trigger
     * @param {array} matches
     */
    _displayAlert(trigger, matches)
    {
        var alertElement = this.getBodyElement().getElementsByClassName("cactbotAlert")[0];
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
                    if (!(CACTBOT_LOCALE_NAME in alertText)) {
                        continue;
                    }
                    alertText = alertText[CACTBOT_LOCALE_NAME];
                }
                if (alertText) {
                    alertElement.innerText = trigger[alertTextTypes[i]][CACTBOT_LOCALE_NAME];
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
                tts = tts(this.myData);
            }
            if (typeof(tts) == "object") {
                tts = tts[CACTBOT_LOCALE_NAME];
            }
            if (tts) {
                var u = new SpeechSynthesisUtterance(tts);
                speechSynthesis.speak(u);
            }
        }
        // post run
        if ("run" in trigger) {
            trigger.run(this.myData, trigger);
        }
    }

}