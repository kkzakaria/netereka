import { sendEmail } from "./email";
import {
  orderConfirmationEmail,
  orderStatusUpdateEmail,
  welcomeEmail,
  type OrderEmailData,
  type StatusUpdateEmailData,
  type WelcomeEmailData,
} from "./templates";

/**
 * Send order confirmation email to the customer.
 * Fire-and-forget: errors are logged, not thrown.
 */
export async function notifyOrderConfirmation(
  customerEmail: string,
  data: OrderEmailData
): Promise<void> {
  const { subject, html } = orderConfirmationEmail(data);
  const result = await sendEmail({ to: customerEmail, subject, html });
  if (!result.success) {
    console.error(
      `[notifications] Failed to send order confirmation for ${data.orderNumber}:`,
      result.error
    );
  }
}

/**
 * Send order status update email to the customer.
 * Fire-and-forget: errors are logged, not thrown.
 */
export async function notifyOrderStatusUpdate(
  customerEmail: string,
  data: StatusUpdateEmailData
): Promise<void> {
  const email = orderStatusUpdateEmail(data);
  if (!email) return; // No template for this status (e.g. "pending")

  const result = await sendEmail({
    to: customerEmail,
    subject: email.subject,
    html: email.html,
  });
  if (!result.success) {
    console.error(
      `[notifications] Failed to send status update for ${data.orderNumber}:`,
      result.error
    );
  }
}

/**
 * Send welcome email to a new customer.
 * Fire-and-forget: errors are logged, not thrown.
 */
export async function notifyWelcome(
  customerEmail: string,
  data: WelcomeEmailData
): Promise<void> {
  const { subject, html } = welcomeEmail(data);
  const result = await sendEmail({ to: customerEmail, subject, html });
  if (!result.success) {
    console.error(
      `[notifications] Failed to send welcome email to ${customerEmail}:`,
      result.error
    );
  }
}
