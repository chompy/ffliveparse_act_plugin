
/**
 * Main application class.
 */
class Application
{

    constructor(webId, encounterId)
    {
        // user web id
        this.webId = webId;
        // encounter id, when provided ignore all data not
        // related to encounter
        this.encounterId = encounterId;
        // list of available widgets
        this.availableWidgets = {};
        // connection flag
        this.connected = false;
        // user config
        this.userConfig = {};
    }

    /**
     * Initalize widgets.
     */
    initWidgets()
    {
        // list available widgets
        this.availableWidgets = {
            "encounter"         : new WidgetEncounter(),
            "parse"             : new WidgetParse(),
            "triggers"          : new WidgetTrigger(),
            "cactbot-triggers"  : new WidgetCactbotTriggers(),
            "skilltimer"        : new WidgetSkilltimer()
        };
        // start installed widgets
        for (var i in this.userConfig["installedWidgets"]) {
            this.availableWidgets[this.userConfig["installedWidgets"][i]].add();
        }
    }

    /**
     * Init user config data.
     */
    initUserConfig()
    {
        // load widget config
        this._loadUserConfig();
        // default installed widgets
        if (!this.userConfig || !("installedWidgets" in this.userConfig)) {
            this.userConfig["installedWidgets"] = ["encounter", "parse"];
            this._saveUserConfig();
        }        
    }

    /**
     * Add config button to top right of page.
     */
    initConfigButton()
    {
        var headerElement = document.getElementById("header");
        var rightElement = headerElement.getElementsByClassName("rightSide")[0];
        var configButton = document.createElement("img");
        configButton.classList.add("configBtn", "hide");
        configButton.title = "Config"
        configButton.alt = "Config";
        configButton.src = "/static/img/opt_config_white_16x16.png";
        rightElement.appendChild(configButton);
        var t = this;
        configButton.addEventListener("click", function(e) {
            t.showConfig();
        });
        configButton.addEventListener("load", function(e) {
            configButton.classList.remove("hide");
        });
    }

    /**
     * Connect to websocket server.
     */
    connect()
    {
        var socketUrl = (window.location.protocol == "https:" ? "wss" : "ws") + "://" + window.location.host + "/ws/" + this.webId;
        if (this.encounterId) {
            socketUrl += "/" + this.encounterId;
        }
        var socket = new WebSocket(socketUrl);
        var t = this;
        socket.onopen = function(event) {
            document.getElementById("loadingMessage").remove();
            console.log(">> Connected to server.");
            t.connected = true;
            t.initUserConfig();
            t.initWidgets();
            t.initConfigButton();
        };
        socket.onmessage = function(event) {
            if (socket.readyState !== 1) {
                return;
            }
            var fileReader = new FileReader();
            fileReader.onload = function(event) {
                var buffer = new Uint8Array(event.target.result);
                try {
                    parseMessage(buffer);
                } catch (e) {
                    console.log(">> Error parsing message,", buf2hex(buffer));
                    throw e
                }
            };
            fileReader.readAsArrayBuffer(event.data);
        };
        socket.onclose = function(event) {
            document.getElementById("errorOverlay").classList.remove("hide");
            console.log(">> Connection closed,", event);
        };
        socket.onerror = function(event) {
            document.getElementById("errorOverlay").classList.remove("hide");
            console.log(">> An error has occured,", event);
        };
        // log incoming data
        var lastEncounterId = null;
        var currentCombatants = [];
        window.addEventListener("act:encounter", function(e) {
            if (e.detail.ID != lastEncounterId) {
                console.log(">> Receieved new encounter, ", e.detail);
                lastEncounterId = e.detail.ID;
                currentCombatants = [];
            }
        });
        window.addEventListener("act:combatant", function(e) {
            if (currentCombatants.indexOf(e.detail.Name) == -1) {
                console.log(">> Receieved new combatant, ", e.detail);
                currentCombatants.push(e.detail.Name);
            }
        });
        // flags
        window.addEventListener("onFlag", function(e) {
            console.log(">> Received flag, ", e.detail);
            if (e.detail.Name == "active") {
                var onlineStatusElement = document.getElementsByClassName("onlineStatus")[0];
                onlineStatusElement.innerText = e.detail.Value ? "Online" : "Offline";
                onlineStatusElement.classList.remove("online");
                onlineStatusElement.title = "ACT was not detected.";
                if (e.detail.Value) {
                    onlineStatusElement.classList.add("online");
                    onlineStatusElement.title = "ACT detected.";
                }
            }
        });
    }    

