"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";

interface UserSettings {
  preferredCurrency: string;
  targetMOS: number;
}

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
      await setDoc(doc(db, "users", user.uid, "settings", "profile"), settings);
      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch {
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
        <p className="text-muted-foreground">Customize your investment preferences.</p>
      </header>

      {message && (
        <div className={cn(
          "p-4 rounded-xl text-sm font-medium",
          message.type === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"
        )}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <section className="p-6 bg-card border border-border rounded-2xl space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Preferred Currency</label>
              <select
                value={settings.preferredCurrency}
                onChange={(e) => setSettings({ ...settings, preferredCurrency: e.target.value })}
                className="w-full mt-2 bg-background border border-border rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Target Margin of Safety (%)</label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={settings.targetMOS}
                  onChange={(e) => setSettings({ ...settings, targetMOS: parseInt(e.target.value) })}
                  className="flex-1 accent-accent"
                />
                <span className="text-xl font-bold w-12 text-center">{settings.targetMOS}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 italic">
                Rule No. 1 traditionally recommends a 50% Margin of Safety.
              </p>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-accent/10"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </form>
    </div>
  );
}
