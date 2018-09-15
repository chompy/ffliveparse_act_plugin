package act

import (
	"log"
	"net"
	"strconv"
)

// Listen - Start listening for data from Act
func Listen(port uint16, manager *Manager) {
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
		_, err = manager.ParseDataString(buf[0:n], addr)
		if err != nil {
			log.Println("Error when parsing data string from", addr, ",", err)
		}
	}
}
