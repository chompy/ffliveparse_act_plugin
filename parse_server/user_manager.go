package main

import (
	"errors"
	"log"
	"net"

	"github.com/martinlindhe/base36"
)

// UserManager - Manages all users
type UserManager struct {
	userData []UserData
}

// ParseDataString - Parse incomming ACT data, match it to user data
func (um *UserManager) ParseDataString(data []byte, addr *net.UDPAddr) (*UserData, error) {
	userData := um.GetUserDataWithAddr(addr)

	switch data[0] {
	case DataTypeSession:
		{
			session, err := ParseSessionString(data, addr)
			if err != nil {
				return nil, err
			}
			if userData == nil {
				// create new user data
				um.userData = append(um.userData, UserData{Session: session})
				log.Println("Created new session", session.ID, "for user from", addr)

			} else {
				// update existing user data
				userData.Session = session
				log.Println("Updated session", session.ID, "for user from", addr)
			}
			break
		}
	case DataTypeEncounter:
		{
			// user data required
			if userData == nil {
				return nil, errors.New("recieved ActEncounter with no matching UserData")
			}
			// parse encounter data
			encounter, err := ParseEncounterString(data)
			if err != nil {
				return nil, err
			}
			// update user data
			userData.UpdateEncounter(&encounter)
			// log
			durMillis := (encounter.EndTick - encounter.StartTick) / EncounterTickToMillisecondDivider
			log.Println(
				"Update encounter",
				base36.Encode(uint64(encounter.ID)),
				"in session",
				userData.Session.ID,
				"(ZoneName:",
				encounter.Zone,
				", Duration:",
				durMillis,
				"ms, Active:",
				encounter.Active,
				", SuccessLevel:",
				encounter.SuccessLevel,
				")",
			)
			break
		}
	case DataTypeCombatant:
		{
			// user data required
			if userData == nil {
				return nil, errors.New("recieved ActCombatant with no matching UserData")
			}
			// parse combatant data
			combatant, err := ParseCombatantString(data)
			if err != nil {
				return nil, err
			}
			// update user data
			userData.UpdateCombatant(&combatant)
			// log
			log.Println(
				"Update combatant",
				combatant.Name,
				"for encounter",
				base36.Encode(uint64(combatant.EncounterID)),
				"(Job:",
				combatant.Job,
				", Damage:",
				combatant.Damage,
				", Healing:",
				combatant.DamageHealed,
				", DamageTaken:",
				combatant.DamageTaken,
				", Deaths:",
				combatant.Deaths,
				")",
			)
		}
	case DataTypeCombatAction:
		{
			// user data required
			if userData == nil {
				return nil, errors.New("recieved ActCombatAction with no matching UserData")
			}
			// parse combat action data
			combatAction, err := ParseCombatActionString(data)
			if err != nil {
				return nil, err
			}
			// update user data
			userData.UpdateCombatAction(&combatAction)
			// log
			log.Println(
				"Combat action for encounter",
				base36.Encode(uint64(combatAction.EncounterID)),
				",",
				combatAction.Attacker,
				"used",
				combatAction.Skill,
				"on",
				combatAction.Victim,
				"for",
				combatAction.Damage,
				"(SkillType:",
				combatAction.SkillType,
				", Critical:",
				combatAction.Critical,
				", SwingType:",
				combatAction.SwingType,
				")",
			)
		}
	case DataTypeLogLine:
		{
			// user data required
			if userData == nil {
				return nil, errors.New("recieved ActLogLine with no matching UserData")
			}
			// parse log line data
			logLine, err := ParseLogLineString(data)
			if err != nil {
				return nil, err
			}
			// TODO, log line data not retained, send it along to all active web socket connections and/or process triggers
			// log
			encounterString := "(none)"
			if logLine.EncounterID > 0 {
				encounterString = base36.Encode(uint64(logLine.EncounterID))
			}

			log.Println(
				"Log line for session",
				userData.Session.ID,
				"and encounter",
				encounterString,
				",",
				logLine.LogLine,
			)
		}
	default:
		{
			return nil, errors.New("recieved unknown data")
		}
	}
	return userData, nil
}

// GetUserDataWithAddr - Retrieve user data object with UDP address
func (um *UserManager) GetUserDataWithAddr(addr *net.UDPAddr) *UserData {
	for _, userData := range um.userData {
		if userData.Session.IP.Equal(addr.IP) && userData.Session.Port == addr.Port {
			return &userData
		}
	}
	return nil
}
