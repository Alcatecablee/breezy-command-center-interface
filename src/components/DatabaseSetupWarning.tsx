import React, { useState, useEffect } from "react";
import { checkDatabaseSetup } from "../utils/initDatabase";

export const DatabaseSetupWarning: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<{
    isSetup: boolean;
    missingTables: string[];
    error?: string;
  } | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const checkDb = async () => {
      const status = await checkDatabaseSetup();
      setDbStatus(status);
      setShowWarning(!status.isSetup);
    };

    checkDb();
  }, []);

  if (!showWarning || !dbStatus) return null;

  return (
    <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="text-yellow-400 text-xl">⚠️</div>
        <div className="flex-1">
          <h3 className="text-yellow-400 font-semibold mb-2">
            Database Setup Required
          </h3>
          <p className="text-yellow-200 text-sm mb-3">
            Some database tables are missing. The app may not function
            correctly.
          </p>

          {dbStatus.missingTables.length > 0 && (
            <div className="mb-3">
              <div className="text-yellow-200 text-sm font-medium mb-1">
                Missing tables:
              </div>
              <div className="flex flex-wrap gap-1">
                {dbStatus.missingTables.map((table) => (
                  <span
                    key={table}
                    className="bg-yellow-800/30 text-yellow-200 px-2 py-1 rounded text-xs"
                  >
                    {table}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-black/20 rounded p-3 text-xs">
            <div className="text-yellow-200 font-medium mb-1">To fix this:</div>
            <div className="text-yellow-100">
              1. Go to your Supabase dashboard
              <br />
              2. Navigate to SQL Editor
              <br />
              3. Run the schema from{" "}
              <code className="bg-black/30 px-1 rounded">
                database/schema.sql
              </code>
            </div>
          </div>

          <button
            onClick={() => setShowWarning(false)}
            className="mt-3 text-yellow-400 hover:text-yellow-300 text-sm underline"
          >
            Dismiss (I'll set this up later)
          </button>
        </div>
      </div>
    </div>
  );
};
