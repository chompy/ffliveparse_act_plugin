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
    public class Chompy_FFXIV_Parse : IActPluginV1
    {

        const string REMOTE_HOST = "localhost";         // Remote host name to send data to
        const UInt16 REMOTE_PORT = 65495;               // Remote port
        const UInt16 LOCAL_PORT = 31592;                // Local port

        const byte DATA_TYPE_COMBAT_ACTION = 1;         // Data type, combat action
        const byte DATA_TYPE_ENCOUNTER = 2;             // Data type, encounter data
        const byte DATA_TYPE_COMBATANT = 3;             // Data type, combatant data

        Label lblStatus;                                // The status label that appears in ACT's Plugin tab

        public void InitPlugin(TabPage pluginScreenSpace, Label pluginStatusText)
        {
            lblStatus = pluginStatusText; // Hand the status label's reference to our local var
            // hook events
            ActGlobals.oFormActMain.OnCombatStart += new CombatToggleEventDelegate(oFormActMain_OnCombatStart);
            ActGlobals.oFormActMain.OnCombatEnd += new CombatToggleEventDelegate(oFormActMain_OnCombatEnd);
            ActGlobals.oFormActMain.AfterCombatAction += new CombatActionDelegate(oFormActMain_AfterCombatAction);
            // update plugin status text
            lblStatus.Text = "Plugin Started - [ 3GB4V ]";
        }

        public void DeInitPlugin()
        {
            // deinit event hooks
            ActGlobals.oFormActMain.OnCombatStart -= oFormActMain_OnCombatStart;
            ActGlobals.oFormActMain.OnCombatEnd -= oFormActMain_OnCombatEnd;
            ActGlobals.oFormActMain.AfterCombatAction -= oFormActMain_AfterCombatAction;
            // update plugin status text
            lblStatus.Text = "Plugin Exited";
        }

        void oFormActMain_OnCombatStart(bool isImport, CombatToggleEventArgs actionInfo)
        {
            sendEncounterData(actionInfo.encounter);
        }

        void oFormActMain_OnCombatEnd(bool isImport, CombatToggleEventArgs actionInfo)
        {
            sendEncounterData(actionInfo.encounter);
        }

        void oFormActMain_AfterCombatAction(bool isImport, CombatActionEventArgs actionInfo)
        {
            sendCombatActionData(actionInfo);
        }

        void sendUdp(ref List<Byte> sendData)
        {
            // convert byte list to byte array
            Byte[] sendBytes = sendData.ToArray();
            // send
            UdpClient udpClient = new UdpClient(LOCAL_PORT);
            udpClient.Connect(REMOTE_HOST, REMOTE_PORT);
            udpClient.Send(sendBytes, sendBytes.Length);
            udpClient.Close();            
        }

        void prepareInt64(ref List<Byte> sendData, Int64 value)
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

        void sendCombatActionData(CombatActionEventArgs actionInfo)
        {
            if (actionInfo.cancelAction) {
                return;
            }
            /*// build send data
            List<Byte> sendData = new List<Byte>();
            sendData.Add(DATA_TYPE_COMBAT_ACTION);                         // declare data type
            prepareInt64(ref sendData, actionInfo.time.ToBinary());        // time
            prepareString(ref sendData, actionInfo.attacker);              // attacker name
            prepareString(ref sendData, actionInfo.victim);                // victim name
            prepareInt64(ref sendData, actionInfo.damage);                 // damage number
            prepareString(ref sendData, actionInfo.theAttackType);         // skill name
            prepareString(ref sendData, actionInfo.theDamageType);         // skill type
            sendData.Add((byte) actionInfo.swingType);                     // "swing type"
            sendData.Add((byte) (actionInfo.critical ? 1 : 0));            // was critical
            // send
            sendUdp(ref sendData);*/
            // send encounter data

            // check if action data is ally action, if so send updated combatant data
            foreach (CombatantData cd in ActGlobals.oFormActMain.ActiveZone.ActiveEncounter.GetAllies()) {
                if (cd.Name == actionInfo.attacker) {
                    sendEncounterCombatantData(cd);
                }
            }
        }

        void sendEncounterData(EncounterData ed)
        {
            // build send data
            List<Byte> sendData = new List<Byte>();
            sendData.Add(DATA_TYPE_ENCOUNTER);                             // declare data type
            prepareInt64(ref sendData, ed.StartTime.ToBinary());           // start time of encounter
            prepareInt64(ref sendData, ed.EndTime.ToBinary());             // end time of encounter
            sendData.Add((byte) (ed.Active ? 1 : 0));                      // is still active encounter
            prepareString(ref sendData, ed.ZoneName);                      // zone name
            prepareString(ref sendData, ed.EncId);                         // encounter id          
            // send
            sendUdp(ref sendData);
            // get ally combatants, send data
            foreach (CombatantData cd in ed.GetAllies()) {
                sendEncounterCombatantData(cd);
            }
        }

        void sendEncounterCombatantData(CombatantData cd)
        {
            // build send data
            List<Byte> sendData = new List<Byte>();
            sendData.Add(DATA_TYPE_COMBATANT);                             // declare data type
            prepareString(ref sendData, cd.Name);                          // combatant name
            prepareInt64(ref sendData, cd.Damage);                         // damage done
            prepareInt64(ref sendData, cd.DamageTaken);                    // damage taken
            prepareInt64(ref sendData, cd.Healed);                         // damage healed
            prepareInt64(ref sendData, cd.Deaths);                         // number of deaths
            prepareInt64(ref sendData, cd.Hits);                           // number of attacks
            prepareInt64(ref sendData, cd.Heals);                          // number of heals
            prepareInt64(ref sendData, cd.Kills);                          // number of kills
            // send
            sendUdp(ref sendData);
        }

    }
}
