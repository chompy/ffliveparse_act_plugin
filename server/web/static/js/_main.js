window.addEventListener("load", function(e) {
    var socketUrl = (window.location.protocol == "https:" ? "wss" : "ws") + "://" + window.location.host + "/ws/" + WEB_ID;
    if (ENCOUNTER_ID) {
        socketUrl += "/" + ENCOUNTER_ID;
    }
    var socket = new WebSocket(socketUrl);
    socket.onopen = function(event) {
        document.getElementById("loadingMessage").remove();
        console.log(">> Connected to server.");
        // add widgets
        new WidgetEncounter().add();
        new WidgetParse().add();
        new WidgetTrigger().add();
        new WidgetCactbotRaidboss().add();
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
});
