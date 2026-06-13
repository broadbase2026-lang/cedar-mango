'use client';

import type { ReactNode } from 'react';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Home,
  FileText,
  Image as ImageIcon,
  BarChart2,
  Newspaper,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { PortalHamburgerButton } from '@/components/portal/portal-hamburger-button';
import { useMobileScrollHeaderHidden } from '@/components/portal/use-mobile-scroll-header';
import { logoutAction } from '@/lib/auth/logout';

const PORTAL_SIDEBAR_ID = 'brand-portal-sidebar';

/** Stable URLs — avoid `#hash` links (App Router soft navigations can race RSC + look blank). */
const NAV_ITEMS: ReadonlyArray<{
  label: string;
  href: string;
  icon: LucideIcon;
}> = [
  { label: 'Overview', href: '/brand/dashboard', icon: Home },
  { label: 'My Releases', href: '/brand/dashboard?section=releases', icon: FileText },
  { label: 'Media Library', href: '/brand/upload', icon: ImageIcon },
  { label: 'Analytics', href: '/brand/analytics', icon: BarChart2 },
  { label: 'Coverage', href: '/coverage', icon: Newspaper },
  { label: 'Settings', href: '/brand/settings', icon: SettingsIcon },
] as const;

function NavItemIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="bb-portal-nav-link-icon" aria-hidden>
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </span>
  );
}

function navLinkIsActive(
  pathname: string,
  searchParams: URLSearchParams,
  href: string
): boolean {
  const u = new URL(href, 'http://bb.local');
  if (pathname !== u.pathname) return false;
  const want = u.searchParams.get('section');
  const have = searchParams.get('section');
  if (want === 'releases') return have === 'releases';
  return have !== 'releases';
}

function SidebarNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = navLinkIsActive(pathname, searchParams, item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={
              'bb-portal-nav-link ' +
              (active ? 'bb-portal-nav-link--active' : '')
            }
            onClick={onNavigate}
          >
            <NavItemIcon icon={item.icon} />
            <span className="bb-portal-nav-link-label">{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

function SidebarNavFallback() {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <span
          key={item.label}
          className="bb-portal-nav-link pointer-events-none opacity-60"
        >
          <NavItemIcon icon={item.icon} />
          <span className="bb-portal-nav-link-label">{item.label}</span>
        </span>
      ))}
    </>
  );
}

function SidebarCollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {collapsed ? (
        <>
          <path d="M4 4v16" />
          <path d="M14 7l5 5-5 5" />
        </>
      ) : (
        <>
          <path d="M20 4v16" />
          <path d="M10 7l-5 5 5 5" />
        </>
      )}
    </svg>
  );
}

type BrandPortalShellProps = {
  brandName: string;
  userEmail: string | undefined;
  userDisplayName: string | null;
  userAvatarUrl: string | null;
  children: ReactNode;
};

export function BrandPortalShell({
  brandName,
  userEmail,
  userDisplayName,
  userAvatarUrl,
  children,
}: BrandPortalShellProps) {
  const display = userDisplayName?.trim() || userEmail || 'Account';
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileHeaderHidden = useMobileScrollHeaderHidden();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('bb:b:sidebarCollapsed');
      if (raw === '1') setDesktopSidebarCollapsed(true);
      if (raw === '0') setDesktopSidebarCollapsed(false);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'bb:b:sidebarCollapsed',
        desktopSidebarCollapsed ? '1' : '0',
      );
    } catch {
      // ignore
    }
  }, [desktopSidebarCollapsed]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileSidebarOpen]);

  const showSidebarBrandText =
    !desktopSidebarCollapsed || mobileSidebarOpen;

  return (
    <div
      className={
        'bb-portal ' +
        (desktopSidebarCollapsed ? 'bb-portal--sidebar-collapsed' : '')
      }
    >
      {mobileSidebarOpen ? (
        <div
          className="bb-portal-overlay"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}

      <aside
        id={PORTAL_SIDEBAR_ID}
        className={
          'bb-portal-sidebar ' +
          (mobileSidebarOpen ? 'bb-portal-sidebar--open' : '')
        }
        aria-label="Primary"
      >
        <div className="bb-portal-sidebar-brand">
          <div className="flex items-start justify-between gap-3">
            {showSidebarBrandText ? (
              <div className="bb-portal-sidebar-brand-text min-w-0">
                <div className="bb-portal-sidebar-kicker">Broadbase</div>
                <div className="bb-portal-sidebar-title">Brand</div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setDesktopSidebarCollapsed((v) => !v)}
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-default bg-white/60 text-text-primary transition hover:bg-white sm:inline-flex"
              aria-pressed={desktopSidebarCollapsed}
              aria-label={
                desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
              }
              title={
                desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
              }
            >
              <SidebarCollapseIcon collapsed={desktopSidebarCollapsed} />
            </button>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="shrink-0 rounded-lg bg-white/50 px-2 py-1 text-[11px] font-semibold text-text-secondary transition hover:bg-white sm:hidden"
              aria-label="Close sidebar"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
        <nav className="bb-portal-nav">
          <Suspense fallback={<SidebarNavFallback />}>
            <SidebarNavLinks onNavigate={() => setMobileSidebarOpen(false)} />
          </Suspense>
        </nav>

        <div className="mt-auto space-y-2 px-2 pb-4 sm:pb-6">
          <Link
            href="/brand/releases/new"
            className="bb-btn-primary-md w-full no-underline sm:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          >
            Quick Upload
          </Link>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="w-full rounded-lg bg-white/50 px-3 py-2 text-xs font-semibold text-text-secondary transition hover:bg-white sm:hidden"
          >
            Close
          </button>
        </div>
      </aside>

      <div className="bb-portal-main">
        <header
          className={
            'bb-portal-header' + (mobileHeaderHidden ? ' bb-portal-header--hidden' : '')
          }
        >
          <PortalHamburgerButton
            open={mobileSidebarOpen}
            controlsId={PORTAL_SIDEBAR_ID}
            onToggle={() => setMobileSidebarOpen((open) => !open)}
          />
          <div className="bb-portal-header-title">
            <h1 className="bb-portal-header-heading">{brandName}</h1>
          </div>
          <div className="bb-portal-header-actions">
            <Link
              href="/brand/releases/new"
              className="bb-btn-primary-md hidden no-underline sm:inline-flex"
            >
              Quick Upload
            </Link>
            <div className="bb-portal-profile" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="bb-portal-profile-trigger max-sm:max-w-none max-sm:gap-0 max-sm:px-2"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {userAvatarUrl ? (
                  <Image
                    src={userAvatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    sizes="32px"
                    className="bb-portal-profile-avatar object-cover"
                  />
                ) : (
                  <span className="bb-portal-profile-avatar" aria-hidden>
                    {display.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="bb-portal-profile-label max-sm:hidden">
                  {display}
                </span>
                <span className="bb-portal-profile-caret max-sm:hidden" aria-hidden>
                  ▾
                </span>
              </button>
              <div
                className={
                  'bb-portal-profile-menu ' +
                  (menuOpen ? '' : 'bb-portal-profile-menu--closed')
                }
                role="menu"
              >
                <div className="bb-portal-profile-email">
                  {userEmail && <div className="truncate">{userEmail}</div>}
                </div>
                <form action={logoutAction} className="bb-portal-profile-logout-form">
                  <button
                    type="submit"
                    className="bb-portal-profile-logout-btn"
                    role="menuitem"
                  >
                    Log out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </header>
        <div className="bb-portal-children">{children}</div>
      </div>
    </div>
  );
}
