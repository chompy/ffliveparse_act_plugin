
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
        this.lastDuration = 0;
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
        window.addEventListener("act:encounter", function(e) { t.updateEncounter(e); });
        window.addEventListener("act:combatant", function(e) { t.updateCombatants(e); });
        this.tick();
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
    tick()
    {
        // update element
        if (this.startTime) {
            var duration = new Date().getTime() - this.startTime.getTime() + this.offset;
            this.setTimer(duration);
            this.setRaidDps(duration);
        }
        // run every second
        var t = this;
        setTimeout(function() { t.tick(); }, 1000)
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
     * Calculate raid dps based on duration.
     * @param {integer} duration 
     */
    setRaidDps(duration)
    {
        var totalDamage = 0;
        if (this.combatants) {
            for (var i = 0; i < this.combatants.length; i++) {
                totalDamage += this.combatants[i].Damage;
            }
        }
        if (isNaN(totalDamage) || !totalDamage || totalDamage < 0) {
            totalDamage = 0;
        }
        this.getBodyElement().getElementsByClassName("encounterRaidDps")[0].innerText = (totalDamage / (duration / 1000)).toFixed(2);
    }

    /**
     * Update encounter data from act:encounter event.
     * @param {Event} event 
     */
    updateEncounter(event)
    {
        // new encounter active
        if (!this.startTime && event.detail.Active) {
            this.reset();
        }
        // update zone
        this.getBodyElement().getElementsByClassName("encounterZone")[0].innerText = event.detail.Zone;
        // inactive
        if (!event.detail.Active) {
            this.startTime = null;
            this.getBodyElement().classList.remove("active");
            this.lastDuration = event.detail.EndTime.getTime() - event.detail.StartTime.getTime();
            this.setTimer(this.lastDuration);
            this.setRaidDps(this.lastDuration);
            return;
        }
        this.startTime = event.detail.StartTime;
        //this.offset = event.detail.EndTime.getTime() - new Date().getTime();
        this.getBodyElement().classList.add("active");  
    }

    /**
     * Update combatant data from act:combatant event.
     * @param {Event} event 
     */
    updateCombatants(event)
    {
        var combatant = event.detail;
        for (var i = 0; i < this.combatants.length; i++) {
            if (this.combatants[i].Name == combatant.Name) {
                this.combatants[i] = combatant;
                return;
            }
        }
        this.combatants.push(combatant);
        if (!this.startTime && this.lastDuration > 0)  {
            this.setRaidDps(this.lastDuration);
        }
    }

}