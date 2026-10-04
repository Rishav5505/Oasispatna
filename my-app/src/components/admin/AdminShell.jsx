import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiSearch, FiBell, FiMoon, FiSun, FiLogOut, FiMenu, FiX, FiChevronsLeft, FiChevronsRight,
  FiChevronRight, FiMoreHorizontal, FiCornerDownLeft, FiZap, FiSettings,
} from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';
import { DEFAULT_NAV } from './adminNav';
import { Avatar } from './AdminUI';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

const CountPill = ({ n, className = '' }) => (n > 0
  ? <span className={`min-w-[1.25rem] h-5 px-1.5 rounded-full bg-brand-500 text-white text-[10px] font-extrabold inline-flex items-center justify-center ${className}`}>{n > 99 ? '99+' : n}</span>
  : null);

const NavButton = ({ item, activeTab, collapsed, badges, onNavigate }) => {
  const active = activeTab === item.id;
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      title={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`group relative w-full flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400
        ${collapsed ? 'lg:justify-center lg:px-0 px-3.5 py-2.5' : 'px-3.5 py-2.5'}
        ${active ? 'bg-brand-gradient text-white shadow-brand-glow' : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'}`}
    >
      <item.icon className={`text-[1.05rem] shrink-0 transition-transform duration-300 ${active ? '' : 'group-hover:scale-110 group-hover:text-brand-400'}`} />
      <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
      {badges[item.id] > 0 && (
        collapsed
          ? <span className="hidden lg:block absolute top-1.5 right-3 w-2 h-2 rounded-full bg-brand-400 ring-2 ring-ink-950" />
          : null
      )}
      <CountPill n={badges[item.id]} className={`ml-auto ${active ? '!bg-white/25' : ''} ${collapsed ? 'lg:hidden' : ''}`} />
    </button>
  );
};


