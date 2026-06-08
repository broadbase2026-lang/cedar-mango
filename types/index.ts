export type UserType = 'brand' | 'journalist';

export type SubscriptionPlan = 'starter' | 'pro' | 'agency';

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing';

export type IndustryVertical =
  | 'fnb'
  | 'travel'
  | 'culture'
  | 'fashion'
  | 'lifestyle'
  | 'other';

export type JournalistPublication = {
  id: string;
  journalist_id: string;
  press_release_id: string | null;
  publication_name: string;
  article_headline: string;
  article_url: string;
  published_at: string;
  deleted_at: string | null;
  created_at: string;
};

export type JournalistPortfolioSettings = {
  journalist_id: string;
  slug: string;
  bio: string | null;
  public: boolean;
  show_email: boolean;
  twitter_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
};

// Shape returned by the public portfolio page query.
// Joins journalist_publications with journalist_portfolio_settings
// and journalist_profiles.
export type PublicPortfolioData = {
  settings: JournalistPortfolioSettings;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    beats: string[];
    publication: string | null;
    bio: string | null;
  };
  publications: (JournalistPublication & {
    press_release_slug: string | null;
  })[];
  total_count: number;
};
