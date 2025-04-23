import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import * as util from './util.js';

const server = new Server(
    {
        name: "microsoft-365-mcp-server",
        version: "0.0.1",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: await util.getAllCommands() }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const output = await util.runCliCommand(request.params.name, request.params.arguments);
        return { content: [{ type: "text", text: JSON.stringify(output) }] };
    } catch (error) {
        throw error;
    }
});

async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("CLI for Microsoft 365 MCP Server running on stdio");
}

runServer().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});