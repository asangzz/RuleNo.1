"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { DEFAULT_MOS_PERCENTAGE } from "@/lib/rule-one";

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [settings, setSettings] = useState({
    currency: "USD",
    targetMOS: DEFAULT_MOS_PERCENTAGE,
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
            currency: data.currency || "USD",
            targetMOS: data.targetMOS || DEFAULT_MOS_PERCENTAGE,
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
    setMessage(null);
    try {
      await setDoc(doc(db, "users", user.uid, "settings", "profile"), {
        ...settings,
        updatedAt: new Date().toISOString(),
      });
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: 'error', text: 'Failed to save settings.' });
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

      <form onSubmit={handleSave} className="space-y-6">
        <section className="p-6 bg-card border border-border rounded-2xl space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Investment Preferences</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Preferred Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full bg-background border border-border rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-accent appearance-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Target Margin of Safety (%)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="20"
                    max="80"
                    step="5"
                    value={settings.targetMOS}
                    onChange={(e) => setSettings({ ...settings, targetMOS: parseInt(e.target.value) })}
                    className="flex-1 accent-accent"
                  />
                  <span className="text-lg font-bold w-12">{settings.targetMOS}%</span>
                </div>
                <p className="text-[10px] text-muted-foreground italic">Rule No. 1 default is 50%.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            {message && (
              <p className={cn(
                "text-sm font-medium",
                message.type === 'success' ? "text-green-500" : "text-red-500"
              )}>
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
        </section>
      </form>

      <section className="p-6 bg-accent/5 border border-accent/20 rounded-2xl">
        <h3 className="text-sm font-bold text-accent uppercase tracking-widest mb-2">Note</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your target Margin of Safety affects how &ldquo;On Sale&rdquo; prices are calculated across the dashboard and watchlist.
          Phil Town recommends a 50% MOS for maximum safety.
        </p>
      </section>
    </div>
  );
}
