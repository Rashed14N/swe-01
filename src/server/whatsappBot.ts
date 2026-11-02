import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';

const AUTH_DIR = path.join(process.cwd(), 'data', 'whatsapp_auth');

export interface QueuedWhatsAppMessage {
  id: string;
  phone: string;
  message: string;
  courseCode?: string;
  examType?: string;
  createdAt: string;
}

class WhatsAppBotManager {
  private sock: WASocket | null = null;
  private status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected' = 'disconnected';
  private qrDataUrl: string | null = null;
  private rawQr: string | null = null;
  private pairingCode: string | null = null;
  private connectedPhone: string | null = null;
  private connectedName: string | null = null;
  private isInitializing = false;
  private pendingQueue: QueuedWhatsAppMessage[] = [];
  private lastError: string | null = null;

  constructor() {
    // Queue the requested CA (SWE-211) test exam alert for 01765481645 so it dispatches immediately on connect
    this.queueMessage({
      phone: '8801765481645',
      courseCode: 'SWE-211',
      examType: 'Class Test / Midterm',
      message: [
        '📢 *SWE ACADEMIC EXAM ALERT* 📢',
        '━━━━━━━━━━━━━━━━━━━━━━━━━',
        '👋 Hello, *Rashedul Hasan*!',
        '',
        'A new exam has been scheduled for your enrolled course:',
        '',
        '📌 *Exam:* Class Test / Midterm - Cache Memory & Pipeline Architecture',
        '📚 *Course:* *Computer Architecture* (SWE-211 / CA)',
        '📅 *Date:* *Sun, Nov 8, 2026*',
        '⏰ *Time:* 10:30 AM - 12:00 PM',
        '🏛️ *Room / Venue:* Room 502, Academic Building',
        '🎓 *Batch:* SWE 9th Batch',
        '👤 *Scheduled By:* SWE Portal Automated Bot',
        '━━━━━━━━━━━━━━━━━━━━━━━━━',
        '📝 *Syllabus & Instructions:*',
        '_Chapter 4 & 5: Pipelining Hazards and 4-Way Set Associative Cache Memory Problems._',
        '━━━━━━━━━━━━━━━━━━━━━━━━━',
        '🌐 *View Full Schedule & Routine on SWE Portal:*',
        '👉 https://portal.swe.edu.bd/exams',
      ].join('\n'),
    });
  }

  public getStatus() {
    return {
      status: this.status,
      connected: this.status === 'connected',
      qrDataUrl: this.qrDataUrl,
      pairingCode: this.pairingCode,
      connectedPhone: this.connectedPhone,
      connectedName: this.connectedName,
      pendingQueueCount: this.pendingQueue.length,
      pendingQueue: this.pendingQueue,
      lastError: this.lastError,
    };
  }

  public queueMessage(params: { phone: string; message: string; courseCode?: string; examType?: string }) {
    const cleanPhone = params.phone.replace(/[^\d]/g, '');
    // Avoid duplicate identical phone+courseCode in queue
    this.pendingQueue = this.pendingQueue.filter(
      item => !(item.phone === cleanPhone && item.courseCode === params.courseCode)
    );
    this.pendingQueue.push({
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      phone: cleanPhone,
      message: params.message,
      courseCode: params.courseCode,
      examType: params.examType,
      createdAt: new Date().toISOString(),
    });
  }

