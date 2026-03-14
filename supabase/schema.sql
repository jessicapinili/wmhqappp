-- =====================================================
-- WMHQ Personal Portal — Supabase Database Schema
-- Run this in your Supabase SQL Editor (Project > SQL Editor > New Query)
-- =====================================================

-- ── PROFILES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  brand_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ── SEASON SELECTION ─────────────────────────────
CREATE TABLE IF NOT EXISTS season_selection (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  season TEXT,
  month INT NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

ALTER TABLE season_selection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own seasons" ON season_selection FOR ALL USING (auth.uid() = user_id);


-- ── BUSINESS FOCUS ───────────────────────────────
CREATE TABLE IF NOT EXISTS business_focus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  focus_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE business_focus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own business focus" ON business_focus FOR ALL USING (auth.uid() = user_id);


-- ── LIFE FOCUS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS life_focus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  month TEXT,
  year TEXT,
  quarter TEXT,
  areas TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE life_focus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own life focus" ON life_focus FOR ALL USING (auth.uid() = user_id);


-- ── DAILY CHECKLIST ──────────────────────────────
CREATE TABLE IF NOT EXISTS daily_checklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date_key TEXT NOT NULL,
  checked_items JSONB DEFAULT '{}',
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date_key)
);

ALTER TABLE daily_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own checklists" ON daily_checklist FOR ALL USING (auth.uid() = user_id);


-- ── CORE ONE-LINER (Influence) ───────────────────
CREATE TABLE IF NOT EXISTS core_one_liner (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE core_one_liner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own core one-liner" ON core_one_liner FOR ALL USING (auth.uid() = user_id);


-- ── PRODUCT ONE-LINERS (Influence) ───────────────
CREATE TABLE IF NOT EXISTS product_one_liners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  offer_name TEXT,
  offer_one_liner TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_one_liners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own product one-liners" ON product_one_liners FOR ALL USING (auth.uid() = user_id);


-- ── BUYER AVATAR (Influence) ─────────────────────
CREATE TABLE IF NOT EXISTS buyer_avatar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT,
  age_range TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE buyer_avatar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own avatar" ON buyer_avatar FOR ALL USING (auth.uid() = user_id);


-- ── BUYER PSYCHOLOGY (Influence) ─────────────────
CREATE TABLE IF NOT EXISTS buyer_psychology (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  pains TEXT,
  desires TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE buyer_psychology ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own buyer psychology" ON buyer_psychology FOR ALL USING (auth.uid() = user_id);


-- ── CONTENT SYSTEM (Visibility) ──────────────────
CREATE TABLE IF NOT EXISTS content_system (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  column_index INTEGER NOT NULL,
  theme_name TEXT,
  topics JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, column_index)
);

ALTER TABLE content_system ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own content system" ON content_system FOR ALL USING (auth.uid() = user_id);


-- ── CONTENT TRACKER ENTRIES (Visibility) ─────────
CREATE TABLE IF NOT EXISTS content_tracker_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  week_key TEXT NOT NULL,
  platform TEXT,
  funnel_stage TEXT,
  content_about TEXT,
  led_to_action TEXT,
  reflection TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE content_tracker_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own content tracker" ON content_tracker_entries FOR ALL USING (auth.uid() = user_id);


-- ── VISIBILITY BLOCKS ENTRIES (Visibility) ───────
CREATE TABLE IF NOT EXISTS visibility_blocks_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  week_key TEXT NOT NULL,
  selected_blocks JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_key)
);

ALTER TABLE visibility_blocks_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own visibility blocks" ON visibility_blocks_entries FOR ALL USING (auth.uid() = user_id);


-- ── MRR GOAL (Cash) ──────────────────────────────
CREATE TABLE IF NOT EXISTS mrr_goal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  current_mrr NUMERIC DEFAULT 0,
  goal_mrr NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mrr_goal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own MRR" ON mrr_goal FOR ALL USING (auth.uid() = user_id);


-- ── ILN (Cash) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS iln (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  ideal_lifestyle_number NUMERIC DEFAULT 0,
  current_monthly_revenue NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE iln ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own ILN" ON iln FOR ALL USING (auth.uid() = user_id);


-- ── PRODUCT SUITE (Cash) ─────────────────────────
CREATE TABLE IF NOT EXISTS product_suite (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  tier TEXT NOT NULL,
  offer_name TEXT,
  offer_type TEXT,
  offer_description TEXT,
  one_time_price TEXT,
  payment_plan_1 TEXT,
  payment_plan_2 TEXT,
  monthly_revenue TEXT,
  offer_status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_suite ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own product suite" ON product_suite FOR ALL USING (auth.uid() = user_id);


-- ── QUARTERLY REVIEWS (Cash) ─────────────────────
CREATE TABLE IF NOT EXISTS quarterly_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  quarter TEXT NOT NULL,
  year TEXT NOT NULL,
  q1 TEXT,
  q2 TEXT,
  q3 TEXT,
  q4 TEXT,
  q5 TEXT,
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, quarter, year)
);

ALTER TABLE quarterly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own quarterly reviews" ON quarterly_reviews FOR ALL USING (auth.uid() = user_id);


-- ── REVENUE EVENTS (Cash) ────────────────────────
CREATE TABLE IF NOT EXISTS revenue_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  offer_name TEXT,
  event_type TEXT,
  status TEXT DEFAULT 'Planning',
  start_date TEXT,
  end_date TEXT,
  currency TEXT DEFAULT 'AUD',
  revenue_goal NUMERIC,
  primary_focus TEXT,
  revenue_achieved NUMERIC,
  notes TEXT,
  year INTEGER,
  quarter TEXT,
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE revenue_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own revenue events" ON revenue_events FOR ALL USING (auth.uid() = user_id);


-- ── IDENTITY PATTERNS (Identity) ─────────────────
CREATE TABLE IF NOT EXISTS identity_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active',
  charge INTEGER DEFAULT 5,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE identity_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own identity patterns" ON identity_patterns FOR ALL USING (auth.uid() = user_id);


-- ── WEEKLY REVIEWS ───────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  week_key TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_key)
);

ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own weekly reviews" ON weekly_reviews FOR ALL USING (auth.uid() = user_id);


-- =====================================================
-- DONE! All tables created with Row Level Security.
-- Each member can only access their own data.
-- =====================================================
