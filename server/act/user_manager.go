package act

import (
	"errors"
	"log"
	"net"
	"net/url"

	"github.com/olebedev/emitter"

	"github.com/martinlindhe/base36"
)

// UserManager - Manages all users
type UserManager struct {
	userDataList []UserData
	events       *emitter.Emitter
	devMode      bool
}

// NewUserManager - Create new user manager
func NewUserManager(events *emitter.Emitter, devMode bool) UserManager {
	return UserManager{
		userDataList: make([]UserData, 0),
		events:       events,
		devMode:      devMode,
	}
}

// ParseDataString - Parse incomming ACT data, match it to user data
func (um *UserManager) ParseDataString(data []byte, addr *net.UDPAddr) (*UserData, error) {
	userData := um.GetUserDataWithAddr(addr)
	switch data[0] {
	case DataTypeSession:
		{
			session, err := DecodeSessionBytes(data, addr)
			if err != nil {
				return nil, err
			}
			if userData == nil {
				// create new user data
				um.userDataList = append(
					um.userDataList,
					NewUserData(session),
				)
				log.Println("Created new session", session.ID, "for user from", addr, "(TotalUsers:", len(um.userDataList), ")")
			} else {
				// update existing user data
				userData.Session = session
				log.Println("Updated session", session.ID, "for user from", addr, "(TotalUsers:", len(um.userDataList), ")")
			}
			break
		}
	case DataTypeEncounter:
		{
			// user data required
			if userData == nil {
				return nil, errors.New("recieved Encounter with no matching UserData")
			}
			// parse encounter data
			encounter, err := DecodeEncounterBytes(data)
			if err != nil {
				return nil, err
			}
			// update user data
			userData.UpdateEncounter(encounter)
			// forward data to web
			go um.events.Emit(
				"act:encounter",
				EncodeEncounterBytes(&encounter),
			)
			// log
			dur := encounter.EndTime.Sub(encounter.StartTime)
			log.Println(
				"Update encounter",
				base36.Encode(uint64(uint32(encounter.ID))),
				"in session",
				userData.Session.ID,
				"(ZoneName:",
				encounter.Zone,
				", Damage: ",
				encounter.Damage,
				", Duration:",
				dur,
				", Active:",
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
				return nil, errors.New("recieved Combatant with no matching UserData")
			}
			// parse combatant data
			combatant, err := DecodeCombatantBytes(data)
			if err != nil {
				return nil, err
			}
			// update user data
			userData.UpdateCombatant(combatant)
			// forward data to web
			go um.events.Emit(
				"act:combatant",
				EncodeCombatantBytes(&combatant),
			)
			// log
			log.Println(
				"Update combatant",
				combatant.Name,
				"for encounter",
				base36.Encode(uint64(uint32(combatant.EncounterID))),
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
				return nil, errors.New("recieved CombatAction with no matching UserData")
			}
			// parse combat action data
			combatAction, err := DecodeCombatActionBytes(data)
			if err != nil {
				return nil, err
			}
			// add combat action
			userData.UpdateCombatAction(combatAction)
			// forward data to web
			go um.events.Emit(
				"act:combatAction",
				EncodeCombatActionBytes(&combatAction),
			)
			// log
			log.Println(
				"Combat action for encounter",
				base36.Encode(uint64(uint32(combatAction.EncounterID))),
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
				", TotalCombatActions:",
				len(userData.CombatActions),
				")",
			)
		}
	case DataTypeLogLine:
		{
			// user data required
			if userData == nil {
				return nil, errors.New("recieved LogLing with no matching UserData")
			}
			// parse log line data
			logLine, err := DecodeLogLineBytes(data)
			if err != nil {
				return nil, err
			}
			// forward data to web
			go um.events.Emit(
				"act:logLine",
				EncodeLogLineBytes(&logLine),
			)
			// log LogLines in dev mode
			if um.devMode {
				// log
				encounterString := "(none)"
				if logLine.EncounterID > 0 {
					encounterString = base36.Encode(uint64(uint32(logLine.EncounterID)))
				}
				log.Println(
					"Log line for session",
					userData.Session.ID,
					"and encounter",
					encounterString,
					",",
					len(logLine.LogLine),
					"bytes,",
					url.QueryEscape(logLine.LogLine),
				)
			}
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
	for index, userData := range um.userDataList {
		if userData.Session.IP.Equal(addr.IP) && userData.Session.Port == addr.Port {
			return &um.userDataList[index]
		}
	}
	return nil
}

// GetLastUserDataWithIP - Retrieve last available user data object with given ip address
func (um *UserManager) GetLastUserDataWithIP(ip string) *UserData {
	var lastUserData *UserData
	for index, userData := range um.userDataList {
		if userData.Session.IP.String() == ip {
			lastUserData = &um.userDataList[index]
		}
	}
	return lastUserData
}

// GetUserDataWithSessionID - Retrieve user data with session id
func (um *UserManager) GetUserDataWithSessionID(sessionID string) *UserData {
	for index, userData := range um.userDataList {
		if userData.Session.ID == sessionID {
			return &um.userDataList[index]
		}
	}
	return nil
}
