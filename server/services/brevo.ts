
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
        // Check if user explicitly provided a DDI (starts with +)
        const hasPlus = phone.trim().startsWith("+");
        let cleanPhone = phone.replace(/\D/g, "");

        if (cleanPhone.length > 5) {
            if (hasPlus) {
                // Trust the user's DDI
                payload.attributes.SMS = "+" + cleanPhone;
            } else {
                // No + provided. Heuristic for Brazil:
                // If 10 or 11 digits, assume it's a local number missing DDI (55)
                if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
                    cleanPhone = "55" + cleanPhone;
                }
                // Always prepend + for E.164
                payload.attributes.SMS = "+" + cleanPhone;
            }
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
            console.error(`[Brevo] API Error (${response.status})`);
        } else {
            // Success
            return await response.json();
        }
    } catch (error: any) {
        console.error("[Brevo] Sync failed:", error.message);
    }
}
