import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * AuthContext - مصدر واحد للحقيقة لحالة المصادقة
 * 
 * يعتمد فقط على Supabase session (Google OAuth + Email/Password)
 * Facebook يمر عبر facebook-auth-sync Edge Function لإنشاء Supabase session
 */

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  provider: 'google' | 'facebook' | 'email' | 'phone';
  supabaseUser: User;
  emailConfirmed: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSessionToUser(session: Session): AuthUser {
  const u = session.user;
  const provider = u.app_metadata?.provider as string;
  
  let mappedProvider: AuthUser['provider'] = 'email';
  if (provider === 'google') mappedProvider = 'google';
  else if (provider === 'facebook') mappedProvider = 'facebook';
  else if (provider === 'phone') mappedProvider = 'phone';

  return {
    id: u.id,
    email: u.email,
    name: u.user_metadata?.full_name || u.user_metadata?.name || u.email,
    avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture,
    provider: mappedProvider,
    supabaseUser: u,
    emailConfirmed: !!u.email_confirmed_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 1. Set up auth state listener FIRST (Supabase best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted) return;

        if (newSession) {
          setSession(newSession);
          setUser(mapSessionToUser(newSession));
        } else {
          setSession(null);
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    // 2. THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      if (!isMounted) return;

      if (error) {
        console.error('[Auth] Session error:', error.message);
        // Invalid/expired session - clean up
        if (error.message.includes('invalid') || error.message.includes('expired')) {
          supabase.auth.signOut();
        }
      }

      if (currentSession) {
        setSession(currentSession);
        setUser(mapSessionToUser(currentSession));
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Clean up any legacy Facebook session data
    try { localStorage.removeItem('facebook_session'); } catch (_e) { /* ignored */ }
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAuthenticated: !!user,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
