var DATA_PATH = "/static/lib/cactbot/ui/raidboss/data";
var LOAD_SCRIPTS = [
    "/static/lib/cactbot/ui/raidboss/timeline.js",
    "/static/lib/cactbot/resources/regexes.js"
]

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
        this.ready = false;
        this.activeTimeline = null;
        this.tickTimeout = null;
    }

    getName()
    {
        return "cactbot-raidboss";
    }

    getTitle()
    {
        return "Cactbot (raidboss)";
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
        this.activeTimeline = null;
        this.getBodyElement().getElementsByClassName("cactbotTimerContainer")[0].innerHTML = "";
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
        if (!event.detail.Active) {
            this.reset();
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
        this.activeTimeline.OnLogLine(event.detail.LogLine);
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
                this.activeTimeline.SetAddTimer(function(currentTime, eventData, active) {
                    console.log(">> Cactbot (raidboss), new timer, ", currentTime, eventData, active);
                    t._setTimer(currentTime, eventData, active);
                });
                this.activeTimeline.SetRemoveTimer(function(eventData, expired) {
                    console.log(">> Cactbot (raidboss), remove timer, ", eventData, expired);
                    t._removeTimer(eventData, expired);
                });

                // TEST
                //this.activeTimeline.OnLogLine(":Kefka:28C2:");
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
            return a.getAttribute("data-sort") > b.getAttribute("data-sort");
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
            timerTextElement.innerText = (time < 10 ? "0" : "") + time;
        }
        // call again
        var t = this;
        this.tickTimeout = setTimeout(function() {
            t._tickTimers();
        }, 1000);
    }

}