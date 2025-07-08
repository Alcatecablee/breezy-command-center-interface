import React, { useState, useEffect } from "react";
import { testSupabaseConnection } from "../lib/supabase";

export const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<"checking" | "connected" | "failed">(
    "checking",
  );
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await testSupabaseConnection();
        setStatus(isConnected ? "connected" : "failed");
        if (!isConnected) {
          setError("Cannot connect to Supabase");
        }
      } catch (err) {
        setStatus("failed");
        setError(
          err instanceof Error ? err.message : "Unknown connection error",
        );
      }
    };

    checkConnection();
  }, []);

  if (status === "checking") {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-md text-sm">
        🔍 Checking connection...
      </div>
    );
  }

  if (status === "connected") {
    return (
      <div className="fixed bottom-4 right-4 bg-green-600 text-white px-3 py-2 rounded-md text-sm">
        ✅ Connected to Supabase
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-600 text-white px-3 py-2 rounded-md text-sm max-w-xs">
      ❌ Connection failed: {error}
    </div>
  );
};
