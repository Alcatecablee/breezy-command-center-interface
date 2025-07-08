import { supabase } from "./supabase";

export interface PayPalPlan {
  id: string;
  name: string;
  description: string;
  pricing: {
    USD: number;
    EUR: number;
    GBP: number;
    ZAR: number;
    AUD: number;
    CAD: number;
    JPY: number;
    INR: number;
  };
  interval: "month" | "year";
  features: string[];
  popular?: boolean;
}

// Global PayPal plans with multi-currency support
export const paypalPlans: PayPalPlan[] = [
  {
    id: "neurolint-professional-monthly",
    name: "Professional",
    description: "Perfect for individual developers and small teams",
    pricing: {
      USD: 19, // $19/month
      EUR: 17, // €17/month
      GBP: 15, // £15/month
      ZAR: 349, // R349/month
      AUD: 29, // AU$29/month
      CAD: 25, // CA$25/month
      JPY: 2800, // ¥2,800/month
      INR: 1599, // ₹1,599/month
    },
    interval: "month",
    features: [
      "Unlimited code analysis",
      "All 6 layers enabled",
      "Priority support",
      "Advanced error recovery",
      "Performance optimization",
      "Email support",
    ],
  },
  {
    id: "neurolint-enterprise-monthly",
    name: "Enterprise",
    description: "For large teams and organizations",
    pricing: {
      USD: 99, // $99/month
      EUR: 89, // €89/month
      GBP: 79, // £79/month
      ZAR: 1799, // R1,799/month
      AUD: 149, // AU$149/month
      CAD: 129, // CA$129/month
      JPY: 14800, // ¥14,800/month
      INR: 8299, // ₹8,299/month
    },
    interval: "month",
    features: [
      "Everything in Professional",
      "Team collaboration",
      "Advanced analytics",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "24/7 phone support",
    ],
    popular: true,
  },
  {
    id: "neurolint-enterprise-annual",
    name: "Enterprise Annual",
    description: "Save 20% with annual billing",
    pricing: {
      USD: 990, // $990/year (2 months free)
      EUR: 890, // €890/year
      GBP: 790, // £790/year
      ZAR: 17990, // R17,990/year
      AUD: 1490, // AU$1,490/year
      CAD: 1290, // CA$1,290/year
      JPY: 148000, // ¥148,000/year
      INR: 82990, // ₹82,990/year
    },
    interval: "year",
    features: [
      "Everything in Enterprise Monthly",
      "20% discount",
      "Annual strategy review",
      "Custom training sessions",
    ],
  },
];

export const createPayPalSubscription = async (
  planId: string,
  userId: string,
) => {
  try {
    // Create subscription record in Supabase first
    const plan = paypalPlans.find((p) => p.id === planId);
    if (!plan) throw new Error("Plan not found");

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .insert([
        {
          user_id: userId,
          plan_name: plan.name,
          plan_price: plan.price,
          currency: plan.currency,
          status: "pending",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(
            Date.now() +
              (plan.interval === "year" ? 365 : 30) * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { subscription, plan };
  } catch (error) {
    console.error("Error creating PayPal subscription:", error);
    throw error;
  }
};

export const updateSubscriptionStatus = async (
  subscriptionId: string,
  paypalSubscriptionId: string,
  status: "active" | "cancelled" | "past_due",
) => {
  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      paypal_subscription_id: paypalSubscriptionId,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId)
    .select()
    .single();

  return { data, error };
};

export const cancelSubscription = async (subscriptionId: string) => {
  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId)
    .select()
    .single();

  return { data, error };
};

// Global PayPal configuration with auto-detection
export const getPayPalConfig = (
  userCurrency = "USD",
  userLocale = "en_US",
) => ({
  "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID || "",
  currency: userCurrency,
  intent: "subscription",
  "data-client-token": import.meta.env.VITE_PAYPAL_CLIENT_TOKEN || "",
  locale: userLocale,
});

// Default configuration
export const paypalConfig = getPayPalConfig();

// Currency and locale mapping for global support
export const currencyLocaleMap = {
  USD: "en_US",
  EUR: "en_GB", // or de_DE, fr_FR based on region
  GBP: "en_GB",
  ZAR: "en_ZA",
  AUD: "en_AU",
  CAD: "en_CA",
  JPY: "ja_JP",
  INR: "en_IN",
};

// Detect user's currency based on location (browser API)
export const detectUserCurrency = (): keyof typeof currencyLocaleMap => {
  try {
    // Use Intl API to detect user's region
    const userLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = userLocale.split("-")[1]?.toUpperCase();

    // Map regions to currencies
    const regionCurrencyMap: Record<string, keyof typeof currencyLocaleMap> = {
      US: "USD",
      CA: "CAD",
      GB: "GBP",
      ZA: "ZAR",
      AU: "AUD",
      JP: "JPY",
      IN: "INR",
      DE: "EUR",
      FR: "EUR",
      IT: "EUR",
      ES: "EUR",
      NL: "EUR",
    };

    return regionCurrencyMap[region] || "USD";
  } catch {
    return "USD"; // Fallback to USD
  }
};

// Global pricing helper with proper locale formatting
export const formatPrice = (
  price: number,
  currency: keyof typeof currencyLocaleMap,
) => {
  const locale = currencyLocaleMap[currency] || "en_US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(price);
};

// Get price for user's currency
export const getPriceForCurrency = (
  plan: PayPalPlan,
  currency: keyof typeof currencyLocaleMap,
) => {
  return plan.pricing[currency] || plan.pricing.USD;
};

// Note: trackUsage and getUsageStats functions are now in supabase.ts
