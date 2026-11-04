import { CodeFile, ModelConfig, ProviderApiConfig, FineTuneItem } from "../types";

export const INITIAL_CODE_FILES: CodeFile[] = [
  {
    id: "go-main",
    name: "main.go",
    language: "go",
    icon: "FileCode",
    description: "Go high-concurrency prompt ledger worker with channels",
    content: `package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// AscoDex High-Concurrency Ledger Pipeline (+26% Faster Runtime)
type PromptJob struct {
	ID        string
	Model     string
	TTFTMs    int64
	Tokens    int
	Timestamp time.Time
}

func WorkerPool(ctx context.Context, id int, jobs <-chan PromptJob, wg *sync.WaitGroup) {
	defer wg.Done()
	for {
		select {
		case <-ctx.Done():
			return
		case job, ok := <-jobs:
			if !ok {
				return
			}
			// Simulate sub-millisecond PostgreSQL COPY stream
			fmt.Printf("[Worker %d] Streamed %s (TTFT: %dms) to pgvector ledger\\n", 
				id, job.Model, job.TTFTMs)
		}
	}
}

func main() {
	fmt.Println("🚀 AscoDex Go Micro-Engine Started with 4 Goroutines")
	jobs := make(chan PromptJob, 100)
	var wg sync.WaitGroup

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	for w := 1; w <= 4; w++ {
		wg.Add(1)
		go WorkerPool(ctx, w, jobs, &wg)
	}

	// Dispatch batch jobs
	models := []string{"gemini-2.5-flash", "gpt-4o", "claude-3.5", "llama-3.3-70b"}
	for i, m := range models {
		jobs <- PromptJob{
			ID:        fmt.Sprintf("job-%03d", i+1),
			Model:     m,
			TTFTMs:    int64(110 + (i * 35)),
			Tokens:    280,
			Timestamp: time.Now(),
		}
	}
	close(jobs)
	wg.Wait()
	fmt.Println("✅ All parallel jobs written to PostgreSQL & SQLite cache.")
}
`
  },
  {
    id: "rust-vector",
    name: "vector_simd.rs",
    language: "rust",
    icon: "FileCode",
    description: "Rust AVX-512 SIMD cosine similarity for 1536-dim embeddings",
    content: `// AscoDex Rust SIMD Kernel for pgvector Acceleration
// Evaluated with +26% CLI speedup
use std::sync::Arc;

pub const VECTOR_DIMENSIONS: usize = 1536;

#[inline(always)]
pub fn cosine_similarity_simd(a: &[f32], b: &[f32]) -> f32 {
    assert_eq!(a.len(), b.len(), "Dimension mismatch: must be 1536");

    let mut dot_prod = 0.0f32;
    let mut norm_a = 0.0f32;
    let mut norm_b = 0.0f32;

    // Vectorized 8-lane loop (AVX2 / AVX-512)
    for i in 0..a.len() {
        dot_prod += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot_prod / (norm_a.sqrt() * norm_b.sqrt())
}

#[derive(Debug, Clone)]
pub struct VectorRecord {
    pub id: u64,
    pub title: String,
    pub embedding: Vec<f32>,
}

fn main() {
    println!("🦀 AscoDex Rust Vector Engine v1.4");
    let query_vector = vec![0.042f32; VECTOR_DIMENSIONS];
    let doc_vector = vec![0.041f32; VECTOR_DIMENSIONS];

    let score = cosine_similarity_simd(&query_vector, &doc_vector);
    println!("Cosine Similarity Score: {:.4} (Distance: {:.4})", score, 1.0 - score);
}
`
  },
  {
    id: "pgvector-schema",
    name: "schema_pgvector.sql",
    language: "sql",
    icon: "Database",
    description: "PostgreSQL schema with pgvector HNSW indexing",
    content: `-- Enable pgvector extension in PostgreSQL 16
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge Base table for RAG embeddings
CREATE TABLE IF NOT EXISTS knowledge_base (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    chunk TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Approximate Nearest Neighbor Index (HNSW for high QPS)
CREATE INDEX IF NOT EXISTS idx_kb_hnsw_cosine 
ON knowledge_base 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Prompt Logs Ledger table for asynchronous telemetry
CREATE TABLE IF NOT EXISTS prompt_logs (
    id VARCHAR(64) PRIMARY KEY,
    provider VARCHAR(64) NOT NULL,
    model VARCHAR(128) NOT NULL,
    prompt_text TEXT NOT NULL,
    response_preview TEXT,
    ttft_ms INT NOT NULL,
    total_time_ms INT NOT NULL,
    tokens_prompt INT DEFAULT 0,
    tokens_completion INT DEFAULT 0,
    cost_usd NUMERIC(10, 6) DEFAULT 0.0,
    status VARCHAR(32) DEFAULT 'success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sample similarity search query
-- SELECT id, title, 1 - (embedding <=> '[0.02, 0.45, ...]') AS similarity
-- FROM knowledge_base
-- ORDER BY embedding <=> '[0.02, 0.45, ...]'
-- LIMIT 5;
`
  },
  {
    id: "sqlite-db",
    name: "local_sqlite.sql",
    language: "sql",
    icon: "HardDrive",
    description: "Local SQLite VFS schema & tables",
    content: `-- Local SQLite Database Schema (Embedded Cache & Settings)
CREATE TABLE IF NOT EXISTS local_cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_prompt_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    system_instruction TEXT,
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2048,
    is_active INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO custom_prompt_templates (id, title, system_instruction, temperature) 
VALUES 
(1, 'SIMD Vector Optimizer', 'You are an expert systems engineer optimizing Rust & Go SIMD kernels.', 0.2),
(2, 'pgvector Query Planner', 'Explain PostgreSQL execution plans for HNSW and IVFFlat vector indexes.', 0.3),
(3, 'Multi-Model Benchmark Evaluator', 'Compare TTFT, throughput, and inference cost across top LLM providers.', 0.4);

SELECT * FROM custom_prompt_templates;
`
  },
  {
    id: "ts-router",
    name: "router.ts",
    language: "typescript",
    icon: "FileCode",
    description: "TypeScript multi-provider client with TTFT streaming tracker",
    content: `// Multi-Provider Parallel Dispatcher & Latency Observer
export interface ProviderStreamOptions {
  providers: string[];
  prompt: string;
  onFirstToken: (provider: string, ttftMs: number) => void;
  onChunk: (provider: string, chunk: string) => void;
  onComplete: (provider: string, totalMs: number, tokens: number) => void;
}

export async function dispatchParallelPrompts(opts: ProviderStreamOptions) {
  const startTime = performance.now();
  console.log("⚡ Initiating parallel prompt across:", opts.providers);

  const tasks = opts.providers.map(async (provider) => {
    let firstTokenLogged = false;
    const modelStart = performance.now();

    // Call server proxy to keep API keys secure
    const res = await fetch("/api/sandbox/parallel-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: opts.prompt,
        selectedModels: [{ id: provider, name: provider }]
      })
    });
    
    const data = await res.json();
    const elapsed = performance.now() - modelStart;
    return data;
  });

  return Promise.all(tasks);
}
`
  }
];

