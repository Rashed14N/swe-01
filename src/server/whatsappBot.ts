/**
 * WhatsApp Bot Manager (Disabled by Administrator)
 * All background Baileys sockets and message dispatches are deactivated.
 */

export interface QueuedWhatsAppMessage {
  id: string;
  phone: string;
  message: string;
  courseCode?: string;
  examType?: string;
  createdAt: string;
}

class WhatsAppBotManager {
  private status: 'disconnected' | 'disabled' = 'disabled';
  private pendingQueue: QueuedWhatsAppMessage[] = [];

  constructor() {
    this.pendingQueue = [];
  }

  public getStatus() {
    return {
      status: 'disabled',
      connected: false,
      disabled: true,
      qrDataUrl: null,
      pairingCode: null,
      connectedPhone: null,
      connectedName: null,
      pendingQueueCount: 0,
      pendingQueue: [],
      lastError: null,
    };
  }

  public queueMessage(_params: { phone: string; message: string; courseCode?: string; examType?: string }) {
    // Turned off
  }

  public async initialize(): Promise<void> {
    // Turned off
  }

  public async disconnect(): Promise<void> {
    this.status = 'disabled';
    this.pendingQueue = [];
  }

  public async requestPairingCode(_phoneNumber: string): Promise<string> {
    throw new Error('WhatsApp messaging has been turned off by administrator');
  }

  public async sendMessage(_phone: string, _message: string): Promise<{ success: boolean; id?: string; error?: string }> {
    return {
      success: false,
      error: 'WhatsApp messaging is turned off',
    };
  }
}

export const whatsappBot = new WhatsAppBotManager();
