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

import { Accessor } from './base.ts'

/**
 * Accessor over the vocabulary provider for the /bin view. `entries`
 * renders the current stub table (name -> content); called fresh on
 * every read so the view never goes stale. Injected as a callable so
 * the view layer needs no workspace import.
 */
export class BinAccessor extends Accessor {
  readonly entries: () => Map<string, Uint8Array>

  constructor(entries: () => Map<string, Uint8Array>) {
    super()
    this.entries = entries
  }
}
