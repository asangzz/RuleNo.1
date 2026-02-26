"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { UserSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CNY"];

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    currency: "USD",
    targetMOS: 50,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid, "settings", "profile");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as UserSettings);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);

    try {
      const docRef = doc(db, "users", user.uid, "settings", "profile");
      await setDoc(docRef, settings);
      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings</h2>
        <p className="text-muted-foreground">Customize your Rule No. 1 experience.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6 p-8 bg-card border border-border rounded-2xl">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Preferred Currency</label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className="w-full mt-2 bg-background border border-border rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-accent appearance-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Target Margin of Safety (%)</label>
            <div className="mt-2 flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={settings.targetMOS}
                onChange={(e) => setSettings({ ...settings, targetMOS: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-background border border-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <span className="text-xl font-bold w-12 text-center">{settings.targetMOS}%</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Rule No. 1 recommends a 50% Margin of Safety. Higher means more conservative.
            </p>
          </div>
        </div>

        {message && (
          <div className={cn(
            "p-4 rounded-lg text-sm font-medium",
            message.type === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
          )}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </form>
    </div>
  );
}
