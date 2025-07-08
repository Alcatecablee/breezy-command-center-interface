# NeuroLint Enterprise Setup Guide

## 🚀 Complete Database & Payment Integration

### 1. Supabase Setup

#### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for database to be ready

#### Run Database Schema

1. Go to SQL Editor in Supabase dashboard
2. Copy and paste the entire `database/schema.sql` content
3. Click "Run" to create all tables and policies

#### Get Environment Variables

```bash
# Copy and create your .env.local file
cp .env.example .env.local
```

Add your Supabase credentials:

- `VITE_SUPABASE_URL`: Found in Project Settings > API
- `VITE_SUPABASE_ANON_KEY`: Found in Project Settings > API

### 2. PayPal Setup (South Africa)

#### Create PayPal Developer Account

1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Create developer account
3. Create new app for production/sandbox

#### Configure PayPal Plans

1. In PayPal dashboard, go to Products & Plans
2. Create subscription plans matching our pricing:
   - Professional: R299/month
   - Enterprise: R999/month
   - Enterprise Annual: R9990/year

#### Add PayPal Credentials

```env
VITE_PAYPAL_CLIENT_ID=your-paypal-client-id
VITE_PAYPAL_CLIENT_TOKEN=your-paypal-client-token
```

### 3. Authentication Configuration

#### Enable Authentication

1. In Supabase Dashboard > Authentication > Settings
2. Enable email authentication
3. Configure email templates (optional)
4. Set up OAuth providers (optional):
   - Google
   - GitHub
   - Microsoft

#### Email Configuration

```sql
-- Optional: Update auth settings for South African users
UPDATE auth.config
SET email_confirm = true,
    email_change_confirm = true;
```

### 4. Row Level Security

The schema automatically sets up RLS policies that:

- Users can only see their own data
- Secure multi-tenant isolation
- Proper subscription access control

### 5. Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The app will be available at http://localhost:3000
```

### 6. Production Deployment

#### Vercel Deployment

1. Connect your GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy!

#### Environment Variables for Production

```env
VITE_SUPABASE_URL=your-production-supabase-url
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_PAYPAL_CLIENT_ID=your-production-paypal-client-id
VITE_APP_URL=https://your-domain.com
```

## 🌍 Global PayPal Integration

### Why PayPal Over Stripe

- **Global Reach**: PayPal works in 200+ countries vs Stripe's limited availability
- **Emerging Markets**: Full support for Africa, parts of Asia, Latin America
- **Local Currencies**: 8 major currencies supported natively
- **No Geographic Restrictions**: Works everywhere PayPal operates

### Supported Currencies & Regions

- **🇺🇸 USD**: United States, Global default
- **🇪🇺 EUR**: European Union, Germany, France, etc.
- **🇬🇧 GBP**: United Kingdom
- **🇿🇦 ZAR**: South Africa (Stripe doesn't support)
- **🇦🇺 AUD**: Australia
- **🇨🇦 CAD**: Canada
- **🇯🇵 JPY**: Japan
- **🇮🇳 INR**: India

### Automatic Features

- **Currency Detection**: Auto-detects user's region
- **Local Pricing**: Optimized pricing for each market
- **Tax Compliance**: PayPal handles VAT/GST automatically
- **Currency Conversion**: Real-time exchange rates

## 📊 Database Schema Overview

### Tables Created:

- `user_profiles` - Extended user information
- `projects` - User's code projects
- `analysis_results` - NeuroLint analysis history
- `subscriptions` - PayPal subscription management
- `usage_tracking` - Billing and analytics data

### Key Features:

- **Row Level Security** - Complete data isolation
- **Real-time subscriptions** - Live updates via Supabase
- **Audit trail** - Complete usage tracking
- **Scalable architecture** - Ready for enterprise growth

## 🔐 Security Features

- JWT-based authentication via Supabase
- Row Level Security for data isolation
- Encrypted data at rest
- HTTPS-only communication
- PayPal secure payment processing

## ��� Analytics & Billing

### Usage Tracking

The system tracks:

- Analysis runs
- Layer usage
- Performance metrics
- Feature adoption

### Subscription Management

- Automatic billing via PayPal
- Subscription status tracking
- Usage-based limits
- Upgrade/downgrade flows

## 🛠️ Development Tools

### Database Management

```bash
# View real-time database changes
npx supabase start
npx supabase db reset # Reset to schema
```

### Payment Testing

Use PayPal Sandbox for testing:

- Test credit cards
- Subscription flows
- Webhook handling

## 🚀 Ready for Production

Your NeuroLint enterprise platform now includes:

- ✅ Full user authentication
- ✅ Real-time database with Supabase
- ✅ South African PayPal integration
- ✅ Enterprise-grade security
- ✅ Scalable architecture
- ✅ Usage tracking & analytics

The mock data has been completely replaced with real database functionality!
