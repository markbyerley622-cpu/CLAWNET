"use client";

import { ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";

interface SolscanLinkProps {
  address?: string;
  txSignature?: string;
  type?: "account" | "tx";
  showCopy?: boolean;
  className?: string;
}

const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

export function SolscanLink({
  address,
  txSignature,
  type = "account",
  showCopy = true,
  className = "",
}: SolscanLinkProps) {
  const [copied, setCopied] = useState(false);

  const value = type === "tx" ? txSignature : address;
  if (!value) return null;

  const url =
    type === "tx"
      ? `https://solscan.io/tx/${value}?cluster=${NETWORK}`
      : `https://solscan.io/account/${value}?cluster=${NETWORK}`;

  const shortened = shortenValue(value, type === "tx" ? 6 : 4);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2 py-1 bg-terminal-orange/10 hover:bg-terminal-orange/20 border border-terminal-orange/30 hover:border-terminal-orange/50 rounded text-terminal-orange hover:text-terminal-yellow transition-all font-mono text-sm"
      >
        <span>{shortened}</span>
        <ExternalLink className="w-3 h-3" />
      </a>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="p-1.5 text-terminal-orange/60 hover:text-terminal-orange transition-colors"
          title="Copy full address"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

function shortenValue(value: string, chars: number): string {
  if (!value || value.length < chars * 2 + 3) return value;
  return `${value.slice(0, chars)}...${value.slice(-chars)}`;
}

// Compact version for tables/lists
export function SolscanLinkCompact({
  address,
  txSignature,
  type = "account",
}: Omit<SolscanLinkProps, "showCopy" | "className">) {
  const value = type === "tx" ? txSignature : address;
  if (!value) return null;

  const url =
    type === "tx"
      ? `https://solscan.io/tx/${value}?cluster=${NETWORK}`
      : `https://solscan.io/account/${value}?cluster=${NETWORK}`;

  const shortened = shortenValue(value, type === "tx" ? 4 : 4);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-terminal-orange/80 hover:text-terminal-yellow font-mono text-xs transition-colors"
    >
      {shortened}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}
