window.addEventListener("load", function(e) {
    var socket = new WebSocket(
        (window.location.protocol == "https:" ? "wss" : "ws") + "://" + window.location.host + "/ws/" + WEB_ID
    );
    socket.onopen = function(event) {
        document.getElementById("loadingMessage").remove();
        console.log(">> Connected to server.");
        // add widgets
        new WidgetEncounter().add();
        new WidgetParse().add();
        //new WidgetTrigger().add();
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
                var pos = parseMessage(buffer);
                if (pos <= 0) {
                    console.log(">> Invalid message recieved,", buf2hex(buffer));
                    return;
                }
            } catch (e) {
                console.log(">> Error parsing message,", buf2hex(buffer));
            }
            /*if (data.Type != DATA_TYPE_LOG_LINE) {
                console.log(">> Recieved message,", data);
            }*/
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
});
