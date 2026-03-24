import { exec, spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import Fuse from 'fuse.js';

interface Command {
    name: string;
    description: string;
    docs: string;
}

interface CommandError {
    error: string;
}


export async function runCliCommand(command: string): Promise<string> {
    let isJsonOutput = false;
    // Check if --output flag is already present (using precise pattern to avoid matching --output-file etc.)
    if (!/--output(?:\s|=|$)/.test(command)) {
        const commandPart = command.split('--')[0].trim();
        if (commandPart.endsWith(' list')) {
            command += ' --output csv';
        } else {
            command += ' --output json';
            isJsonOutput = true;
        }
    } else if (/--output[=\s]+json\b/.test(command)) {
        isJsonOutput = true;
    }
    
    return new Promise((resolve, reject) => {
        const subprocess = spawn(command, {
            shell: true,
            timeout: 120000,
        });

        let output = '';
        let error = '';

        subprocess.stdout.on('data', (data) => {
            output += data.toString();
        });

        subprocess.stderr.on('data', (data) => {
            error += data.toString();
        });

        subprocess.on('close', (code) => {
            if (code === 0) {
                const trimmedOutput = output.trim();
                // Compact JSON output to reduce token usage
                if (isJsonOutput) {
                    resolve(compactJson(trimmedOutput));
                } else {
                    resolve(trimmedOutput);
                }
            } else {
                reject(new Error(error.trim() || `Command failed with exit code ${code}`));
            }
        });

        subprocess.on('error', (err) => {
            if (err.message.includes('timeout')) {
                reject(new Error('Command timed out'));
            } else {
                reject(err);
            }
        });
    });
}

export async function getCommandDocs(commandName: string, docs: string): Promise<any> {
    try {
        const filePath = await checkGlobalPackage('@pnp/cli-microsoft365', `docs${path.sep}docs${path.sep}cmd${path.sep}${docs}`);
        if (!filePath) {
            throw new Error('@pnp/cli-microsoft365 npm package not found or command documentation file not found');
        }

        const fileExists = await CheckIfFileExists(filePath);
        if (!fileExists) {
            throw new Error(`Documentation file for command ${commandName} not found at ${filePath}`);
        }

        const fileContent = await fs.readFile(filePath, 'utf-8');
        return fileContent;
    } catch (error) {
        console.error('An error occurred:', error);
        return `Failed to retrieve documentation for command ${commandName}: ${error}`;
    }
}

export async function searchCommands(query: string, limit: number = 10): Promise<Command[] | CommandError[]> {
    try {
        const allCommands = await getAllCommands();
        
        // Check if there was an error retrieving commands
        if (allCommands.length > 0 && 'error' in allCommands[0]) {
            return allCommands;
        }

        // Configure Fuse.js for fuzzy search
        const fuse = new Fuse(allCommands as Command[], {
            keys: [
                { name: 'name', weight: 0.7 },
                { name: 'description', weight: 0.3 }
            ],
            threshold: 0.4,
            includeScore: true,
            minMatchCharLength: 2
        });

        // Perform the search
        const results = fuse.search(query);

        // Return top matches, limiting to the specified number
        return results.slice(0, limit).map(result => result.item);
    } catch (error) {
        console.error('An error occurred during command search:', error);
        return [{
            error: `Failed to search commands: ${error}`
        }];
    }
}

export async function getBestPractices(): Promise<string> {
    try {
        // Fetch the best-practices.md file from the GitHub repository
        // Using the main branch as the source of truth
        const url = 'https://raw.githubusercontent.com/pnp/cli-microsoft365-mcp-server/main/best-practices.md';
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch best practices from ${url}: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        return content;
    } catch (error) {
        console.error('An error occurred:', error);
        return `Failed to retrieve best practices from GitHub. Error: ${error}`;
    }
}

async function getAllCommands(): Promise<Command[] | CommandError[]> {
    let commands: Command[] = [];
    try {
        const filePath = await checkGlobalPackage('@pnp/cli-microsoft365', 'allCommandsFull.json');
        if (!filePath)
            throw new Error('@pnp/cli-microsoft365 npm package not found or allCommandsFull.json file not found');

        const fileContent = await fs.readFile(filePath, 'utf-8');
        const cliCommands = JSON.parse(fileContent);
        commands = cliCommands
            .map((command: any) => ({
                name: `m365 ${command.name}`,
                description: command.description,
                docs: command.help
            }));
    } catch (error) {
        console.error('An error occurred:', error);
        return [{
            error: `Failed to retrieve commands: ${error}`
        }];
    }
    return commands;
}

async function CheckIfFileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function checkGlobalPackage(packageName: string, filePath: string): Promise<string | null> {
    return new Promise((resolve) => {
        exec('npm list -g --depth=0', (error, stdout, stderr) => {
            if (error) {
                console.error('Error checking global packages:', error);
                resolve(null);
                return;
            }

            if (stdout.includes(packageName)) {
                exec('npm root -g', (err, npmRoot) => {
                    if (err) {
                        console.error('Error getting npm root:', err);
                        resolve(null);
                        return;
                    }

                    const fileFullPath = path.join(npmRoot.trim(), packageName, filePath);
                    resolve(fileFullPath);
                });
            } else {
                console.log(`Package ${packageName} not found in global packages`);
                resolve(null);
            }
        });
    });
}

function compactJson(output: string): string {
    try {
        // Try to parse and re-stringify the output to compact it
        const parsed = JSON.parse(output);
        return JSON.stringify(parsed);
    } catch {
        // If it's not valid JSON, return as-is
        return output;
    }
}