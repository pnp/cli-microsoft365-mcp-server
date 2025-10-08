---
name: cli-microsoft365-script
description: "Write PowerShell scripts using CLI for Microsoft 365 commands to automate Microsoft 365 management tasks. Use when: writing PowerShell scripts that use m365 commands, automating SharePoint Online provisioning, automating Entra ID user/group management, automating Teams setup, batch operations on Microsoft 365 resources, CI/CD scripts for Microsoft 365, error handling for m365 commands in PowerShell."
---

# CLI for Microsoft 365 — PowerShell Scripting

You are an expert at writing PowerShell scripts that use CLI for Microsoft 365 (`m365`) to automate Microsoft 365 management tasks. Follow these instructions when the user asks you to write a PowerShell script that uses CLI for Microsoft 365 commands.

## Script Setup

Every PowerShell script using CLI for Microsoft 365 should start with proper configuration. Use this template as a starting point:

```powershell
#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

# Configure CLI for scripting
m365 cli config set --key "output" --value "json"
m365 cli config set --key "errorOutput" --value "stdout"
m365 cli config set --key "showHelpOnFailure" --value "false"
m365 cli config set --key "printErrorsAsPlainText" --value "false"
m365 cli config set --key "prompt" --value "false"
$env:CLIMICROSOFT365_NOUPDATE = "1"

# Ensure authentication
m365 login --ensure
```

### Why these settings matter

| Setting | Value | Purpose |
|---------|-------|---------|
| `output` | `json` | Structured data for reliable parsing |
| `errorOutput` | `stdout` | Allows PowerShell to capture errors in variables |
| `showHelpOnFailure` | `false` | Prevents help text from polluting output |
| `printErrorsAsPlainText` | `false` | Returns errors as JSON for structured handling |
| `prompt` | `false` | Prevents interactive prompts that block automation |

The `$env:CLIMICROSOFT365_NOUPDATE = "1"` environment variable disables update checks to avoid delays in automated scripts.

## Authentication

### Check and establish authentication

Always use `m365 login --ensure` at the start of every script. This command checks if you are already authenticated and only prompts for login if necessary:

```powershell
    m365 login --ensure
```

### Authentication for automation and CI/CD

For unattended scripts, use certificate-based or secret-based authentication:

```powershell
    # Certificate-based (recommended for CI/CD)
    m365 login --authType certificate --certificateFile "C:\certs\app.pfx" --password $env:CERT_PASSWORD

    # Client secret
    m365 login --authType secret --secret $env:CLIENT_SECRET

    # Managed identity (Azure-hosted only)
    m365 login --authType identity
```

**Never hardcode credentials or secrets in scripts.** Use environment variables or secure stores instead.

### Environment variables for app identity

Set these environment variables to avoid passing `--appId` and `--tenant` on every login:

```powershell
$env:CLIMICROSOFT365_ENTRAAPPID = "<app-id>"
$env:CLIMICROSOFT365_TENANT = "<tenant-id>"
```

## Error Handling

### Approach 1: Check exit code (simple)

The simplest approach — run the command and check `$LASTEXITCODE`:

```powershell
    $siteData = m365 spo site get --url "https://contoso.sharepoint.com/sites/project"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to retrieve site"
        exit 1
    }
    $site = $siteData | ConvertFrom-Json
    Write-Host "Site: $($site.Title)"
```

### Approach 2: Helper function with try/catch (recommended)

For detailed error handling, use the `Invoke-CLICommand` helper function. This requires the CLI configuration from the Script Setup section above (especially `errorOutput` set to `stdout` and `printErrorsAsPlainText` set to `false`):

```powershell
function Invoke-CLICommand {
    [CmdletBinding()]
    param(
        [parameter(Mandatory = $true, ValueFromPipeline = $true)] $input
    )

    $output = $input

    if ($null -eq $output) {
        return $null
    }

    $parsedOutput = $output | ConvertFrom-Json

    if ($parsedOutput -isnot [Array] -and $null -ne $parsedOutput.error) {
        throw $parsedOutput.error
    }

    return $parsedOutput
}
```

Usage with try/catch:

```powershell
try {
    $site = m365 spo site get --url "https://contoso.sharepoint.com/sites/project" | Invoke-CLICommand
    Write-Host "Site: $($site.Title)"
}
catch {
    Write-Error "Failed: $($_.Exception.Message)"
    exit 1
}
```

### When to use which approach

