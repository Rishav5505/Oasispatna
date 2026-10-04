// SMS / WhatsApp via Twilio REST API (uses Node's global fetch; no SDK needed).
// Configure TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE (E.164, e.g. +14155550123).
// Set TWILIO_WHATSAPP=true to send via WhatsApp (TWILIO_PHONE must be a WhatsApp-enabled sender).
// If not configured (missing or placeholder values) this silently no-ops.

const isReal = (v) => typeof v === 'string' && v.trim().length > 0 && !/^your[_-]/i.test(v.trim()) && !/placeholder|changeme|xxxx/i.test(v);

const isConfigured = () => isReal(process.env.TWILIO_SID) && isReal(process.env.TWILIO_AUTH_TOKEN) && isReal(process.env.TWILIO_PHONE);

// Normalise Indian numbers to E.164 (+91XXXXXXXXXX); leave numbers with '+' alone
const normalizePhone = (phone) => {
  if (!phone) return null;
  let p = String(phone).trim();
  if (p.startsWith('whatsapp:')) p = p.slice(9);
  if (p.startsWith('+')) return '+' + p.slice(1).replace(/\D/g, '');
  const digits = p.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  return digits ? `+${digits}` : null;
};

const sendSMS = async (to, message) => {
  try {
    if (!isConfigured()) return { skipped: true };
    const number = normalizePhone(to);
    if (!number || !message) return { skipped: true };

    const sid = process.env.TWILIO_SID.trim();
    const token = process.env.TWILIO_AUTH_TOKEN.trim();
    const whatsapp = String(process.env.TWILIO_WHATSAPP || '').toLowerCase() === 'true';
    let from = process.env.TWILIO_PHONE.trim();
    if (whatsapp && !from.startsWith('whatsapp:')) from = `whatsapp:${from}`;
    const toAddr = whatsapp ? `whatsapp:${number}` : number;

    const body = new URLSearchParams({ To: toAddr, From: from, Body: String(message).slice(0, 1500) });
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error(`Twilio ${whatsapp ? 'WhatsApp' : 'SMS'} failed (${resp.status}):`, data.message || 'unknown error');
      return { ok: false };
    }
    console.log(`${whatsapp ? 'WhatsApp' : 'SMS'} sent to ${number}. SID: ${data.sid}`);
    return { ok: true, sid: data.sid };
  } catch (err) {
    console.error('sendSMS error:', err.message);
    return { ok: false };
  }
};

sendSMS.isConfigured = isConfigured;
module.exports = sendSMS;
