package act

import (
	"database/sql"
	"log"

	"github.com/martinlindhe/base36"

	"../app"
	"../user"
)

// Data - data about an ACT session
type Data struct {
	Session       Session
	User          user.Data
	Encounter     Encounter
	Combatants    []Combatant
	CombatActions []CombatAction
	database      *sql.DB
}

// NewData - create new ACT session data
func NewData(session Session, user user.Data) (Data, error) {
	database, err := getDatabase(user)
	if err != nil {
		return Data{}, err
	}
	err = initDatabase(database)
	if err != nil {
		return Data{}, err
	}
	return Data{
		Session:       session,
		User:          user,
		Encounter:     Encounter{ID: 0},
		Combatants:    make([]Combatant, 0),
		CombatActions: make([]CombatAction, 0),
		database:      database,
	}, nil
}

// UpdateEncounter - Add or update encounter data
func (d *Data) UpdateEncounter(encounter Encounter) {
	// check if encounter update is for current counter
	// update it if so
	if encounter.ID == d.Encounter.ID {
		d.Encounter = encounter
		// save encounter if it is no longer active
		if !d.Encounter.Active {
			d.SaveEncounter()
		}
		return
	}
	// save + clear current encounter if one exists
	if d.Encounter.ID != 0 {
		err := d.SaveEncounter()
		if err != nil {
			log.Println("Error while saving encounter", d.Encounter.ID, err)
		}
		d.ClearEncounter()
	}
	// create new encounter
	d.Encounter = encounter
	log.Println("Set active encounter to", base36.Encode(uint64(uint32(encounter.ID))), "for session", d.User.ID)
}

// UpdateCombatant - Add or update combatant data
func (d *Data) UpdateCombatant(combatant Combatant) {
	// ensure there is a current encounter and that data is for it
	if combatant.EncounterID == 0 || d.Encounter.ID == 0 || combatant.EncounterID != d.Encounter.ID {
		return
	}
	// look for existing, update if found
	for index, storedCombatant := range d.Combatants {
		if storedCombatant.Name == combatant.Name {
			d.Combatants[index] = combatant
			return
		}
	}
	// add new
	d.Combatants = append(d.Combatants, combatant)
	log.Println("Add combatant", combatant.Name, "to encounter", combatant.EncounterID, "(TotalCombatants:", len(d.Combatants), ")")
}

// UpdateCombatAction - Add combat action
func (d *Data) UpdateCombatAction(combatAction CombatAction) {
	// ensure there is a current encounter and that data is for it
	if combatAction.EncounterID == 0 || d.Encounter.ID == 0 || combatAction.EncounterID != d.Encounter.ID {
		return
	}
	// look for existing
	for index, storedCombatAction := range d.CombatActions {
		if storedCombatAction.Time == combatAction.Time && storedCombatAction.Sort == combatAction.Sort {
			d.CombatActions[index] = combatAction
			return
		}
	}
	// add
	d.CombatActions = append(d.CombatActions, combatAction)
}

// getDatabase - get encounter database for given user
func getDatabase(user user.Data) (*sql.DB, error) {
	database, err := sql.Open("sqlite3", app.DataPath+"/act_"+user.GetWebIDString()+".db")
	if err != nil {
		return nil, err
	}
	return database, nil
}

// initDatabase - perform first time init of database
func initDatabase(database *sql.DB) error {
	// create encounter table if not exist
	stmt, err := database.Prepare(`
		CREATE TABLE IF NOT EXISTS encounter
		(
			id INTEGER PRIMARY KEY,
			start_time DATETIME,
			end_time DATETIME,
			zone VARCHAR(256),
			damage INTEGER,
			success_level INTEGER
		)
	`)
	if err != nil {
		return err
	}
	_, err = stmt.Exec()
	if err != nil {
		return err
	}
	// create combatant table if not exist
	stmt, err = database.Prepare(`
		CREATE TABLE IF NOT EXISTS combatant
		(
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			encounter_id INTEGER,
			name VARCHAR(256),
			job VARCHAR(3),
			damage INTEGER,
			damage_taken INTEGER,
			damage_healed INTEGER,
			deaths INTEGER,
			hits INTEGER,
			heals INTEGER,
			kills INTEGER,
			CONSTRAINT encounter_unique UNIQUE (encounter_id, name)
		)
	`)
	if err != nil {
		return err
	}
	_, err = stmt.Exec()
	if err != nil {
		return err
	}
	// create combat action table if not exist
	stmt, err = database.Prepare(`
		CREATE TABLE IF NOT EXISTS combat_action
		(
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			encounter_id INTEGER,
			time DATETIME,
			sort INTEGER,
			attacker VARCHAR(256),
			victim VARCHAR(256),
			damage INTEGER,
			skill VARCHAR(256),
			skill_type VARCHAR(256),
			swing_type INTEGER,
			critical INTEGER,
			CONSTRAINT encounter_unique UNIQUE (encounter_id, time, sort)
		)
	`)
	if err != nil {
		return err
	}
	_, err = stmt.Exec()
	if err != nil {
		return err
	}
	return nil
}

