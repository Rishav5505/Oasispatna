// Print-friendly windows (invoice / certificates). Pure helpers — no React.
import { api, toastError } from './adminApi';
import { toast } from '../../utils/notify';
import oasisLogo from '../../assets/oasis_logo.png';

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const absUrl = (u) => {
  try { return new URL(u, window.location.href).href; } catch { return u; }
};

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Opens a blank window synchronously (so popup blockers allow it) and returns a writer.
export const openPrintWindow = (title) => {
  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) {
    toast.error('Pop-up blocked — allow pop-ups for this site to print.');
    return null;
  }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="font-family:sans-serif;padding:40px;color:#555">Preparing…</body></html>`);
  return win;
};

export const writeDoc = (win, html) => {
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
};

const FONT = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">';

/** Fetches GET /finance/invoice/:feeId and opens a printable A4 GST invoice. */
export async function printInvoice(feeId) {
  const win = openPrintWindow('Invoice');
  if (!win) return;
  let inv;
  try {
    inv = await api.get(`/finance/invoice/${feeId}`);
  } catch (err) {
    win.close();
    toastError(err, 'Could not generate invoice');
    return;
  }
  const s = inv.student || {};
  const inst = inv.institute || {};
  const date = new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const rows = (inv.items || []).map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.description)}</td><td class="r">${inr(it.amount)}</td></tr>`).join('');
  const gstRows = inv.gstPercent > 0
    ? `<tr><td colspan="2" class="r muted">CGST @ ${inv.gstPercent / 2}%</td><td class="r">${inr(inv.gstAmount / 2)}</td></tr>
       <tr><td colspan="2" class="r muted">SGST @ ${inv.gstPercent / 2}%</td><td class="r">${inr(inv.gstAmount / 2)}</td></tr>`
    : '';
  writeDoc(win, `<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.invoiceNo)} — ${esc(s.name)}</title>${FONT}
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Outfit', system-ui, sans-serif; color: #111114; margin: 0; background: #f4f4f5; }
  .sheet { max-width: 800px; margin: 24px auto; background: #fff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,.08); }
  .bar { height: 8px; background: linear-gradient(90deg,#f37021,#fbad78,#111114); }
  .pad { padding: 36px 44px; }
  .head { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
  .brand { display: flex; gap: 14px; align-items: center; }
  .brand img { width: 58px; height: 58px; object-fit: contain; }
  .brand h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -.02em; }
  .muted { color: #6b7280; font-size: 12px; }
  .tag { text-align: right; }
  .tag h2 { margin: 0; font-size: 30px; color: #f37021; font-weight: 800; letter-spacing: .08em; }
  .paid { display: inline-block; margin-top: 6px; padding: 4px 12px; border-radius: 999px; background: #ecfdf5; color: #047857; font-weight: 700; font-size: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 28px 0; }
  .box { background: #fff7f0; border: 1px solid #fde3cf; border-radius: 14px; padding: 16px 18px; }
  .box p { margin: 3px 0; font-size: 13px; }
  .lbl { font-size: 10px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #f37021; margin-bottom: 6px !important; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; background: #111114; color: #fff; padding: 10px 12px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }
  td { padding: 11px 12px; border-bottom: 1px solid #f1f1f3; }
  .r { text-align: right; }
  .total td { font-weight: 800; font-size: 16px; border-bottom: none; background: #fff7f0; }
  .foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }
  .sign { text-align: center; width: 200px; border-top: 1px solid #d4d4d8; padding-top: 6px; font-size: 11px; color: #6b7280; }
  .actions { text-align: center; margin: 18px 0 30px; }
  .actions button { font-family: inherit; background: #f37021; color: #fff; border: 0; padding: 12px 26px; border-radius: 12px; font-weight: 700; cursor: pointer; }
  @media print { body { background: #fff; } .sheet { box-shadow: none; margin: 0; border-radius: 0; } .actions { display: none; } }
</style></head><body>
<div class="sheet"><div class="bar"></div><div class="pad">
  <div class="head">
    <div class="brand"><img src="${absUrl(oasisLogo)}" alt=""><div><h1>${esc(inst.name)}</h1><div class="muted">${esc(inst.address)}</div>${inst.gstin ? `<div class="muted">GSTIN: <b>${esc(inst.gstin)}</b></div>` : ''}</div></div>
    <div class="tag"><h2>${inv.gstPercent > 0 ? 'TAX INVOICE' : 'INVOICE'}</h2><div class="muted">No. <b>${esc(inv.invoiceNo)}</b></div><div class="muted">Date: <b>${esc(date)}</b></div><span class="paid">✓ PAID</span></div>
  </div>
  <div class="grid">
    <div class="box"><p class="lbl">Billed to</p><p><b>${esc(s.name)}</b></p>${s.fatherName ? `<p>S/o / D/o ${esc(s.fatherName)}</p>` : ''}<p>${esc([s.className && `Class ${s.className}`, s.batchName].filter(Boolean).join(' · '))}</p>${s.email ? `<p>${esc(s.email)}</p>` : ''}${s.phone ? `<p>${esc(s.phone)}</p>` : ''}</div>
    <div class="box"><p class="lbl">Payment</p><p>Mode: <b>${esc(inv.payment?.mode || '—')}</b></p><p>Reference: <b>${esc(inv.payment?.transactionId || '—')}</b></p></div>
  </div>
  <table>
    <thead><tr><th style="width:48px">#</th><th>Description</th><th class="r">Amount</th></tr></thead>
    <tbody>${rows}
      <tr><td colspan="2" class="r muted">Subtotal</td><td class="r">${inr(inv.subtotal)}</td></tr>
      ${gstRows}
      <tr class="total"><td colspan="2" class="r">Total paid</td><td class="r">${inr(inv.total)}</td></tr>
    </tbody>
  </table>
  <div class="foot"><div class="muted">This is a computer-generated invoice.<br>Thank you for choosing ${esc(inst.name)}.</div><div class="sign">Authorised signatory</div></div>
</div></div>
<div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
</body></html>`);
}

