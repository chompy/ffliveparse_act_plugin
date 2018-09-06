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

		const string REMOTE_HOST = "localhost";		// Remote host name to send data to
		const UInt16 REMOTE_PORT = 64226;			// Remote port

		const byte DATA_TYPE_COMBAT_ACTION = 1;		// Data type, combat action
		//const byte DATA_TYPE_COMBATANT = 2;

   		Label lblStatus;		// The status label that appears in ACT's Plugin tab

		public void InitPlugin(TabPage pluginScreenSpace, Label pluginStatusText)
		{
			lblStatus = pluginStatusText;	// Hand the status label's reference to our local var
			// hook events
			ActGlobals.oFormActMain.AfterCombatAction += new CombatActionDelegate(oFormActMain_AfterCombatAction);
			// update plugin status text
			lblStatus.Text = "Plugin Started - [ 3GB4V ]";
		}

		public void DeInitPlugin()
		{
			// deinit event hooks
			ActGlobals.oFormActMain.AfterCombatAction -= oFormActMain_AfterCombatAction;
			// update plugin status text
			lblStatus.Text = "Plugin Exited";
		}

		void oFormActMain_AfterCombatAction(bool isImport, CombatActionEventArgs actionInfo)
		{
			lblStatus.Text = "Combat happened -- " + actionInfo.damage.DamageString;
			sendCombatActionData(actionInfo);
		}

		void sendInt64(ref List<Byte> sendData, Int64 value)
		{
			Byte[] valueBytes = BitConverter.GetBytes(value);
			if (BitConverter.IsLittleEndian) {
				 Array.Reverse(valueBytes);
			}
			sendData.AddRange(valueBytes);
		}

		void sendString(ref List<Byte> sendData, string value)
		{
			Byte[] valueBytes = Encoding.UTF8.GetBytes(value);
			sendData.Add((byte) valueBytes.Length);
			sendData.AddRange(valueBytes);
		}

		void sendCombatActionData(CombatActionEventArgs actionInfo)
		{
			// build send data
			List<Byte> sendData = new List<Byte>();
			sendInt64(ref sendData, actionInfo.time.ToBinary());
			sendString(ref sendData, actionInfo.attacker);
			sendInt64(ref sendData, actionInfo.damage);
			// convert byte list to byte array
			Byte[] sendBytes = sendData.ToArray();
			// send
			UdpClient _udpClient = new UdpClient(31593); // udp client for uploading data
			_udpClient.Connect(REMOTE_HOST, REMOTE_PORT);
			_udpClient.Send(sendBytes, sendBytes.Length);
			_udpClient.Close();


		}



	}
}
