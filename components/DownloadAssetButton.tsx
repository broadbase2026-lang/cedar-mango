// components/DownloadAssetButton.tsx
// ============================================================
// Client-side button for downloading embargoed assets.
//
// Props:
// - assetId: UUID of the press_asset
// - fileName: display name for the download
// - embargoUntil: ISO 8601 timestamp or null
//
// Behavior:
// - If embargo active: show lock icon + countdown, button disabled
// - If embargo lifted: show download button
// - On click: request token, then stream via /api/assets/download
// - Loading state: show "Preparing download..."
// - Error state: display inline error message (non-destructive)

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface DownloadAssetButtonProps {
  assetId: string;
  fileName: string;
  embargoUntil?: string | null;
}

export function DownloadAssetButton({
  assetId,
  fileName,
  embargoUntil,
}: DownloadAssetButtonProps) {
  // ============================================================
  // State management
  // ============================================================
  const [isEmbargoed, setIsEmbargoed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // Embargo countdown effect
  // ============================================================
  // Updates every 60 seconds. Once embargo lifts, button becomes
  // interactive. If embargo_until changes, recalculate.
  useEffect(() => {
    if (!embargoUntil) {
      setIsEmbargoed(false);
      setTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const embargo = new Date(embargoUntil).getTime();
      const now = Date.now();
      const remaining = embargo - now;

      if (remaining <= 0) {
        // Embargo has lifted
        setIsEmbargoed(false);
        setTimeRemaining(null);
      } else {
        // Embargo still active
        setIsEmbargoed(true);

        // Format as "Xh Ym" or just "Xm" if less than an hour
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);

        if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setTimeRemaining(`${minutes}m`);
        }
      }
    };

    // Run immediately
    updateCountdown();

    // Update every minute (60,000 ms)
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [embargoUntil]);

  // ============================================================
  // Download handler
  // ============================================================
  // 1. Request token from /api/assets/request-token
  // 2. If successful, navigate to /api/assets/download?token=...
  // 3. Browser handles download automatically
  // 4. Show error inline if either step fails
  const handleDownload = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Request token
      const tokenRes = await fetch('/api/assets/request-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });

      if (!tokenRes.ok) {
        // Parse error response (should be { success: false, error: string })
        let errorMessage = 'Failed to request download token';

        try {
          const body = await tokenRes.json();
          errorMessage = body.error || errorMessage;
        } catch {
          // If response isn't JSON, use default message
        }

        throw new Error(errorMessage);
      }

      // Parse success response
      const tokenData = await tokenRes.json();

      if (!tokenData.success || !tokenData.data?.token) {
        throw new Error('No token received from server');
      }

      const { token } = tokenData.data;

      // Step 2: Trigger download via proxy endpoint
      // Use an invisible anchor element to avoid page navigation.
      const downloadUrl = `/api/assets/download?token=${encodeURIComponent(token)}`;
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      // Set download attribute to force download, not preview
      anchor.download = fileName;
      // Append temporarily, click, and remove
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      // Success: button returns to normal state
      setError(null);
    } catch (err) {
      // Display user-friendly error message
      const message =
        err instanceof Error
          ? err.message
          : 'Download failed. Please try again.';

      setError(message);
      console.error('[DownloadAssetButton]', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Render
  // ============================================================

  // Embargo active: show lock icon + countdown
  if (isEmbargoed) {
    return (
      <Button disabled variant="ghost">
        🔒 Available {timeRemaining}
      </Button>
    );
  }

  // Embargo lifted: show download button
  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleDownload}
        disabled={loading}
        variant="primary"
      >
        {loading ? '⏳ Preparing download...' : `📥 Download`}
      </Button>

      {/* Error message (non-destructive inline display) */}
      {error && (
        <p className="text-sm text-red-600 mt-0">
          {error}
        </p>
      )}
    </div>
  );
}
