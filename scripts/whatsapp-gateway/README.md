# 📲 Free Open-Source WhatsApp Gateway for SWE Student Portal

This microservice enables **100% free automated WhatsApp exam and announcement notifications** using the open-source **[@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)** library.

No paid Twilio, WhatsApp Business API, or third-party fees required!

---

## 🚀 How It Works
1. When a CR or Admin creates or updates an exam on the SWE Portal, the backend identifies all enrolled students (including registered retake/improvement students).
2. The portal dispatches an HTTP request to this microservice (`POST /send-message`).
3. This microservice connects to WhatsApp Web as a Linked Device and sends the exam notification directly to each student's WhatsApp number (`8801XXXXXXXXX`).
4. If this microservice is not running, the portal automatically falls back to internal automated dispatch logging, ensuring zero crashes or lost announcements.

---

## 🛠️ Step-by-Step Setup

### Step 1: Install Dependencies
Open a terminal in this directory:
```bash
cd scripts/whatsapp-gateway
npm install
```

### Step 2: Start the Gateway
```bash
npm start
```

### Step 3: Link Your WhatsApp
1. Open WhatsApp on your phone.
2. Tap **Settings** (or 3 dots) > **Linked Devices** > **Link a Device**.
3. Point your camera at the QR code printed in the terminal.
4. Once authenticated, you will see:
   ```
   ✅ [WhatsApp Gateway] SUCCESS: Connected to WhatsApp Web!
   🤖 Bot is ready to auto-dispatch student exam alerts on port 8000.
   ```
Session credentials will be saved in `auth_info_baileys/` so you don't have to scan every time.

---

### Step 4: Connect to SWE Student Portal
In your main SWE Portal `.env` (or environment variables), set:
```env
WHATSAPP_GATEWAY_URL=http://localhost:8000/send-message
```

That's it! Now whenever any exam is scheduled or modified, enrolled students will automatically receive their exam schedule on WhatsApp!

---

## 📡 API Endpoints

### 1. Send Message
- **URL**: `POST /send-message`
- **Body**:
  ```json
  {
    "phone": "01712345678",
    "message": "📢 *SWE EXAM NOTICE*\nCourse: SWE-305\nDate: Oct 20, 2026"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "id": "3EB0ABCDEF1234",
    "to": "8801712345678",
    "timestamp": "2026-10-15T12:00:00.000Z"
  }
  ```

### 2. Check Connection Status
- **URL**: `GET /status`
- **Response**:
  ```json
  {
    "gateway": "Baileys Open-Source WhatsApp Gateway",
    "status": "connected",
    "connected": true
  }
  ```
