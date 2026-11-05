"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  ArrowLeftRight,
  PanelLeftClose,
  PanelLeftOpen,
  Database,
  ArrowUpRight,
  ChevronDown,
  Layers,
  Command,
  ShieldCheck,
  ChartNoAxesCombined,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/trades", label: "Trade Explorer", icon: ArrowLeftRight },
  { href: "/analytics", label: "Market Explorer", icon: ChartNoAxesCombined },
  { href: "/reports", label: "Reports", icon: FileText },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    [collapsed, setCollapsed] = useState(false);
  return (
    <div className={cn("app-shell", collapsed && "collapsed")}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link
          href="/dashboard"
          className="brand"
          aria-label="UZEX Insight AI home"
        >
          <span className="brand-mark">
            <Layers size={25} />
          </span>
          <span className="brand-copy">
            UZEX{" "}
            <span className="brand-insight">
              Insight<span className="ai-label">AI</span>
            </span>
          </span>
        </Link>
        <div className="workspace">
          <span className="workspace-icon">U</span>
          <div>
            <strong>Market intelligence</strong>
            <small>UZEX workspace</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              title={n.label}
              aria-current={path === n.href ? "page" : undefined}
              aria-label={n.label}
              className={cn("nav-link", path === n.href && "active")}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.href === "/assistant" && (
                <small className="new-label">AI</small>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="research-note">
            <ShieldCheck size={20} />
            <strong>Built on evidence.</strong>
            <p>
              Every number has a source.
              <br />
              Every insight has context.
            </p>
            <Link href="/assistant">
              Explore with AI <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="source-mini">
            <Database size={16} />
            <div>
              <strong>Transparent data sources</strong>
              <small>Verify mode on each page</small>
            </div>
          </div>
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
            <span>Collapse sidebar</span>
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{nav.find((n) => n.href === path)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="terminal-label">
              <span className="status-dot" />
              Intelligence workspace
            </span>
            <span className="top-divider" />
            <div className="avatar">UZ</div>
            <span className="profile-name">
              Analyst
              <ChevronDown size={13} />
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer>
          <span>
            UZEX Insight AI <span className="footer-dot">·</span> Commodity
            intelligence, made clear.
          </span>
          <span>
            <Command size={12} /> UZEX AI Hackathon 2026
          </span>
        </footer>
      </div>
    </div>
  );
}
