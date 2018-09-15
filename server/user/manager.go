package user

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// dataPath - path where user data is stored
const dataPath = "./data"

// Manager - manages users data
type Manager struct {
	database *sql.DB
}

// createUserTables - create tables in user database
func createUserTables(database *sql.DB) error {
	stmt, err := database.Prepare(`
		CREATE TABLE IF NOT EXISTS user
		(
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			created DATETIME DEFAULT CURRENT_TIMESTAMP,
			accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
			upload_key VARCHAR(32),
			web_key VARCHAR(32)
		)
	`)
	if err != nil {
		return err
	}
	_, err = stmt.Exec()
	return err
}

// NewManager - get new user manager
func NewManager() (Manager, error) {
	// open database connect, create tables if they do not exist
	database, err := sql.Open("sqlite3", dataPath+"/users.db")
	if err != nil {
		return Manager{}, err
	}
	err = createUserTables(database)
	if err != nil {
		return Manager{}, err
	}
	return Manager{
		database: database,
	}, nil
}

// New - create a new user
func (m *Manager) New() (Data, error) {
	ud := NewData()
	stmt, err := m.database.Prepare(
		`INSERT INTO user (upload_key,web_key) VALUES (?,?)`,
	)
	if err != nil {
		return Data{}, err
	}
	res, err := stmt.Exec(ud.UploadKey, ud.WebKey)
	if err != nil {
		return Data{}, err
	}
	id, err := res.LastInsertId()
	ud.ID = id
	return ud, nil
}

func (m *Manager) usersFromRows(rows *sql.Rows) ([]Data, error) {
	users := make([]Data, 0)
	for rows.Next() {
		ud := Data{}
		err := rows.Scan(&ud.ID, &ud.Created, &ud.Accessed, &ud.UploadKey, &ud.WebKey)
		if err != nil {
			return users, err
		}
		ud.Accessed = time.Now()
		users = append(users, ud)
	}
	return users, nil
}

// LoadFromID - load user from id
func (m *Manager) LoadFromID(ID int64) (Data, error) {
	rows, err := m.database.Query(
		`SELECT * FROM user WHERE id = ? LIMIT 1`,
		ID,
	)
	if err != nil {
		return Data{}, err
	}
	users, err := m.usersFromRows(rows)
	rows.Close()
	if err != nil {
		return Data{}, err
	}
	if len(users) == 0 {
		return Data{}, fmt.Errorf("could not find user data with ID %d", ID)
	}
	return users[0], nil
}

// LoadFromUploadKey - load user from upload key
func (m *Manager) LoadFromUploadKey(uploadKey string) (Data, error) {
	rows, err := m.database.Query(
		`SELECT * FROM user WHERE upload_key = ? LIMIT 1`,
		uploadKey,
	)
	if err != nil {
		return Data{}, err
	}
	users, err := m.usersFromRows(rows)
	rows.Close()
	if err != nil {
		return Data{}, err
	}
	if len(users) == 0 {
		return Data{}, fmt.Errorf("could not find user data with upload key %s", uploadKey)
	}
	return users[0], nil
}

// LoadFromWebKey - load user from web key
func (m *Manager) LoadFromWebKey(webKey string) (Data, error) {
	rows, err := m.database.Query(
		`SELECT * FROM user WHERE web_key = ? LIMIT 1`,
		webKey,
	)
	if err != nil {
		return Data{}, err
	}
	users, err := m.usersFromRows(rows)
	rows.Close()
	if err != nil {
		return Data{}, err
	}
	if len(users) == 0 {
		return Data{}, fmt.Errorf("could not find user data with web key %s", webKey)
	}
	return users[0], nil
}

// LoadFromWebIDString - load user from web ID string
func (m *Manager) LoadFromWebIDString(webIDString string) (Data, error) {
	userID := GetIDFromWebIDString(webIDString)
	return m.LoadFromID(userID)
}

// Save - save user data
/*func (m *Manager) Save(user Data) error {

	stmt, err := m.database.Prepare(
		`UPDATE user SET `,
	)

}*/

// Delete - delete user data from database
func (m *Manager) Delete(user Data) error {
	stmt, err := m.database.Prepare(
		`DELETE FROM user WHERE id = ?`,
	)
	if err != nil {
		return err
	}
	_, err = stmt.Exec(user.ID)
	return err
}
