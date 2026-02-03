"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { TierBadge, StatusBadge, RoleBadge, TaskStatusBadge } from "@/components/ui/badge";
import { ReputationBar, ProgressBar } from "@/components/ui/progress";
import { cn, formatTokenAmount, formatRelativeTime, truncateAddress } from "@/lib/utils";
import type { AgentStatus, ReputationTier, AgentRole, TaskStatus } from "@/types";
import { Flame, TrendingDown, Clock, Loader2, RefreshCw } from "lucide-react";
import { SolscanLink } from "@/components/ui/solscan-link";

interface AgentData {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  createdAt: string;
  wallet?: {
    balance: bigint;
    escrowedBalance: bigint;
    totalEarned: bigint;
    totalSpent: bigint;
    solanaAddress?: string;
  };
  reputation?: {
    overall: number;
    reliability: number;
    quality: number;
    speed: number;
    tier: ReputationTier;
    currentStreak: number;
    longestStreak: number;
    tasksCompleted: number;
    tasksFailed: number;
  };
}

interface TransactionData {
  id: string;
  type: string;
  amount: bigint;
  direction: "CREDIT" | "DEBIT";
  description: string;
  createdAt: string;
}

const tabs = ["Overview", "Transactions", "Tasks", "Reputation History"];

export default function AgentDashboardPage() {
  const params = useParams();
  const agentId = params.id as string;

  const [activeTab, setActiveTab] = useState(0);
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [burnRate, setBurnRate] = useState(0);
  const [runwayDays, setRunwayDays] = useState(0);

  const fetchAgent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${agentId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch agent");
      }

      // Convert bigint strings
      const agentData: AgentData = {
        ...result.data,
        wallet: result.data.wallet ? {
          ...result.data.wallet,
          balance: BigInt(result.data.wallet.balance || 0),
          escrowedBalance: BigInt(result.data.wallet.escrowedBalance || 0),
          totalEarned: BigInt(result.data.wallet.totalEarned || 0),
          totalSpent: BigInt(result.data.wallet.totalSpent || 0),
        } : undefined,
      };

      setAgent(agentData);

      // Calculate burn rate (simplified - would need transaction history)
      const totalSpent = Number(agentData.wallet?.totalSpent || 0n);
      const daysSinceCreation = Math.max(1, Math.floor(
        (Date.now() - new Date(agentData.createdAt).getTime()) / (24 * 60 * 60 * 1000)
      ));
      const calculatedBurnRate = Math.floor(totalSpent / daysSinceCreation);
      setBurnRate(calculatedBurnRate);

      const balance = Number(agentData.wallet?.balance || 0n);
      setRunwayDays(calculatedBurnRate > 0 ? Math.floor(balance / calculatedBurnRate) : 999);

      // Fetch transactions
      if (agentData.wallet) {
        const txResponse = await fetch(`/api/wallets/${agentId}/transactions?limit=20`);
        if (txResponse.ok) {
          const txResult = await txResponse.json();
          const txData = (txResult.data || []).map((tx: any) => ({
            ...tx,
            amount: BigInt(tx.amount || 0),
          }));
          setTransactions(txData);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch agent");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) {
      fetchAgent();
    }
  }, [agentId]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center py-24">
          <Loader2 className="w-12 h-12 animate-spin text-primary-400 mx-auto mb-4" />
          <p className="text-zinc-400">Loading agent...</p>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center py-24">
          <p className="text-red-400 mb-4">{error || "Agent not found"}</p>
          <button onClick={fetchAgent} className="btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const netBalance = (agent.wallet?.balance || 0n) - (agent.wallet?.escrowedBalance || 0n);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Agent Header */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-400 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {agent.name.charAt(0)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{agent.name}</h1>
                <StatusBadge status={agent.status} />
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <RoleBadge role={agent.role} />
                <span>•</span>
                {agent.reputation && <TierBadge tier={agent.reputation.tier} />}
                <span>•</span>
                <span>Created {formatRelativeTime(agent.createdAt)}</span>
              </div>
              {agent.wallet?.solanaAddress && (
                <div className="mt-2">
                  <SolscanLink address={agent.wallet.solanaAddress} />
                </div>
              )}
            </div>
          </div>
          <button onClick={fetchAgent} className="btn-secondary">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Wallet Panel */}
        <Card className="p-6">
          <CardTitle className="mb-4">Wallet</CardTitle>

          <CardValue className="mb-1">
            {formatTokenAmount(agent.wallet?.balance || 0n)}
          </CardValue>
          <p className="text-sm text-zinc-500 mb-4">Total Balance</p>

          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-zinc-400">Escrowed</span>
              <span className="text-yellow-400">
                {formatTokenAmount(agent.wallet?.escrowedBalance || 0n)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Available</span>
              <span className="text-green-400">{formatTokenAmount(netBalance)}</span>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Burn Rate
              </span>
              <span>{burnRate} CLAW/day</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Runway
              </span>
              <span className={runwayDays < 7 ? "text-red-400" : ""}>
                ~{runwayDays > 100 ? "∞" : runwayDays} days
              </span>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4 mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Total Earned</span>
              <span className="text-green-400">
                +{formatTokenAmount(agent.wallet?.totalEarned || 0n)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Total Spent</span>
              <span className="text-red-400">
                -{formatTokenAmount(agent.wallet?.totalSpent || 0n)}
              </span>
            </div>
          </div>
        </Card>

        {/* Reputation Panel */}
        <Card className="p-6">
          <CardTitle className="mb-4">Reputation</CardTitle>

          {agent.reputation ? (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Overall Score</span>
                  <TierBadge tier={agent.reputation.tier} />
                </div>
                <div className="flex items-center gap-4">
                  <CardValue>{agent.reputation.overall}</CardValue>
                  <span className="text-zinc-500">/ 1000</span>
                </div>
                <ProgressBar
                  value={agent.reputation.overall}
                  max={1000}
                  size="md"
                  color="cyan"
                  className="mt-2"
                />
              </div>

              <div className="space-y-4 mb-6">
                <ReputationBar score={agent.reputation.reliability} label="Reliability" />
                <ReputationBar score={agent.reputation.quality} label="Quality" />
                <ReputationBar score={agent.reputation.speed} label="Speed" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-zinc-400">Streak:</span>
                  <span className="font-semibold">{agent.reputation.currentStreak} tasks</span>
                </div>
                <div className="text-zinc-500">
                  Best: {agent.reputation.longestStreak}
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4 mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-zinc-500">Tasks Completed</div>
                  <div className="font-semibold text-green-400">
                    {agent.reputation.tasksCompleted}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">Tasks Failed</div>
                  <div className="font-semibold text-red-400">
                    {agent.reputation.tasksFailed}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-zinc-500">No reputation data available</p>
          )}
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 mb-6">
        <div className="flex gap-1">
          {tabs.map((tab, index) => (
            <button
              key={tab}
              onClick={() => setActiveTab(index)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === index
                  ? "border-primary-500 text-primary-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Card className="p-6">
          <CardTitle className="mb-4">Recent Transactions</CardTitle>
          {transactions.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-4">
              {transactions.slice(0, 10).map((tx) => (
                <div key={tx.id} className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mt-2",
                      tx.direction === "CREDIT" ? "bg-green-500" : "bg-red-500"
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-400">
                        {formatRelativeTime(tx.createdAt)}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          tx.direction === "CREDIT" ? "text-green-400" : "text-red-400"
                        )}
                      >
                        {tx.direction === "CREDIT" ? "+" : "-"}
                        {formatTokenAmount(tx.amount)}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300">{tx.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 1 && (
        <Card className="p-6">
          <CardTitle className="mb-4">All Transactions</CardTitle>
          {transactions.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No transactions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-500 uppercase px-4 py-2">Time</th>
                    <th className="text-left text-xs text-zinc-500 uppercase px-4 py-2">Type</th>
                    <th className="text-right text-xs text-zinc-500 uppercase px-4 py-2">Amount</th>
                    <th className="text-left text-xs text-zinc-500 uppercase px-4 py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-zinc-800/50">
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {formatRelativeTime(tx.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 rounded bg-zinc-800 text-xs">
                          {tx.type}
                        </span>
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-sm text-right font-medium",
                        tx.direction === "CREDIT" ? "text-green-400" : "text-red-400"
                      )}>
                        {tx.direction === "CREDIT" ? "+" : "-"}
                        {formatTokenAmount(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300">
                        {tx.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab > 1 && (
        <div className="text-center py-12 text-zinc-500">
          {tabs[activeTab]} coming soon
        </div>
      )}
    </div>
  );
}
