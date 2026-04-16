import streamlit as st
import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()

# -----------------------------
# Load knowledge base
# -----------------------------
with open("knowledge.json", "r") as file:
    knowledge = json.load(file)

# -----------------------------
# Claude client
# -----------------------------
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-haiku-4-5-20251001"

# -----------------------------
# Service detection
# -----------------------------
def detect_service(user_message):
    message_lower = user_message.lower()

    keywords = {
        "aadhaar": ["aadhaar", "aadhar", "uid", "uidai", "address update"],
        "passport": ["passport", "psk", "passport seva"],
        "pan": ["pan card", "pan number", "permanent account", "form 49a", "nsdl pan", "utiitsl"],
        "driving_license": ["driving license", "driving licence", "learner license", "learner licence", "dl ", "rto", "parivahan", "sarathi"],
        "rti": ["rti", "right to information", "information act"],
        "ration_card": ["ration card", "ration", "fair price", "pds", "food supply"],
    }

    for service_key, words in keywords.items():
        for word in words:
            if word in message_lower:
                return service_key

    return None

# -----------------------------
# Build context from knowledge base
# -----------------------------
def build_knowledge_context(service_key):
    if service_key is None or service_key not in knowledge:
        return ""

    entry = knowledge[service_key]

    context = f"""
VERIFIED INFORMATION FOR: {service_key.upper()}

Overview: {entry.get('overview', 'N/A')}

Steps:
"""
    for i, step in enumerate(entry.get("steps", []), 1):
        context += f"  {i}. {step}\n"

    context += "\nDocuments Required:\n"
    for doc in entry.get("documents", []):
        context += f"  - {doc}\n"

    context += f"\nOfficial Website: {entry.get('official_website', 'N/A')}"
    context += f"\nForm Link: {entry.get('form_link', 'N/A')}"

    return context

# -----------------------------
# Build system prompt
# -----------------------------
def build_system_prompt(language, service_key=None):
    knowledge_context = build_knowledge_context(service_key)

    if knowledge_context:
        return f"""You are VEER, an AI assistant helping Indian citizens navigate government services with verified, accurate information.

USE THE FOLLOWING VERIFIED INFORMATION TO ANSWER. Do not make up steps or links.
Only use the data provided below. If the user asks something not covered here,
say you don't have verified information for that yet.

{knowledge_context}

Structure your answers clearly:
- Overview
- Step-by-step process
- Documents required
- Official website and form link

Be accurate. Do not invent government policies or procedures.
Respond in {language}."""
    else:
        return f"""You are VEER, an AI assistant helping Indian citizens navigate government services.

The user asked about a service that is not yet in your verified database.
Respond honestly: "I don't have verified information for this service yet. Please check the
official government portal or try asking about Aadhaar, Passport, PAN Card,
Driving License, RTI, or Ration Card services."

Do not guess or invent government procedures.
Respond in {language}."""

# -----------------------------
# Stream response from Claude
# -----------------------------
def stream_claude_response(system_prompt, messages, placeholder):
    full_response = ""

    with client.messages.stream(
        model=MODEL,
        max_tokens=1024,
        system=system_prompt,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            full_response += text
            placeholder.markdown(full_response + "▌")

    placeholder.markdown(full_response)
    return full_response

# -----------------------------
# Page config
# -----------------------------
st.set_page_config(
    page_title="VEER",
    page_icon="V",
    layout="wide",
    initial_sidebar_state="expanded"
)

# -----------------------------
# Design system
# Navy #0D2137  |  Saffron #E8820C  |  Base #F5F6F8  |  Surface #FFFFFF
# -----------------------------
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

*, html, body, [class*="css"] {
    font-family: 'Inter', sans-serif;
    box-sizing: border-box;
}

/* ---- Base ---- */
.stApp {
    background: #F5F6F8;
    color: #111827;
}

.block-container {
    padding-top: 0 !important;
    padding-bottom: 2rem;
    max-width: 820px;
}

/* ---- Sidebar ---- */
section[data-testid="stSidebar"] {
    background: #0D2137;
    border-right: none;
}

section[data-testid="stSidebar"] * {
    color: #CBD5E1 !important;
}

section[data-testid="stSidebar"] .stSelectbox label {
    color: #94A3B8 !important;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

section[data-testid="stSidebar"] .stButton button {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: #CBD5E1 !important;
    font-size: 0.78rem !important;
    font-weight: 500 !important;
    border-radius: 6px !important;
    transition: all 0.15s ease;
}

section[data-testid="stSidebar"] .stButton button:hover {
    background: rgba(232, 130, 12, 0.15) !important;
    border-color: rgba(232, 130, 12, 0.4) !important;
    color: #F5A93A !important;
}

/* Clear button */
section[data-testid="stSidebar"] .stButton:last-of-type button {
    background: transparent !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    color: #64748B !important;
    font-size: 0.75rem !important;
}

section[data-testid="stSidebar"] .stButton:last-of-type button:hover {
    border-color: rgba(255,255,255,0.2) !important;
    color: #94A3B8 !important;
}

/* Sidebar selectbox */
section[data-testid="stSidebar"] .stSelectbox div[data-baseweb="select"] > div {
    background: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    color: #E2E8F0 !important;
}

/* ---- Sidebar brand ---- */
.sidebar-brand {
    font-size: 1.4rem;
    font-weight: 800;
    color: #FFFFFF !important;
    letter-spacing: 0.12em;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #E8820C;
    margin-bottom: 1.8rem;
    display: inline-block;
}

.sidebar-brand span {
    color: #E8820C !important;
}

.sidebar-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #475569 !important;
    margin-top: 1.4rem;
    margin-bottom: 0.5rem;
}

.sidebar-footer {
    font-size: 0.68rem;
    color: #334155 !important;
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255,255,255,0.05);
    line-height: 1.6;
}

