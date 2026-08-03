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

import type { BinAccessor } from '../../accessor/bin.ts'
import type { PathSpec } from '../../types.ts'
import { enoent, enotdir } from '../../utils/errors.ts'
import { mountPrefixOf } from '../../utils/key_prefix.ts'

/** List the stub names at the mount root, as absolute virtual paths. */
export function readdir(accessor: BinAccessor, path: PathSpec): Promise<string[]> {
  const key = path.resourcePath.replace(/^\/+|\/+$/g, '')
  const entries = accessor.entries()
  if (key !== '') {
    if (entries.has(key)) throw enotdir(path)
    throw enoent(path)
  }
  const prefix = mountPrefixOf(path.virtual, path.resourcePath)
  return Promise.resolve([...entries.keys()].sort().map((name) => `${prefix}/${name}`))
}
