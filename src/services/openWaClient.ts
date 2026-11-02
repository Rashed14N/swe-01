/**
 * Browser-Side OpenWA Local Gateway Bridge
 *
 * Why this exists:
 * When the SWE Portal is hosted on a cloud URL (e.g. Cloud Run) while the user's
 * OpenWA Docker/Gateway is running on their local PC at `http://localhost:2785`,
 * the remote cloud server cannot reach the user's `127.0.0.1:2785` directly.
 * However, the user's Browser IS running on their local PC and CAN reach `http://localhost:2785`!
 *
 * This client automatically bridges the cloud backend with the user's local `http://localhost:2785`
 * OpenWA API (`GET /api/sessions` -> `POST /api/sessions/{sessionId}/messages/send-text`).
 */

const FLUSHED_IDS_KEY = 'swe_openwa_flushed_ids';

function getFlushedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(FLUSHED_IDS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function markIdFlushed(id: string) {
  try {
    const set = getFlushedIds();
    set.add(id);
    sessionStorage.setItem(FLUSHED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function normalizeBdPhone(rawPhone: string): string {
  let cleaned = String(rawPhone || '').replace(/[^\d]/g, '');
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = '88' + cleaned;
  } else if (cleaned.startsWith('1') && cleaned.length === 10) {
    cleaned = '880' + cleaned;
  }
  return cleaned;
}

/**
 * Discovers the active OpenWA sessionId from http://localhost:2785/api/sessions
 */
export async function getOpenWaActiveSession(
  baseUrl: string,
  apiKey: string
): Promise<{ reachable: boolean; sessionId?: string; status?: string; sessions?: any[]; error?: string }> {
  const cleanBase = baseUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
  };

  try {
    const res = await fetch(`${cleanBase}/api/sessions`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      return { reachable: true, error: `OpenWA returned HTTP ${res.status}` };
    }

    const data = await res.json().catch(() => null);
    const list: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.sessions)
      ? data.sessions
      : Array.isArray(data?.data)
      ? data.data
      : [];

    const ready =
      list.find((s: any) =>
        ['READY', 'CONNECTED', 'WORKING', 'AUTHENTICATED'].includes(String(s?.status || '').toUpperCase())
      ) || list[0];

    if (ready) {
      return {
        reachable: true,
        sessionId: ready.id || ready.sessionId || ready.name,
        status: ready.status || 'READY',
        sessions: list,
      };
    }

    return {
      reachable: true,
      sessionId: 'default',
      status: 'NO_ACTIVE_SESSION',
      sessions: list,
    };
  } catch (err: any) {
    return {
      reachable: false,
      error: err?.message || 'Cannot connect to http://localhost:2785 from this browser',
    };
  }
}

/**
 * Dispatches a WhatsApp message directly from the browser to the user's local OpenWA gateway
 */
export async function sendOpenWaMessageFromBrowser(params: {
  phone: string;
  messageText: string;
  gatewayUrl?: string;
  apiKey?: string;
}): Promise<{ ok: boolean; sessionId?: string; error?: string }> {
  const cleanPhone = normalizeBdPhone(params.phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return { ok: false, error: 'Invalid phone number' };
  }

  let gatewayUrl = params.gatewayUrl;
  let apiKey = params.apiKey;

  if (!gatewayUrl || !apiKey) {
    try {
      const cfgRes = await fetch('/api/whatsapp/openwa-config');
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        gatewayUrl = gatewayUrl || cfg.gatewayUrl;
        apiKey = apiKey || cfg.apiKey;
      }
    } catch {}
  }

  const cleanBase = (gatewayUrl || 'http://localhost:2785').replace(/\/+$/, '').replace(/\/api$/, '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
  };

  try {
    const sessionInfo = await getOpenWaActiveSession(cleanBase, apiKey || '');
    if (!sessionInfo.reachable) {
      return { ok: false, error: sessionInfo.error || 'Local OpenWA (localhost:2785) not reachable' };
    }

    const sessionId = sessionInfo.sessionId || 'default';
    const sendUrl = `${cleanBase}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`;

    const sendRes = await fetch(sendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chatId: `${cleanPhone}@c.us`,
        text: params.messageText,
      }),
    });

    if (sendRes.ok) {
      // Acknowledge delivery to server logs
      fetch('/api/whatsapp/queue-ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          messagePreview: params.messageText.slice(0, 140),
        }),
      }).catch(() => {});

      return { ok: true, sessionId };
    }

    const errBody = await sendRes.text().catch(() => `HTTP ${sendRes.status}`);
    return { ok: false, sessionId, error: errBody };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to send via local OpenWA' };
  }
}

/**
 * Automatically flushes any queued WhatsApp messages (including the SWE-211 CA test to 01765481645)
 * through the user's local OpenWA gateway (`http://localhost:2785`) when the browser loads the portal.
 */
export async function autoFlushPendingOpenWaQueue(): Promise<void> {
  try {
    const cfgRes = await fetch('/api/whatsapp/openwa-config');
    if (!cfgRes.ok) return;
    const cfg = await cfgRes.json();
    const { gatewayUrl, apiKey, pendingQueue } = cfg;
    if (!Array.isArray(pendingQueue) || pendingQueue.length === 0) return;

    const flushedIds = getFlushedIds();
    for (const item of pendingQueue) {
      if (!item?.id || flushedIds.has(item.id)) continue;

      const res = await sendOpenWaMessageFromBrowser({
        phone: item.phone,
        messageText: item.message,
        gatewayUrl,
        apiKey,
      });

      if (res.ok) {
        markIdFlushed(item.id);
        console.log(`[OpenWA Browser Bridge] ✅ Auto-dispatched queued ${item.courseCode || ''} alert to ${item.phone}`);
      }
    }
  } catch {
    // Silent background check
  }
}
