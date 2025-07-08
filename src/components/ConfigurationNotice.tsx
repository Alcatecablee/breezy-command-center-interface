import React from "react";
import { isSupabaseConfigured } from "../lib/supabase";

export const ConfigurationNotice: React.FC = () => {
  if (isSupabaseConfigured) return null;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-2xl w-full bg-gray-900 border border-yellow-600 rounded-lg p-8 m-6">
        <div className="text-center">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F650a7e0d23ac407b922479927bc68a9d%2F1286c7bdebf845ef9bedd75d9d3ba4c3?format=webp&width=800"
            alt="NeuroLint"
            className="w-16 h-16 mx-auto mb-6"
          />

          <h1 className="text-3xl font-bold text-white mb-4">
            NeuroLint Enterprise
          </h1>
          <h2 className="text-xl font-semibold text-yellow-400 mb-6">
            Configuration Required
          </h2>

          <div className="text-left bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Quick Setup:
            </h3>

            <div className="space-y-4">
              <div>
                <h4 className="text-white font-medium mb-2">
                  1. Create Supabase Project
                </h4>
                <p className="text-gray-400 text-sm">
                  Visit{" "}
                  <a
                    href="https://supabase.com"
                    className="text-blue-400 hover:underline"
                  >
                    supabase.com
                  </a>{" "}
                  and create a new project
                </p>
              </div>

              <div>
                <h4 className="text-white font-medium mb-2">
                  2. Set Environment Variables
                </h4>
                <div className="bg-black rounded p-3 font-mono text-sm text-green-400">
                  <div>VITE_SUPABASE_URL=your-project-url</div>
                  <div>VITE_SUPABASE_ANON_KEY=your-anon-key</div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-2">
                  3. Run Database Schema
                </h4>
                <p className="text-gray-400 text-sm">
                  Execute the SQL in{" "}
                  <code className="bg-gray-700 px-1 rounded">
                    database/schema.sql
                  </code>{" "}
                  in your Supabase SQL editor
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mb-6">
            <div className="text-blue-400 text-sm">
              <strong>📚 Full Setup Guide:</strong> Check <code>SETUP.md</code>{" "}
              for complete instructions including PayPal integration
            </div>
          </div>

          <div className="text-gray-400 text-sm">
            Once configured, refresh this page to access the full NeuroLint
            platform
          </div>
        </div>
      </div>
    </div>
  );
};
