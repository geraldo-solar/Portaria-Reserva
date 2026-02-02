
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

            // If creation successful, add the "Passante Reserva" tag
            if (data.status === "success" && data.data?.id) {
                const subscriberId = data.data.id;
                try {
                    console.log("[ManyChat] Ensuring tag 'Passante Reserva' exists...");

                    // 1. Get all tags to find ID
                    const tagsResponse = await fetch("https://api.manychat.com/fb/page/getTags", {
                        method: "GET",
                        headers: {
                            "accept": "application/json",
                            "Authorization": `Bearer ${ENV.manychatApiToken}`,
                        }
                    });

                    let tagId: number | null = null;
                    if (tagsResponse.ok) {
                        const tagsData = await tagsResponse.json();
                        // ManyChat returns { status: "success", data: [ { id, name } ] }
                        if (tagsData.data && Array.isArray(tagsData.data)) {
                            const existingTag = tagsData.data.find((t: any) => t.name === "Passante Reserva");
                            if (existingTag) {
                                tagId = existingTag.id;
                            }
                        }
                    }

                    // 2. If tag doesn't exist, try to create it (fallback)
                    if (!tagId) {
                        console.log("[ManyChat] Tag not found, attempting to create 'Passante Reserva'...");
                        const createTagRes = await fetch("https://api.manychat.com/fb/page/createTag", {
                            method: "POST",
                            headers: {
                                "accept": "application/json",
                                "Authorization": `Bearer ${ENV.manychatApiToken}`,
                                "content-type": "application/json",
                            },
                            body: JSON.stringify({ name: "Passante Reserva" })
                        });
                        if (createTagRes.ok) {
                            const createData = await createTagRes.json();
                            if (createData.data?.id) {
                                tagId = createData.data.id;
                            }
                        } else {
                            const errText = await createTagRes.text();
                            console.error(`[ManyChat] Failed to create tag: ${errText}`);
                        }
                    }

                    // 3. Add tag by ID
                    if (tagId) {
                        console.log(`[ManyChat] Adding tag ID ${tagId} to subscriber ${subscriberId}...`);
                        await fetch("https://api.manychat.com/fb/subscriber/addTag", {
                            method: "POST",
                            headers: {
                                "accept": "application/json",
                                "Authorization": `Bearer ${ENV.manychatApiToken}`,
                                "content-type": "application/json",
                            },
                            body: JSON.stringify({
                                subscriber_id: subscriberId,
                                tag_id: tagId
                            }),
                        });
                    } else {
                        console.error("[ManyChat] Could not resolve Tag ID for 'Passante Reserva'");
                    }
                } catch (tagError: any) {
                    console.error("[ManyChat] Failed to process tag:", tagError.message);
                }
            }

            return data;
        }
    } catch (error: any) {
        console.error("[ManyChat] Sync failed:", error.message);
    }
}
