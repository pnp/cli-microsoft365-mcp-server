# Best Practices for Using CLI for Microsoft 365 in Scripts

This guide provides best practices for using CLI for Microsoft 365 commands in PowerShell scripts, including how to check authentication, handle errors, and manage output.

## Authentication Best Practices

### Check Authentication Status

Before running any CLI for Microsoft 365 commands in your script, use the `m365 login --ensure` command to verify and establish authentication if needed:

```powershell
m365 login --ensure
```

This command will check if you are already authenticated and only prompt for login if necessary.

### Authentication Methods

- **Interactive scenarios**: Use device code flow (`m365 login`) or browser authentication (`m365 login --authType browser`)
- **Automation/CI-CD**: Use certificate-based authentication (`--authType certificate`) or secret-based authentication (`--authType secret`)
- **Avoid** using username/password authentication when possible, as it doesn't support MFA and other advanced security features

## Configuration Best Practices

### Recommended Configuration for Scripts

Set these configuration options before running your script to ensure consistent behavior:

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

## Error Handling Best Practices

### Approach 1: Check Exit Code

The simplest approach is to run the CLI command and check the exit code:

```powershell
m365 spo site get --url "https://contoso.sharepoint.com/sites/Marketing"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to retrieve site." -ForegroundColor Red
    exit 1
}
Write-Host "Site retrieved successfully"
```

### Approach 2: PowerShell Error Handling with Helper Function

PowerShell has unique error handling requirements. Use these settings and helper function for more detailed error handling:

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

## Output Handling Best Practices

### JSON Output

Always use JSON output for scripts as it's easier to parse:

```powershell
# Retrieve and parse JSON output
$sites = m365 spo site list --output json | ConvertFrom-Json

foreach ($site in $sites) {
    Write-Host "Site: $($site.Url) - $($site.Title)"
}
```

### Text Output

For simple operations or when you just need to display results, text output can be useful:

```powershell
# Simple text output
m365 spo site list --output text
```

### CSV Output

For data that will be processed in Excel or other tools:

```powershell
# Export to CSV
m365 spo site list --output csv > sites.csv
```

## Common Patterns

### Checking if a Resource Exists

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

### Batch Operations

When performing multiple operations, use loops:

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

## Working with Complex Data

### Passing JSON Data

When you need to pass complex JSON data, use files instead of inline strings:

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

# Use file with @ prefix (note: in PowerShell, escape @ with backtick: `@)
m365 spo sitescript add --title "Contoso Theme" --description "Applies Contoso theme" --content `@theme-script.json
```

## Special Tokens and Features

### Using @meId and @meUserName Tokens

CLI for Microsoft 365 provides built-in tokens for the current user:

```powershell
# Get current user's profile
m365 entra user get --id "@meId"

# Get current user by username
m365 entra user get --userName "@meUserName"
```

### Server-Relative URLs for SharePoint

After running any SharePoint command, you can use server-relative URLs:

```powershell
# First command establishes the SPO URL
m365 spo site list

# Now you can use server-relative URLs
m365 spo site get --url /sites/project
```

Or set it explicitly:

```powershell
m365 spo set --url https://contoso.sharepoint.com
```

## Debugging and Verbose Output

### Verbose Mode

Use verbose mode during development to see detailed operation information:

```powershell
m365 spo site get --url "https://contoso.sharepoint.com/sites/project" --verbose
```

Or set it via environment variable:

```powershell
$env:CLIMICROSOFT365_VERBOSE = "1"
m365 spo site get --url "https://contoso.sharepoint.com/sites/project"
```

### Debug Mode

For troubleshooting, enable debug mode to see all API requests and responses:

```powershell
m365 spo site get --url "https://contoso.sharepoint.com/sites/project" --debug
```

Or set it via environment variable:

```powershell
$env:CLIMICROSOFT365_DEBUG = "1"
m365 spo site get --url "https://contoso.sharepoint.com/sites/project"
```

## Performance Optimization

### Disable Update Checks in Scripts

Disable automatic update checks for faster script execution:

```powershell
$env:CLIMICROSOFT365_NOUPDATE = "1"
```

### Use Specific Commands

Instead of querying all resources and filtering, use specific commands with filters when available:

```powershell
# Good - Direct query
m365 spo site get --url "https://contoso.sharepoint.com/sites/project"

# Less efficient - Getting all and filtering
# Avoid when possible
m365 spo site list | Where-Object { $_.Url -like "*project*" }
```

## Security Best Practices

1. **Never hardcode credentials** in scripts. Use environment variables or secure credential stores.

2. **Use certificate or secret authentication** for unattended scripts instead of username/password.

3. **Limit permissions** - Grant only the minimum required permissions to the app registration used for authentication.

4. **Rotate secrets and certificates** regularly.

5. **Store tokens securely** - Be aware that CLI for Microsoft 365 stores tokens and credentials in the user's profile directory.

6. **Use app-only access** for automation scenarios:
   ```powershell
   m365 login --authType certificate --certificateFile C:\path\to\cert.pfx --password certpass
   ```

## Script Template Example

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

# Helper function for error handling (optional - can use exit code checking instead)
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

# Ensure authentication
m365 login --ensure

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

### Alternative Template with Exit Code Checking

```powershell
#!/usr/bin/env pwsh

# Configure CLI for Microsoft 365
m365 cli config set --key output --value json
m365 cli config set --key prompt --value false
$env:CLIMICROSOFT365_NOUPDATE = "1"

# Ensure authentication
m365 login --ensure
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to authenticate"
    exit 1
}

# Your script logic here
$siteUrl = "https://contoso.sharepoint.com/sites/project"
$siteData = m365 spo site get --url $siteUrl --output json

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to get site"
    exit 1
}

$site = $siteData | ConvertFrom-Json
Write-Host "Site Title: $($site.Title)"
Write-Host "Script completed successfully" -ForegroundColor Green
```

## Summary

Following these best practices will help you create robust, maintainable PowerShell scripts using CLI for Microsoft 365:

1. **Use `m365 login --ensure`** to check and establish authentication
2. **Configure proper error handling** - either check exit codes or use the helper function approach
3. **Use JSON output** for parsing in scripts
4. **Disable prompts and update checks** for non-interactive execution
5. **Use try/catch or check $LASTEXITCODE** for proper error handling
6. **Store complex data in files** rather than inline strings
7. **Use appropriate authentication methods** for your scenario (interactive vs. automated)
8. **Enable verbose/debug mode** when troubleshooting
9. **Follow security best practices** for credential management
10. **Test scripts thoroughly** before using in production

For more information, refer to the [CLI for Microsoft 365 documentation](https://pnp.github.io/cli-microsoft365/).
