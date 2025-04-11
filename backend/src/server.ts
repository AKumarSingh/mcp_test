import express from "express";
import { config } from "dotenv";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import cors from "cors";

config();

const server = new McpServer({
  name: "mcp-sse-server",
  version: "1.0.0",
  timeout: process.env.MCP_TIMEOUT ? parseInt(process.env.MCP_TIMEOUT) : 300000, // 5 minute default timeout
});

console.log(z.string().describe("The full prompt to get answers from Zoltar (this is for DSN docs only)"))


server.tool(
  "zoltar_getAnswer",
  {
    fullPrompt: z.string().describe("The full prompt to get answers from Zoltar (this is for DSN docs only)"),
  
  },
  async ({ fullPrompt }) => {
    try {
      console.log("Asking this from Zoltar : ", fullPrompt);
    
      return {
        content: [
          {
            type: "text",
            text: "I am just replying back to prove that i can talk to you . You asked me to answer this question : " + fullPrompt
          }
        ]
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching data from Zoltar: ${err}`,
          },
        ],
      };
    }
  }
);



server.resource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  async (uri, { name }) => ({
    contents: [
      {
        uri: uri.href,
        text: `Hello, ${name}!`,
      },
    ],
  })
);

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: false,
  })
);

app.get("/", (req, res) => {
  res.json({
    name: "MCP SSE Server",
    version: "1.0.0",
    status: "running",
    endpoints: {
      "/": "Server information (this response)",
      "/sse": "Server-Sent Events endpoint for MCP connection",
      "/messages": "POST endpoint for MCP messages",
    },
    tools: [
      { name: "add", description: "Add two numbers together" },
      { name: "zoltar_getAnswer", description: "Ask Zoltar a Question about Adobe projects" },
    ],
  });
});

let transport: SSEServerTransport;

app.get("/sse", async (req, res) => {
  req.setTimeout(process.env.MCP_TIMEOUT ? parseInt(process.env.MCP_TIMEOUT) : 300000);
  res.setTimeout(process.env.MCP_TIMEOUT ? parseInt(process.env.MCP_TIMEOUT) : 300000);
  
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  
  await transport.handlePostMessage(req, res);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MCP SSE Server running on port ${PORT}`);
});
