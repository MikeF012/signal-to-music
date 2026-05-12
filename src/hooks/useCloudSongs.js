import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Free-tier limits — Premium users have neither.
export const FREE_MAX_SONGS         = 5;
export const FREE_MAX_DURATION_SEC  = 20 * 60;  // 20 minutes total

function rowToSong(row) {
  return {
    id:        row.id,
    name:      row.name,
    data:      row.data,
    duration:  row.duration ?? 0,
    sizeBytes: row.size_bytes ?? 0,
    decade:    row.decade ?? "2010s",
    createdAt: row.created_at,
    isCloud:   true,
  };
}

export function useCloudSongs(user, isPremium = false) {
  const [songs,     setSongs]     = useState([]);
  const [syncing,   setSyncing]   = useState(false);
  const [syncError, setSyncError] = useState("");

  const fetchAll = useCallback(async () => {
    if (!user || !supabase) { setSongs([]); return; }
    setSyncing(true);
    setSyncError("");
    try {
      const { data, error } = await supabase
        .from("songs")
        .select("id, name, data, duration, size_bytes, decade, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSongs((data ?? []).map(rowToSong));
    } catch (err) {
      setSyncError(err.message ?? "Failed to load cloud songs.");
    } finally {
      setSyncing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchAll();
    else { setSongs([]); setSyncError(""); }
  }, [user, fetchAll]);

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration ?? 0), 0);

  function checkLimits(addDuration) {
    if (isPremium) return { ok: true };
    if (songs.length >= FREE_MAX_SONGS) {
      return { ok: false, reason: `Free plan limit reached (${FREE_MAX_SONGS} cloud saves). Upgrade for unlimited.` };
    }
    if (totalDuration + addDuration > FREE_MAX_DURATION_SEC) {
      return { ok: false, reason: `Free plan limit reached (${Math.round(FREE_MAX_DURATION_SEC / 60)} min total). Upgrade for unlimited.` };
    }
    return { ok: true };
  }

  async function saveSong({ name, data, duration, decade, sizeBytes }) {
    if (!user || !supabase) throw new Error("You must be signed in to save to the cloud.");
    const limit = checkLimits(duration ?? 0);
    if (!limit.ok) throw new Error(limit.reason);

    const { data: row, error } = await supabase
      .from("songs")
      .insert({
        user_id:    user.id,
        name,
        data,
        duration:   duration ?? 0,
        size_bytes: sizeBytes ?? 0,
        decade:     decade ?? "2010s",
      })
      .select()
      .single();
    if (error) throw error;
    setSongs((prev) => [rowToSong(row), ...prev]);
    return row;
  }

  async function deleteSong(id) {
    if (!user || !supabase) return;
    const { error } = await supabase.from("songs").delete().eq("id", id);
    if (error) throw error;
    setSongs((prev) => prev.filter((s) => s.id !== id));
  }

  return {
    songs,
    syncing,
    syncError,
    totalDuration,
    saveSong,
    deleteSong,
    checkLimits,
    refetch: fetchAll,
  };
}
