import { geoBandFromScore, type GeoScoreBand } from '@/lib/utils/geoScore';
import { GEO_DISPLAY } from '@/constants/copy';

const BAND_CLASSES: Record<GeoScoreBand, string> = {
  'needs-improvement': 'bg-red-100 text-red-700 ring-red-200',
  good: 'bg-amber-100 text-amber-700 ring-amber-200',
  'geo-ready': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
};

const NOT_SCORED_CLASS = 'bg-neutral-100 text-neutral-600 ring-neutral-200';

const BASE_CLASS =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset';

type GeoScoreBadgeProps = {
  score: number | null;
};

export function GeoScoreBadge({ score }: GeoScoreBadgeProps) {
  if (score == null) {
    return (
      <span className={`${BASE_CLASS} ${NOT_SCORED_CLASS}`}>
        {GEO_DISPLAY.badgeLabel}
        <span className="font-normal">· {GEO_DISPLAY.notScored.badge}</span>
      </span>
    );
  }

  const band = geoBandFromScore(score);
  return (
    <span className={`${BASE_CLASS} ${BAND_CLASSES[band]}`}>
      {GEO_DISPLAY.badgeLabel}
      <span className="tabular-nums">· {score}</span>
    </span>
  );
}
