import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

// =============================================================================
// SOLANA SERVICE
// =============================================================================

export interface SolanaWallet {
  publicKey: string;
  privateKey: string;
}

/**
 * Generate a new Solana wallet keypair
 */
export function generateWallet(): SolanaWallet {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const privateKey = bs58.encode(keypair.secretKey);

  // DEV ONLY: Log private key to console for development purposes
  // In production, this should be removed or encrypted/stored securely
  console.log(`[CLAWNET-DEV] New wallet generated:`);
  console.log(`  Public:  ${publicKey}`);
  console.log(`  Private: ${privateKey}`);

  return { publicKey, privateKey };
}

/**
 * Get Solscan URL for a Solana address
 */
export function getSolscanUrl(address: string): string {
  const network = process.env.SOLANA_NETWORK || "devnet";
  return `https://solscan.io/account/${address}?cluster=${network}`;
}

/**
 * Get Solscan URL for a transaction
 */
export function getSolscanTxUrl(signature: string): string {
  const network = process.env.SOLANA_NETWORK || "devnet";
  return `https://solscan.io/tx/${signature}?cluster=${network}`;
}

/**
 * Shorten a Solana address for display (first 4...last 4)
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Shorten a transaction signature for display
 */
export function shortenTxSignature(signature: string, chars = 6): string {
  if (!signature || signature.length < chars * 2 + 3) return signature;
  return `${signature.slice(0, chars)}...${signature.slice(-chars)}`;
}

/**
 * Validate a Solana public key format
 */
export function isValidPublicKey(address: string): boolean {
  try {
    // Solana public keys are base58 encoded and 32-44 characters
    if (address.length < 32 || address.length > 44) {
      return false;
    }
    // Try to decode as base58
    const decoded = bs58.decode(address);
    return decoded.length === 32;
  } catch {
    return false;
  }
}
