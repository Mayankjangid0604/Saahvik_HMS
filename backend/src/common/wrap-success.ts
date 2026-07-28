export const API_VERSION = "v1";

export interface SuccessEnvelope<T> {
  success: true;
  apiVersion: string;
  data: T;
}

/** The one and only success envelope. Exactly 2 arguments — do not add a third. */
export function wrapSuccess<T>(data: T, apiVersion: string): SuccessEnvelope<T> {
  return { success: true, apiVersion, data };
}
