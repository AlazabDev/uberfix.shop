import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * AuthContext — مصدر واحد للحقيقة.
 * القاعدة الذهبية: onAuthStateChange فقط + getSession مرة واحدة. لا race conditions.
 */

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  provider: 'google' | 'facebook' | 'azure' | 'email' | 'phone' | 'whatsapp';
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
  const provider = (u.app_metadata?.provider as string) || 'email';
  const supportedProviders: AuthUser['provider'][] = ['google', 'facebook', 'azure', 'email', 'phone', 'whatsapp'];
  const mappedProvider = (supportedProviders.includes(provider as AuthUser['provider'])
    ? provider
    : 'email') as AuthUser['provider'];

  return {
    id: u.id,
    email: u.email,
    name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || u.phone,
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
    // 1) Listener FIRST — Supabase best practice
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession ? mapSessionToUser(newSession) : null);
      setIsLoading(false);
    });

    // 2) Then read current session (once)
    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setUser(current ? mapSessionToUser(current) : null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAuthenticated: !!user, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
