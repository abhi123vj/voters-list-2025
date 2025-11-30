import React, { useEffect, useState } from "react";
import initSqlJs from "sql.js";
import type { Database, QueryExecResult } from "sql.js";

interface Voter {
  [key: string]: any;
}

const App: React.FC = () => {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDatabase = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Loading SQL.js...");
        const SQL = await initSqlJs({
          locateFile: (file) => {
            console.log("Looking for:", file);
            return `/${file}`;
          },
        });

        console.log("Fetching database...");
        const response = await fetch("/voters_database.db");

        if (!response.ok) {
          throw new Error(
            `Failed to fetch database: ${response.status} ${response.statusText}`
          );
        }

        const buffer = await response.arrayBuffer();
        console.log("Database loaded, size:", buffer.byteLength);

        const db: Database = new SQL.Database(new Uint8Array(buffer));

        console.log("Executing query...");
        const result: QueryExecResult[] = db.exec(
          "SELECT * FROM G02053_022_001"
        );

        if (result.length > 0) {
          const { columns, values } = result[0];
          const formatted: Voter[] = values.map((row) =>
            row.reduce((obj, val, idx) => {
              obj[columns[idx]] = val;
              return obj;
            }, {} as Voter)
          );
          setVoters(formatted);
          console.log("Loaded", formatted.length, "voters");
        } else {
          setError("No data returned from query");
        }

        db.close();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("Error loading database:", err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    loadDatabase();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Electoral Roll - Voter List
          </h1>
          <p className="text-gray-600 mt-1">
            Complete voter database with detailed information
          </p>
        </div>

        {loading && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-6 py-4 rounded-lg">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="font-medium">Loading database...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg">
            <p className="font-semibold mb-2">Error: {error}</p>
            <div className="mt-4 text-sm">
              <p className="font-semibold mb-2">Checklist:</p>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                <li>
                  Is{" "}
                  <code className="bg-red-100 px-1 rounded">sql-wasm.wasm</code>{" "}
                  in the{" "}
                  <code className="bg-red-100 px-1 rounded">public/</code>{" "}
                  folder?
                </li>
                <li>
                  Is{" "}
                  <code className="bg-red-100 px-1 rounded">
                    voters_database.db
                  </code>{" "}
                  in the{" "}
                  <code className="bg-red-100 px-1 rounded">public/</code>{" "}
                  folder?
                </li>
                <li>
                  Did you run{" "}
                  <code className="bg-red-100 px-1 rounded">
                    npm install sql.js
                  </code>
                  ?
                </li>
                <li>Check the browser console for more details</li>
              </ul>
            </div>
          </div>
        )}

        {!loading && !error && voters.length > 0 && (
          <div>
            <div className="bg-white rounded-lg shadow-sm px-6 py-4 mb-6">
              <p className="text-sm text-gray-600">
                Total{" "}
                <span className="font-semibold text-gray-900">
                  {voters.length}
                </span>{" "}
                voters
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {voters.map((voter) => (
                <div
                  key={voter.epic_no}
                  className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all hover:border-blue-300"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
                    <h3
                      className="text-white text-sm font-semibold truncate"
                      title={voter.name}
                    >
                      {voter.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        voter.sex_age?.startsWith("M")
                          ? "bg-blue-100 text-blue-800"
                          : "bg-pink-100 text-pink-800"
                      }`}
                    >
                      {voter.sex_age}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Guardian Name */}
                    <div>
                      <p className="text-xs text-gray-500">Guardian's Name</p>
                      <p
                        className="text-sm text-gray-900 truncate"
                        title={voter.fh_name}
                      >
                        {voter.fh_name}
                      </p>
                    </div>

                    {/* Address spanning two columns */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="col-span-2">
                        <p className="text-gray-500 font-medium mb-1">
                          Address
                        </p>
                        <p className="text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                          {voter.house_no}, {voter.house_name}
                        </p>
                      </div>
                    </div>

                    {/* EPIC ID */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-xs text-gray-500">EPIC No.</p>
                      <span className="text-xs text-blue-700 font-mono font-semibold bg-blue-50 px-2 py-1.5 rounded">
                        {voter.epic_no}
                      </span>
                    </div>

                    {/* SL Number at the bottom right */}
                    <div className="flex justify-end">
                      <span className="text-xs text-gray-400 font-medium">
                        SL #{voter.sl_no}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && voters.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-4 rounded-lg">
            <p className="font-medium">No voters found in the database</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
