// SoleBlessing server environment
export const ENV = {
  cookieSecret:  process.env.JWT_SECRET          ?? "",
  databaseUrl:   process.env.DATABASE_URL         ?? "",
  isProduction:  process.env.NODE_ENV === "production",
  // Kept as empty strings — used by legacy storage/image/voice modules
  forgeApiUrl:   process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey:   process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
