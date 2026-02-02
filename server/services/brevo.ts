
import { ENV } from "../_core/env";

export async function createBrevoContact(
    name: string,
    email: string,
    phone?: string | null
) {
    if (!ENV.brevoApiKey) {
        console.warn("[Brevo] API Key not found. Sync disabled.");
        return;
    }

    const [firstName, ...rest] = name.split(" ");
    const lastName = rest.length > 0 ? rest.join(" ") : "";

    const payload: any = {
        email,
        attributes: {
            NOME: name,
            FIRSTNAME: firstName,
            LASTNAME: lastName,
        },
        listIds: [13],
        updateEnabled: true,
    };

    if (phone) {
        // Sanitize phone: remove all non-numeric characters
        let cleanPhone = phone.replace(/\D/g, "");

        // Ensure it has at least area code (2 digits) + number (8-9 digits) -> 10-11 digits
        if (cleanPhone.length >= 10) {
            // Assume Brazil if no country code (length 10 or 11)
            if (cleanPhone.length <= 11) {
                cleanPhone = "55" + cleanPhone;
            }
            // Add plus sign prefix required by E.164
            payload.attributes.SMS = "+" + cleanPhone;
        }
    }

    try {
        const response = await fetch("https://api.brevo.com/v3/contacts", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": ENV.brevoApiKey,
                "content-type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Brevo] API Error (${response.status}):`, errorText);
        } else {
            const data = await response.json();
            console.log("[Brevo] Contact synced successfully:", data);
            return data;
        }
    } catch (error: any) {
        console.error("[Brevo] Request failed:", error.message);
    }
}
