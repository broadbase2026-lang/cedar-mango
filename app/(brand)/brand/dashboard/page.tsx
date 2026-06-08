import { redirect } from 'next/navigation';

export default function LegacyBrandDashboardRedirect() {
  redirect('/dashboard/brand');
}
