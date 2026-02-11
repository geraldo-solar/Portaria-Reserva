import "dotenv/config";
import { ENV } from "./server/_core/env";
console.log("Brevo API Key Present:", !!ENV.brevoApiKey);
console.log("Key length:", ENV.brevoApiKey.length);
