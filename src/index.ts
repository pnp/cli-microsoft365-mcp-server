import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import * as listSchemas from './listSchemas.js';
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

// TODO: this will get very big, think of a way to split this into multiple files and autgenerate this based on cli for m365 docs
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list-add",
                description: "Creates list in the specified site",
                inputSchema: zodToJsonSchema(listSchemas.ListAddSchema),
            },
            {
                name: "list-get",
                description: "Gets information about the specific list",
                inputSchema: zodToJsonSchema(listSchemas.ListGetSchema),
            },
            {
                name: "list-list",
                description: "Gets all lists within the specified site",
                inputSchema: zodToJsonSchema(listSchemas.ListListSchema),
            },
            {
                name: "list-remove",
                description: "Removes the specified list",
                inputSchema: zodToJsonSchema(listSchemas.ListRemoveSchema),
            }
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        if (!request.params.arguments) {
            throw new Error("Arguments are required");
        }

        // TODO: this will get very big, think of a way to split this into multiple files and autgenerate this based on cli for m365 docs
        switch (request.params.name) {
            case "list-add": {
                const args = listSchemas.ListAddSchema.parse(request.params.arguments);
                const output = await util.runCliCommand('spo list add', {
                    title: args.title,
                    webUrl: args.webUrl,
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(output) }],
                };
            }
            case "list-get": {
                const args = listSchemas.ListGetSchema.parse(request.params.arguments);
                const output = await util.runCliCommand('spo list get', {
                    title: args.title,
                    webUrl: args.webUrl,
                    withPermissions: args.withPermissions,
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(output) }],
                };
            }
            case "list-list": {
                const args = listSchemas.ListListSchema.parse(request.params.arguments);
                const output = await util.runCliCommand('spo list list', {
                    webUrl: args.webUrl
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(output) }],
                };
            } case "list-remove": {
                const args = listSchemas.ListRemoveSchema.parse(request.params.arguments);
                const output = await util.runCliCommand('spo list remove', {
                    title: args.title,
                    webUrl: args.webUrl,
                    force: true
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(output) }],
                };
            }
            default:
                throw new Error(`Unknown tool: ${request.params.name}`);
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
        }
        throw error; // TODO: in this case it will be a cli for m365 error, think of a way to handle it
    }
});

async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Microsoft 365 Server running on stdio");
}

runServer().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});