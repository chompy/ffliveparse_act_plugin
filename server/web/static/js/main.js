document.getElementById("siteHeader").innerHTML = SESSION_ID;

window.addEventListener("load", function(e) {

    var socket = new WebSocket("ws://" + window.location.host + "/ws/" + SESSION_ID);
    socket.onopen = function(event) {
        document.getElementById("loadingMessage").remove();
        console.log(">> Connected to server.");
    };
    socket.onmessage = function(event) {
        console.log(">> Recieved message,", event.data);
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

