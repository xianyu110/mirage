# ========= Copyright 2026 @ Strukto.AI All Rights Reserved. =========
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ========= Copyright 2026 @ Strukto.AI All Rights Reserved. =========

from mirage.accessor.bin import BinAccessor
from mirage.cache.index import NULL_INDEX, IndexCacheStore
from mirage.types import PathSpec
from mirage.utils.errors import enoent, enotdir
from mirage.utils.key_prefix import mount_prefix_of


async def readdir(accessor: BinAccessor,
                  path: PathSpec,
                  index: IndexCacheStore = NULL_INDEX) -> list[str]:
    """List the stub names at the mount root, as virtual paths.

    Args:
        accessor (BinAccessor): Accessor holding the vocabulary provider.
        path (PathSpec): Virtual path; only the root is a directory.
        index (IndexCacheStore): Unused; op signature parity.

    Returns:
        list[str]: Sorted absolute virtual child paths for the root.
    """
    key = path.resource_path.strip("/")
    entries = accessor.entries()
    if key:
        if key in entries:
            raise enotdir(path)
        raise enoent(path)
    prefix = mount_prefix_of(path.virtual, path.resource_path)
    return [f"{prefix}/{name}" for name in sorted(entries)]
