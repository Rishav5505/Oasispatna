import { escapeHtml } from './parentUtils';

const inMonth = (date, year, monthIdx) => {
    if (!date) return false;
    const d = new Date(date);
    return d.getFullYear() === year && d.getMonth() === monthIdx;
};

const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

/**
 * Opens a print-friendly monthly progress report for one child in a new window.
 * month: 'YYYY-MM'
 */
export const openProgressReport = ({ child, month, attendance = [], marks = [], tests = [], analysis, parentName, logoUrl }) => {
    const [y, m] = String(month).split('-').map(Number);
    const monthIdx = (m || 1) - 1;
    const monthLabel = new Date(y, monthIdx, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    // Attendance for the month (+ per subject)
    const monthAtt = attendance.filter(a => inMonth(a.date, y, monthIdx));
    const present = monthAtt.filter(a => a.status === 'present').length;
    const absent = monthAtt.filter(a => a.status === 'absent').length;
    const attBySubject = {};
    monthAtt.forEach(a => {
        const key = a.subjectId?.name || 'General';
        if (!attBySubject[key]) attBySubject[key] = { present: 0, total: 0 };
        attBySubject[key].total += 1;
        if (a.status === 'present') attBySubject[key].present += 1;
    });

    // Offline exam marks held in the month
    const monthMarks = marks.filter(mk => inMonth(mk.examId?.date || mk.createdAt, y, monthIdx));
    const marksObtained = monthMarks.reduce((s, mk) => s + (Number(mk.marks) || 0), 0);
    const marksMax = monthMarks.reduce((s, mk) => s + (Number(mk.maxMarks) || 100), 0);

    // Online tests in the month (trend has the attempt date; fall back to test list)
    const monthTrend = (analysis?.trend || []).filter(t => inMonth(t.date, y, monthIdx));
    const monthTests = tests.filter(t => t.attempted && inMonth(t.createdAt, y, monthIdx));
    const onlineRows = monthTrend.length > 0
        ? monthTrend.map(t => ({ title: t.testTitle, date: t.date, score: `${Math.round(t.percentage)}%` }))
        : monthTests.map(t => ({ title: t.title, date: t.createdAt, score: `${t.score} / ${t.totalMarks} (${pct(t.score, t.totalMarks)}%)` }));

    const subjects = (analysis?.bySubject || []).filter(s => s.testsTaken > 0);
    const weakest = subjects.length > 1 ? subjects.reduce((a, b) => (b.avgPercentage < a.avgPercentage ? b : a)) : null;
    const strongest = subjects.length > 1 ? subjects.reduce((a, b) => (b.avgPercentage > a.avgPercentage ? b : a)) : null;

    const attPct = pct(present, monthAtt.length);
    const row = (cells) => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    const emptyRow = (cols, text) => `<tr><td colspan="${cols}" class="empty">${escapeHtml(text)}</td></tr>`;

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Progress Report - ${escapeHtml(child?.name || 'Student')} - ${escapeHtml(monthLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; margin: 0; padding: 32px; background: #fff; }
  .sheet { max-width: 820px; margin: 0 auto; }
  header { display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid #f37021; padding-bottom: 16px; margin-bottom: 24px; }
  header img { height: 56px; }
  h1 { margin: 0; font-size: 22px; letter-spacing: .5px; }
  h1 span { color: #f37021; }
  .muted { color: #666; font-size: 12px; }
  .info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; background: #fff6ef; border: 1px solid #fdcfae; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px; font-size: 13px; }
  .info b { display: inline-block; min-width: 110px; color: #ba4212; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { border: 1px solid #eee; border-radius: 10px; padding: 12px; text-align: center; }
  .kpi .v { font-size: 24px; font-weight: 800; }
  .kpi .l { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #777; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; border-left: 4px solid #f37021; padding-left: 8px; margin: 26px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #111; color: #fff; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; }
  td.empty { text-align: center; color: #999; font-style: italic; }
  .bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
  .bar > div { height: 100%; background: #f37021; }
  .callout { padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-top: 10px; }
  .callout.warn { background: #fff8e1; border: 1px solid #ffe082; }
  .callout.good { background: #e8f5e9; border: 1px solid #a5d6a7; }
  footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #777; border-top: 1px solid #eee; padding-top: 12px; }
  .actions { text-align: center; margin-bottom: 20px; }
  .actions button { background: #f37021; color: #fff; border: 0; padding: 10px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; }
  @media print {
    body { padding: 0; }
    .actions { display: none; }
    th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .info, .bar > div, .callout { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 14mm; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <header>
    <div>
      <h1>OASIS <span>JEE CLASSES</span></h1>
      <div class="muted">Monthly Progress Report &middot; ${escapeHtml(monthLabel)}</div>
    </div>
    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Oasis" />` : ''}
  </header>

  <div class="info">
    <div><b>Student</b> ${escapeHtml(child?.name || 'Student')}</div>
    <div><b>Class</b> ${escapeHtml(child?.classId?.name || 'N/A')}</div>
    <div><b>Roll No.</b> ${escapeHtml(child?.rollNo || 'N/A')}</div>
    <div><b>Guardian</b> ${escapeHtml(parentName || 'N/A')}</div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="v">${attPct}%</div><div class="l">Attendance</div></div>
    <div class="kpi"><div class="v">${present}/${monthAtt.length}</div><div class="l">Classes Attended</div></div>
    <div class="kpi"><div class="v">${marksMax > 0 ? pct(marksObtained, marksMax) + '%' : '—'}</div><div class="l">Exam Marks</div></div>
    <div class="kpi"><div class="v">${analysis?.overall ? Math.round(analysis.overall.avgPercentage || 0) + '%' : '—'}</div><div class="l">Online Test Avg</div></div>
  </div>

  <h2>Attendance &mdash; ${escapeHtml(monthLabel)}</h2>
  <table>
    <thead><tr><th>Subject</th><th>Present</th><th>Absent</th><th>Total</th><th style="width:30%">Attendance</th></tr></thead>
    <tbody>
      ${Object.keys(attBySubject).length === 0 ? emptyRow(5, 'No attendance recorded this month') : Object.entries(attBySubject).map(([name, s]) => row([
        escapeHtml(name), s.present, s.total - s.present, s.total,
        `<div class="bar"><div style="width:${pct(s.present, s.total)}%"></div></div> ${pct(s.present, s.total)}%`
    ])).join('')}
    </tbody>
  </table>
  ${monthAtt.length > 0 && attPct < 75 ? `<div class="callout warn">Attendance is below the recommended 75% (absent on ${absent} class${absent === 1 ? '' : 'es'}).</div>` : ''}

  <h2>Exam Marks</h2>
  <table>
    <thead><tr><th>Exam</th><th>Subject</th><th>Marks</th><th>Max</th><th>%</th></tr></thead>
    <tbody>
      ${monthMarks.length === 0 ? emptyRow(5, 'No exam marks published this month') : monthMarks.map(mk => row([
        escapeHtml(mk.examId?.name || 'Exam'), escapeHtml(mk.subjectId?.name || '-'), mk.marks, mk.maxMarks || 100, `${pct(mk.marks, mk.maxMarks || 100)}%`
    ])).join('')}
    </tbody>
    ${monthMarks.length > 0 ? `<tfoot><tr><td colspan="2"><b>Total</b></td><td><b>${marksObtained}</b></td><td><b>${marksMax}</b></td><td><b>${pct(marksObtained, marksMax)}%</b></td></tr></tfoot>` : ''}
  </table>

  <h2>Online Tests</h2>
  <table>
    <thead><tr><th>Test</th><th>Date</th><th>Score</th></tr></thead>
    <tbody>
      ${onlineRows.length === 0 ? emptyRow(3, 'No online tests attempted this month') : onlineRows.map(t => row([
        escapeHtml(t.title), new Date(t.date).toLocaleDateString('en-IN'), escapeHtml(t.score)
    ])).join('')}
    </tbody>
  </table>

  <h2>Test Analysis (Overall)</h2>
  <table>
    <thead><tr><th>Subject</th><th>Tests</th><th style="width:40%">Average</th></tr></thead>
    <tbody>
      ${subjects.length === 0 ? emptyRow(3, 'No subject-wise analysis available yet') : subjects.map(s => row([
        escapeHtml(s.subjectName || 'General'), s.testsTaken,
        `<div class="bar"><div style="width:${Math.min(100, Math.round(s.avgPercentage))}%"></div></div> ${Math.round(s.avgPercentage)}%`
    ])).join('')}
    </tbody>
  </table>
  ${strongest ? `<div class="callout good">Strongest subject: <b>${escapeHtml(strongest.subjectName)}</b> (${Math.round(strongest.avgPercentage)}% average).</div>` : ''}
  ${weakest ? `<div class="callout warn">Needs attention: <b>${escapeHtml(weakest.subjectName)}</b> (${Math.round(weakest.avgPercentage)}% average).</div>` : ''}

  <footer>
    <span>Generated on ${new Date().toLocaleString('en-IN')}</span>
    <span>Oasis JEE Classes &middot; Parent Portal</span>
  </footer>
</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=900');
    if (!win) return false;
    win.document.write(html);
    win.document.close();
    return true;
};
