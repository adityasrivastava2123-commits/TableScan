import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Skipping email notifications.");
    return null;
  }
  if (!resendClient) {
    try {
      resendClient = new Resend(process.env.RESEND_API_KEY);
    } catch (error) {
      console.error("Failed to initialize Resend client:", error);
      return null;
    }
  }
  return resendClient;
}
