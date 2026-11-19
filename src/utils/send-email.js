// TODO: replace with real email provider (SendGrid, SES, etc.)

/**
 * @description Sends an email; currently a stub that logs the recipient and subject instead of contacting a mail provider.
 * @param {Object} email - The email to send.
 * @param {string} email.to - Recipient email address.
 * @param {string} email.subject - Subject line.
 * @param {string} email.body - Message body (accepted but not used by the stub).
 * @returns {Promise<{ sent: boolean, to: string, subject: string }>} Resolves to a confirmation with `sent: true` and the recipient and subject.
 */
function sendEmail({ to, subject, body }) {
  console.log('[EMAIL] Sending to:', to, '| Subject:', subject);
  return Promise.resolve({ sent: true, to, subject });
}

module.exports = { sendEmail };