/* ---- Header ---- */
.veer-header {
    background: #FFFFFF;
    border-bottom: 1px solid #E5E7EB;
    padding: 1.2rem 1.5rem;
    margin-bottom: 0;
    position: sticky;
    top: 0;
    z-index: 100;
}

.veer-logo {
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: 0.2em;
    color: #0D2137;
    margin: 0;
    line-height: 1;
}

.veer-logo span {
    color: #E8820C;
}

.veer-tagline {
    font-size: 0.78rem;
    font-weight: 400;
    color: #6B7280;
    margin-top: 0.25rem;
    letter-spacing: 0.01em;
}

/* ---- Service pills ---- */
.pills-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding: 1.2rem 1.5rem 0.8rem;
    background: #FFFFFF;
    border-bottom: 1px solid #E5E7EB;
}

.service-pill {
    background: #F1F5F9;
    border: 1px solid #E2E8F0;
    color: #374151;
    padding: 5px 14px;
    border-radius: 4px;
    font-size: 0.76rem;
    font-weight: 500;
    letter-spacing: 0.01em;
}

/* ---- Chat container ---- */
.chat-area {
    padding: 1.5rem 0;
}

/* ---- Chat messages ---- */
.stChatMessage {
    background: transparent !important;
    border: none !important;
    padding: 0.25rem 0 !important;
}

div[data-testid="stChatMessageContent"] {
    background: #FFFFFF !important;
    border: 1px solid #E5E7EB !important;
    border-radius: 8px !important;
    padding: 1rem 1.2rem !important;
    color: #111827 !important;
    font-size: 0.92rem !important;
    line-height: 1.65 !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
}

/* User message */
div[data-testid="stChatMessage"]:has(div[data-testid="stChatMessageAvatarUser"]) div[data-testid="stChatMessageContent"] {
    background: #0D2137 !important;
    border-color: #0D2137 !important;
    color: #E2E8F0 !important;
}

/* ---- Chat input ---- */
.stChatInput textarea {
    background: #FFFFFF !important;
    border: 1px solid #D1D5DB !important;
    border-radius: 8px !important;
    color: #111827 !important;
    font-size: 0.9rem !important;
}

.stChatInput textarea:focus {
    border-color: #0D2137 !important;
    box-shadow: 0 0 0 3px rgba(13, 33, 55, 0.08) !important;
}

.stChatInput button {
    background: #E8820C !important;
    border-radius: 6px !important;
}

/* ---- Dividers ---- */
hr {
    border-color: rgba(255, 255, 255, 0.06) !important;
}

/* ---- Footer ---- */
.veer-footer {
    text-align: center;
    font-size: 0.72rem;
    color: #9CA3AF;
    padding: 1.5rem 0 0.5rem;
    letter-spacing: 0.02em;
    border-top: 1px solid #E5E7EB;
    margin-top: 1rem;
}

/* ---- Empty state ---- */
.empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #9CA3AF;
}

.empty-state-title {
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.4rem;
}

.empty-state-sub {
    font-size: 0.83rem;
    color: #9CA3AF;
    line-height: 1.5;
}

