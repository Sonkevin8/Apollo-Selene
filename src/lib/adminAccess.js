export const isAdminUiEnabled = () => {
  if (typeof window === 'undefined') return false;

  const legacyAdmin = window.localStorage.getItem('apollo-admin') === 'true';
  const clerkSession = Boolean(window.Clerk?.session);
  return legacyAdmin || clerkSession;
};
