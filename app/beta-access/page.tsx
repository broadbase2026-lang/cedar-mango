import Image from 'next/image';
import { redirect } from 'next/navigation';
import { BetaAccessForm } from '@/components/auth/BetaAccessForm';
import { APP_NAME } from '@/constants/copy';
import { betaSitePassword, sanitizeBetaNextParam } from '@/lib/config/beta';

type BetaAccessPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function first(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export default function BetaAccessPage({ searchParams }: BetaAccessPageProps) {
  if (!betaSitePassword) {
    redirect('/');
  }

  const nextPath = sanitizeBetaNextParam(first(searchParams.next));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border-default bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/broadbase-logo.png"
            alt={APP_NAME}
            width={141}
            height={25}
            className="h-7 w-auto"
            priority
          />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-text-primary">Private beta</h1>
            <p className="text-sm text-text-secondary">
              Enter the beta password to access {APP_NAME}.
            </p>
          </div>
        </div>

        <BetaAccessForm nextPath={nextPath} />
      </div>
    </main>
  );
}
