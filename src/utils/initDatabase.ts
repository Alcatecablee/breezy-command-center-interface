/**
 * Database initialization utility
 * Checks if required tables exist and creates them if needed
 */

import { supabase } from "../lib/supabase";

export async function checkDatabaseSetup(): Promise<{
  isSetup: boolean;
  missingTables: string[];
  error?: string;
}> {
  try {
    const requiredTables = [
      "user_profiles",
      "projects",
      "analysis_results",
      "subscriptions",
      "usage_tracking",
    ];

    const missingTables: string[] = [];

    // Check each table
    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select("*").limit(1);

      if (
        error &&
        error.message.includes("relation") &&
        error.message.includes("does not exist")
      ) {
        missingTables.push(table);
      }
    }

    return {
      isSetup: missingTables.length === 0,
      missingTables,
    };
  } catch (error) {
    return {
      isSetup: false,
      missingTables: [],
      error: error.message,
    };
  }
}

export async function initializeUserProfile(
  userId: string,
  email: string,
): Promise<void> {
  try {
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!existingProfile) {
      // Create user profile
      const { error } = await supabase.from("user_profiles").insert([
        {
          user_id: userId,
          company: "Your Company",
          country: "United States",
          preferences: {
            default_layers: [1, 2, 3, 4],
            email_notifications: true,
            analysis_history_retention: 90,
          },
        },
      ]);

      if (error) {
        console.error("Failed to create user profile:", error);
      } else {
        console.log("✅ User profile created successfully");
      }
    }
  } catch (error) {
    console.error("Error initializing user profile:", error);
  }
}
