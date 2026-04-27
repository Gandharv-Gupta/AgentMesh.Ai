<div align="center">

# 🧬 AgentMesh

### A Graph-Based Multi-Agent Intelligence Platform

*Build, visualize, and deploy multi-agent workflows — no code required.*

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-Orchestration-FF6F00)](https://github.com/langchain-ai/langgraph)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 🎯 What is AgentMesh?

AgentMesh is a **visual platform for building multi-agent AI systems** using a graph-based architecture. Instead of writing complex orchestration code, you create **Tools → Agents → Nodes → Graphs** through an interactive canvas and connect them to real-world interfaces like Telegram.

Each agent is an autonomous LLM-powered unit with its own tools and personality. Agents are wrapped as graph nodes and connected via edges — including **conditional routing** that dynamically decides which agent handles each step based on conversation state.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔧 **Dynamic Tool Factory** | Create code-based (lambda/def) or LLM-based tools on the fly |
| 🤖 **Agent Builder** | Define agents with custom system prompts, tools, and GPT-4o |
| 🧩 **Visual Graph Canvas** | Drag-and-drop React Flow canvas with hub-and-spoke tool visualization |
| ⚡ **Conditional Routing** | Python router functions that inspect state and route dynamically |
| 📱 **Telegram Integration** | Connect any graph to a Telegram bot with session memory |
| 🔍 **Execution Tracker** | Real-time panel showing which agent is active with node glow |
| 🎯 **One-Click Demo** | Pre-built flight booking demo with 3 agents and conditional edges |
| 📋 **Detail Panels** | Click any agent, tool, or conditional edge to inspect its config |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    🌐 User Layer                         │
│  React Flow Frontend          Telegram Bot               │
│  (Canvas + Panels)            (Polling + Sessions)       │
└───────────────┬───────────────────────┬─────────────────┘
                │       HTTP REST       │
┌───────────────▼───────────────────────▼─────────────────┐
│                  ⚡ FastAPI Backend                       │
│  /tools  /agents  /nodes  /graphs  /telegram  /execution │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                  🧬 Core Engine (main.py)                │
│                                                          │
│  ToolFactory ──→ Agent ──→ NodeFactory ──→ GraphBuilder  │
│       │                                       │          │
│  (code/llm)    StateFactory ──→ AgentState    │          │
│                                               ▼          │
│                                      compile() → run()   │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│               🔗 LangGraph Runtime                       │
│  StateGraph → START → [Nodes] → Conditional Edges → END │
│                    Messages State (operator.add)          │
└─────────────────────────────────────────────────────────┘
```

### Core Classes

| Class | Role |
|-------|------|
| **`ToolFactory`** | Creates LangChain `@tool` wrappers — either from Python code or LLM prompt templates |
| **`StateFactory`** | Generates `TypedDict` state schemas extending `BaseAgentState` with custom fields |
| **`Agent`** | Wraps `create_react_agent` with tools, system prompt, and GPT-4o |
| **`NodeFactory`** | Wraps an Agent (or plain function) into a `(name, fn)` pair for the graph |
| **`GraphBuilder`** | Collects nodes, edges, conditional edges → `compile()` → `run()` |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- OpenAI API key
- *(Optional)* Telegram Bot Token

### 1. Clone & Setup

```bash
git clone https://github.com/YOUR_USERNAME/AgentMesh.git
cd AgentMesh

# Backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
cd ..
```

### 2. Configure Environment

```bash
# Create .env in project root
echo 'OPENAI_API_KEY=sk-your-key-here' > .env
echo 'TELEGRAM_BOT_TOKEN=your-bot-token' >> .env  # optional
```

### 3. Run

```bash
./start.sh
```

Or manually:

```bash
# Terminal 1 — Backend
uvicorn backend_api:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** → Click **🚀 Load Flight Booking Demo** → Connect to Telegram and test!

---

## 🎮 Flight Booking Demo

The one-click demo creates a complete multi-agent flow:

```
START ──→ [Router] ──→ info_collector ──→ END
                  ──→ flight_search  ──→ END
                  ──→ booking_agent  ──→ END
```

| Agent | Tools | Job |
|-------|-------|-----|
| **info_collector** | `validate_info` (LLM) | Collects name, age, phone, departure, destination |
| **flight_search** | `search_flights` (LLM) | Generates flight options with prices |
| **booking_agent** | `book_flight` (LLM) | Creates booking confirmation with ID |

The **conditional router** at START inspects the conversation state and routes each message to the right agent:
- No info yet → `info_collector`
- All details collected → `flight_search`
- User picked a flight → `booking_agent`
- Booking confirmed → `END`

---

## 📂 Project Structure

```
AgentMesh/
├── main.py                 # Core classes: ToolFactory, Agent, NodeFactory, GraphBuilder
├── backend_api.py          # FastAPI server with all REST endpoints
├── pydantic_models.py      # Request/response models
├── start.sh                # One-command launcher
├── requirements.txt        # Python dependencies
├── .env                    # API keys (not committed)
├── mermaid.mmd             # Architecture diagram
└── frontend/               # React + Vite + React Flow UI
```

---

## 🔌 API Reference

### Tools
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/tools/create` | Create a code or LLM tool |
| `GET` | `/tools/list` | List all tools |
| `GET` | `/tools/{name}` | Get tool details |

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/agents/create` | Create agent with tools |
| `GET` | `/agents/list` | List all agents |
| `POST` | `/agents/{name}/invoke` | Invoke agent directly |

### Graphs
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/graphs/create` | Create named graph |
| `POST` | `/graphs/{name}/add_node` | Add node to graph |
| `POST` | `/graphs/{name}/set_entry` | Set entry point |
| `POST` | `/graphs/{name}/set_end` | Set end node |
| `POST` | `/graphs/{name}/add_edge` | Add direct edge |
| `POST` | `/graphs/{name}/add_conditional_edge` | Add conditional routing |
| `POST` | `/graphs/{name}/run` | Run the graph |

### Telegram
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/telegram/connect` | Connect graph to Telegram bot |
| `POST` | `/telegram/disconnect` | Disconnect bot |
| `GET` | `/telegram/status` | Check connection status |

### Execution
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/execution/status` | Get execution log |
| `POST` | `/execution/clear` | Clear execution log |

---

## 🛠️ Building Own Flow

Create any agent workflow:

1. **Create Tools** — Code tools (`lambda q: ...`) or LLM tools (prompt templates)
2. **Create Agents** — Assign tools and write a system prompt
3. **Create Nodes** — Wrap agents (or plain functions) as graph nodes
4. **Build Graph** — Set entry, add edges (direct or conditional), set end nodes
5. **Run** — Via the Run Panel, API, or connect to Telegram

Conditional edges accept a Python `def router(state):` function that reads `state["messages"]` and returns a key from the destination map.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| **LLM** | OpenAI GPT-4o via `langchain-openai` |
| **Orchestration** | LangGraph `StateGraph` + `create_react_agent` |
| **Backend** | FastAPI + Uvicorn |
| **Frontend** | React 19 + Vite + @xyflow/react |
| **Messaging** | Telegram Bot API (long polling) |
| **State** | In-memory stores + per-chat session memory |

---

## 📄 License

All Rights Reserved

---

<div align="center">

**Built with 🧬 by [Gandharv Gupta](https://github.com/YOUR_USERNAME)**

*AgentMesh — Where agents meet graphs.*

</div>
