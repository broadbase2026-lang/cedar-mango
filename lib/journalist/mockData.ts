export type PressReleaseVertical = 'F&B' | 'Travel' | 'Culture';

export type PressReleaseMock = {
  id: string;
  slug?: string;
  title: string;
  vertical: PressReleaseVertical;
  region: 'SG' | 'HK' | 'JP' | 'AU' | 'SEA' | 'APAC' | 'US' | 'EU';
  beats: Array<'Culture' | 'F&B' | 'Travel'>;
  heroImageUrl: string;
  summary: string;
  body: string;
  publishedAt: string; // ISO
  engagement: {
    pastReads: number;
    pastSaves: number;
  };
  mediaAssets: Array<{
    label: string;
    href: string;
  }>;
  imageCrop: 'small' | 'medium' | 'large';
};

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function daysAgo(d: number) {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Mock discovery feed content.
 * Images use deterministic Picsum seeds so layout looks consistent across refreshes.
 */
export const pressReleasesMock: PressReleaseMock[] = [
  {
    id: 'pr_001',
    title: 'A heritage bakery’s midnight menu goes public in Tiong Bahru',
    vertical: 'F&B',
    region: 'SG',
    beats: ['F&B', 'Culture'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-001/1200/1600',
    summary:
      'A limited-run lineup of fermented breads and seasonal spreads is now available for pre-order, with a tasting night for media and creators.',
    body:
      'Singapore — The team behind a heritage bakery in Tiong Bahru is unveiling a midnight menu built around long fermentation and seasonal produce.\n\nHighlights include: a smoked butter flight, citrus-salted focaccia, and a rotating “chef’s table” loaf. Journalists are invited to a guided tasting with the head baker and sourcing partners.\n\nMedia assets include high-res photography, founder bios, and a short b-roll package.',
    publishedAt: hoursAgo(6),
    engagement: { pastReads: 182, pastSaves: 41 },
    mediaAssets: [
      { label: 'Press kit (ZIP)', href: 'https://example.com/presskits/bakery-midnight.zip' },
      { label: 'Founder photos', href: 'https://example.com/assets/bakery-founders' },
    ],
    imageCrop: 'large',
  },
  {
    id: 'pr_002',
    title: 'A new island-hopping rail + ferry pass links Kyushu to the Seto Inland Sea',
    vertical: 'Travel',
    region: 'JP',
    beats: ['Travel', 'Culture'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-002/1200/1200',
    summary:
      'A bundled route pass pairs local trains with coastal ferries, designed for slow travel itineraries and off-peak discovery.',
    body:
      'Japan — A new multi-operator rail + ferry pass is launching for travelers exploring Kyushu and the Seto Inland Sea.\n\nThe pass focuses on regional lines and smaller ports, with suggested itineraries for 3, 5, and 7 days. It also includes a “local makers” map of stops for pottery, citrus groves, and contemporary art islands.\n\nMedia can request itinerary visuals, route maps, and interviews with participating operators.',
    publishedAt: hoursAgo(30),
    engagement: { pastReads: 98, pastSaves: 22 },
    mediaAssets: [{ label: 'Route map (PDF)', href: 'https://example.com/assets/kyushu-seto-map.pdf' }],
    imageCrop: 'medium',
  },
  {
    id: 'pr_003',
    title: 'Hong Kong’s waterfront culture season opens with open-air screenings',
    vertical: 'Culture',
    region: 'HK',
    beats: ['Culture'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-003/1200/1800',
    summary:
      'A month-long program brings films, talks, and small-stage performances to pop-up venues along the harbourfront.',
    body:
      'Hong Kong — The harbourfront is turning into a rotating cultural campus this season.\n\nExpect open-air screenings, artist-led walking tours, and weekend micro-performances. The program prioritizes emerging creators and bilingual access.\n\nA media preview includes a guided site walk, programming notes, and interviews with curators.',
    publishedAt: hoursAgo(14),
    engagement: { pastReads: 240, pastSaves: 73 },
    mediaAssets: [{ label: 'Program guide', href: 'https://example.com/assets/hk-waterfront-guide' }],
    imageCrop: 'large',
  },
  {
    id: 'pr_004',
    title: 'A chef’s omakase swaps seafood for seasonal vegetables—without losing theatre',
    vertical: 'F&B',
    region: 'APAC',
    beats: ['F&B'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-004/1200/1500',
    summary:
      'A 14-course tasting uses fire, fermentation, and tableside finishing to spotlight farm partnerships.',
    body:
      'APAC — A new omakase-style experience reimagines the format around vegetables and grains.\n\nCourses are finished tableside with smoke, hot stone, and aromatic broths. The menu rotates weekly, with a strong sustainability and provenance narrative.\n\nMedia: tasting notes, chef interview availability, and behind-the-scenes b-roll.',
    publishedAt: daysAgo(3),
    engagement: { pastReads: 61, pastSaves: 9 },
    mediaAssets: [{ label: 'Menu + notes', href: 'https://example.com/assets/veg-omakase-menu' }],
    imageCrop: 'small',
  },
  {
    id: 'pr_005',
    title: 'Sydney’s new design hotel launches a “stay + studio” package for creators',
    vertical: 'Travel',
    region: 'AU',
    beats: ['Travel', 'Culture'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-005/1200/1400',
    summary:
      'Rooms double as shooting sets with flexible lighting, rental props, and an edit bay open late.',
    body:
      'Australia — A new boutique hotel in Sydney is launching a creator-first package: a stay bundled with a studio slot, prop library, and late-night edit bay access.\n\nThe concept targets editorial and social teams looking for turnkey production.\n\nMedia assets: room renders, shot lists, and a guide to nearby locations.',
    publishedAt: hoursAgo(44),
    engagement: { pastReads: 133, pastSaves: 28 },
    mediaAssets: [{ label: 'Brand deck', href: 'https://example.com/assets/design-hotel-deck.pdf' }],
    imageCrop: 'medium',
  },
  {
    id: 'pr_006',
    title: 'A durian festival tries a new format: smaller tastings, better storytelling',
    vertical: 'Culture',
    region: 'SEA',
    beats: ['Culture', 'F&B'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-006/1200/1600',
    summary:
      'Instead of a single giant event, a series of tastings pairs growers with historians, chefs, and photographers.',
    body:
      'Southeast Asia — A durian festival is moving away from “all-you-can-eat” spectacle toward story-driven tastings.\n\nEach session features a grower, a chef, and a cultural voice, designed to help audiences understand terroir, seasonality, and heritage.\n\nMedia: tasting schedule, grower bios, and photo permissions.',
    publishedAt: daysAgo(8),
    engagement: { pastReads: 75, pastSaves: 12 },
    mediaAssets: [{ label: 'Session schedule', href: 'https://example.com/assets/durian-sessions' }],
    imageCrop: 'large',
  },
  {
    id: 'pr_007',
    title: 'A museum commissions a capsule collection from street artists—no merch table',
    vertical: 'Culture',
    region: 'APAC',
    beats: ['Culture'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-007/1200/1200',
    summary:
      'Limited pieces drop via timed gallery experiences to keep the focus on the work, not the queue.',
    body:
      'APAC — A new museum commission invites street artists to build wearable pieces as an extension of their practice.\n\nInstead of a merch table, the capsule drops via timed gallery experiences and artist talks.\n\nMedia: artist statements, lookbook, and installation stills.',
    publishedAt: daysAgo(2),
    engagement: { pastReads: 310, pastSaves: 96 },
    mediaAssets: [{ label: 'Lookbook', href: 'https://example.com/assets/museum-capsule-lookbook.pdf' }],
    imageCrop: 'small',
  },
  {
    id: 'pr_008',
    title: 'A “quiet luxury” tea room opens with a menu built for long interviews',
    vertical: 'F&B',
    region: 'SG',
    beats: ['F&B', 'Culture'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-008/1200/1800',
    summary:
      'Private booths, soft acoustics, and a pacing-focused tea menu aim to make conversations feel unhurried.',
    body:
      'Singapore — A new tea room is designed as a space for long conversations.\n\nThe menu emphasizes pacing (hot/cool alternations), low-caffeine options, and shareable pastries.\n\nMedia: interior photography, menu PDF, and founder interviews.',
    publishedAt: hoursAgo(10),
    engagement: { pastReads: 154, pastSaves: 37 },
    mediaAssets: [{ label: 'Menu (PDF)', href: 'https://example.com/assets/tea-room-menu.pdf' }],
    imageCrop: 'large',
  },
  {
    id: 'pr_009',
    title: 'A travel brand publishes its 2026 “micro-neighbourhoods” report for Asia',
    vertical: 'Travel',
    region: 'APAC',
    beats: ['Travel', 'Culture'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-009/1200/1500',
    summary:
      'The report maps emerging pockets with new cafés, galleries, and guesthouses—plus suggested story angles.',
    body:
      'APAC — A new travel trend report highlights micro-neighbourhoods across Asia.\n\nIt includes story prompts for lifestyle, culture, and business desks, with data snapshots and interview-ready operators.\n\nMedia: full report PDF and data notes.',
    publishedAt: daysAgo(12),
    engagement: { pastReads: 420, pastSaves: 88 },
    mediaAssets: [{ label: 'Full report', href: 'https://example.com/assets/micro-neighbourhoods-2026.pdf' }],
    imageCrop: 'medium',
  },
  {
    id: 'pr_010',
    title: 'A rooftop cinema pairs screenings with chef collaborations and local zines',
    vertical: 'Culture',
    region: 'SG',
    beats: ['Culture', 'F&B'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-010/1200/1200',
    summary:
      'Each weekend spotlights a film, a menu, and a print partner—making the night feel like a mini-festival.',
    body:
      'Singapore — A rooftop cinema series is expanding into a multi-partner program.\n\nEach screening pairs a chef collaboration with a local zine drop and a short creator talk.\n\nMedia: programming calendar, partner list, and press passes.',
    publishedAt: hoursAgo(40),
    engagement: { pastReads: 265, pastSaves: 64 },
    mediaAssets: [{ label: 'Calendar', href: 'https://example.com/assets/rooftop-cinema-calendar' }],
    imageCrop: 'small',
  },
  {
    id: 'pr_011',
    title: 'A boutique airline menu swaps “elevated” for “local”—with regional guest chefs',
    vertical: 'Travel',
    region: 'APAC',
    beats: ['Travel', 'F&B'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-011/1200/1800',
    summary:
      'New rotating menus feature guest chefs and “ingredient postcards” that explain provenance in-flight.',
    body:
      'APAC — A boutique airline is introducing region-led menus, rotating quarterly.\n\nThe in-flight storytelling includes ingredient postcards and short audio notes.\n\nMedia: menu notes, chef bios, and launch event details.',
    publishedAt: daysAgo(1),
    engagement: { pastReads: 201, pastSaves: 35 },
    mediaAssets: [{ label: 'Menus', href: 'https://example.com/assets/airline-menus' }],
    imageCrop: 'large',
  },
  {
    id: 'pr_012',
    title: 'A new gallery night market blends contemporary art with street food stalls',
    vertical: 'Culture',
    region: 'HK',
    beats: ['Culture', 'F&B'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-012/1200/1500',
    summary:
      'Small galleries stay open late while chefs take over the lane outside—designed for casual discovery.',
    body:
      'Hong Kong — A gallery night market is launching as a monthly late-night format.\n\nExpect rotating solo shows, street food stalls, and short talks.\n\nMedia: press preview and artist list.',
    publishedAt: hoursAgo(20),
    engagement: { pastReads: 178, pastSaves: 46 },
    mediaAssets: [{ label: 'Artist list', href: 'https://example.com/assets/gallery-night-market-artists' }],
    imageCrop: 'medium',
  },
  {
    id: 'pr_013',
    title: 'A chef launches a “regional noodles” series with guest makers across SEA',
    vertical: 'F&B',
    region: 'SEA',
    beats: ['F&B', 'Culture'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-013/1200/1600',
    summary:
      'A rotating series explores craft noodles from five regions, highlighting small family producers.',
    body:
      'Southeast Asia — A new dinner series spotlights craft noodles and the people who make them.\n\nEach month features a guest maker and a regional technique.\n\nMedia: maker bios, tasting notes, and photography.',
    publishedAt: daysAgo(6),
    engagement: { pastReads: 91, pastSaves: 17 },
    mediaAssets: [{ label: 'Series one-pager', href: 'https://example.com/assets/noodles-series.pdf' }],
    imageCrop: 'large',
  },
  {
    id: 'pr_014',
    title: 'A minimalist ryokan introduces a new “sound bath” morning ritual',
    vertical: 'Travel',
    region: 'JP',
    beats: ['Travel', 'Culture'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-014/1200/1200',
    summary:
      'A guided sonic session plus tea service reframes mornings as a slow, editorial-friendly moment.',
    body:
      'Japan — A minimalist ryokan is launching a morning ritual combining sound and tea.\n\nThe program is designed for guests seeking calm and for media creating narrative content.\n\nMedia: itinerary details and room imagery.',
    publishedAt: daysAgo(9),
    engagement: { pastReads: 118, pastSaves: 19 },
    mediaAssets: [{ label: 'Press imagery', href: 'https://example.com/assets/ryokan-press' }],
    imageCrop: 'small',
  },
  {
    id: 'pr_015',
    title: 'A city-wide cocktail week adds a “no-photos” hour for deeper storytelling',
    vertical: 'F&B',
    region: 'SG',
    beats: ['F&B', 'Culture'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-015/1200/1500',
    summary:
      'Selected venues host a no-photos hour with guided tastings and origin stories from bartenders.',
    body:
      'Singapore — Cocktail week is experimenting with a “no-photos” hour.\n\nThe goal: move attention from capture to conversation. Venues will host guided tastings and story sessions.\n\nMedia: venue list, key bartender profiles, and schedule.',
    publishedAt: hoursAgo(32),
    engagement: { pastReads: 147, pastSaves: 33 },
    mediaAssets: [{ label: 'Venue list', href: 'https://example.com/assets/cocktail-week-venues' }],
    imageCrop: 'medium',
  },
  {
    id: 'pr_016',
    title: 'A travel insurer launches “human-first” claims: chat-first, receipts later',
    vertical: 'Travel',
    region: 'US',
    beats: ['Travel'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-016/1200/1800',
    summary:
      'A new approach prioritizes speed and empathy in the first 15 minutes—especially during disruptions.',
    body:
      'United States — A travel insurer is piloting a chat-first claims experience.\n\nThe initial goal is to reduce customer stress and enable rapid triage, with receipts collected after.\n\nMedia: product brief and customer stories.',
    publishedAt: daysAgo(20),
    engagement: { pastReads: 52, pastSaves: 6 },
    mediaAssets: [{ label: 'Product brief', href: 'https://example.com/assets/claims-brief.pdf' }],
    imageCrop: 'large',
  },
  {
    id: 'pr_017',
    title: 'An EU museum tour uses AR to surface the “missing labels” in collections',
    vertical: 'Culture',
    region: 'EU',
    beats: ['Culture'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-017/1200/1600',
    summary:
      'Visitors can explore provenance notes, contextual essays, and alternative narratives via AR prompts.',
    body:
      'Europe — A museum consortium is launching an AR tour that adds context to collections.\n\nThe experience surfaces provenance notes and “missing labels,” designed with historians and educators.\n\nMedia: tour access, press kit, and curator interviews.',
    publishedAt: daysAgo(5),
    engagement: { pastReads: 88, pastSaves: 14 },
    mediaAssets: [{ label: 'Press kit', href: 'https://example.com/assets/ar-tour-press' }],
    imageCrop: 'medium',
  },
  {
    id: 'pr_018',
    title: 'A new “weekend ferry” program turns small islands into day-trip destinations',
    vertical: 'Travel',
    region: 'SEA',
    beats: ['Travel'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-018/1200/1200',
    summary:
      'Pilot routes run Friday–Sunday, connecting under-visited islands with curated food and culture stops.',
    body:
      'Southeast Asia — A pilot ferry program connects small islands on weekends.\n\nThe itinerary includes curated stops with local food and cultural experiences, aimed at decongesting hotspots.\n\nMedia: route notes, operator interviews, and island profiles.',
    publishedAt: hoursAgo(8),
    engagement: { pastReads: 203, pastSaves: 44 },
    mediaAssets: [{ label: 'Island profiles', href: 'https://example.com/assets/island-profiles' }],
    imageCrop: 'small',
  },
  {
    id: 'pr_019',
    title: 'A “chef + ceramicist” collaboration turns tableware into the main story',
    vertical: 'Culture',
    region: 'JP',
    beats: ['Culture', 'F&B'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-019/1200/1500',
    summary:
      'A limited dinner series treats tableware as a character—each course designed around form and touch.',
    body:
      'Japan — A chef and ceramicist are launching a dinner series where tableware leads.\n\nEach course is designed around form, texture, and how hands meet objects.\n\nMedia: studio visit, maker notes, and photography.',
    publishedAt: hoursAgo(46),
    engagement: { pastReads: 129, pastSaves: 27 },
    mediaAssets: [{ label: 'Maker notes', href: 'https://example.com/assets/ceramics-notes' }],
    imageCrop: 'medium',
  },
  {
    id: 'pr_020',
    title: 'A “late breakfast” club tests new café concepts before they open',
    vertical: 'F&B',
    region: 'SG',
    beats: ['F&B'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-020/1200/1800',
    summary:
      'A rotating pop-up lets chefs validate menus and interiors with small groups and structured feedback.',
    body:
      'Singapore — A late-breakfast club is launching as a pop-up format for pre-opening cafés.\n\nChefs test menus with small groups and structured feedback, and media can attend a preview session.\n\nMedia: schedule and founder interview availability.',
    publishedAt: hoursAgo(3),
    engagement: { pastReads: 96, pastSaves: 21 },
    mediaAssets: [{ label: 'Pop-up schedule', href: 'https://example.com/assets/late-breakfast-schedule' }],
    imageCrop: 'large',
  },
  {
    id: 'pr_021',
    title: 'A cultural fund launches micro-grants for neighbourhood festivals',
    vertical: 'Culture',
    region: 'APAC',
    beats: ['Culture'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-021/1200/1400',
    summary:
      'Micro-grants support local organisers with small budgets, fast turnaround, and a mentor network.',
    body:
      'APAC — A cultural fund is opening applications for neighbourhood festival micro-grants.\n\nThe program emphasizes speed, small budgets, and mentorship.\n\nMedia: data on recipients and founder quotes.',
    publishedAt: daysAgo(4),
    engagement: { pastReads: 64, pastSaves: 11 },
    mediaAssets: [{ label: 'Application kit', href: 'https://example.com/assets/micro-grants-kit.pdf' }],
    imageCrop: 'small',
  },
  {
    id: 'pr_022',
    title: 'A travel app adds “quiet routes” that avoid crowds and construction',
    vertical: 'Travel',
    region: 'EU',
    beats: ['Travel'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-022/1200/1600',
    summary:
      'A new routing layer chooses calmer streets and parks, optimized for walking and audio guides.',
    body:
      'Europe — A travel app is launching “quiet routes,” avoiding crowded streets and noisy areas.\n\nThe feature is designed for walking-first discovery and audio storytelling.\n\nMedia: feature brief and route demos.',
    publishedAt: daysAgo(7),
    engagement: { pastReads: 77, pastSaves: 10 },
    mediaAssets: [{ label: 'Feature brief', href: 'https://example.com/assets/quiet-routes-brief.pdf' }],
    imageCrop: 'large',
  },
  {
    id: 'pr_023',
    title: 'A chef collective publishes a “seasonal pantry” guide for editors',
    vertical: 'F&B',
    region: 'APAC',
    beats: ['F&B'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-023/1200/1200',
    summary:
      'A monthly guide with ingredient calendars, story hooks, and a shortlist of growers to call.',
    body:
      'APAC — A chef collective is publishing a monthly “seasonal pantry” guide.\n\nIt includes ingredient calendars, story hooks, and grower contacts for editorial desks.\n\nMedia: guide PDF and interview availability.',
    publishedAt: hoursAgo(22),
    engagement: { pastReads: 155, pastSaves: 42 },
    mediaAssets: [{ label: 'Guide (PDF)', href: 'https://example.com/assets/seasonal-pantry.pdf' }],
    imageCrop: 'medium',
  },
  {
    id: 'pr_024',
    title: 'A new city pass bundles museums, cafés, and “first table” reservations',
    vertical: 'Travel',
    region: 'SG',
    beats: ['Travel', 'F&B', 'Culture'],
    heroImageUrl: 'https://picsum.photos/seed/bb-pr-024/1200/1500',
    summary:
      'A city pass adds timed “first table” reservations and small perks to turn planning into an itinerary.',
    body:
      'Singapore — A new city pass combines museums, café perks, and timed “first table” reservations.\n\nThe goal is to streamline planning and introduce visitors to lesser-known venues.\n\nMedia: partner list, pass details, and a story angles sheet.',
    publishedAt: daysAgo(15),
    engagement: { pastReads: 115, pastSaves: 18 },
    mediaAssets: [{ label: 'Partner list', href: 'https://example.com/assets/city-pass-partners' }],
    imageCrop: 'small',
  },
];

