
var PARSE_AVAILABLE_COLUMNS = [
    [
        "Job",
        "job",
    ],
    [
        "Name",
        "name"
    ],
    [
        "DPS (%)",
        "damage",
    ],
    [
        "HPS (%)",
        "healing"
    ],
    [
        "Deaths",
        "deaths"
    ]
];

/**
 * Parse widget
 */
class WidgetParse extends WidgetBase
{

    constructor()
    {
        super();
        this.encounterStartTime = null;
        this.encounterEndTime = null;
        this.encounterOffset = 6000;
        this.combatants = [];
        if (!("showColumns" in this.userConfig)) {
            this.userConfig["showColumns"] = [
                "job", "damage", "healing", "deaths"
            ];
            this._saveUserConfig()
        }
        if (!("sortBy" in this.userConfig)) {
            this.userConfig["sortBy"] = "damage";
            this._saveUserConfig();
        }
    }

    getName()
    {
        return "parse";
    }

    getTitle()
    {
        return "Parse";
    }

    getOptions()
    {
        var options = super.getOptions();
        var t = this;
        options.push(
            new WidgetOption(
                "Configuration",
                "/static/img/opt_config.png",
                function() { t.showOptionConfig(); }
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
        // add parse columns
        var parseColumnsElement = document.createElement("div");
        parseColumnsElement.classList.add("parseColumnHeads");
        for (var i in PARSE_AVAILABLE_COLUMNS) {
            var parseColumnElement = document.createElement("div");
            parseColumnElement.classList.add(
                "parseColumn",
                "parseColumn-" + PARSE_AVAILABLE_COLUMNS[i][1],
            );
            parseColumnElement.innerText = PARSE_AVAILABLE_COLUMNS[i][0];
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
        this.combatants = [];
        this.encounterStartTime = null;
        this.encounterEndTime = null;
    }

    /**
     * Given column name and combatant get element for value.
     * @param {string} columnName 
     */
    _getColumnElement(columnName)
    {
        var element = document.createElement("div");
        element.classList.add(
            "parseColumn",
            "parseColumn-" + columnName
        );
        switch (columnName)
        {
            case "job":
            {
                element.classList.add("parseCombatantJob");
                var jobIconImageElement = document.createElement("img");
                jobIconImageElement.classList.add("parseCombatantJobImage", "loading");
                element.appendChild(jobIconImageElement);
                jobIconImageElement.addEventListener("load", function(e) {
                    e.target.classList.remove("loading");
                });
                jobIconImageElement.addEventListener("error", function(e) {
                    e.target.src = "/static/img/job_none.png";
                });
                break;
            }
            case "name":
            {
                element.classList.add("parseCombatantName");
                break;
            }
            case "damage":
            {
                element.classList.add("parseCombatantDamage");
                var dpsElement = document.createElement("span");
                dpsElement.classList.add("parseCombatantDps");
                element.appendChild(dpsElement)
                var damagePercentElement = document.createElement("span");
                damagePercentElement.classList.add("parseCombatantDamagePercent");
                element.appendChild(damagePercentElement);
                break;
            }
            case "healing":
            {
                element.classList.add("parseCombatantHealing");
                var hpsElement = document.createElement("span");
                hpsElement.classList.add("parseCombatantHps");
                element.appendChild(hpsElement);
                var healingPercentElement = document.createElement("span");
                healingPercentElement.classList.add("parseCombatantHealingPercent");
                element.appendChild(healingPercentElement);
                break;
            }
            case "deaths":
            {
                element.classList.add("parseCombatantDeaths");
                break;
            }
        }
        return element;
    }

    /**
     * Build empty combatant element.
     */
    _buildCombatantElement()
    {
        var element = document.createElement("div");
        element.classList.add("parseCombatant");
        for (var i in PARSE_AVAILABLE_COLUMNS) {
            element.appendChild(
                this._getColumnElement(PARSE_AVAILABLE_COLUMNS[i][1])
            );
        }
        return element;
    }

    /**
     * Update combatant element.
     * @param {array} combatant 
     * @param {Element} element 
     * @param {integer} duration 
     */
    _updateCombatantElement(combatant, element, duration)
    {
        // calculate percents
        var damageTotal = 0;
        var healingTotal = 0;
        for (var i in this.combatants) {
            damageTotal += this.combatants[i][0].Damage;
            healingTotal += this.combatants[i][0].DamageHealed;
        }
        // itterate columns, update values
        for (var i in PARSE_AVAILABLE_COLUMNS) {
            var colElement = element.getElementsByClassName("parseColumn-" + PARSE_AVAILABLE_COLUMNS[i][1])[0];
            if (!colElement) { continue; }
            switch (PARSE_AVAILABLE_COLUMNS[i][1])
            {
                case "job":
                {
                    var jobIconElement = colElement.getElementsByClassName("parseCombatantJobImage")[0];
                    var jobIconSrc = "/static/img/job_" + combatant.Job.toLowerCase() + ".png";
                    if (jobIconSrc != jobIconElement.src) {
                        jobIconElement.src = jobIconSrc;
                        jobIconElement.title = combatant.Job.toUpperCase() + " - " + combatant.Name;
                        jobIconElement.alt = combatant.Job.toUpperCase() + " - " + combatant.Name;
                    }
                    break;
                }
                case "damage":
                {
                    // dps
                    var dpsElement = colElement.getElementsByClassName("parseCombatantDps")[0];
                    var dps = (combatant.Damage / (duration / 1000));
                    if (isNaN(dps) || !dps || dps < 0) {
                        dps = 0;
                    }
                    dpsElement.innerText = dps.toFixed(2);
                    // damage percent
                    var damagePercentElement = colElement.getElementsByClassName("parseCombatantDamagePercent")[0];
                    var damagePercent = Math.floor(combatant.Damage * (100 / damageTotal));
                    if (isNaN(damagePercent) || !damagePercent || damagePercent < 0) {
                        damagePercent = 0;
                    }
                    damagePercentElement.innerText = damagePercent + "%";
                    break;
                }
                case "healing":
                {
                    // hps
                    var hpsElement = colElement.getElementsByClassName("parseCombatantHps")[0];
                    var hps = (combatant.DamageHealed / (duration / 1000));
                    if (isNaN(hps) || !hps || hps < 0) {
                        hps = 0;
                    }
                    hpsElement.innerText = hps.toFixed(2);
                    // healing percent
                    var healingPercentElement = colElement.getElementsByClassName("parseCombatantHealingPercent")[0];
                    var healingPercent = Math.floor(combatant.DamageHealed * (100 / healingTotal));
                    if (isNaN(healingPercent) || !healingPercent || healingPercent < 0) {
                        healingPercent = 0;
                    }
                    healingPercentElement.innerText = healingPercent + "%";
                    break;
                }
                case "deaths":
                {
                    colElement.innerText = combatant.Deaths;
                    break;
                }
                case "name":
                {
                    colElement.innerText = combatant.Name;
                    break;
                }
            }
        }
    }

    /**
     * Update visiblity of columns based on user config.
     */
    _updateColumnVisiblity()
    {
        var visibleCols = this.userConfig["showColumns"].length;
        for (var i in PARSE_AVAILABLE_COLUMNS) {
            var index = this.userConfig["showColumns"].indexOf(PARSE_AVAILABLE_COLUMNS[i][1]);
            var colElements = this.getBodyElement().getElementsByClassName("parseColumn-" + PARSE_AVAILABLE_COLUMNS[i][1]);
            if (!colElements) {
                continue;
            }
            for (var j = 0; j < colElements.length; j++) {
                if (index != -1) {
                    colElements[j].classList.remove("hide");
                    colElements[j].style.width = ((Math.floor(100 / visibleCols)) - (4) ) + "%";
                    continue;
                }
                colElements[j].classList.add("hide");
            }
        }
    }

    /**
     * Update main combatant container.
     */
    displayCombatants()
    {
        var combatantContainerElement = this.getBodyElement().getElementsByClassName("parseCombatants")[0];
        var duration = this.getDuration();
        this.combatants.sort(function(a, b) {
            switch (this.userConfig["sortBy"])
            {
                case "healing":
                {
                    var aHps = (a[0].DamageHealed / (duration / 1000));
                    var bHps = (b[0].DamageHealed / (duration / 1000));
                    return bHps - aHps;
                }
                case "deaths":
                {
                    return b[0].Deaths - a[0].Deaths;
                }
                case "name":
                {
                    return a[0].Name.localeCompare(b[0].Name);
                }
                default:
                case "damage":
                {
                    var aDps = (a[0].Damage / (duration / 1000));
                    var bDps = (b[0].Damage / (duration / 1000));
                    return bDps - aDps;
                }
            }

        })
        for (var i = 0; i < this.combatants.length; i++) {
            combatantContainerElement.appendChild(this.combatants[i][1]);
        }
        this._updateColumnVisiblity();
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
            this._updateCombatantElement(
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
                this._updateCombatantElement(
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
        this._updateCombatantElement(
            combatant,
            combatantElement,
            this.getDuration()
        );
        // display
        this.displayCombatants();
    }

    showOptionConfig()
    {
        var t = this;
        Modal.reset();
        Modal.open();
        // parse column selection
        Modal.addSection("Parse Columns");
        for (var i in PARSE_AVAILABLE_COLUMNS) {
            Modal.addCheckbox(
                PARSE_AVAILABLE_COLUMNS[i][1],
                PARSE_AVAILABLE_COLUMNS[i][0],
                this.userConfig["showColumns"].indexOf(PARSE_AVAILABLE_COLUMNS[i][1]) != -1,
                function(name, checked) {
                    var index = t.userConfig["showColumns"].indexOf(name);
                    if (checked && index == -1) {
                        t.userConfig["showColumns"].push(name);
                    } else if (!checked && index != -1) {
                        t.userConfig["showColumns"].splice(index, 1);
                    }
                    t._saveUserConfig();
                    t._updateColumnVisiblity();
                }
            );
        }
        // sort
        Modal.addSection("Sort");

        var choices = {};
        for (var i in PARSE_AVAILABLE_COLUMNS) {
            choices[PARSE_AVAILABLE_COLUMNS[i][1]] = PARSE_AVAILABLE_COLUMNS[i][0];
        }
        Modal.addChoices(
            "sort",
            choices,
            this.userConfig["sortBy"],
            function(name, value) {
                t.userConfig["sortBy"] = value;
                t._saveUserConfig();
                t.displayCombatants();
            }
        );
    }

}