using System;
using System.Text;
using System.Collections.Generic;
using System.Windows.Forms;
using System.Reflection;
using System.Net.Sockets;
using Advanced_Combat_Tracker;

[assembly: AssemblyTitle("Chompy FFXIV Parse Uploader")]
[assembly: AssemblyDescription("Provides real time parse upload that can be shared with other via the web.")]
[assembly: AssemblyCompany("Nathan Ogden")]
[assembly: AssemblyVersion("0.0.1")]

namespace ACT_Plugin
{
    public class Chompy_FFXIV_Uploader : IActPluginV1
    {

        const string REMOTE_HOST = "localhost";         // Remote host name to send data to
        const UInt16 REMOTE_PORT = 31593;               // Remote port
        //const UInt16 REMOTE_PORT = 65495;               // Remote port
        
        const string UID_CHAR_LIST = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const int UID_SIZE = 5;

        const Int32 VERSION_NUMBER = 1;                 // Version number, much match version number in parse server
        const int MAX_ENCOUNTER_SEND_COUNT = 5;         // Max number of times to send encounter data during single encounter

        const byte DATA_TYPE_SESSION = 1;               // Data type, session data
        const byte DATA_TYPE_ENCOUNTER = 2;             // Data type, encounter data
        const byte DATA_TYPE_COMBATANT = 3;             // Data type, combatant data
        const byte DATA_TYPE_COMBAT_ACTION = 4;         // Data type, combat action
        const byte DATA_TYPE_LOG_LINE = 5;              // Data type, log line

        Label lblStatus;                                // The status label that appears in ACT's Plugin tab
        string sessionUid;                              // Uid of current session
        int encounterSendCount;                         // number of times encounter data has been sent
        UdpClient udpClient;                            // UDP client used to send data

        public void InitPlugin(TabPage pluginScreenSpace, Label pluginStatusText)
        {
            // generate session uid
            generateSessionUid();
            // status label
            lblStatus = pluginStatusText; // Hand the status label's reference to our local var
            // init udp client
            udpClient = new UdpClient();
            udpClient.Connect(REMOTE_HOST, REMOTE_PORT);
            // send session data, multiple times to ensure UDP transmission
            for (var i = 0; i < 3; i++) {
                sendSessionData();
            }
            // hook events
            ActGlobals.oFormActMain.OnCombatStart += new CombatToggleEventDelegate(oFormActMain_OnCombatStart);
            ActGlobals.oFormActMain.OnCombatEnd += new CombatToggleEventDelegate(oFormActMain_OnCombatEnd);
            ActGlobals.oFormActMain.AfterCombatAction += new CombatActionDelegate(oFormActMain_AfterCombatAction);
            ActGlobals.oFormActMain.OnLogLineRead += new LogLineEventDelegate(oFormActMain_OnLogLineRead);
            // update plugin status text
            lblStatus.Text = "Plugin version " + VERSION_NUMBER + " started with session id " + sessionUid + ".";
        }

        public void DeInitPlugin()
        {
            // deinit event hooks
            ActGlobals.oFormActMain.OnCombatStart -= oFormActMain_OnCombatStart;
            ActGlobals.oFormActMain.OnCombatEnd -= oFormActMain_OnCombatEnd;
            ActGlobals.oFormActMain.AfterCombatAction -= oFormActMain_AfterCombatAction;
            ActGlobals.oFormActMain.OnLogLineRead  -= oFormActMain_OnLogLineRead;
            // close udp client
            udpClient.Close();
            // update plugin status text
            lblStatus.Text = "Plugin Exited";
        }

        void oFormActMain_OnCombatStart(bool isImport, CombatToggleEventArgs actionInfo)
        {
            // reset encounter send count
            encounterSendCount = 0;
        }

        void oFormActMain_OnCombatEnd(bool isImport, CombatToggleEventArgs actionInfo)
        {
            // reset encounter send count
            encounterSendCount = 0;
            // makeshift way to ensure UDP transmission makes it to server
            for (int i = 0; i < 3; i++) {
                sendEncounterData(actionInfo.encounter);
            }
        }

        void oFormActMain_AfterCombatAction(bool isImport, CombatActionEventArgs actionInfo)
        {
            sendCombatActionData(actionInfo);
        }

        void oFormActMain_OnLogLineRead(bool isImport, LogLineEventArgs logInfo)
        {
            sendLogLine(logInfo);
        }

        void generateSessionUid()
        {
            sessionUid = "";
            Random randGen = new Random(DateTime.Now.GetHashCode());
            for (int i = 0; i < UID_SIZE; i++) {
                int randValue = randGen.Next(0, UID_CHAR_LIST.Length);
                sessionUid += UID_CHAR_LIST[randValue];
            }
        }

        void sendUdp(ref List<Byte> sendData)
        {
            Byte[] sendBytes = sendData.ToArray();
            udpClient.Send(sendBytes, sendBytes.Length);          
        }

        void prepareInt64(ref List<Byte> sendData, Int64 value)
        {
            Byte[] valueBytes = BitConverter.GetBytes(value);
            if (BitConverter.IsLittleEndian) {
                 Array.Reverse(valueBytes);
            }
            sendData.AddRange(valueBytes);
        }

