import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Tooltip, Legend, ArcElement, Filler,
} from 'chart.js';
import {
  FiUsers, FiUserCheck, FiCheckCircle, FiCreditCard, FiVolume2, FiUserPlus, FiAward,
  FiRefreshCw, FiAlertTriangle, FiInbox, FiFileText, FiVideo, FiClock, FiArrowRight,
  FiActivity, FiTrendingUp, FiCalendar,
} from 'react-icons/fi';
import { StatCard, GradientBanner, AnimatedNumber } from '../ui/Motion';
import { greeting } from '../ui/motionUtils';
import { api, toastError, formatINR } from './adminApi';
import { SkeletonBlock, ProgressRing, Badge, EmptyState } from './AdminUI';
import { liveClassStatus, isSameDay, timeAgo } from './liveStatus';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, ArcElement, Filler);

const BRAND = '#f37021';
const BRAND_LIGHT = '#fbad78';
const INK = '#111114';

const tooltipStyle = {
  backgroundColor: INK,
  padding: 10,
  cornerRadius: 10,
  titleFont: { family: 'Outfit, sans-serif', weight: '600' },
  bodyFont: { family: 'Outfit, sans-serif', weight: '700' },
  displayColors: false,
};

const baseScales = {
  y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.15)' }, border: { display: false }, ticks: { precision: 0, color: '#94a3b8', font: { family: 'Outfit, sans-serif' } } },
  x: { grid: { display: false }, border: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Outfit, sans-serif', weight: '600' } } },
};

const shortMonth = (m) => (m || '').split(' ')[0];

// Orange vertical gradient for the revenue area, computed against the chart area.
const areaGradient = (ctx) => {
  const { chart } = ctx;
  const { ctx: c, chartArea } = chart;
  if (!chartArea) return 'rgba(243,112,33,0.15)';
  const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, 'rgba(243,112,33,0.38)');
  g.addColorStop(0.6, 'rgba(243,112,33,0.08)');
  g.addColorStop(1, 'rgba(243,112,33,0)');
  return g;
};

const Card = ({ className = '', children }) => <div className={`ui-card p-5 md:p-6 ${className}`}>{children}</div>;

