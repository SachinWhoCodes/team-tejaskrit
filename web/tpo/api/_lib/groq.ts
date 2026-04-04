function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function groqJson(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
) {
  const apiKey = requireEnv("GROQ_API_KEY");
  const model = process.env.GROQ_IMPORT_MODEL || "llama-3.3-70b-versatile";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq error ${res.status}: ${text || res.statusText}`);
  }

  const json: any = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Groq returned empty content");
  }

  return JSON.parse(content);
}
