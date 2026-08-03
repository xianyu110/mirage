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
from mirage.io import IOResult
from mirage.workspace.cli.registry import CLIRegistry
from mirage.workspace.cli.view import bin_entries, leaf_verbs


async def noop(config, paths, *texts, **flags):
    return None, IOResult()


def make_tree() -> CLISpec:
    return CLISpec(
        name="slack",
        subcommands=(CLISpec(name="message",
                             subcommands=(CLISpec(name="send", fn=noop),
                                          CLISpec(name="edit", fn=noop))),
                     CLISpec(name="channel",
                             subcommands=(CLISpec(name="list", fn=noop), ))),
    )


def test_leaf_verbs_walk_depth_first():
    verbs = leaf_verbs(make_tree())
    assert verbs == ["message send", "message edit", "channel list"]


def test_leaf_verbs_empty_for_single_verb_program():
    assert leaf_verbs(CLISpec(name="hello", fn=noop)) == []


def test_bin_entries_render_general_commands_and_installs():
    clis = CLIRegistry()
    clis.install("slack-eng", make_tree())
    entries = bin_entries(clis)
    assert entries["cat"] == b"cat: general command\n"
    assert entries["slack-eng"] == (
        b"slack-eng: installed CLI (spec slack)\n"
        b"verbs: message send, message edit, channel list\n")
    # Shell builtins are excluded: the view is the vfs vocabulary.
    assert "cd" not in entries
    assert "export" not in entries


def test_bin_entries_track_uninstall():
    clis = CLIRegistry()
    clis.install("slack-eng", make_tree())
    clis.uninstall("slack-eng")
    assert "slack-eng" not in bin_entries(clis)
