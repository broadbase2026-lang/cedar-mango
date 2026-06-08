import { z } from 'zod';

// Used by POST /api/journalist/portfolio/publications
export const CreatePublicationSchema = z.object({
  press_release_id: z.string().uuid().optional(),
  publication_name: z.string().min(1).max(200),
  article_headline: z.string().min(1).max(500),
  article_url: z.string().url().max(2000),
  published_at: z.string().datetime(),
});

// Used by PATCH /api/journalist/portfolio/publications/[id]
export const UpdatePublicationSchema = z.object({
  publication_name: z.string().min(1).max(200).optional(),
  article_headline: z.string().min(1).max(500).optional(),
  article_url: z.string().url().max(2000).optional(),
  published_at: z.string().datetime().optional(),
});

// Used by PATCH /api/journalist/portfolio/settings
export const UpdatePortfolioSettingsSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  bio: z.string().max(500).optional(),
  public: z.boolean().optional(),
  show_email: z.boolean().optional(),
  twitter_url: z.string().url().max(300).optional().nullable(),
  linkedin_url: z.string().url().max(300).optional().nullable(),
  website_url: z.string().url().max(300).optional().nullable(),
});
