import { executeCommand } from '@pnp/cli-microsoft365';

// TODO: this should have a unit test
export async function runCliCommand(command: string, input: any): Promise<any> {
    const status = await executeCommand('status', { output: 'text' });
    console.error('m365 status', status.stdout); // TODO: currently mcp inspector will only show log for `error`, think of better logging for debbugging

    if (status.stdout === 'Logged out') {
        console.error('tryinng to login as: ', process.env.AppId);
        await executeCommand('login', // TODO: currently VS Code does not support any auth flow so we are using sign in as app using cert as prototype
            {
                authType: 'certificate',
                certificateBase64Encoded: process.env.CertificateBase64Encoded,
                password: process.env.CertificatePassword,
                appId: process.env.AppId,
                tenant: process.env.TenantId,
                output: 'text'
            }, {
            stdout: message => console.log(message),
            stderr: function (message: any): void {
                throw new Error('Function not implemented.');
            }
        });
    }

    console.error('TenantUrl: ', process.env.TenantUrl);
    await executeCommand('spo set', { url: process.env.TenantUrl });

    console.error('command: ', command);
    console.error('input: ', input);
    const output = await executeCommand(command, input);
    console.error('output: ', output);
    
    return output;
}