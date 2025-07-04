import { exec, spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';


export async function runCliCommand(command: string): Promise<string> {
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
                resolve(output.trim());
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
        const filePath = await checkGlobalPackage('@pnp/cli-microsoft365', `docs\\docs\\cmd\\${docs}`);
        if (!filePath)
            throw new Error('@pnp/cli-microsoft365 npm package not found or command documentation file not found');

        const fileContent = await fs.readFile(filePath, 'utf-8');
        return fileContent;
    } catch (error) {
        console.error('An error occurred:', error);
        return {
            error: `Failed to retrieve documentation for command ${commandName}: ${error}`
        };
    }
}

export async function getAllCommands(): Promise<any[]> {
    let commands: any[] = [];
    try {
        const filePath = await checkGlobalPackage('@pnp/cli-microsoft365', 'allCommandsFull.json');
        if (!filePath) 
            throw new Error('@pnp/cli-microsoft365 npm package not found or allCommandsFull.json file not found');

        const fileContent = await fs.readFile(filePath, 'utf-8');
        const cliCommands = JSON.parse(fileContent);
        commands = cliCommands
            .map((command: any) => ({
                name: command.name.replace(/\s+/g, '-'),
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

async function checkGlobalPackage(packageName: string, filePath: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
        exec('npm list -g --depth=0', (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }

            if (stdout.includes(packageName)) {
                exec('npm root -g', (err, npmRoot) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const fileFullPath = path.join(npmRoot.trim(), packageName, filePath);
                    resolve(fileFullPath);
                });
            } else {
                resolve(null);
            }
        });
    });
}