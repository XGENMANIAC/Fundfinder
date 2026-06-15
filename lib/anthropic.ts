import OpenAI from "openai";

const nim = new OpenAI({
  apiKey: process.env.NVIDIA_NIM_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

const MODEL = "moonshotai/kimi-k2-instruct";

export async function runAgent(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await nim.chat.completions.create({
    model: MODEL,
    max_tokens: 8096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from Kimi K2");
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
