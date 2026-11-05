// SQLite WebAssembly in Browser Engine (Client-side OPFS / Memory)
import initSqlJs, { Database as SqlJsDatabase } from "sql.js";

let dbInstance: SqlJsDatabase | null = null;
let isInitializing = false;

export interface SqlQueryResult {
  columns: string[];
  values: any[][];
  elapsedMs: number;
  rowCount: number;
}

export async function getSqliteWasmDb(): Promise<SqlJsDatabase> {
  if (dbInstance) return dbInstance;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (dbInstance) return dbInstance;
  }

  isInitializing = true;
  try {
    const SQL = await initSqlJs({
      locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
    });

    const db = new SQL.Database();

    // Initialize default tables inside the browser SQLite Wasm instance
    db.run(`
      CREATE TABLE IF NOT EXISTS local_client_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS browser_cache_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT,
        latency_us INTEGER,
        wasm_status TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS opfs_vector_store (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT,
        dim_count INTEGER,
        l2_norm REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO local_client_notes (title, content, tags) VALUES
        ('SIMD Alignment', 'Keep 64-byte boundary alignment for AVX-512 memory chunks in Rust', 'rust,simd,perf'),
        ('Zero-Copy Go Channels', 'Pass pointers in ring buffers to avoid runtime copying in high-throughput pipelines', 'go,concurrency'),
        ('OPFS Browser Storage', 'Client-side Origin Private File System enables SQLite transactions without server latency', 'sqlite,wasm,opfs');

      INSERT INTO browser_cache_metrics (operation, latency_us, wasm_status) VALUES
        ('WASM_INIT', 320, 'READY'),
        ('PAGE_ALLOC', 45, 'OPTIMAL'),
        ('VECTOR_INDEX_LOOKUP', 18, 'ZERO_SYSCALL');

      INSERT INTO opfs_vector_store (label, dim_count, l2_norm) VALUES
        ('chunk_rust_simd', 1536, 1.0002),
        ('chunk_go_channels', 1536, 0.9998),
        ('chunk_pgvector_hnsw', 1536, 1.0001);
    `);

    dbInstance = db;
    isInitializing = false;
    return dbInstance;
  } catch (error) {
    // Log diagnostics locally only; callers receive a generic code, never internal text.
    console.error("[sqlite-wasm] getSqliteWasmDb failed", error);
    isInitializing = false;
    throw new Error("wasm_init_failed");
  }
}

export async function executeWasmSql(sql: string): Promise<SqlQueryResult> {
  const startTime = performance.now();
  const db = await getSqliteWasmDb();
  
  try {
    const results = db.exec(sql);
    const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;

    if (results.length === 0) {
      return {
        columns: ["status"],
        values: [["Query executed successfully (0 rows returned)"]],
        elapsedMs,
        rowCount: 0
      };
    }

    const first = results[0];
    return {
      columns: first.columns,
      values: first.values,
      elapsedMs,
      rowCount: first.values.length
    };
  } catch (err) {
    // Log diagnostics locally only; callers receive a generic code, never internal text.
    console.error("[sqlite-wasm] executeWasmSql failed", err);
    throw new Error("query_failed");
  }
}

export async function exportWasmDatabase(): Promise<Uint8Array> {
  const db = await getSqliteWasmDb();
  return db.export();
}
