package main

import (
	"net"
	"time"
)

// ActCombatant - Data about a combatant
type ActCombatant struct {
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

// ActEncounter - Data about an encounter
type ActEncounter struct {
	ID           int32
	StartTick    int64
	EndTick      int64
	Zone         string
	Active       bool
	SuccessLevel uint8
}

// ActCombatAction - Data about a specfic action
type ActCombatAction struct {
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

// ActLogLine - Log line from Act
type ActLogLine struct {
	EncounterID int32
	Tick        int64
	LogLine     string
}

// Session - Data about a specific session
type Session struct {
	ID      string
	IP      net.IP
	Port    int
	Created time.Time
}
