// GST invoice for a Paid fee (GET /finance/invoice/:feeId) rendered in a print-friendly window,
// following the same pattern as the fee receipt.
import axios from 'axios';
import config from '../../config';
import { authHeaders, escapeHtml } from './parentUtils';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const buildInvoiceHtml = (inv, { logoUrl } = {}) => {
    const inst = inv.institute || {};
    const st = inv.student || {};
    const pay = inv.payment || {};
    const date = inv.date ? new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const gstPct = Number(inv.gstPercent) || 0;
    const half = Math.round((Number(inv.gstAmount) || 0) * 50) / 100;
    const items = (inv.items || []).map((it, i) => `
        <tr><td>${i + 1}</td><td>${escapeHtml(it.description)}</td><td class="r">${money(it.amount)}</td></tr>`).join('');
    const gstRows = gstPct > 0 ? `
        <tr><td>CGST @ ${gstPct / 2}%</td><td class="r">${money(half)}</td></tr>
        <tr><td>SGST @ ${gstPct / 2}%</td><td class="r">${money((Number(inv.gstAmount) || 0) - half)}</td></tr>` : `
        <tr><td>GST</td><td class="r">${money(0)}</td></tr>`;

    return `<!doctype html>
<html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(inv.invoiceNo)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111114; margin: 0; padding: 32px; background: #f4f4f5; }
  .sheet { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,.08); }
  .band { height: 8px; background: linear-gradient(90deg, #f37021, #ff9a4d 60%, #111114); }
  .head { display: flex; justify-content: space-between; gap: 24px; padding: 28px 32px 18px; border-bottom: 1px solid #eee; flex-wrap: wrap; }
  .brand { display: flex; gap: 14px; align-items: center; }
  .brand img { height: 52px; }
  .brand h1 { font-size: 20px; margin: 0; letter-spacing: .3px; }
  .muted { color: #6b7280; font-size: 12px; line-height: 1.5; }
  .title { text-align: right; }
  .title h2 { margin: 0; font-size: 26px; color: #f37021; letter-spacing: 2px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; padding: 20px 32px; }
  .meta h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; }
  .meta p { margin: 0; font-size: 13px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .items { padding: 0 32px; }
  .items th { text-align: left; background: #111114; color: #fff; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  .items td { padding: 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .r { text-align: right; white-space: nowrap; }
  .totals { display: flex; justify-content: flex-end; padding: 16px 32px 8px; }
  .totals table { width: 300px; }
  .totals td { padding: 7px 12px; }
  .grand td { font-weight: 800; font-size: 16px; border-top: 2px solid #111114; color: #111114; }
  .grand td.r { color: #f37021; }
  .foot { padding: 18px 32px 28px; display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
  .paid { display: inline-block; border: 2px solid #10b981; color: #10b981; font-weight: 800; padding: 4px 14px; border-radius: 8px; letter-spacing: 3px; transform: rotate(-4deg); }
  button { background: #f37021; color: #fff; border: 0; padding: 10px 22px; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 13px; }
  @media (max-width: 560px) { body { padding: 0; } .meta { grid-template-columns: 1fr; } .title { text-align: left; } .totals table { width: 100%; } }
  @media print { body { background: #fff; padding: 0; } .sheet { box-shadow: none; border-radius: 0; } .noprint { display: none; } }
</style></head>
<body><div class="sheet">
  <div class="band"></div>
  <div class="head">
    <div class="brand">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="">` : ''}
      <div>
        <h1>${escapeHtml(inst.name || 'Oasis JEE Classes')}</h1>
        <div class="muted">${escapeHtml(inst.address || '')}${inst.gstin ? `<br>GSTIN: ${escapeHtml(inst.gstin)}` : ''}</div>
      </div>
    </div>
    <div class="title">
      <h2>${gstPct > 0 ? 'TAX INVOICE' : 'INVOICE'}</h2>
      <div class="muted">No. <b>${escapeHtml(inv.invoiceNo)}</b><br>Date: ${escapeHtml(date)}</div>
    </div>
  </div>
  <div class="meta">
    <div>
      <h4>Billed to</h4>
      <p><b>${escapeHtml(st.name || '')}</b>${st.fatherName ? `<br>C/o ${escapeHtml(st.fatherName)}` : ''}
      ${st.className ? `<br>Class: ${escapeHtml(st.className)}${st.batchName ? ` · ${escapeHtml(st.batchName)}` : ''}` : ''}
      ${st.phone ? `<br>${escapeHtml(st.phone)}` : ''}${st.email ? `<br>${escapeHtml(st.email)}` : ''}</p>
    </div>
    <div>
      <h4>Payment</h4>
      <p>Mode: ${escapeHtml(pay.mode || '—')}<br>Reference: ${escapeHtml(pay.transactionId || '—')}</p>
    </div>
  </div>
  <div class="items">
    <table>
      <thead><tr><th style="width:40px">#</th><th>Description</th><th class="r">Amount</th></tr></thead>
      <tbody>${items}</tbody>
    </table>
  </div>
  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td class="r">${money(inv.subtotal)}</td></tr>
      ${gstRows}
      <tr class="grand"><td>Total paid</td><td class="r">${money(inv.total)}</td></tr>
    </table>
  </div>
  <div class="foot">
    <div><span class="paid">PAID</span><div class="muted" style="margin-top:10px">This is a computer-generated invoice and does not need a signature.</div></div>
    <div class="noprint"><button onclick="window.print()">Print / Save as PDF</button></div>
  </div>
</div></body></html>`;
};

// Opens the window synchronously (so pop-up blockers allow it), then fills it.
// Resolves to 'ok' | 'popup' (blocked) and throws on API errors.
export const openInvoice = async (feeId, { logoUrl, loadingText = 'Preparing invoice…' } = {}) => {
    const win = window.open('', '_blank', 'width=860,height=900');
    if (!win) return 'popup';
    try {
        win.document.write(`<p style="font-family:sans-serif;padding:40px;color:#6b7280">${escapeHtml(loadingText)}</p>`);
        const { data } = await axios.get(`${config.API_URL}/finance/invoice/${feeId}`, { headers: authHeaders() });
        win.document.open();
        win.document.write(buildInvoiceHtml(data, { logoUrl }));
        win.document.close();
        return 'ok';
    } catch (err) {
        win.close();
        throw err;
    }
};