- **Exit code checking**: Simple scripts, one-off commands, scripts where you just need pass/fail
- **Invoke-CLICommand helper**: Scripts with many commands, when you need the parsed error message, when using try/catch for control flow

## Output Handling

### Always use JSON for scripting

Set `--output json` (or configure it globally) and parse with `ConvertFrom-Json`:

```powershell
$sites = m365 spo site list --output json | ConvertFrom-Json

foreach ($site in $sites) {
    Write-Host "Site: $($site.Url) - $($site.Title)"
}
```

When using the `Invoke-CLICommand` helper, output is already parsed:

```powershell
$sites = m365 spo site list | Invoke-CLICommand

foreach ($site in $sites) {
    Write-Host "Site: $($site.Url) - $($site.Title)"
}
```

### Export to CSV

```powershell
m365 spo site list --output csv > sites.csv
```

### Suppress output for write operations

Use `--output none` when you do not need the response:

```powershell
    m365 spo site remove --url "https://contoso.sharepoint.com/sites/old" --force --output none
```

## Filtering Data with JMESPath

Use the `--query` option for server-side filtering instead of piping to `Where-Object`:

```powershell
    # Good — filter with JMESPath
    $projectSites = m365 spo site list --query "[?contains(Title, 'Project')]" | Invoke-CLICommand

    # Less efficient — filter in PowerShell after fetching everything
    $allSites = m365 spo site list | Invoke-CLICommand
    $projectSites = $allSites | Where-Object { $_.Title -like "*Project*" }
```

### Common JMESPath patterns

```powershell
    # Select specific fields
    m365 spo site list --query "[*].{Title: Title, Url: Url}"

    # Filter and project
    m365 spo site list --query "[?contains(Title, 'Project')].{Title: Title, Url: Url}"

    # Get a single value
    m365 entra user get --id "user@contoso.com" --query "id" --output text
```

JMESPath queries are **case-sensitive**.

## PowerShell-Specific Syntax

### Escaping the `@` character

In PowerShell, `@` is a special character. When using the CLI file reference syntax or tokens like `@meId`, escape with a backtick:

```powershell
    # File reference
    m365 spo sitescript add --title "Script" --content `@script.json

    # User tokens
    m365 entra user get --id "`@meId"
```

### Values starting with a dash

Use `=` to pass values that start with a dash:

```powershell
    m365 planner task get --id=-9rMKQooUjZdxgv1qQVZYABEuw
```

### Complex JSON payloads

Store complex JSON in files rather than inline strings:

```powershell
    $payload = @{
        displayName = "Project Team"
        description = "Team for the project"
    } | ConvertTo-Json -Depth 10

    $payload | Out-File -FilePath "payload.json" -Encoding utf8

    m365 request --url "`@graph/teams" --method post --body `@payload.json
```

### Boolean values

In PowerShell, you can use `$true` / `$false`, or the CLI accepted values: `1`, `yes`, `true`, `on` / `0`, `no`, `false`, `off`.

## Common Script Patterns

### Check if a resource exists before creating

```powershell
try {
    $list = m365 spo list get --webUrl $webUrl --title $listTitle | Invoke-CLICommand
    Write-Host "List '$($list.Title)' already exists"
}
catch {
    Write-Host "List not found, creating..."
    m365 spo list add --webUrl $webUrl --title $listTitle --baseTemplate GenericList | Invoke-CLICommand
    Write-Host "List '$listTitle' created"
}
```

### Batch operations with error handling

```powershell
$users = @("user1@contoso.com", "user2@contoso.com", "user3@contoso.com")
$webUrl = "https://contoso.sharepoint.com/sites/project"

$succeeded = 0
$failed = 0

foreach ($user in $users) {
    try {
        m365 spo user add --webUrl $webUrl --loginName $user | Invoke-CLICommand
        Write-Host "Added: $user" -ForegroundColor Green
        $succeeded++
    }
    catch {
        Write-Host "Failed: $user — $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`nCompleted. Succeeded: $succeeded, Failed: $failed"
```

### Pipe output between commands

```powershell
# Get all team IDs and archive each team
$teams = m365 teams team list --query "[?contains(displayName, 'Old')]" | Invoke-CLICommand

foreach ($team in $teams) {
    m365 teams team archive --id $team.id
    Write-Host "Archived: $($team.displayName)"
}
```

### Read data from CSV and process

```powershell
$usersToCreate = Import-Csv -Path "users.csv"

