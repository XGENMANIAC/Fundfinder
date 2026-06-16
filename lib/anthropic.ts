import OpenAI from "openai";

const nim = new OpenAI({
  apiKey: process.env.NVIDIA_NIM_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

// Override via NIM_MODEL env var if needed
const MODEL = process.env.NIM_MODEL || "moonshotai/kimi-k2.6";

export async function runAgent(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  let response;
  try {
    response = await nim.chat.completions.create({
      model: MODEL,
      max_tokens: 8096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; error?: { message?: string } };
    const status = e?.status;
    const msg = e?.error?.message || e?.message || String(err);
    if (status === 401) throw new Error(`NIM API key invalid or missing. Check NVIDIA_NIM_API_KEY in .env.local`);
    if (status === 404 || status === 410) throw new Error(`Model "${MODEL}" not found on NIM (${status}). Set NIM_MODEL= in .env.local to a different model ID.`);
    if (status === 429) throw new Error(`NIM rate limit hit. Wait a moment and retry.`);
    throw new Error(`NIM API error ${status ?? ""}: ${msg}`);
  }

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`Empty response from NIM model "${MODEL}"`);
  return content;
}

export async function runAgentJSON<T>(
  systemPrompt: string,
  userMessage: string
): Promise<T> {
  const text = await runAgent(systemPrompt, userMessage);
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!jsonMatch) throw new Error(`No JSON found in response: ${text.slice(0, 200)}`);
  return JSON.parse(jsonMatch[1]) as T;
}
