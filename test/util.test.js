import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { after, afterEach, before, beforeEach, describe, test, mock } from 'node:test';

let fixture;
let npmRoot;
let docsDirectory;
let getCommandDocs;
let runCliCommand;
let searchCommands;
let getBestPractices;

// Behaviour of the mocked child_process functions, adjustable per test
let execBehavior;
let spawnBehavior;
let spawnCalls;

const defaultExecBehavior = (command, callback) => {
    if (command === 'npm list -g --depth=0') {
        callback(null, '@pnp/cli-microsoft365', '');
    } else if (command === 'npm root -g') {
        callback(null, npmRoot, '');
    } else {
        throw new Error(`Unexpected command: ${command}`);
    }
};

function createSpawnBehavior({ stdout = '', stderr = '', code = 0, error } = {}) {
    return () => {
        const subprocess = new EventEmitter();
        subprocess.stdout = new EventEmitter();
        subprocess.stderr = new EventEmitter();
        setImmediate(() => {
            if (error) {
                subprocess.emit('error', error);
                return;
            }
            if (stdout) {
                subprocess.stdout.emit('data', Buffer.from(stdout));
            }
            if (stderr) {
                subprocess.stderr.emit('data', Buffer.from(stderr));
            }
            subprocess.emit('close', code);
        });
        return subprocess;
    };
}

before(async () => {
    const tempDirectory = path.resolve('temp');
    await fs.mkdir(tempDirectory, { recursive: true });
    fixture = await fs.mkdtemp(path.join(tempDirectory, 'docs-test-'));
    npmRoot = path.join(fixture, 'node_modules');
    const packageDirectory = path.join(npmRoot, '@pnp', 'cli-microsoft365');
    docsDirectory = path.join(packageDirectory, 'docs', 'docs', 'cmd');
    await fs.mkdir(path.join(docsDirectory, 'spo', 'site'), { recursive: true });
    await fs.writeFile(path.join(docsDirectory, 'spo', 'site', 'site-get.mdx'), 'Command documentation');
    await fs.writeFile(path.join(fixture, 'secret.txt'), 'private content');
    await fs.writeFile(path.join(packageDirectory, 'allCommandsFull.json'), JSON.stringify([
        { name: 'spo site get', description: 'Gets information about the specific site collection', help: 'spo/site/site-get.mdx' },
        { name: 'spo site list', description: 'Lists modern sites of the given type', help: 'spo/site/site-list.mdx' },
        { name: 'entra user get', description: 'Gets information about the specified user', help: 'entra/user/user-get.mdx' },
        { name: 'teams channel add', description: 'Adds a channel to the specified Microsoft Teams team', help: 'teams/channel/channel-add.mdx' }
    ]));

    mock.method(childProcess, 'exec', (command, callback) => execBehavior(command, callback));
    mock.method(childProcess, 'spawn', (command, options) => {
        spawnCalls.push({ command, options });
        return spawnBehavior(command, options);
    });
    syncBuiltinESMExports();
    ({ getCommandDocs, runCliCommand, searchCommands, getBestPractices } = await import('../dist/util.js'));
});

beforeEach(() => {
    execBehavior = defaultExecBehavior;
    spawnBehavior = createSpawnBehavior();
    spawnCalls = [];
    // Keep test output clean from expected error logging
    mock.method(console, 'error', () => { });
    mock.method(console, 'log', () => { });
});

afterEach(() => {
    console.error.mock.restore();
    console.log.mock.restore();
});

after(async () => {
    mock.restoreAll();
    syncBuiltinESMExports();
    if (fixture) {
        await fs.rm(fixture, { recursive: true, force: true });
    }
});

