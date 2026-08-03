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

from collections.abc import Callable

from mirage.accessor.bin import BinAccessor
from mirage.commands.builtin.bin import COMMANDS
from mirage.ops.bin import OPS
from mirage.resource.base import BaseResource

BIN_PREFIX = "/bin"


class BinViewResource(BaseResource):
    """Read-only view resource backing the /bin mount.

    Renders the vfs runtime's vocabulary (general commands + installed
    CLIs) as one stub file per name on every read; holds no storage of
    its own, so installs and uninstalls show immediately.

    Args:
        entries (Callable[[], dict[str, bytes]]): renders the current
            stub table (name -> content).
    """
    accessor: BinAccessor

    name = "bin"
    # Stubs render from in-memory state, so stat() sizes by rendering:
    # cheap, no network, and never None.
    SIZES_ALWAYS_KNOWN: bool = True

    def __init__(self, entries: Callable[[], dict[str, bytes]]) -> None:
        super().__init__()
        self.accessor = BinAccessor(entries)
        for fn in COMMANDS:
            self.register(fn)
        for op in OPS:
            self.register_op(op)