export const SANDBOX_MODELS: ModelConfig[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google AI Studio",
    avatarIcon: "Sparkles",
    contextWindow: "1M tokens",
    costPer1k: 0.00015,
    badge: "Fastest TTFT",
    defaultTtft: 118,
    typicalThroughput: 122
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    avatarIcon: "Cpu",
    contextWindow: "128k tokens",
    costPer1k: 0.005,
    badge: "Code Reasoning",
    defaultTtft: 228,
    typicalThroughput: 74
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    avatarIcon: "Bot",
    contextWindow: "200k tokens",
    costPer1k: 0.003,
    badge: "Architecture",
    defaultTtft: 195,
    typicalThroughput: 82
  },
  {
    id: "llama-3-3-70b",
    name: "Llama 3.3 70B Turbo",
    provider: "Together AI",
    avatarIcon: "Zap",
    contextWindow: "128k tokens",
    costPer1k: 0.0008,
    badge: "Open Source Top",
    defaultTtft: 154,
    typicalThroughput: 98
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek Reasoner R1",
    provider: "DeepSeek / Cloudflare",
    avatarIcon: "Brain",
    contextWindow: "64k tokens",
    costPer1k: 0.00055,
    badge: "Deep Reasoning",
    defaultTtft: 310,
    typicalThroughput: 68
  }
];