describe('getCommandDocs', () => {
    test('reads nested command documentation', async () => {
        assert.equal(await getCommandDocs('m365 spo site get', 'spo/site/site-get.mdx'), 'Command documentation');
    });

    test('rejects paths outside the documentation directory', async () => {
        const paths = [
            path.relative(docsDirectory, path.join(fixture, 'secret.txt')),
            path.join(fixture, 'secret.txt'),
            `..${path.sep}cmd-sibling${path.sep}secret.txt`,
            '..',
            ''
        ];
        for (const docs of paths) {
            const result = await getCommandDocs('test', docs);
            assert.match(result, /Documentation path must be within the command documentation directory/);
            assert.doesNotMatch(result, /private content/);
        }
    });

    test('rejects documentation that resolves outside the documentation directory', async () => {
        const docs = 'spo/site/site-get.mdx';
        const filePath = path.join(docsDirectory, docs);
        const realpath = fs.realpath.bind(fs);
        const realpathMock = mock.method(fs, 'realpath', async (requestedPath) =>
            requestedPath === filePath ? path.join(fixture, 'secret.txt') : realpath(requestedPath));
        try {
            const result = await getCommandDocs('test', docs);
            assert.match(result, /Documentation path must be within the command documentation directory/);
            assert.doesNotMatch(result, /private content/);
        } finally {
            realpathMock.mock.restore();
        }
    });

    test('reports missing documentation', async () => {
        const result = await getCommandDocs('test', 'spo/site/missing.mdx');
        assert.match(result, /Documentation file for command test not found/);
    });

    test('reports when the CLI package is not installed globally', async () => {
        execBehavior = (command, callback) => callback(null, 'some-other-package', '');
        const result = await getCommandDocs('test', 'spo/site/site-get.mdx');
        assert.match(result, /Failed to retrieve documentation for command test/);
        assert.match(result, /@pnp\/cli-microsoft365 npm package not found/);
    });

    test('reports when listing global packages fails', async () => {
        execBehavior = (command, callback) => callback(new Error('npm not available'), '', '');
        const result = await getCommandDocs('test', 'spo/site/site-get.mdx');
        assert.match(result, /@pnp\/cli-microsoft365 npm package not found/);
    });

    test('reports when resolving the global npm root fails', async () => {
        execBehavior = (command, callback) => {
            if (command === 'npm list -g --depth=0') {
                callback(null, '@pnp/cli-microsoft365', '');
            } else {
                callback(new Error('npm root failed'), '', '');
            }
        };
        const result = await getCommandDocs('test', 'spo/site/site-get.mdx');
        assert.match(result, /@pnp\/cli-microsoft365 npm package not found/);
    });
});

describe('runCliCommand', () => {
    test('rejects commands that do not start with m365', async () => {
        for (const command of ['npm install', 'm365x spo site get', '', 'echo m365']) {
            await assert.rejects(runCliCommand(command), /Only m365 commands are allowed/);
        }
        assert.equal(spawnCalls.length, 0);
    });

    test('rejects commands with shell metacharacters', async () => {
        const commands = [
            'm365 spo site get; rm -rf /',
            'm365 spo site get && whoami',
            'm365 spo site get | more',
            'm365 spo site get `whoami`',
            'm365 spo site get $(whoami)',
            'm365 spo site get > out.txt',
            'm365 spo site get < in.txt',
            'm365 spo site get\nwhoami',
            'm365 spo site get\rwhoami'
        ];
        for (const command of commands) {
            await assert.rejects(runCliCommand(command), /disallowed shell metacharacters/);
        }
        assert.equal(spawnCalls.length, 0);
    });

    test('appends json output and compacts json results', async () => {
        spawnBehavior = createSpawnBehavior({ stdout: '{\n  "Title": "Site",\n  "Id": 1\n}\n' });
        const result = await runCliCommand('  m365 spo site get --url https://contoso.sharepoint.com  ');
        assert.equal(result, '{"Title":"Site","Id":1}');
        assert.equal(spawnCalls[0].command, 'm365 spo site get --url https://contoso.sharepoint.com --output json');
        assert.equal(spawnCalls[0].options.shell, true);
        assert.equal(spawnCalls[0].options.timeout, 120000);
    });

    test('appends csv output for list commands', async () => {
        spawnBehavior = createSpawnBehavior({ stdout: 'Title,Url\nSite,https://contoso\n' });
        const result = await runCliCommand('m365 spo site list --type TeamSite');
        assert.equal(result, 'Title,Url\nSite,https://contoso');
        assert.equal(spawnCalls[0].command, 'm365 spo site list --type TeamSite --output csv');
    });

    test('appends json output for bare m365 command', async () => {
        spawnBehavior = createSpawnBehavior({ stdout: '"ok"' });
        assert.equal(await runCliCommand('m365'), '"ok"');
        assert.equal(spawnCalls[0].command, 'm365 --output json');
    });

    test('keeps explicit output option and compacts explicit json output', async () => {
        spawnBehavior = createSpawnBehavior({ stdout: '[ 1, 2 ]' });
        assert.equal(await runCliCommand('m365 spo site list --output json'), '[1,2]');
        assert.equal(spawnCalls[0].command, 'm365 spo site list --output json');

        spawnBehavior = createSpawnBehavior({ stdout: '[ 1, 2 ]' });
        assert.equal(await runCliCommand('m365 spo site get --output=json'), '[1,2]');
        assert.equal(spawnCalls[1].command, 'm365 spo site get --output=json');
    });

    test('does not compact explicit non-json output', async () => {
        spawnBehavior = createSpawnBehavior({ stdout: '{ "a": 1 }\n' });
        assert.equal(await runCliCommand('m365 spo site get --output text'), '{ "a": 1 }');
        assert.equal(spawnCalls[0].command, 'm365 spo site get --output text');
    });

    test('does not treat --output-file as output option', async () => {
        spawnBehavior = createSpawnBehavior({ stdout: '{}' });
        await runCliCommand('m365 spo file get --output-file file.txt');
        assert.equal(spawnCalls[0].command, 'm365 spo file get --output-file file.txt --output json');
    });

    test('returns non-json output as-is when json was expected', async () => {
        spawnBehavior = createSpawnBehavior({ stdout: 'not json output\n' });
        assert.equal(await runCliCommand('m365 status'), 'not json output');
    });

    test('rejects with stderr when command fails', async () => {
        spawnBehavior = createSpawnBehavior({ stderr: ' Error: Access denied \n', code: 1 });
        await assert.rejects(runCliCommand('m365 spo site get'), { message: 'Error: Access denied' });
    });

    test('rejects with exit code when command fails without stderr', async () => {
        spawnBehavior = createSpawnBehavior({ code: 2 });
        await assert.rejects(runCliCommand('m365 spo site get'), { message: 'Command failed with exit code 2' });
    });

    test('rejects with timeout error when process times out', async () => {
        spawnBehavior = createSpawnBehavior({ error: new Error('spawn timeout') });
        await assert.rejects(runCliCommand('m365 spo site get'), { message: 'Command timed out' });
    });

    test('rejects with process error', async () => {
        const error = new Error('spawn ENOENT');
        spawnBehavior = createSpawnBehavior({ error });
        await assert.rejects(runCliCommand('m365 spo site get'), error);
    });
});

