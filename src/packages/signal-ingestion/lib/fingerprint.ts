import { createHash } from "node:crypto";

function toJsonbString(value: string | null): string {
  if (value === null) {
    return "null";
  }
  return JSON.stringify(value);
}

export function governmentContractFingerprintInput(input: {
  normalizedUrl: string;
  contentHash: string;
  observedDate: string;
  externalReference: string | null;
  signalDiscriminator: string;
}): string {
  const sourceIdentity = `${input.normalizedUrl}|${input.contentHash}`;
  return [
    `{"externalReference":${toJsonbString(input.externalReference)}`,
    `"observedDate":${toJsonbString(input.observedDate)}`,
    `"signalDiscriminator":${toJsonbString(input.signalDiscriminator)}`,
    `"signalType":"government_contract_awarded"`,
    `"sourceIdentity":${toJsonbString(sourceIdentity)}}`,
  ].join(",");
}

export function computeSignalFingerprint(canonicalInput: string): string {
  return createHash("sha256").update(canonicalInput, "utf8").digest("hex");
}

export const SIGNAL_FINGERPRINT_VERSION = 1;

export function signalDiscriminatorFor(input: {
  companyId: string;
  externalReference: string | null;
}): string {
  if (input.externalReference !== null) {
    return input.externalReference;
  }
  return input.companyId;
}
