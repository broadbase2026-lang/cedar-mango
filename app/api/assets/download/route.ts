// app/api/assets/download/route.ts
// ============================================================
// GET /api/assets/download?token=[UUID]
// ============================================================
// Secure download proxy. Validates the token, streams the file
// from the private media-kits-private bucket, and logs telemetry.
//
// Security invariants:
// - Token is consumed atomically before streaming begins
// - Token can only be used once
// - Embargo status is checked inside the consume_download_token function
// - User permission is verified inside the function
// - Raw storage paths are never exposed to the client
// - File is streamed with no-store cache headers

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const DownloadQuerySchema = z.object({
  token: z.string().uuid('Invalid token format'),
});

// ============================================================
// Type for the RPC response from consume_download_token
// ============================================================
interface TokenConsumeResult {
  asset_id: string;
  asset_path: string;
  file_name: string;
  user_id: string;
  is_authorized: boolean;
}

export async function GET(request: Request) {
  try {
    // ============================================================
    // Step 1: Parse and validate token from query parameters
    // ============================================================
    const url = new URL(request.url);
    const tokenParam = url.searchParams.get('token');

    const parsed = DownloadQuerySchema.safeParse({ token: tokenParam });

    if (!parsed.success) {
      return new Response('Invalid or missing token', { status: 400 });
    }

    const { token } = parsed.data;

    // ============================================================
    // Step 2: Initialize Supabase service role client
    // ============================================================
    // Service role is required because:
    // 1. consume_download_token is SECURITY DEFINER (bypasses RLS)
    // 2. We need to write to asset_download_events
    // 3. We bypass auth.uid() RLS checks intentionally
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ============================================================
    // Step 3: Consume token and validate authorization atomically
    // ============================================================
    // This RPC call handles:
    // - Checking token validity (exists, not expired, not consumed)
    // - Verifying invitation exists and not revoked
    // - Checking embargo has lifted
    // - Atomically marking token as consumed
    // If any check fails, is_authorized = false.
    const { data: result, error: rpcError } = await supabase.rpc(
      'consume_download_token',
      { token_id: token }
    );

    // RPC error or no result (shouldn't happen, but handle gracefully)
    if (rpcError || !result || result.length === 0) {
      console.warn('[assets/download] RPC error or no result:', {
        rpcError: rpcError?.message,
        hasResult: !!result,
      });

      return new Response('Access denied', { status: 403 });
    }

    // ============================================================
    // Step 4: Extract and validate token consumption result
    // ============================================================
    const consumeResult = result[0] as TokenConsumeResult;
    const { asset_id, asset_path, file_name, user_id, is_authorized } =
      consumeResult;

    if (!is_authorized || !asset_path || !file_name) {
      console.warn('[assets/download] Token not authorized:', {
        is_authorized,
        hasPath: !!asset_path,
        hasFileName: !!file_name,
      });

      return new Response('Access denied', { status: 403 });
    }

    // ============================================================
    // Step 5: Fetch file from private storage bucket
    // ============================================================
    // asset_path is the storage path relative to the bucket root.
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('media-kits-private')
      .download(asset_path);

    if (downloadError || !fileData) {
      console.error('[assets/download] Storage download failed:', {
        error: downloadError?.message,
        assetPath: asset_path,
      });

      return new Response('File not found', { status: 404 });
    }

    // ============================================================
    // Step 6: Capture client telemetry headers (non-blocking)
    // ============================================================
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const userAgent = request.headers.get('user-agent') || null;

    // ============================================================
    // Step 7: Fetch asset metadata to get brand_id (non-blocking)
    // ============================================================
    // We need brand_id to log the download event. This query is
    // non-critical; if it fails, we still stream the file.
    let brandId: string | null = null;

    const { data: assetData, error: assetError } = await supabase
      .from('press_assets')
      .select('brand_id')
      .eq('id', asset_id)
      .single();

    if (!assetError && assetData?.brand_id) {
      brandId = assetData.brand_id;
    } else if (assetError) {
      console.warn('[assets/download] Failed to fetch asset metadata:', {
        error: assetError.message,
      });
    }

    // ============================================================
    // Step 8: Log download event asynchronously (fire-and-forget)
    // ============================================================
    // Do NOT await this. If telemetry fails, the download should
    // still complete. Log errors server-side only.
    if (brandId) {
      void (async () => {
        try {
          const res = await supabase.from('asset_download_events').insert({
            user_id,
            asset_id,
            brand_id: brandId,
            ip_address: ipAddress,
            user_agent: userAgent,
          });
          if (res.error) {
            console.error(
              '[assets/download] Telemetry insert failed:',
              res.error.message
            );
          }
        } catch (err) {
          console.error('[assets/download] Telemetry insert error:', err);
        }
      })();
    }

    // ============================================================
    // Step 9: Stream file response
    // ============================================================
    // Convert Blob to ArrayBuffer and return as Response.
    // Headers:
    // - Content-Type: octet-stream (force download, not preview)
    // - Content-Disposition: attachment; filename (browser download dialog)
    // - Cache-Control: no-store, no-cache (never cache sensitive downloads)
    // - X-Content-Type-Options: nosniff (prevent MIME sniffing)
    const buffer = await fileData.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file_name)}"`,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[assets/download] Unhandled error:', error);

    return new Response('Internal server error', { status: 500 });
  }
}