describe('searchCommands', () => {
    test('returns matching commands', async () => {
        const result = await searchCommands('site get');
        assert.ok(result.length > 0);
        assert.deepEqual(result[0], {
            name: 'm365 spo site get',
            description: 'Gets information about the specific site collection',
            docs: 'spo/site/site-get.mdx'
        });
    });

    test('limits the number of results', async () => {
        const result = await searchCommands('spo site', 1);
        assert.equal(result.length, 1);
    });

    test('returns empty array when nothing matches', async () => {
        assert.deepEqual(await searchCommands('zzzzqqqq'), []);
    });

    test('returns error when the CLI package is not installed globally', async () => {
        execBehavior = (command, callback) => callback(null, '', '');
        const result = await searchCommands('site');
        assert.equal(result.length, 1);
        assert.match(result[0].error, /Failed to retrieve commands/);
        assert.match(result[0].error, /allCommandsFull.json file not found/);
    });

    test('returns error when commands file cannot be parsed', async () => {
        const readFileMock = mock.method(fs, 'readFile', async () => 'invalid json');
        try {
            const result = await searchCommands('site');
            assert.equal(result.length, 1);
            assert.match(result[0].error, /Failed to retrieve commands/);
        } finally {
            readFileMock.mock.restore();
        }
    });

    test('returns error when search fails unexpectedly', async () => {
        const result = await searchCommands(undefined);
        assert.equal(result.length, 1);
        assert.match(result[0].error, /Failed to search commands/);
    });
});

describe('getBestPractices', () => {
    afterEach(() => {
        globalThis.fetch.mock?.restore();
    });

    test('returns best practices content from GitHub', async () => {
        const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('# Best practices', { status: 200 }));
        assert.equal(await getBestPractices(), '# Best practices');
        assert.equal(fetchMock.mock.calls[0].arguments[0],
            'https://raw.githubusercontent.com/pnp/cli-microsoft365-mcp-server/main/best-practices.md');
    });

    test('returns error message when response is not ok', async () => {
        mock.method(globalThis, 'fetch', async () => new Response('', { status: 404, statusText: 'Not Found' }));
        const result = await getBestPractices();
        assert.match(result, /Failed to retrieve best practices from GitHub/);
        assert.match(result, /404 Not Found/);
    });

    test('returns error message when request fails', async () => {
        mock.method(globalThis, 'fetch', async () => { throw new Error('network down'); });
        const result = await getBestPractices();
        assert.match(result, /Failed to retrieve best practices from GitHub/);
        assert.match(result, /network down/);
    });
});
