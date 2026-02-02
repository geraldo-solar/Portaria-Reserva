
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
        let subscriberId: string | number | null = null;

        // 1. Try to create the subscriber
        const response = await fetch("https://api.manychat.com/fb/subscriber/createSubscriber", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "Authorization": `Bearer ${ENV.manychatApiToken}`,
                "content-type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status === "success" && data.data?.id) {
                subscriberId = data.data.id;
            }
        } else {
            console.warn(`[ManyChat] Creation failed (likely exists), trying to find user... Status: ${response.status}`);

            // 2. If creation failed, try to find the subscriber by Email or Phone
            if (email) {
                const findRes = await fetch(`https://api.manychat.com/fb/subscriber/findByInfo?email=${encodeURIComponent(email)}`, {
                    method: "GET",
                    headers: {
                        "accept": "application/json",
                        "Authorization": `Bearer ${ENV.manychatApiToken}`,
                    }
                });
                if (findRes.ok) {
                    const findData = await findRes.json();
                    if (findData.status === "success" && findData.data?.id) {
                        subscriberId = findData.data.id;
                        console.log(`[ManyChat] Found existing subscriber by email: ${subscriberId}`);
                    }
                }
            }

            // If still not found and we have a phone, try phone
            if (!subscriberId && payload.phone) {
                const findRes = await fetch(`https://api.manychat.com/fb/subscriber/findByInfo?phone=${encodeURIComponent(payload.phone)}`, {
                    method: "GET",
                    headers: {
                        "accept": "application/json",
                        "Authorization": `Bearer ${ENV.manychatApiToken}`,
                    }
                });
                if (findRes.ok) {
                    const findData = await findRes.json();
                    if (findData.status === "success" && findData.data?.id) {
                        subscriberId = findData.data.id;
                        console.log(`[ManyChat] Found existing subscriber by phone: ${subscriberId}`);
                    }
                }
            }
        }

        // 3. Apply Tag if we have a Subscriber ID
        if (subscriberId) {
            try {
                // Get Tag ID logic (cached or fetched)
                // Note: Ideally caching this ID would be better, but for now fetching is safer
                console.log("[ManyChat] Ensuring tag 'Passante Reserva' exists...");

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
                    if (tagsData.data && Array.isArray(tagsData.data)) {
                        const existingTag = tagsData.data.find((t: any) => t.name.toLowerCase() === "passante reserva");
                        if (existingTag) {
                            tagId = existingTag.id;
                        }
                    }
                }

                if (!tagId) {
                    console.log("[ManyChat] Tag not found, creating 'Passante Reserva'...");
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
                    }
                }

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
        } else {
            console.error("[ManyChat] Could not create OR find subscriber. Data sync failed.");
        }

    } catch (error: any) {
        console.error("[ManyChat] Sync failed:", error.message);
    }
}