/* ------------------------------------------------------------------ */
/* Sidebar (desktop static, mobile drawer)                             */
/* ------------------------------------------------------------------ */
export const Sidebar = ({ activeTab, onNavigate, open, onClose, collapsed, onToggleCollapse, badges = {}, user, photoUrl, onLogout, logo, logoMark, nav = DEFAULT_NAV }) => {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in" onClick={onClose} />}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-ink-950 text-white border-r border-white/5 transition-all duration-300 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          w-72 ${collapsed ? 'lg:w-[5.25rem]' : 'lg:w-72'}`}
        aria-label={`${nav.roleLabel} navigation`}
      >
        {/* glow */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-brand-500/20 blur-3xl" />

        <div className={`relative h-20 flex items-center border-b border-white/5 ${collapsed ? 'lg:justify-center px-5 lg:px-0' : 'px-5'}`}>
          <img src={logo} alt="Oasis JEE Classes" className={`h-11 object-contain brightness-110 ${collapsed ? 'lg:hidden' : ''}`} />
          {logoMark && <img src={logoMark} alt="Oasis" className={`hidden h-10 w-10 object-contain bg-white rounded-xl p-1 ${collapsed ? 'lg:block' : ''}`} />}
          <button type="button" onClick={onClose} className="lg:hidden ml-auto w-9 h-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center" aria-label="Close menu">
            <FiX className="text-lg" />
          </button>
        </div>

        <nav className="relative flex-1 overflow-y-auto ui-scrollbar px-3 py-4 space-y-5">
          {nav.groups.map(group => (
            <div key={group.label}>
              <p className={`px-3.5 mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 ${collapsed ? 'lg:hidden' : ''}`}>{group.label}</p>
              {collapsed && <div className="hidden lg:block mx-auto mb-2 w-6 h-px bg-white/10" />}
              <div className="space-y-1">
                {group.items.map(item => <NavButton key={item.id} item={item} activeTab={activeTab} collapsed={collapsed} badges={badges} onNavigate={onNavigate} />)}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative p-3 border-t border-white/5 space-y-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <FiChevronsRight /> : <><FiChevronsLeft /> Collapse</>}
          </button>
          <div className={`flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 ${collapsed ? 'lg:flex-col lg:p-2' : ''}`}>
            <button type="button" onClick={() => onNavigate('profile')} className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400" title="Profile settings">
              <Avatar name={user?.name || nav.roleLabel} src={photoUrl} size="md" className="!ring-ink-950" />
            </button>
            <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="text-sm font-bold truncate">{user?.name || nav.roleLabel}</p>
              <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {nav.roleLabel} · online
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              className="w-9 h-9 shrink-0 rounded-xl text-gray-400 hover:text-white hover:bg-red-500/90 flex items-center justify-center transition-all active:scale-95"
            >
              <FiLogOut />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Click-outside popover helper                                        */
/* ------------------------------------------------------------------ */
const usePopover = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return [open, setOpen, ref];
};

/* ------------------------------------------------------------------ */
/* Top bar                                                             */
/* ------------------------------------------------------------------ */
export const Topbar = ({ activeTab, onOpenSidebar, onOpenPalette, notifications = [], onNavigate, user, photoUrl, onLogout, logoMark, nav = DEFAULT_NAV, extras = null }) => {
  const theme = useTheme();
  const [bellOpen, setBellOpen, bellRef] = usePopover();
  const [menuOpen, setMenuOpen, menuRef] = usePopover();
  const current = nav.find(activeTab);
  const unread = notifications.reduce((a, n) => a + (n.count || 0), 0);

  return (
    <header className="sticky top-0 z-30 h-16 md:h-[4.5rem] shrink-0 ui-glass !border-x-0 !border-t-0 !border-b-gray-100 dark:!border-b-white/5 flex items-center gap-3 px-4 md:px-8">
      <button type="button" onClick={onOpenSidebar} className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-white/5" aria-label="Open menu">
        <FiMenu className="text-xl" />
      </button>
      {logoMark && <img src={logoMark} alt="" className="lg:hidden w-8 h-8 object-contain" />}

      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
          <span>{nav.roleLabel}</span><FiChevronRight className="text-[10px]" /><span>{current.group}</span>
        </nav>
        <h1 className="text-base md:text-lg font-extrabold tracking-tight text-gray-900 dark:text-white truncate leading-tight">{current.label}</h1>
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        className="hidden md:flex items-center gap-2.5 ml-auto lg:ml-10 w-72 xl:w-96 px-3.5 py-2.5 rounded-xl bg-gray-100/80 dark:bg-white/5 border border-transparent hover:border-brand-200 dark:hover:border-white/10 text-sm text-gray-400 transition-all"
      >
        <FiSearch />
        <span className="flex-1 text-left">Jump to…</span>
        <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-ink-800 border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-500">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>

      <div className="flex items-center gap-1.5 md:gap-2 ml-auto md:ml-4">
        <button type="button" onClick={onOpenPalette} className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-white/5" aria-label="Search">
          <FiSearch className="text-lg" />
        </button>

        {extras}

        {theme?.toggleTheme && (
          <button
            type="button"
            onClick={theme.toggleTheme}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-white/5 transition-all"
            aria-label={theme.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme.theme === 'dark' ? <FiSun className="text-lg transition-transform hover:rotate-45" /> : <FiMoon className="text-lg" />}
          </button>
        )}

        {/* Notifications */}
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => setBellOpen(o => !o)}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-white/5 transition-all ${unread ? 'text-brand-600' : ''}`}
            aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
            aria-expanded={bellOpen}
          >
            <FiBell className="text-lg" />
            {unread > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-brand-500 ring-2 ring-white dark:ring-ink-900 animate-glow" />}
          </button>
          {bellOpen && (
            <div className="absolute right-0 mt-2 w-80 ui-card !rounded-2xl p-2 animate-scale-in origin-top-right">
              <div className="px-3 py-2 flex items-center justify-between">
                <p className="text-sm font-extrabold text-gray-900 dark:text-white">Notifications</p>
                {unread > 0 && <span className="ui-badge bg-brand-50 text-brand-700">{unread} new</span>}
              </div>
              {notifications.filter(n => n.count > 0).length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-gray-500">You&apos;re all caught up ✨</p>
              ) : notifications.filter(n => n.count > 0).map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => { setBellOpen(false); onNavigate(n.tab); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-brand-50 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="w-9 h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center shrink-0"><n.icon /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-gray-800 dark:text-gray-100">{n.count} {n.label}</span>
                    <span className="block text-xs text-gray-500">{n.hint}</span>
                  </span>
                  <FiChevronRight className="text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Avatar menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-2.5 pl-1 pr-1 md:pr-3 py-1 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
            aria-label="Account menu"
            aria-expanded={menuOpen}
          >
            <Avatar name={user?.name || nav.roleLabel} src={photoUrl} size="sm" />
            <span className="hidden md:block text-left">
              <span className="block text-xs font-bold text-gray-900 dark:text-white leading-tight max-w-[8rem] truncate">{user?.name || nav.roleLabel}</span>
              <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{user?.role}</span>
            </span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 ui-card !rounded-2xl p-1.5 animate-scale-in origin-top-right">
              <button type="button" onClick={() => { setMenuOpen(false); onNavigate('profile'); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-brand-50 dark:hover:bg-white/5">
                <FiSettings /> {nav.profileItem.label}
              </button>
              <button type="button" onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                <FiLogOut /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

/* ------------------------------------------------------------------ */
/* Mobile bottom navigation + "More" sheet                             */
/* ------------------------------------------------------------------ */
export const MobileBottomNav = ({ activeTab, onNavigate, badges = {}, nav = DEFAULT_NAV }) => {
  const [more, setMore] = useState(false);
  const primary = nav.mobilePrimary.map(nav.find);
  const inMore = !nav.mobilePrimary.includes(activeTab);
  const go = (id) => { setMore(false); onNavigate(id); };

  return (
    <>
      {more && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setMore(false)}>
          <div className="absolute bottom-0 inset-x-0 ui-card !rounded-b-none !rounded-t-3xl p-4 pb-24 max-h-[75vh] overflow-y-auto animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto w-10 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 mb-4" />
            {[...nav.groups, { label: nav.accountLabel, items: [nav.profileItem] }].map(g => (
              <div key={g.label} className="mb-3">
                <p className="px-1 mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{g.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {g.items.map(i => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => go(i.id)}
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl text-[11px] font-bold transition-all active:scale-95 ${activeTab === i.id ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300'}`}
                    >
                      <i.icon className="text-lg" />
                      <span className="text-center leading-tight">{i.label}</span>
                      {badges[i.id] > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-500" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 ui-glass !border-x-0 !border-b-0 px-2 pt-1.5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.375rem)' }} aria-label="Primary">
        <div className="grid grid-cols-5 gap-1">
          {[...primary, { id: '__more', label: 'More', icon: FiMoreHorizontal }].map(item => {
            const active = item.id === '__more' ? (more || inMore) : activeTab === item.id && !more;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => (item.id === '__more' ? setMore(m => !m) : go(item.id))}
                className={`relative flex flex-col items-center gap-0.5 py-1.5 rounded-2xl text-[10px] font-bold transition-colors ${active ? 'text-brand-600' : 'text-gray-500'}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className={`relative w-12 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${active ? 'bg-brand-100 dark:bg-brand-500/20' : ''}`}>
                  <item.icon className="text-lg" />
                  {badges[item.id] > 0 && <span className="absolute top-0.5 right-2.5 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-ink-900" />}
                </span>
                {item.id === 'overview' ? 'Home' : item.label.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Ctrl/⌘+K command palette                                            */
/* ------------------------------------------------------------------ */
export const CommandPalette = ({ open, onClose, onNavigate, actions = [], nav = DEFAULT_NAV }) => {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const entries = useMemo(() => {
    const all = [
      ...actions.map(a => ({ ...a, kind: 'Quick actions' })),
      ...nav.items.map(i => ({ key: i.id, label: i.label, hint: i.hint, icon: i.icon, group: i.group, kind: 'Go to', run: () => onNavigate(i.id) })),
    ];
    const q = query.trim().toLowerCase();
    return q ? all.filter(e => `${e.label} ${e.hint || ''} ${e.group || ''}`.toLowerCase().includes(q)) : all;
  }, [actions, onNavigate, query, nav]);

  useEffect(() => {
    if (!open) return undefined;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  const close = () => { setQuery(''); setCursor(0); onClose(); };
  const run = (e) => { if (!e) return; close(); e.run(); };
  const onKey = (ev) => {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setCursor(c => Math.min(c + 1, entries.length - 1)); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (ev.key === 'Enter') { ev.preventDefault(); run(entries[cursor]); }
    else if (ev.key === 'Escape') { ev.preventDefault(); close(); }
  };

  let lastKind = null;
  return (
    <div className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-[12vh] animate-fade-in" onClick={close}>
      <div role="dialog" aria-modal="true" aria-label="Quick jump" className="ui-card w-full max-w-xl !rounded-2xl overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 border-b border-gray-100 dark:border-white/5">
          <FiSearch className="text-brand-500 text-lg shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={onKey}
            placeholder="Search pages and actions…"
            className="flex-1 bg-transparent py-4 text-base font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
            aria-label="Search pages and actions"
          />
          <kbd className="px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-400">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto ui-scrollbar p-2">
          {entries.length === 0 && <p className="py-10 text-center text-sm text-gray-500">No matches for “{query}”</p>}
          {entries.map((e, idx) => {
            const header = e.kind !== lastKind ? e.kind : null;
            lastKind = e.kind;
            const Icon = e.icon || FiZap;
            const active = idx === cursor;
            return (
              <React.Fragment key={`${e.kind}-${e.key}`}>
                {header && <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{header}</p>}
                <button
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setCursor(idx)}
                  onClick={() => run(e)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${active ? 'bg-brand-50 dark:bg-white/5' : ''}`}
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${active ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}><Icon /></span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm font-bold ${active ? 'text-brand-700 dark:text-brand-300' : 'text-gray-800 dark:text-gray-100'}`}>{e.label}</span>
                    {e.hint && <span className="block text-xs text-gray-500 truncate">{e.hint}</span>}
                  </span>
                  {active && <FiCornerDownLeft className="text-brand-500 shrink-0" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/5 flex items-center gap-4 text-[11px] font-semibold text-gray-400">
          <span><kbd className="font-bold">↑↓</kbd> navigate</span>
          <span><kbd className="font-bold">↵</kbd> open</span>
          <span className="ml-auto">Oasis {nav.roleLabel}</span>
        </div>
      </div>
    </div>
  );
};
