"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { CURRENCY_SYMBOLS } from "@/lib/utils";
import { DEFAULT_MOS_PERCENTAGE } from "@/lib/rule-one";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserSettings } from "@/lib/types";

function SettingsContent() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    currency: "USD",
    targetMOS: DEFAULT_MOS_PERCENTAGE,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid, "settings", "profile");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as UserSettings);
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
      const docRef = doc(db, "users", user.uid, "settings", "profile");
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Failed to save settings. Please try again." });
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

      <form onSubmit={handleSave} className="space-y-6">
        <section className="p-6 bg-card border border-border rounded-2xl space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Preferred Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full mt-2 bg-background border border-border rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-accent transition-all appearance-none"
              >
                {Object.keys(CURRENCY_SYMBOLS).map((code) => (
                  <option key={code} value={code}>
                    {code} ({CURRENCY_SYMBOLS[code]})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Target Margin of Safety (%)</label>
              <div className="mt-2 flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.targetMOS}
                  onChange={(e) => setSettings({ ...settings, targetMOS: parseInt(e.target.value) })}
                  className="flex-1 accent-accent"
                />
                <span className="w-12 text-center font-bold text-accent">{settings.targetMOS}%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Rule No. 1 recommendation is 50%. A higher MOS is safer but may result in fewer buy opportunities.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between">
          {message && (
            <p className={`text-sm font-medium ${message.type === "success" ? "text-green-500" : "text-red-500"}`}>
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="ml-auto px-6 py-2 bg-accent text-accent-foreground rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
