import React, { useState } from "react";
import { supabase } from "../lib/supabase";

export const SimpleDemoAuth: React.FC<{ onSuccess: () => void }> = ({
  onSuccess,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }

      onSuccess();
    } catch (error: any) {
      setError(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-lg p-8 m-6">
        <div className="text-center mb-8">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F650a7e0d23ac407b922479927bc68a9d%2F1286c7bdebf845ef9bedd75d9d3ba4c3?format=webp&width=800"
            alt="NeuroLint"
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-white mb-2">
            Welcome to NeuroLint
          </h1>
          <p className="text-gray-400">
            {isLogin ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-white"
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-600/30 rounded-md p-3">
              <div className="text-red-400 text-sm">{error}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-medium py-2 px-4 rounded-md hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 transition-colors"
          >
            {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-gray-400 hover:text-white text-sm"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </form>

        {!isLogin && (
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded-md">
            <div className="text-blue-400 text-sm">
              <strong>Note:</strong> Some features may be limited until the
              database is fully set up.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
