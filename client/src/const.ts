export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "SoleBlessing";
export const APP_LOGO = "/soleblessing-logo.png";

// Manus OAuth removed — admin uses simple password auth at /admin
export const getLoginUrl = () => "/";
