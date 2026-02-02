
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
        listIds: [2],
        updateEnabled: true,
    };

    if (phone) {
        payload.attributes.SMS = phone;
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
