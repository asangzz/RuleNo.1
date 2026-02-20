"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
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
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
      setMessage({ type: 'success', text: "Settings saved successfully!" });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: 'error', text: "Failed to save settings." });
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
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your preferences and investment goals.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 bg-card border border-border rounded-2xl space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">General Preferences</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Currency</label>
              <select
                value={settings.preferredCurrency}
                onChange={(e) => setSettings({ ...settings, preferredCurrency: e.target.value })}
                className="w-full bg-background border border-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-border">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Investment Strategy</h3>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Target Margin of Safety (%)</label>
                <span className="text-sm font-bold text-accent">{settings.targetMOS}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="75"
                step="5"
                value={settings.targetMOS}
                onChange={(e) => setSettings({ ...settings, targetMOS: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <p className="text-[10px] text-muted-foreground italic">Rule No. 1 recommends a 50% Margin of Safety.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          {message && (
            <p className={cn(
              "text-sm font-medium text-center",
              message.type === 'success' ? "text-green-500" : "text-red-500"
            )}>
              {message.text}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
