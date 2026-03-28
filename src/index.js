#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, TextContent, Tool } from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import https from "https";

dotenv.config();

// Validate required environment variables
const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN;
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) {
  throw new Error("Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD environment variables");
}
if (!ANTHROPIC_API_KEY) {
  throw new Error("Missing ANTHROPIC_API_KEY environment variable");
}

// Initialize MCP Server
const server = new Server({
  name: "mcp-serp-brief",
  version: "1.0.0",
});

// Tool definitions
const tools: Tool[] = [
  {
    name: "analyze_serp",
    description: "Analyze SERP results for a given keyword using DataForSEO API",
    inputSchema: {
      type: "object" as const,
      properties: {
        keyword: {
          type: "string",
          description: "The keyword/query to analyze SERP for",
        },
        location_name: {
          type: "string",
          description: "Location for SERP results (e.g., 'United States')",
          default: "United States",
        },
        language_code: {
          type: "string",
          description: "Language code for SERP results (e.g., 'en')",
          default: "en",
        },
        depth: {
          type: "number",
          description: "Number of search results to fetch (10-100)",
          default: 10,
        },
      },
      required: ["keyword"],
    },
  },
  {
    name: "generate_brief",
    description: "Generate a SERP-targeted content brief using SERP analysis and Claude",
    inputSchema: {
      type: "object" as const,
      properties: {
        keyword: {
          type: "string",
          description: "The target keyword",
        },
        serp_data: {
          type: "object",
          description: "SERP analysis data from analyze_serp tool",
        },
        target_length: {
          type: "string",
          description: "Target content length (short/medium/long)",
          enum: ["short", "medium", "long"],
          default: "medium",
        },
        tone: {
          type: "string",
          description: "Content tone (professional/casual/technical)",
          enum: ["professional", "casual", "technical"],
          default: "professional",
        },
      },
      required: ["keyword", "serp_data"],
    },
  },
];

// DataForSEO API call function
async function callDataForSeoApi(endpoint: string, data: object): Promise<object> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const auth = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString("base64");

    const options = {
      hostname: "api.dataforseo.com",
      path: `/v3/${endpoint}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        Authorization: `Basic ${auth}`,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve(parsed);
          } else {
            reject(new Error(`DataForSEO API error: ${res.statusCode} - ${responseData}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse DataForSEO response: ${responseData}`));
        }
      });
    });

    req.on("error", (e) => {
      reject(new Error(`DataForSEO API request error: ${e.message}`));
    });

    req.write(postData);
    req.end();
  });
}

// Anthropic API call function
async function callClaudeApi(systemPrompt: string, userMessage: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const payload = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    };

    const postData = JSON.stringify(payload);

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode === 200) {
            const content = parsed.content[0];
            if (content && content.text) {
              resolve(content.text);
            } else {
              reject(new Error("Invalid Claude API response format"));
            }
          } else {
            reject(new Error(`Claude API error: ${res.statusCode} - ${responseData}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Claude response: ${responseData}`));
        }
      });
    });

    req.on("error", (e) => {
      reject(new Error(`Claude API request error: ${e.message}`));
    });

    req.write(postData);
    req.end();
  });
}

// Tool request handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "analyze_serp") {
      const keyword = args.keyword as string;
      const location = args.location_name || "United States";
      const language = args.language_code || "en";
      const depth = Math.min(Math.max(args.depth || 10, 10), 100);

      const payload = [
        {
          keyword,
          location_name: location,
          language_code: language,
          depth,
          sort_by: "relevance",
        },
      ];

      const result = (await callDataForSeoApi("serp/google/organic/live/advanced", payload)) as any;

      if (result.tasks && result.tasks[0]) {
        const task = result.tasks[0];
        const results = task.result || [];

        // Extract key information from SERP results
        const analysis = {
          keyword,
          location,
          language,
          total_results: results.length,
          top_domains: results.slice(0, 5).map((r: any) => ({
            url: r.url,
            title: r.title,
            description: r.description,
            type: r.type,
            rank: r.rank_group,
          })),
          featured_snippets: results.filter((r: any) => r.type === "featured_snippet").slice(0, 3),
          people_also_ask: results.filter((r: any) => r.type === "people_also_ask").slice(0, 3),
          answer_box: results.find((r: any) => r.type === "answer_box") || null,
        };

        return {
          isError: false,
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(analysis, null, 2),
            },
          ],
        };
      } else {
        throw new Error("No SERP results returned from DataForSEO");
      }
    }

    if (name === "generate_brief") {
      const keyword = args.keyword as string;
      const serpData = args.serp_data as object;
      const targetLength = args.target_length || "medium";
      const tone = args.tone || "professional";

      const lengthGuidelines = {
        short: "800-1000 words",
        medium: "1500-2000 words",
        long: "2500-3500 words",
      };

      const systemPrompt = `You are an expert SEO content strategist specializing in SERP-targeted content briefs.
Your briefs should be comprehensive, actionable, and directly informed by SERP analysis.
Generate briefs that include:
- Content outline with H2/H3 headers
- Target keyword placement strategy
- Key topics to cover based on SERP analysis
- FAQ section recommendations
- Internal/external linking strategy
- Content format recommendations (blog post, guide, pillar page, etc.)
- Estimated word count and reading time
- Quality scoring rubric (0-100) based on SERP competitiveness`;

      const userMessage = `Generate a ${targetLength} SERP-targeted content brief for the keyword "${keyword}" with a ${tone} tone.

SERP Analysis Data:
${JSON.stringify(serpData, null, 2)}

Target length: ${lengthGuidelines[targetLength as keyof typeof lengthGuidelines]}
Tone: ${tone}

Please structure the brief clearly with sections and make it immediately actionable for content writers.`;

      const briefContent = await callClaudeApi(systemPrompt, userMessage);

      return {
        isError: false,
        content: [
          {
            type: "text" as const,
            text: briefContent,
          },
        ],
      };
    }

    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Unknown tool: ${name}`,
        },
      ],
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
});

// List available tools
server.setRequestHandler("tools/list", async () => {
  return { tools };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
