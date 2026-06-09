'use client';

import type { ReactNode } from 'react';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Compass,
  FolderOpen,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { JournalistChatWidget } from '@/components/journalist/journalist-chat-widget';
import { logoutAction } from '@/lib/auth/logout';

const NAV_ITEMS: ReadonlyArray<{
  label: string;
  href: string;
  icon: LucideIcon;
}> = [
  { label: 'Discover', href: '/journalist/discover', icon: Compass },
  { label: 'Search', href: '/journalist/search', icon: Search },
  { label: 'Folders', href: '/journalist/folders', icon: FolderOpen },
  { label: 'Settings', href: '/journalist/settings', icon: Settings },
];

function NavItemIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="bb-portal-nav-link-icon" aria-hidden>
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </span>
  );
}

function SidebarNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? '';

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.label}
            href={item.href}
            prefetch={false}
            className={'bb-portal-nav-link ' + (active ? 'bb-portal-nav-link--active' : '')}
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
        <span key={item.label} className="bb-portal-nav-link pointer-events-none opacity-60">
          <NavItemIcon icon={item.icon} />
          <span className="bb-portal-nav-link-label">{item.label}</span>
        </span>
      ))}
    </>
  );
}

type JournalistPortalShellProps = {
  title: string;
  userEmail: string | undefined;
  userDisplayName: string | null;
  userAvatarUrl: string | null;
  children: ReactNode;
};

export function JournalistPortalShell({
  title,
  userEmail,
  userDisplayName,
  userAvatarUrl,
  children,
}: JournalistPortalShellProps) {
  const display = userDisplayName?.trim() || userEmail || 'Account';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchText, setSearchText] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSearchText(searchParams?.get('q') ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Default: collapsed on mobile (off-canvas closed). Desktop preference persists.
    try {
      const raw = window.localStorage.getItem('bb:j:sidebarCollapsed');
      if (raw === '1') setDesktopSidebarCollapsed(true);
      if (raw === '0') setDesktopSidebarCollapsed(false);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('bb:j:sidebarCollapsed', desktopSidebarCollapsed ? '1' : '0');
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

  return (
    <div className={'bb-portal ' + (desktopSidebarCollapsed ? 'bb-portal--sidebar-collapsed' : '')}>
      {mobileSidebarOpen ? <div className="bb-portal-overlay" onClick={() => setMobileSidebarOpen(false)} /> : null}

      <aside
        className={'bb-portal-sidebar ' + (mobileSidebarOpen ? 'bb-portal-sidebar--open' : '')}
        aria-label="Primary"
      >
        <div className="bb-portal-sidebar-brand">
          <div className="flex items-start justify-between gap-3">
            {!desktopSidebarCollapsed || mobileSidebarOpen ? (
              <div className="bb-portal-sidebar-brand-text min-w-0">
                <div className="bb-portal-sidebar-kicker">Broadbase</div>
                <div className="bb-portal-sidebar-title">Journalist</div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setDesktopSidebarCollapsed((v) => !v)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-default bg-white/60 text-text-primary transition hover:bg-white"
              aria-pressed={desktopSidebarCollapsed}
              aria-label={desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
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
                {desktopSidebarCollapsed ? (
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

        <div className="mt-auto px-2 pb-4">
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
        <header className="bb-portal-header">
          <div className="bb-portal-header-title">
            <h1 className="bb-portal-header-heading">{title}</h1>
          </div>
          <div className="bb-portal-header-actions">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-10 items-center rounded-lg border border-brand-border bg-white px-3 text-sm font-medium text-brand-ink shadow-sm hover:bg-brand-surface sm:hidden"
              aria-label="Open menu"
            >
              Menu
            </button>
            <form
              className="hidden sm:flex items-center"
              onSubmit={(e) => {
                e.preventDefault();
                const q = searchText.trim();
                router.push(q ? `/journalist/search?q=${encodeURIComponent(q)}` : '/journalist/search');
              }}
            >
              <div className="flex items-center rounded-lg border border-brand-border bg-white px-3 shadow-sm">
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search releases…"
                  className="h-10 w-[260px] bg-transparent text-sm outline-none placeholder:text-brand-muted/80"
                />
                <button type="submit" className="text-xs font-medium text-brand-primary-700 hover:underline">
                  Search
                </button>
              </div>
            </form>
            <Link href="/journalist/search" prefetch={false} className="sm:hidden bb-btn-primary-md no-underline">
              Search
            </Link>
            <div className="bb-portal-profile" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="bb-portal-profile-trigger"
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
                <span className="bb-portal-profile-label">{display}</span>
                <span className="bb-portal-profile-caret" aria-hidden>
                  ▾
                </span>
              </button>
              <div
                className={'bb-portal-profile-menu ' + (menuOpen ? '' : 'bb-portal-profile-menu--closed')}
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
      <JournalistChatWidget />
    </div>
  );
}

