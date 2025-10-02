import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logUserAction } from "@/utils/auditLog";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      
      // Log authentication events (fire and forget - don't block auth flow)
      if (event === 'SIGNED_IN' && session?.user) {
        logUserAction('LOGIN', session.user.id, {
          email: session.user.email,
          timestamp: new Date().toISOString(),
        }).catch(err => console.warn('Failed to log login:', err));
      } else if (event === 'SIGNED_OUT') {
        logUserAction('LOGOUT').catch(err => console.warn('Failed to log logout:', err));
      }
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Log logout before signing out (don't await - fire and forget)
    logUserAction('LOGOUT', user?.id, {
      email: user?.email,
      timestamp: new Date().toISOString(),
    }).catch(err => console.warn('Failed to log logout:', err));
    
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
