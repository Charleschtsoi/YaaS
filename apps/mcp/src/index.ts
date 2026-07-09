#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { requestHumanSchema } from "@yaas/shared";

const API_URL = process.env.YAAS_API_URL ?? "http://localhost:3000";
const API_KEY = process.env.YAAS_API_KEY ?? "";

const server = new McpServer({
  name: "yaas",
  version: "0.1.0",
});

server.tool(
  "requestHuman",
  "Request a human to perform a real-world task",
  {
    taskType: z.enum(["verify", "collect", "judge", "act", "fix"]),
    description: z.string(),
    location: z
      .object({
        lat: z.number(),
        lng: z.number(),
        radius_km: z.number().optional(),
      })
      .optional(),
    budget_usd: z.number(),
    urgency: z.enum(["sync_60s", "async_1h", "async_24h"]),
    proofRequired: z
      .enum(["photo", "gps", "signature", "text", "video"])
      .optional(),
    skillsRequired: z.array(z.string()).optional(),
  },
  async (args) => {
    const parsed = requestHumanSchema.safeParse(args);
    if (!parsed.success) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Invalid input: ${parsed.error.message}`,
          },
        ],
        isError: true,
      };
    }

    if (!API_KEY) {
      return {
        content: [
          {
            type: "text" as const,
            text: "YAAS_API_KEY environment variable is required",
          },
        ],
        isError: true,
      };
    }

    try {
      const res = await fetch(`${API_URL}/v1/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Task creation failed (${res.status}): ${JSON.stringify(data)}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                taskId: data.id,
                status: data.status,
                message: `Task created. Poll GET /v1/tasks/${data.id} for results.`,
                slaMinutes: data.slaMinutes,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Request failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.resource(
  "task",
  "task://{taskId}",
  async (uri) => {
    const taskId = uri.pathname.replace(/^\//, "");
    if (!API_KEY) {
      return { contents: [{ uri: uri.href, text: "API key not configured" }] };
    }

    const res = await fetch(`${API_URL}/v1/tasks/${taskId}/public`);
    const data = await res.json();

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("YAAS MCP server running on stdio");
}

main().catch(console.error);
