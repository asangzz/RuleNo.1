"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [settings, setSettings] = useState({
    currency: "USD",
    targetMOS: 50,
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
            targetMOS: data.targetMOS || 50,
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

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(db, "users", user.uid, "settings", "profile"), {
        ...settings,
        updatedAt: new Date().toISOString()
      });
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
        <p className="text-muted-foreground">Manage your personal investment preferences.</p>
      </header>

      {message && (
        <div className={cn(
          "p-4 rounded-xl border text-sm font-medium animate-in fade-in slide-in-from-top-2",
          message.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
        )}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <section className="p-6 bg-card border border-border rounded-2xl space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Preferred Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full mt-2 bg-background border border-border rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-accent transition-all appearance-none"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Target Margin of Safety (%)</label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={settings.targetMOS}
                  onChange={(e) => setSettings({ ...settings, targetMOS: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <span className="w-12 text-center font-bold text-accent">{settings.targetMOS}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                Phil Town recommends 50% for most businesses.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save Settings"}
            </button>
          </div>
        </section>

        <section className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-4">Account Information</h3>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="text-muted-foreground">Email:</span> <span className="font-medium">{user?.email}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">User ID:</span> <span className="font-mono text-xs opacity-50">{user?.uid}</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
