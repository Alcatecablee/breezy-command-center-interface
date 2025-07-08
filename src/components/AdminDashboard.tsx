import React, { useState, useEffect } from "react";
import {
  supabase,
  isSupabaseConfigured,
  testSupabaseConnection,
} from "../lib/supabase";

interface ConfigStatus {
  supabase: {
    configured: boolean;
    connected: boolean;
    error?: string;
  };
  paypal: {
    configured: boolean;
    error?: string;
  };
  api: {
    running: boolean;
    error?: string;
  };
  environment: {
    complete: boolean;
    missing: string[];
  };
}

interface EnvironmentVariable {
  key: string;
  value: string;
  description: string;
  required: boolean;
  sensitive: boolean;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "supabase" | "paypal" | "environment" | "deployment"
  >("overview");
  const [configStatus, setConfigStatus] = useState<ConfigStatus>({
    supabase: { configured: false, connected: false },
    paypal: { configured: false },
    api: { running: false },
    environment: { complete: false, missing: [] },
  });

  const [envVars, setEnvVars] = useState<EnvironmentVariable[]>([
    {
      key: "VITE_SUPABASE_URL",
      value: "",
      description: "Supabase project URL",
      required: true,
      sensitive: false,
    },
    {
      key: "VITE_SUPABASE_ANON_KEY",
      value: "",
      description: "Supabase anonymous key",
      required: true,
      sensitive: true,
    },
    {
      key: "VITE_PAYPAL_CLIENT_ID",
      value: "",
      description: "PayPal Client ID",
      required: true,
      sensitive: true,
    },
    {
      key: "VITE_PAYPAL_CLIENT_TOKEN",
      value: "",
      description: "PayPal Client Token",
      required: false,
      sensitive: true,
    },
    {
      key: "VITE_NEUROLINT_API_URL",
      value: "",
      description: "NeuroLint API URL",
      required: false,
      sensitive: false,
    },
    {
      key: "FRONTEND_URL",
      value: "",
      description: "Frontend URL for CORS",
      required: false,
      sensitive: false,
    },
  ]);

  const [supabaseConfig, setSupabaseConfig] = useState({
    url: "",
    anonKey: "",
    serviceKey: "",
  });

  const [paypalConfig, setPaypalConfig] = useState({
    clientId: "",
    clientSecret: "",
    mode: "sandbox" as "sandbox" | "live",
  });

  const [deploymentConfig, setDeploymentConfig] = useState({
    domain: "",
    apiUrl: "",
    environment: "development" as "development" | "production",
  });

  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  // Load current environment variables
  useEffect(() => {
    loadEnvironmentVariables();
    checkSystemStatus();
  }, []);

  const loadEnvironmentVariables = () => {
    const updatedEnvVars = envVars.map((envVar) => ({
      ...envVar,
      value: (import.meta.env as any)[envVar.key] || "",
    }));
    setEnvVars(updatedEnvVars);

    // Update specific configs
    setSupabaseConfig({
      url: import.meta.env.VITE_SUPABASE_URL || "",
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
      serviceKey: "",
    });

    setPaypalConfig({
      clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "",
      clientSecret: "",
      mode: "sandbox",
    });

    setDeploymentConfig({
      domain: window.location.origin,
      apiUrl: import.meta.env.VITE_NEUROLINT_API_URL || "http://localhost:8001",
      environment: import.meta.env.MODE || "development",
    });
  };

