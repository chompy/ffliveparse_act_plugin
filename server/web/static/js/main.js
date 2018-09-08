document.getElementById("siteHeader").innerHTML = SESSION_ID;

window.addEventListener("load", function(e) {

    var socket = new WebSocket("ws://" + window.location.host + "/ws/" + SESSION_ID);
    socket.onopen = function(event) {
        document.getElementById("loadingMessage").remove();
        console.log(">> Connected to server.");
    };
    socket.onmessage = function(event) {
        var fileReader = new FileReader();
        fileReader.onload = function(event) {
            var uint8Array = new Uint8Array(event.target.result);
            console.log(uint8Array[0]);
            console.log(">> Recieved message,", uint8Array);
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

