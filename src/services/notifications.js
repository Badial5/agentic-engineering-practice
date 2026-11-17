// Outbound notifications. Kept apart from resource services so they stay free of side effects.
const { sendEmail } = require('../utils/send-email');

function sendWelcomeEmail(user) {
  return sendEmail({
    to: user.email,
    subject: 'Welcome to Taskr!',
    body: `Hi ${user.name}, your account is ready. Start managing your tasks at taskr.io.`
  });
}

module.exports = { sendWelcomeEmail };
