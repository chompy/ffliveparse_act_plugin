package main

import (
	"html/template"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/olebedev/emitter"

	"golang.org/x/net/websocket"

	"./act"
)

// HTTPStartServer - Start HTTP server
func HTTPStartServer(port uint16, userManager *act.UserManager, events *emitter.Emitter) {
	// load html templates
	htmlTemplates, err := getTemplates()
	if err != nil {
		log.Panicln("Error occured while loading HTML templates,", err)
	}
	// websocket connection list
	websocketConnections := make([]*websocket.Conn, 0)
	// serve static assets
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./web/static"))))
	// setup websocket connections
	http.Handle("/ws", websocket.Handler(func(ws *websocket.Conn) {
		websocketConnections = append(websocketConnections, ws)
		wsReader(ws, userManager)
	}))
	// setup main page/index
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		sessionID := strings.TrimLeft(r.URL.Path, "/")
		// no session id, assume root, load index.html
		if sessionID == "" {
			io.WriteString(w, "No session key was provided.")
			return
		}
		// fetch user data
		var userData *act.UserData
		if sessionID == "me" {
			ip := strings.Split(r.RemoteAddr, ":")[0]
			userData = userManager.GetFirstUserDataWithIP(ip)
			// user data not found
			if userData == nil {
				io.WriteString(w, "No sessions found.")
				return
			}
		} else {
			userData = userManager.GetUserDataWithSessionID(sessionID)
			// user data not found
			if userData == nil {
				io.WriteString(w, "Session "+sessionID+" was not found.")
				return
			}
		}
		htmlTemplates.Lookup("index.tmpl").Execute(w, userData)
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
		log.Println("Recieved websocket message")
		websocket.Message.Send(ws, "TEST 123")
	}
}

func globalWsWriter(websocketConnections *[]*websocket.Conn, events *emitter.Emitter) {
	for {
		if websocketConnections == nil {
			break
		}
		for event := range events.On("act:updateEncounter") {
			encounter := event.Args[0].(act.Encounter)
			log.Println(encounter.ID)
			for _, websocketConnection := range *websocketConnections {
				websocket.Message.Send(
					websocketConnection,
					"TEST",
				)
			}
		}
	}
}
