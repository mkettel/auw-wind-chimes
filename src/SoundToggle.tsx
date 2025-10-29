import React from "react";
import "./SoundToggle.css";

interface SoundToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export const SoundToggle: React.FC<SoundToggleProps> = ({
  enabled,
  onToggle,
}) => {
  return (
    <button
      onClick={onToggle}
      className={`sound-toggle ${enabled ? "enabled" : "disabled"}`}
      title={enabled ? "Mute sound" : "Enable sound"}
      aria-label={enabled ? "Mute sound" : "Enable sound"}
    >
      sound
    </button>
  );
};
