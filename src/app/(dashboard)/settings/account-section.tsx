"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, Loader2, Download, Trash2 } from "lucide-react";

export default function AccountSection() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  async function handleExport() {
    setExporting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all user data
      const [profileRes, postsRes, draftsRes, bbRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("linkedin_posts").select("*").eq("user_id", user.id),
        supabase.from("drafts").select("*").eq("user_id", user.id),
        supabase
          .from("brand_brain_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single(),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        linkedin_posts: postsRes.data,
        drafts: draftsRes.data,
        brand_brain: bbRes.data,
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contentbrain-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Delete all user data (RLS will scope the deletions)
      await Promise.all([
        supabase.from("linkedin_posts").delete().eq("user_id", user.id),
        supabase.from("drafts").delete().eq("user_id", user.id),
        supabase.from("brand_brain_profiles").delete().eq("user_id", user.id),
      ]);

      // Note: Full account deletion requires a server-side admin API call
      // or a Supabase Edge Function. For now, we clear data and sign out.
      await supabase.auth.signOut();
      router.push("/auth?toast=account_deleted");
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
          <Shield className="h-5 w-5" />
        </div>
        <h3 className="font-semibold text-slate-900">Account</h3>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export My Data
        </button>
        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            confirmDelete
              ? "border-red-400 bg-red-500 text-white hover:bg-red-600"
              : "border-red-200 text-red-600 hover:bg-red-50"
          }`}
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {confirmDelete ? "Confirm Delete" : "Delete Account"}
        </button>
        {confirmDelete && !deleting && (
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        )}
      </div>
      {confirmDelete && (
        <p className="mt-2 text-xs text-red-500">
          This will permanently delete all your data. This action cannot be
          undone.
        </p>
      )}
    </div>
  );
}
