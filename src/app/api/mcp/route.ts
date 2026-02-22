import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * MCP (Model Context Protocol) Server endpoint
 * Provides OAuth-enabled access to kazikashi-ai functionality
 * Implements the MCP protocol for tool calling
 */

interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const MCP_TOOLS: MCPTool[] = [
  {
    name: "list_chores",
    description: "List all household chores for the current user's family",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "log_chore",
    description: "Log a completed chore record",
    inputSchema: {
      type: "object",
      properties: {
        choreId: { type: "string", description: "The ID of the chore to log" },
        date: {
          type: "string",
          format: "date-time",
          description: "Date when the chore was done (ISO 8601)",
        },
      },
      required: ["choreId"],
    },
  },
  {
    name: "get_monthly_stats",
    description: "Get chore statistics for the current month by user",
    inputSchema: {
      type: "object",
      properties: {
        year: { type: "number", description: "Year (defaults to current year)" },
        month: { type: "number", description: "Month 1-12 (defaults to current month)" },
      },
    },
  },
  {
    name: "list_family_members",
    description: "List all members of the current user's family",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  familyId: string
) {
  switch (toolName) {
    case "list_chores": {
      const chores = await prisma.chore.findMany({
        where: { familyId },
        include: { category: true },
        orderBy: { name: "asc" },
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(chores, null, 2),
          },
        ],
      };
    }

    case "log_chore": {
      const choreId = args.choreId as string;
      const chore = await prisma.chore.findFirst({
        where: { id: choreId, familyId },
      });
      if (!chore) {
        return { content: [{ type: "text", text: "Chore not found" }], isError: true };
      }

      const record = await prisma.choreRecord.create({
        data: {
          choreId,
          userId,
          familyId,
          date: args.date ? new Date(args.date as string) : new Date(),
          points: chore.points,
        },
        include: {
          chore: true,
          user: { select: { name: true } },
        },
      });

      return {
        content: [
          {
            type: "text",
            text: `Logged "${record.chore.name}" for ${record.user.name} (${record.points} points)`,
          },
        ],
      };
    }

    case "get_monthly_stats": {
      const now = new Date();
      const year = (args.year as number) ?? now.getFullYear();
      const month = (args.month as number) ?? now.getMonth() + 1;
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);

      const records = await prisma.choreRecord.findMany({
        where: { familyId, date: { gte: start, lte: end } },
        include: {
          user: { select: { id: true, name: true } },
          chore: { select: { name: true } },
        },
      });

      const statsByUser: Record<string, { name: string; points: number; count: number }> = {};
      for (const record of records) {
        if (!statsByUser[record.userId]) {
          statsByUser[record.userId] = {
            name: record.user.name ?? "Unknown",
            points: 0,
            count: 0,
          };
        }
        statsByUser[record.userId].points += record.points;
        statsByUser[record.userId].count += 1;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ year, month, stats: Object.values(statsByUser) }, null, 2),
          },
        ],
      };
    }

    case "list_family_members": {
      const family = await prisma.family.findUnique({
        where: { id: familyId },
        include: {
          members: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true } },
        },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(family, null, 2),
          },
        ],
      };
    }

    default:
      return { content: [{ type: "text", text: "Unknown tool" }], isError: true };
  }
}

export async function POST(request: NextRequest) {
  // Verify OAuth authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", message: "OAuth authentication required" },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="kazikashi-ai"' } }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  });

  let body: MCPRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null },
      { status: 400 }
    );
  }

  const { id, method, params = {} } = body;

  switch (method) {
    case "initialize":
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "kazikashi-ai",
            version: "1.0.0",
          },
          capabilities: {
            tools: {},
          },
        },
      });

    case "tools/list":
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { tools: MCP_TOOLS },
      });

    case "tools/call": {
      const toolName = params.name as string;
      const toolArgs = (params.arguments as Record<string, unknown>) ?? {};

      if (!user?.familyId) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: "User is not in a family" }],
            isError: true,
          },
        });
      }

      const result = await handleToolCall(toolName, toolArgs, session.user.id, user.familyId);

      return NextResponse.json({ jsonrpc: "2.0", id, result });
    }

    default:
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: "Method not found" },
      });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "kazikashi-ai MCP Server",
    version: "1.0.0",
    protocolVersion: "2024-11-05",
    description: "Household chore management MCP server",
    authentication: "OAuth 2.0",
    capabilities: {
      tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
    },
  });
}
