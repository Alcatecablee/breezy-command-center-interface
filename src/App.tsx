import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { LoginForm } from "./components/AuthComponents";
import { ConfigurationNotice } from "./components/ConfigurationNotice";
import { SimpleDemoAuth } from "./components/SimpleDemoAuth";
import EnhancedNeuroLintDashboard from "./components/EnhancedNeuroLintDashboard";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

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

function SimpleApp() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple auth check with timeout
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 3000);

    checkAuth().then(() => {
      clearTimeout(timeoutId);
    });

    return () => clearTimeout(timeoutId);
  }, []);

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
    return <SimpleDemoAuth onSuccess={() => window.location.reload()} />;
  }

  return <EnhancedNeuroLintDashboard />;
}

function App() {
  const [useSimpleAuth, setUseSimpleAuth] = useState(false);

  useEffect(() => {
    // If the app is still loading after 5 seconds, switch to simple auth
    const timer = setTimeout(() => {
      setUseSimpleAuth(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Try complex auth first, fallback to simple auth if it hangs
  if (useSimpleAuth) {
    return <SimpleApp />;
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
