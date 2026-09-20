"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type AdminShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBack?: boolean;
};

const navigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "⌂",
  },
  {
    label: "Requests",
    href: "/requests",
    icon: "▣",
  },
  {
    label: "Customers",
    href: "/customers",
    icon: "♙",
  },
  {
    label: "Agents",
    href: "/agents",
    icon: "◉",
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    icon: "◷",
  },
  {
    label: "Services",
    href: "/services",
    icon: "⚙",
  },
];

export default function AdminShell({
  children,
  title,
  subtitle,
  showBack = false,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(href);
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">Q</div>

          <div>
            <h1>QuickServe</h1>
            <span>Admin Portal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section-title">MAIN</p>

          {navigation.slice(0, 2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          <p className="sidebar-section-title">MANAGEMENT</p>

          {navigation.slice(2, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          <p className="sidebar-section-title">SYSTEM</p>

          {navigation.slice(4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-profile">
            <div className="admin-avatar">A</div>

            <div className="admin-profile-info">
              <strong>Administrator</strong>
              <span>System Admin</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            <span>↪</span>
            Logout
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div className="header-title">
            {showBack && (
              <button
                type="button"
                className="back-button"
                onClick={() => router.back()}
              >
                ←
              </button>
            )}

            <div>
              <h2>{title}</h2>

              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>

          <div className="header-right">
            <div className="admin-status">
              <span className="status-dot" />
              <span>Admin</span>
            </div>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
