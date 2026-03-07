import streamlit as st
import ollama
import json

# -----------------------------
# Load knowledge base
# -----------------------------
with open("knowledge.json", "r") as file:
    knowledge = json.load(file)

# -----------------------------
# Page config
# -----------------------------
st.set_page_config(
    page_title="VEER AI",
    page_icon="🇮🇳",
    layout="wide"
)

# -----------------------------
# Styling
# -----------------------------
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

html, body, [class*="css"] {
    font-family: 'Inter', sans-serif;
}

.stApp {
    background: #121212;
    color: white;
}

.stApp::before {
    content: "";
    position: fixed;
    top: 50%;
    left: 50%;
    width: 900px;
    height: 900px;
    background-image: url("https://upload.wikimedia.org/wikipedia/commons/1/17/Ashoka_Chakra.svg");
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    opacity: 0.03;
    transform: translate(-50%, -50%);
    pointer-events: none;
}

.block-container {
    padding-top: 2rem;
}

.veer-title {
    font-size: 3.8rem;
    font-weight: 800;
}

.veer-subtitle {
    color: rgba(255,255,255,0.75);
    font-size: 1.1rem;
}

.card {
    background: rgba(255,255,255,0.05);
    padding: 20px;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.08);
}

section[data-testid="stSidebar"] {
    background: rgba(255,255,255,0.04);
    backdrop-filter: blur(20px);
}
</style>
""", unsafe_allow_html=True)

# -----------------------------
# Sidebar
# -----------------------------
with st.sidebar:

    st.title("⚙️ VEER Settings")

    language = st.selectbox(
        "Choose language",
        ["English", "Hindi"]
    )

    service = st.selectbox(
        "Choose service",
        [
            "General",
            "Passport",
            "Aadhaar",
            "PAN",
            "Driving License",
            "RTI",
            "Ration Card"
        ]
    )

    st.divider()

    st.subheader("About VEER")

    st.write(
        "VEER helps Indian users understand government processes "
        "and official portals in simple language."
    )

    st.caption(
        "Always verify details on official government portals."
    )

# -----------------------------
# Header
# -----------------------------
st.markdown('<div class="veer-title">🇮🇳 VEER AI</div>', unsafe_allow_html=True)

st.markdown(
    '<div class="veer-subtitle">Your assistant for Indian government processes.</div>',
    unsafe_allow_html=True
)

st.write("")

# -----------------------------
# Feature cards
# -----------------------------
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.markdown('<div class="card"><b>📄 Documents</b><br>Know what papers you need.</div>', unsafe_allow_html=True)

with col2:
    st.markdown('<div class="card"><b>🪜 Steps</b><br>Clear process guidance.</div>', unsafe_allow_html=True)

with col3:
    st.markdown('<div class="card"><b>🔗 Links</b><br>Official government portals.</div>', unsafe_allow_html=True)

with col4:
    st.markdown('<div class="card"><b>🧾 Forms</b><br>Find application forms.</div>', unsafe_allow_html=True)

st.divider()

# -----------------------------
# Chat memory
# -----------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []

# -----------------------------
# Display chat history
# -----------------------------
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# -----------------------------
# Chat input
# -----------------------------
prompt = st.chat_input("Ask VEER about Indian government services...")

if prompt:

    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):

        response_placeholder = st.empty()
        full_response = ""

        # Send prompt to model
        stream = ollama.chat(
            model="phi3",
            messages=[
                {
                    "role": "system",
                    "content": f"""
You are VEER AI helping Indian citizens understand government procedures.

Structure answers exactly like this:

Overview
Step-by-step process
Documents required
Official website
Form link if available

Be cautious. Do not invent government policies.
Respond in {language}.
"""
                },
                {"role": "user", "content": prompt}
            ],
            stream=True
        )

        for chunk in stream:
            full_response += chunk["message"]["content"]
            response_placeholder.markdown(full_response)

    st.session_state.messages.append({"role": "assistant", "content": full_response})

# -----------------------------
# Footer
# -----------------------------
st.divider()

st.caption("VEER AI • Simplifying Indian bureaucracy")