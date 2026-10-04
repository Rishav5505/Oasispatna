import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const baseInput =
  'w-full py-3.5 pl-11 pr-4 border border-gray-200 rounded-2xl bg-gray-50 text-sm font-semibold text-gray-900 placeholder:text-gray-400 placeholder:font-medium transition-all focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 focus:outline-none disabled:cursor-not-allowed';

// Text input with a leading icon; password fields get a show/hide toggle.
const AuthField = ({ icon: Icon, type = 'text', className = '', ...props }) => {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
      )}
      <input
        type={isPassword && visible ? 'text' : type}
        className={`${baseInput} ${isPassword ? 'pr-12' : ''} ${className}`}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-brand-500 transition-colors"
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <FiEyeOff /> : <FiEye />}
        </button>
      )}
    </div>
  );
};

export const Spinner = ({ className = '' }) => (
  <span className={`inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin ${className}`} />
);

// Dark branded backdrop shared by the auth pages.
export const AuthShell = ({ children }) => (
  <div className="relative min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
    <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] bg-brand-500/25 rounded-full blur-[120px] pointer-events-none" />
    <div className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] bg-brand-600/20 rounded-full blur-[120px] pointer-events-none" />
    <div
      className="absolute inset-0 opacity-[0.07] pointer-events-none"
      style={{
        backgroundImage:
          'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    />
    <div className="relative w-full max-w-md animate-fade-in-up">{children}</div>
  </div>
);

export default AuthField;
