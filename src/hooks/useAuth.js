import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { canSignUp, recordSignupAttempt, timeUntilNextSignup } from "../utils/rateLimit";

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => subscription.unsubscribe();
  }, []);

  async function login(email, password) {
    if (!supabase) throw new Error("Cloud is not configured.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signup(email, password) {
    if (!supabase) throw new Error("Cloud is not configured.");
    if (!canSignUp()) {
      const ms     = timeUntilNextSignup();
      const minutes = Math.ceil(ms / 60_000);
      throw new Error(`Too many signup attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
    }
    recordSignupAttempt();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  async function resetPassword(email) {
    if (!supabase) throw new Error("Cloud is not configured.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  }

  async function updatePassword(newPassword) {
    if (!supabase) throw new Error("Cloud is not configured.");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function updateProfile({ displayName }) {
    if (!supabase) throw new Error("Cloud is not configured.");
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    });
    if (error) throw error;
  }

  async function deleteAccount() {
    // Supabase does not allow self-delete from the client SDK without a
    // server function. Best-effort: sign out and tell the user.
    await logout();
    throw new Error("Self-delete must be handled by a server function. Please contact support.");
  }

  return {
    user, loading,
    login, signup, logout,
    resetPassword, updatePassword, updateProfile, deleteAccount,
  };
}
