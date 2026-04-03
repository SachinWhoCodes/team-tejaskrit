type GroqMessage = { role: "system" | "user" | "assistant"; content: string };

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/**
 * Groq is OpenAI-compatible:
 * POST https://api.groq.com/openai/v1/chat/completions
 */


export async function groqChatJson(args: {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  const apiKey = requireEnv("GROQ_API_KEY");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      temperature: args.temperature ?? 0.1,
      max_tokens: args.maxTokens ?? 1500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq error ${res.status}: ${text || res.statusText}`);
  }

  const json: any = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("Groq returned empty response");
  return JSON.parse(content);
}

export async function groqChat(args: {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  const apiKey = requireEnv("GROQ_API_KEY");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      temperature: args.temperature ?? 0.2,
      max_tokens: args.maxTokens ?? 2000,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq error ${res.status}: ${text || res.statusText}`);
  }

  const json: any = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("Groq returned empty response");
  return content;
}
