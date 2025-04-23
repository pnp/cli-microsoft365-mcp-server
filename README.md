# CLI for Microsoft 365 MCP Server

## 💡 Description

This MCP server allows to use natural language to execute any CLI for Microsoft 365 command. It allows to create a complex prompt that will be executed by a chain of CLI for Microsoft 365 commands that will try to fulfill the user request. Thanks to this you may manage many different areas of Microsoft 365, for example: Entra ID, OneDrive, OneNote, Outlook, Planner, Power Apps, Power Automate, Power Platform, SharePoint Embedded, SharePoint Online, Teams, Viva Engage, and many more...

For best results use it with Claude Sonnet 4 or Claude Sonnet 3.7.

## 📦 Prerequisites

- Node.js 20.x or higher
- CLI for Microsoft 365 installed globally (`npm i -g @pnp/cli-microsoft365`)

## 🛠️ Installation & Usage

This MCP server uses the globally installed [CLI for Microsoft 365](https://pnp.github.io/cli-microsoft365) that you need to install globally using `npm i -g @pnp/cli-microsoft365`.

After you install the CLI for Microsoft 365 perform the initial setup by running the:

```
m365 setup
```

For more information please follow the [Log in to Microsoft 365](https://pnp.github.io/cli-microsoft365/user-guide/connecting-microsoft-365)

After you setup the CLI for Microsoft 365 please update its configuration using the following commands:

```
m365 cli config set --key prompt --value false
m365 cli config set --key output --value text
m365 cli config set --key helpMode --value full
```

This will ensure that the MCP server will get as much information as possible from the CLI for Microsoft 365 when an error occurs or when a command is not executed properly.

The MCP server will not do any authentication for you. You will need to first authenticate using CLI for Microsoft 365 using [m365 login](https://pnp.github.io/cli-microsoft365/cmd/login) command. Once you are authenticated the MCP server will use the same authentication context when running any tool.

// TODO: finish off when package is ready

## 🧠 LLM Suggestion 

For best results use it with Claude Sonnet 4 or Claude Sonnet 3.7.

## 📷 Use Cases

// TODO: Add use cases for the MCP server

## 🚀 How to build and run it locally

Before anything first run `npm install` to install all dependencies.

Then in order to build the project run:

```
npm run build
```

### Running MCP in VS Code

It is also possible to run the MCP server in VS Code from your local build so that it may be used by GitHub Copilot Agent.
First start the CLI for Microsoft 365 MCP server using the command:

```
npm run start
```

Now go to VS Code GitHub Copilot Agent mode click on the tools icon and select `Add more tools`. Then select `Add MCP server` and then `Command (stdio)` and enter the following command:

```
node FULL_PATH_TO_YOUR_PROJECT/dist/index.js
```

Click enter and name it how ever you like. It is recommended to add it to `workspace` scope for testing. After that open up your `.vscode/mcp.json` file and modify it so pass the environment variables needed for auth.

```json
{
    "servers": {
        "m365-mcp-server": {
            "type": "stdio",
            "command": "node",
            "args": [
                "FULL_PATH_TO_YOUR_PROJECT/dist/index.js" // e.g. C:/workspace/repo/microsoft-365-mcp-server/dist/index.js
            ]
        }
    }
}
```

### Running MCP using the inspector (Debugging)

One of the ways to test the CLI for Microsoft 365 MCP server is using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector). 
Mostly this setup is used for debugging purposes and to test the MCP server locally.
First start the MCP server using the command:

```
npm run start
```

Now in order to run the inspector for your MCP server you need run the following command in the repo root folder location:

```
npx @modelcontextprotocol/inspector node dist/index.js
```

After that wait for the inspector to start and open the inspector in your browser. You should see the MCP server running and you should be able to query the tools and execute them locally.

## 🔗 Resources

- [typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk/tree/main)
- [MCP servers](https://github.com/modelcontextprotocol/servers?tab=readme-ov-file)
- [MCP inspector](https://github.com/modelcontextprotocol/inspector)