  public async initialize(): Promise<void> {
    if (this.isInitializing || this.status === 'connected') return;
    this.isInitializing = true;
    this.status = 'connecting';
    this.lastError = null;

    try {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      let version: [number, number, number] = [2, 3000, 1015901307];
      try {
        const latest = await fetchLatestBaileysVersion();
        version = latest.version;
      } catch {
        // Use fallback version if offline check fails
      }

      const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }) as any,
        printQRInTerminal: false,
        auth: state,
        browser: ['SWE Student Portal', 'Chrome', '120.0.0'],
        defaultQueryTimeoutMs: 60000,
        syncFullHistory: false,
      });

      this.sock = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.rawQr = qr;
          this.status = 'qr_ready';
          try {
            this.qrDataUrl = await QRCode.toDataURL(qr, {
              width: 280,
              margin: 2,
              color: {
                dark: '#075E54',
                light: '#FFFFFF',
              },
            });
          } catch (err) {
            console.warn('[WhatsAppBot] QR generation error:', err);
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          this.isInitializing = false;

          if (statusCode === DisconnectReason.loggedOut) {
            this.status = 'disconnected';
            this.qrDataUrl = null;
            this.rawQr = null;
            this.pairingCode = null;
            this.connectedPhone = null;
            this.connectedName = null;
            try {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            } catch {}
            // Re-init fresh session for new QR
            setTimeout(() => this.initialize(), 1500);
          } else if (shouldReconnect) {
            this.status = 'connecting';
            setTimeout(() => this.initialize(), 3000);
          } else {
            this.status = 'disconnected';
          }
        } else if (connection === 'open') {
          this.isInitializing = false;
          this.status = 'connected';
          this.qrDataUrl = null;
          this.rawQr = null;
          this.pairingCode = null;

          const userJid = sock.user?.id || '';
          this.connectedPhone = userJid.split(':')[0]?.split('@')[0] || 'Linked Device';
          this.connectedName = sock.user?.name || 'SWE Department WhatsApp Bot';

          console.log(`✅ [WhatsAppBot] Connected as ${this.connectedName} (${this.connectedPhone})`);

          // Automatically flush any queued messages (including the CA exam alert to 01765481645!)
          await this.flushPendingQueue();
        }
      });
    } catch (err: any) {
      this.isInitializing = false;
      this.status = 'disconnected';
      this.lastError = err?.message || 'Failed to initialize WhatsApp socket';
      console.error('[WhatsAppBot] Init Error:', err);
    }
  }

  /**
   * Request an 8-digit Pairing Code so user can link WhatsApp on the same phone without scanning QR
   */
  public async requestPhonePairingCode(rawPhone: string): Promise<{ success: boolean; code?: string; error?: string }> {
    let cleanPhone = rawPhone.replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhone = '88' + cleanPhone;
    } else if (cleanPhone.startsWith('1') && cleanPhone.length === 10) {
      cleanPhone = '880' + cleanPhone;
    }

    if (cleanPhone.length < 11) {
      return { success: false, error: 'Invalid phone number. Use 017XXXXXXXX format.' };
    }

    if (!this.sock || this.status === 'disconnected') {
      await this.initialize();
      await new Promise(r => setTimeout(r, 2000));
    }

    if (!this.sock) {
      return { success: false, error: 'WhatsApp socket is still starting. Please try again in 2 seconds.' };
    }

    try {
      const code = await this.sock.requestPairingCode(cleanPhone);
      const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
      this.pairingCode = formattedCode;
      return { success: true, code: formattedCode };
    } catch (err: any) {
      console.warn('[WhatsAppBot] Pairing code error:', err?.message || err);
      return {
        success: false,
        error: err?.message || 'Could not generate pairing code. Try resetting session or scanning the QR code.',
      };
    }
  }

  /**
   * Sends a real WhatsApp message if connected; otherwise queues it to auto-send on connect
   */
  public async sendMessage(
    cleanPhone: string,
    text: string,
    meta?: { courseCode?: string; examType?: string }
  ): Promise<{ sentLive: boolean; queued: boolean; messageId?: string; error?: string }> {
    if (this.status === 'connected' && this.sock) {
      try {
        const jid = `${cleanPhone}@s.whatsapp.net`;
        const result = await this.sock.sendMessage(jid, { text });
        console.log(`🚀 [WhatsAppBot] LIVE message delivered to ${jid} (ID: ${result?.key?.id})`);
        return {
          sentLive: true,
          queued: false,
          messageId: result?.key?.id || `wa-live-${Date.now()}`,
        };
      } catch (err: any) {
        console.warn(`[WhatsAppBot] Live send error to ${cleanPhone}:`, err?.message || err);
        this.queueMessage({ phone: cleanPhone, message: text, ...meta });
        return {
          sentLive: false,
          queued: true,
          error: err?.message || 'Queued for retry',
        };
      }
    }

    // Not connected yet: queue message for automatic delivery as soon as QR/Pairing completes
    this.queueMessage({ phone: cleanPhone, message: text, ...meta });
    if (this.status === 'disconnected' && !this.isInitializing) {
      this.initialize().catch(() => {});
    }

    return {
      sentLive: false,
      queued: true,
    };
  }

  public async flushPendingQueue(): Promise<number> {
    if (this.status !== 'connected' || !this.sock || this.pendingQueue.length === 0) {
      return 0;
    }

    const items = [...this.pendingQueue];
    this.pendingQueue = [];
    let sentCount = 0;

    for (const item of items) {
      try {
        const jid = `${item.phone}@s.whatsapp.net`;
        await this.sock.sendMessage(jid, { text: item.message });
        sentCount++;
        console.log(`✅ [WhatsAppBot Queue Flush] Delivered queued ${item.courseCode || ''} alert to ${item.phone}`);
      } catch (err: any) {
        console.warn(`[WhatsAppBot Queue Flush Failed] ${item.phone}:`, err?.message || err);
      }
    }
    return sentCount;
  }

  public async resetSession(): Promise<void> {
    try {
      if (this.sock) {
        this.sock.end(undefined);
        this.sock = null;
      }
    } catch {}
    this.status = 'disconnected';
    this.qrDataUrl = null;
    this.rawQr = null;
    this.pairingCode = null;
    this.connectedPhone = null;
    this.connectedName = null;
    this.isInitializing = false;
    try {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    } catch {}
    await this.initialize();
  }
}

export const whatsappBot = new WhatsAppBotManager();

// Start initializing Baileys in background so QR code is ready immediately
whatsappBot.initialize().catch(err => console.warn('[WhatsAppBot Boot]:', err));
