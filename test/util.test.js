import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { promises as fs } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { after, before, test, mock } from 'node:test';

let fixture;
let docsDirectory;
let getCommandDocs;

before(async () => {
    const tempDirectory = path.resolve('temp');
    await fs.mkdir(tempDirectory, { recursive: true });
    fixture = await fs.mkdtemp(path.join(tempDirectory, 'docs-test-'));
    const npmRoot = path.join(fixture, 'node_modules');
    docsDirectory = path.join(npmRoot, '@pnp', 'cli-microsoft365', 'docs', 'docs', 'cmd');
    await fs.mkdir(path.join(docsDirectory, 'spo', 'site'), { recursive: true });
    await fs.writeFile(path.join(docsDirectory, 'spo', 'site', 'site-get.mdx'), 'Command documentation');
    await fs.writeFile(path.join(fixture, 'secret.txt'), 'private content');

    mock.method(childProcess, 'exec', (command, callback) => {
        if (command === 'npm list -g --depth=0') {
            callback(null, '@pnp/cli-microsoft365', '');
        } else if (command === 'npm root -g') {
            callback(null, npmRoot, '');
        } else {
            throw new Error(`Unexpected command: ${command}`);
        }
    });
    syncBuiltinESMExports();
    ({ getCommandDocs } = await import('../dist/util.js'));
});

after(async () => {
    mock.restoreAll();
    syncBuiltinESMExports();
    if (fixture) {
        await fs.rm(fixture, { recursive: true, force: true });
    }
});

test('reads nested command documentation', async () => {
    assert.equal(await getCommandDocs('m365 spo site get', 'spo/site/site-get.mdx'), 'Command documentation');
});

test('rejects paths outside the documentation directory', async () => {
    const paths = [
        path.relative(docsDirectory, path.join(fixture, 'secret.txt')),
        path.join(fixture, 'secret.txt'),
        `..${path.sep}cmd-sibling${path.sep}secret.txt`
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
