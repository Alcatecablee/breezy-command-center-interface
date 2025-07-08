import React from "react";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { LoginForm } from "./components/AuthComponents";
import EnhancedNeuroLintDashboard from "./components/EnhancedNeuroLintDashboard";

function AppContent() {
  const { user, loading } = useAuth();

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
