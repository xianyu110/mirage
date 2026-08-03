// ========= Copyright 2026 @ Strukto.AI All Rights Reserved. =========
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// ========= Copyright 2026 @ Strukto.AI All Rights Reserved. =========

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { beforeAll, describe, expect, it } from 'vitest'

import { CLISpec } from '../commands/cli/types.ts'
import { IOResult } from '../io/types.ts'
import { OpsRegistry } from '../ops/registry.ts'
import { RAMResource } from '../resource/ram/ram.ts'
import { createShellParser, type ShellParser } from '../shell/parse.ts'
import { MountMode } from '../types.ts'
import { type ExecuteResult, Workspace } from './workspace.ts'

// Mirrors the /bin cases in python/tests/e2e/test_cli_dispatch.py.

const require = createRequire(import.meta.url)
const engineWasm = readFileSync(require.resolve('web-tree-sitter/web-tree-sitter.wasm'))
const grammarWasm = readFileSync(require.resolve('tree-sitter-bash/tree-sitter-bash.wasm'))

let parser: ShellParser

beforeAll(async () => {
  parser = await createShellParser({ engineWasm, grammarWasm })
})

function makeWs(): Workspace {
  const ram = new RAMResource()
  const ops = new OpsRegistry()
  ops.registerResource(ram)
  return new Workspace({ '/data': ram }, { mode: MountMode.WRITE, ops, shellParser: parser })
}

const noop = () => [null, new IOResult()] as [null, IOResult]

function makeTree(): CLISpec {
  return new CLISpec({
    name: 'slackish',
    subcommands: [
      new CLISpec({
        name: 'message',
        subcommands: [new CLISpec({ name: 'send', fn: noop })],
      }),
    ],
  })
}

function out(r: ExecuteResult): string {
  return r.stdoutText
}

describe('/bin view', () => {
  it('tracks the registry', async () => {
    const ws = makeWs()
    ws.registerCli('slack-eng', makeTree())
    let r = await ws.execute('cat /bin/slack-eng')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toBe('slack-eng: installed CLI (spec slackish)\nverbs: message send\n')
    r = await ws.execute('ls /bin')
    expect(r.exitCode).toBe(0)
    expect(out(r)).toContain('slack-eng')
    expect(out(r)).toContain('cat')
    ws.unregisterCli('slack-eng')
    r = await ws.execute('cat /bin/slack-eng')
    expect(r.exitCode).toBe(1)
    expect(r.stderrText).toContain('No such file or directory')
    await ws.close()
  })

  it('the policy sees the cli fact', async () => {
    const seen: (string | null)[] = []
    const ram = new RAMResource()
    const ops = new OpsRegistry()
    ops.registerResource(ram)
    const ws = new Workspace(
      { '/data': ram },
      {
        mode: MountMode.WRITE,
        ops,
        shellParser: parser,
        policy: (ctx) => {
          seen.push(ctx.commands[0]?.cli ?? null)
          if (ctx.commands[0]?.cli === 'slack-eng') return { deny: 'cli lines are frozen' }
          return null
        },
      },
    )
    ws.registerCli('slack-eng', makeTree())
    const r = await ws.execute('slack-eng message send hi')
    expect(r.exitCode).toBe(126)
    expect(r.stderrText).toContain('policy denied')
    expect(seen.at(-1)).toBe('slack-eng')
    const ok = await ws.execute('echo unaffected')
    expect(ok.exitCode).toBe(0)
    expect(seen.at(-1)).toBeNull()
    await ws.close()
  })
})
