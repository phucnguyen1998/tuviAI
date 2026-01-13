import OpenAI from 'openai';

export type GenerateReadingInput = {
  systemPrompt: string;
  userPayload: object;
  model?: string;
  temperature?: number | null;
  maxOutputTokens?: number | null;
};

export type GenerateReadingResult = {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
};

export async function generateReading(input: GenerateReadingInput): Promise<GenerateReadingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const client = new OpenAI({ apiKey });
  const model = input.model || process.env.AI_MODEL || 'gpt-5-mini';
  const start = Date.now();

  const response = await client.responses.create({
    model,
    input: [
      { role: 'system', content: input.systemPrompt },
      { role: 'user', content: JSON.stringify(input.userPayload) },
    ],
    temperature: input.temperature ?? undefined,
    max_output_tokens: input.maxOutputTokens ?? undefined,
  });

  const latencyMs = Date.now() - start;
  const outputText = response.output_text || '';
  const usage = response.usage;

  return {
    text: outputText,
    model,
    inputTokens: usage?.input_tokens,
    outputTokens: usage?.output_tokens,
    latencyMs,
  };
}
