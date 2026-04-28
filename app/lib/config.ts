export function getBaseUrl(): string {
  const fromEnv = process.env.BASE_URL;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("BASE_URL must be set in production");
  }
  return "http://localhost:3000";
}
