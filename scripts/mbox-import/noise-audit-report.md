# Mbox import noise audit report

Generated: 2026-06-30T14:54:02.770Z
Publisher: `admin@broadbase.app`
Brand: Broadbase (`f99ec8fe-1cc1-4c1e-961c-8e100fa3b6a3`)

## Summary

| Metric | Count |
|--------|------:|
| Total releases in brand | 5332 |
| Still in DB matching current delete rules (run hard-delete) | 0 |
| Proposed heuristic matches (review) | 0 |
| Uncategorized (no rule hit) | 5332 |

> **Note:** Heuristic matches are suggestions only. Review samples before adding rules or running hard-delete.

## Proposed additional rules

## Uncategorized — frequent keywords

Top tokens in 5332 titles with no current or proposed rule hit:

| Keyword | Count |
|---------|------:|
| 2025 | 432 |
| unveils | 357 |
| presents | 321 |
| year | 315 |
| 2026 | 313 |
| menu | 266 |
| asia | 239 |
| chef | 223 |
| this | 220 |
| chinese | 213 |
| world | 207 |
| first | 204 |
| celebrates | 202 |
| best | 196 |
| launches | 194 |
| exclusive | 192 |
| exhibition | 177 |
| hotel | 164 |
| dining | 161 |
| celebrate | 160 |
| festival | 159 |
| experience | 159 |
| global | 158 |
| festive | 158 |
| opens | 152 |

## Uncategorized — random sample

These may be legitimate press releases. Spot-check before broadening delete rules.

- `64af9129-a670-4809-885c-dc2855eca3a8` — La Petite Maison Hong Kong Unveils DÉJÀ Vu: a Revolutionary Cocktail Menu Presented as a Vintage Magazine
- `8351a0d4-6036-4f61-af6b-3c3e781e1fd1` — [For Immediate Release] Hong Kong Arts Development Council Showcase Presents the Lurking Void
- `f36f6d9d-bd32-4619-8646-0e984c45e65f` — Celebrate Easter With Jimmy’s Kitchen’s Festive Sharing Brunch
- `c700e2be-e8c3-4ff2-a74d-036595a6b9da` — Sudamala Resorts Elevates Sustainable Tourism With Solar Power Integration and Coral Reef Restoration Programs
- `5354053e-c1aa-4b0f-9ac0-f54594933359` — For Immediate Release - Cristal Room by Anne-Sophie Pic Announces Two-Night Collaboration With BEIJING’S Acclaimed Qu Lang Yuan This January in Hong Kong
- `2591484e-aa24-4e8c-b60a-7d1ad8ae5e76` — Cuhk School of Hotel and Tourism Management Successfully Hosts the "Nextgen Tourism Summit: Leading the Experience Economy"
- `ee8ac5b3-0ab2-4edb-96cf-9720173047fc` — Hkg / Mnl / Bcl Flight Confirmation
- `312bdeab-3da3-403a-b913-593beabb0eb2` — [Press Release] a Legendary Culinary Encounter: Chef Nobu Matsuhisa Returns to Regent Hong Kong This October
- `06e22dec-49e5-4971-8a4a-7a68961838d1` — For Immediate Release - Basehall 01 + 02 Announces New Additions This September: Min Dong Cart Noodle Joins Basehall 02 and 3721 Protein Arrives at Basehall 01, Alongside Canto Mania & Oktoberfest
- `f0c3f2c9-13d5-4c44-85df-dd8357e038ec` — Media Alert | Christie's Announces the Return of the Au Bak Ling Collection in October 2025
- `c83c356c-b74e-4bce-8472-c5807a187977` — [Press Release] Celebrate Father’s Day With Indulgent Menus and Memorable Moments at Eaton Hk
- `db10b41d-c5af-49c4-b3d5-288871b7f5c4` — [Press Release] Antique Vessels & the Spirit of the Song Dynasty: a Tea-Inspired Cocktail Journey at Qura Bar
- `c3318440-ac6f-489b-8548-151c45ad677a` — [Pitching Note] Sheraton Hong Kong Tung Chung Hotel Introduces New Gastronomic Delights and Father’s Day Celebrations
- `4e81e869-7c73-4eb4-b264-b3ac698442f0` — [Press Release] Ladies First: Fusion Rolls Out Special Initiatives for October to Celebrate Vietnamese Women’s Day
- `1c028596-67d8-4462-9f4e-3ad1d65f2b0b` — Spreadsheet Shared With You: ‘Restaurant List - 100tt 2025’
- `bce9f4ae-f4c7-45e9-9858-cc06132f0b26` — Hong Kong Ict Awards 2024 - Smart Mobility Award Winners Unveiled
- `d0b55a46-fcaf-4c49-ad6c-237ebedb98c0` — Making Gin From Scratch - up for an Interview With Heads of Bar of the House Collective?
- `8ed287e6-3c1c-4746-9bdb-e9252ab96c75` — 【Press Release & Images】The Singleton Unveils 13-Year-Old Sauternes Cask-Finished Whisky Golden Trésor in Hong Kong “a Dram of Bling” Launch Party Features Live Performance From Pop Singer Gin Lee
- `4862ea7a-501f-4718-b03e-eccf6a06e60f` — Security Alert
- `e7211e8b-bbf4-4efa-82d2-a7e20c0cb903` — Expenses Claim - Jul 31 (Wed)

## Recommended next steps

1. Review proposed rule sections above and approve patterns to add to `delete-title-patterns.ts`.
2. Tighten `re:` to `^re:` (start of title) to avoid false positives like `here:`.
3. Mirror approved rules in `shouldSkipMessage` or import-time title check to prevent re-import.
4. Run `npm run hard-delete-mbox-noise -- --dry-run` before any live hard-delete.
