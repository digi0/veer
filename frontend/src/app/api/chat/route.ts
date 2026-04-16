import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import knowledge from "../../../../knowledge.json";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5-20251001";

const KEYWORDS: Record<string, string[]> = {
  aadhaar: ["aadhaar", "aadhar", "uid", "uidai", "address update"],
  passport: ["passport", "psk", "passport seva"],
  pan: ["pan card", "pan number", "permanent account", "form 49a", "nsdl pan", "utiitsl"],
  driving_license: ["driving license", "driving licence", "learner license", "learner licence", "dl ", "rto", "parivahan", "sarathi"],
  rti: ["rti", "right to information", "information act"],
  ration_card: ["ration card", "ration", "fair price", "pds", "food supply"],
};

type KnowledgeEntry = {
  overview: string;
  steps: string[];
  documents: string[];
  official_website: string;
  form_link: string;
};

function detectService(message: string): string | null {
  const msg = message.toLowerCase();
  for (const [service, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => msg.includes(w))) return service;
  }
  return null;
}

function buildContext(serviceKey: string | null): string {
  if (!serviceKey || !(serviceKey in knowledge)) return "";
  const entry = (knowledge as Record<string, KnowledgeEntry>)[serviceKey];
  let ctx = `VERIFIED INFORMATION FOR: ${serviceKey.toUpperCase()}\n\nOverview: ${entry.overview}\n\nSteps:\n`;
  entry.steps.forEach((s, i) => (ctx += `  ${i + 1}. ${s}\n`));
  ctx += "\nDocuments Required:\n";
  entry.documents.forEach((d) => (ctx += `  - ${d}\n`));
  ctx += `\nOfficial Website: ${entry.official_website}\nForm Link: ${entry.form_link}`;
  return ctx;
}

function buildSystemPrompt(language: string, serviceKey: string | null): string {
  const ctx = buildContext(serviceKey);
  if (ctx) {
    return `You are VEER, an AI assistant helping Indian citizens navigate government services with verified, accurate information.

USE THE FOLLOWING VERIFIED INFORMATION TO ANSWER. Do not make up steps or links.

${ctx}

Structure your answers clearly using markdown: bold headings, numbered steps, bullet points for documents.
Do not use emojis. Do not use H1 or H2 headings — use bold text instead.
Be concise and accurate. Do not invent government policies.
Respond in ${language}.`;
  }
  return `You are VEER, an AI assistant helping Indian citizens navigate government services.
Say you don't have verified information for this service yet and suggest: Aadhaar, Passport, PAN Card, Driving License, RTI, or Ration Card.
Do not use emojis. Do not guess. Respond in ${language}.`;
}

export async function POST(req: NextRequest) {
  const { messages, language = "English" } = await req.json();
  const lastMessage = messages[messages.length - 1].content;
  const serviceKey = detectService(lastMessage);
  const systemPrompt = buildSystemPrompt(language, serviceKey);

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
