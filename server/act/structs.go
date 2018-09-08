package act

import (
	"net"
	"time"
)

// Combatant - Data about a combatant
type Combatant struct {
	Raw          []byte
	EncounterID  int32
	Name         string
	Job          string
	Damage       int64
	DamageTaken  int64
	DamageHealed int64
	Deaths       int32
	Hits         int32
	Heals        int32
	Kills        int32
}

// EncounterTickToMillisecondDivider - Amount to divide encounter ticks by to get milliseconds
const EncounterTickToMillisecondDivider int64 = 10000

// Encounter - Data about an encounter
type Encounter struct {
	Raw          []byte
	ID           int32
	StartTick    int64
	EndTick      int64
	Zone         string
	Active       bool
	SuccessLevel uint8
}

// CombatAction - Data about a specfic action
type CombatAction struct {
	Raw         []byte
	EncounterID int32
	Tick        int64
	Sort        int32
	Attacker    string
	Victim      string
	Damage      int64
	Skill       string
	SkillType   string
	SwingType   uint8
	Critical    bool
}

// LogLing - Log line from Act
type LogLing struct {
	Raw         []byte
	EncounterID int32
	Tick        int64
	LogLine     string
}

// Session - Data about a specific session
type Session struct {
	Raw     []byte
	ID      string
	IP      net.IP
	Port    int
	Created time.Time
}
