"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { DEFAULT_MOS_PERCENTAGE } from "@/lib/rule-one";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

interface UserSettings {
  currency: string;
  mosPercentage: number;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<UserSettings>({
    currency: "USD",
    mosPercentage: DEFAULT_MOS_PERCENTAGE,
  });

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
    setMessage("");
    try {
      await setDoc(doc(db, "users", user.uid, "settings", "profile"), settings);
      setMessage("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage("Failed to save settings.");
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
        <p className="text-muted-foreground">Manage your account preferences.</p>
      </header>

      <section className="p-8 bg-card border border-border rounded-2xl space-y-6 shadow-sm">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Preferred Currency</label>
              <div className="relative mt-2">
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full bg-background border border-border rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-accent appearance-none cursor-pointer"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted-foreground">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Target Margin of Safety (%)</label>
              <input
                type="number"
                min="1"
                max="99"
                value={settings.mosPercentage}
                onChange={(e) => setSettings({ ...settings, mosPercentage: parseInt(e.target.value) || DEFAULT_MOS_PERCENTAGE })}
                className="w-full mt-2 bg-background border border-border rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <p className="text-xs text-muted-foreground mt-2">Rule No. 1 recommends {DEFAULT_MOS_PERCENTAGE}% for conservative investing.</p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {message && (
              <p className={cn("text-sm font-medium", message.includes("success") ? "text-green-500" : "text-red-500")}>
                {message}
              </p>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
