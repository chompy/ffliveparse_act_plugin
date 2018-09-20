package app

import "fmt"

// VersionNumber - version number, must match number recieved from Act plugin to parse data
const VersionNumber int32 = 1

// Name - app name
const Name string = "FFLiveParse"

// DataPath - path where user data is stored
const DataPath = "./data"

// TickRate - how often combatant and encounter data should be sent to web user in ms
const TickRate = 3000

// GetVersionString - get version as string in format X.XX
func GetVersionString() string {
	return fmt.Sprintf("%.2f", float32(VersionNumber)/100.0)
}
