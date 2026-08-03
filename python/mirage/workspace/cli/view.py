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

from mirage.commands.cli.types import CLISpec
from mirage.commands.spec import SPECS
from mirage.workspace.cli.registry import CLIRegistry
from mirage.workspace.names import NAMESPACE_COMMANDS


def leaf_verbs(spec: CLISpec) -> list[str]:
    """The fn-bearing leaf paths of a program tree, depth-first.

    Args:
        spec (CLISpec): the program tree.

    Returns:
        list[str]: verb paths ("message send"), empty for a root-fn
        spec (a single-verb program has no verb words).
    """
    verbs: list[str] = []
    stack: list[tuple[CLISpec, tuple[str, ...]]] = [(spec, ())]
    while stack:
        node, prefix = stack.pop()
        if node.fn is not None and prefix:
            verbs.append(" ".join(prefix))
        for child in reversed(node.subcommands):
            stack.append((child, prefix + (child.name, )))
    return verbs


def bin_entries(clis: CLIRegistry) -> dict[str, bytes]:
    """Render the /bin stub table: the vfs runtime's vocabulary.

    One entry per general command and per installed CLI, shell builtins
    excluded; rendered fresh on every call so installs and uninstalls
    show immediately. A stub is metadata, not a binary: deliberate,
    documented divergence.

    Args:
        clis (CLIRegistry): the workspace's installed CLIs.
    """
    entries: dict[str, bytes] = {}
    for name in sorted(set(SPECS) | NAMESPACE_COMMANDS):
        entries[name] = f"{name}: general command\n".encode()
    for name, install in clis.items().items():
        stub = f"{name}: installed CLI (spec {install.spec.name})\n"
        verbs = leaf_verbs(install.spec)
        if verbs:
            stub += f"verbs: {', '.join(verbs)}\n"
        entries[name] = stub.encode()
    return entries
