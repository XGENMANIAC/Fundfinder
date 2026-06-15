import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function runAgent(
  systemPrompt: string,
  userMessage: string,
  model = "claude-sonnet-4-6"
): Promise<string> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 8096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return content.text;
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
