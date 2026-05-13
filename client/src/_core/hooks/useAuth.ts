// SoleBlessing — auth stub (Manus OAuth removed)
// Admin uses password auth at /admin. Customers browse without accounts.

export function useAuth() {
  return {
    user: null,
    loading: false,
    error: null,
    isAuthenticated: false,
    logout: async () => {},
  };
}
