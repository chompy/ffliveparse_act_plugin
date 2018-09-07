package main

// UserData - Data about a single user
type UserData struct {
	Session       Session
	Encounters    []ActEncounter
	Combatants    []ActCombatant
	CombatActions []ActCombatAction
}

// UpdateEncounter - Add or update encounter data
func (ud *UserData) UpdateEncounter(encounter *ActEncounter) {
	// look for existing, update if found
	for _, storedEncounter := range ud.Encounters {
		if storedEncounter.ID == encounter.ID {
			storedEncounter = *encounter
			return
		}
	}
	// add new
	ud.Encounters = append(ud.Encounters, *encounter)
}

// UpdateCombatant - Add or update combatant data
func (ud *UserData) UpdateCombatant(combatant *ActCombatant) {
	// look for existing, update if found
	for _, storedCombatant := range ud.Combatants {
		if storedCombatant.EncounterID == combatant.EncounterID && storedCombatant.Name == combatant.Name {
			storedCombatant = *combatant
			return
		}
	}
	// add new
	ud.Combatants = append(ud.Combatants, *combatant)
}

// UpdateCombatAction - Add combat action
func (ud *UserData) UpdateCombatAction(combatAction *ActCombatAction) {
	ud.CombatActions = append(ud.CombatActions, *combatAction)
}

// GetEncounterForCombatant - Given a combantant get the encounter associated with it
func (ud *UserData) GetEncounterForCombatant(combatant *ActCombatant) *ActEncounter {
	for _, storedEncounter := range ud.Encounters {
		if storedEncounter.ID == combatant.EncounterID {
			return &storedEncounter
		}
	}
	return nil
}

// GetEncounterForCombatAction - Given a combat action get the encounter associated with it
func (ud *UserData) GetEncounterForCombatAction(combatAction *ActCombatAction) *ActEncounter {
	for _, storedEncounter := range ud.Encounters {
		if storedEncounter.ID == combatAction.EncounterID {
			return &storedEncounter
		}
	}
	return nil
}

// GetCombatantsForEncounter - Given an encounter get list of allied combatants
func (ud *UserData) GetCombatantsForEncounter(encounter *ActEncounter) []*ActCombatant {
	var combatants []*ActCombatant
	for _, storedCombatant := range ud.Combatants {
		if storedCombatant.EncounterID == encounter.ID {
			combatants = append(combatants, &storedCombatant)
		}
	}
	return combatants
}

// GetCombatActionsForEncounter - Given an encounter get list of combat actions
func (ud *UserData) GetCombatActionsForEncounter(encounter *ActEncounter) []*ActCombatAction {
	var combatActions []*ActCombatAction
	for _, storedCombatAction := range ud.CombatActions {
		if storedCombatAction.EncounterID == encounter.ID {
			combatActions = append(combatActions, &storedCombatAction)
		}
	}
	return combatActions
}
