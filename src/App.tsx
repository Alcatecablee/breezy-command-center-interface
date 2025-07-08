import React from "react";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { LoginForm } from "./components/AuthComponents";
import { ConfigurationNotice } from "./components/ConfigurationNotice";
import { ConnectionStatus } from "./components/ConnectionStatus";
import EnhancedNeuroLintDashboard from "./components/EnhancedNeuroLintDashboard";
import { isSupabaseConfigured } from "./lib/supabase";

function AppContent() {
  const { user, loading } = useAuth();

  // Show configuration notice if Supabase is not set up
  if (!isSupabaseConfigured) {
    return <ConfigurationNotice />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading NeuroLint...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return <EnhancedNeuroLintDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
