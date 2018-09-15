package act

import (
	"log"

	"github.com/martinlindhe/base36"

	"../user"
)

// Data - data about an ACT session
type Data struct {
	Session       Session
	User          user.Data
	Encounters    []Encounter
	Combatants    []Combatant
	CombatActions []CombatAction
}

// NewData - create new ACT session data
func NewData(session Session, user user.Data) Data {
	return Data{
		Session:       session,
		User:          user,
		Encounters:    make([]Encounter, 0),
		Combatants:    make([]Combatant, 0),
		CombatActions: make([]CombatAction, 0),
	}
}

// UpdateEncounter - Add or update encounter data
func (d *Data) UpdateEncounter(encounter Encounter) {
	// look for existing, update if found
	for index, storedEncounter := range d.Encounters {
		if storedEncounter.ID == encounter.ID {
			d.Encounters[index] = encounter
			return
		}
	}
	// add new
	d.Encounters = append(d.Encounters, encounter)
	log.Println("Add encounter", base36.Encode(uint64(uint32(encounter.ID))), "to session", d.User.ID, "(TotalEncounters:", len(d.Encounters), ")")
}

// UpdateCombatant - Add or update combatant data
func (d *Data) UpdateCombatant(combatant Combatant) {
	// look for existing, update if found
	numCombatants := 0 // count number of combatants in encounter
	for index, storedCombatant := range d.Combatants {
		if storedCombatant.EncounterID == combatant.EncounterID {
			numCombatants++
			if storedCombatant.Name == combatant.Name {
				d.Combatants[index] = combatant
				return
			}
		}
	}
	// add new
	d.Combatants = append(d.Combatants, combatant)
	log.Println("Add combatant", combatant.Name, "to encounter", combatant.EncounterID, "(TotalCombatants:", numCombatants+1, ")")
}

// UpdateCombatAction - Add combat action
func (d *Data) UpdateCombatAction(combatAction CombatAction) {
	// no encounter id, drop
	if combatAction.EncounterID == 0 {
		return
	}
	// look for existing, drop if found
	for _, storedCombatAction := range d.CombatActions {
		if storedCombatAction.EncounterID == combatAction.EncounterID && storedCombatAction.Time == combatAction.Time && storedCombatAction.Sort == combatAction.Sort {
			return
		}
	}
	// add
	d.CombatActions = append(d.CombatActions, combatAction)
}

// GetEncounterForCombatant - Given a combantant get the encounter associated with it
func (d *Data) GetEncounterForCombatant(combatant *Combatant) *Encounter {
	for index, storedEncounter := range d.Encounters {
		if storedEncounter.ID == combatant.EncounterID {
			return &d.Encounters[index]
		}
	}
	return nil
}

// GetEncounterForCombatAction - Given a combat action get the encounter associated with it
func (d *Data) GetEncounterForCombatAction(combatAction *CombatAction) *Encounter {
	for index, storedEncounter := range d.Encounters {
		if storedEncounter.ID == combatAction.EncounterID {
			return &d.Encounters[index]
		}
	}
	return nil
}

// GetActiveEncounter - Get currently active encounter, if any
func (d *Data) GetActiveEncounter() *Encounter {
	for index, storedEncounter := range d.Encounters {
		if storedEncounter.Active {
			return &d.Encounters[index]
		}
	}
	return nil
}

// GetLastEncounter - Get most recent encounter, if any
func (d *Data) GetLastEncounter() *Encounter {
	var encounter *Encounter
	for index, storedEncounter := range d.Encounters {
		if encounter == nil || encounter.StartTime.Before(storedEncounter.StartTime) {
			encounter = &d.Encounters[index]
		}
	}
	return encounter
}

// GetCombatantsForEncounter - Given an encounter get list of allied combatants
func (d *Data) GetCombatantsForEncounter(encounter *Encounter) []*Combatant {
	var combatants []*Combatant
	for index, storedCombatant := range d.Combatants {
		if storedCombatant.EncounterID == encounter.ID {
			combatants = append(combatants, &d.Combatants[index])
		}
	}
	return combatants
}

// GetCombatActionsForEncounter - Given an encounter get list of combat actions
func (d *Data) GetCombatActionsForEncounter(encounter *Encounter) []*CombatAction {
	var combatActions []*CombatAction
	for index, storedCombatAction := range d.CombatActions {
		if storedCombatAction.EncounterID == encounter.ID {
			combatActions = append(combatActions, &d.CombatActions[index])
		}
	}
	return combatActions
}
