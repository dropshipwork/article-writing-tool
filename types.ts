
export interface Trend {
  topic: string;
  volume: string;
  category: string;
  rising: boolean;
  searchIntent: string;
  trendType: 'Daily' | 'Realtime' | 'Breakout' | 'Rising';
  timePeriod: string;
  region: string;
  competition: 'Low' | 'Medium' | 'High';
}

export interface Keyword {
  phrase: string;
  volume: string;
  competition: 'Low' | 'Medium' | 'High';
  intent: 'Informational' | 'Commercial' | 'Transactional';
  type: 'Long-tail' | 'Question' | 'Seed';
}

export interface Article {
  id: string;
  title: string;
  seoTitle?: string;
  focusKeyword?: string;
  content: string;
  status: 'draft' | 'review' | 'ready' | 'published';
  slug: string;
  metaDescription: string;
  keywords: string[];
  createdAt: number;
  publishedUrl?: string;
  similarityScore: number;
  humanScore: number;
  seoReady: boolean;
  seoScore: number;
  seoRecommendations: string[];
  imageUrl?: string;
  scheduledAt?: string; // ISO string
}

export interface WordPressConfig {
  url: string;
  username: string;
  appPassword: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  accessKey: string;
  role: 'Admin' | 'Member';
  createdAt: number;
  lastActive?: number;
  status: 'Active' | 'Suspended';
  geminiApiKey?: string;
  usage?: {
    keywords: number;
    articles: number;
    images: number;
    lastReset: number;
  };
}

export interface SystemConfig {
  isPrivateMode: boolean;
  adminPasswordHash: string;
  defaultNiche: string;
}

export enum AppState {
  DASHBOARD = 'DASHBOARD',
  IDEAS = 'IDEAS',
  KEYWORDS = 'KEYWORDS',
  WRITER = 'WRITER',
  LOGS = 'LOGS',
  SETTINGS = 'SETTINGS',
  ADMIN = 'ADMIN'
}

export const COUNTRIES = [
  { code: 'GLOBAL', name: 'Global' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'IN', name: 'India' },
  { code: 'AE', name: 'UAE' }
];

export const CATEGORY_MAP: Record<string, number> = {
  "All categories": 0,
  "Business & Industrial": 12,
  "Technology": 7,
  "Health": 45,
  "Entertainment": 3,
  "Sports": 20,
  "Finance": 7,
  "Education": 958,
  "Science": 174,
  "Shopping": 18,
  "Real Estate": 29,
  "Travel": 67,
  "Food & Drink": 71,
  "Home & Garden": 11,
  "Autos & Vehicles": 47,
  "Beauty & Fitness": 44,
  "Jobs & Education": 19,
  "Law & Government": 19,
  "News": 16,
  "Online Communities": 299,
  "People & Society": 14,
  "Pets & Animals": 66,
  "Reference": 533,
  "SaaS & Software": 7
};

export const CATEGORIES = Object.keys(CATEGORY_MAP);
