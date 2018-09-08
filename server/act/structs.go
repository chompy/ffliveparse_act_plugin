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

// DataTypeCombatAction - Data type, combat action
const DataTypeCombatAction byte = 4

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
	Active       bool
	SuccessLevel uint8
}

// CombatAction - Data about a specfic action
type CombatAction struct {
	EncounterID int32
	Time        time.Time
	Sort        int32
	Attacker    string
	Victim      string
	Damage      int32
	Skill       string
	SkillType   string
	SwingType   uint8
	Critical    bool
}

// LogLing - Log line from Act
type LogLing struct {
	EncounterID int32
	Time        time.Time
	LogLine     string
}

// Session - Data about a specific session
type Session struct {
	ID      string
	IP      net.IP
	Port    int
	Created time.Time
}
