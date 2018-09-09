document.getElementById("siteHeader").innerHTML = window.location.host + "/" + SESSION_ID;
window.addEventListener("load", function(e) {

    var socket = new WebSocket("ws://" + window.location.host + "/ws/" + SESSION_ID);
    socket.onopen = function(event) {
        document.getElementById("loadingMessage").remove();
        console.log(">> Connected to server.");
        // add widgets
        new WidgetEncounter().add();
        new WidgetParse().add();
    };
    socket.onmessage = function(event) {
        var fileReader = new FileReader();
        fileReader.onload = function(event) {
            var byteArray = new Uint8Array(event.target.result);
            var data = parseMessage(byteArray);
            console.log(">> Recieved message,", data);
        };
        fileReader.readAsArrayBuffer(event.data);
    };
    socket.onclose = function(event) {
        document.getElementById("errorOverlay").classList.remove("hide");
        console.log(">> Connection closed.");
    };
    socket.onerror = function(event) {
        document.getElementById("errorOverlay").classList.remove("hide");
        console.log(">> An error has occured.");
    };

});

