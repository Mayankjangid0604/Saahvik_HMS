/**
 * Public lead capture from the landing page's callback form. Unauthenticated —
 * the org does not exist yet at this point, so no token is attached and the
 * endpoint is rate-limited per IP on the backend.
 */
import type { ContactRequestInput, ContactRequestReceipt } from "./types";
import { apiClient } from "./client";

export async function submitContactRequest(
  input: ContactRequestInput,
): Promise<ContactRequestReceipt> {
  const { data } = await apiClient.post<ContactRequestReceipt>(
    "/public/contact-request",
    input,
  );
  return data;
}
