import {
  FiGrid, FiUsers, FiUserCheck, FiHeart, FiLayers, FiClipboard, FiAward, FiCalendar,
  FiCreditCard, FiVolume2, FiInbox, FiCpu, FiSettings,
} from 'react-icons/fi';

// Sidebar structure. Tab ids map 1:1 to AdminDashboard `activeTab` values.
export const NAV_GROUPS = [
  { label: 'Overview', items: [{ id: 'overview', label: 'Dashboard', icon: FiGrid, hint: 'KPIs, revenue & attendance' }] },
  {
    label: 'People',
    items: [
      { id: 'students', label: 'Students', icon: FiUsers, hint: 'Directory, profiles, enrolment' },
      { id: 'teachers', label: 'Teachers', icon: FiUserCheck, hint: 'Faculty, assignments, attendance' },
      { id: 'parents', label: 'Parents', icon: FiHeart, hint: 'Guardians & student linking' },
    ],
  },
  {
    label: 'Academics',
    items: [
      { id: 'academics', label: 'Classes & Timetable', icon: FiLayers, hint: 'Classes, batches, subjects, timetable' },
      { id: 'tests', label: 'Tests & Reports', icon: FiClipboard, hint: 'Online tests and submissions' },
      { id: 'results', label: 'Result Center', icon: FiAward, hint: 'Publish exam results & report cards' },
      { id: 'schedule', label: 'Live Schedule', icon: FiCalendar, hint: 'Live classes and timings' },
    ],
  },
  { label: 'Finance', items: [{ id: 'fees', label: 'Fees', icon: FiCreditCard, hint: 'Payments, approvals, defaulters' }] },
  {
    label: 'Engagement',
    items: [
      { id: 'communication', label: 'Notice Center', icon: FiVolume2, hint: 'Broadcast notices & email' },
      { id: 'leads', label: 'Demo Requests', icon: FiInbox, hint: 'Leads CRM pipeline' },
    ],
  },
  { label: 'Insights', items: [{ id: 'insights', label: 'AI Insights', icon: FiCpu, hint: 'Toppers, at-risk, subject metrics' }] },
];

export const PROFILE_ITEM = { id: 'profile', label: 'Profile Settings', icon: FiSettings, hint: 'Your admin profile & photo' };

export const NAV_ITEMS = [
  ...NAV_GROUPS.flatMap(g => g.items.map(i => ({ ...i, group: g.label }))),
  { ...PROFILE_ITEM, group: 'Account' },
];

export const navItem = (id) => NAV_ITEMS.find(i => i.id === id) || NAV_ITEMS[0];

// Primary tabs shown in the mobile bottom bar (rest live under "More").
export const MOBILE_PRIMARY = ['overview', 'students', 'fees', 'leads'];
