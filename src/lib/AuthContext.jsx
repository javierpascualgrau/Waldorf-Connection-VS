import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // 1. Comprobar si ya hay una sesión activa al abrir la web
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);
    };

    checkSession();

    // 2. Escuchar cambios en el estado (Login, Logout, cambio de contraseña...)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // Valores que cualquier parte de la app podrá usar
  const value = {
    user,
    isAuthenticated: !!user,
    isLoadingAuth,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoadingAuth && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};