
var DATA_TYPE_ENCOUNTER = 2;
var DATA_TYPE_COMBATANT = 3;
var DATA_TYPE_COMBAT_ACTION = 4;
var DATA_TYPE_LOG_LINE = 5;

var SIZE_BYTE = 1;
var SIZE_INT32 = 4;

function readInt32(data, pos)
{
    var buf = data.slice(pos, pos+SIZE_INT32);
    return new DataView(buf.buffer).getInt32()
}

function readUint32(data, pos)
{
    var buf = data.slice(pos, pos+SIZE_INT32);
    return new DataView(buf.buffer).getUint32()
}

function readByte(data, pos)
{
    return data[pos];
}

function readString(data, pos)
{
    var strLen = data[pos];
    return new TextDecoder("utf-8").decode(data.slice(pos + 1, pos + 1 + strLen));
}

function decodeEncounterBytes(data)
{
    if (data[0] != DATA_TYPE_ENCOUNTER) {
        return null;
    }
    var pos = 1;
    var output = {
        "Type" : DATA_TYPE_ENCOUNTER
    };
    output["ID"]            = readUint32(data, pos).toString(36).toUpperCase(); pos += SIZE_INT32;
    output["StartTime"]     = readString(data, pos); pos += 1+output["StartTime"].length;
    output["EndTime"]       = readString(data, pos); pos += 1+output["EndTime"].length;
    output["Zone"]          = readString(data, pos); pos += 1 + output["Zone"].length;
    output["Active"]        = readByte(data, pos) != 0; pos += SIZE_BYTE;
    output["SuccessLevel"]  = readByte(data, pos); pos += SIZE_BYTE;
    
    output["StartTime"]     = new Date(output["StartTime"]);
    output["EndTime"]       = new Date(output["EndTime"]);
    window.dispatchEvent(
        new CustomEvent("act:encounter", {"detail" : output})
    );
    return output;
}

function decodeCombatantBytes(data)
{
    if (data[0] != DATA_TYPE_COMBATANT) {
        return null;
    }
    var pos = 1;
    var output = {
        "Type" : DATA_TYPE_COMBATANT
    };
    output["EncounterID"]   = readUint32(data, pos).toString(36).toUpperCase(); pos += SIZE_INT32;
    output["Name"]          = readString(data, pos); pos += 1+output["Name"].length;
    output["Job"]           = readString(data, pos); pos += 1+output["Job"].length;
    output["Damage"]        = readInt32(data, pos); pos += SIZE_INT32;
    output["DamageTaken"]   = readInt32(data, pos); pos += SIZE_INT32;
    output["DamageHealed"]  = readInt32(data, pos); pos += SIZE_INT32;
    output["Deaths"]        = readInt32(data, pos); pos += SIZE_INT32;
    output["Hits"]          = readInt32(data, pos); pos += SIZE_INT32;
    output["Heals"]         = readInt32(data, pos); pos += SIZE_INT32;
    output["Kills" ]        = readInt32(data, pos); pos += SIZE_INT32;
    window.dispatchEvent(
        new CustomEvent("act:combatant", {"detail" : output})
    );
    return output;
}

function decodeCombatActionBytes(data)
{
    if (data[0] != DATA_TYPE_COMBAT_ACTION) {
        return null;
    }
    var pos = 1;
    var output = {
        "Type" : DATA_TYPE_COMBAT_ACTION
    };
    output["EncounterID"]   = readUint32(data, pos).toString(36).toUpperCase(); pos += SIZE_INT32;
    output["Time"]          = readString(data, pos); pos += 1+output["Time"].length;
    output["Sort"]          = readInt32(data, pos); pos += SIZE_INT32;
    output["Attacker"]      = readString(data, pos); pos += 1+output["Attacker"].length;
    output["Victim"]        = readString(data, pos); pos += 1+output["Victim"].length;
    output["Damage"]        = readInt32(data, pos); pos += SIZE_INT32;
    output["Skill"]         = readString(data, pos); pos += 1+output["Skill"].length;
    output["SkillType"]     = readString(data, pos); pos += 1+output["SkillType"].length;
    output["SwingType"]     = readByte(data, pos); pos += SIZE_BYTE;
    output["Critical"]      = readByte(data, pos) != 0; pos += SIZE_BYTE;
    window.dispatchEvent(
        new CustomEvent("act:combatAction", {"detail" : output})
    );
    return output;
}

function decodeLogLineBytes(data)
{
    if (data[0] != DATA_TYPE_LOG_LINE) {
        return null;
    }
    var pos = 1;
    var output = {
        "Type" : DATA_TYPE_LOG_LINE
    };
    output["EncounterID"]   = readUint32(data, pos).toString(36).toUpperCase(); pos += SIZE_INT32;
    output["Time"]          = readString(data, pos); pos += 1+output["Time"].length;
    logLineLength           = readInt32(data, pos); pos += SIZE_INT32;
    output["LogLine"]       = new TextDecoder("utf-8").decode(data.slice(pos + 1, pos + 1 + logLineLength));
    window.dispatchEvent(
        new CustomEvent("act:logLine", {"detail" : output})
    );
    return output;
}

function parseMessage(data)
{
    switch (data[0])
    {
        case DATA_TYPE_ENCOUNTER:
        {
            return decodeEncounterBytes(data);
        }
        case DATA_TYPE_COMBATANT:
        {
            return decodeCombatantBytes(data);
        }
        case DATA_TYPE_COMBAT_ACTION:
        {
            return decodeCombatActionBytes(data);
        }
        case DATA_TYPE_LOG_LINE:
        {
            return decodeLogLineBytes(data);
        }
    }
    return null;
}