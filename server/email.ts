import { notifyOwner } from "./_core/notification";

interface EmailNotification {
  to: string;
  subject: string;
  body: string;
}

/**
 * Send email notification to customer
 * Currently uses the owner notification system as a fallback
 * In production, integrate with SendGrid, Mailgun, or similar service
 */
export async function sendEmail({ to, subject, body }: EmailNotification): Promise<boolean> {
  // For now, notify the owner about the email that should be sent
  // In production, replace this with actual email service integration
  const message = `
📧 Email Notification
To: ${to}
Subject: ${subject}

${body}
  `.trim();
  
  return await notifyOwner({
    title: `Email: ${subject}`,
    content: message,
  });
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
  customerEmail: string,
  customerName: string,
  orderId: number,
  orderTotal: number,
  items: Array<{ name: string; quantity: number; price: number }>
): Promise<boolean> {
  const itemsList = items
    .map(item => `- ${item.name} x${item.quantity} - ₱${(item.price / 100).toLocaleString()}`)
    .join('\n');

  const body = `
Hi ${customerName},

Thank you for your order! We've received your order and will process it shortly.

Order #${orderId}
Total: ₱${(orderTotal / 100).toLocaleString()}

Items:
${itemsList}

We'll send you another email when your order ships.

Thank you for shopping with SoleBlessing!

Best regards,
The SoleBlessing Team
  `.trim();

  return await sendEmail({
    to: customerEmail,
    subject: `Order Confirmation #${orderId} - SoleBlessing`,
    body,
  });
}

/**
 * Send shipping update email
 */
export async function sendShippingUpdateEmail(
  customerEmail: string,
  customerName: string,
  orderId: number,
  trackingNumber?: string
): Promise<boolean> {
  const trackingInfo = trackingNumber
    ? `\n\nTracking Number: ${trackingNumber}\nYou can track your package using this number.`
    : '';

  const body = `
Hi ${customerName},

Great news! Your order #${orderId} has been shipped and is on its way to you.
${trackingInfo}

You should receive your order within 3-5 business days.

Thank you for shopping with SoleBlessing!

Best regards,
The SoleBlessing Team
  `.trim();

  return await sendEmail({
    to: customerEmail,
    subject: `Your Order #${orderId} Has Shipped! - SoleBlessing`,
    body,
  });
}

/**
 * Send delivery confirmation email
 */
export async function sendDeliveryConfirmationEmail(
  customerEmail: string,
  customerName: string,
  orderId: number
): Promise<boolean> {
  const body = `
Hi ${customerName},

Your order #${orderId} has been delivered!

We hope you love your new sneakers. If you have any questions or concerns about your order, please don't hesitate to contact us.

Thank you for shopping with SoleBlessing!

Best regards,
The SoleBlessing Team
  `.trim();

  return await sendEmail({
    to: customerEmail,
    subject: `Your Order #${orderId} Has Been Delivered! - SoleBlessing`,
    body,
  });
}

/**
 * Send restock alert email
 */
export async function sendRestockAlertEmail(
  customerEmail: string,
  customerName: string,
  productName: string,
  productId: number,
  size?: string
): Promise<boolean> {
  const sizeInfo = size ? ` in size ${size}` : '';
  
  const body = `
Hi ${customerName},

Good news! The product you've been waiting for is back in stock:

${productName}${sizeInfo}

Don't miss out - these items sell out fast!

View Product: https://soleblessing.com/product/${productId}

Happy shopping!

Best regards,
The SoleBlessing Team
  `.trim();

  return await sendEmail({
    to: customerEmail,
    subject: `${productName} is Back in Stock! - SoleBlessing`,
    body,
  });
}

/**
 * Send raffle winner notification email
 */
export async function sendRaffleWinnerEmail(
  customerEmail: string,
  customerName: string,
  raffleName: string,
  productName: string
): Promise<boolean> {
  const body = `
Hi ${customerName},

Congratulations! 🎉

You've won the raffle for: ${raffleName}

Product: ${productName}

We'll contact you shortly with instructions on how to claim your prize.

Thank you for participating!

Best regards,
The SoleBlessing Team
  `.trim();

  return await sendEmail({
    to: customerEmail,
    subject: `You Won! ${raffleName} - SoleBlessing`,
    body,
  });
}
