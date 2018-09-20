package act

import (
	"errors"
	"log"
	"net"
	"net/url"
	"time"

	"github.com/olebedev/emitter"

	"github.com/martinlindhe/base36"

	"../app"
	"../user"
)

// Manager - manage all act data sessions
type Manager struct {
	data        []Data
	events      *emitter.Emitter
	userManager *user.Manager
	devMode     bool
	newTickData bool
}

// NewManager - create new act manager
func NewManager(events *emitter.Emitter, userManager *user.Manager, devMode bool) Manager {
	return Manager{
		data:        make([]Data, 0),
		events:      events,
		userManager: userManager,
		devMode:     devMode,
	}
}

// ParseDataString - parse incoming act, store it in a data object
func (m *Manager) ParseDataString(dataStr []byte, addr *net.UDPAddr) (*Data, error) {
	dataObj := m.GetDataWithAddr(addr)
	switch dataStr[0] {
	case DataTypeSession:
		{
			// decode session string
			session, err := DecodeSessionBytes(dataStr, addr)
			if err != nil {
				return nil, err
			}
			// act data not currently loaded for user, load it
			if dataObj == nil {
				// ensure upload key is present
				user, err := m.userManager.LoadFromUploadKey(session.UploadKey)
				if err != nil {
					return nil, err
				}
				// create new data
				actData, err := NewData(session, user)
				if err != nil {
					return nil, err
				}
				m.data = append(
					m.data,
					actData,
				)
				// start ticks
				go m.doTick(&m.data[len(m.data)-1])
				// save user data, update accessed time
				m.userManager.Save(user)
				log.Println("Loaded ACT session for use ", user.ID, "from", addr, "(LoadedDataCount:", len(m.data), ")")
				break
			}
			// save user data, update accessed time
			m.userManager.Save(dataObj.User)
			// update existing data
			dataObj.Session = session
			log.Println("Updated ACT session for user", dataObj.User.ID, "from", addr, "(LoadedDataCount:", len(m.data), ")")
			break
		}
	case DataTypeEncounter:
		{
			// data required
			if dataObj == nil {
				return nil, errors.New("recieved Encounter with no matching data object")
			}
			// parse encounter data
			encounter, err := DecodeEncounterBytes(dataStr)
			if err != nil {
				return nil, err
			}
			// update data
			dataObj.UpdateEncounter(encounter)
			// flag that new data should be sent next tick
			m.newTickData = true
			// log
			dur := encounter.EndTime.Sub(encounter.StartTime)
			log.Println(
				"Update encounter",
				base36.Encode(uint64(uint32(encounter.ID))),
				"for user",
				dataObj.User.ID,
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
			// data required
			if dataObj == nil {
				return nil, errors.New("recieved Combatant with no matching data object")
			}
			// parse combatant data
			combatant, err := DecodeCombatantBytes(dataStr)
			if err != nil {
				return nil, err
			}
			// update user data
			dataObj.UpdateCombatant(combatant)
			// flag that new data should be sent next tick
			m.newTickData = true
			// log
			log.Println(
				"Update combatant",
				combatant.Name,
				"for encounter",
				base36.Encode(uint64(uint32(combatant.EncounterID))),
				"(UserID:",
				dataObj.User.ID,
				", Job:",
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
			// data required
			if dataObj == nil {
				return nil, errors.New("recieved CombatAction with no matching data object")
			}
			// parse combat action data
			combatAction, err := DecodeCombatActionBytes(dataStr)
			if err != nil {
				return nil, err
			}
			// add combat action
			dataObj.UpdateCombatAction(combatAction)
			// forward data to web
			// ignore for now, not sure we need this
			/*go m.events.Emit(
				"act:combatAction",
				EncodeCombatActionBytes(&combatAction),
			)*/
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
				"(UserID:",
				dataObj.User.ID,
				", SkillType:",
				combatAction.SkillType,
				", Critical:",
				combatAction.Critical,
				", SwingType:",
				combatAction.SwingType,
				", TotalCombatActions:",
				len(dataObj.CombatActions),
				")",
			)
		}
	case DataTypeLogLine:
		{
			// data required
			if dataObj == nil {
				return nil, errors.New("recieved LogLine with no matching data object")
			}
			// parse log line data
			logLine, err := DecodeLogLineBytes(dataStr)
			if err != nil {
				return nil, err
			}
			// forward data to web
			go m.events.Emit(
				"act:logLine",
				EncodeLogLineBytes(&logLine),
			)
			// log LogLines in dev mode
			if m.devMode {
				// log
				encounterString := "(none)"
				if logLine.EncounterID > 0 {
					encounterString = base36.Encode(uint64(uint32(logLine.EncounterID)))
				}
				log.Println(
					"Log line for user",
					dataObj.User.ID,
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
	return dataObj, nil
}

// doTick - ticks every app.TickRate milliseconds
func (m *Manager) doTick(data *Data) {
	for range time.Tick(app.TickRate * time.Millisecond) {
		if data == nil {
			return
		}
		if data.Encounter.ID == 0 {
			continue
		}
		if !m.newTickData {
			continue
		}
		// emit encounter event
		go m.events.Emit(
			"act:encounter",
			EncodeEncounterBytes(&data.Encounter),
		)
		// emit combatant events
		for _, combatant := range data.Combatants {
			go m.events.Emit(
				"act:combatant",
				EncodeCombatantBytes(&combatant),
			)
		}
	}
}

// GetDataWithAddr - retrieve data with UDP address
func (m *Manager) GetDataWithAddr(addr *net.UDPAddr) *Data {
	for index, data := range m.data {
		if data.Session.IP.Equal(addr.IP) && data.Session.Port == addr.Port {
			return &m.data[index]
		}
	}
	return nil
}

// GetLastDataWithIP - retrieve last available data object with given ip address
func (m *Manager) GetLastDataWithIP(ip string) *Data {
	var lastData *Data
	for index, data := range m.data {
		if data.Session.IP.String() == ip {
			lastData = &m.data[index]
		}
	}
	return lastData
}

// GetDataWithUserID - retrieve data object from user ID
func (m *Manager) GetDataWithUserID(userID int64) *Data {
	for index, data := range m.data {
		if data.User.ID == userID {
			return &m.data[index]
		}
	}
	return nil
}

// GetDataWithWebID - retrieve data with web id string
func (m *Manager) GetDataWithWebID(webID string) *Data {
	userID := user.GetIDFromWebIDString(webID)
	return m.GetDataWithUserID(userID)
}