foreach ($user in $usersToCreate) {
    try {
        m365 entra user add `
            --displayName $user.DisplayName `
            --userName $user.UserPrincipalName `
            --password $user.Password `
            --accountEnabled $true | Invoke-CLICommand
        Write-Host "Created user: $($user.DisplayName)" -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to create $($user.DisplayName): $($_.Exception.Message)" -ForegroundColor Red
    }
}
```

### Use the context feature to avoid repeating options

```powershell
    # Set up context for repeated operations on the same site
    m365 context init
    m365 context option set --name "webUrl" --value "https://contoso.sharepoint.com/sites/project"

    # Commands now pick up --webUrl automatically
    $lists = m365 spo list list | Invoke-CLICommand
    $items = m365 spo listitem list --listTitle "Tasks" | Invoke-CLICommand
```

### Server-relative URLs for SharePoint

After running any `spo` command or setting the SPO URL explicitly, you can use server-relative URLs:

```powershell
    m365 spo set --url "https://contoso.sharepoint.com"

    # Now use server-relative URLs
    $site = m365 spo site get --url "/sites/project" | Invoke-CLICommand
```

### Using @meId and @meUserName tokens

These built-in tokens resolve to the currently authenticated user:

```powershell
    $me = m365 entra user get --id "`@meId" | Invoke-CLICommand
    Write-Host "Logged in as: $($me.displayName)"
```

## Raw API Requests

Use `m365 request` to call any Microsoft API not covered by specific commands:

```powershell
    # GET request with URL tokens
    $profile = m365 request --url "`@graph/me" | Invoke-CLICommand

    # POST with inline body
    m365 request --url "`@graph/me/messages" --method post --body '{"subject":"Test","body":{"content":"Hello"}}'

    # POST with body from file
    m365 request --url "`@graph/teams" --method post --body `@team-payload.json
```

URL tokens:
- `@graph` → `https://graph.microsoft.com/v1.0`
- `@graphbeta` → `https://graph.microsoft.com/beta`
- `@spo` → Current SharePoint URL (set via `m365 spo set`)

## Debugging Scripts

### Verbose mode

For development and troubleshooting:

```powershell
    m365 spo site get --url "https://contoso.sharepoint.com/sites/project" --verbose
```

Or set via environment variable for all commands:

```powershell
    $env:CLIMICROSOFT365_VERBOSE = "1"
```

### Debug mode

Shows full HTTP request and response details:

```powershell
    $env:CLIMICROSOFT365_DEBUG = "1"
```

## Security Best Practices

1. **Never hardcode credentials** — use environment variables, Azure Key Vault, or secure parameter stores
2. **Use certificate or managed identity authentication** for automation
3. **Grant minimum required permissions** to the app registration
4. **Rotate secrets and certificates** regularly
5. **Do not log sensitive output** — use `--output none` when possible for write operations

## Complete Script Template

```powershell
#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Description of what this script does.
.DESCRIPTION
    Detailed description.
.EXAMPLE
    .\Script.ps1 -SiteUrl "https://contoso.sharepoint.com/sites/project"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl
)

$ErrorActionPreference = "Stop"

# --- CLI Configuration ---
m365 cli config set --key "output" --value "json"
m365 cli config set --key "errorOutput" --value "stdout"
m365 cli config set --key "showHelpOnFailure" --value "false"
m365 cli config set --key "printErrorsAsPlainText" --value "false"
m365 cli config set --key "prompt" --value "false"
$env:CLIMICROSOFT365_NOUPDATE = "1"

# --- Helper Function ---
function Invoke-CLICommand {
    [CmdletBinding()]
    param(
        [parameter(Mandatory = $true, ValueFromPipeline = $true)] $input
    )

    $output = $input
    if ($null -eq $output) { return $null }

    $parsedOutput = $output | ConvertFrom-Json
    if ($parsedOutput -isnot [Array] -and $null -ne $parsedOutput.error) {
        throw $parsedOutput.error
    }

    return $parsedOutput
}

# --- Authentication ---
m365 login --ensure

# --- Script Logic ---
try {
    $site = m365 spo site get --url $SiteUrl | Invoke-CLICommand
    Write-Host "Site: $($site.Title)" -ForegroundColor Green
}
catch {
    Write-Error "Script failed: $($_.Exception.Message)"
    exit 1
}

Write-Host "Script completed successfully" -ForegroundColor Green
```