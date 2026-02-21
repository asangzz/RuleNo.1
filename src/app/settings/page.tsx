"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { DEFAULT_MOS_PERCENTAGE } from "@/lib/rule-one";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({
    currency: "USD",
    targetMOS: DEFAULT_MOS_PERCENTAGE,
  });

  useEffect(() => {
    async function fetchSettings() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid, "settings", "profile");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({
            currency: data.currency || "USD",
            targetMOS: data.targetMOS || DEFAULT_MOS_PERCENTAGE,
          });
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
    setSuccess(false);
    try {
      await setDoc(doc(db, "users", user.uid, "settings", "profile"), {
        ...settings,
        updatedAt: new Date().toISOString(),
      });
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
        <p className="text-muted-foreground">Manage your investment preferences.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="p-6 bg-card border border-border rounded-2xl space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">
                Preferred Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full bg-background border border-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">
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
                <span className="text-xl font-bold w-12 text-right">{settings.targetMOS}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Phil Town recommends 50% for a true Margin of Safety.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-accent text-accent-foreground rounded-xl font-bold uppercase tracking-widest text-xs hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {success && (
            <p className="text-sm text-green-500 animate-in fade-in slide-in-from-left-2">
              Settings saved successfully!
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
