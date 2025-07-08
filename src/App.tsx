import React, { useState } from "react";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { LoginForm } from "./components/AuthComponents";
import { ConfigurationNotice } from "./components/ConfigurationNotice";
import { ConnectionStatus } from "./components/ConnectionStatus";
import EnhancedNeuroLintDashboard from "./components/EnhancedNeuroLintDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { isSupabaseConfigured } from "./lib/supabase";

function AppContent() {
  const [showAdmin, setShowAdmin] = useState(() => {
    // Always show admin by default for setup, regardless of Supabase config
    return true;
  });
  const { user, loading } = useAuth();

  // Admin Dashboard Access
  if (showAdmin) {
    return (
      <div>
        <AdminDashboard />
        {isSupabaseConfigured && (
          <div className="fixed bottom-4 right-4">
            <button
              onClick={() => setShowAdmin(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white shadow-lg"
            >
              Exit Admin
            </button>
          </div>
        )}
      </div>
    );
  }

  // Show configuration notice if Supabase is not set up
  if (!isSupabaseConfigured) {
    return (
      <div>
        <ConfigurationNotice />
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setShowAdmin(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white shadow-lg"
          >
            Admin Setup
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading NeuroLint...</div>
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setShowAdmin(true)}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white shadow-lg"
          >
            Admin Panel
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <LoginForm />
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setShowAdmin(true)}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white shadow-lg"
          >
            Admin Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <EnhancedNeuroLintDashboard />
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => setShowAdmin(true)}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white shadow-lg"
        >
          Admin
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <ConnectionStatus />
    </AuthProvider>
  );
}

export default App;