/* ---- Hide Streamlit chrome ---- */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
header {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

# -----------------------------
# Sidebar
# -----------------------------
with st.sidebar:
    st.markdown('<div class="sidebar-brand"><span>V</span>EER</div>', unsafe_allow_html=True)

    st.markdown('<div class="sidebar-label">Language</div>', unsafe_allow_html=True)
    language = st.selectbox(
        "Language",
        ["English", "Hindi"],
        label_visibility="collapsed"
    )

    st.markdown('<div class="sidebar-label">Service</div>', unsafe_allow_html=True)
    service = st.selectbox(
        "Service",
        ["General", "Aadhaar", "Passport", "PAN Card", "Driving License", "RTI", "Ration Card"],
        label_visibility="collapsed"
    )

    st.markdown("---")
    st.markdown('<div class="sidebar-label">Quick Access</div>', unsafe_allow_html=True)

    qa_col1, qa_col2 = st.columns(2)
    with qa_col1:
        if st.button("Aadhaar Update", use_container_width=True):
            st.session_state.prefill = "How do I update my Aadhaar address?"
        if st.button("Apply PAN", use_container_width=True):
            st.session_state.prefill = "How do I apply for a PAN card?"
        if st.button("File RTI", use_container_width=True):
            st.session_state.prefill = "How do I file an RTI application?"
    with qa_col2:
        if st.button("New Passport", use_container_width=True):
            st.session_state.prefill = "How do I apply for a new passport?"
        if st.button("Driving License", use_container_width=True):
            st.session_state.prefill = "How do I get a driving license?"
        if st.button("Ration Card", use_container_width=True):
            st.session_state.prefill = "How do I apply for a ration card?"

    st.markdown("---")

    if st.button("Clear conversation", use_container_width=True):
        st.session_state.messages = []
        st.rerun()

    st.markdown(
        '<div class="sidebar-footer">'
        'VEER helps Indian citizens navigate government services with step-by-step verified guidance.'
        '<br><br>Always confirm on official government portals before taking action.'
        '<br><br>VEER v1.0 &middot; 2026'
        '</div>',
        unsafe_allow_html=True
    )

# -----------------------------
# Header
# -----------------------------
st.markdown("""
<div class="veer-header">
    <div class="veer-logo"><span>V</span>EER</div>
    <div class="veer-tagline">AI-powered guidance for Indian government services</div>
</div>
""", unsafe_allow_html=True)

# -----------------------------
# Service pills
# -----------------------------
if len(st.session_state.get("messages", [])) == 0:
    st.markdown("""
    <div class="pills-row">
        <div class="service-pill">Aadhaar</div>
        <div class="service-pill">Passport</div>
        <div class="service-pill">PAN Card</div>
        <div class="service-pill">Driving License</div>
        <div class="service-pill">RTI</div>
        <div class="service-pill">Ration Card</div>
    </div>
    """, unsafe_allow_html=True)

# -----------------------------
# Chat memory
# -----------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []

# -----------------------------
# Empty state
# -----------------------------
if len(st.session_state.messages) == 0:
    st.markdown("""
    <div class="empty-state">
        <div class="empty-state-title">How can VEER help you today?</div>
        <div class="empty-state-sub">
            Ask about any government service — Aadhaar, Passport, PAN Card,<br>
            Driving License, RTI filings, or Ration Card applications.
        </div>
    </div>
    """, unsafe_allow_html=True)

# -----------------------------
# Handle quick action prefill
# -----------------------------
if "prefill" in st.session_state and st.session_state.prefill:
    prefill_prompt = st.session_state.prefill
    st.session_state.prefill = None

    st.session_state.messages.append({"role": "user", "content": prefill_prompt})

    with st.chat_message("user"):
        st.markdown(prefill_prompt)

    with st.chat_message("assistant"):
        placeholder = st.empty()
        detected = detect_service(prefill_prompt)
        system_prompt = build_system_prompt(language, detected)
        full_response = stream_claude_response(system_prompt, st.session_state.messages, placeholder)

    st.session_state.messages.append({"role": "assistant", "content": full_response})

# -----------------------------
# Display chat history
# -----------------------------
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# -----------------------------
# Chat input
# -----------------------------
prompt = st.chat_input("Ask about any government service...")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        placeholder = st.empty()
        detected = detect_service(prompt)
        system_prompt = build_system_prompt(language, detected)
        full_response = stream_claude_response(system_prompt, st.session_state.messages, placeholder)

    st.session_state.messages.append({"role": "assistant", "content": full_response})

# -----------------------------
# Footer
# -----------------------------
st.markdown(
    '<div class="veer-footer">VEER &middot; Always verify information on official government portals before taking action</div>',
    unsafe_allow_html=True
)
