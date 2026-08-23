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
 *
 * Architecture:
 *   - Singleton WatsonXAI client per process (lazy-initialised on first call)
 *   - initializeClient() re-creates the client with the supplied config
 *   - All errors are caught, logged and re-thrown as WatsonxError
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

// ─── Rate-limit queue (max 2 requests per 1 second) ──────────────────────

const _queue: Array<() => void> = [];
let _queueRunning = false;
const MIN_REQUEST_INTERVAL_MS = 550; // slightly under 500 to stay safely under 2 req/s

async function enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    _queue.push(async () => {
      try {
        resolve(await fn());
      } catch (err) {
        reject(err);
      }
    });
    if (!_queueRunning) processQueue();
  });
}

function processQueue() {
  if (_queue.length === 0) { _queueRunning = false; return; }
  _queueRunning = true;
  const task = _queue.shift()!;
  task();
  setTimeout(processQueue, MIN_REQUEST_INTERVAL_MS);
}

// ─── Singleton client ────────────────────────────────────────────────────────

let _client: InstanceType<typeof WatsonXAI> | null = null;
let _projectId = "";

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

/**
 * Explicit client initialisation.
 * Call this if you need non-default credentials (e.g. per-request keys).
 * Otherwise the singleton is created lazily on first generateText() call.
 */
export function initializeClient(config?: WatsonxConfig): void {
  const { apiKey, url, projectId } = resolveConfig(config);

  if (!apiKey || !projectId) {
    throw new WatsonxError(
      "initializeClient: WATSONX_API_KEY and WATSONX_PROJECT_ID are required. " +
        "Set them in .env.local or pass them to initializeClient()."
    );
  }

  _client = WatsonXAI.newInstance({
    version: "2024-05-31",
    serviceUrl: url,
    authenticator: new IamAuthenticator({ apikey: apiKey }),
  });
  _projectId = projectId;
}

function getClient(): { client: InstanceType<typeof WatsonXAI>; projectId: string } {
  if (!_client || !_projectId) {
    initializeClient(); // lazy init with env vars
  }
  return { client: _client!, projectId: _projectId };
}

// ─── Core: generateText ──────────────────────────────────────────────────────

/**
 * Send a plain-text prompt to IBM Granite and return the generated text.
 *
 * Uses `generateText` (completion-style) on the Granite 13B Chat v2 model
 * unless overridden via `opts.modelId`.
 */
export async function generateText(
  prompt: string,
  opts: GenerateOptions = {}
): Promise<string> {
  const { client, projectId } = getClient();
  const modelId = opts.modelId ?? GRANITE_CHAT_MODEL;

  return enqueueRequest(async () => {
    try {
      const response = await client.generateText({
        modelId,
        projectId,
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
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[watsonx] generateText failed (model=${modelId}):`, msg);
      throw new WatsonxError(`generateText failed: ${msg}`, err);
    }
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

      // Strip accidental markdown fences
      const cleaned = raw
        .replace(/^```(?:json)?\s*/im, "")
        .replace(/\s*```\s*$/im, "")
        .trim();

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
 * Backwards-compatible with existing callers throughout the codebase.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<ChatMessage> {
  const { client, projectId } = getClient();
  const modelId = opts.modelId ?? GRANITE_CHAT_MODEL;

  return enqueueRequest(async () => {
    try {
      const response = await client.textChat({
        modelId,
        projectId,
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
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[watsonx] chatCompletion failed (model=${modelId}):`, msg);
      throw new WatsonxError(`chatCompletion failed: ${msg}`, err);
    }
  });
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
