/**
 * AIS Settings Section — fully reactive settings for AIS
 *
 * Uses AdaptiveMemoryEngine as single source of truth.
 * Dispatches "ais-settings-changed" event on every change
 * so AISSystemEventProvider picks it up immediately (same tab).
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/components/ui/Toast";
import { getAISMemory, type AISAnimationIntensity, type AISDismissSpeed, type AISActivityLevel } from "@/lib/ais/memory";
import { getSoundIdentity } from "@/lib/ais/sound";
import { Badge } from "@/components/ui/Badge";
import { Sparkles } from "lucide-react";

/* ─── Toggle Switch ──────────────────────────────────────────── */

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        value ? "bg-violet-600" : "bg-surface-2 border border-border"
      }`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200 ${
          value ? "translate-x-5 bg-white" : "translate-x-0 bg-muted-foreground/50"
        }`}
      />
    </button>
  );
}

/* ─── Segmented Control ──────────────────────────────────────── */

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labelFn,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labelFn: (v: T) => string;
}) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            opt === value ? "bg-violet-600 text-white" : "text-muted-2 hover:text-foreground"
          }`}
        >
          {labelFn(opt)}
        </button>
      ))}
    </div>
  );
}

/* ─── Main Section ───────────────────────────────────────────── */

export function AISettingsSection() {
  const { t } = useI18n();
  const { addToast } = useToast();

  // Read settings from engine
  const [autoAssistant, setAutoAssistant] = useState(true);
  const [typingEnabled, setTypingEnabled] = useState(true);
  const [animationIntensity, setAnimationIntensity] = useState<AISAnimationIntensity>("full");
  const [dismissSpeed, setDismissSpeed] = useState<AISDismissSpeed>("normal");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activityLevel, setActivityLevel] = useState<AISActivityLevel>("normal");

  // Load from engine on mount
  useEffect(() => {
    const mem = getAISMemory().getMemory();
    setAutoAssistant(mem.preferences.autoAssistant);
    setTypingEnabled(mem.aisSettings.typingEnabled);
    setAnimationIntensity(mem.aisSettings.animationIntensity);
    setDismissSpeed(mem.aisSettings.dismissSpeed);
    setSoundEnabled(mem.soundEnabled);
    setActivityLevel(mem.aisSettings.activityLevel);
  }, []);

  // Helper: notify other components about settings change
  const notifyChange = useCallback(() => {
    window.dispatchEvent(new CustomEvent("ais-settings-changed"));
  }, []);

  const handleToggleAutoAssistant = useCallback(() => {
    const engine = getAISMemory();
    const newVal = !engine.getMemory().preferences.autoAssistant;
    engine.setPreference("autoAssistant", newVal);
    setAutoAssistant(newVal);
    notifyChange();
    addToast({ type: "success", title: t("settings.saved") });
  }, [notifyChange, addToast, t]);

  const handleToggleTyping = useCallback(() => {
    const engine = getAISMemory();
    const newVal = !engine.getMemory().aisSettings.typingEnabled;
    engine.setAISetting("typingEnabled", newVal);
    setTypingEnabled(newVal);
    notifyChange();
    addToast({ type: "success", title: t("settings.saved") });
  }, [notifyChange, addToast, t]);

  const handleAnimationIntensity = useCallback((level: AISAnimationIntensity) => {
    getAISMemory().setAISetting("animationIntensity", level);
    setAnimationIntensity(level);
    notifyChange();
    addToast({ type: "success", title: t("settings.saved") });
  }, [notifyChange, addToast, t]);

  const handleDismissSpeed = useCallback((speed: AISDismissSpeed) => {
    getAISMemory().setAISetting("dismissSpeed", speed);
    setDismissSpeed(speed);
    notifyChange();
    addToast({ type: "success", title: t("settings.saved") });
  }, [notifyChange, addToast, t]);

  const handleToggleSound = useCallback(() => {
    const engine = getAISMemory();
    const newVal = !engine.getMemory().soundEnabled;
    engine.toggleSound(newVal);
    getSoundIdentity().setEnabled(newVal);
    setSoundEnabled(newVal);
    notifyChange();
    // Unlock AudioContext + play a test sound when enabling
    if (newVal) {
      getSoundIdentity().unlock().then(() => {
        getSoundIdentity().play("notification");
      });
    }
    addToast({ type: "success", title: t("settings.saved") });
  }, [notifyChange, addToast, t]);

  const handleActivityLevel = useCallback((level: AISActivityLevel) => {
    getAISMemory().setAISetting("activityLevel", level);
    setActivityLevel(level);
    notifyChange();
    addToast({ type: "success", title: t("settings.saved") });
  }, [notifyChange, addToast, t]);

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <Sparkles className="w-5 h-5 text-purple" />
        <h2 className="text-base font-semibold text-foreground">{t("ais.settings.title")}</h2>
        <Badge variant="info">AIS</Badge>
      </div>
      <div className="space-y-5">
        {/* Auto Assistant */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-foreground">{t("ais.settings.autoAssistant")}</div>
            <div className="text-xs text-muted-2">{t("ais.settings.autoAssistant.desc")}</div>
          </div>
          <Toggle value={autoAssistant} onChange={handleToggleAutoAssistant} />
        </div>

        {/* Typing Effect */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-foreground">{t("ais.settings.typingEffect")}</div>
            <div className="text-xs text-muted-2">{t("ais.settings.typingEffect.desc")}</div>
          </div>
          <Toggle value={typingEnabled} onChange={handleToggleTyping} />
        </div>

        {/* Animation Intensity */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-foreground">{t("ais.settings.animationIntensity")}</div>
          </div>
          <SegmentedControl
            options={["full", "reduced", "minimal"] as const}
            value={animationIntensity}
            onChange={handleAnimationIntensity}
            labelFn={(l) => t(`ais.settings.animationIntensity.${l}`)}
          />
        </div>

        {/* Dismiss Speed */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-foreground">{t("ais.settings.dismissSpeed")}</div>
          </div>
          <SegmentedControl
            options={["fast", "normal", "slow"] as const}
            value={dismissSpeed}
            onChange={handleDismissSpeed}
            labelFn={(s) => t(`ais.settings.dismissSpeed.${s}`)}
          />
        </div>

        {/* Sounds */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-foreground">{t("ais.settings.sound")}</div>
            <div className="text-xs text-muted-2">{t("ais.settings.sound.desc")}</div>
          </div>
          <div className="flex items-center gap-2">
            {soundEnabled && (
              <button
                onClick={() => getSoundIdentity().unlock().then(() => getSoundIdentity().play("notification"))}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors px-2 py-1 rounded border border-violet-500/30 hover:border-violet-500/50"
              >
                ▶ Test
              </button>
            )}
            <Toggle value={soundEnabled} onChange={handleToggleSound} />
          </div>
        </div>

        {/* Activity Level */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-foreground">{t("ais.settings.activityLevel")}</div>
          </div>
          <SegmentedControl
            options={["proactive", "normal", "minimal"] as const}
            value={activityLevel}
            onChange={handleActivityLevel}
            labelFn={(l) => t(`ais.settings.activityLevel.${l}`)}
          />
        </div>
      </div>
    </>
  );
}
