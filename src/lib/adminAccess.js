export const ADMIN_FLAG_STORAGE_KEY = 'apollo-admin';
export const ADMIN_USERNAME_STORAGE_KEY = 'apollo-admin-username';
export const ADMIN_PASSWORD_STORAGE_KEY = 'apollo-admin-password';
export const ADMIN_CHANGED_EVENT = 'apollo-admin-changed';

const hasWindow = () => typeof window !== 'undefined';

const notifyAdminChanged = () => {
  if (!hasWindow()) return;
  try {
    window.dispatchEvent(new Event(ADMIN_CHANGED_EVENT));
  } catch {
    // No-op: event dispatch can fail in restricted browser contexts.
  }
};

export const isLegacyAdminEnabled = () => {
  if (!hasWindow()) return false;
  return window.localStorage.getItem(ADMIN_FLAG_STORAGE_KEY) === 'true';
};

export const getLegacyAdminPassword = () => {
  if (!hasWindow()) return '';
  return window.localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) || '';
};

export const getLegacyAdminUsername = () => {
  if (!hasWindow()) return '';
  return window.localStorage.getItem(ADMIN_USERNAME_STORAGE_KEY) || '';
};

export const setLegacyAdminSession = ({ username = '', password = '' } = {}) => {
  if (!hasWindow()) return;
  window.localStorage.setItem(ADMIN_FLAG_STORAGE_KEY, 'true');
  if (username) {
    window.localStorage.setItem(ADMIN_USERNAME_STORAGE_KEY, username);
  }
  if (password) {
    window.localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, password);
  }
  notifyAdminChanged();
};

export const clearLegacyAdminSession = ({ clearUsername = true, clearPassword = true } = {}) => {
  if (!hasWindow()) return;
  window.localStorage.removeItem(ADMIN_FLAG_STORAGE_KEY);
  if (clearUsername) {
    window.localStorage.removeItem(ADMIN_USERNAME_STORAGE_KEY);
  }
  if (clearPassword) {
    window.localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
  }
  notifyAdminChanged();
};

export const isAdminUiEnabled = () => {
  if (!hasWindow()) return false;

  const legacyAdmin = isLegacyAdminEnabled();
  const clerkSession = Boolean(window.Clerk?.session);
  return legacyAdmin || clerkSession;
};
