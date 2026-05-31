// Email/SMS notification service for reservations and other communications

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SMSConfig {
  to: string;
  message: string;
}

export async function sendReservationConfirmation(
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  date: Date,
  partySize: number,
  restaurantName: string
) {
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Send email confirmation
  if (customerEmail) {
    await sendEmail({
      to: customerEmail,
      subject: `Reservation Confirmed at ${restaurantName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f97316;">Reservation Confirmed</h2>
          <p>Dear ${customerName},</p>
          <p>Your reservation at <strong>${restaurantName}</strong> has been confirmed.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Date & Time:</strong> ${formattedDate}</p>
            <p><strong>Party Size:</strong> ${partySize} guests</p>
          </div>
          <p>Please arrive 10 minutes before your reservation time.</p>
          <p>If you need to cancel or modify your reservation, please contact us.</p>
          <p>Thank you for choosing ${restaurantName}!</p>
        </div>
      `,
      text: `Reservation Confirmed at ${restaurantName}\n\nDear ${customerName},\n\nYour reservation has been confirmed for ${formattedDate} for ${partySize} guests.\n\nPlease arrive 10 minutes before your reservation time.\n\nThank you for choosing ${restaurantName}!`,
    });
  }

  // Send SMS confirmation
  if (customerPhone) {
    await sendSMS({
      to: customerPhone,
      message: `Reservation confirmed at ${restaurantName} for ${formattedDate}, ${partySize} guests. Reply CANCEL to cancel.`,
    });
  }
}

export async function sendReservationReminder(
  customerName: string,
  customerPhone: string,
  date: Date,
  restaurantName: string
) {
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  await sendSMS({
    to: customerPhone,
    message: `Reminder: Your reservation at ${restaurantName} is tomorrow at ${formattedDate}. Reply CANCEL to cancel.`,
  });
}

export async function sendWaitlistNotification(
  customerName: string,
  customerPhone: string,
  estimatedTime: number,
  restaurantName: string
) {
  await sendSMS({
    to: customerPhone,
    message: `Hi ${customerName}, your table at ${restaurantName} will be ready in approximately ${estimatedTime} minutes. We'll notify you when it's ready.`,
  });
}

export async function sendLowStockAlert(
  restaurantName: string,
  ingredientName: string,
  currentStock: number,
  minStock: number,
  unit: string,
  recipientEmail: string
) {
  await sendEmail({
    to: recipientEmail,
    subject: `Low Stock Alert: ${ingredientName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ef4444;">Low Stock Alert</h2>
        <p>The following ingredient is running low at <strong>${restaurantName}</strong>:</p>
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p><strong>Ingredient:</strong> ${ingredientName}</p>
          <p><strong>Current Stock:</strong> ${currentStock} ${unit}</p>
          <p><strong>Minimum Stock:</strong> ${minStock} ${unit}</p>
        </div>
        <p>Please reorder soon to avoid running out.</p>
      </div>
    `,
    text: `Low Stock Alert: ${ingredientName}\n\nCurrent: ${currentStock} ${unit}\nMinimum: ${minStock} ${unit}\n\nPlease reorder soon.`,
  });
}

async function sendEmail(config: EmailConfig) {
  // In production, integrate with an email service like:
  // - SendGrid
  // - AWS SES
  // - Mailgun
  // - Resend
  
  console.log("Email would be sent:", config);
  
  // Example with Resend (uncomment and configure):
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: process.env.FROM_EMAIL || 'noreply@restaurant.com',
  //   to: config.to,
  //   subject: config.subject,
  //   html: config.html,
  //   text: config.text,
  // });
}

async function sendSMS(config: SMSConfig) {
  // In production, integrate with an SMS service like:
  // - Twilio
  // - AWS SNS
  // - MessageBird
  // - Plivo
  
  console.log("SMS would be sent:", config);
  
  // Example with Twilio (uncomment and configure):
  // const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: config.to,
  //   body: config.message,
  // });
}

export async function sendPayrollNotification(
  staffName: string,
  staffEmail: string,
  period: string,
  totalPay: number,
  restaurantName: string
) {
  await sendEmail({
    to: staffEmail,
    subject: `Payroll Statement - ${period}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f97316;">Payroll Statement</h2>
        <p>Dear ${staffName},</p>
        <p>Your payroll statement for <strong>${period}</strong> at <strong>${restaurantName}</strong> is ready.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Total Pay:</strong> ₹${totalPay.toFixed(2)}</p>
        </div>
        <p>Please log in to your dashboard to view the full breakdown.</p>
      </div>
    `,
    text: `Payroll Statement - ${period}\n\nDear ${staffName},\n\nYour total pay for ${period} is ₹${totalPay.toFixed(2)}.\n\nPlease log in to your dashboard to view the full breakdown.`,
  });
}
