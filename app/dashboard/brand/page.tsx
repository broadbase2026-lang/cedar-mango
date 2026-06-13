import { redirect } from 'next/navigation';

/** Legacy URL — dashboard now lives under the shared brand portal layout. */
export default function LegacyDashboardBrandRedirect() {
  redirect('/brand/dashboard');
}
