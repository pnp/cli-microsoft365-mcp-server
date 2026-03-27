---
name: cli-microsoft365
description: "Use CLI for Microsoft 365 to manage Microsoft 365 tenants from the terminal. Use when: running m365 commands, managing SharePoint Online, managing Entra ID, managing Teams teams/channels/chats, managing Power Platform, Planner, To Do,Outlook, Viva Engage, querying Microsoft Graph, authenticating to Microsoft 365, scripting Microsoft 365 automation, filtering CLI output with JMESPath."
---

# CLI for Microsoft 365 — Terminal Usage

You are an expert at using CLI for Microsoft 365 (`m365`) to manage Microsoft 365 tenants from the command line. Follow these instructions when the user asks you to run CLI for Microsoft 365 commands.

## Prerequisites

CLI for Microsoft 365 must be installed globally:

```sh
npm install -g @pnp/cli-microsoft365
```

Requires Node.js LTS (18+). Works on Windows, macOS, and Linux with any shell.

## Command Syntax

Every command must be prefixed with `m365`

```
m365 <command-group> <resource> <action> [options]
```

start with `m365` in terminal to get list of command groups and core commands. Use `m365 <command-group> --help` to see available resources and actions within a group.

### Command Groups (Workloads)

| Prefix | Service |
|--------|---------|
| `spo` | SharePoint Online |
| `entra` | Microsoft Entra ID (users, groups, apps, enterprise apps, PIM) |
| `teams` | Microsoft Teams |
| `planner` | Microsoft Planner |
| `todo` | Microsoft To Do |
| `outlook` | Outlook (mail, calendar, rooms) |
| `flow` | Power Automate |
| `pa` | Power Apps |
| `pp` | Power Platform |
| `viva` | Viva Engage |
| `purview` | Microsoft Purview |
| `graph` | Microsoft Graph extensions & subscriptions |
| `external` | Microsoft Search external connections |
| `spe` | SharePoint Embedded |
| `spp` | SharePoint Premium |
| `spfx` | SharePoint Framework project tools |
| `tenant` | Tenant-level reports and service health |
| `onedrive` | OneDrive reports |
| `file` | Cross-service file operations via Graph |
| `search` | Microsoft Search |
| `booking` | Microsoft Bookings |
| `exo` | Exchange Online |

### Core Commands (no workload prefix)

| Command | Purpose |
|---------|---------|
| `m365 login` | Log in to Microsoft 365 |
| `m365 logout` | Log out from Microsoft 365 |
| `m365 status` | Show login status |
| `m365 setup` | Interactive setup wizard for CLI configuration and app registration |
| `m365 request` | Execute raw HTTP requests against any Microsoft API |
| `m365 search` | Query Microsoft 365 data via Microsoft Search |
| `m365 version` | Show CLI version |
| `m365 docs` | Get docs URL |

### CLI Management Commands

| Command | Purpose |
|---------|---------|
| `m365 cli config set` | Set a CLI configuration option |
| `m365 cli config get` | Get a CLI configuration option |
| `m365 cli config list` | List all configuration options |
| `m365 cli config reset` | Reset a configuration option |
| `m365 cli doctor` | Diagnostic information about the environment |
| `m365 connection list` | List available connections |
| `m365 connection use` | Switch to a different connection |

## Authentication

### First-Time Setup

The recommended approach for first-time users:

```sh
m365 setup
```

This wizard creates a Microsoft Entra app registration with the necessary permissions and configures CLI settings.

### Login Methods

**Device code flow (default, interactive):**
```sh
m365 login --appId <app-id> --tenant <tenant-id>
```

**Browser-based (most convenient for interactive use):**
```sh
m365 login --authType browser
```

**Username and password (for automation without MFA):**
```sh
m365 login --authType password --userName user@contoso.com --password pass@word1
```

**Certificate (app-only, for CI/CD):**
```sh
m365 login --authType certificate --certificateFile /path/to/cert.pfx --password 'certPassword'
```

**Client secret (app-only, for CI/CD):**
```sh
m365 login --authType secret --secret topSeCr3t@007
```

**Managed identity (Azure-hosted automation):**
```sh
m365 login --authType identity
```

### Environment Variables

Instead of passing `--appId` and `--tenant` on every login, set:
- `CLIMICROSOFT365_ENTRAAPPID` — Application (client) ID
- `CLIMICROSOFT365_TENANT` — Directory (tenant) ID

### Check Login Status

```sh
m365 status
```

### Multiple Connections

```sh
m365 connection list
m365 connection use --name "Production"
```

## Global Options

Every command supports these options:

