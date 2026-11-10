/** Version of the business contracts. Every exported record carries it. */
export const CONTRACT_VERSION = "1";
export type ContractVersion = typeof CONTRACT_VERSION;

export interface Versioned {
  readonly contractVersion: ContractVersion;
}
