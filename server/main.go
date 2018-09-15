package main

import (
	"flag"
	"log"

	"github.com/olebedev/emitter"

	"./act"
	"./app"
	"./user"
)

// ActListenUDPPort - Port act server will listen on
const ActListenUDPPort uint16 = 31593

// HTTPListenTCPPort - Port http server will listen on
const HTTPListenTCPPort uint16 = 8081

func main() {

	// define+parse flags
	devModePtr := flag.Bool("dev", false, "Start server in development mode.")
	flag.Parse()

	// log start
	log.Printf("%s -- Version %s\n", app.Name, app.GetVersionString())
	if *devModePtr {
		log.Println("Development mode enabled.")
	}

	// create event emitter
	events := emitter.Emitter{}

	// create user manager
	userManager, err := user.NewManager()
	if err != nil {
		log.Panicln("Error occured while initalizing the user manager,", err)
	}

	// create act manager
	actManager := act.NewManager(&events, &userManager, *devModePtr)

	// start http server
	go HTTPStartServer(HTTPListenTCPPort, &userManager, &actManager, &events, *devModePtr)

	// start act listen server
	act.Listen(ActListenUDPPort, &actManager)
}
