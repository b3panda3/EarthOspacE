/**
 * /src/lib/ai/watsonx.ts
 *
 * Comprehensive IBM Watsonx.ai client for EarthOspacE.
 *
 * Exports:
 *   initializeClient(config?)   — explicit setup (optional; lazy init is the default)
 *   generateText(prompt, opts)  — Granite text generation with configurable params
 *   generateStructured(prompt, schema, opts) — JSON output with retry + schema validation
 *   chatCompletion(messages, opts) — multi-turn chat (kept for backward compat)
 *   textGeneration(prompt, modelId) — legacy alias kept for backward compat
 *   extractFirstJson(raw)        — robust JSON extraction from malformed LLM output
 *
 * Architecture:
 *   - Dual-instance pool (round-robin) for 2× throughput (4 req/sec total)
 *   - Each instance has its own rate-limit queue (2 req/sec per instance)
 *   - Automatic retry on transient network errors (ECONNRESET, socket hang up)
 *   - All errors caught, logged and re-thrown as WatsonxError
 */

import { WatsonXAI } from "@ibm-cloud/watsonx-ai";
import { IamAuthenticator } from "@ibm-cloud/watsonx-ai/authentication";

// ─── Model constants ────────────────────────────────────────────────────────

/** Primary chat/instruct model — Llama 3.3 70B Instruct (available on EU Frankfurt) */
export const GRANITE_CHAT_MODEL = "meta-llama/llama-3-3-70b-instruct";

/** Legacy alias — both point to the same current model */
export const GRANITE_INSTRUCT_MODEL = "meta-llama/llama-3-3-70b-instruct";

// ─── Configuration ──────────────────────────────────────────────────────────

export interface WatsonxConfig {
  apiKey?: string;
  url?: string;
  projectId?: string;
}

/** Generation parameters — a strict subset of TextGenParameters */
export interface GenerateOptions {
  /** Override model. Defaults to GRANITE_CHAT_MODEL */
  modelId?: string;
  /** 1–2000. Default 500 */
  maxNewTokens?: number;
  /** 0.0–2.0. Default 0.7 */
  temperature?: number;
  /** 0.0–1.0. Default 0.9 */
  topP?: number;
  /** 1–100. Default 40 */
  topK?: number;
  /** 1.0 = no penalty. Default 1.1 */
  repetitionPenalty?: number;
  /** Stop generation at any of these strings */
  stopSequences?: string[];
}

const DEFAULT_OPTS: Required<Omit<GenerateOptions, "modelId" | "stopSequences">> = {
  maxNewTokens: 500,
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  repetitionPenalty: 1.1,
};

// ─── Error type ─────────────────────────────────────────────────────────────

export class WatsonxError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "WatsonxError";
  }
}

// ─── Per-instance rate-limit queue ────────────────────────────────────────
// Each Watsonx instance allows max 2 requests per 1 second.
// A promise chain enforces sequential execution + minimum 600ms gap.

const MIN_REQUEST_INTERVAL_MS = 600;

class RateLimitQueue {
  private chain: Promise<unknown> = Promise.resolve();
  private lastReqTime = 0;

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    let outerResolve!: (v: T) => void;
    let outerReject!: (e: unknown) => void;

    const result = new Promise<T>((res, rej) => {
      outerResolve = res;
      outerReject = rej;
    });

    this.chain = this.chain.then(async () => {
      const now = Date.now();
      const wait = Math.max(0, MIN_REQUEST_INTERVAL_MS - (now - this.lastReqTime));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));

      try {
        const value = await fn();
        this.lastReqTime = Date.now();
        outerResolve(value);
      } catch (err) {
        this.lastReqTime = Date.now();
        outerReject(err);
      }
    });

    return result;
  }
}

// ─── Dual-instance pool ────────────────────────────────────────────────────
// Two Watsonx instances = 2 × 2 req/sec = 4 req/sec aggregate throughput.
// Requests are distributed round-robin across instances.

interface InstanceSlot {
  client: InstanceType<typeof WatsonXAI>;
  projectId: string;
  queue: RateLimitQueue;
}

const INSTANCES: InstanceSlot[] = [];
let _roundRobinIdx = 0;

function buildInstance(apiKey: string, url: string, projectId: string): InstanceSlot {
  return {
    client: WatsonXAI.newInstance({
      version: "2024-05-31",
      serviceUrl: url,
      authenticator: new IamAuthenticator({ apikey: apiKey }),
    }),
    projectId,
    queue: new RateLimitQueue(),
  };
}

