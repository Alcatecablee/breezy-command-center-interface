import { supabase } from "./supabase";

export interface PayPalPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: "USD" | "ZAR"; // Supporting both USD and South African Rand
  interval: "month" | "year";
  features: string[];
  popular?: boolean;
}

// PayPal plans optimized for South African market
export const paypalPlans: PayPalPlan[] = [
  {
    id: "neurolint-professional-monthly-zar",
    name: "Professional",
    description: "Perfect for individual developers and small teams",
    price: 299, // ZAR per month
    currency: "ZAR",
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
    id: "neurolint-enterprise-monthly-zar",
    name: "Enterprise",
    description: "For large teams and organizations",
    price: 999, // ZAR per month
    currency: "ZAR",
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
    id: "neurolint-enterprise-annual-zar",
    name: "Enterprise Annual",
    description: "Save 20% with annual billing",
    price: 9990, // ZAR per year (2 months free)
    currency: "ZAR",
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

// PayPal configuration for South Africa
export const paypalConfig = {
  "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
  currency: "ZAR", // South African Rand
  intent: "subscription",
  "data-client-token": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_TOKEN || "",
  locale: "en_ZA", // South African English
};

// Pricing helper for currency display
export const formatPrice = (price: number, currency: "USD" | "ZAR") => {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: currency,
  }).format(price);
};

// Note: trackUsage and getUsageStats functions are now in supabase.ts
