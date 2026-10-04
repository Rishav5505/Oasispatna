/**
 * ChatBadge — small unread-count pill for nav items / bottom tabs.
 *   import ChatBadge from '../components/common/ChatBadge';
 *   <span className="relative"><FiMessageSquare /><ChatBadge floating /></span>
 *   <ChatBadge />                       // inline pill (fetches count itself via useChatUnread)
 *   <ChatBadge count={unread} />        // controlled — pass a count you already have
 *   <ChatBadge socket={socket} />       // live bump on 'chat:message'
 * Renders nothing when the count is 0.
 */
import React from 'react';
import { useChatUnread } from './useChatUnread';

const Pill = ({ count, floating, className }) => {
  if (!count) return null;
  return (
    <span
      aria-label={`${count} unread`}
      className={`${floating ? 'absolute -top-1.5 -right-1.5' : ''} inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-gradient text-white text-[10px] font-extrabold leading-none shadow-brand-soft ring-2 ring-white dark:ring-ink-900 ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};

const SelfFetching = ({ socket, ...rest }) => {
  const { count } = useChatUnread({ socket });
  return <Pill count={count} {...rest} />;
};

export function ChatBadge({ count, socket, floating = false, className = '' }) {
  if (typeof count === 'number') return <Pill count={count} floating={floating} className={className} />;
  return <SelfFetching socket={socket} floating={floating} className={className} />;
}

export default ChatBadge;