    /**
     * Open main application configuration modal.
     */
    showConfig()
    {
        Modal.reset();
        Modal.open();

        // widget config
        Modal.addSection("Widgets");
        var widgetConfigElement = document.createElement("div");
        
        // build widget select options
        var buildWidgetSelect = function(name, label, widgetList) {

            // create main widget select element
            var widgetElement = document.createElement("div");
            widgetElement.classList.add("widgetSelect", "widgetSelect-" + name);
            // create label
            var widgetLabel = document.createElement("label");
            widgetLabel.appendChild(
                document.createTextNode(label)
            );
            widgetLabel.setAttribute("for", "widgetSelect-" + name);
            // create select field
            var widgetSelectElement = document.createElement("select");
            widgetSelectElement.id = "widgetSelect-" + name;
            widgetSelectElement.size = 10;
            for (var i in widgetList) {
                var widgetOptionElement = document.createElement("option");
                widgetOptionElement.value = widgetList[i].getName();
                widgetOptionElement.innerText = widgetList[i].getTitle();
                widgetSelectElement.appendChild(widgetOptionElement);
            }
            widgetElement.appendChild(widgetLabel);
            widgetElement.appendChild(widgetSelectElement);
            return widgetElement;
        };

        // build list of installed and not installed widgets
        var installedWidgets = [];
        var notInstalledWidgets = [];
        for (var i in this.userConfig["installedWidgets"]) {
            installedWidgets.push(this.availableWidgets[this.userConfig["installedWidgets"][i]]);
        }
        for (var key in this.availableWidgets) {
            if (this.userConfig["installedWidgets"].indexOf(key) == -1) {
                notInstalledWidgets.push(this.availableWidgets[key]);
            }
        }

        var notInstalledWidgetElement = buildWidgetSelect(
            "available",
            "Available",
            notInstalledWidgets
        );
        var installedWidgetElement = buildWidgetSelect(
            "installed",
            "Installed",
            installedWidgets
        );

        var widgetInstallerElement = document.createElement("div");
        widgetInstallerElement.classList.add("widgetInstallOptions");

        var widgetInstallButton = document.createElement("input");
        widgetInstallButton.type = "button"
        widgetInstallButton.value = "▼";
        widgetInstallButton.title = "Add Widget";
        widgetInstallerElement.appendChild(widgetInstallButton);

        var widgetUninstallButton = document.createElement("input");
        widgetUninstallButton.type = "button"
        widgetUninstallButton.value = "▲";
        widgetUninstallButton.title = "Remove Widget";
        widgetInstallerElement.appendChild(widgetUninstallButton);

        Modal.getModalBodyElement().appendChild(notInstalledWidgetElement);
        Modal.getModalBodyElement().appendChild(widgetInstallerElement);
        Modal.getModalBodyElement().appendChild(installedWidgetElement);

        var clearElement = document.createElement("div");
        clearElement.classList.add("clear");
        Modal.getModalBodyElement().appendChild(clearElement);

        // event listeners
        var t = this;
        // install widget
        widgetInstallButton.addEventListener("click", function(e) {
            var index = notInstalledWidgetElement.getElementsByTagName("select")[0].selectedIndex;
            if (index == -1) {
                return;
            }
            var widgetName = notInstalledWidgetElement.getElementsByTagName("select")[0].childNodes[index].value;
            for (var key in t.availableWidgets) {
                if (t.availableWidgets[key].getName() == widgetName) {
                    t.userConfig["installedWidgets"].push(key);
                    t.availableWidgets[key].add();
                }
            }
            t._saveUserConfig();
            t.showConfig();
        });
        // remove widget
        widgetUninstallButton.addEventListener("click", function(e) {
            var index = installedWidgetElement.getElementsByTagName("select")[0].selectedIndex;
            if (index == -1) {
                return;
            }
            var widgetName = installedWidgetElement.getElementsByTagName("select")[0].childNodes[index].value;
            for (var key in t.availableWidgets) {
                if (t.availableWidgets[key].getName() == widgetName) {
                    var index = t.userConfig["installedWidgets"].indexOf(key);
                    if (index >= 0) {
                        t.userConfig["installedWidgets"].splice(index, 1);
                    }
                    t.availableWidgets[key].remove();
                }
            }
            t._saveUserConfig();
            t.showConfig();
        });

        // debug status
        Modal.addSection("Stats / Debug");
        Modal.addText("Data Recieved: " + (totalBytesRecieved / 1024).toFixed(4) + "KB.");

    }

    /**
     * Load user config from local storage and
     * set userConfig var.
     */
    _loadUserConfig()
    {
        this.userConfig = {};
        var userConfig = JSON.parse(window.localStorage.getItem(USER_CONFIG_LOCAL_STORAGE_KEY));
        if (!userConfig) {
            return;
        }
        if ("_app" in userConfig) {
            this.userConfig = userConfig["_app"];
        }
    }

    /**
     * Save userConfig var to local storage.
     */
    _saveUserConfig()
    {
        var userConfig = JSON.parse(window.localStorage.getItem(USER_CONFIG_LOCAL_STORAGE_KEY));
        if (!userConfig) {
            userConfig = {};
        }
        userConfig["_app"] = this.userConfig;
        window.localStorage.setItem(
            USER_CONFIG_LOCAL_STORAGE_KEY,
            JSON.stringify(userConfig)
        );
    }


}