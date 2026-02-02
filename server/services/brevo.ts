
import * as Brevo from "@getbrevo/brevo";
import { ENV } from "../_core/env";

let apiInstance: Brevo.ContactsApi | null = null;

function getApiInstance() {
    if (!apiInstance) {
        if (!ENV.brevoApiKey) {
            console.warn("[Brevo] API Key not found. Brevo integration disabled.");
            return null;
        }
        const defaultClient = Brevo.ApiClient.instance;
        const apiKey = defaultClient.authentications["api-key"];
        apiKey.apiKey = ENV.brevoApiKey;
        apiInstance = new Brevo.ContactsApi();
    }
    return apiInstance;
}

export async function createBrevoContact(
    name: string,
    email: string,
    phone: string
) {
    const api = getApiInstance();
    if (!api) return;

    const createContact = new Brevo.CreateContact();

    // Brevo expects split name usually, but we have full name. 
    // We'll put it in LASTNAME for simplicity or try to split.
    // Let's use attributes for flexibility.
    const [firstName, ...rest] = name.split(" ");
    const lastName = rest.length > 0 ? rest.join(" ") : "";

    createContact.email = email;
    createContact.attributes = {
        NOME: name, // Custom attribute if you have one, or map to FIRSTNAME/LASTNAME
        FIRSTNAME: firstName,
        LASTNAME: lastName,
        SMS: phone, // Ensure phone is in E.164 format roughly
    };
    createContact.listIds = [2]; // Assuming list ID 2 for now, or make this configurable
    createContact.updateEnabled = true; // Update if exists

    try {
        const data = await api.createContact(createContact);
        console.log("[Brevo] Contact created/updated successfully:", data.body);
        return data.body;
    } catch (error: any) {
        console.error("[Brevo] Failed to create contact:", error.body || error.message);
        // Don't throw, just log. We don't want to break the ticket flow if marketing sync fails.
    }
}
