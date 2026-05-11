import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { clearPhpAuthToken, getPhpAuthToken, phpApiRequest, setPhpAuthToken } from "@/lib/phpApi";

// ============================================================
// SISTEMA DE AUTENTICACIÓN - VERSIÓN 2.1 (OPTIMIZADO)
// ============================================================
// Principios:
// 1. Solo SIGNED_OUT limpia el estado
// 2. Refresh proactivo cada 25 min para mantener sesión viva
// 3. Profile y roles se cachean y solo se refrescan en eventos clave
// 4. Sin dependencias externas (useNavigate, etc.)
// 5. Throttle agresivo en focus/visibility para evitar re-renders
// ============================================================

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  current_workshop_id: string | null;
  locksmith_id: string | null;
}

interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthSession {
  access_token: string;
  expires_at: string | null;
}

interface WorkshopAccess {
  id: string;
  name: string;
  code: string;
  is_active: number | boolean;
  workshop_role?: "admin" | "employee";
}

interface LoginResponse {
  token: string;
  expires_at: string;
  user: AuthUser;
  profile: Omit<Profile, "user_id"> | null;
  global_role: "superadmin" | "user";
  workshops: WorkshopAccess[];
}

interface CheckResponse {
  authenticated: boolean;
  user: {
    id: string;
    global_role: "superadmin" | "user";
    is_admin?: boolean;
  };
  profile: Omit<Profile, "user_id"> | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  isAdmin: boolean;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; workshops?: WorkshopAccess[]; globalRole?: "superadmin" | "user" }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const hydrateProfile = useCallback((profileData: Omit<Profile, "user_id"> | null, userId: string): Profile | null => {
    if (!profileData) return null;
    return {
      ...profileData,
      user_id: userId,
    };
  }, []);

  const applyCheckedSession = useCallback((token: string, payload: CheckResponse) => {
    const hydratedProfile = hydrateProfile(payload.profile, payload.user.id);

    setSession({
      access_token: token,
      expires_at: null,
    });

    setUser({
      id: payload.user.id,
      email: hydratedProfile?.email ?? null,
    });

    setProfile(hydratedProfile);
    setIsAdmin(payload.user.global_role === "superadmin" || payload.user.is_admin === true);
  }, [hydrateProfile]);

  const applyLoginSession = useCallback((payload: LoginResponse) => {
    const hydratedProfile = hydrateProfile(payload.profile, payload.user.id);
    const hasAdminWorkshop = payload.workshops.some((w) => w.workshop_role === "admin");

    setPhpAuthToken(payload.token);

    setSession({
      access_token: payload.token,
      expires_at: payload.expires_at,
    });
    setUser(payload.user);
    setProfile(hydratedProfile);
    setIsAdmin(payload.global_role === "superadmin" || hasAdminWorkshop);
  }, [hydrateProfile]);

  // ============================================================
  // REFRESH PROFILE (público)
  // ============================================================

  const refreshProfile = useCallback(async () => {
    const token = getPhpAuthToken();
    if (!token) return;

    try {
      const data = await phpApiRequest<CheckResponse>("/auth/me", {
        method: "GET",
      });
      applyCheckedSession(token, data);
    } catch (err) {
      console.error("[Auth] Error refrescando perfil:", err);
    }
  }, [applyCheckedSession]);

  // ============================================================
  // AUTENTICACIÓN
  // ============================================================

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const data = await phpApiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      applyLoginSession(data);
      return { error: null, workshops: data.workshops, globalRole: data.global_role };
    } catch (err) {
      return { error: err as Error };
    }
  }, [applyLoginSession]);

  const signOut = useCallback(async () => {
    const token = getPhpAuthToken();

    try {
      if (token) {
        await phpApiRequest<null>("/auth/logout", { method: "POST" });
      }
    } catch (err) {
      console.error("[Auth] Error en signOut:", err);
    }

    clearPhpAuthToken();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  }, []);

  // ============================================================
  // EFECTO PRINCIPAL: RESTORE DE SESIÓN PHP
  // ============================================================

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const token = getPhpAuthToken();
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const data = await phpApiRequest<CheckResponse>("/auth/me", {
          method: "GET",
        });

        if (!isMounted) return;

        applyCheckedSession(token, data);
      } catch (err) {
        console.error("[Auth] Error restaurando sesión:", err);
        clearPhpAuthToken();
        setUser(null);
        setSession(null);
        setProfile(null);
        setIsAdmin(false);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [applyCheckedSession]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        profile,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
