import React from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import ChatBadge from '../common/ChatBadge';
import PushToggle from '../common/PushToggle';
import LanguageToggle from '../common/LanguageToggle';
import { useI18n } from '../../i18n/useI18n';

/** Chat shortcut (with unread badge) + push toggle + EN/हिं switch for the admin/staff top bar. */
const TopbarExtras = ({ onOpenChat, chatCount = 0 }) => {
  const { t } = useI18n();
  return (
    <>
      <LanguageToggle className="hidden sm:inline-flex" />
      <PushToggle compact className="hidden sm:flex" />
      {onOpenChat && (
        <button
          type="button"
          onClick={onOpenChat}
          className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-white/5 transition-all"
          aria-label={t('admin.nav.chat')}
          title={t('admin.nav.chat')}
        >
          <FiMessageSquare className="text-lg" />
          <ChatBadge count={chatCount} floating />
        </button>
      )}
    </>
  );
};

export default TopbarExtras;
