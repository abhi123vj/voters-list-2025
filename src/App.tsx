import React, { useEffect, useState } from "react";
import initSqlJs from "sql.js";
import Fuse from "fuse.js";
import type { Database, QueryExecResult } from "sql.js";

interface Voter {
  [key: string]: any;
}

const App: React.FC = () => {
  const tableList = [
    "G02053_022_001",
    "G02053_022_002",
    "G02053_021_001",
    "G02053_021_002",
    "G02053_024_001",
    "G02053_024_002",
  ];



  const [localBody, setLocalBody] = useState("G02053");
  const [ward, setWard] = useState("022");
  const [polling, setPolling] = useState("001");

  const [voters, setVoters] = useState<Voter[]>([]);
  const [dbInstance, setDbInstance] = useState<Database | null>(null);
  const [fuse, setFuse] = useState<Fuse<Voter> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("name");
  const [enableFuzzy, setEnableFuzzy] = useState(true);

  const localBodies = [...new Set(tableList.map((t) => t.split("_")[0]))];

  const wards = [
    ...new Set(
      tableList
        .filter((t) => t.startsWith(localBody))
        .map((t) => t.split("_")[1])
    ),
  ];

  const pollingStations = [
    ...new Set(
      tableList
        .filter((t) => t.startsWith(`${localBody}_${ward}`))
        .map((t) => t.split("_")[2])
    ),
  ];

  const selectedTable = `${localBody}_${ward}_${polling}`;

  // ----------------------------------------
  // Load SQLite Database
  // ----------------------------------------
  useEffect(() => {
    const loadDatabase = async () => {
      try {
        setLoading(true);
        setError(null);

        const SQL = await initSqlJs({
          locateFile: (file) => `/${file}`,
        });

        const response = await fetch("/voters_database.db");
        if (!response.ok) throw new Error("Could not load DB");

        const buffer = await response.arrayBuffer();
        const db = new SQL.Database(new Uint8Array(buffer));
        setDbInstance(db);

        const result = db.exec(`SELECT * FROM ${selectedTable}`);

        if (result.length === 0) throw new Error("No data found");

        const { columns, values } = result[0];

        const formatted: Voter[] = values.map((row) =>
          row.reduce((obj, val, idx) => {
            obj[columns[idx]] = val;
            return obj;
          }, {} as Voter)
        );

        setVoters(formatted);

        //----------------------------------------
        // Initialize Fuzzy Search Engine
        //----------------------------------------
        const fuseInstance = new Fuse(formatted, {
          keys: [
            { name: "name", weight: 0.5 },
            { name: "fh_name", weight: 0.3 },
            { name: "house_name", weight: 0.2 },
            { name: "epic_no", weight: 0.4 },
          ],
          threshold: 0.3,
          distance: 100,
          includeScore: false,
        });

        setFuse(fuseInstance);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    loadDatabase();
  }, []);

  // ----------------------------------------
  // Run SQL or Fuzzy Search
  // ----------------------------------------
  const runSearch = () => {
    if (!dbInstance) return;

    const trimmed = search.trim();

    if (!trimmed) {
      // Reset to entire DB
      const result = dbInstance.exec(`SELECT * FROM ${selectedTable}`);
      if (result.length > 0) {
        const { columns, values } = result[0];
        const formatted = values.map((row) =>
          row.reduce((obj, val, idx) => {
            obj[columns[idx]] = val;
            return obj;
          }, {} as Voter)
        );
        setVoters(formatted);
      }
      return;
    }

    // -----------------------------
    // Fuzzy Search
    // -----------------------------
    if (enableFuzzy && fuse) {
      const results = fuse.search(trimmed);
      setVoters(results.map((r) => r.item));
      return;
    }

    // -----------------------------
    // SQL LIKE search
    // -----------------------------
    const query = `
      SELECT * FROM ${selectedTable}
      WHERE ${searchField} LIKE '%${trimmed}%'
    `;

    try {
      const result = dbInstance.exec(query);
      if (result.length > 0) {
        const { columns, values } = result[0];
        const formatted = values.map((row) =>
          row.reduce((obj, val, idx) => {
            obj[columns[idx]] = val;
            return obj;
          }, {} as Voter)
        );
        setVoters(formatted);
      } else {
        setVoters([]);
      }
    } catch (e) {
      console.error("Search error:", e);
    }
  };

  useEffect(() => {
    if (dbInstance) {
      loadTable();
    }
  }, [localBody, ward, polling]);
  const loadTable = () => {
    if (!dbInstance) return;

    try {
      setSearch("");
      const result = dbInstance.exec(`SELECT * FROM ${selectedTable}`);

      if (result.length > 0) {
        const { columns, values } = result[0];
        const formatted = values.map((row) =>
          row.reduce((obj, val, idx) => {
            obj[columns[idx]] = val;
            return obj;
          }, {} as Voter)
        );

        setVoters(formatted);

        // Rebuild fuzzy engine
        const fuseInstance = new Fuse(formatted, {
          keys: [
            { name: "name", weight: 0.5 },
            { name: "fh_name", weight: 0.3 },
            { name: "house_name", weight: 0.2 },
            { name: "epic_no", weight: 0.4 },
          ],
          threshold: 0.3,
          distance: 100,
        });

        setFuse(fuseInstance);
      }
    } catch (e) {
      console.error("Failed to load table:", selectedTable, e);
    }
  };

  return (
   <div className="min-h-screen bg-gray-100 p-4 md:p-6">
  <div className="max-w-7xl mx-auto">
    {/* Title */}
    <div className="mb-4 md:mb-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
        Electoral Roll - Voter List
      </h1>
      <p className="text-gray-600 mt-1 text-sm md:text-base">
        Complete voter database with detailed information
      </p>
    </div>

    {/* -------- FILTERS -------- */}
    <div className="bg-white rounded-xl shadow px-4 py-4 mb-4 md:mb-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Local Body */}
        <div>
          <label className="text-sm text-gray-700 font-medium">
            Local Body
          </label>
          <select
            className="mt-1 border rounded-lg px-3 py-2 w-full text-sm"
            value={localBody}
            onChange={(e) => setLocalBody(e.target.value)}
          >
            {localBodies.map((lb) => (
              <option key={lb} value={lb}>
                {lb}
              </option>
            ))}
          </select>
        </div>

        {/* Ward */}
        <div>
          <label className="text-sm text-gray-700 font-medium">
            Ward
          </label>
          <select
            className="mt-1 border rounded-lg px-3 py-2 w-full text-sm"
            value={ward}
            onChange={(e) => setWard(e.target.value)}
          >
            {wards.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {/* Polling Station */}
        <div>
          <label className="text-sm text-gray-700 font-medium">
            Polling Station
          </label>
          <select
            className="mt-1 border rounded-lg px-3 py-2 w-full text-sm"
            value={polling}
            onChange={(e) => setPolling(e.target.value)}
          >
            {pollingStations.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>

    {/* ---------- SEARCH BAR ---------- */}
    {!loading && !error && (
      <div className="bg-white rounded-xl shadow px-4 py-4 mb-4 sticky top-0 z-20 md:relative">
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={enableFuzzy}
            onChange={() => setEnableFuzzy(!enableFuzzy)}
          />
          <span className="text-sm text-gray-700">
            Enable Fuzzy Search (typo-friendly)
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <select
            disabled={enableFuzzy}
            className="border rounded-lg px-3 py-2 text-sm md:w-40"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          >
            <option value="name">Name</option>
            <option value="epic_no">EPIC</option>
            <option value="fh_name">Guardian</option>
            <option value="house_name">House Name</option>
            <option value="house_no">House No</option>
            <option value="sex_age">Sex/Age</option>
          </select>

          <input
            type="text"
            placeholder="Search..."
            className="border rounded-lg px-3 py-2 flex-1 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            onClick={runSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 active:scale-95 transition"
          >
            Search
          </button>
        </div>
      </div>
    )}

    {/* ---------- RESULTS ---------- */}
    {!loading && !error && voters.length > 0 && (
      <>
        <p className="mb-3 text-sm text-gray-700">
          Showing <b>{voters.length}</b> results
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {voters.map((voter) => (
            <div
              key={voter.epic_no}
              className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
            >
              {/* Header */}
              <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
                <h3
                  className="text-white text-sm font-semibold truncate w-40"
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

              {/* Body */}
              <div className="p-3 space-y-3">
                <div>
                  <p className="text-[11px] text-gray-500">Guardian</p>
                  <p className="text-sm text-gray-800 truncate">
                    {voter.fh_name}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-500">Address</p>
                  <p className="text-gray-800 bg-gray-50 px-2 py-1 rounded text-sm">
                    {voter.house_no}, {voter.house_name}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex justify-between text-xs">
                  <span className="text-gray-500">EPIC</span>
                  <span className="text-blue-700 font-mono font-semibold bg-blue-50 px-2 py-1 rounded">
                    {voter.epic_no}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-gray-400">
                    SL #{voter.sl_no}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
</div>

  );
};

export default App;
