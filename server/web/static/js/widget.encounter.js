
/**
 * Encounter data widget
 */
class WidgetEncounter extends WidgetBase
{

    constructor()
    {
        super()
        this.startTime = null;
        this.offset = 6000;
        this.encounterId = "";
        this.combatants = [];
    }

    getName()
    {
        return "encounter";
    }

    getTitle()
    {
        return "Encounter";
    }

    getOptions(){
        var options = super.getOptions();
        var t = this;
        options.push(
            new WidgetOption(
                "Permalink",
                "/static/img/opt_link.png",
                function() {
                    window.location.href += "/" + t.encounterId;
                }
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
        // add encounter timer
        var encounterTimerElement = document.createElement("div");
        encounterTimerElement.classList.add("encounterTime");
        bodyElement.appendChild(encounterTimerElement);
        // add encounter zone
        var encounterZoneElement = document.createElement("div");
        encounterZoneElement.classList.add("encounterZone");
        bodyElement.appendChild(encounterZoneElement);
        // add raid dps
        var encounterRaidDpsElement = document.createElement("div");
        encounterRaidDpsElement.classList.add("encounterRaidDps");
        bodyElement.appendChild(encounterRaidDpsElement);
        // reset
        this.reset();
        // hook events
        var t = this;
        window.addEventListener("act:encounter", function(e) { t._updateEncounter(e); });
        this._tick();
    }

    showOptionHelp()
    {
        var helpText ="";
        helpText += "--- Encounter Widget ---\n";
        helpText += "Displays the current encounter time, zone, and raid DPS.";
        alert(helpText);
    }

    /**
     * Reset the display.
     */
    reset()
    {
        this.combatants = [];
        this.getBodyElement().getElementsByClassName("encounterTime")[0].innerText = "00:00";
        this.getBodyElement().getElementsByClassName("encounterZone")[0].innerText = "(n/a)";
        this.getBodyElement().getElementsByClassName("encounterRaidDps")[0].innerText = "0.0";
    }

    /**
     * Tick the timer and update raid dps.
     */
    _tick()
    {
        // update element
        if (this.startTime) {
            var duration = new Date().getTime() - this.startTime.getTime() + this.offset;
            this.setTimer(duration);
        }
        // run every second
        var t = this;
        setTimeout(function() { t._tick(); }, 1000)
    }

    /**
     * Set timer to provided duration.
     * @param {integer} duration 
     */
    setTimer(duration)
    {
        var minutes = Math.floor(duration / 1000 / 60);
        if (minutes < 0) { minutes = 0; }
        var padMinutes = minutes < 10 ? "0" : "";
        var seconds = Math.floor(duration / 1000 % 60);
        if (seconds < 0) { seconds = 0; }
        var padSeconds = seconds < 10 ? "0" : "";
        this.getBodyElement().getElementsByClassName("encounterTime")[0].innerText = padMinutes + minutes + ":" + padSeconds + seconds;
    }

    /**
     * Update encounter data from act:encounter event.
     * @param {Event} event 
     */
    _updateEncounter(event)
    {
        this.encounterId = event.detail.ID;
        // new encounter active
        if (!this.startTime && event.detail.Active) {
            this.reset();
        }
        // update zone
        this.getBodyElement().getElementsByClassName("encounterZone")[0].innerText = event.detail.Zone;
        // calculate encounter dps
        var encounterDps = event.detail.Damage / ((event.detail.EndTime.getTime() - event.detail.StartTime.getTime()) / 1000);
        if (!this._isValidParseNumber(encounterDps)) {
            encounterDps = 0;
        }
        this.getBodyElement().getElementsByClassName("encounterRaidDps")[0].innerText = encounterDps.toFixed(2);
        // inactive
        if (!event.detail.Active) {
            this.startTime = null;
            this.getBodyElement().classList.remove("active");
            var lastDuration = event.detail.EndTime.getTime() - event.detail.StartTime.getTime();
            this.setTimer(lastDuration);
            return;
        }
        this.startTime = event.detail.StartTime;
        // make active encounter
        this.getBodyElement().classList.add("active");  
    }

}