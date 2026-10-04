import { createContext } from 'react';

// Shared context object (kept separate so I18nProvider.jsx only exports a component).
export const I18nContext = createContext(null);