/** Pick the next instance via round-robin */
function nextInstance(): InstanceSlot {
  if (INSTANCES.length === 0) initPool();
  const slot = INSTANCES[_roundRobinIdx % INSTANCES.length];
  _roundRobinIdx++;
  return slot;
}

/**
 * Explicit client initialisation.
 * If called with no args, initialises the pool from env vars (including the
 * second key if WATSONX_API_KEY2 / WATSONX_PROJECT_ID2 are set).
 */
export function initializeClient(config?: WatsonxConfig): void {
 const { apiKey, url, projectId } = resolveConfig(config);

  if (!apiKey || !projectId) {
    throw new WatsonxError(
      "initializeClient: WATSONX_API_KEY and WATSONX_PROJECT_ID are required. " +
        "Set them in .env.local or pass them to initializeClient()."
    );
  }

  // Build primary instance
  INSTANCES.length = 0;
  INSTANCES.push(buildInstance(apiKey, url, projectId));

  // Build secondary instance if second credentials are available
  const apiKey2    = process.env.WATSONX_API_KEY2    || process.env.NEXT_PUBLIC_WATSONX_API_KEY2 || "";
  const projectId2 = process.env.WATSONX_PROJECT_ID2 || process.env.NEXT_PUBLIC_WATSONX_PROJECT_ID2 || "";
  if (apiKey2 && projectId2) {
    const url2 = process.env.WATSONX_URL2 || process.env.NEXT_PUBLIC_WATSONX_URL2 || url;
    INSTANCES.push(buildInstance(apiKey2, url2, projectId2));
    console.log("[watsonx] dual-instance pool initialised (2 slots, 4 req/sec aggregate)");
  } else {
    console.log("[watsonx] single-instance pool initialised (1 slot, 2 req/sec)");
  }
}

function resolveConfig(override?: WatsonxConfig): {
  apiKey: string;
  url: string;
  projectId: string;
} {
  return {
    apiKey:    override?.apiKey    ?? process.env.NEXT_PUBLIC_WATSONX_API_KEY    ?? "",
    url:       override?.url       ?? process.env.NEXT_PUBLIC_WATSONX_URL        ?? "https://us-south.ml.cloud.ibm.com",
    projectId: override?.projectId ?? process.env.NEXT_PUBLIC_WATSONX_PROJECT_ID ?? "",
  };
}

function initPool(): void {
  if (INSTANCES.length > 0) return;
  initializeClient();
}

// ─── Core: generateText ──────────────────────────────────────────────────────

/**
 * Send a plain-text prompt to IBM Granite and return the generated text.
 *
 * Uses `generateText` (completion-style) on the Llama 3.3 70B model
 * unless overridden via `opts.modelId`.
 * Distributed across the instance pool via round-robin.
 */
export async function generateText(
  prompt: string,
  opts: GenerateOptions = {}
): Promise<string> {
  const slot = nextInstance();
  const modelId = opts.modelId ?? GRANITE_CHAT_MODEL;

  return slot.queue.enqueue(async () => {
    // Retry up to 2 times for transient network errors (ECONNRESET, socket hang up)
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await slot.client.generateText({
          modelId,
          projectId: slot.projectId,
          input: prompt,
          parameters: {
            max_new_tokens:    opts.maxNewTokens     ?? DEFAULT_OPTS.maxNewTokens,
            temperature:       opts.temperature      ?? DEFAULT_OPTS.temperature,
            top_p:             opts.topP             ?? DEFAULT_OPTS.topP,
            top_k:             opts.topK             ?? DEFAULT_OPTS.topK,
            repetition_penalty: opts.repetitionPenalty ?? DEFAULT_OPTS.repetitionPenalty,
            ...(opts.stopSequences?.length ? { stop_sequences: opts.stopSequences } : {}),
            decoding_method: "sample",
          },
        });

        const text = response.result?.results?.[0]?.generated_text ?? "";
        return text.trim();
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient = /ECONNRESET|socket hang up|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(msg);
        if (isTransient && attempt < 2) {
          console.warn(`[watsonx] transient error on attempt ${attempt}, retrying in 1s:`, msg);
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        console.error(`[watsonx] generateText failed (model=${modelId}):`, msg);
        throw new WatsonxError(`generateText failed: ${msg}`, err);
      }
    }
    // Should not reach here, but just in case
    throw new WatsonxError(`generateText failed after retries`, lastErr);
  });
}

// ─── generateStructured: JSON output with schema validation + retry ──────────

export interface JsonSchema {
  type: "object";
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
}

