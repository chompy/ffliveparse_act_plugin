using System;
using System.IO;
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
    public class Chompy_FFXIV_Uploader : UserControl, IActPluginV1
    {

        const string DEFAULT_REMOTE_HOST = "ffxiv.chompy.me";   // Default remote host name to send data to
        const UInt16 DEFAULT_REMOTE_PORT = 31593;               // Default remote port
        
        const string UID_CHAR_LIST = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const int UID_SIZE = 5;

        const Int32 VERSION_NUMBER = 1;                         // Version number, much match version number in parse server
        const byte DATA_TYPE_SESSION = 1;                       // Data type, session data
        const byte DATA_TYPE_ENCOUNTER = 2;                     // Data type, encounter data
        const byte DATA_TYPE_COMBATANT = 3;                     // Data type, combatant data
        const byte DATA_TYPE_COMBAT_ACTION = 4;                 // Data type, combat action
        const byte DATA_TYPE_LOG_LINE = 5;                      // Data type, log line

        private string settingFilePath = Path.Combine(
            ActGlobals.oFormActMain.AppDataFolder.FullName,
            "Config\\Chompy_FFXIV_Uploader.config.dat"
        );

        private Label lblStatus;                                // The status label that appears in ACT's Plugin tab
        private UdpClient udpClient;                            // UDP client used to send data
        private string remoteHost;                              // Remote host name to send data to
        private UInt16 remotePort;                              // Remote port
        private string privateKey;                              // Private key

		private TextBox textboxPrivateKey;                      // form text box for private key
		private System.Windows.Forms.Label labelPrivateKey;     // form label for private key
		private TextBox textboxHost;                            // form text box for host
		private System.Windows.Forms.Label labelHost;           // form label for host
        private Button buttonSave;                              // form button to save settings


        public Chompy_FFXIV_Uploader()
        {
			this.labelPrivateKey = new System.Windows.Forms.Label();
			this.textboxPrivateKey = new System.Windows.Forms.TextBox();
			this.labelHost = new System.Windows.Forms.Label();
			this.textboxHost = new System.Windows.Forms.TextBox();
            this.buttonSave = new System.Windows.Forms.Button();
			this.SuspendLayout();
            // label - private key
			this.labelPrivateKey.AutoSize = true;
			this.labelPrivateKey.Location = new System.Drawing.Point(8, 8);
			this.labelPrivateKey.Name = "labelPrivateKey";
			this.labelPrivateKey.Size = new System.Drawing.Size(434, 13);
			this.labelPrivateKey.TabIndex = 0;
			this.labelPrivateKey.Text = "Private Key (Copy this from the website.)";
			// textbox - private key
			this.textboxPrivateKey.Location = new System.Drawing.Point(8, 24);
			this.textboxPrivateKey.Name = "textboxPrivateKey";
			this.textboxPrivateKey.Size = new System.Drawing.Size(431, 20);
			this.textboxPrivateKey.TabIndex = 1;
			this.textboxPrivateKey.Text = "";
            // label - host
			this.labelHost.AutoSize = true;
			this.labelHost.Location = new System.Drawing.Point(8, 50);
			this.labelHost.Name = "labelHost";
			this.labelHost.Size = new System.Drawing.Size(434, 13);
			this.labelHost.TabIndex = 2;
			this.labelHost.Text = "Upload Server Address (You probably don't need to change this.)";
			// textbox - host
			this.textboxHost.Location = new System.Drawing.Point(8, 66);
			this.textboxHost.Name = "textboxHost";
			this.textboxHost.Size = new System.Drawing.Size(431, 20);
			this.textboxHost.TabIndex = 3;
			this.textboxHost.Text = DEFAULT_REMOTE_HOST + ":" + DEFAULT_REMOTE_PORT;
            // button save
            this.buttonSave.Location = new System.Drawing.Point(8, 95);
            this.buttonSave.Name = "buttonSave";
            this.buttonSave.Size = new System.Drawing.Size(48, 24);
            this.buttonSave.TabIndex = 4;
            this.buttonSave.Text = "Save";

			this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
			this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
			this.Controls.Add(this.textboxPrivateKey);
			this.Controls.Add(this.labelPrivateKey);
            this.Controls.Add(this.textboxHost);
            this.Controls.Add(this.labelHost);
            this.Controls.Add(this.buttonSave);
			this.Name = "Chompy_FFXIV_Uploader";
			this.Size = new System.Drawing.Size(686, 384);
			this.ResumeLayout(false);
			this.PerformLayout();
        }

        public void InitPlugin(TabPage pluginScreenSpace, Label pluginStatusText)
        {
            // status label
            lblStatus = pluginStatusText; // Hand the status label's reference to our local var
            // update plugin status text
            lblStatus.Text = "Plugin version " + ((float) VERSION_NUMBER / 100.0).ToString("n2") + " started.";
            // load settings
            loadSettings();
            // init udp client
            udpClient = new UdpClient();
            udpConnect();
            // hook events
            ActGlobals.oFormActMain.OnCombatStart += new CombatToggleEventDelegate(oFormActMain_OnCombatStart);
            ActGlobals.oFormActMain.OnCombatEnd += new CombatToggleEventDelegate(oFormActMain_OnCombatEnd);
            ActGlobals.oFormActMain.AfterCombatAction += new CombatActionDelegate(oFormActMain_AfterCombatAction);
            ActGlobals.oFormActMain.OnLogLineRead += new LogLineEventDelegate(oFormActMain_OnLogLineRead);
            this.buttonSave.Click += new EventHandler(buttonSave_OnClick);
            // form stuff
			pluginScreenSpace.Controls.Add(this);	// Add this UserControl to the tab ACT provides
			this.Dock = DockStyle.Fill;	// Expand the UserControl to fill the tab's client space

        }

        public void DeInitPlugin()
        {
            // deinit event hooks
            ActGlobals.oFormActMain.OnCombatStart -= oFormActMain_OnCombatStart;
            ActGlobals.oFormActMain.OnCombatEnd -= oFormActMain_OnCombatEnd;
            ActGlobals.oFormActMain.AfterCombatAction -= oFormActMain_AfterCombatAction;
            ActGlobals.oFormActMain.OnLogLineRead  -= oFormActMain_OnLogLineRead;
            this.buttonSave.Click -= buttonSave_OnClick;
            // close udp client
            udpClient.Close();
            // update plugin status text
            lblStatus.Text = "Plugin Exited";
        }

        void oFormActMain_OnCombatStart(bool isImport, CombatToggleEventArgs actionInfo)
        {
        }

        void oFormActMain_OnCombatEnd(bool isImport, CombatToggleEventArgs actionInfo)
        {
            // makeshift way to ensure UDP transmission makes it to server
            for (int i = 0; i < 3; i++) {
                sendEncounterData(actionInfo.encounter);
            }
        }

        void oFormActMain_AfterCombatAction(bool isImport, CombatActionEventArgs actionInfo)
        {
            sendCombatData(actionInfo);
        }

        void oFormActMain_OnLogLineRead(bool isImport, LogLineEventArgs logInfo)
        {
            sendLogLine(logInfo);
        }

        void buttonSave_OnClick(object sender, System.EventArgs e)
        {
            saveSettings();
            loadSettings();
            udpConnect();
        }

        void udpConnect()
        {
            if (string.IsNullOrEmpty(this.remoteHost) || this.remotePort == 0) {
                lblStatus.Text = "ERROR: Invalid or missing upload server address.";
                return;
            }
            if (string.IsNullOrEmpty(this.privateKey)) {
                lblStatus.Text = "ERROR: Private key is not set.";
                return;                
            }
            try {
                udpClient.Connect(this.remoteHost, this.remotePort);
                // send session data, multiple times to ensure UDP transmission
                for (var i = 0; i < 3; i++) {
                    sendSessionData();
                }
            } catch (System.Net.Sockets.SocketException e) {
                lblStatus.Text = "ERROR: " + e.Message;
            }
        }

        void sendUdp(ref List<Byte> sendData)
        {
            Byte[] sendBytes = sendData.ToArray();
            udpClient.Send(sendBytes, sendBytes.Length);          
        }

        void prepareDateTime(ref List<Byte> sendData, DateTime value) 
        {
            string dateTimeString = value.ToString("o");
            prepareString(ref sendData, dateTimeString);
        }

        void prepareUint16(ref List<Byte> sendData, UInt16 value)
        {
            Byte[] valueBytes = BitConverter.GetBytes((UInt16)value);
            if (BitConverter.IsLittleEndian) {
                 Array.Reverse(valueBytes);
            }
            sendData.AddRange(valueBytes);   
        }

        void prepareInt32(ref List<Byte> sendData, Int32 value)
        {
            Byte[] valueBytes = BitConverter.GetBytes((Int32)value);
            if (BitConverter.IsLittleEndian) {
                 Array.Reverse(valueBytes);
            }
            sendData.AddRange(valueBytes);
        }

        void prepareString(ref List<Byte> sendData, string value)
        {
            Byte[] valueBytes = Encoding.UTF8.GetBytes(value);
            prepareUint16(ref sendData, (UInt16) valueBytes.Length);
            if (valueBytes.Length > 0) {
                sendData.AddRange(valueBytes);
            }
        }

        void sendSessionData()
        {
            if (string.IsNullOrEmpty(this.privateKey)) {
                return;
            }
            // build send data
            List<Byte> sendData = new List<Byte>();
            sendData.Add(DATA_TYPE_SESSION);
            prepareInt32(ref sendData, VERSION_NUMBER);
            prepareString(ref sendData, this.privateKey);
            // send
            sendUdp(ref sendData);
        }

        void sendCombatData(CombatActionEventArgs actionInfo)
        {
            if (actionInfo.cancelAction) {
                return;
            }
            // get encounter
            EncounterData encounter = actionInfo.combatAction.ParentEncounter;
            // send encounter data
            sendEncounterData(encounter);
            // send combatant data
            foreach (CombatantData cd in encounter.GetAllies()) {
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
            prepareInt32(ref sendData, ed.StartTime.GetHashCode());        // encounter id (start time hash code)
            prepareDateTime(ref sendData, ed.StartTime);                   // start time of encounter
            prepareDateTime(ref sendData, ed.EndTime);                     // end time of encounter
            prepareString(ref sendData, ed.ZoneName);                      // zone name
            prepareInt32(ref sendData, (Int32) ed.Damage);                 // encounter damage
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
            prepareInt32(ref sendData, cd.EncStartTime.GetHashCode());     // encounter id
            prepareString(ref sendData, cd.Name);                          // combatant name
            prepareString(ref sendData, cd.GetColumnByName("Job"));        // combatant job (ffxiv)
            prepareInt32(ref sendData, (Int32) cd.Damage);                 // damage done
            prepareInt32(ref sendData, (Int32) cd.DamageTaken);            // damage taken
            prepareInt32(ref sendData, (Int32) cd.Healed);                 // damage healed
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
            prepareDateTime(ref sendData, logInfo.detectedTime);
            // line
            prepareString(ref sendData, logInfo.logLine);
            // send
            sendUdp(ref sendData);
        }

        void loadSettings()
        {
            this.remoteHost = DEFAULT_REMOTE_HOST;
            this.remotePort = DEFAULT_REMOTE_PORT;
            if (!File.Exists(settingFilePath)) {
                return;
            }
            List<Byte> data = new List<Byte>();
            using (FileStream fs = new FileStream(settingFilePath, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                using (MemoryStream ms = new MemoryStream())
                {
                    fs.CopyTo(ms);
                    data.AddRange(ms.ToArray());
                }
            }
            int pos = 0;
            List<string> settingStrings = new List<string>();
            for (var i = 0; i < 2; i++) {
                byte[] stringLenArr = data.GetRange(pos, 2).ToArray();
                if (BitConverter.IsLittleEndian) {
                    Array.Reverse(stringLenArr);
                }
                UInt16 stringLen = (UInt16)BitConverter.ToInt16(stringLenArr, 0);
                pos += 2;
                if (stringLen > 0) {
                    settingStrings.Add(System.Text.Encoding.UTF8.GetString(data.ToArray(), pos, stringLen));
                    pos += stringLen;
                    continue;
                }
                settingStrings.Add("");
            }
            this.privateKey = settingStrings[0];
            string[] hostData = settingStrings[1].Split(':');
            this.remoteHost = hostData[0];
            if (hostData.Length > 1) {
                UInt16.TryParse(hostData[1], out this.remotePort);
            }
            // update textboxes
            textboxPrivateKey.Text = settingStrings[0];
            textboxHost.Text = settingStrings[1];
        }

        void saveSettings()
        {
            List<Byte> saveData = new List<Byte>();
            prepareString(ref saveData, this.textboxPrivateKey.Text);
            prepareString(ref saveData, this.textboxHost.Text);
            Byte[] saveBytes = saveData.ToArray();
            using (FileStream fs = new FileStream(settingFilePath, FileMode.Create, FileAccess.Write, FileShare.Write))
            {
                fs.Write(saveBytes, 0, saveBytes.Length);
            }
            lblStatus.Text = " Settings saved.";
        }

    }
}