        void prepareInt32(ref List<Byte> sendData, Int32 value)
        {
            Byte[] valueBytes = BitConverter.GetBytes(value);
            if (BitConverter.IsLittleEndian) {
                 Array.Reverse(valueBytes);
            }
            sendData.AddRange(valueBytes);
        }

        void prepareString(ref List<Byte> sendData, string value)
        {
            Byte[] valueBytes = Encoding.UTF8.GetBytes(value);
            sendData.Add((byte) valueBytes.Length);
            sendData.AddRange(valueBytes);
        }

        void sendSessionData()
        {
            // build send data
            List<Byte> sendData = new List<Byte>();
            sendData.Add(DATA_TYPE_SESSION);
            prepareInt32(ref sendData, VERSION_NUMBER);
            prepareString(ref sendData, sessionUid);
            // send
            sendUdp(ref sendData);
        }

        void sendCombatActionData(CombatActionEventArgs actionInfo)
        {
            if (actionInfo.cancelAction) {
                return;
            }
            // get encounter
            EncounterData encounter = ActGlobals.oFormActMain.ActiveZone.ActiveEncounter;
            // build send data
            List<Byte> sendData = new List<Byte>();
            sendData.Add(DATA_TYPE_COMBAT_ACTION);                         // declare data type
            prepareInt32(ref sendData, encounter.StartTime.GetHashCode()); // encounter id
            prepareInt64(ref sendData, actionInfo.time.Ticks);             // time
            prepareInt32(ref sendData, actionInfo.timeSorter);             // sort for items with same time
            prepareString(ref sendData, actionInfo.attacker);              // attacker name
            prepareString(ref sendData, actionInfo.victim);                // victim name
            prepareInt64(ref sendData, actionInfo.damage);                 // damage number
            prepareString(ref sendData, actionInfo.theAttackType);         // skill name
            prepareString(ref sendData, actionInfo.theDamageType);         // skill type
            sendData.Add((byte) actionInfo.swingType);                     // "swing type"
            sendData.Add((byte) (actionInfo.critical ? 1 : 0));            // was critical
            // send
            sendUdp(ref sendData);
            // send encounter data
            sendEncounterData(encounter);
            // check if action data is ally action, if so send updated combatant data
            foreach (CombatantData cd in encounter.GetAllies()) {
                if (cd.Name == actionInfo.attacker) {
                    sendEncounterCombatantData(cd);
                }
            }
        }

        void sendEncounterData(EncounterData ed)
        {
            // max encounter send count
            if (encounterSendCount > MAX_ENCOUNTER_SEND_COUNT) {
                return;
            }
            encounterSendCount++;
            // build send data
            List<Byte> sendData = new List<Byte>();
            sendData.Add(DATA_TYPE_ENCOUNTER);                             // declare data type
            prepareInt32(ref sendData, ed.StartTime.GetHashCode());        // encounter id (start time hash code)
            prepareInt64(ref sendData, ed.StartTime.Ticks);                // start time of encounter
            prepareInt64(ref sendData, ed.EndTime.Ticks);                  // end time of encounter
            prepareString(ref sendData, ed.ZoneName);                      // zone name
            sendData.Add((byte) (ed.Active ? 1 : 0));                      // is still active encounter
            sendData.Add((byte) ed.GetEncounterSuccessLevel());            // success level of encounter
            // send
            sendUdp(ref sendData);
        }

        void sendEncounterCombatantData(CombatantData cd)
        {
            // build send data
            List<Byte> sendData = new List<Byte>();
            sendData.Add(DATA_TYPE_COMBATANT);                             // declare data type
            prepareInt32(ref sendData, cd.StartTime.GetHashCode());        // encounter id
            prepareString(ref sendData, cd.Name);                          // combatant name
            prepareString(ref sendData, cd.GetColumnByName("Job"));        // combatant job (ffxiv)
            prepareInt64(ref sendData, cd.Damage);                         // damage done
            prepareInt64(ref sendData, cd.DamageTaken);                    // damage taken
            prepareInt64(ref sendData, cd.Healed);                         // damage healed
            prepareInt32(ref sendData, cd.Deaths);                         // number of deaths
            prepareInt32(ref sendData, cd.Hits);                           // number of attacks
            prepareInt32(ref sendData, cd.Heals);                          // number of heals performed
            prepareInt32(ref sendData, cd.Kills);                          // number of kills
            // send
            sendUdp(ref sendData);
        }

        void sendLogLine(LogLineEventArgs logInfo)
        {
            List<Byte> sendData = new List<Byte>();
            sendData.Add(DATA_TYPE_LOG_LINE);
            // encounter id, if active
            Int32 encounterId = 0;
            if (logInfo.inCombat) {
                encounterId = ActGlobals.oFormActMain.ActiveZone.ActiveEncounter.StartTime.GetHashCode();
            }
            prepareInt32(ref sendData, encounterId);
            // time
            prepareInt64(ref sendData, logInfo.detectedTime.Ticks);
            // line
            Byte[] logLineBytes = Encoding.UTF8.GetBytes(logInfo.logLine);
            prepareInt32(ref sendData, logLineBytes.Length);
            sendData.AddRange(logLineBytes);
            // send
            sendUdp(ref sendData);
        }

    }
}
