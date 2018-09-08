package act

import (
	"encoding/binary"
)

func writeInt64(data *[]byte, value int64) {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, uint64(value))
	*data = append(*data, buf...)
}

func writeInt32(data *[]byte, value int32) {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint32(buf, uint32(value))
	*data = append(*data, buf...)
}

func writeByte(data *[]byte, value byte) {
	*data = append(*data, value)
}

func writeBool(data *[]byte, value bool) {
	if value {
		*data = append(*data, 1)
		return
	}
	*data = append(*data, 0)
}

func writeString(data *[]byte, value string) {
	if len(value) > 255 {
		value = value[0:255]
	}
	*data = append(*data, byte(len(value)))
	*data = append(*data, []byte(value)...)
}

// EncodeEncounterBytes - Create Encounter byte array
func EncodeEncounterBytes(value *Encounter) []byte {
	data := make([]byte, 1)
	data[0] = DataTypeEncounter
	writeInt32(&data, value.ID)
	writeInt64(&data, value.StartTick)
	writeInt64(&data, value.EndTick)
	writeString(&data, value.Zone)
	writeBool(&data, value.Active)
	writeByte(&data, value.SuccessLevel)
	return data
}

// EncodeCombatantBytes - Create Combatant byte array
func EncodeCombatantBytes(value *Combatant) []byte {
	data := make([]byte, 1)
	data[0] = DataTypeCombatant
	writeInt32(&data, value.EncounterID)
	writeString(&data, value.Name)
	writeString(&data, value.Job)
	writeInt64(&data, value.Damage)
	writeInt64(&data, value.DamageTaken)
	writeInt64(&data, value.DamageHealed)
	writeInt32(&data, value.Deaths)
	writeInt32(&data, value.Hits)
	writeInt32(&data, value.Heals)
	writeInt32(&data, value.Kills)
	return data
}

// EncodeCombatActionBytes - Create CombatAction byte array
func EncodeCombatActionBytes(value *CombatAction) []byte {
	data := make([]byte, 1)
	data[0] = DataTypeCombatAction
	writeInt32(&data, value.EncounterID)
	writeInt64(&data, value.Tick)
	writeInt32(&data, value.Sort)
	writeString(&data, value.Attacker)
	writeString(&data, value.Victim)
	writeInt64(&data, value.Damage)
	writeString(&data, value.Skill)
	writeString(&data, value.SkillType)
	writeByte(&data, value.SwingType)
	writeBool(&data, value.Critical)
	return data
}
