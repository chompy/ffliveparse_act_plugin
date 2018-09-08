package act

import (
	"log"
	"net"
	"strconv"
)

// VersionNumber - Version number, must match number recieved from Act plugin to parse data
const VersionNumber int32 = 1

// Listen - Start listening for data from Act
func Listen(port uint16, userManager *UserManager) {
	serverAddr, err := net.ResolveUDPAddr("udp", ":"+strconv.Itoa(int(port)))
	if err != nil {
		panic(err)
	}
	serverConn, err := net.ListenUDP("udp", serverAddr)
	if err != nil {
		panic(err)
	}
	defer serverConn.Close()
	buf := make([]byte, 1024)
	for {
		n, addr, err := serverConn.ReadFromUDP(buf)
		if err != nil {
			log.Panicln("Failed to read message from", addr, ",", err)
		}
		_, err = userManager.ParseDataString(buf[0:n], addr)
		if err != nil {
			log.Println("Error parsing data string from", addr, ",", err)
		}
	}
}
