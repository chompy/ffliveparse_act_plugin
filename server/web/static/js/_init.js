// init main app
var application = new Application(WEB_ID, ENCOUNTER_ID);
window.addEventListener("load", function(e) {
    application.connect();
});

// load textdecoder polyfill
if (typeof(window["TextDecoder"]) == "undefined") {
    var bodyElement = document.getElementsByTagName("body")[0];
    var textEncoderPolyfills = [
        "https://unpkg.com/text-encoding@0.6.4/lib/encoding-indexes.js",
        "https://unpkg.com/text-encoding@0.6.4/lib/encoding.js"
    ];
    for (var i = 0; i < textEncoderPolyfills.length; i++) {
        var scriptElement = document.createElement("script");
        scriptElement.src = textEncoderPolyfills[i];
        bodyElement.appendChild(scriptElement);
    }
}

