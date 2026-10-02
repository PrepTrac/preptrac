"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import NotificationsBell from "./NotificationsBell";
import BrandMark from "./BrandMark";
import { Home, Package, Calendar, Activity, Settings, Menu, X, MapPin, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useDialogDismiss } from "~/hooks/useDialogDismiss";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/household", label: "Household", icon: Users },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileNavRef = useDialogDismiss(mobileMenuOpen, () => setMobileMenuOpen(false));
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  const links = (collapsed: boolean) => <nav aria-label="Main navigation" className="space-y-1 py-6">
    {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined} aria-current={pathname === href ? "page" : undefined} className={`sidebar-link ${collapsed ? "justify-center px-2" : ""}`}>
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />{!collapsed && <span className="font-medium">{label}</span>}
    </Link>)}
  </nav>;
  const brand = (collapsed = false) => <Link href="/dashboard" aria-label={collapsed ? "PrepTrac dashboard" : undefined} className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}><BrandMark className="h-9 w-9 text-[#bfd391]" />{!collapsed && <span className="text-xl font-semibold tracking-tight">PrepTrac</span>}</Link>;
  const controls = (collapsed = false, mobile = false) => <div className={`flex items-center gap-3 ${collapsed ? "flex-col" : "justify-between"}`}>
    {!collapsed && <span className="index-label">SUPPLY CONTROL</span>}
    <div className={`flex gap-1 ${collapsed ? "flex-col" : ""}`}><NotificationsBell align={mobile ? "right" : "left"} onMobile={mobile} onSidebar /><ThemeToggle onSidebar /></div>
  </div>;

  return <>
    <div className="sidebar md:hidden flex items-center justify-between p-4 border-b border-line shrink-0">
      {brand()}
      <button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={mobileMenuOpen} aria-controls="mobile-nav" className="sidebar-control p-2"><Menu className="h-6 w-6" /></button>
    </div>
    {mobileMenuOpen && <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
      <div id="mobile-nav" ref={mobileNavRef} role="dialog" aria-modal="true" aria-label="Navigation" tabIndex={-1} className="sidebar fixed inset-y-0 left-0 w-72 max-w-[calc(100vw-2rem)] flex flex-col shadow-xl outline-none">
        <div className="flex items-center justify-between p-4 border-b border-line">{brand()}<button onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation menu" className="sidebar-control p-2"><X className="h-5 w-5" /></button></div>
        <div className="flex-1 overflow-y-auto">{links(false)}</div>
        <div className="p-4 border-t border-line">{controls(false, true)}</div>
      </div>
    </div>}
    <aside className={`sidebar hidden md:flex flex-col shrink-0 transition-[width] duration-200 ${isCollapsed ? "w-20" : "w-60"}`}>
      <div className="px-5 py-6 border-b border-line">{brand(isCollapsed)}</div>
      <div className="flex-1 overflow-y-auto">{links(isCollapsed)}</div>
      <div className="shrink-0 border-t border-line p-4 space-y-4">
        {controls(isCollapsed)}
        <button onClick={() => setIsCollapsed(v => !v)} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!isCollapsed} className="sidebar-control flex items-center gap-2 p-2 w-full justify-center">
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span className="text-xs">Collapse sidebar</span></>}
        </button>
      </div>
    </aside>
  </>;
}
