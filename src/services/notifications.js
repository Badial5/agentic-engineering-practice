// Outbound notifications. Kept apart from resource services so they stay free of side effects.
const { sendEmail } = require('../utils/send-email');

/**
 * @description Sends the welcome email to a newly created user.
 * @param {Object} user - The created user.
 * @param {string} user.email - Recipient address.
 * @param {string} user.name - Name used in the greeting.
 * @returns {Promise<{ sent: boolean, to: string, subject: string }>} Resolves with the mailer's confirmation.
 */
function sendWelcomeEmail(user) {
  return sendEmail({
    to: user.email,
    subject: 'Welcome to Taskr!',
    body: `Hi ${user.name}, your account is ready. Start managing your tasks at taskr.io.`
  });
}

module.exports = { sendWelcomeEmail };
