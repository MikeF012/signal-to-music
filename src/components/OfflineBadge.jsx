import React from "react";

export default function OfflineBadge({ online, supabaseEnabled }) {
  if (online && supabaseEnabled) return null;
  return (
    <div
      className="offline-badge"
      title={
        !online
          ? "You are offline. Cloud features are paused; everything else still works."
          : "Cloud is not configured. Local features still work."
      }
    >
      <span className="offline-dot" />
      {online ? "cloud off" : "offline"}
    </div>
  );
}
