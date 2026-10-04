import {
  FiGrid, FiUsers, FiUserCheck, FiHeart, FiLayers, FiClipboard, FiAward, FiCalendar,
  FiCreditCard, FiVolume2, FiInbox, FiCpu, FiSettings, FiFileText, FiDollarSign,
  FiStar, FiBriefcase, FiMessageSquare, FiCoffee, FiSun,
} from 'react-icons/fi';

/*
 * Sidebar / palette / bottom-nav configuration shared by the Admin and Staff dashboards.
 * Each item: { id (tab id), labelKey, label (English fallback), hintKey?, hint, icon }.
 * `buildNav(spec, t)` resolves labels through i18n and returns the object every shell component takes
 * as its `nav` prop: { groups, items, profileItem, mobilePrimary, roleLabel, find(id) }.
 */

const item = (id, label, icon, hint) => ({ id, labelKey: `admin.nav.${id}`, label, icon, hintKey: `admin.navHint.${id}`, hint });

export const ADMIN_NAV_SPEC = {
  roleKey: 'admin.role.admin',
  roleLabel: 'Admin',
  groups: [
    { key: 'admin.group.overview', label: 'Overview', items: [item('overview', 'Dashboard', FiGrid, 'KPIs, revenue & attendance')] },
    {
      key: 'admin.group.people',
      label: 'People',
      items: [
        item('students', 'Students', FiUsers, 'Directory, profiles, bulk import'),
        item('teachers', 'Teachers', FiUserCheck, 'Faculty, assignments, attendance'),
        item('parents', 'Parents', FiHeart, 'Guardians & student linking'),
        item('staff', 'Staff', FiBriefcase, 'Front-desk & office accounts'),
      ],
    },
    {
      key: 'admin.group.academics',
      label: 'Academics',
      items: [
        item('academics', 'Classes & Timetable', FiLayers, 'Classes, batches, subjects, timetable'),
        item('tests', 'Tests & Reports', FiClipboard, 'Online tests and submissions'),
        item('results', 'Result Center', FiAward, 'Publish exam results & report cards'),
        item('schedule', 'Live Schedule', FiSun, 'Live classes and timings'),
        item('calendar', 'Calendar', FiCalendar, 'Holidays, exams, events & PTMs'),
        item('certificates', 'Certificates', FiStar, 'Merit & participation certificates'),
      ],
    },
    {
      key: 'admin.group.finance',
      label: 'Finance',
      items: [
        item('fees', 'Fees', FiCreditCard, 'Payments, plans, dues, invoices'),
        item('finance', 'Salaries & P&L', FiDollarSign, 'Salaries, expenses, profit & loss'),
      ],
    },
    {
      key: 'admin.group.engagement',
      label: 'Engagement',
      items: [
        item('admissions', 'Admissions', FiFileText, 'Online applications & approvals'),
        item('leads', 'Demo Requests', FiInbox, 'Leads CRM pipeline & funnel'),
        item('communication', 'Notice Center', FiVolume2, 'Broadcast notices & email'),
        item('chat', 'Messages', FiMessageSquare, 'Chat with parents & teachers'),
        item('leaves', 'Leave Requests', FiCoffee, 'Approve student & teacher leaves'),
      ],
    },
    { key: 'admin.group.insights', label: 'Insights', items: [item('insights', 'AI Insights', FiCpu, 'Toppers, at-risk, subject metrics')] },
  ],
  profile: item('profile', 'Profile Settings', FiSettings, 'Your profile & photo'),
  mobilePrimary: ['overview', 'students', 'fees', 'admissions'],
};

export const STAFF_NAV_SPEC = {
  roleKey: 'admin.role.staff',
  roleLabel: 'Staff',
  groups: [
    { key: 'admin.group.overview', label: 'Overview', items: [item('overview', 'Dashboard', FiGrid, "Today's dues, leads & approvals")] },
    {
      key: 'admin.group.frontDesk',
      label: 'Front desk',
      items: [
        item('leads', 'Demo Requests', FiInbox, 'Leads CRM pipeline & funnel'),
        item('admissions', 'Admissions', FiFileText, 'Online applications'),
        item('students', 'Students', FiUsers, 'Student directory (read-only)'),
      ],
    },
    { key: 'admin.group.finance', label: 'Finance', items: [item('fees', 'Fees', FiCreditCard, 'Record payments, approvals, dues, invoices')] },
    {
      key: 'admin.group.engagement',
      label: 'Engagement',
      items: [
        item('calendar', 'Calendar', FiCalendar, 'Holidays, exams, events & PTMs'),
        item('chat', 'Messages', FiMessageSquare, 'Chat with parents & teachers'),
      ],
    },
  ],
  profile: item('profile', 'Profile Settings', FiSettings, 'Your profile & photo'),
  mobilePrimary: ['overview', 'leads', 'fees', 'admissions'],
};

const tr = (t, key, fallback) => {
  if (!t || !key) return fallback;
  const v = t(key);
  return v && v !== key ? v : fallback;
};

export const buildNav = (spec, t) => {
  const groups = spec.groups.map(g => ({
    label: tr(t, g.key, g.label),
    items: g.items.map(i => ({ ...i, label: tr(t, i.labelKey, i.label), hint: tr(t, i.hintKey, i.hint) })),
  }));
  const profileItem = { ...spec.profile, label: tr(t, spec.profile.labelKey, spec.profile.label), hint: tr(t, spec.profile.hintKey, spec.profile.hint) };
  const accountLabel = tr(t, 'admin.group.account', 'Account');
  const items = [
    ...groups.flatMap(g => g.items.map(i => ({ ...i, group: g.label }))),
    { ...profileItem, group: accountLabel },
  ];
  return {
    groups,
    items,
    profileItem,
    accountLabel,
    mobilePrimary: spec.mobilePrimary,
    roleLabel: tr(t, spec.roleKey, spec.roleLabel),
    find: (id) => items.find(i => i.id === id) || items[0],
  };
};

// Backwards-compatible static exports (English labels, admin layout).
export const DEFAULT_NAV = buildNav(ADMIN_NAV_SPEC);
export const NAV_GROUPS = DEFAULT_NAV.groups;
export const PROFILE_ITEM = DEFAULT_NAV.profileItem;
export const NAV_ITEMS = DEFAULT_NAV.items;
export const navItem = DEFAULT_NAV.find;
export const MOBILE_PRIMARY = DEFAULT_NAV.mobilePrimary;
