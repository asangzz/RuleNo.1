"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { CURRENCY_SYMBOLS } from "@/lib/utils";
import { UserSettings } from "@/lib/types";

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    preferredCurrency: "USD",
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
        <p className="text-muted-foreground">Personalize your Rule No. 1 investment preferences.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 bg-card border border-border rounded-2xl space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
              Financial Preferences
            </h3>

            <div className="grid gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">
                  Preferred Currency
                </label>
                <select
                  value={settings.preferredCurrency}
                  onChange={(e) => setSettings({ ...settings, preferredCurrency: e.target.value })}
                  className="bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent appearance-none cursor-pointer"
                >
                  {Object.keys(CURRENCY_SYMBOLS).map((code) => (
                    <option key={code} value={code}>
                      {code} ({CURRENCY_SYMBOLS[code]})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">
                  Target Margin of Safety (%)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={settings.targetMOS}
                    onChange={(e) => setSettings({ ...settings, targetMOS: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <span className="w-12 text-center font-bold text-accent">{settings.targetMOS}%</span>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Rule No. 1 standard is 50%, but you can adjust your risk tolerance here.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex flex-col gap-4">
            {message && (
              <div className={`p-3 rounded-md text-sm font-medium ${
                message.type === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              }`}>
                {message.text}
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-accent text-accent-foreground rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
