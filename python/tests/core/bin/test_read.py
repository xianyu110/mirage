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

import pytest

from mirage.accessor.bin import BinAccessor
from mirage.core.bin.read import read
from mirage.types import PathSpec

ENTRIES = {"slack": b"slack: installed CLI (spec slack)\n"}


def make_accessor() -> BinAccessor:
    return BinAccessor(lambda: dict(ENTRIES))


def spec(virtual: str, key: str) -> PathSpec:
    return PathSpec(virtual=virtual,
                    directory="/bin",
                    resolved=True,
                    resource_path=key)


@pytest.mark.asyncio
async def test_read_serves_a_stub():
    data = await read(make_accessor(), spec("/bin/slack", "slack"))
    assert data == ENTRIES["slack"]


@pytest.mark.asyncio
async def test_read_unknown_name_is_enoent():
    with pytest.raises(FileNotFoundError):
        await read(make_accessor(), spec("/bin/nope", "nope"))


@pytest.mark.asyncio
async def test_read_root_is_a_directory():
    with pytest.raises(IsADirectoryError):
        await read(make_accessor(), spec("/bin", ""))
