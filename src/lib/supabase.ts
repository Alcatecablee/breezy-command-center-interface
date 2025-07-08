import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "your-supabase-url";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-supabase-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// Auth helpers
export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const signIn = async (email: string, password: string) => {
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
