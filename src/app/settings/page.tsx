"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { CURRENCY_SYMBOLS } from "@/lib/utils";
import { DEFAULT_MOS_PERCENTAGE } from "@/lib/rule-one";

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [settings, setSettings] = useState({
    preferredCurrency: "USD",
    targetMOS: DEFAULT_MOS_PERCENTAGE,
  });

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid, "settings", "profile");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as typeof settings);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(db, "users", user.uid, "settings", "profile"), settings);
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
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Customize your investment preferences.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6 bg-card border border-border rounded-2xl p-8">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Preferred Currency</label>
            <select
              value={settings.preferredCurrency}
              onChange={(e) => setSettings({ ...settings, preferredCurrency: e.target.value })}
              className="w-full mt-2 bg-background border border-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-accent appearance-none cursor-pointer"
            >
              {Object.keys(CURRENCY_SYMBOLS).map((code) => (
                <option key={code} value={code}>
                  {code} ({CURRENCY_SYMBOLS[code]})
                </option>
              ))}
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
              <span className="w-12 text-center font-bold text-accent">{settings.targetMOS}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Rule No. 1 traditionally recommends 50%, but you can adjust this based on your risk tolerance.
            </p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg text-sm font-medium ${
            message.type === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
          }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
