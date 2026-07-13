// SoleBlessing — auth stub (Manus OAuth removed)
// Admin uses password auth at /admin. Customers browse without accounts.

export type AuthUser = { name?: string; email?: string; role?: string } | null;

export function useAuth() {
  return {
    user: null as AuthUser,
    loading: false,
    error: null,
    isAuthenticated: false,
    logout: async () => {},
  };
}