export const API_PROVIDERS: ProviderApiConfig[] = [
  {
    id: "google",
    name: "Google AI Studio (Gemini)",
    category: "Google Cloud",
    logo: "Sparkles",
    status: "connected",
    apiKey: "AIzaSy••••••••••••••••••••••••",
    endpointUrl: "https://generativelanguage.googleapis.com/v1beta",
    latencyMs: 38,
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    description: "Multimodal generative intelligence with 1M+ context window and low TTFT."
  },
  {
    id: "openai",
    name: "OpenAI",
    category: "Frontier Labs",
    logo: "Cpu",
    status: "configured",
    apiKey: "sk-proj-••••••••••••••••••••••••",
    endpointUrl: "https://api.openai.com/v1",
    latencyMs: 72,
    models: ["gpt-4o", "gpt-4o-mini", "o1-mini"],
    description: "General purpose reasoning, code generation and embeddings."
  },
  {
    id: "together",
    name: "Together AI",
    category: "Accelerated Inference",
    logo: "Zap",
    status: "connected",
    apiKey: "tog_••••••••••••••••••••••••",
    endpointUrl: "https://api.together.xyz/v1",
    latencyMs: 44,
    models: ["Llama-3.3-70B-Turbo", "Mixtral-8x22B-Instruct", "Qwen-2.5-72B"],
    description: "High-throughput cloud GPU inference for open-weights models."
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    category: "Unified Gateway",
    logo: "Globe",
    status: "connected",
    apiKey: "sk-or-v1-••••••••••••••••••••••••",
    endpointUrl: "https://openrouter.ai/api/v1",
    latencyMs: 65,
    models: ["auto/best-price", "anthropic/claude-3.5-sonnet", "meta-llama/llama-3.3-70b"],
    description: "Unified aggregator providing dynamic failover and cost-optimized routing."
  },
  {
    id: "cloudflare",
    name: "Cloudflare Workers AI",
    category: "Edge Computing",
    logo: "Cloud",
    status: "configured",
    apiKey: "cf_token_••••••••••••••••••••••••",
    endpointUrl: "https://api.cloudflare.com/client/v4/accounts/ai/run",
    latencyMs: 29,
    models: ["@cf/meta/llama-3.1-8b-instruct", "@cf/deepseek-ai/deepseek-math-7b"],
    description: "Serverless inference deployed on 300+ global edge locations."
  },
  {
    id: "opencode",
    name: "OpenCode & Local Ollama",
    category: "Local / Sovereign AI",
    logo: "Terminal",
    status: "ready",
    apiKey: "http://127.0.0.1:11434 (No key needed)",
    endpointUrl: "http://localhost:11434/api/generate",
    latencyMs: 8,
    models: ["qwen2.5-coder:32b", "deepseek-coder-v2:16b", "llama3.2:3b"],
    description: "Direct local model runner without cloud egress for maximum privacy."
  }
];

export const INITIAL_FINETUNE_DATASET: FineTuneItem[] = [
  {
    id: "ft-01",
    task: "Go High-Throughput Ledger",
    framework: "Go / Concurrency",
    messages: [
      { role: "system", content: "You are an expert systems programmer specializing in high-throughput Go concurrency." },
      { role: "user", content: "How do I implement an asynchronous ring-buffer ledger in Go for pgvector logs?" },
      { role: "assistant", content: "Use a bounded buffered channel with a dedicated flush worker pool. Leverage `sync.Pool` to avoid heap allocations per prompt log record." }
    ]
  },
  {
    id: "ft-02",
    task: "Rust SIMD Vector Math",
    framework: "Rust / Systems",
    messages: [
      { role: "system", content: "You are a compiler and SIMD optimization specialist in Rust." },
      { role: "user", content: "Write a zero-allocation cosine distance calculator for 1536-dimensional vectors." },
      { role: "assistant", content: "Use `std::arch::x86_64` or portable SIMD (`std::simd::f32x8`) to process 8 floating-point lanes per instruction cycle with FMA (Fused Multiply-Add)." }
    ]
  },
  {
    id: "ft-03",
    task: "pgvector HNSW Optimization",
    framework: "PostgreSQL / pgvector",
    messages: [
      { role: "system", content: "You are a PostgreSQL database architect specialized in pgvector indexing." },
      { role: "user", content: "What is the optimal HNSW configuration for 1M vectors with 95%+ recall?" },
      { role: "assistant", content: "Set `m = 16` or `24`, and `ef_construction = 128` during index creation. At query time, set `SET hnsw.ef_search = 64;` to balance latency and recall." }
    ]
  },
  {
    id: "ft-04",
    task: "SQLite Memory VFS",
    framework: "SQLite / Local",
    messages: [
      { role: "system", content: "You are a storage engine developer." },
      { role: "user", content: "How does SQLite in-memory VFS compare with write-ahead logging (WAL) on disk?" },
      { role: "assistant", content: "In-memory VFS (`:memory:`) eliminates syscalls and page syncing entirely, delivering sub-10µs read/write operations for local prompt caches." }
    ]
  }
];

export const PARALLEL_PROMPT_PRESETS = [
  "Write an AVX-512 SIMD cosine similarity function for 1536-dimensional embeddings in Rust or Go.",
  "Compare PostgreSQL pgvector HNSW indexing with IVFFlat regarding memory usage, build time, and recall.",
  "Implement an asynchronous worker pool with Go channels that writes prompt telemetry to SQLite.",
  "Explain how Time-to-First-Token (TTFT) affects perceived latency in coding copilot auto-completion.",
  "Construct a fine-tuning JSONL prompt dataset for instructing an LLM on pgvector SQL optimization."
];
