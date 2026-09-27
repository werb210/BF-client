// BF_CLIENT_BLOCK_v600 - browser passkey enrollment and sign-in.
import { Capacitor } from "@capacitor/core";
import { apiRequest } from "@/lib/api";
import { setToken } from "@/auth/token";

type PasskeyResult = {
  token: string;
  hasSubmittedApplication?: boolean;
  submittedApplicationId?: string;
};

export class PasskeyError extends Error {
  constructor(message: string, readonly code = "passkey_failed") {
    super(message);
    this.name = "PasskeyError";
  }
}

export function passkeysSupported(): boolean {
  return !Capacitor.isNativePlatform() && typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator?.credentials?.create === "function" &&
    typeof navigator?.credentials?.get === "function";
}

function decode(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  return bytes.buffer;
}

function encode(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createOptions(options: PublicKeyCredentialCreationOptions): PublicKeyCredentialCreationOptions {
  return {
    ...options,
    challenge: decode(options.challenge as unknown as string),
    user: { ...options.user, id: decode(options.user.id as unknown as string) },
    excludeCredentials: options.excludeCredentials?.map((item) => ({
      ...item,
      id: decode(item.id as unknown as string),
    })),
  };
}

function requestOptions(options: PublicKeyCredentialRequestOptions): PublicKeyCredentialRequestOptions {
  return {
    ...options,
    challenge: decode(options.challenge as unknown as string),
    allowCredentials: options.allowCredentials?.map((item) => ({
      ...item,
      id: decode(item.id as unknown as string),
    })),
  };
}

function explain(error: unknown, action: "create" | "sign in"): PasskeyError {
  if (error instanceof PasskeyError) return error;
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return new PasskeyError(
      action === "create" ? "Passkey setup was cancelled." : "Passkey sign-in was cancelled. Sign in with a text code instead.",
      "cancelled",
    );
  }
  return new PasskeyError(
    action === "create" ? "Your passkey could not be created. Try again." : "Passkey sign-in didn't work. Sign in with a text code instead.",
  );
}

export async function createPasskey(): Promise<void> {
  if (!passkeysSupported()) throw new PasskeyError("Passkeys are not available in this browser.", "unsupported");
  try {
    const options = await apiRequest<PublicKeyCredentialCreationOptions>("/api/client/passkeys/registration/options", { method: "POST" });
    const credential = await navigator.credentials.create({ publicKey: createOptions(options) }) as PublicKeyCredential | null;
    if (!credential) throw new PasskeyError("Passkey setup was cancelled.", "cancelled");
    const response = credential.response as AuthenticatorAttestationResponse;
    await apiRequest("/api/client/passkeys/registration/verify", {
      method: "POST",
      body: {
        id: credential.id,
        rawId: encode(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: encode(response.clientDataJSON),
          attestationObject: encode(response.attestationObject),
          transports: response.getTransports?.(),
        },
      },
    });
  } catch (error) {
    throw explain(error, "create");
  }
}

export async function signInWithPasskey(): Promise<PasskeyResult> {
  if (!passkeysSupported()) throw new PasskeyError("Passkeys are not available in this browser.", "unsupported");
  try {
    const options = await apiRequest<PublicKeyCredentialRequestOptions>("/api/client/passkeys/authentication/options", { method: "POST" });
    const credential = await navigator.credentials.get({ publicKey: requestOptions(options) }) as PublicKeyCredential | null;
    if (!credential) throw new PasskeyError("Passkey sign-in was cancelled. Sign in with a text code instead.", "cancelled");
    const response = credential.response as AuthenticatorAssertionResponse;
    const result = await apiRequest<PasskeyResult>("/api/client/passkeys/authentication/verify", {
      method: "POST",
      body: {
        id: credential.id,
        rawId: encode(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: encode(response.clientDataJSON),
          authenticatorData: encode(response.authenticatorData),
          signature: encode(response.signature),
          userHandle: response.userHandle ? encode(response.userHandle) : null,
        },
      },
    });
    if (!result?.token) throw new PasskeyError("Passkey sign-in didn't work. Sign in with a text code instead.");
    setToken(result.token);
    return result;
  } catch (error) {
    throw explain(error, "sign in");
  }
}
