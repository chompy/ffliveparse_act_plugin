package main

import (
	"log"

	"github.com/olebedev/emitter"

	"./act"
)

// ActListenUDPPort - Port act server will listen on
const ActListenUDPPort uint16 = 31593

// HTTPListenTCPPort - Port http server will listen on
const HTTPListenTCPPort uint16 = 8081

func main() {
	// log start
	log.Println("Chompy ACT FFXIV Share Server -- Version", act.VersionNumber)

	// create event emitter
	events := emitter.Emitter{}

	// create user manager
	userManager := act.NewUserManager(&events)

	// start http server
	go HTTPStartServer(HTTPListenTCPPort, &userManager, &events)

	// start act listen server
	act.Listen(ActListenUDPPort, &userManager)
}
