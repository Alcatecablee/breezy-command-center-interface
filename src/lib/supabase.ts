import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Export a flag to check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create supabase client only if configured, otherwise use null
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          "x-client-info": "neurolint-web-dashboard",
        },
      },
    })
  : null;

// Add connection test function
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Supabase connection test failed:", error);
      return false;
    }
    console.log("✅ Supabase connection successful");
    return true;
  } catch (error) {
    console.error("Supabase connection test error:", error);
    return false;
  }
};

// Database Types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  company?: string;
  subscription_tier: "free" | "professional" | "enterprise";
  subscription_status: "active" | "inactive" | "past_due" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  language: "typescript" | "javascript" | "react" | "nextjs";
  created_at: string;
  updated_at: string;
}

export interface AnalysisResult {
  id: string;
  user_id: string;
  project_id?: string;
  files_analyzed: number;
  issues_found: number;
  issues_fixed: number;
  layers_used: number[];
  improvements: string[];
  execution_time: number;
  cache_hit_rate: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  paypal_subscription_id?: string;
  plan_name: string;
  plan_price: number;
  currency: string;
  status: "active" | "cancelled" | "past_due";
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  company: string;
  country: string;
  timezone: string;
  preferences: {
    default_layers: number[];
    email_notifications: boolean;
    analysis_history_retention: number;
  };
  created_at: string;
  updated_at: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  action: string;
  metadata: any;
  created_at: string;
}

// Auth helpers
export const getCurrentUser = async () => {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const signIn = async (email: string, password: string) => {
  if (!supabase)
    return { data: null, error: { message: "Supabase not configured" } };
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUp = async (
  email: string,
  password: string,
  metadata?: any,
) => {
  if (!supabase)
    return { data: null, error: { message: "Supabase not configured" } };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  return { data, error };
};

export const signOut = async () => {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Database helpers
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  return { data, error };
};

export const getProjects = async (userId: string) => {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  return { data, error };
};

export const getAnalysisResults = async (userId: string, limit = 10) => {
  const { data, error } = await supabase
    .from("analysis_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data, error };
};

export const createAnalysisResult = async (
  result: Omit<AnalysisResult, "id" | "created_at">,
) => {
  const { data, error } = await supabase
    .from("analysis_results")
    .insert([result])
    .select()
    .single();

  return { data, error };
};

export const getSubscription = async (userId: string) => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  return { data, error };
};

// Usage tracking for billing and analytics
export const trackUsage = async (
  userId: string,
  action: string,
  metadata?: any,
) => {
  const { data, error } = await supabase.from("usage_tracking").insert([
    {
      user_id: userId,
      action,
      metadata,
      created_at: new Date().toISOString(),
    },
  ]);

  return { data, error };
};

export const getUsageStats = async (
  userId: string,
  startDate: string,
  endDate: string,
) => {
  const { data, error } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  return { data, error };
};
