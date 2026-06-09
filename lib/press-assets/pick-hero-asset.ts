export type PressAssetHeroCandidate = {
  file_url: string;
  file_type: string;
  is_hero: boolean;
};

/** Prefer explicit hero, then first image, then first asset. */
export function pickHeroAsset<T extends PressAssetHeroCandidate>(assets: T[]): T | null {
  if (assets.length === 0) return null;

  const markedHero = assets.find((a) => a.is_hero);
  if (markedHero) return markedHero;

  const firstImage = assets.find((a) => a.file_type === 'image');
  if (firstImage) return firstImage;

  return assets[0] ?? null;
}

export function pickHeroAssetUrl(assets: PressAssetHeroCandidate[]): string | null {
  return pickHeroAsset(assets)?.file_url ?? null;
}