| Option | Description |
|--------|-------------|
| `-o, --output [type]` | Output format: `json` (default), `text`, `csv`, `md`, `none` |
| `--query [jmespath]` | JMESPath query to filter/transform output |
| `--verbose` | Verbose logging |
| `--debug` | Debug logging |
| `-h, --help [section]` | Help: `options`, `examples`, `remarks`, `permissions`, `response`, `full` |

### Output Mode Guidelines

- **For scripting/piping:** use `--output json` (default) — returns structured data
- **For human reading:** use `--output text` — returns formatted tables/key-value pairs
- **For spreadsheets:** use `--output csv`
- **For documentation:** use `--output md`
- **For silent/no output:** use `--output none`

When running commands in the terminal for the user, prefer `--output json` so you can parse and reason about results. When showing results to the user for readability, use `--output text`.

## Filtering with JMESPath

Use `--query` to filter and transform JSON output:

```sh
# Get only titles of all sites
m365 spo site list --query "[*].Title"

# Filter sites by title containing "Project"
m365 spo site list --query "[?contains(Title, 'Project')]"

# Select specific fields
m365 spo site list --query "[*].{Title: Title, Url: Url}"

# Combine filter and projection
m365 spo site list --query "[?contains(Title, 'Project')].{Title: Title, Url: Url}"

# Filter on nested properties
m365 flow environment list --query "[?properties.isDefault]"
```

JMESPath queries are **case-sensitive**. Common functions: `contains()`, `starts_with()`, `ends_with()`, `length()`, `sort_by()`, `reverse()`.

## Common Command Patterns

### SharePoint Online

```sh
# List all sites
m365 spo site list

# Get a specific site
m365 spo site get --url https://contoso.sharepoint.com/sites/project

# Create a site
m365 spo site add --type CommunicationSite --title "Project Site" --url https://contoso.sharepoint.com/sites/project

# List all lists in a site
m365 spo list list --webUrl https://contoso.sharepoint.com/sites/project

# Get list items
m365 spo listitem list --webUrl https://contoso.sharepoint.com/sites/project --listTitle "Documents"

# Add a list item
m365 spo listitem add --webUrl https://contoso.sharepoint.com/sites/project --listTitle "Tasks" --Title "New Task"

# Upload a file
m365 spo file add --webUrl https://contoso.sharepoint.com/sites/project --folder "Shared Documents" --path ./report.pdf

# Get a file
m365 spo file get --webUrl https://contoso.sharepoint.com/sites/project --url "/sites/project/Shared Documents/report.pdf"

# List files in a folder
m365 spo file list --webUrl https://contoso.sharepoint.com/sites/project --folder "Shared Documents"

# Modern page operations
m365 spo page add --name "NewPage" --webUrl https://contoso.sharepoint.com/sites/project
m365 spo page list --webUrl https://contoso.sharepoint.com/sites/project
m365 spo page set --name "NewPage" --webUrl https://contoso.sharepoint.com/sites/project --publish

# Set the root SharePoint URL for server-relative paths
m365 spo set --url https://contoso.sharepoint.com
```

### Entra ID (Users, Groups, Apps)

```sh
# List users
m365 entra user list

# Get a user
m365 entra user get --id user@contoso.com

# Create a user
m365 entra user add --displayName "John Doe" --userName john@contoso.com --password "P@ssw0rd!" --accountEnabled true

# List groups
m365 entra group list

# List M365 groups
m365 entra m365group list

# Get app registrations
m365 entra app list
m365 entra app get --appId <app-id>

# Manage app permissions
m365 entra app permission list --appObjectId <object-id>
m365 entra app permission add --appObjectId <object-id> --applicationPermissions "https://graph.microsoft.com/Sites.Read.All"
```

### Microsoft Teams

```sh
# List teams
m365 teams team list

# Get a team
m365 teams team get --id <team-id>

# List channels
m365 teams channel list --teamId <team-id>

# Send a message
m365 teams message send --teamId <team-id> --channelId <channel-id> --message "Hello!"

# List chat conversations
m365 teams chat list

# Send a chat message
m365 teams chat message send --chatId <chat-id> --message "Hi there"

# Create a meeting
m365 teams meeting add --subject "Sprint Review" --startTime "2025-01-15T10:00:00Z" --endTime "2025-01-15T11:00:00Z"
```

### Power Platform

```sh
# List Power Apps
m365 pa app list

# List Power Automate flows
m365 flow list --environmentName <env-name>

# List Power Platform environments
m365 pp environment list
```

### Raw API Requests

The `request` command lets you call any Microsoft API directly:

```sh
# GET request to Graph
m365 request --url "https://graph.microsoft.com/v1.0/me"

# Use URL tokens for shorter URLs
m365 request --url "@graph/me"
m365 request --url "@graphbeta/me/profile"
m365 request --url "@spo/_api/web"

# POST with a body
m365 request --url "@graph/me/messages" --method post --body '{"subject":"Test","body":{"content":"Hello"}}'

# Load body from file
m365 request --url "@graph/teams" --method post --body @team-payload.json

# Specify custom headers
m365 request --url "@spo/_api/web/lists" --method post --body @list.json --content-type "application/json;odata=verbose"
```

