# Best Practices for Using CLI for Microsoft 365 in Scripts

This guide provides best practices for using CLI for Microsoft 365 commands in scripts, including how to check authentication, handle errors, and manage output.

## Authentication Best Practices

### Check Authentication Status

Before running any CLI for Microsoft 365 commands in your script, always verify that you are authenticated:

**PowerShell:**
```powershell
$status = m365 status --output json | ConvertFrom-Json
if ($status.connectedAs -eq $null) {
    Write-Error "Not logged in to Microsoft 365. Please run 'm365 login' first."
    exit 1
}
```

**Bash/Zsh:**
```bash
if ! m365 status > /dev/null 2>&1; then
    echo "Not logged in to Microsoft 365. Please run 'm365 login' first." >&2
    exit 1
fi
```

### Authentication Methods

- **Interactive scenarios**: Use device code flow (`m365 login`) or browser authentication
- **Automation/CI-CD**: Use certificate-based authentication (`--authType certificate`) or secret-based authentication (`--authType secret`)
- **Avoid** using username/password authentication when possible, as it doesn't support MFA and other advanced security features

## Configuration Best Practices

### Recommended Configuration for Scripts

Set these configuration options before running your script to ensure consistent behavior:

**PowerShell:**
```powershell
# Set output to JSON for easier parsing
m365 cli config set --key output --value json

# Disable prompts for non-interactive execution
m365 cli config set --key prompt --value false

# Get detailed error information
m365 cli config set --key helpMode --value full

# For scripts, disable update checks to avoid delays
$env:CLIMICROSOFT365_NOUPDATE = "1"
```

**Bash/Zsh:**
```bash
# Set output to JSON for easier parsing
m365 cli config set --key output --value json

# Disable prompts for non-interactive execution
m365 cli config set --key prompt --value false

# Get detailed error information
m365 cli config set --key helpMode --value full

# For scripts, disable update checks to avoid delays
export CLIMICROSOFT365_NOUPDATE=1
```

## Error Handling Best Practices

### PowerShell Error Handling

PowerShell has unique error handling requirements. Use these settings and helper function:

```powershell
# Configure CLI for better PowerShell error handling
m365 cli config set --key output --value json
m365 cli config set --key errorOutput --value stdout 
m365 cli config set --key showHelpOnFailure --value false 
m365 cli config set --key printErrorsAsPlainText --value false 

# Helper function to handle CLI command errors properly
function Invoke-CLICommand {
  [cmdletbinding()]
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

# Use try/catch with the helper function
try {
  $site = m365 spo site get --url "https://contoso.sharepoint.com/sites/Marketing" | Invoke-CLICommand
  Write-Host "Site retrieved: $($site.Title)"
}
catch {
  Write-Host "Failed to retrieve site." -ForegroundColor Red
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
```

### Bash/Zsh Error Handling

For Bash/Zsh scripts, use standard error handling:

```bash
#!/bin/bash
set -e  # Exit on error
set -o pipefail  # Catch errors in pipes

# Function to handle CLI errors
run_m365_command() {
    local output
    local exit_code
    
    output=$(m365 "$@" 2>&1)
    exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        echo "Error executing: m365 $*" >&2
        echo "$output" >&2
        return $exit_code
    fi
    
    echo "$output"
    return 0
}

# Usage example
if ! site_data=$(run_m365_command spo site get --url "https://contoso.sharepoint.com/sites/Marketing" --output json); then
    echo "Failed to retrieve site" >&2
    exit 1
fi

echo "Site retrieved successfully"
```

## Output Handling Best Practices

### JSON Output

Always use JSON output for scripts as it's easier to parse:

**PowerShell:**
```powershell
# Retrieve and parse JSON output
$sites = m365 spo site list --output json | ConvertFrom-Json

foreach ($site in $sites) {
    Write-Host "Site: $($site.Url) - $($site.Title)"
}
```

**Bash/Zsh:**
```bash
# Using jq to parse JSON output
sites=$(m365 spo site list --output json)
echo "$sites" | jq -r '.[] | "\(.Url) - \(.Title)"'
```

### Text Output

For simple operations or when you just need to display results, text output can be useful:

```bash
# Simple text output
m365 spo site list --output text
```

### CSV Output

For data that will be processed in Excel or other tools:

