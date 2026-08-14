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

import copy
from email.message import Message
from email.parser import BytesParser
from email.policy import default as default_policy

import aiosmtplib

from mirage.accessor.email import EmailAccessor
from mirage.core.email._client import list_folders
from mirage.core.email.config import EmailConfig
from mirage.resource.secrets import reveal_secret

# Where a copy of a sent message goes, in the order a client tries them.
# The name is not standardized: an IMAP server that predates SPECIAL-USE
# advertises none of this, so a client probes the conventional spellings
# and files the copy in the first one that is there.
SENT_FOLDERS = ("Sent", "INBOX.Sent", "Sent Messages", "Sent Items")


def delivered_form(message: Message) -> Message:
    """The message as it leaves the server, without Bcc.

    Args:
        message (Message): the composed message.

    Returns:
        Message: a copy with the Bcc headers removed, which is what
            ``aiosmtplib.send`` transmits and therefore what a copy in the
            sent folder has to be.
    """
    copied = copy.copy(message)
    del copied["Bcc"]
    del copied["Resent-Bcc"]
    return copied


async def file_in_sent(config: EmailConfig, delivered: Message) -> None:
    """File a copy of a delivered message in the account's sent folder.

    SMTP hands a message to the server and keeps no record of it, so a
    client that only sends leaves the sender's own mailbox showing nothing
    happened. Every real client appends the delivered bytes over IMAP,
    which is what makes ``Sent`` a record of what this account sent rather
    than an empty folder.

    An account whose server has no sent folder under any of the
    conventional names files nothing, since there is nowhere to put it.

    Args:
        config (EmailConfig): IMAP credentials and host.
        delivered (Message): the message in the form that was sent.
    """
    accessor = EmailAccessor(config)
    try:
        present = set(await list_folders(accessor))
        folder = next((name for name in SENT_FOLDERS if name in present), None)
        if folder is None:
            return
        imap = await accessor.get_imap()
        await imap.append(delivered.as_bytes(), mailbox=folder, flags="\\Seen")
    finally:
        await accessor.close()


async def send_raw(config: EmailConfig, raw: bytes) -> Message:
    """Push an RFC 5322 message through the account's SMTP path.

    Sending lives with the CLI rather than in ``core/email`` because
    the email mount is read-only: no filesystem operation reaches
    SMTP, and himalaya is the only thing that sends.

    Args:
        config (EmailConfig): SMTP credentials and host.
        raw (bytes): the complete RFC 5322 message.

    Returns:
        Message: the parsed message, so callers can report its headers.
    """
    message = BytesParser(policy=default_policy).parsebytes(raw)
    # start_tls=None upgrades opportunistically when the server advertises
    # STARTTLS and stays plaintext otherwise, mirroring nodemailer's
    # behavior in the TS backend (which only forces TLS on port 465).
    await aiosmtplib.send(
        message,
        hostname=config.smtp_host,
        port=config.smtp_port,
        username=config.username,
        password=reveal_secret(config.password),
        start_tls=None,
    )
    await file_in_sent(config, delivered_form(message))
    return message
