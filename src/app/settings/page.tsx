"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { CURRENCY_SYMBOLS } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [settings, setSettings] = useState({
    preferredCurrency: "USD",
    targetMOS: 50,
  });

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid, "settings", "profile");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({
            preferredCurrency: data.preferredCurrency || "USD",
            targetMOS: data.targetMOS || 50,
          });
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
    setSuccess(false);
    try {
      await setDoc(doc(db, "users", user.uid, "settings", "profile"), settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
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
        <p className="text-muted-foreground">Manage your preferences and investment goals.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="p-6 bg-card border border-border rounded-2xl space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Preferred Currency</label>
              <select
                value={settings.preferredCurrency}
                onChange={(e) => setSettings({ ...settings, preferredCurrency: e.target.value })}
                className="w-full mt-2 bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent appearance-none"
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
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min="10"
                  max="70"
                  step="5"
                  value={settings.targetMOS}
                  onChange={(e) => setSettings({ ...settings, targetMOS: parseInt(e.target.value) })}
                  className="flex-1 accent-accent"
                />
                <span className="font-bold text-xl min-w-[3rem] text-right">{settings.targetMOS}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Phil Town recommends 50%, but you can adjust your risk tolerance.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-accent text-accent-foreground rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {success && (
            <span className="text-green-500 font-medium text-sm animate-in fade-in">
              Settings saved successfully!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
