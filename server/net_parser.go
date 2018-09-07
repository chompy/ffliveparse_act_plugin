package main

import (
	"encoding/binary"
	"errors"
	"net"
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

func readInt64(data []byte, pos *int) int64 {
	dataString := data[*pos : *pos+8]
	*pos += 8
	return int64(binary.BigEndian.Uint64(dataString))
}

func readInt32(data []byte, pos *int) int32 {
	dataString := data[*pos : *pos+4]
	*pos += 4
	return int32(binary.BigEndian.Uint32(dataString))
}

func readByte(data []byte, pos *int) byte {
	output := data[*pos]
	*pos++
	return output
}

func readString(data []byte, pos *int) string {
	length := int(data[*pos])
	output := string(data[*pos+1 : *pos+1+length])
	*pos += 1 + length
	return output
}

// ParseSessionString - Create Session struct from incomming data packet
func ParseSessionString(data []byte, addr *net.UDPAddr) (Session, error) {
	if data[0] != DataTypeSession {
		return Session{}, errors.New("invalid data type for Session")
	}
	pos := 1
	// check version number
	versionNumber := readInt32(data, &pos)
	if versionNumber != VersionNumber {
		return Session{}, errors.New("version number mismatch")
	}
	return Session{
		ID:   readString(data, &pos),
		IP:   addr.IP,
		Port: addr.Port,
	}, nil
}

// ParseEncounterString - Create ActEncounter struct from incomming data packet
func ParseEncounterString(data []byte) (ActEncounter, error) {
	if data[0] != DataTypeEncounter {
		return ActEncounter{}, errors.New("invalid data type for ActEncounter")
	}
	pos := 1
	return ActEncounter{
		ID:           readInt32(data, &pos),
		StartTick:    readInt64(data, &pos),
		EndTick:      readInt64(data, &pos),
		Zone:         readString(data, &pos),
		Active:       readByte(data, &pos) != 0,
		SuccessLevel: readByte(data, &pos),
	}, nil
}

// ParseCombatantString - Create ActCombatant struct from incomming data packet
func ParseCombatantString(data []byte) (ActCombatant, error) {
	if data[0] != DataTypeCombatant {
		return ActCombatant{}, errors.New("invalid data type for ActCombatant")
	}
	pos := 1
	return ActCombatant{
		EncounterID:  readInt32(data, &pos),
		Name:         readString(data, &pos),
		Job:          readString(data, &pos),
		Damage:       readInt64(data, &pos),
		DamageTaken:  readInt64(data, &pos),
		DamageHealed: readInt64(data, &pos),
		Deaths:       readInt32(data, &pos),
		Hits:         readInt32(data, &pos),
		Heals:        readInt32(data, &pos),
		Kills:        readInt32(data, &pos),
	}, nil
}

// ParseCombatActionString - Create ActCombatAction struct from incomming data packet
func ParseCombatActionString(data []byte) (ActCombatAction, error) {
	if data[0] != DataTypeCombatAction {
		return ActCombatAction{}, errors.New("invalid data type for ActCombatAction")
	}
	pos := 1
	return ActCombatAction{
		EncounterID: readInt32(data, &pos),
		Tick:        readInt64(data, &pos),
		Sort:        readInt32(data, &pos),
		Attacker:    readString(data, &pos),
		Victim:      readString(data, &pos),
		Damage:      readInt64(data, &pos),
		Skill:       readString(data, &pos),
		SkillType:   readString(data, &pos),
		SwingType:   readByte(data, &pos),
		Critical:    readByte(data, &pos) != 0,
	}, nil
}

// ParseLogLineString - Create ActLogLine struct from incomming data packet
func ParseLogLineString(data []byte) (ActLogLine, error) {
	if data[0] != DataTypeLogLine {
		return ActLogLine{}, errors.New("invalid data type for ActLogLine")
	}
	pos := 1
	encounterID := readInt32(data, &pos)
	tick := readInt64(data, &pos)
	logLineLength := readInt32(data, &pos)
	logLine := string(data[pos : pos+int(logLineLength)])
	return ActLogLine{
		EncounterID: encounterID,
		Tick:        tick,
		LogLine:     logLine,
	}, nil
}
