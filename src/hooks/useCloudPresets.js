import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function rowToPreset(row) {
  return {
    id:        row.id,
    name:      row.name,
    isBuiltIn: false,
    isCloud:   true,
    data:      row.data,
  };
}

export function useCloudPresets(user) {
  const [cloudPresets, setCloudPresets] = useState([]);
  const [syncing, setSyncing]           = useState(false);
  const [syncError, setSyncError]       = useState("");

  const fetchPresets = useCallback(async () => {
    if (!user || !supabase) return;
    setSyncing(true);
    setSyncError("");
    try {
      const { data, error } = await supabase
        .from("presets")
        .select("id, name, data, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCloudPresets((data ?? []).map(rowToPreset));
    } catch (err) {
      setSyncError(err.message ?? "Failed to load cloud presets.");
    } finally {
      setSyncing(false);
    }
  }, [user]);

  // Fetch whenever the logged-in user changes
  useEffect(() => {
    if (user) {
      fetchPresets();
    } else {
      setCloudPresets([]);
      setSyncError("");
    }
  }, [user, fetchPresets]);

  async function saveCloudPreset(name, presetData) {
    if (!user || !supabase) throw new Error("Not logged in.");
    const { data, error } = await supabase
      .from("presets")
      .insert({ name, data: presetData, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    setCloudPresets((prev) => [rowToPreset(data), ...prev]);
    return data;
  }

  async function deleteCloudPreset(presetId) {
    if (!user || !supabase) return;
    const { error } = await supabase
      .from("presets")
      .delete()
      .eq("id", presetId);
    if (error) throw error;
    setCloudPresets((prev) => prev.filter((p) => p.id !== presetId));
  }

  // Upload all local (non-built-in) presets to the cloud in one batch
  async function migrateLocalPresets(localPresets) {
    if (!user || !supabase) return;
    const toUpload = localPresets.filter((p) => !p.isBuiltIn && !p.isCloud);
    if (toUpload.length === 0) return;

    const rows = toUpload.map((p) => ({
      name:    p.name,
      data:    p.data,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from("presets")
      .insert(rows)
      .select();

    if (error) throw error;
    setCloudPresets((prev) => [
      ...(data ?? []).map(rowToPreset),
      ...prev,
    ]);
  }

  return {
    cloudPresets,
    syncing,
    syncError,
    saveCloudPreset,
    deleteCloudPreset,
    migrateLocalPresets,
    refetch: fetchPresets,
  };
}
