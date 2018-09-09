
/**
 * Parse widget
 */
class WidgetParse extends WidgetBase
{

    constructor()
    {
        super()
        this.encounterStartTime = null;
        this.encounterEndTime = null;
        this.encounterOffset = 6000;
        this.combatants = [];
    }

    getName()
    {
        return "parse";
    }

    getTitle()
    {
        return "Parse";
    }

    add()
    {
        super.add()
        var bodyElement = this.getBodyElement();
        if (!bodyElement) {
            return;
        }
        // add parse columns
        var parseColumnsElement = document.createElement("div");
        parseColumnsElement.classList.add("parseColumns");
        var columns = ["Job", "DPS", "HPS", "Deaths"];
        for (var i in columns) {
            var parseColumnElement = document.createElement("div");
            parseColumnElement.classList.add("parseColumn" + columns[i]);
            parseColumnElement.innerText = columns[i];
            parseColumnsElement.appendChild(parseColumnElement);
        }
        bodyElement.appendChild(parseColumnsElement);

        // add combatant container
        var combatantsElement = document.createElement("div");
        combatantsElement.classList.add("parseCombatants");
        bodyElement.appendChild(combatantsElement);
        // reset
        this.reset();
        // hook events
        var t = this;
        window.addEventListener("act:encounter", function(e) { t.updateEncounter(e); });
        window.addEventListener("act:combatant", function(e) { t.updateCombatants(e); });
    }

    showOptionHelp()
    {
        var helpText ="";
        helpText += "--- Parse Widget ---\n";
        helpText += "Displays parses for every allied combatant.";
        alert(helpText);
    }

    /**
     * Reset all elements.
     */
    reset()
    {
        this.getBodyElement().getElementsByClassName("parseCombatants")[0].innerHTML = "";
        this.encounterStartTime = null;
        this.encounterEndTime = null;
    }

    /**
     * Build empty combatant element.
     */
    _buildCombatantElement()
    {
        var element = document.createElement("div");
        element.classList.add("parseCombatant");
        // job icon
        var jobIconElement = document.createElement("div");
        jobIconElement.classList.add("parseCombatantJob");
        var jobIconImageElement = document.createElement("img");
        jobIconImageElement.classList.add("parseCombatantJobImage");
        jobIconElement.appendChild(jobIconImageElement);
        element.appendChild(jobIconElement);
        // damage
        var damageElement = document.createElement("div");
        damageElement.classList.add("parseCombatantDamage");
        element.appendChild(damageElement);
        // dps
        var dpsElement = document.createElement("span");
        dpsElement.classList.add("parseCombatantDps");
        damageElement.appendChild(dpsElement)
        // damage percent
        var damagePercentElement = document.createElement("span");
        damagePercentElement.classList.add("parseCombatantDamagePercent");
        damageElement.appendChild(damagePercentElement);
        // healing
        var healingElement = document.createElement("div");
        healingElement.classList.add("parseCombatantHealing");
        element.appendChild(healingElement);        
        // hps
        var hpsElement = document.createElement("span");
        hpsElement.classList.add("parseCombatantHps");
        healingElement.appendChild(hpsElement);
        // healing percent
        var healingPercentElement = document.createElement("span");
        healingPercentElement.classList.add("parseCombatantHealingPercent");
        healingElement.appendChild(healingPercentElement);
        // deaths
        var deathsElement = document.createElement("div");
        deathsElement.classList.add("parseCombatantDeaths");
        element.appendChild(deathsElement);
        return element;
    }

