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

import type { CLISpec } from '../../commands/cli/types.ts'
import { SPECS } from '../../commands/spec/index.ts'
import { NAMESPACE_COMMANDS } from '../route/constants.ts'
import type { CLIRegistry } from './registry.ts'

/**
 * The fn-bearing leaf paths of a program tree, depth-first: verb paths
 * ("message send"), empty for a root-fn spec (a single-verb program
 * has no verb words).
 */
export function leafVerbs(spec: CLISpec): string[] {
  const verbs: string[] = []
  const stack: [CLISpec, string[]][] = [[spec, []]]
  while (stack.length > 0) {
    const top = stack.pop()
    if (top === undefined) break
    const [node, prefix] = top
    if (node.fn !== null && prefix.length > 0) {
      verbs.push(prefix.join(' '))
    }
    for (let i = node.subcommands.length - 1; i >= 0; i -= 1) {
      const child = node.subcommands[i]
      if (child !== undefined) stack.push([child, [...prefix, child.name]])
    }
  }
  return verbs
}

const enc = new TextEncoder()

/**
 * Render the /bin stub table: the vfs runtime's vocabulary. One entry
 * per general command and per installed CLI, shell builtins excluded;
 * rendered fresh on every call so installs and uninstalls show
 * immediately. A stub is metadata, not a binary: deliberate,
 * documented divergence.
 */
export function binEntries(clis: CLIRegistry): Map<string, Uint8Array> {
  const entries = new Map<string, Uint8Array>()
  const general = new Set([...Object.keys(SPECS), ...NAMESPACE_COMMANDS])
  for (const name of [...general].sort()) {
    entries.set(name, enc.encode(`${name}: general command\n`))
  }
  for (const [name, install] of clis.items()) {
    let stub = `${name}: installed CLI (spec ${install.spec.name})\n`
    const verbs = leafVerbs(install.spec)
    if (verbs.length > 0) {
      stub += `verbs: ${verbs.join(', ')}\n`
    }
    entries.set(name, enc.encode(stub))
  }
  return entries
}
