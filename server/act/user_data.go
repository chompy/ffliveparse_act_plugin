package act

import (
	"log"
)

// UserData - Data about a single user
type UserData struct {
	Session       Session
	Encounters    []Encounter
	Combatants    []Combatant
	CombatActions []CombatAction
}

// NewUserData - Create new user data
func NewUserData(session Session) UserData {
	return UserData{
		Session:       session,
		Encounters:    make([]Encounter, 0),
		Combatants:    make([]Combatant, 0),
		CombatActions: make([]CombatAction, 0),
	}
}

// UpdateEncounter - Add or update encounter data
func (ud *UserData) UpdateEncounter(encounter Encounter) {
	// look for existing, update if found
	for index, storedEncounter := range ud.Encounters {
		if storedEncounter.ID == encounter.ID {
			ud.Encounters[index] = encounter
			return
		}
	}
	// add new
	ud.Encounters = append(ud.Encounters, encounter)
	log.Println("Add encounter", encounter.ID, "to session", ud.Session.ID, "(TotalEncounters:", len(ud.Encounters), ")")
}

// UpdateCombatant - Add or update combatant data
func (ud *UserData) UpdateCombatant(combatant Combatant) {
	// look for existing, update if found
	for index, storedCombatant := range ud.Combatants {
		if storedCombatant.EncounterID == combatant.EncounterID && storedCombatant.Name == combatant.Name {
			ud.Combatants[index] = combatant
			return
		}
	}
	// add new
	ud.Combatants = append(ud.Combatants, combatant)
}

// UpdateCombatAction - Add combat action
func (ud *UserData) UpdateCombatAction(combatAction CombatAction) {
	// no encounter id, drop
	if combatAction.EncounterID == 0 {
		return
	}
	// look for existing, drop if found
	for _, storedCombatAction := range ud.CombatActions {
		if storedCombatAction.EncounterID == combatAction.EncounterID && storedCombatAction.Time == combatAction.Time && storedCombatAction.Sort == combatAction.Sort {
			return
		}
	}
	// add
	ud.CombatActions = append(ud.CombatActions, combatAction)
}

// GetEncounterForCombatant - Given a combantant get the encounter associated with it
func (ud *UserData) GetEncounterForCombatant(combatant *Combatant) *Encounter {
	for index, storedEncounter := range ud.Encounters {
		if storedEncounter.ID == combatant.EncounterID {
			return &ud.Encounters[index]
		}
	}
	return nil
}

// GetEncounterForCombatAction - Given a combat action get the encounter associated with it
func (ud *UserData) GetEncounterForCombatAction(combatAction *CombatAction) *Encounter {
	for index, storedEncounter := range ud.Encounters {
		if storedEncounter.ID == combatAction.EncounterID {
			return &ud.Encounters[index]
		}
	}
	return nil
}

// GetActiveEncounter - Get currently active encounter, if any
func (ud *UserData) GetActiveEncounter() *Encounter {
	for index, storedEncounter := range ud.Encounters {
		if storedEncounter.Active {
			return &ud.Encounters[index]
		}
	}
	return nil
}

// GetCombatantsForEncounter - Given an encounter get list of allied combatants
func (ud *UserData) GetCombatantsForEncounter(encounter *Encounter) []*Combatant {
	var combatants []*Combatant
	for index, storedCombatant := range ud.Combatants {
		if storedCombatant.EncounterID == encounter.ID {
			combatants = append(combatants, &ud.Combatants[index])
		}
	}
	return combatants
}

// GetCombatActionsForEncounter - Given an encounter get list of combat actions
func (ud *UserData) GetCombatActionsForEncounter(encounter *Encounter) []*CombatAction {
	var combatActions []*CombatAction
	for index, storedCombatAction := range ud.CombatActions {
		if storedCombatAction.EncounterID == encounter.ID {
			combatActions = append(combatActions, &ud.CombatActions[index])
		}
	}
	return combatActions
}