  const checkSystemStatus = async () => {
    setLoading(true);
    const newStatus: ConfigStatus = {
      supabase: { configured: false, connected: false },
      paypal: { configured: false },
      api: { running: false },
      environment: { complete: false, missing: [] },
    };

    // Check Supabase
    try {
      newStatus.supabase.configured = isSupabaseConfigured;
      if (isSupabaseConfigured) {
        newStatus.supabase.connected = await testSupabaseConnection();
      }
    } catch (error: any) {
      newStatus.supabase.error = error.message;
    }

    // Check PayPal
    newStatus.paypal.configured = !!import.meta.env.VITE_PAYPAL_CLIENT_ID;

    // Check API
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NEUROLINT_API_URL || "http://localhost:8001"}/api/health`,
      );
      newStatus.api.running = response.ok;
    } catch (error: any) {
      newStatus.api.error = error.message;
    }

    // Check environment completeness
    const missing = envVars
      .filter((env) => env.required && !env.value)
      .map((env) => env.key);
    newStatus.environment.missing = missing;
    newStatus.environment.complete = missing.length === 0;

    setConfigStatus(newStatus);
    setLoading(false);
  };

  const testSupabaseConnection = async () => {
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
      setTestResults({
        supabase: { success: false, error: "URL and Anon Key required" },
      });
      return;
    }

    setLoading(true);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const testSupabase = createClient(
        supabaseConfig.url,
        supabaseConfig.anonKey,
      );

      const { data, error } = await testSupabase.auth.getSession();

      if (error) throw error;

      setTestResults({
        supabase: {
          success: true,
          message: "Connection successful",
          data: { url: supabaseConfig.url },
        },
      });
    } catch (error: any) {
      setTestResults({
        supabase: {
          success: false,
          error: error.message,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const testPayPalConnection = async () => {
    if (!paypalConfig.clientId) {
      setTestResults({
        paypal: { success: false, error: "Client ID required" },
      });
      return;
    }

    setLoading(true);
    try {
      // Test PayPal API access
      const response = await fetch(`https://api.paypal.com/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "en_US",
          Authorization: `Basic ${btoa(`${paypalConfig.clientId}:${paypalConfig.clientSecret}`)}`,
        },
        body: "grant_type=client_credentials",
      });

      if (response.ok) {
        setTestResults({
          paypal: {
            success: true,
            message: "PayPal connection successful",
            data: { mode: paypalConfig.mode },
          },
        });
      } else {
        throw new Error(`PayPal API error: ${response.status}`);
      }
    } catch (error: any) {
      setTestResults({
        paypal: {
          success: false,
          error: error.message,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const generateEnvironmentFile = () => {
    const envContent = envVars
      .filter((env) => env.value)
      .map((env) => `${env.key}=${env.value}`)
      .join("\n");

    const blob = new Blob([envContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".env.local";
    a.click();
    URL.revokeObjectURL(url);
  };

  const initializeDatabase = async () => {
    if (!configStatus.supabase.connected) {
      alert("Please configure and test Supabase connection first");
      return;
    }

    setLoading(true);
    try {
      // This would run the database schema
      alert(
        "Database initialization feature would run the schema.sql here. For now, please run the schema manually in your Supabase SQL editor.",
      );
    } catch (error: any) {
      alert(`Database initialization failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const StatusIndicator = ({
    status,
    label,
  }: {
    status: boolean;
    label: string;
  }) => (
    <div className="flex items-center space-x-2">
      <div
        className={`w-3 h-3 rounded-full ${status ? "bg-green-500" : "bg-red-500"}`}
      />
      <span className={status ? "text-green-400" : "text-red-400"}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white">
            NeuroLint Admin Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Configure your monetization setup
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-6">
          {[
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "supabase", label: "Supabase", icon: "🗄️" },
            { id: "paypal", label: "PayPal", icon: "💳" },
            { id: "environment", label: "Environment", icon: "⚙️" },
            { id: "deployment", label: "Deployment", icon: "🚀" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">System Status</h2>
                <button
                  onClick={checkSystemStatus}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {loading ? "Checking..." : "Refresh Status"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Supabase Database
                  </h3>
                  <StatusIndicator
                    status={
                      configStatus.supabase.configured &&
                      configStatus.supabase.connected
                    }
                    label={
                      configStatus.supabase.configured
                        ? configStatus.supabase.connected
                          ? "Connected"
                          : "Not Connected"
                        : "Not Configured"
                    }
                  />
                  {configStatus.supabase.error && (
                    <p className="text-red-400 text-xs mt-1">
                      {configStatus.supabase.error}
                    </p>
                  )}
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    PayPal Integration
                  </h3>
                  <StatusIndicator
                    status={configStatus.paypal.configured}
                    label={
                      configStatus.paypal.configured
                        ? "Configured"
                        : "Not Configured"
                    }
                  />
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    API Server
                  </h3>
                  <StatusIndicator
                    status={configStatus.api.running}
                    label={configStatus.api.running ? "Running" : "Not Running"}
                  />
                  {configStatus.api.error && (
                    <p className="text-red-400 text-xs mt-1">
                      {configStatus.api.error}
                    </p>
                  )}
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Environment
                  </h3>
                  <StatusIndicator
                    status={configStatus.environment.complete}
                    label={
                      configStatus.environment.complete
                        ? "Complete"
                        : `${configStatus.environment.missing.length} missing`
                    }
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Quick Setup Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab("environment")}
                  className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-left"
                >
                  <div className="text-lg font-medium">
                    ⚙️ Configure Environment
                  </div>
                  <div className="text-sm text-blue-200 mt-1">
                    Set up all required environment variables
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("supabase")}
                  className="p-4 bg-green-600 hover:bg-green-700 rounded-lg text-left"
                >
                  <div className="text-lg font-medium">🗄️ Setup Database</div>
                  <div className="text-sm text-green-200 mt-1">
                    Configure Supabase connection and schema
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("paypal")}
                  className="p-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-left"
                >
                  <div className="text-lg font-medium">
                    💳 PayPal Integration
                  </div>
                  <div className="text-sm text-yellow-200 mt-1">
                    Configure payment processing
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Supabase Tab */}
        {activeTab === "supabase" && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Supabase Configuration
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Supabase URL
                  </label>
                  <input
                    type="text"
                    value={supabaseConfig.url}
                    onChange={(e) =>
                      setSupabaseConfig({
                        ...supabaseConfig,
                        url: e.target.value,
                      })
                    }
                    placeholder="https://your-project.supabase.co"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Anonymous Key
                  </label>
                  <input
                    type="password"
                    value={supabaseConfig.anonKey}
                    onChange={(e) =>
                      setSupabaseConfig({
                        ...supabaseConfig,
                        anonKey: e.target.value,
                      })
                    }
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={testSupabaseConnection}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                  >
                    {loading ? "Testing..." : "Test Connection"}
                  </button>

                  <button
                    onClick={initializeDatabase}
                    disabled={loading || !configStatus.supabase.connected}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                  >
                    Initialize Database
                  </button>
                </div>

                {testResults.supabase && (
                  <div
                    className={`p-4 rounded-lg ${testResults.supabase.success ? "bg-green-900 border border-green-600" : "bg-red-900 border border-red-600"}`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{testResults.supabase.success ? "✅" : "❌"}</span>
                      <span className="font-medium">
                        {testResults.supabase.success ? "Success" : "Error"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">
                      {testResults.supabase.success
                        ? testResults.supabase.message
                        : testResults.supabase.error}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Database Schema Instructions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Database Setup Instructions
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-300">
                <li>
                  Create a new Supabase project at{" "}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    className="text-blue-400 underline"
                  >
                    supabase.com
                  </a>
                </li>
                <li>
                  Go to Settings → API and copy your project URL and anon key
                </li>
                <li>Test the connection using the form above</li>
                <li>Go to SQL Editor in your Supabase dashboard</li>
                <li>
                  Run the schema from{" "}
                  <code className="bg-gray-700 px-2 py-1 rounded">
                    database/schema.sql
                  </code>
                </li>
                <li>Enable Row Level Security on all tables</li>
              </ol>
            </div>
          </div>
        )}

        {/* PayPal Tab */}
        {activeTab === "paypal" && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                PayPal Configuration
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Environment
                  </label>
                  <select
                    value={paypalConfig.mode}
                    onChange={(e) =>
                      setPaypalConfig({
                        ...paypalConfig,
                        mode: e.target.value as "sandbox" | "live",
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="live">Live (Production)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={paypalConfig.clientId}
                    onChange={(e) =>
                      setPaypalConfig({
                        ...paypalConfig,
                        clientId: e.target.value,
                      })
                    }
                    placeholder="AQkquBDf1zctJOWGKWUEtKXm6qVhueUEMvXO_..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    value={paypalConfig.clientSecret}
                    onChange={(e) =>
                      setPaypalConfig({
                        ...paypalConfig,
                        clientSecret: e.target.value,
                      })
                    }
                    placeholder="EGnHDxD_qRPdaLdZz8iCr8N7_..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <button
                  onClick={testPayPalConnection}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {loading ? "Testing..." : "Test PayPal Connection"}
                </button>

                {testResults.paypal && (
                  <div
                    className={`p-4 rounded-lg ${testResults.paypal.success ? "bg-green-900 border border-green-600" : "bg-red-900 border border-red-600"}`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{testResults.paypal.success ? "✅" : "❌"}</span>
                      <span className="font-medium">
                        {testResults.paypal.success ? "Success" : "Error"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">
                      {testResults.paypal.success
                        ? testResults.paypal.message
                        : testResults.paypal.error}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* PayPal Setup Instructions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                PayPal Setup Instructions
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-300">
                <li>
                  Create a PayPal Business account at{" "}
                  <a
                    href="https://developer.paypal.com"
                    target="_blank"
                    className="text-blue-400 underline"
                  >
                    developer.paypal.com
                  </a>
                </li>
                <li>
                  Create a new application in the PayPal Developer Dashboard
                </li>
                <li>Copy your Client ID and Client Secret</li>
                <li>Set up webhook endpoints for subscription management</li>
                <li>Configure your pricing plans and subscription products</li>
                <li>Test with sandbox credentials before going live</li>
              </ol>
            </div>
          </div>
        )}

        {/* Environment Tab */}
        {activeTab === "environment" && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Environment Variables</h2>
                <button
                  onClick={generateEnvironmentFile}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
                >
                  Download .env.local
                </button>
              </div>

              <div className="space-y-4">
                {envVars.map((envVar, index) => (
                  <div
                    key={envVar.key}
                    className="border border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-400">
                        {envVar.key}
                      </label>
                      <span
                        className={`text-xs px-2 py-1 rounded ${envVar.required ? "bg-red-900 text-red-200" : "bg-gray-700 text-gray-300"}`}
                      >
                        {envVar.required ? "Required" : "Optional"}
                      </span>
                    </div>
                    <input
                      type={envVar.sensitive ? "password" : "text"}
                      value={envVar.value}
                      onChange={(e) => {
                        const newEnvVars = [...envVars];
                        newEnvVars[index].value = e.target.value;
                        setEnvVars(newEnvVars);
                      }}
                      placeholder={`Enter ${envVar.key}`}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {envVar.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Deployment Tab */}
        {activeTab === "deployment" && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Deployment Configuration
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Domain
                  </label>
                  <input
                    type="text"
                    value={deploymentConfig.domain}
                    onChange={(e) =>
                      setDeploymentConfig({
                        ...deploymentConfig,
                        domain: e.target.value,
                      })
                    }
                    placeholder="https://neurolint.yourdomain.com"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    API URL
                  </label>
                  <input
                    type="text"
                    value={deploymentConfig.apiUrl}
                    onChange={(e) =>
                      setDeploymentConfig({
                        ...deploymentConfig,
                        apiUrl: e.target.value,
                      })
                    }
                    placeholder="https://api.neurolint.yourdomain.com"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Environment
                  </label>
                  <select
                    value={deploymentConfig.environment}
                    onChange={(e) =>
                      setDeploymentConfig({
                        ...deploymentConfig,
                        environment: e.target.value as
                          | "development"
                          | "production",
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="development">Development</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Deployment Instructions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Deployment Options</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-blue-400 mb-2">
                    📦 Vercel (Recommended)
                  </h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Connect GitHub repository</li>
                    <li>• Auto-deploy on push</li>
                    <li>• Built-in environment variables</li>
                    <li>• Free SSL certificates</li>
                  </ul>
                </div>

                <div className="border border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-green-400 mb-2">
                    🌐 Netlify
                  </h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Drag and drop deployment</li>
                    <li>• Form handling</li>
                    <li>• Edge functions</li>
                    <li>• Global CDN</li>
                  </ul>
                </div>

                <div className="border border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-400 mb-2">
                    ☁️ AWS Amplify
                  </h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Full AWS integration</li>
                    <li>• Scalable hosting</li>
                    <li>• Custom domains</li>
                    <li>• CI/CD pipeline</li>
                  </ul>
                </div>

                <div className="border border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-purple-400 mb-2">
                    🐳 Docker
                  </h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Self-hosted option</li>
                    <li>• Container orchestration</li>
                    <li>• Custom infrastructure</li>
                    <li>• Full control</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
