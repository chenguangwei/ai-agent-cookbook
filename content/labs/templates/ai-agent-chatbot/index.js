import express from 'express';
import { OpenAI } from 'openai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// --- Configuration ---
// Replace with your own API key and base URL
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-your-key-here',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

// --- Tool Definitions ---
// These are the "skills" your agent can use
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather for a given city',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name, e.g. "Tokyo"' },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Evaluate a mathematical expression',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Math expression, e.g. "2 + 3 * 4"' },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: 'Search internal knowledge base for information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  },
];

// --- Tool Implementations ---
// TODO: Replace these mock implementations with real APIs
function getWeather(city) {
  const mockData = {
    Tokyo: { temp: 22, condition: 'Sunny', humidity: 45 },
    London: { temp: 15, condition: 'Cloudy', humidity: 72 },
    'New York': { temp: 28, condition: 'Clear', humidity: 55 },
  };
  const data = mockData[city] || { temp: 20, condition: 'Unknown', humidity: 50 };
  return `Weather in ${city}: ${data.temp}°C, ${data.condition}, Humidity: ${data.humidity}%`;
}

function calculate(expression) {
  try {
    // Simple and safe math evaluation
    const result = Function(`"use strict"; return (${expression})`)();
    return `${expression} = ${result}`;
  } catch {
    return `Error evaluating: ${expression}`;
  }
}

function searchKnowledge(query) {
  // TODO: Replace with vector search (e.g. Pinecone, Chroma, pgvector)
  const kb = [
    { topic: 'agents', content: 'AI agents are systems that use LLMs to reason and take actions autonomously.' },
    { topic: 'rag', content: 'RAG (Retrieval-Augmented Generation) combines search with LLM generation for accurate answers.' },
    { topic: 'tools', content: 'Tool calling allows LLMs to invoke external functions to perform real-world actions.' },
  ];
  const match = kb.find((item) => query.toLowerCase().includes(item.topic));
  return match ? match.content : `No results found for: "${query}"`;
}

// --- Execute Tool Call ---
function executeTool(name, args) {
  switch (name) {
    case 'get_weather':
      return getWeather(args.city);
    case 'calculate':
      return calculate(args.expression);
    case 'search_knowledge':
      return searchKnowledge(args.query);
    default:
      return `Unknown tool: ${name}`;
  }
}

// --- Agent Loop ---
// This is the core agent pattern: LLM → Tool Call → Result → LLM → ...
async function agentChat(messages) {
  const maxIterations = 5;

  for (let i = 0; i < maxIterations; i++) {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
    });

    const assistantMessage = response.choices[0].message;
    messages.push(assistantMessage);

    // If no tool calls, we have the final answer
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return assistantMessage.content;
    }

    // Execute each tool call and add results to the conversation
    for (const toolCall of assistantMessage.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = executeTool(toolCall.function.name, args);

      console.log(`🔧 Tool: ${toolCall.function.name}(${JSON.stringify(args)}) → ${result}`);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  return 'Agent reached maximum iterations. Please try a simpler question.';
}

// --- API Route ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    const messages = [
      {
        role: 'system',
        content: `You are a helpful AI agent. You have access to tools for weather lookup, math calculations, and knowledge search. Use them when appropriate. Be concise and helpful.`,
      },
      ...history,
      { role: 'user', content: message },
    ];

    const reply = await agentChat(messages);
    res.json({ reply, messages });
  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 AI Agent Chatbot running at http://localhost:${PORT}`);
  console.log(`📝 Open the browser to start chatting!`);
});
