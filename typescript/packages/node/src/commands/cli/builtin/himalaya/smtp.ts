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

import { loadOptionalPeer } from '@struktoai/mirage-core'
import type * as Nodemailer from 'nodemailer'
import { EmailAccessor } from '../../../../accessor/email.ts'
import { listFolders } from '../../../../core/email/_client.ts'
import { parseRfc822, type ParsedRfc822 } from '../../../../core/email/_parse.ts'
import type { EmailConfig } from '../../../../core/email/config.ts'

const transporterCache = new WeakMap<EmailConfig, Nodemailer.Transporter>()

// Where a copy of a sent message goes, in the order a client tries them.
// The name is not standardized: an IMAP server that predates SPECIAL-USE
// advertises none of this, so a client probes the conventional spellings
// and files the copy in the first one that is there.
const SENT_FOLDERS = ['Sent', 'INBOX.Sent', 'Sent Messages', 'Sent Items']

async function getTransporter(config: EmailConfig): Promise<Nodemailer.Transporter> {
  const existing = transporterCache.get(config)
  if (existing !== undefined) return existing
  const mod = await loadOptionalPeer(
    () => import('nodemailer') as unknown as Promise<typeof Nodemailer>,
    { feature: 'himalaya message send', packageName: 'nodemailer' },
  )
  const transporter = mod.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.username, pass: config.password },
  })
  transporterCache.set(config, transporter)
  return transporter
}

/**
 * Files a copy of a delivered message in the account's sent folder.
 *
 * SMTP hands a message to the server and keeps no record of it, so a
 * client that only sends leaves the sender's own mailbox showing nothing
 * happened. Every real client -- and Notion's, Gmail's and Toolathlon's
 * email servers alike -- appends the delivered bytes over IMAP, which is
 * what makes `Sent` a record of what this account sent rather than an
 * empty folder.
 *
 * The copy is the delivered form: Bcc is already stripped, the way it is
 * on the wire. An account whose server has no sent folder under any of
 * the conventional names keeps the old behavior and files nothing, since
 * there is nowhere to put it.
 */
async function fileInSent(config: EmailConfig, delivered: Uint8Array): Promise<void> {
  const accessor = new EmailAccessor(config)
  try {
    const folder = sentFolder(await listFolders(accessor))
    if (folder === undefined) return
    const imap = await accessor.getImap()
    await imap.append(folder, Buffer.from(delivered), ['\\Seen'])
  } finally {
    await accessor.close()
  }
}

/** The sent folder to use out of the ones a server lists, if any. */
export function sentFolder(present: readonly string[]): string | undefined {
  const listed = new Set(present)
  return SENT_FOLDERS.find((name) => listed.has(name))
}

/**
 * Pushes an RFC 5322 message through the account's SMTP path.
 *
 * Sending lives with the CLI rather than in core/email because the email
 * mount is read-only: no filesystem operation reaches SMTP, and himalaya
 * is the only thing that sends. Returns the parsed message so callers can
 * report its headers.
 */
export async function sendRaw(config: EmailConfig, raw: Uint8Array): Promise<ParsedRfc822> {
  const transporter = await getTransporter(config)
  const parsed = await parseRfc822(raw)
  const recipients = [
    ...parsed.to.map((entry) => entry.email),
    ...parsed.cc.map((entry) => entry.email),
    ...bccAddresses(raw),
  ].filter((email) => email !== '')
  // nodemailer does not read the envelope out of a raw message, so the
  // recipients have to be handed over explicitly. Bcc rides the envelope
  // and is stripped from the bytes, the way an MTA would.
  const delivered = stripBcc(raw)
  await transporter.sendMail({
    raw: Buffer.from(delivered),
    envelope: { from: parsed.from.email || config.username, to: recipients },
  })
  await fileInSent(config, delivered)
  return parsed
}

/**
 * The Bcc header's addresses, read here rather than from ParsedRfc822:
 * Bcc never survives delivery, so it has no place in the rendered
 * message the mount serves.
 */
export function bccAddresses(raw: Uint8Array): string[] {
  const addresses: string[] = []
  for (const line of bccLines(raw)) {
    const value = line.replace(/^bcc:/i, '')
    for (const part of value.split(',')) {
      const angled = /<([^>]+)>/.exec(part)
      const email = (angled === null ? part : (angled[1] ?? '')).trim()
      if (email !== '') addresses.push(email)
    }
  }
  return addresses
}

function bccLines(raw: Uint8Array): string[] {
  const text = new TextDecoder().decode(raw)
  const split = text.search(/\r?\n\r?\n/)
  const head = split === -1 ? text : text.slice(0, split)
  const found: string[] = []
  let collecting = false
  for (const line of head.split(/\r?\n/)) {
    if (/^[ \t]/.test(line)) {
      if (collecting) {
        const last = found.pop() ?? ''
        found.push(`${last} ${line.trim()}`)
      }
      continue
    }
    collecting = /^bcc:/i.test(line)
    if (collecting) found.push(line)
  }
  return found
}

/** Drops the Bcc header (and its folded continuation lines) from a message. */
export function stripBcc(raw: Uint8Array): Uint8Array {
  const text = new TextDecoder().decode(raw)
  const split = text.search(/\r?\n\r?\n/)
  if (split === -1) return raw
  const head = text.slice(0, split)
  const rest = text.slice(split)
  const kept: string[] = []
  let dropping = false
  for (const line of head.split(/\r?\n/)) {
    if (/^[ \t]/.test(line)) {
      if (!dropping) kept.push(line)
      continue
    }
    dropping = /^bcc:/i.test(line)
    if (!dropping) kept.push(line)
  }
  return new TextEncoder().encode(kept.join('\r\n') + rest)
}
