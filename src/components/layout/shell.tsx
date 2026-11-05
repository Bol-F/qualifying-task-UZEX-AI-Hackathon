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
  Layers,
  ShieldCheck,
  ChartNoAxesCombined,
  FileText,
  Sun,
  Moon,
  Globe2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreferences } from "./preferences-provider";
import { parseUiLanguage } from "@/lib/i18n/preferences";
const nav = [
  {
    href: "/dashboard",
    label: "Overview",
    mobile: "Home",
    icon: LayoutDashboard,
  },
  {
    href: "/assistant",
    label: "AI Assistant",
    mobile: "Ask AI",
    icon: Sparkles,
  },
  {
    href: "/trades",
    label: "Transactions",
    mobile: "Trades",
    icon: ArrowLeftRight,
  },
  {
    href: "/analytics",
    label: "Analytics",
    mobile: "Analytics",
    icon: ChartNoAxesCombined,
  },
  { href: "/reports", label: "Reports", mobile: "Reports", icon: FileText },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme, language, setLanguage, t } = usePreferences();
  const active = nav.find((item) => item.href === path);
  return (
    <div className={cn("app-shell", collapsed && "collapsed")}>
      <a className="skip-link" href="#main-content">
        {t("Skip to content")}
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
            UZEX
            <span className="brand-insight">
              Insight<span className="ai-label">AI</span>
            </span>
          </span>
        </Link>
        <div className="workspace">
          <span className="workspace-icon">
            <Database size={16} />
          </span>
          <div>
            <strong>{t("Market intelligence")}</strong>
            <small>{t("Your analytics workspace")}</small>
          </div>
        </div>
        <div className="nav-caption">{t("WORKSPACE")}</div>
        <nav aria-label={t("Main navigation")}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={t(item.label)}
              aria-label={t(item.label)}
              aria-current={path === item.href ? "page" : undefined}
              className={cn("nav-link", path === item.href && "active")}
            >
              <item.icon size={19} />
              <span className="nav-desktop-label">{t(item.label)}</span>
              <span className="nav-mobile-label">{t(item.mobile)}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="research-note">
            <ShieldCheck size={20} />
            <strong>{t("Every answer has a source.")}</strong>
            <p>{t("Open any result to see the records behind it.")}</p>
            <Link href="/assistant">
              {t("Ask a question")}
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            aria-label={t(collapsed ? "Expand sidebar" : "Collapse sidebar")}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
            <span>{t("Collapse sidebar")}</span>
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <Link
              className="mobile-brand"
              href="/dashboard"
              aria-label="UZEX Insight AI home"
            >
              <Layers size={21} />
              <strong>UZEX</strong>
            </Link>
            <span>{t("Workspace")}</span>
            <ChevronRight size={13} />
            <strong>{t(active?.label ?? "Overview")}</strong>
          </div>
          <div className="topbar-right">
            <label className="navbar-language">
              <Globe2 size={16} />
              <span className="sr-only">{t("Interface language")}</span>
              <select
                data-testid="language-select"
                aria-label={t("Interface language")}
                value={language}
                onChange={(event) =>
                  setLanguage(parseUiLanguage(event.target.value))
                }
              >
                <option value="en">English</option>
                <option value="uz">O‘zbekcha</option>
                <option value="ru">Русский</option>
              </select>
            </label>
            <button
              data-testid="theme-toggle"
              className="theme-toggle"
              aria-label={t(
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode",
              )}
              title={t(
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode",
              )}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              <span>{t(theme === "light" ? "Dark mode" : "Light mode")}</span>
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer>
          <span>
            UZEX Insight AI <span className="footer-dot">·</span>{" "}
            {t("Understand your market data.")}
          </span>
          <span>{t("UZEX AI Hackathon 2026")}</span>
        </footer>
      </div>
    </div>
  );
}
