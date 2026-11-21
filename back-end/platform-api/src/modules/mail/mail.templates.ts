/** Rendered email content, ready for `MailService.send`. */
export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#111827">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px">
      <h1 style="margin:0 0 16px;font-size:20px">${title}</h1>
      ${body}
      <p style="margin:32px 0 0;font-size:12px;color:#6b7280">
        Job Board — automated message, please do not reply.
      </p>
    </div>
  </body>
</html>`;
}

/** One-time code used by both the recruiter and the candidate login flows. */
export function otpEmail(code: string, expiryMinutes: number): MailContent {
  return {
    subject: `Your Job Board verification code: ${code}`,
    text: [
      `Your verification code is ${code}.`,
      `It expires in ${expiryMinutes} minutes.`,
      'If you did not try to sign in, you can ignore this email.',
    ].join('\n\n'),
    html: layout(
      'Verify your sign-in',
      `<p style="margin:0 0 16px">Use this code to finish signing in:</p>
       <p style="margin:0 0 16px;font-size:32px;letter-spacing:8px;font-weight:bold">${code}</p>
       <p style="margin:0;color:#6b7280">The code expires in ${expiryMinutes} minutes.</p>`,
    ),
  };
}

/** Password reset link for an internal user (recruiter, admin, manager). */
export function passwordResetEmail(
  link: string,
  expiryMinutes: number,
): MailContent {
  return {
    subject: 'Reset your Job Board password',
    text: [
      'We received a request to reset your password.',
      `Open this link to choose a new one: ${link}`,
      `The link expires in ${expiryMinutes} minutes and can be used once.`,
      'If you did not ask for this, no action is needed.',
    ].join('\n\n'),
    html: layout(
      'Reset your password',
      `<p style="margin:0 0 16px">We received a request to reset your password.</p>
       <p style="margin:0 0 16px">
         <a href="${link}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none">Choose a new password</a>
       </p>
       <p style="margin:0;color:#6b7280">
         The link expires in ${expiryMinutes} minutes and can be used once.
         If you did not ask for this, no action is needed.
       </p>`,
    ),
  };
}
