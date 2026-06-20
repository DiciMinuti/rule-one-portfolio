import { qualitativeBriefJsonSchema } from "./schema.mjs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function collectOutputText(responseBody) {
  if (typeof responseBody.output_text === "string") {
    return responseBody.output_text;
  }

  const chunks = [];
  for (const item of responseBody.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function buildInput(packet) {
  return [
    {
      role: "system",
      content:
        "You write concise Rule #1 investor research briefs. Use only the provided fact packet. Do not invent numbers, dates, leaders, products, customers, margins, market shares, tenure, communication habits, governance practices, or regulatory issues. If the packet does not support a moat type, omit it. Prefer specific facts over broad praise. Every summary and point should sound like it could only apply to this company. Avoid vague claims such as transparent, ethical, continuously monitored, loyal customers, market dominance, or strong brand unless the packet states the supporting fact.",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          task: "Create a qualitative management and moat brief for this business.",
          generatedAt: todayIsoDate(),
          writingRules: [
            "Keep the UI copy simple and useful for an investor.",
            "Write richer descriptions than the previous short version: management summaries and moat summaries should usually be two sentences, roughly 45-70 words.",
            "Management bullet points should be concrete explanatory points, roughly 20-35 words each, not fragments.",
            "Management sections must be exactly: Leadership, Capital Allocation, Shareholder Alignment, Communication, Governance.",
            "Use the facts about Tim Cook, Kevan Parekh, R&D, shareholder returns, compensation structure, board oversight, and risk factors where relevant.",
            "Every management section must include at least two concrete points.",
            "For Communication, discuss the exact financial disclosures and Q1 2026 release facts in the packet; do not claim transparency as a personality trait.",
            "For Governance, discuss board oversight, shareholder-interest language, compensation structure, and named risk factors; do not claim practices not stated in the packet.",
            "Moat types should be specific to the business and should not be forced, but use all supported Apple moats from the packet.",
            "For Apple, consider Product Ecosystem, Switching Costs, Services Economics, Scale, Brand, and R&D / Integration if supported by the packet.",
            "Every moat summary must include at least one concrete Apple fact, number, product family, service category, installed-base fact, margin fact, or revenue fact.",
            "Every point should teach the reader something concrete about this company.",
            "Use grades strong, middle, or dull.",
          ],
          packet,
        },
        null,
        2,
      ),
    },
  ];
}

export async function generateQualitativeBriefWithOpenAI({
  packet,
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_MODEL ?? "gpt-5.5",
}) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required to generate a qualitative brief.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: buildInput(packet),
      text: {
        format: {
          type: "json_schema",
          name: "qualitative_brief",
          strict: true,
          schema: qualitativeBriefJsonSchema,
        },
      },
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status}): ${JSON.stringify(body)}`);
  }

  const outputText = collectOutputText(body);
  if (!outputText) {
    throw new Error(`OpenAI response did not include output text: ${JSON.stringify(body)}`);
  }

  return JSON.parse(outputText);
}
