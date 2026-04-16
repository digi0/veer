import json
import os
from pathlib import Path
from dotenv import load_dotenv
import anthropic
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv(Path(__file__).parent.parent / ".env")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-haiku-4-5-20251001"

with open(Path(__file__).parent.parent / "knowledge.json", "r") as f:
    knowledge = json.load(f)

KEYWORDS = {
    "aadhaar": ["aadhaar", "aadhar", "uid", "uidai", "address update"],
    "passport": ["passport", "psk", "passport seva"],
    "pan": ["pan card", "pan number", "permanent account", "form 49a", "nsdl pan", "utiitsl"],
    "driving_license": ["driving license", "driving licence", "learner license", "learner licence", "dl ", "rto", "parivahan", "sarathi"],
    "rti": ["rti", "right to information", "information act"],
    "ration_card": ["ration card", "ration", "fair price", "pds", "food supply"],
}


def detect_service(message: str) -> str | None:
    msg = message.lower()
    for service, words in KEYWORDS.items():
        if any(w in msg for w in words):
            return service
    return None


def build_knowledge_context(service_key: str | None) -> str:
    if not service_key or service_key not in knowledge:
        return ""
    entry = knowledge[service_key]
    ctx = f"VERIFIED INFORMATION FOR: {service_key.upper()}\n\nOverview: {entry.get('overview', 'N/A')}\n\nSteps:\n"
    for i, step in enumerate(entry.get("steps", []), 1):
        ctx += f"  {i}. {step}\n"
    ctx += "\nDocuments Required:\n"
    for doc in entry.get("documents", []):
        ctx += f"  - {doc}\n"
    ctx += f"\nOfficial Website: {entry.get('official_website', 'N/A')}"
    ctx += f"\nForm Link: {entry.get('form_link', 'N/A')}"
    return ctx


def build_system_prompt(language: str, service_key: str | None) -> str:
    ctx = build_knowledge_context(service_key)
    if ctx:
        return f"""You are VEER, an AI assistant helping Indian citizens navigate government services with verified, accurate information.

USE THE FOLLOWING VERIFIED INFORMATION TO ANSWER. Do not make up steps or links.
Only use the data provided below. If the user asks something not covered here, say you don't have verified information for that yet.

{ctx}

Structure your answers clearly:
- Overview
- Step-by-step process
- Documents required
- Official website and form link

Be accurate. Do not invent government policies or procedures.
Respond in {language}."""
    return f"""You are VEER, an AI assistant helping Indian citizens navigate government services.

The user asked about a service not yet in your verified database.
Say: "I don't have verified information for this service yet. Please check the official government portal or try asking about Aadhaar, Passport, PAN Card, Driving License, RTI, or Ration Card."

Do not guess or invent government procedures. Respond in {language}."""


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    language: str = "English"


@app.post("/api/chat")
async def chat(req: ChatRequest):
    last_message = req.messages[-1].content
    service_key = detect_service(last_message)
    system_prompt = build_system_prompt(req.language, service_key)

    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    def stream():
        with client.messages.stream(
            model=MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")
