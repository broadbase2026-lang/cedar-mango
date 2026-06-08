import type { JournalistSettingsSnapshot } from '@/lib/journalist/settings-data';
import { JournalistSettingsForm } from '@/components/journalist/journalist-settings-form';

type Props = {
  snapshot: JournalistSettingsSnapshot;
};

export function JournalistSettingsView({ snapshot }: Props) {
  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner">
        <div className="bb-dash-eyebrow">
          <div>
            <h2 className="bb-dash-section-title">Settings</h2>
            <p className="bb-dash-section-desc">Update your profile and digest preferences.</p>
          </div>
        </div>

        <JournalistSettingsForm snapshot={snapshot} />
      </div>
    </main>
  );
}