/**
 * Generate a structured JSON response validated against `schema`.
 *
 * Retries up to `maxRetries` times (default 3) when the model output is
 * malformed JSON or missing required keys.  On exhaustion it falls back to
 * `defaultValue` if provided, otherwise throws.
 */
export async function generateStructured<T = Record<string, unknown>>(
  prompt: string,
  schema: JsonSchema,
  opts: GenerateOptions & { maxRetries?: number; defaultValue?: T } = {}
): Promise<T> {
  const { maxRetries = 3, defaultValue, ...genOpts } = opts;

  const requiredKeys = schema.required ?? Object.keys(schema.properties);

  // Append JSON instruction to the prompt
  const schemaStr = JSON.stringify(schema, null, 2);
  const structuredPrompt =
    `${prompt}\n\n` +
    `Respond ONLY with a valid JSON object matching this schema. No markdown fences, no commentary.\n` +
    `Schema:\n${schemaStr}`;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const raw = await generateText(structuredPrompt, {
        ...genOpts,
        // Lower temperature on retries to reduce randomness
        temperature: (genOpts.temperature ?? DEFAULT_OPTS.temperature) * (1 - 0.1 * (attempt - 1)),
        // Stop at common JSON terminators
        stopSequences: genOpts.stopSequences ?? [],
      });

      // Strip markdown fences and extract first valid JSON object
      const cleaned = extractFirstJson(raw);

      const parsed = JSON.parse(cleaned) as T;

      // Validate required keys
      const missing = requiredKeys.filter(
        (k) => !(k in (parsed as Record<string, unknown>))
      );
      if (missing.length > 0) {
        throw new Error(`Missing required keys: ${missing.join(", ")}`);
      }

      return parsed;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[watsonx] generateStructured attempt ${attempt}/${maxRetries} failed: ${msg}`);

      if (attempt < maxRetries) {
        // Brief back-off before retry
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
    }
  }

  // Exhausted retries
  if (defaultValue !== undefined) {
    console.warn("[watsonx] generateStructured: all retries failed, using defaultValue");
    return defaultValue;
  }

  throw new WatsonxError(
    `generateStructured failed after ${maxRetries} attempts`,
    lastError
  );
}

// ─── Chat completion (kept for backward compat) ──────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatOptions {
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

/**
 * Multi-turn chat completion using `textChat`.
 * Distributed across the instance pool via round-robin.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<ChatMessage> {
  const slot = nextInstance();
  const modelId = opts.modelId ?? GRANITE_CHAT_MODEL;

  return slot.queue.enqueue(async () => {
    // Retry up to 2 times for transient network errors
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await slot.client.textChat({
          modelId,
          projectId: slot.projectId,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          maxTokens:   opts.maxTokens   ?? 512,
          temperature: opts.temperature ?? DEFAULT_OPTS.temperature,
          topP:        opts.topP        ?? DEFAULT_OPTS.topP,
        });

        const choice = response.result?.choices?.[0];
        const content =
          (choice?.message as { content?: string } | undefined)?.content ?? "";

        return { role: "assistant", content: content.trim() };
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient = /ECONNRESET|socket hang up|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(msg);
        if (isTransient && attempt < 2) {
          console.warn(`[watsonx] chatCompletion transient error, retrying in 1s:`, msg);
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        console.error(`[watsonx] chatCompletion failed (model=${modelId}):`, msg);
        throw new WatsonxError(`chatCompletion failed: ${msg}`, err);
      }
    }
    throw new WatsonxError(`chatCompletion failed after retries`, lastErr);
  });
}

// ─── JSON extraction utility ───────────────────────────────────────────────

/**
 * Extract the first valid JSON object from potentially malformed LLM output.
 * Handles: trailing text, markdown fences, leading prose, multiple JSON blobs.
 */
export function extractFirstJson(raw: string): string {
  // Strip markdown fences
  let cleaned = raw.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();

  // Fast path: try the whole string
  try { JSON.parse(cleaned); return cleaned; } catch {}

  // Find the first '{' and match braces to extract the JSON object
  const start = cleaned.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in LLM output');

  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) throw new Error('Unterminated JSON object in LLM output');

  const extracted = cleaned.slice(start, end + 1);
  // Validate it's actually valid JSON
  JSON.parse(extracted); // will throw if not valid
  return extracted;
}

/**
 * Legacy alias — kept so existing callers using `textGeneration(prompt)` still compile.
 * Internally delegates to `generateText`.
 */
export async function textGeneration(
  prompt: string,
  modelId: string = GRANITE_CHAT_MODEL
): Promise<string> {
  return generateText(prompt, { modelId });
}
