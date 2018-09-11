package main

import (
	"flag"
	"log"

	"github.com/olebedev/emitter"

	"./act"
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
	log.Printf("Chompy ACT FFXIV Share Server -- Version %.2f\n", (float32(act.VersionNumber) / 100.0))
	if *devModePtr {
		log.Println("Development mode enabled.")
	}

	// create event emitter
	events := emitter.Emitter{}

	// create user manager
	userManager := act.NewUserManager(&events, *devModePtr)

	// start http server
	go HTTPStartServer(HTTPListenTCPPort, &userManager, &events, *devModePtr)

	// start act listen server
	act.Listen(ActListenUDPPort, &userManager)
}
