#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as util from './util.js';


const server = new McpServer({
    name: "microsoft-365-mcp-server",
    version: "0.0.1",
});

server.tool('m365GetCommands', 'Gets all CLI for Microsoft 365 commands to be used by the Model Context Protocol to pick the right command for a given task',
    {},
    { title: 'Get all CLI for Microsoft 365 commands' },
    async ({ }) => {
        const commands = await util.getAllCommands();
        return {
            content: [
                { type: 'text', text: "TIP: Before executing any of the command run the 'm365GetCommandDocs' tool to retrieve more context about it" },
                { type: 'text', text: JSON.stringify(commands, null, 2) }
            ]
        };
    }
);

server.tool('m365GetCommandDocs', 'Gets documentation for a specified CLI for Microsoft 365 command to be used by the Model Context Protocol to provide detailed information about the command along with examples, use cases, and option descriptions',
    {
        commandName: z.string().describe('command name which for which documentation is requested'),
        docs: z.string().describe('file path to command documentation')
    },
    { title: 'Get docs for specified CLI for Microsoft 365 command' },
    async ({ commandName, docs }) => ({
        content: [{ type: 'text', text: await util.getCommandDocs(commandName, docs) }]
    })
);

server.tool('m365RunCommand', 'Runs a specified CLI for Microsoft 365 command to be used by the Model Context Protocol to execute the command and return the result and reason over the response',
    {
        command: z.string().describe('command name which should be run')
    },
    { title: 'Run specified CLI for Microsoft 365 command' },
    async ({ command }) => ({
        content: [{ type: 'text', text: await util.runCliCommand(command) }]
    })
);

const transport = new StdioServerTransport();
await server.connect(transport);