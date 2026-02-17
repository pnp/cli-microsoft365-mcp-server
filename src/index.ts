#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as util from './util.js';


const server = new McpServer({
    name: "microsoft-365-mcp-server",
    version: "0.0.1",
});

server.registerTool(
    'm365_search_commands',
    {
        title: 'Search CLI for Microsoft 365 commands',
        description: 'Searches CLI for Microsoft 365 commands using fuzzy search based on a query string. Use this tool first to find relevant commands before getting full command documentation.',
        inputSchema:
        {
            query: z.string().describe('Search query to find relevant commands (e.g., "sharepoint list", "teams channel", "user add")'),
            limit: z.number().optional().describe('Maximum number of results to return (default: 10, max: 50)')
        }
    },
    async ({ query, limit }) => {
        const maxLimit = Math.min(limit || 10, 50);
        const commands = await util.searchCommands(query, maxLimit);
        
        // Check if the result contains an error
        if (commands.length > 0 && 'error' in commands[0]) {
            return {
                content: [
                    { type: 'text', text: JSON.stringify(commands) }
                ]
            };
        }
        
        return {
            content: [
                { type: 'text', text: `Found ${commands.length} command(s) matching "${query}"` },
                { type: 'text', text: "TIP: Before executing any of the commands run the 'm365_get_command_docs' tool to retrieve more context about it" },
                { type: 'text', text: "TIP: avoid setting the '--output' option when running commands. The optimal output format is automatically selected in 'm365_run_command' tool based on the command type." },
                { type: 'text', text: JSON.stringify(commands) }
            ]
        };
    }
);

server.registerTool(
    'm365_get_command_docs',
    {
        title: 'Retrieve CLI for Microsoft 365 command docs',
        description: 'Gets documentation for a specified CLI for Microsoft 365 command to be used by the Model Context Protocol to provide detailed information about the command along with examples, use cases, and option descriptions',
        inputSchema:
        {
            commandName: z.string().describe('command name which for which documentation is requested'),
            docs: z.string().describe('file path to command documentation')
        }
    },
    async ({ commandName, docs }) => ({
        content: [
            { type: 'text', text: "TIP: avoid setting the '--output' option when running commands. The optimal output format is automatically selected in 'm365_run_command' tool based on the command type." },
            { type: 'text', text: await util.getCommandDocs(commandName, docs) }
        ]
    })
);

server.registerTool(
    'm365_run_command',
    {
        title: 'Execute CLI for Microsoft 365 command',
        description: 'Runs a specified CLI for Microsoft 365 command to be used by the Model Context Protocol to execute the command and return the result and reason over the response',
        inputSchema:
        {
            command: z.string().describe('command name which should be executed')
        }
    },
    async ({ command }) => ({
        content: [{ type: 'text', text: await util.runCliCommand(command) }]
    })
);

server.registerTool(
    'm365_get_best_practices',
    {
        title: 'Retrieve CLI for Microsoft 365 best practices',
        description: 'Gets best practices for using CLI for Microsoft 365 in scripts, including guidance on authentication checking, error handling, output handling, and configuration',
        inputSchema: {}
    },
    async ({ }) => ({
        content: [{ type: 'text', text: await util.getBestPractices() }]
    })
);

const transport = new StdioServerTransport();
await server.connect(transport);