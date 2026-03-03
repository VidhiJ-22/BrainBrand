"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";
import {
  LayoutDashboard,
  Brain,
  PenSquare,
  Calendar,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/brand-brain", label: "Brand Brain", icon: Brain },
  { href: "/create-post", label: "Create Post", icon: PenSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  profile: Profile | null;
}

export default function Sidebar({ profile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
  }

  return (
    <aside
      className={`sidebar-transition fixed left-0 top-0 z-40 flex h-screen flex-col bg-slate-900 text-white ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-700/50 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight">
            ContentBrain
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Sign Out */}
      <div className="border-t border-slate-700/50 p-3">
        {profile && (
          <div
            className={`mb-2 flex items-center gap-3 rounded-lg px-3 py-2 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {profile.avatar_url || profile.linkedin_profile_picture ? (
              <Image
                src={profile.avatar_url || profile.linkedin_profile_picture!}
                alt={profile.full_name || "User"}
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">
                {(profile.full_name || profile.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {profile.full_name || "User"}
                </p>
                {profile.linkedin_connected && (
                  <p className="truncate text-xs text-emerald-400">
                    LinkedIn connected
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white ${
              collapsed ? "w-full justify-center" : "flex-1"
            }`}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
