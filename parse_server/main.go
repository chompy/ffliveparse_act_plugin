package main

import (
	"fmt"
	"net"
)

func main() {
	serverAddr, err := net.ResolveUDPAddr("udp", ":31593")
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
			panic(err)
		}
		fmt.Println("Received ", n, " bytes from ", addr)
	}
}
