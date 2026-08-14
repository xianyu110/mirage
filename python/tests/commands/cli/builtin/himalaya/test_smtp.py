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

from email.parser import BytesParser
from email.policy import default as default_policy

from mirage.commands.cli.builtin.himalaya.smtp import (SENT_FOLDERS,
                                                       delivered_form)


def parse(raw: bytes):
    return BytesParser(policy=default_policy).parsebytes(raw)


# The copy filed in the sent folder is the message as it left the server,
# which is the one thing the sender must not keep a Bcc line in: the
# header never survives delivery, so a copy carrying it would show the
# sender a message nobody received.
def test_delivered_form_drops_bcc():
    message = parse(b"To: a@x\nBcc: b@x\nSubject: hi\n\nbody")
    assert delivered_form(message)["Bcc"] is None


def test_delivered_form_drops_resent_bcc():
    message = parse(b"To: a@x\nResent-Bcc: b@x\n\nbody")
    assert delivered_form(message)["Resent-Bcc"] is None


def test_delivered_form_keeps_the_other_headers_and_the_body():
    message = parse(b"To: a@x\nCc: c@x\nBcc: b@x\nSubject: hi\n\nbody")
    delivered = delivered_form(message)
    assert delivered["To"] == "a@x"
    assert delivered["Cc"] == "c@x"
    assert delivered["Subject"] == "hi"
    assert delivered.get_payload() == "body"


def test_delivered_form_leaves_the_original_alone():
    message = parse(b"To: a@x\nBcc: b@x\n\nbody")
    delivered_form(message)
    assert message["Bcc"] == "b@x"


# IMAP never standardized the folder's name, so the conventional
# spellings are tried in order and the plain one wins.
def test_sent_folders_are_tried_plainest_first():
    assert SENT_FOLDERS[0] == "Sent"
    assert set(SENT_FOLDERS) == {
        "Sent", "INBOX.Sent", "Sent Messages", "Sent Items"
    }
