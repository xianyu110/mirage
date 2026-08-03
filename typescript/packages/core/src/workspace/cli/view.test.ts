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

import { describe, expect, it } from 'vitest'

import { CLISpec } from '../../commands/cli/types.ts'
import { IOResult } from '../../io/types.ts'
import { CLIRegistry } from './registry.ts'
import { binEntries, leafVerbs } from './view.ts'

// Mirrors python/tests/workspace/cli/test_view.py.

const noop = () => [null, new IOResult()] as [null, IOResult]

function makeTree(): CLISpec {
  return new CLISpec({
    name: 'slack',
    subcommands: [
      new CLISpec({
        name: 'message',
        subcommands: [
          new CLISpec({ name: 'send', fn: noop }),
          new CLISpec({ name: 'edit', fn: noop }),
        ],
      }),
      new CLISpec({
        name: 'channel',
        subcommands: [new CLISpec({ name: 'list', fn: noop })],
      }),
    ],
  })
}

const dec = new TextDecoder()

describe('leafVerbs', () => {
  it('walks depth-first', () => {
    expect(leafVerbs(makeTree())).toEqual(['message send', 'message edit', 'channel list'])
  })

  it('is empty for a single-verb program', () => {
    expect(leafVerbs(new CLISpec({ name: 'hello', fn: noop }))).toEqual([])
  })
})

describe('binEntries', () => {
  it('renders general commands and installs, excluding shell builtins', () => {
    const clis = new CLIRegistry()
    clis.install('slack-eng', makeTree())
    const entries = binEntries(clis)
    expect(dec.decode(entries.get('cat'))).toBe('cat: general command\n')
    expect(dec.decode(entries.get('slack-eng'))).toBe(
      'slack-eng: installed CLI (spec slack)\nverbs: message send, message edit, channel list\n',
    )
    expect(entries.has('cd')).toBe(false)
    expect(entries.has('export')).toBe(false)
  })

  it('tracks uninstall', () => {
    const clis = new CLIRegistry()
    clis.install('slack-eng', makeTree())
    clis.uninstall('slack-eng')
    expect(binEntries(clis).has('slack-eng')).toBe(false)
  })
})
