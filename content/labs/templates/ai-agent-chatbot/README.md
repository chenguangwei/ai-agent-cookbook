# AI Agent Chatbot

A hands-on practice lab for building an AI chatbot with **tool-calling** capabilities.

## What You'll Learn

- The **Agent Loop** pattern: LLM → Tool Call → Result → LLM → Final Answer
- How to define **tools** (functions) that the LLM can invoke
- How to handle **multi-step reasoning** with iterative tool execution
- Building a simple chat UI with streaming-style interaction

## Quick Start

```bash
npm install
cp .env.example .env   # Add your API key
npm run dev
```

Open http://localhost:3000 and start chatting!

## Exercises

1. **Add a new tool**: Create a `translate_text` tool that translates text between languages
2. **Add memory**: Store conversation history in a file or database
3. **Add streaming**: Use OpenAI's streaming API for real-time responses
4. **Add error handling**: What happens when a tool call fails? Add retry logic
5. **Multi-agent**: Create a second agent that specializes in code generation

## Architecture

```
User Message
    ↓
[System Prompt + Tools Definition]
    ↓
LLM decides: respond directly OR call tools
    ↓
If tool_calls → execute tools → feed results back → LLM responds
    ↓
Final Response to User
```
