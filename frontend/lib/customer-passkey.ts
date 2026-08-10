import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

export function passkeySupported(): boolean {
  return typeof window !== "undefined" && browserSupportsWebAuthn();
}

export async function registerPasskey(
  optionsJSON: PublicKeyCredentialCreationOptionsJSON,
): Promise<RegistrationResponseJSON> {
  return startRegistration({ optionsJSON });
}

export async function authenticatePasskey(
  optionsJSON: PublicKeyCredentialRequestOptionsJSON,
): Promise<AuthenticationResponseJSON> {
  return startAuthentication({ optionsJSON });
}

export function passkeyHintKey(tenantSlug: string | null | undefined): string {
  return `khayaos-passkey-hint:${tenantSlug || "default"}`;
}

export function passkeyOfferDismissKey(tenantSlug: string | null | undefined): string {
  return `khayaos-passkey-offer-dismiss:${tenantSlug || "default"}`;
}
