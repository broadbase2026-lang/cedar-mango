export function AuthEnvWarning() {
  return (
    <div
      className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      role="status"
    >
      Sign-in is unavailable: Supabase environment variables are not configured on this
      deployment.
    </div>
  );
}
