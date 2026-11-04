/**
 * WhatsApp Client Service (Disabled by Administrator)
 * All external WhatsApp notifications and browser bridges are turned off.
 */

export function normalizeBdPhone(rawPhone: string): string {
  let cleaned = String(rawPhone || '').replace(/[^\d]/g, '');
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = '88' + cleaned;
  } else if (cleaned.startsWith('1') && cleaned.length === 10) {
    cleaned = '880' + cleaned;
  }
  return cleaned;
}

export async function getOpenWaActiveSession(
  _baseUrl: string,
  _apiKey: string
): Promise<{ reachable: boolean; sessionId?: string; status?: string; sessions?: any[]; error?: string }> {
  return {
    reachable: false,
    status: 'DISABLED',
    error: 'WhatsApp messaging has been turned off by administrator',
  };
}

export async function sendOpenWaMessageFromBrowser(
  _params: {
    phone: string;
    messageText: string;
    gatewayUrl?: string;
    apiKey?: string;
  }
): Promise<{ ok: boolean; sessionId?: string; error?: string }> {
  return {
    ok: false,
    error: 'WhatsApp messages are turned off by administrator',
  };
}

export async function autoFlushPendingOpenWaQueue(): Promise<void> {
  // Turned off - no-op
}
