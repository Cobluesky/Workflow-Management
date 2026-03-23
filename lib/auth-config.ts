export const AUTH_SERVER_URL =
  process.env.AUTH_SERVER_URL ||
  process.env.NEXT_PUBLIC_AUTH_SERVER_URL ||
  "http://localhost:4000";

export const ACCESS_TOKEN_STORAGE_KEY = "workspace.accessToken";
export const LOCAL_AUTH_PLACEHOLDER_PASSWORD = "AUTH_SERVER_MANAGED";
