package main

import (
	"fmt"
	"html/template"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/olebedev/emitter"
	"github.com/tdewolff/minify"
	"github.com/tdewolff/minify/css"
	"github.com/tdewolff/minify/js"

	"golang.org/x/net/websocket"

	"./act"
)

// templateData - Struct containing data to be made available to html template
type templateData struct {
	UserData      act.UserData
	VersionString string
	ErrorMessage  string
}

// HTTPStartServer - Start HTTP server
func HTTPStartServer(port uint16, userManager *act.UserManager, events *emitter.Emitter, devMode bool) {
	// load html templates
	htmlTemplates, err := getTemplates()
	if err != nil {
		log.Panicln("Error occured while loading HTML templates,", err)
	}
	// websocket connection list
	websocketConnections := make([]*websocket.Conn, 0)
	// serve static assets
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./web/static"))))
	// compile/minify javascript, serve compiled js
	compiledJs, err := compileJavascript()
	if err != nil {
		log.Panicln("Error occured while compiling javascript,", err)
	}
	http.HandleFunc("/app.min.js", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/javascript;charset=utf-8")
		// in dev mode recompile js every request
		if devMode {
			compiledJs, err = compileJavascript()
			if err != nil {
				log.Panicln("Error occured while compiling javascript,", err)
			}
		}
		fmt.Fprint(w, compiledJs)
	})
	// compile/minify css, serve compiled css
	compiledCSS, err := compileCSS()
	if err != nil {
		log.Panicln("Error occured while compiling CSS,", err)
	}
	http.HandleFunc("/app.min.css", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/css;charset=utf-8")
		// in dev mode recompile css every request
		if devMode {
			compiledCSS, err = compileCSS()
			if err != nil {
				log.Panicln("Error occured while compiling CSS,", err)
			}
		}
		fmt.Fprint(w, compiledCSS)
	})
	// setup websocket connections
	http.Handle("/ws/", websocket.Handler(func(ws *websocket.Conn) {
		defer ws.Close()
		// get session id and user data
		sessionID := strings.Split(strings.TrimLeft(ws.Request().URL.Path, "/"), "/")[1]
		userData := userManager.GetUserDataWithSessionID(sessionID)
		if userData == nil {
			return
		}
		log.Println("New web user with session ID", sessionID, "from", ws.RemoteAddr())
		// relay data to new user
		lastEncounter := userData.GetLastEncounter()
		if lastEncounter != nil {
			websocket.Message.Send(ws, act.EncodeEncounterBytes(lastEncounter))
			for _, combatant := range userData.GetCombatantsForEncounter(lastEncounter) {
				websocket.Message.Send(ws, act.EncodeCombatantBytes(combatant))
			}
			for _, combatAction := range userData.GetCombatActionsForEncounter(lastEncounter) {
				websocket.Message.Send(ws, act.EncodeCombatActionBytes(combatAction))
			}
		}
		// add websocket connection to global list
		websocketConnections = append(websocketConnections, ws)
		// listen/wait for incomming messages
		wsReader(ws, userManager)
	}))
	// setup main page/index
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// parse session id from url path
		sessionID := strings.TrimLeft(r.URL.Path, "/")
		// fetch user data
		var userData *act.UserData
		// build template data
		td := templateData{
			VersionString: fmt.Sprintf("%.2f", float32(act.VersionNumber)/100.0),
		}
		// no session id provided
		if sessionID == "" {
			// attempt to fetch user data with ip address
			addresses := make([]string, 1)
			addresses[0] = r.RemoteAddr
			addresses = append(addresses, strings.Split(r.Header.Get("X-Forwarded-For"), ",")...)
			for _, address := range addresses {
				ip := strings.TrimSpace(strings.Split(address, ":")[0])
				userData = userManager.GetLastUserDataWithIP(ip)
				if userData != nil {
					break
				}
			}
			// user data not found
			if userData == nil {
				w.WriteHeader(http.StatusNotFound)
				td.ErrorMessage = "No sessions found."
				htmlTemplates.Lookup("error.tmpl").Execute(w, td)
				return
			}
		} else {
			userData = userManager.GetUserDataWithSessionID(sessionID)
			// user data not found
			if userData == nil {
				w.WriteHeader(http.StatusNotFound)
				td.ErrorMessage = "Session \"" + sessionID + "\" was not found."
				htmlTemplates.Lookup("error.tmpl").Execute(w, td)
				return
			}
		}
		// server main app template
		td.UserData = *userData
		htmlTemplates.Lookup("app.tmpl").Execute(w, td)
	})
	// start thread for sending handling act events and sending data back to ws clients
	go globalWsWriter(&websocketConnections, events)
	// start http server
	http.ListenAndServe(":"+strconv.Itoa(int(port)), nil)
}

func getTemplates() (*template.Template, error) {
	var allFiles []string
	files, err := ioutil.ReadDir("./web/templates")
	if err != nil {
		return nil, err
	}
	for _, file := range files {
		filename := file.Name()
		if strings.HasSuffix(filename, ".tmpl") {
			allFiles = append(allFiles, "./web/templates/"+filename)
		}
	}
	templates, err := template.ParseFiles(allFiles...)
	if err != nil {
		return nil, err
	}
	return templates, nil
}

// compileJavascript - Compile all javascript in to single string that can be served from memory
func compileJavascript() (string, error) {
	log.Println("Compiling and minifying javascript...")
	files, err := ioutil.ReadDir("./web/static/js")
	if err != nil {
		return "", err
	}
	compiledJs := ""
	for _, file := range files {
		filename := file.Name()
		if !strings.HasSuffix(filename, ".js") {
			continue
		}
		js, err := ioutil.ReadFile("./web/static/js/" + filename)
		if err != nil {
			return "", err
		}
		compiledJs += string(js)
	}
	m := minify.New()
	m.AddFunc("text/javascript", js.Minify)
	compiledJs, err = m.String("text/javascript", compiledJs)
	if err != nil {
		return "", err
	}
	log.Println("...Done.")
	return compiledJs, nil
}

// compileCSS - Compile all CSS in to single string that can be served from memory
func compileCSS() (string, error) {
	log.Println("Compiling and minifing CSS...")
	// compile all css in to a single string
	files, err := ioutil.ReadDir("./web/static/css")
	if err != nil {
		return "", err
	}
	compiledCSS := ""
	for _, file := range files {
		filename := file.Name()
		if !strings.HasSuffix(filename, ".css") {
			continue
		}
		js, err := ioutil.ReadFile("./web/static/css/" + filename)
		if err != nil {
			return "", err
		}
		compiledCSS += string(js)
	}
	// minify css string
	m := minify.New()
	m.AddFunc("text/css", css.Minify)
	compiledCSS, err = m.String("text/css", compiledCSS)
	if err != nil {
		return "", err
	}
	log.Println("...Done.")
	return compiledCSS, nil
}

func wsReader(ws *websocket.Conn, userManager *act.UserManager) {
	for {
		if ws == nil || userManager == nil {
			break
		}
		var data []byte
		err := websocket.Message.Receive(ws, &data)
		if err != nil {
			log.Println("Error occured while reading web socket message,", err)
			break
		}
		// nothing todo
		log.Println("Recieved websocket message", data)
	}
}

func globalWsWriter(websocketConnections *[]*websocket.Conn, events *emitter.Emitter) {
	for {
		if websocketConnections == nil {
			break
		}
		for event := range events.On("act:*") {
			for _, websocketConnection := range *websocketConnections {
				websocket.Message.Send(
					websocketConnection,
					event.Args[0],
				)
			}
		}
	}
}