URL tokens:
- `@graph` → `https://graph.microsoft.com/v1.0`
- `@graphbeta` → `https://graph.microsoft.com/beta`
- `@spo` → Current SharePoint URL (set via `m365 spo set`)

## Important Syntax Rules

### Values with spaces → wrap in quotes

```sh
m365 spo site add --alias mycoolsite --title "My Cool Site"
```

### Values starting with a dash → use `=`

```sh
m365 planner task get --id=-9rMKQooUjZdxgv1qQVZYABEuw
```

### Empty values → use `=`

```sh
m365 spo contenttype set --description=""
```

### Complex JSON content → use `@` file reference

```sh
m365 spo sitescript add --title "Contoso" --content @script.json
```

The `@` prefix works with any option — CLI loads the file contents automatically.

### Boolean values

Accepted true values: `1`, `yes`, `true`, `on`
Accepted false values: `0`, `no`, `false`, `off`
In PowerShell you can also use `$true` / `$false`.

### Server-relative SharePoint URLs

After running any `spo` command or `m365 spo set --url https://contoso.sharepoint.com`, you can use server-relative URLs:

```sh
m365 spo site get --url /sites/contoso
```

## Context Feature

Save frequently used option values so you don't have to type them every time:

```sh
# Initialize context in current directory
m365 context init

# Set reusable option values
m365 context option set --name "webUrl" --value "https://contoso.sharepoint.com/sites/project"
m365 context option set --name "listTitle" --value "Tasks"

# Now commands pick up context values automatically
m365 spo listitem list
# Equivalent to: m365 spo listitem list --webUrl "..." --listTitle "Tasks"
```

Context is stored in `.m365rc.json` in the working directory. Options explicit in the command override context values.

## CLI Configuration

Configure with `m365 cli config set --key <key> --value <value>`:

| Key | Description | Default |
|-----|-------------|---------|
| `output` | Default output format | `json` |
| `showHelpOnFailure` | Show help on command failure | `false` |
| `prompt` | Enable interactive prompts | `false` |
| `autoOpenLinksInBrowser` | Auto-open browser links | `false` |
| `copyDeviceCodeToClipboard` | Copy device code to clipboard | `false` |
| `printErrorsAsPlainText` | Errors as plain text vs JSON | `false` |
| `errorOutput` | Where to send errors: `stderr` or `stdout` | `stderr` |
| `helpMode` | Help detail level: `options` or `full` | `options` |

Quick setup for interactive use:

```sh
m365 setup --interactive
```

Quick setup for scripting:

```sh
m365 setup --scripting
```

## Getting Help

```sh
# List all commands in a workload
m365 help spo

# Get options for a command
m365 spo site list --help

# Get full help with examples
m365 spo site list --help full

# Get only examples
m365 spo site list --help examples

# Check required permissions
m365 spo site list --help permissions
```

## Shell-Specific Notes

### PowerShell

- Escape `$` in URLs and JSON: use backtick `` ` `` before `$`
- Consider setting `errorOutput` to `stdout` for easier error handling:

  ```powershell
    m365 cli config set --key errorOutput --value stdout
  ```
- Use `ConvertFrom-Json` to parse JSON output:
  
  ```powershell
    $sites = m365 spo site list | ConvertFrom-Json
  ```

### Bash/Zsh

- Use `jq` for JSON processing:
  
  ```bash
    m365 spo site list | jq '.[].Title'
  ```

## Best Practices When Running Commands

1. **Always check login status first** with `m365 status` before running commands
2. **Use `--output json`** when you need to process results programmatically
3. **Use `--output text`** when displaying results to the user for readability
4. **Use `--query`** to filter large result sets server-side instead of post-processing
5. **Use `--output none`** for commands where you don't need to see output (e.g., delete operations)
6. **Use `@` file references** for complex JSON payloads instead of inline escaping
7. **Prefer named identifiers** (e.g., `--userName`, `--title`) over GUIDs when both are accepted
8. **Check `--help permissions`** if a command fails with 403 — it shows the required API permissions
9. **Use `--debug`** to troubleshoot failing commands — it shows full HTTP requests/responses
10. **Never hardcode secrets** in commands shown to users — use environment variables or prompt

## Error Handling

- If a command fails with permission errors, check `m365 <command> --help permissions` for required scopes
- If authentication expires, run `m365 login --ensure` to re-authenticate only if needed
- Use `m365 cli doctor` to diagnose environment issues
- Docs are available at https://pnp.github.io/cli-microsoft365/
