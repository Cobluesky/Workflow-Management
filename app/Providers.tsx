"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ACCESS_TOKEN_STORAGE_KEY, AUTH_SERVER_URL } from "@/lib/auth-config";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  alias: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  consumeAccessToken: (accessToken: string) => Promise<void>;
  updateAlias: (alias: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

function readStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

function writeStoredAccessToken(accessToken: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!accessToken) {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within Providers");
  }

  return context;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (token: string) => {
    const response = await fetch("/api/user", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = await readJson<{ success: boolean; data: { alias: string | null } }>(response);
    return payload.data.alias;
  }, []);

  const fetchVerifiedUser = useCallback(
    async (token: string) => {
      const verifyResponse = await fetch(`${AUTH_SERVER_URL}/api/v1/auth/verify`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!verifyResponse.ok) {
        return null;
      }

      const verifyPayload = await readJson<{
        success: boolean;
        data: {
          user: {
            id: string;
            email: string;
            name: string;
            role: string;
          };
        };
      }>(verifyResponse);

      const alias = await fetchProfile(token);
      return {
        ...verifyPayload.data.user,
        alias,
      } satisfies AuthUser;
    },
    [fetchProfile]
  );

  const applySession = useCallback(
    async (token: string | null) => {
      if (!token) {
        writeStoredAccessToken(null);
        setAccessToken(null);
        setUser(null);
        return null;
      }

      const verifiedUser = await fetchVerifiedUser(token);

      if (!verifiedUser) {
        writeStoredAccessToken(null);
        setAccessToken(null);
        setUser(null);
        return null;
      }

      writeStoredAccessToken(token);
      setAccessToken(token);
      setUser(verifiedUser);
      return token;
    },
    [fetchVerifiedUser]
  );

  const refreshSession = useCallback(async () => {
    const response = await fetch(`${AUTH_SERVER_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      await applySession(null);
      return null;
    }

    const payload = await readJson<{ success: boolean; data: { accessToken: string } }>(response);
    return applySession(payload.data.accessToken);
  }, [applySession]);

  useEffect(() => {
    let cancelled = false;

    async function initializeSession() {
      const storedToken = readStoredAccessToken();

      if (storedToken) {
        const resolved = await applySession(storedToken);

        if (resolved || cancelled) {
          if (!cancelled) {
            setIsLoading(false);
          }
          return;
        }
      }

      await refreshSession();

      if (!cancelled) {
        setIsLoading(false);
      }
    }

    initializeSession();

    return () => {
      cancelled = true;
    };
  }, [applySession, refreshSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch(`${AUTH_SERVER_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const payload = await readJson<any>(response);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "로그인에 실패했습니다.");
      }

      await applySession(payload.data.accessToken);
    },
    [applySession]
  );

  const register = useCallback(
    async (input: { email: string; password: string; name: string }) => {
      const response = await fetch(`${AUTH_SERVER_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(input),
      });

      const payload = await readJson<any>(response);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "회원가입에 실패했습니다.");
      }

      await login(input.email, input.password);
    },
    [login]
  );

  const logout = useCallback(async () => {
    await fetch(`${AUTH_SERVER_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    await applySession(null);
  }, [applySession]);

  const consumeAccessToken = useCallback(
    async (token: string) => {
      const appliedToken = await applySession(token);

      if (!appliedToken) {
        throw new Error("소셜 로그인 세션을 확인하지 못했습니다.");
      }
    },
    [applySession]
  );

  const updateAlias = useCallback((alias: string) => {
    setUser((current) => (current ? { ...current, alias } : current));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isLoading,
      login,
      register,
      logout,
      refreshSession,
      consumeAccessToken,
      updateAlias,
    }),
    [accessToken, consumeAccessToken, isLoading, login, logout, refreshSession, register, updateAlias, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
