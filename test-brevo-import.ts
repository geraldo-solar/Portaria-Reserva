
import { createBrevoContact } from "./server/services/brevo";

console.log("Brevo service imported successfully");

try {
    // We won't actually call it, just want to see if the file loads
    console.log("Type of createBrevoContact:", typeof createBrevoContact);
} catch (e) {
    console.error("Error accessing export:", e);
}