    /**
     * Update combatant element.
     * @param {array} combatant 
     * @param {Element} element 
     * @param {integer} duration 
     */
    updateCombatantElement(combatant, element, duration)
    {
        // update job icon
        var jobIconElement = element.getElementsByClassName("parseCombatantJobImage")[0];
        var jobIconSrc = "/static/img/job_" + combatant.Job.toLowerCase() + ".png";
        if (jobIconSrc != jobIconElement.src) {
            jobIconElement.src = jobIconSrc;
            jobIconElement.title = combatant.Job.toUpperCase() + " - " + combatant.Name;
            jobIconElement.alt = combatant.Job.toUpperCase() + " - " + combatant.Name;
        }
        // update dps
        var dpsElement = element.getElementsByClassName("parseCombatantDps")[0];
        var dps = (combatant.Damage / (duration / 1000));
        if (dps < 0) {
            dps = 0;
        }
        dpsElement.innerText = dps.toFixed(2);
        // update hps
        var hpsElement = element.getElementsByClassName("parseCombatantHps")[0];
        var hps = (combatant.DamageHealed / (duration / 1000));
        if (hps < 0) {
            hps = 0;
        }
        hpsElement.innerText = hps.toFixed(2);
        // update deaths
        var deathsElement = element.getElementsByClassName("parseCombatantDeaths")[0];
        deathsElement.innerText = combatant.Deaths;

        // update percents
        var damageTotal = 0;
        var healingTotal = 0;
        for (var i in this.combatants) {
            damageTotal += this.combatants[i][0].Damage;
            healingTotal += this.combatants[i][0].DamageHealed;
        }
        // update damage percent
        var damagePercentElement = element.getElementsByClassName("parseCombatantDamagePercent")[0];
        var damagePercent = Math.floor(combatant.Damage * (100 / damageTotal));
        if (!damagePercent) {
            damagePercent = 0;
        }
        damagePercentElement.innerText = damagePercent + "%";

        // update healing percent
        var healingPercentElement = element.getElementsByClassName("parseCombatantHealingPercent")[0];
        var healingPercent = Math.floor(combatant.DamageHealed * (100 / healingTotal));
        if (!healingPercent) {
            healingPercent = 0;
        }
        healingPercentElement.innerText = healingPercent + "%";

    }

    /**
     * Update main combatant container.
     */
    displayCombatants()
    {
        var combatantContainerElement = this.getBodyElement().getElementsByClassName("parseCombatants")[0];
        for (var i = 0; i < this.combatants.length; i++) {
            combatantContainerElement.appendChild(this.combatants[i][1]);
        }
    }

    /**
     * Get duration of encounter.
     */
    getDuration()
    {
        if (!this.encounterStartTime) {
            return 0;
        }
        if (this.encounterEndTime) {
            return this.encounterEndTime.getTime() - this.encounterStartTime.getTime();
        }
        return new Date().getTime() - this.encounterStartTime.getTime() + this.encounterOffset;
    }

    updateEncounter(event)
    {
        // new encounter active
        if (this.encounterEndTime && event.detail.Active) {
            this.reset();
        }
        // inactive
        if (!event.detail.Active) {
            this.encounterEndTime = event.detail.EndTime;
        }
        this.encounterStartTime = event.detail.StartTime;
        // update combatant elements
        for (var i in this.combatants) {
            this.updateCombatantElement(
                this.combatants[i][0],
                this.combatants[i][1],
                this.getDuration()
            )
        }
        // display combatants
        this.displayCombatants();
    }

    updateCombatants(event)
    {
        var combatant = event.detail;
        // update existing
        for (var i = 0; i < this.combatants.length; i++) {
            if (this.combatants[i][0].Name == combatant.Name) {
                this.combatants[i][0] = combatant;
                this.updateCombatantElement(
                    combatant,
                    this.combatants[i][1],
                    this.getDuration()
                );
                this.displayCombatants();
                return;
            }
        }
        // new combatant
        var combatantElement = this._buildCombatantElement(combatant);
        this.combatants.push([
            combatant,
            combatantElement
        ]);
        // update combatant element
        this.updateCombatantElement(
            combatant,
            combatantElement,
            this.getDuration()
        );
        // display
        this.displayCombatants();
    }

}