const CardTitle = ({ icon: Icon, title, subtitle, right }) => (
  <div className="flex items-start justify-between gap-3 mb-5">
    <div className="flex items-center gap-3 min-w-0">
      {Icon && <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0"><Icon /></div>}
      <div className="min-w-0">
        <h3 className="font-extrabold text-gray-900 dark:text-white tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
      </div>
    </div>
    {right}
  </div>
);

const OverviewAnalytics = ({ profileName, presentTeachers, setActiveTab, onAddStudent, students = [], leads: liveLeads = [], onSummary }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Secondary, best-effort reads for the attention panel & activity feed (silent on failure).
  const [extra, setExtra] = useState({ defaulters: null, liveClasses: [], leads: [], dues: null, admissions: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/overview');
      setData(res);
      setFailed(false);
    } catch (err) {
      setFailed(true);
      toastError(err, 'Failed to load overview analytics');
    } finally {
      setLoading(false);
    }
    const [defaulters, liveClasses, leads, dues, admissions] = await Promise.all([
      api.get('/fees/defaulters').catch(() => null),
      api.get('/live-classes/all').catch(() => []),
      api.get('/leads').catch(() => []),
      api.get('/finance/upcoming-dues', { days: 7 }).catch(() => null),
      api.get('/admissions', { status: 'submitted' }).catch(() => null),
    ]);
    setExtra({ defaulters, liveClasses: liveClasses || [], leads: leads || [], dues, admissions });
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (data && onSummary) onSummary({ pendingPayments: data.pendingPayments || 0, newLeads: data.newLeads || 0, feeTotals: data.feeTotals || {} });
  }, [data, onSummary]);

  const totals = data?.totals || {};
  const today = data?.today || {};
  const feeTotals = data?.feeTotals || {};
  const enrol = data?.enrolmentTrend || [];
  const revenue = data?.revenueTrend || [];
  const marked = (today.present || 0) + (today.absent || 0);
  const presentPct = marked > 0 ? Math.round((today.present / marked) * 100) : null;
  const enrolTotal = enrol.reduce((a, e) => a + (e.count || 0), 0);
  const revenueTotal = revenue.reduce((a, e) => a + (e.amount || 0), 0);
  const collected = feeTotals.collected || 0;
  const pending = feeTotals.pending || 0;
  const collectedPct = collected + pending > 0 ? (collected / (collected + pending)) * 100 : 0;

  const todaysClasses = useMemo(
    () => extra.liveClasses.filter(c => isSameDay(c.dateTime)).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)),
    [extra.liveClasses],
  );
  const liveNow = todaysClasses.filter(c => liveClassStatus(c) === 'LIVE NOW').length;
  const defaulters = extra.defaulters;
  const defaulterDue = (defaulters || []).reduce((a, d) => a + (d.pending || 0), 0);

  // Merge socket-pushed leads with fetched ones (dedupe by id).
  const allLeads = useMemo(() => {
    const map = new Map();
    [...liveLeads, ...extra.leads].forEach(l => { if (l?._id && !map.has(l._id)) map.set(l._id, l); });
    return [...map.values()];
  }, [liveLeads, extra.leads]);

  const activity = useMemo(() => {
    const items = [];
    students.forEach(s => {
      const at = s.admissionDate || s.createdAt;
      if (at) items.push({ id: `s-${s._id}`, at, icon: FiUserPlus, tone: 'bg-brand-gradient text-white', title: `${s.name} enrolled`, meta: s.classId?.name ? `Class ${s.classId.name}${s.batchId?.name ? ` · ${s.batchId.name}` : ''}` : 'New student', tab: 'students' });
    });
    allLeads.forEach(l => {
      if (l.createdAt) items.push({ id: `l-${l._id}`, at: l.createdAt, icon: FiInbox, tone: 'bg-ink-900 text-white', title: `Demo request · ${l.name}`, meta: [l.course, l.phone].filter(Boolean).join(' · ') || 'Website enquiry', tab: 'leads' });
    });
    extra.liveClasses.forEach(c => {
      if (c.dateTime && new Date(c.dateTime) <= new Date()) items.push({ id: `c-${c._id}`, at: c.dateTime, icon: FiVideo, tone: 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300', title: `Live class · ${c.title}`, meta: `${c.subjectId?.name || 'Class'} · ${c.teacherId?.name || 'Faculty'}`, tab: 'schedule' });
    });
    return items.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 7);
  }, [students, allLeads, extra.liveClasses]);

  const firstName = profileName?.split(' ')[0] || 'Admin';
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const dues = extra.dues;
  const overdueDues = (dues || []).filter(d => d.daysLeft < 0);
  const duesAmount = (dues || []).reduce((a, d) => a + (d.amount || 0), 0);
  const attention = [
    { key: 'admissions', icon: FiFileText, label: 'New admission applications', value: extra.admissions ? extra.admissions.length : '—', sub: 'Submitted online, awaiting review', cta: 'Review', tab: 'admissions' },
    { key: 'dues', icon: FiCalendar, label: 'Installments due this week', value: dues ? dues.length : '—', sub: dues ? `${formatINR(duesAmount)}${overdueDues.length ? ` · ${overdueDues.length} overdue` : ''}` : 'Loading…', cta: 'View dues', tab: 'fees', urgent: overdueDues.length > 0 },
    { key: 'approvals', icon: FiCreditCard, label: 'Payments awaiting approval', value: data?.pendingPayments ?? 0, sub: 'Manual payments from parents', cta: 'Review', tab: 'fees' },
    { key: 'defaulters', icon: FiAlertTriangle, label: 'Fee defaulters', value: defaulters ? defaulters.length : '—', sub: defaulters ? `${formatINR(defaulterDue)} outstanding` : 'Loading…', cta: 'Remind', tab: 'fees', urgent: true },
    { key: 'leads', icon: FiInbox, label: 'New demo leads', value: data?.newLeads ?? 0, sub: 'Not yet contacted', cta: 'Open CRM', tab: 'leads' },
    { key: 'live', icon: FiVideo, label: "Today's live classes", value: todaysClasses.length, sub: liveNow ? `${liveNow} live right now` : todaysClasses[0] ? `Next: ${new Date(todaysClasses[0].dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'None scheduled', cta: 'Schedule', tab: 'schedule', live: liveNow > 0 },
    { key: 'unmarked', icon: FiClock, label: 'Students not marked today', value: today.notMarked ?? 0, sub: `${today.absent ?? 0} marked absent`, cta: null, tab: null },
  ];

  const quickActions = [
    { label: 'Add student', icon: FiUserPlus, action: onAddStudent },
    { label: 'Onboard teacher', icon: FiUserCheck, action: () => setActiveTab('teachers') },
    { label: 'Record payment', icon: FiCreditCard, action: () => setActiveTab('fees') },
    { label: 'Broadcast notice', icon: FiVolume2, action: () => setActiveTab('communication') },
    { label: 'Publish results', icon: FiAward, action: () => setActiveTab('results') },
    { label: 'Timetable', icon: FiCalendar, action: () => setActiveTab('academics') },
  ];

  return (
    <div className="space-y-6">
      <GradientBanner
        title={`${greeting()}, ${firstName} 👋`}
        subtitle={dateLabel}
        right={(
          <div className="flex flex-wrap gap-2.5">
            <button onClick={() => setActiveTab('communication')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-brand-700 font-bold text-sm shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all">
              <FiVolume2 /> Post update
            </button>
            <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/20 active:scale-[0.98] transition-all" aria-label="Refresh dashboard">
              <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        )}
      >
        <div className="flex flex-wrap gap-2">
          {[
            { show: true, icon: FiCreditCard, text: `${data?.pendingPayments ?? 0} pending payment${data?.pendingPayments === 1 ? '' : 's'}`, tab: 'fees', hot: data?.pendingPayments > 0 },
            { show: true, icon: FiInbox, text: `${data?.newLeads ?? 0} new lead${data?.newLeads === 1 ? '' : 's'}`, tab: 'leads', hot: data?.newLeads > 0 },
            { show: todaysClasses.length > 0, icon: FiVideo, text: `${todaysClasses.length} class${todaysClasses.length === 1 ? '' : 'es'} today`, tab: 'schedule', hot: liveNow > 0 },
            { show: presentPct != null, icon: FiCheckCircle, text: `${presentPct}% attendance`, tab: null },
          ].filter(c => c.show).map(c => (
            <button
              key={c.text}
              type="button"
              disabled={!c.tab}
              onClick={() => c.tab && setActiveTab(c.tab)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur border border-white/20 text-xs font-bold text-white hover:bg-white/25 disabled:hover:bg-white/15 transition-all"
            >
              {c.hot && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              <c.icon /> {loading && !data ? '…' : c.text}
            </button>
          ))}
        </div>
      </GradientBanner>

      {failed && !data ? (
        <Card className="text-center">
          <EmptyState icon={FiAlertTriangle} title="Couldn’t load analytics" hint="Check your connection and try again." action={<button onClick={load} className="ui-btn-primary"><FiRefreshCw /> Retry</button>} />
        </Card>
      ) : loading && !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map(i => <SkeletonBlock key={i} className="h-32" />)}</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><SkeletonBlock className="h-80 lg:col-span-2" /><SkeletonBlock className="h-80" /></div>
        </div>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5 ui-stagger">
            <StatCard icon={FiUsers} label="Students" value={totals.students ?? 0} hint={`${totals.classes ?? 0} classes · ${totals.parents ?? 0} parents`} tone="brand" onClick={() => setActiveTab('students')} />
            <StatCard icon={FiUserCheck} label="Teachers" value={totals.teachers ?? 0} hint={presentTeachers != null ? `${presentTeachers} checked in today` : 'Faculty'} tone="dark" onClick={() => setActiveTab('teachers')} />
            <StatCard icon={FiCheckCircle} label="Present today" value={today.present ?? 0} hint={marked ? `${presentPct}% of ${marked} marked` : 'Attendance not marked yet'} tone="green" />
            <StatCard icon={FiCreditCard} label="Fees collected" value={collected} prefix="₹" hint={`${formatINR(pending)} pending`} tone="amber" onClick={() => setActiveTab('fees')} />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5 md:gap-3">
            {quickActions.map(a => (
              <button
                key={a.label}
                type="button"
                onClick={a.action}
                className="group ui-card !rounded-2xl flex flex-col items-center justify-center gap-2 py-4 px-2 hover:border-brand-200 hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <span className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center text-lg group-hover:bg-brand-gradient group-hover:text-white group-hover:rotate-6 transition-all duration-300"><a.icon /></span>
                <span className="text-[11px] md:text-xs font-bold text-gray-700 dark:text-gray-200 text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Revenue + attendance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
            <Card className="lg:col-span-2">
              <CardTitle
                icon={FiTrendingUp}
                title="Fee revenue"
                subtitle="Approved collections, last 6 months"
                right={<div className="text-right"><p className="text-lg font-extrabold text-gray-900 dark:text-white"><AnimatedNumber value={revenueTotal} prefix="₹" /></p><p className="text-[11px] font-semibold text-gray-400">6-month total</p></div>}
              />
              <div className="h-64 md:h-72">
                <Line
                  data={{
                    labels: revenue.map(r => shortMonth(r.month)),
                    datasets: [{
                      label: 'Collected',
                      data: revenue.map(r => r.amount || 0),
                      fill: true,
                      borderColor: BRAND,
                      borderWidth: 2.5,
                      backgroundColor: areaGradient,
                      pointBackgroundColor: '#fff',
                      pointBorderColor: BRAND,
                      pointBorderWidth: 2,
                      pointRadius: 4,
                      pointHoverRadius: 7,
                      tension: 0.4,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { display: false }, tooltip: { ...tooltipStyle, callbacks: { label: (ctx) => formatINR(ctx.parsed.y) } } },
                    scales: { ...baseScales, y: { ...baseScales.y, ticks: { ...baseScales.y.ticks, callback: (v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`) } } },
                  }}
                />
              </div>
            </Card>

            <Card className="flex flex-col">
              <CardTitle icon={FiActivity} title="Today’s attendance" subtitle={today.date ? new Date(today.date).toDateString() : 'Today'} />
              {marked + (today.notMarked || 0) > 0 ? (
                <>
                  <div className="relative w-48 h-48 mx-auto">
                    <Doughnut
                      data={{
                        labels: ['Present', 'Absent', 'Not marked'],
                        datasets: [{ data: [today.present || 0, today.absent || 0, today.notMarked || 0], backgroundColor: [BRAND, INK, 'rgba(148,163,184,0.25)'], borderWidth: 0, borderRadius: 6, spacing: 2 }],
                      }}
                      options={{ cutout: '76%', plugins: { legend: { display: false }, tooltip: tooltipStyle }, maintainAspectRatio: false }}
                    />
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{presentPct != null ? <AnimatedNumber value={presentPct} suffix="%" /> : '—'}</p>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">present</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-6">
                    {[['Present', today.present, BRAND], ['Absent', today.absent, INK], ['Unmarked', today.notMarked, '#cbd5e1']].map(([l, v, col]) => (
                      <div key={l} className="rounded-2xl bg-gray-50 dark:bg-white/5 py-3 text-center">
                        <p className="text-xl font-extrabold text-gray-900 dark:text-white">{v || 0}</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: col }} />{l}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState icon={FiUsers} title="No students to track yet" />
              )}
            </Card>
          </div>

          {/* Needs attention + activity */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 md:gap-6">
            <Card className="lg:col-span-3">
              <CardTitle icon={FiAlertTriangle} title="Needs attention" subtitle="Items waiting on you right now" />
              <div className="divide-y divide-gray-100 dark:divide-white/5 -mx-1">
                {attention.map(a => {
                  const hot = typeof a.value === 'number' && a.value > 0 && a.tab;
                  return (
                    <div key={a.key} className="flex items-center gap-3.5 px-1 py-3 group">
                      <div className={`relative w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 transition-transform group-hover:scale-105 ${hot ? (a.urgent ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : 'bg-brand-gradient text-white shadow-brand-soft') : 'bg-gray-100 dark:bg-white/5 text-gray-400'} ${a.live ? 'animate-glow' : ''}`}>
                        <a.icon />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{a.label}</p>
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1.5">
                          {a.live && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}{a.sub}
                        </p>
                      </div>
                      <p className={`text-2xl font-extrabold tabular-nums ${hot ? (a.urgent ? 'text-red-600' : 'text-brand-600') : 'text-gray-300 dark:text-gray-600'}`}>
                        {typeof a.value === 'number' ? <AnimatedNumber value={a.value} /> : a.value}
                      </p>
                      {a.tab ? (
                        <button
                          type="button"
                          onClick={() => setActiveTab(a.tab)}
                          className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${hot ? 'bg-ink-900 text-white hover:bg-black dark:bg-white dark:text-ink-900' : 'text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5'}`}
                        >
                          {a.cta} <FiArrowRight />
                        </button>
                      ) : <span className="hidden sm:block w-[5.5rem]" />}
                      {a.tab && <button type="button" onClick={() => setActiveTab(a.tab)} className="sm:hidden w-9 h-9 rounded-xl text-gray-400 hover:text-brand-600 flex items-center justify-center" aria-label={a.cta}><FiArrowRight /></button>}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardTitle icon={FiClock} title="Recent activity" subtitle="Enrolments, enquiries and classes" />
              {activity.length === 0 ? (
                <EmptyState icon={FiActivity} title="No recent activity" hint="New enrolments and demo requests will appear here." />
              ) : (
                <ol className="relative space-y-1 before:absolute before:left-[1.1rem] before:top-3 before:bottom-3 before:w-px before:bg-gray-100 dark:before:bg-white/10">
                  {activity.map(item => (
                    <li key={item.id}>
                      <button type="button" onClick={() => setActiveTab(item.tab)} className="relative w-full flex items-start gap-3 p-1.5 rounded-xl text-left hover:bg-brand-50/50 dark:hover:bg-white/5 transition-colors">
                        <span className={`relative z-[1] w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ring-4 ring-white dark:ring-ink-900 ${item.tone}`}><item.icon /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{item.title}</span>
                          <span className="block text-xs text-gray-500 truncate">{item.meta}</span>
                        </span>
                        <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap pt-0.5">{timeAgo(item.at)}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          {/* Enrolments + fee health */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
            <Card className="lg:col-span-2">
              <CardTitle icon={FiUserPlus} title="New enrolments" subtitle="Students joined, last 6 months" right={<Badge tone="brand">{enrolTotal} total</Badge>} />
              <div className="h-60">
                <Bar
                  data={{
                    labels: enrol.map(e => shortMonth(e.month)),
                    datasets: [{
                      label: 'New enrolments',
                      data: enrol.map(e => e.count || 0),
                      backgroundColor: enrol.map((_, i) => (i === enrol.length - 1 ? BRAND : BRAND_LIGHT)),
                      hoverBackgroundColor: BRAND,
                      borderRadius: 8,
                      borderSkipped: 'bottom',
                      maxBarThickness: 40,
                    }],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: tooltipStyle }, scales: baseScales }}
                />
              </div>
            </Card>

            <div className="relative overflow-hidden rounded-3xl bg-brand-dark text-white p-6 shadow-card flex flex-col items-center text-center">
              <div className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-brand-500/25 blur-3xl" />
              <p className="relative self-start text-[11px] font-bold uppercase tracking-[0.18em] text-brand-300">Fee health</p>
              <div className="relative my-4">
                <ProgressRing value={collectedPct} size={150} stroke={14} track="rgba(255,255,255,0.08)" label={`${Math.round(collectedPct)}% of dues collected`}>
                  <p className="text-3xl font-extrabold"><AnimatedNumber value={Math.round(collectedPct)} suffix="%" /></p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">collected</p>
                </ProgressRing>
              </div>
              <div className="relative grid grid-cols-2 gap-3 w-full">
                <div className="rounded-2xl bg-white/[0.06] p-3 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-500" />Collected</p>
                  <p className="text-base font-extrabold mt-0.5 truncate">{formatINR(collected)}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.06] p-3 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/30" />Outstanding</p>
                  <p className="text-base font-extrabold mt-0.5 text-brand-300 truncate">{formatINR(pending)}</p>
                </div>
              </div>
              <button onClick={() => setActiveTab('fees')} className="relative mt-4 w-full ui-btn-primary">
                <FiFileText /> View defaulters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OverviewAnalytics;