```bash
# Export to CSV
m365 spo site list --output csv > sites.csv
```

## Common Patterns

### Checking if a Resource Exists

**PowerShell:**
```powershell
try {
    $list = m365 spo list get --webUrl "https://contoso.sharepoint.com/sites/project" --title "Documents" --output json | ConvertFrom-Json | Invoke-CLICommand
    Write-Host "List exists: $($list.Title)"
}
catch {
    if ($_.Exception.Message -like "*does not exist*") {
        Write-Host "List does not exist, creating..."
        # Create list
    }
    else {
        throw
    }
}
```

**Bash/Zsh:**
```bash
if m365 spo list get --webUrl "https://contoso.sharepoint.com/sites/project" --title "Documents" > /dev/null 2>&1; then
    echo "List exists"
else
    echo "List does not exist, creating..."
    # Create list
fi
```

### Batch Operations

When performing multiple operations, use loops:

**PowerShell:**
```powershell
$users = @("user1@contoso.com", "user2@contoso.com", "user3@contoso.com")

foreach ($user in $users) {
    try {
        m365 spo user add --webUrl "https://contoso.sharepoint.com/sites/project" --loginName $user | Invoke-CLICommand
        Write-Host "Added user: $user" -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to add user: $user" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
```

**Bash/Zsh:**
```bash
users=("user1@contoso.com" "user2@contoso.com" "user3@contoso.com")

for user in "${users[@]}"; do
    if m365 spo user add --webUrl "https://contoso.sharepoint.com/sites/project" --loginName "$user" > /dev/null 2>&1; then
        echo "Added user: $user"
    else
        echo "Failed to add user: $user" >&2
    fi
done
```

## Working with Complex Data

### Passing JSON Data

When you need to pass complex JSON data, use files instead of inline strings:

**PowerShell:**
```powershell
# Store JSON in a file
$jsonData = @{
    "$schema" = "https://developer.microsoft.com/json-schemas/sp/site-design-script-actions.schema.json"
    "actions" = @(
        @{
            "verb" = "applyTheme"
            "themeName" = "Contoso Theme"
        }
    )
} | ConvertTo-Json -Depth 10

$jsonData | Out-File -FilePath "theme-script.json" -Encoding utf8

# Use file with @ prefix
m365 spo sitescript add --title "Contoso Theme" --description "Applies Contoso theme" --content "@theme-script.json"
```

**Bash/Zsh:**
```bash
# Create JSON file
cat > theme-script.json << 'EOF'
{
  "$schema": "https://developer.microsoft.com/json-schemas/sp/site-design-script-actions.schema.json",
  "actions": [
    {
      "verb": "applyTheme",
      "themeName": "Contoso Theme"
    }
  ]
}
EOF

# Use file with @ prefix (escape @ in PowerShell with backtick: `@)
m365 spo sitescript add --title "Contoso Theme" --description "Applies Contoso theme" --content @theme-script.json
```

## Special Tokens and Features

### Using @meId and @meUserName Tokens

CLI for Microsoft 365 provides built-in tokens for the current user:

```bash
# Get current user's profile
m365 entra user get --id "@meId"

# Get current user by username
m365 entra user get --userName "@meUserName"
```

### Server-Relative URLs for SharePoint

After running any SharePoint command, you can use server-relative URLs:

```bash
# First command establishes the SPO URL
m365 spo site list

# Now you can use server-relative URLs
m365 spo site get --url /sites/project
```

Or set it explicitly:
```bash
m365 spo set --url https://contoso.sharepoint.com
```

## Debugging and Verbose Output

### Verbose Mode

Use verbose mode during development to see detailed operation information:

```bash
m365 spo site get --url "https://contoso.sharepoint.com/sites/project" --verbose
```

Or set it via environment variable:
```bash
export CLIMICROSOFT365_VERBOSE=1
m365 spo site get --url "https://contoso.sharepoint.com/sites/project"
```

### Debug Mode

For troubleshooting, enable debug mode to see all API requests and responses:

```bash
m365 spo site get --url "https://contoso.sharepoint.com/sites/project" --debug
```

Or set it via environment variable:
```bash
export CLIMICROSOFT365_DEBUG=1
m365 spo site get --url "https://contoso.sharepoint.com/sites/project"
```

## Performance Optimization

### Disable Update Checks in Scripts

Disable automatic update checks for faster script execution:

**PowerShell:**
```powershell
$env:CLIMICROSOFT365_NOUPDATE = "1"
```

**Bash/Zsh:**
```bash
export CLIMICROSOFT365_NOUPDATE=1
```

### Use Specific Commands

Instead of querying all resources and filtering, use specific commands with filters when available:

```bash
# Good - Direct query
m365 spo site get --url "https://contoso.sharepoint.com/sites/project"

