import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [hospital, setHospital] = useState({
    name: 'MediCare Hospital & Clinic',
    logo_url: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    gst_number: '',
    currency: 'INR',
    date_format: 'DD/MM/YYYY',
    time_format: '12-hour',
    timezone: 'Asia/Kolkata',
  });
  const [loading, setLoading] = useState(true);

  const fetchProfileAndHospital = useCallback(async (authUser) => {
    if (!supabase || !authUser) {
      setProfile(null);
      return;
    }

    try {
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profError && profError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profError);
      }

      if (prof) {
        setProfile(prof);
      } else {
        setProfile({
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email,
          role: authUser.user_metadata?.role || 'receptionist',
          is_active: true,
        });
      }

      const { data: hosp } = await supabase
        .from('hospitals')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (hosp) {
        setHospital(hosp);
      }
    } catch (err) {
      console.error('Auth context load error:', err);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchProfileAndHospital(currentSession.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        fetchProfileAndHospital(newSession.user);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileAndHospital]);

  const signIn = async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    });
    if (error) throw error;
  };

  const refreshHospital = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('hospitals').select('*').limit(1).maybeSingle();
    if (data) setHospital(data);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfileAndHospital(user);
  };

  const role = profile?.role || 'receptionist';
  const isAdmin = role === 'admin';
  const isReceptionist = role === 'receptionist';
  const isDoctor = role === 'doctor';
  const isActive = profile?.is_active !== false;

  const value = {
    session,
    user,
    profile,
    hospital,
    loading,
    role,
    isAdmin,
    isReceptionist,
    isDoctor,
    isActive,
    isSupabaseConfigured,
    signIn,
    signOut,
    resetPassword,
    refreshHospital,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
