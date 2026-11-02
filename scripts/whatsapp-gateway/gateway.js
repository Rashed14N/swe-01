/**
 * SWE Portal - Free Open-Source WhatsApp Gateway
 * Built with @whiskeysockets/baileys (100% Free & Open-Source)
 * 
 * GitHub: https://github.com/WhiskeySockets/Baileys
 * 
 * Instructions:
 * 1. cd scripts/whatsapp-gateway
 * 2. npm install
 * 3. npm start
 * 4. Scan the QR code displayed in the terminal with your WhatsApp app (Linked Devices).
 * 5. Configure WHATSAPP_GATEWAY_URL=http://localhost:8000/send-message in the main app .env
 */

const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

let sock = null;
let connectionStatus = 'initializing';
let lastQr = null;

async function startWhatsAppSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(`[WhatsApp Gateway] Using WA v${version.join('.')}, isLatest: ${isLatest}`);

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['SWE Portal Bot', 'Chrome', '1.0.0'],
    defaultQueryTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      lastQr = qr;
      connectionStatus = 'qr_ready';
      console.log('\n=============================================================');
      console.log('📱 Scan this QR code with WhatsApp (Linked Devices):');
      console.log('=============================================================\n');
      qrcode.generate(qr, { small: true });
      console.log('\n=============================================================');
      console.log('Or view status at: http://localhost:' + PORT + '/status');
      console.log('=============================================================\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      connectionStatus = 'disconnected';
      console.log(
        `[WhatsApp Gateway] Connection closed. Reason: ${statusCode || 'unknown'}. Reconnecting: ${shouldReconnect}`
      );

      if (shouldReconnect) {
        setTimeout(startWhatsAppSocket, 3000);
      } else {
        console.log('[WhatsApp Gateway] Device logged out. Please remove auth_info_baileys folder and restart.');
      }
    } else if (connection === 'open') {
      connectionStatus = 'connected';
      lastQr = null;
      console.log('\n✅ [WhatsApp Gateway] SUCCESS: Connected to WhatsApp Web!');
      console.log(`🤖 Bot is ready to auto-dispatch student exam alerts on port ${PORT}.\n`);
    }
  });
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

/**
 * GET /status
 * Returns current connection state
 */
app.get('/status', (req, res) => {
  res.json({
    gateway: 'Baileys Open-Source WhatsApp Gateway',
    status: connectionStatus,
    connected: connectionStatus === 'connected',
    hasQr: !!lastQr,
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /send-message
 * Dispatches an automated WhatsApp message to a phone number.
 * Body: { phone: "88017XXXXXXXX", message: "..." }
 */
app.post('/send-message', async (req, res) => {
  const { phone, to, message, text } = req.body;
  const targetPhone = phone || to;
  const targetText = message || text;

  if (!targetPhone || !targetText) {
    return res.status(400).json({
      success: false,
      error: 'Missing phone or message in request body',
    });
  }

  // Sanitize phone number (strip '+', '-', spaces)
  let cleanNumber = String(targetPhone).replace(/[^\d]/g, '');

  // Normalize Bangladesh standard mobile numbers
  if (cleanNumber.startsWith('01') && cleanNumber.length === 11) {
    cleanNumber = '88' + cleanNumber;
  } else if (cleanNumber.startsWith('1') && cleanNumber.length === 10) {
    cleanNumber = '880' + cleanNumber;
  }

  const jid = `${cleanNumber}@s.whatsapp.net`;

  if (connectionStatus !== 'connected' || !sock) {
    console.warn(
      `[WhatsApp Gateway Warning] Cannot send to ${cleanNumber}: Gateway is not connected (${connectionStatus}). Message queued.`
    );
    return res.status(503).json({
      success: false,
      error: `WhatsApp socket not connected yet (Status: ${connectionStatus}). Scan the QR code first.`,
      simulatedQueue: true,
      phone: cleanNumber,
    });
  }

  try {
    console.log(`[WhatsApp Gateway] Dispatching automated message to ${jid}...`);
    const sent = await sock.sendMessage(jid, { text: targetText });

    return res.json({
      success: true,
      id: sent?.key?.id || `wa-${Date.now()}`,
      to: cleanNumber,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[WhatsApp Gateway Send Error] to ${cleanNumber}:`, err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch WhatsApp message',
      phone: cleanNumber,
    });
  }
});

// Start Gateway
startWhatsAppSocket().catch((err) => {
  console.error('[WhatsApp Gateway Startup Error]:', err);
});

app.listen(PORT, () => {
  console.log(`🚀 SWE WhatsApp Gateway Microservice listening on http://localhost:${PORT}`);
});