// SaveEncounter - save all data related to current encounter
func (d *Data) SaveEncounter() error {
	// no encounter
	if d.Encounter.ID == 0 {
		return nil
	}
	// insert in to encounter table
	stmt, err := d.database.Prepare(`
		INSERT OR REPLACE INTO encounter
		(id, start_time, end_time, zone, damage, success_level) VALUES
		(?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return err
	}
	_, err = stmt.Exec(
		d.Encounter.ID,
		d.Encounter.StartTime,
		d.Encounter.EndTime,
		d.Encounter.Zone,
		d.Encounter.Damage,
		d.Encounter.SuccessLevel,
	)
	if err != nil {
		return err
	}
	// insert in to combatant table
	for _, combatant := range d.Combatants {
		stmt, err := d.database.Prepare(`
			INSERT OR REPLACE INTO combatant
			(encounter_id, name, job, damage, damage_taken, damage_healed, deaths, hits, heals, kills) VALUES
			(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`)
		if err != nil {
			return err
		}
		_, err = stmt.Exec(
			combatant.EncounterID,
			combatant.Name,
			combatant.Job,
			combatant.Damage,
			combatant.DamageTaken,
			combatant.DamageHealed,
			combatant.Deaths,
			combatant.Hits,
			combatant.Heals,
			combatant.Kills,
		)
		if err != nil {
			return err
		}
	}
	// insert in to combat action table
	for _, combatAction := range d.CombatActions {
		stmt, err := d.database.Prepare(`
			INSERT OR REPLACE INTO combat_action
			(encounter_id, time, sort, attacker, victim, damage, skill, skill_type, swing_type, critical) VALUES
			(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)			
		`)
		if err != nil {
			return err
		}
		_, err = stmt.Exec(
			combatAction.EncounterID,
			combatAction.Time,
			combatAction.Sort,
			combatAction.Attacker,
			combatAction.Victim,
			combatAction.Damage,
			combatAction.Skill,
			combatAction.SkillType,
			combatAction.SwingType,
			combatAction.Critical,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

// ClearEncounter - delete all data for current encounter from memory
func (d *Data) ClearEncounter() {
	d.Encounter = Encounter{ID: 0}
	d.Combatants = make([]Combatant, 0)
	d.CombatActions = make([]CombatAction, 0)
}

// GetPreviousEncounter - retrieve previous encounter data from database
func GetPreviousEncounter(user user.Data, encounterID int32) (Data, error) {
	// get database
	database, err := getDatabase(user)
	if err != nil {
		return Data{}, err
	}
	defer database.Close()
	// fetch encounter
	rows, err := database.Query(
		"SELECT * FROM encounter WHERE id = ? LIMIT 1",
		encounterID,
	)
	if err != nil {
		return Data{}, err
	}
	encounter := Encounter{}
	for rows.Next() {
		err = rows.Scan(
			&encounter.ID,
			&encounter.StartTime,
			&encounter.EndTime,
			&encounter.Zone,
			&encounter.Damage,
			&encounter.SuccessLevel,
		)
		if err != nil {
			return Data{}, nil
		}
		break
	}
	// fetch combatants
	rows, err = database.Query(
		"SELECT encounter_id, name, job, damage, damage_taken, damage_healed, deaths, hits, heals, kills FROM combatant WHERE encounter_id = ?",
		encounterID,
	)
	if err != nil {
		return Data{}, err
	}
	combatants := make([]Combatant, 0)
	for rows.Next() {
		combatant := Combatant{}
		err := rows.Scan(
			&combatant.EncounterID,
			&combatant.Name,
			&combatant.Job,
			&combatant.Damage,
			&combatant.DamageTaken,
			&combatant.DamageHealed,
			&combatant.Deaths,
			&combatant.Hits,
			&combatant.Heals,
			&combatant.Kills,
		)
		if err != nil {
			return Data{}, err
		}
		combatants = append(combatants, combatant)
	}
	// fetch combat actions
	rows, err = database.Query(
		"SELECT encounter_id, time, sort, attacker, victim, damage, skill, skill_type, swing_type, critical FROM combat_action WHERE encounter_id = ?",
		encounterID,
	)
	if err != nil {
		return Data{}, err
	}
	combatActions := make([]CombatAction, 0)
	for rows.Next() {
		combatAction := CombatAction{}
		err := rows.Scan(
			&combatAction.EncounterID,
			&combatAction.Time,
			&combatAction.Sort,
			&combatAction.Attacker,
			&combatAction.Victim,
			&combatAction.Damage,
			&combatAction.Skill,
			&combatAction.SkillType,
			&combatAction.SwingType,
			&combatAction.Critical,
		)
		if err != nil {
			return Data{}, err
		}
		combatActions = append(combatActions, combatAction)
	}
	// return data set
	return Data{
		User:          user,
		Encounter:     encounter,
		Combatants:    combatants,
		CombatActions: combatActions,
	}, nil
}