# Less efficient - Getting all and filtering
# Avoid when possible
m365 spo site list | grep "project"
```

## Security Best Practices

1. **Never hardcode credentials** in scripts. Use environment variables or secure credential stores.

2. **Use certificate or secret authentication** for unattended scripts instead of username/password.

3. **Limit permissions** - Grant only the minimum required permissions to the app registration used for authentication.

4. **Rotate secrets and certificates** regularly.

5. **Store tokens securely** - Be aware that CLI for Microsoft 365 stores tokens and credentials in the user's profile directory.

6. **Use app-only access** for automation scenarios:
   ```bash
   m365 login --authType certificate --certificateFile /path/to/cert.pfx --password certpass
   ```

## Script Template Examples

### PowerShell Script Template

```powershell
#!/usr/bin/env pwsh

# Configure error handling
$ErrorActionPreference = "Stop"

# Configure CLI for Microsoft 365
m365 cli config set --key output --value json
m365 cli config set --key errorOutput --value stdout 
m365 cli config set --key showHelpOnFailure --value false 
m365 cli config set --key printErrorsAsPlainText --value false 
m365 cli config set --key prompt --value false
$env:CLIMICROSOFT365_NOUPDATE = "1"

# Helper function for error handling
function Invoke-CLICommand {
  [cmdletbinding()]
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

# Check authentication
try {
  $status = m365 status --output json | ConvertFrom-Json
  if ($status.connectedAs -eq $null) {
    Write-Error "Not logged in. Please run 'm365 login' first."
    exit 1
  }
  Write-Host "Authenticated as: $($status.connectedAs)"
}
catch {
  Write-Error "Failed to check authentication status: $($_.Exception.Message)"
  exit 1
}

# Your script logic here
try {
  # Example: Get site information
  $site = m365 spo site get --url "https://contoso.sharepoint.com/sites/project" | Invoke-CLICommand
  Write-Host "Site Title: $($site.Title)"
}
catch {
  Write-Error "Script failed: $($_.Exception.Message)"
  exit 1
}

Write-Host "Script completed successfully" -ForegroundColor Green
```

### Bash/Zsh Script Template

```bash
#!/bin/bash

# Exit on error and undefined variables
set -euo pipefail

# Configure CLI for Microsoft 365
m365 cli config set --key output --value json
m365 cli config set --key prompt --value false
m365 cli config set --key helpMode --value full
export CLIMICROSOFT365_NOUPDATE=1

# Error handling function
handle_error() {
    echo "Error: $1" >&2
    exit 1
}

# Check authentication
if ! m365 status > /dev/null 2>&1; then
    handle_error "Not logged in. Please run 'm365 login' first."
fi

echo "Authenticated successfully"

# Your script logic here
site_data=$(m365 spo site get --url "https://contoso.sharepoint.com/sites/project" --output json) || handle_error "Failed to get site"

# Parse JSON using jq
site_title=$(echo "$site_data" | jq -r '.Title')
echo "Site Title: $site_title"

echo "Script completed successfully"
```

## Summary

Following these best practices will help you create robust, maintainable scripts using CLI for Microsoft 365:

1. **Always check authentication** before running commands
2. **Configure proper error handling** for your shell (PowerShell has special requirements)
3. **Use JSON output** for parsing in scripts
4. **Disable prompts and update checks** for non-interactive execution
5. **Use try/catch or set -e** for proper error handling
6. **Store complex data in files** rather than inline strings
7. **Use appropriate authentication methods** for your scenario (interactive vs. automated)
8. **Enable verbose/debug mode** when troubleshooting
9. **Follow security best practices** for credential management
10. **Test scripts thoroughly** before using in production

For more information, refer to the [CLI for Microsoft 365 documentation](https://pnp.github.io/cli-microsoft365/).