const CERT_THEMES = {
  merit: { heading: 'Certificate of Merit', accent: '#f37021', accent2: '#fbad78', ink: '#111114', ribbon: 'MERIT' },
  participation: { heading: 'Certificate of Participation', accent: '#111114', accent2: '#f37021', ink: '#111114', ribbon: 'PARTICIPATION' },
  topper: { heading: 'Certificate of Excellence', accent: '#c2410c', accent2: '#f59e0b', ink: '#111114', ribbon: 'TOPPER' },
};

/**
 * Opens a print window with one A4-landscape certificate per recipient.
 * recipients: [{ name, detail?, rank? }]; opts: { template, title, description, date, signatory, designation, instituteName }
 */
export function printCertificates(recipients, opts = {}) {
  const theme = CERT_THEMES[opts.template] || CERT_THEMES.merit;
  const win = openPrintWindow(opts.title || theme.heading);
  if (!win) return;
  const logo = absUrl(oasisLogo);
  const inst = opts.instituteName || 'Oasis JEE Classes';
  const heading = opts.title || theme.heading;
  const date = opts.date ? new Date(`${opts.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const pages = recipients.map((r) => `
  <section class="page">
    <div class="frame">
      <div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>
      <div class="inner">
        <div class="ribbon">${esc(theme.ribbon)}</div>
        ${r.rank ? `<div class="medal"><span>#${esc(r.rank)}</span></div>` : ''}
        <img class="logo" src="${logo}" alt="">
        <p class="inst">${esc(inst)}</p>
        <h1>${esc(heading)}</h1>
        <p class="pre">This certificate is proudly presented to</p>
        <p class="name">${esc(r.name)}</p>
        <div class="rule"></div>
        <p class="desc">${esc(opts.description || '')}</p>
        ${r.detail ? `<p class="detail">${esc(r.detail)}</p>` : ''}
        <div class="foot">
          <div class="sig"><p class="val">${esc(date)}</p><p class="cap">Date</p></div>
          <div class="seal"><img src="${logo}" alt=""><span>${esc(inst)}</span></div>
          <div class="sig"><p class="val script">${esc(opts.signatory || '')}</p><p class="cap">${esc(opts.designation || 'Director')}</p></div>
        </div>
      </div>
    </div>
  </section>`).join('');

  writeDoc(win, `<!doctype html><html><head><meta charset="utf-8"><title>${esc(heading)} — ${recipients.length}</title>${FONT}
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; background: #e5e5e7; font-family: 'Outfit', system-ui, sans-serif; color: ${theme.ink}; }
  .toolbar { position: sticky; top: 0; z-index: 5; display: flex; gap: 12px; align-items: center; justify-content: center; padding: 14px; background: #111114; color: #fff; font-size: 14px; }
  .toolbar button { font-family: inherit; background: #f37021; color: #fff; border: 0; padding: 10px 22px; border-radius: 10px; font-weight: 700; cursor: pointer; }
  .page { width: 297mm; height: 210mm; margin: 16px auto; background: #fff; padding: 9mm; page-break-after: always; break-after: page; position: relative; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,.12); }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .page::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 0% 0%, ${theme.accent2}22, transparent 40%), radial-gradient(circle at 100% 100%, ${theme.accent}1f, transparent 45%); }
  .frame { position: relative; height: 100%; padding: 3mm; background: linear-gradient(135deg, ${theme.accent}, ${theme.accent2} 50%, ${theme.ink}); border-radius: 4mm; }
  .inner { position: relative; height: 100%; background: #fffdfa; border-radius: 2.5mm; border: 0.6mm solid ${theme.accent}55; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 10mm 22mm 8mm; }
  .inner::after { content: ''; position: absolute; inset: 3mm; border: 0.3mm dashed ${theme.accent}66; border-radius: 1.5mm; pointer-events: none; }
  .corner { position: absolute; width: 18mm; height: 18mm; z-index: 2; border-color: ${theme.ink}; border-style: solid; }
  .tl { top: 6mm; left: 6mm; border-width: 1.2mm 0 0 1.2mm; } .tr { top: 6mm; right: 6mm; border-width: 1.2mm 1.2mm 0 0; }
  .bl { bottom: 6mm; left: 6mm; border-width: 0 0 1.2mm 1.2mm; } .br { bottom: 6mm; right: 6mm; border-width: 0 1.2mm 1.2mm 0; }
  .ribbon { position: absolute; top: 9mm; right: -14mm; transform: rotate(35deg); background: ${theme.ink}; color: #fff; font-weight: 800; letter-spacing: .3em; font-size: 9pt; padding: 2mm 18mm; }
  .medal { position: absolute; top: 12mm; left: 16mm; width: 24mm; height: 24mm; border-radius: 50%; background: radial-gradient(circle at 35% 30%, ${theme.accent2}, ${theme.accent}); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 1.5mm #fff, 0 0 0 2.2mm ${theme.accent}; }
  .medal span { color: #fff; font-weight: 800; font-size: 18pt; }
  .logo { width: 22mm; height: 22mm; object-fit: contain; }
  .inst { margin: 2mm 0 0; font-weight: 800; letter-spacing: .35em; text-transform: uppercase; font-size: 10pt; color: ${theme.accent}; }
  h1 { margin: 3mm 0 0; font-family: 'Playfair Display', Georgia, serif; font-size: 34pt; font-weight: 700; letter-spacing: .01em; }
  .pre { margin: 6mm 0 0; font-size: 12pt; color: #6b7280; letter-spacing: .08em; text-transform: uppercase; }
  .name { margin: 3mm 0 0; font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-weight: 600; font-size: 38pt; color: ${theme.accent}; line-height: 1.1; }
  .rule { width: 120mm; height: 0.6mm; margin: 3mm auto 0; background: linear-gradient(90deg, transparent, ${theme.accent}, transparent); }
  .desc { margin: 5mm 0 0; max-width: 200mm; font-size: 13pt; line-height: 1.55; color: #374151; }
  .detail { margin: 3mm 0 0; display: inline-block; padding: 1.5mm 6mm; border-radius: 999px; background: ${theme.accent}14; color: ${theme.ink}; font-weight: 700; font-size: 11pt; }
  .foot { margin-top: auto; width: 100%; display: flex; justify-content: space-between; align-items: flex-end; }
  .sig { width: 70mm; text-align: center; }
  .sig .val { margin: 0; min-height: 9mm; font-size: 13pt; font-weight: 700; border-bottom: 0.4mm solid #9ca3af; padding-bottom: 1.5mm; }
  .sig .script { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 16pt; }
  .sig .cap { margin: 1.5mm 0 0; font-size: 9pt; letter-spacing: .2em; text-transform: uppercase; color: #6b7280; font-weight: 700; }
  .seal { width: 30mm; height: 30mm; border-radius: 50%; border: 0.8mm double ${theme.accent}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fff; }
  .seal img { width: 13mm; height: 13mm; object-fit: contain; }
  .seal span { font-size: 5.5pt; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: ${theme.accent}; margin-top: 1mm; }
  @media print { body { background: #fff; } .toolbar { display: none; } .page { margin: 0; box-shadow: none; } }
</style></head><body>
<div class="toolbar"><span>${recipients.length} certificate${recipients.length === 1 ? '' : 's'} · A4 landscape</span><button onclick="window.print()">Print / Save as PDF</button></div>
${pages}
</body></html>`);
}
