
import { ENV } from "../_core/env";

export async function createManyChatSubscriber(
    name: string,
    email: string,
    phone?: string | null
) {
    if (!ENV.manychatApiToken) {
        console.warn("[ManyChat] API Token not found. Sync disabled.");
        return;
    }

    const [firstName, ...rest] = name.split(" ");
    const lastName = rest.length > 0 ? rest.join(" ") : "";

    // Prepare payload
    const payload: any = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        has_opt_in_sms: true,
        has_opt_in_email: true,
    };

    if (phone) {
        // Sanitize phone (Reuse same logic as Brevo for E.164)
        const hasPlus = phone.trim().startsWith("+");
        let cleanPhone = phone.replace(/\D/g, "");

        if (cleanPhone.length > 5) {
            if (hasPlus) {
                payload.phone = "+" + cleanPhone;
            } else {
                if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
                    cleanPhone = "55" + cleanPhone;
                }
                payload.phone = "+" + cleanPhone;
            }
        }
    }

    try {
        const response = await fetch("https://api.manychat.com/fb/subscriber/createSubscriber", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "Authorization": `Bearer ${ENV.manychatApiToken}`,
                "content-type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error(`[ManyChat] API Error (${response.status}): ${await response.text()}`);
        } else {
            const data = await response.json();

            // If creation successful, add the "Reserva" tag
            if (data.status === "success" && data.data?.id) {
                try {
                    console.log("[ManyChat] Adding tag 'Reserva'...");
                    await fetch("https://api.manychat.com/fb/subscriber/addTagByName", {
                        method: "POST",
                        headers: {
                            "accept": "application/json",
                            "Authorization": `Bearer ${ENV.manychatApiToken}`,
                            "content-type": "application/json",
                        },
                        body: JSON.stringify({
                            subscriber_id: data.data.id,
                            tag_name: "Reserva"
                        }),
                    });
                } catch (tagError) {
                    console.error("[ManyChat] Failed to add tag:", tagError);
                }
            }

            return data;
        }
    } catch (error: any) {
        console.error("[ManyChat] Sync failed:", error.message);
    }
}
