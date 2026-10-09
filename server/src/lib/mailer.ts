import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '../config/env.js'
import { ServiceUnavailableError } from '../errors/AppError.js'

// Email to users from the admin panel (Mijozlar → "Email yuborish"). Plain SMTP, so any mailbox
// works: Gmail (app password), Yandex, Mail.ru, a hosting mailbox… — set SMTP_* in .env.
// Without them sending is off and the panel says so.

let transporter: Transporter | null = null

export function mailerConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)
}

export function mailerFrom() {
  return env.SMTP_FROM || (env.SMTP_USER ? `TaxiLine <${env.SMTP_USER}>` : '')
}

function transport() {
  if (!mailerConfigured()) throw new ServiceUnavailableError('Email yuborish sozlanmagan (SMTP)')
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      // A slow or dead SMTP server must not hang an admin request forever.
      connectionTimeout: 15_000,
      socketTimeout: 20_000,
    })
  }
  return transporter
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** The admin writes plain text; this wraps it in a simple TaxiLine-branded email. */
function renderHtml(message: string, name: string | null) {
  const body = escapeHtml(message).replace(/\n/g, '<br>')
  const greeting = name ? `Assalomu alaykum, ${escapeHtml(name)}!` : 'Assalomu alaykum!'
  return `<!doctype html><html><body style="margin:0;background:#f4f6f9;font-family:Inter,Arial,sans-serif;color:#1a2b3c">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:#00c7d4;padding:20px 28px;font-size:22px;font-weight:800;color:#1a2b3c">Taxi<span style="color:#ffffff">Line</span></td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6">
<p style="margin:0 0 14px;font-weight:700">${greeting}</p>
<p style="margin:0">${body}</p>
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e6eaf0;font-size:12px;color:#6b7a8c">
<a href="${env.PUBLIC_SITE_URL}" style="color:#00a3ae;font-weight:700;text-decoration:none">taxiline.uz</a> — shaharlararo taksi xizmati
</td></tr></table></td></tr></table></body></html>`
}

export async function sendEmail(to: string, subject: string, message: string, name: string | null) {
  await transport().sendMail({
    from: mailerFrom(),
    to,
    subject,
    text: `${name ? `Assalomu alaykum, ${name}!` : 'Assalomu alaykum!'}\n\n${message}\n\n— TaxiLine, ${env.PUBLIC_SITE_URL}`,
    html: renderHtml(message, name),
  })
}

/** Checks the SMTP login without sending anything. */
export async function verifyMailer() {
  await transport().verify()
}
