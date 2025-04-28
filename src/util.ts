import { spawn, exec } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';

export async function runCliCommand(toolName: string, input: any): Promise<string> {
    return new Promise((resolve, reject) => {
        const command = `m365 ${toolName.replace(/-/g, ' ')}`;
        const args = input ? Object.entries(input).filter(([key, value]) => value !== null).map(([key, value]) => `--${key} \"${value}\"`).join(' ') : '';
        const commandToRun = `${command} ${args} --output "json"`;
        console.error(commandToRun);
        const subprocess = spawn(commandToRun, { shell: true });

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
            reject(err);
        });
    });
}

export async function getAllCommands(): Promise<any[]> {
    let commands: any[] = [];
    try {
        const filePath = await checkGlobalPackage('@pnp/cli-microsoft365', 'allCommandsFull.json');
        console.error(`File path: ${filePath}`);
        if (filePath) {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const cliCommands = JSON.parse(fileContent);
            commands = cliCommands
                .filter((command: any) => command.name.startsWith('spo'))
                .map((command: any) => ({
                    name: command.name.replace(/\s+/g, '-'),
                    description: command.description,
                    inputSchema: {
                        type: "object",
                        properties: command.options.reduce((acc: any, option: any) => {
                            if (!['query', 'verbose', 'debug', 'output'].includes(option.name)) {
                                acc[option.name] = { type: "string" };
                            }
                            return acc;
                        }, {}),
                        required: command.options.filter((option: any) => option.required).map((option: any) => option.name),
                    }
                }));
        }
    } catch (error) {
        console.error('An error occurred:', error);
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
