package act

import (
	"net"
	"time"
)

// DataTypeSession - Data type, session data
const DataTypeSession byte = 1

// DataTypeEncounter - Data type, encounter data
const DataTypeEncounter byte = 2

// DataTypeCombatant - Data type, combatant data
const DataTypeCombatant byte = 3

// DataTypeLogLine - Data type, log line
const DataTypeLogLine byte = 5

// Combatant - Data about a combatant
type Combatant struct {
	EncounterID  int32
	Name         string
	Job          string
	Damage       int32
	DamageTaken  int32
	DamageHealed int32
	Deaths       int32
	Hits         int32
	Heals        int32
	Kills        int32
}

// Encounter - Data about an encounter
type Encounter struct {
	ID           int32
	StartTime    time.Time
	EndTime      time.Time
	Zone         string
	Damage       int32
	Active       bool
	SuccessLevel uint8
}

// LogLine - Log line from Act
type LogLine struct {
	EncounterID int32
	Time        time.Time
	LogLine     string
}

// Session - Data about a specific session
type Session struct {
	UploadKey string
	IP        net.IP
	Port      int
	Created   time.Time
}
