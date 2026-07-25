import OpenAI from "openai";

let client = null;

function createClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  return new OpenAI({
    apiKey
  });
}

export function getOpenAIClient() {
  if (!client) {
    client = createClient();
  }

  return client;
}

export function getModel() {
  return (
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-5.5"
  );
}

export async function generateCompletion({
  systemPrompt,
  userPrompt,
  reasoningEffort = "low",
  maxOutputTokens = 3500,
  responseFormat = { type: "json_object" },
  feature = "unknown"
}) {
  const openai = getOpenAIClient();

  const startTime = Date.now();

  try {
    const response = await openai.responses.create({
      model: getModel(),

      reasoning: {
        effort: reasoningEffort
      },

      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: systemPrompt
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: userPrompt
            }
          ]
        }
      ],

      max_output_tokens: maxOutputTokens,

      text: {
        format: responseFormat
      }
    });

    const durationMs = Date.now() - startTime;

    console.log({
      feature,
      model: getModel(),
      durationMs,

      inputTokens:
        response.usage?.input_tokens ?? 0,

      cachedInputTokens:
        response.usage?.input_tokens_details?.cached_tokens ?? 0,

      outputTokens:
        response.usage?.output_tokens ?? 0,

      reasoningTokens:
        response.usage?.output_tokens_details?.reasoning_tokens ?? 0,

      totalTokens:
        (response.usage?.input_tokens ?? 0) +
        (response.usage?.output_tokens ?? 0)
    });

    const output =
      response.output_text?.trim();

    if (!output) {
      throw new Error(
        "OpenAI returned an empty response."
      );
    }

    return output;

  } catch (error) {

    if (error?.status === 401) {
      throw new Error(
        "OpenAI authentication failed."
      );
    }

    if (error?.status === 429) {
      throw new Error(
        "OpenAI rate limit exceeded."
      );
    }

    if (error?.status >= 500) {
      throw new Error(
        "OpenAI service is currently unavailable."
      );
    }

    throw new Error(
      error?.message || "OpenAI request failed."
    );
  }
}

export async function generateJSON(options) {
  const output = await generateCompletion(options);

  try {
    return JSON.parse(output);
  } catch {
    throw new Error(
      "OpenAI returned invalid JSON."
    );
  }
}