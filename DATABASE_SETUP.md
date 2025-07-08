# 🚀 Database Setup - Quick Start

## Step 1: Run Database Schema

1. **Go to your Supabase Dashboard**
   - Visit: https://jetwhffgmohdqkuegtjh.supabase.co
   - Click "SQL Editor" in the sidebar

2. **Copy and paste this SQL code** (all at once):

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT,
  country TEXT DEFAULT 'South Africa',
  timezone TEXT DEFAULT 'Africa/Johannesburg',
  preferences JSONB DEFAULT '{
    "default_layers": [1, 2, 3, 4, 5, 6],
    "email_notifications": true,
    "analysis_history_retention": 90
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  language TEXT CHECK (language IN ('typescript', 'javascript', 'react', 'nextjs')),
  repository_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analysis Results table
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  files_analyzed INTEGER NOT NULL DEFAULT 0,
  issues_found INTEGER NOT NULL DEFAULT 0,
  issues_fixed INTEGER NOT NULL DEFAULT 0,
  layers_used INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  improvements TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  execution_time INTEGER NOT NULL DEFAULT 0,
  cache_hit_rate INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  paypal_subscription_id TEXT,
  plan_name TEXT NOT NULL,
  plan_price DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT CHECK (status IN ('active', 'cancelled', 'past_due', 'pending')) DEFAULT 'pending',
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage Tracking table
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own analysis results" ON analysis_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own analysis results" ON analysis_results FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can create own subscriptions" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON usage_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own usage records" ON usage_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, company, country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', 'South Africa')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

3. **Click "Run" to execute the SQL**

## Step 2: Test Authentication

Now you can test the app:

1. **Sign Up**: Click "Sign up" in the login form
2. **Use your email**: Enter a real email address
3. **Check email**: Look for confirmation email from Supabase
4. **Confirm**: Click the link in the email
5. **Sign In**: Return to the app and sign in

## Step 3: Enable Email Confirmations (Optional)

In Supabase Dashboard:

1. Go to Authentication > Settings
2. Toggle "Enable email confirmations" if you want
3. Customize email templates if needed

## 🎉 You're Ready!

Once the database is set up and you've created an account:

- ✅ Full user authentication
- ✅ User profiles and company info
- ✅ Analysis results storage
- ✅ Real-time database updates
- ✅ South African localization ready

## Next Steps (Optional):

1. **PayPal Integration**: Add PayPal credentials for billing
2. **Team Features**: Invite team members
3. **Analytics**: View usage patterns
4. **Custom Branding**: Customize for your company

## Test Account (For Demo):

You can create a test account with:

- **Email**: Your real email
- **Company**: Your company name
- **Password**: Strong password

The system will automatically create a user profile and you'll have access to the full NeuroLint enterprise platform!
