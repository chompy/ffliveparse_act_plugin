/**
 * Trigger widget
 */
class WidgetTrigger extends WidgetBase
{

    constructor()
    {
        super();
        this.currentZone = "";
        if (!("triggers" in this.userConfig)) {
            this.userConfig["triggers"] = [];
            this._saveUserConfig()
        }
    }

    getName()
    {
        return "trigger";
    }

    getTitle()
    {
        return "Triggers";
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
        var triggerContainerElement = document.createElement("div");
        triggerContainerElement.classList.add("triggerContainer");
        bodyElement.appendChild(triggerContainerElement);
        // hook events
        var t = this;
        window.addEventListener("act:logLine", function(e) { t.processLogLine(e); });
        window.addEventListener("act:encounter", function(e) { t.processEncounter(e); });
    }

    
    showOptionHelp()
    {
        var helpText ="";
        helpText += "--- Trigger Widget ---\n";
        helpText += "Sends notification when a trigger conditions are met.";
        alert(helpText);
    }

    showOptionConfig()
    {
        var t = this;
        Modal.open();
        Modal.reset();
        Modal.addSection("Triggers");
        for (var i in this.userConfig["triggers"]) {
            var trigger = this.userConfig["triggers"][i];
            Modal.addCheckbox(
                "trigger-" + i,
                "[" + trigger.category + "] " + trigger.message + " (" + trigger.regex + ")"
            );
        }
        if (this.userConfig["triggers"].length == 0) {
            Modal.addText("(no triggers)");
        }
        Modal.addButtons(
            {
                "deleteSelected"    : "Delete Selected",
                "deleteAll"         : "Delete ALL"
            },
            function(name) {
                t.triggerButtonPress(name);
            }
        )
        Modal.addSection("XML Import");
        Modal.addTextArea("xmlText")
        Modal.addButtons(
            {
                "addXml" : "Import"
            },
            function(e) {
                t.importXml(
                    Modal.getModalBodyElement().getElementsByClassName("modalTextArea-xmlText")[0].getElementsByTagName("textarea")[0].value
                );
            }
        );
    }

    processLogLine(event)
    {
        for (var i in this.userConfig["triggers"]) {
            var trigger = this.userConfig["triggers"][i];
            // restrict trigger to specific zone
            if (trigger.restrictZone && this.currentZone != trigger.category) {
                continue;
            }
            // check regex
            if (event.detail.LogLine.match(trigger.regex)) {
                this.addTriggerMessage(trigger.message);
            }
        }
    }

    processEncounter(event)
    {
        this.currentZone = event.detail.Zone;
    }

    /**
     * Add new trigger message, display and speak it.
     * @param {string} message 
     */
    addTriggerMessage(message)
    {
        var triggerItemElement = document.createElement("div");
        triggerItemElement.classList.add("triggerItem");
        var triggerItemIconElement = document.createElement("div");
        triggerItemIconElement.classList.add("triggerItemIcon");
        var triggerItemIconImageElement = document.createElement("img");
        triggerItemIconImageElement.src = "/static/img/ico_speak.png";
        triggerItemIconImageElement.alt = "Trigger Display";
        var triggerItemMessageElement = document.createElement("div");
        triggerItemMessageElement.classList.add("triggerItemMessage")
        triggerItemMessageElement.innerText = message;
        triggerItemIconElement.appendChild(triggerItemIconImageElement);
        triggerItemElement.appendChild(triggerItemIconElement);
        triggerItemElement.appendChild(triggerItemMessageElement);
        this.getBodyElement().getElementsByClassName("triggerContainer")[0].appendChild(triggerItemElement);
        var u = new SpeechSynthesisUtterance(message);
        speechSynthesis.speak(u);
        u.addEventListener("end", function() {
            setTimeout(function() {
                triggerItemElement.remove();
            }, 1000);
        });
    }

    /**
     * Import XML trigger from ACT.
     * @param {string} xml 
     */
    importXml(xml)
    {
        var xmlDoc;
        var parser = new DOMParser();
        try {
            // parse xml
            var xmlDoc = parser.parseFromString(xml, "text/xml");
            var triggerType = xmlDoc.firstChild.getAttribute("ST");
            if (triggerType != 3) {
                alert("Only TTS triggers are supported at this time.");
                return
            }
            var regex = xmlDoc.firstChild.getAttribute("R");
            var message = xmlDoc.firstChild.getAttribute("SD");
            var category = xmlDoc.firstChild.getAttribute("C");
            var restrictToZoneCategory = xmlDoc.firstChild.getAttribute("CR") == "T";
            // check if trigger already exists
            for (var i in this.userConfig["triggers"]) {
                var trigger = this.userConfig["triggers"][i];
                if (regex == trigger.regex && trigger.category == category && trigger.message == message) {
                    alert("Trigger already added.");
                    return;
                }
            }
            // add trigger
            this.userConfig["triggers"].push({
                "regex"         : regex,
                "type"          : "tts",
                "message"       : message,
                "category"      : category,
                "restrictZone"  : restrictToZoneCategory
            });
            console.log(">> Added trigger, ", this.userConfig["triggers"][this.userConfig["triggers"].length - 1]);
            this._saveUserConfig();
            this.showOptionConfig();
        } catch (e) {
            alert("Invalid XML snippet.");
            throw e;
        }
    }

    triggerButtonPress(name)
    { 
        switch (name)
        {
            case "deleteSelected":
            {
                for (var i in this.userConfig["triggers"]) {
                    var checkboxElement = Modal.getModalBodyElement().getElementsByClassName("modalCheckbox-trigger-" + i)[0].getElementsByTagName("input")[0];
                    if (checkboxElement && checkboxElement.checked) {
                        this.userConfig["triggers"].splice(i, 1);
                    }
                }
                this._saveUserConfig();
                this.showOptionConfig();
                break;
            }
            case "deleteAll":
            {
                if (confirm("Are you sure you want to delete ALL your triggers?")) {
                    this.userConfig["triggers"] = [];
                    this._saveUserConfig();
                    this.showOptionConfig();
                }
                break;
            }
        }
    }

}