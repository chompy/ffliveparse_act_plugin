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
