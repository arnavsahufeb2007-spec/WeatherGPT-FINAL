-- ==============================================================================
-- WeatherGPT Supabase PostgreSQL Database Schema & Row Level Security (RLS)
-- ==============================================================================

-- 1. Profiles Table (Private per authenticated user)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'Free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- 2. Conversations Table (User-owned chat sessions)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Weather Discussion',
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON public.conversations(user_id, updated_at DESC);

-- 3. Conversation Messages Table
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  language TEXT,
  is_ai_generated BOOLEAN DEFAULT false,
  context JSONB,
  weather_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation messages"
  ON public.conversation_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation messages"
  ON public.conversation_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation messages"
  ON public.conversation_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversation messages"
  ON public.conversation_messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.conversation_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id
  ON public.conversation_messages(user_id);

-- 4. Saved Favorite Locations Table
CREATE TABLE IF NOT EXISTS public.saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT,
  country_code TEXT,
  admin1 TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_user_location UNIQUE (user_id, latitude, longitude)
);

ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved locations"
  ON public.saved_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved locations"
  ON public.saved_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved locations"
  ON public.saved_locations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved locations"
  ON public.saved_locations FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_locations_user_id
  ON public.saved_locations(user_id);

-- 5. User Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  preferred_language TEXT DEFAULT 'en',
  is_fahrenheit BOOLEAN DEFAULT false,
  theme TEXT DEFAULT 'dark',
  voice_input_language TEXT DEFAULT 'auto',
  voice_output_language TEXT DEFAULT 'auto',
  auto_speak BOOLEAN DEFAULT true,
  speech_rate DOUBLE PRECISION DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON public.user_preferences(user_id);

-- 6. Trigger to automatically provision public.profiles on auth.users creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    'Free'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
