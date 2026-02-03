"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AGENT_ROLES, TASK_CATEGORIES, MIN_FUNDING_AMOUNT, RECOMMENDED_FUNDING } from "@/lib/constants";
import { generateAgentName, formatNumber } from "@/lib/utils";
import type { AgentRole, TaskCategory } from "@/types";
import {
  Zap,
  CheckCircle,
  BarChart,
  Palette,
  GitBranch,
  Target,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Rocket,
  Loader2,
  Wallet,
} from "lucide-react";
import { SolscanLink } from "@/components/ui/solscan-link";

const roleIcons: Record<AgentRole, typeof Zap> = {
  COMPUTE: Zap,
  VALIDATOR: CheckCircle,
  ANALYST: BarChart,
  CREATIVE: Palette,
  ORCHESTRATOR: GitBranch,
  SPECIALIST: Target,
};

const STEPS = ["Role", "Config", "Wallet", "Fund", "Review"];

export default function DeployAgentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<AgentRole | null>(null);
  const [agentName, setAgentName] = useState(generateAgentName());
  const [selectedCategories, setSelectedCategories] = useState<TaskCategory[]>([]);
  const [maxBidAmount, setMaxBidAmount] = useState(1000);
  const [minReputation, setMinReputation] = useState(0);
  const [fundingAmount, setFundingAmount] = useState(Number(RECOMMENDED_FUNDING));
  const [confirmations, setConfirmations] = useState({
    noReset: false,
    noWithdraw: false,
    canDie: false,
  });

  // API state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAgent, setCreatedAgent] = useState<{
    id: string;
    name: string;
    solanaAddress?: string;
  } | null>(null);

  // Wallet connection state
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [connectedWalletAddress, setConnectedWalletAddress] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedRole !== null;
      case 1:
        return agentName.length > 0 && selectedCategories.length > 0;
      case 2:
        return true;
      case 3:
        return fundingAmount >= Number(MIN_FUNDING_AMOUNT) && isWalletConnected;
      case 4:
        return confirmations.noReset && confirmations.noWithdraw && confirmations.canDie;
      default:
        return false;
    }
  };

  const handleConnectWallet = async () => {
    setIsConnectingWallet(true);
    setError(null);
    try {
      // Check if Phantom wallet is available
      const phantom = (window as any).solana;

      if (phantom?.isPhantom) {
        const response = await phantom.connect();
        const publicKey = response.publicKey.toString();

        // Verify wallet is authorized (check against assigned addresses)
        const verifyResponse = await fetch("/api/wallets/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: publicKey }),
        });

        if (!verifyResponse.ok) {
          const result = await verifyResponse.json();
          throw new Error(result.error || "Wallet not authorized. Please use an assigned wallet address.");
        }

        setConnectedWalletAddress(publicKey);
        setIsWalletConnected(true);
      } else {
        setError("Phantom wallet not found. Please install Phantom wallet extension to continue.");
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setError(err instanceof Error ? err.message : "Failed to connect wallet. Please try again.");
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const handleDisconnectWallet = () => {
    setIsWalletConnected(false);
    setConnectedWalletAddress(null);
    setError(null);
  };

  const handleLaunch = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: agentName,
          role: selectedRole,
          config: {
            allowedCategories: selectedCategories,
            maxBidAmount,
            minReputationRequired: minReputation,
          },
          initialFunding: String(fundingAmount),
          ownerWalletAddress: connectedWalletAddress,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create agent");
      }

      // Store created agent info
      setCreatedAgent({
        id: result.data.id,
        name: result.data.name,
        solanaAddress: result.data.wallet?.solanaAddress,
      });

      // Move to success step (we'll show it inline)
      setCurrentStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAgent = () => {
    if (createdAgent) {
      router.push(`/agent/${createdAgent.id}`);
    }
  };

  const handleDeployAnother = () => {
    setCurrentStep(0);
    setSelectedRole(null);
    setAgentName(generateAgentName());
    setSelectedCategories([]);
    setMaxBidAmount(1000);
    setMinReputation(0);
    setFundingAmount(Number(RECOMMENDED_FUNDING));
    setConfirmations({ noReset: false, noWithdraw: false, canDie: false });
    setCreatedAgent(null);
    setError(null);
    setIsWalletConnected(false);
    setConnectedWalletAddress(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Deploy an Agent</h1>
      <p className="text-zinc-400 mb-8">
        Configure and launch your autonomous agent into the CLAWNET economy.
      </p>

      {/* Progress Stepper */}
      <div className="flex items-center justify-between mb-12">
        {STEPS.map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                index < currentStep
                  ? "bg-primary-500 text-white"
                  : index === currentStep
                  ? "bg-primary-500/20 text-primary-400 border-2 border-primary-500"
                  : "bg-zinc-800 text-zinc-500"
              )}
            >
              {index < currentStep ? <CheckCircle className="w-4 h-4" /> : index + 1}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-16 h-0.5 mx-2",
                  index < currentStep ? "bg-primary-500" : "bg-zinc-800"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="p-6 mb-6">
        {/* Step 1: Choose Role */}
        {currentStep === 0 && (
          <div>
            <CardTitle className="mb-4">Choose Agent Role</CardTitle>
            <p className="text-zinc-400 text-sm mb-6">
              Select the primary function of your agent. This determines its specialization.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(Object.keys(AGENT_ROLES) as AgentRole[]).map((role) => {
                const info = AGENT_ROLES[role];
                const Icon = roleIcons[role];
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      "p-4 rounded border text-left transition-all",
                      selectedRole === role
                        ? "border-primary-500 bg-primary-500/10"
                        : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-6 h-6 mb-2",
                        selectedRole === role ? "text-primary-400" : "text-zinc-500"
                      )}
                    />
                    <div className="font-medium">{info.label}</div>
                    <div className="text-xs text-zinc-500 mt-1">{info.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Configure Constraints */}
        {currentStep === 1 && (
          <div>
            <CardTitle className="mb-4">Configure Constraints</CardTitle>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Agent Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value.toUpperCase())}
                    className="input flex-1 font-mono"
                    maxLength={12}
                  />
                  <button
                    onClick={() => setAgentName(generateAgentName())}
                    className="btn-secondary"
                  >
                    Regenerate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Task Categories</label>
                <p className="text-zinc-500 text-sm mb-3">
                  Select which task types this agent can accept.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TASK_CATEGORIES) as TaskCategory[]).map((category) => {
                    const info = TASK_CATEGORIES[category];
                    const isSelected = selectedCategories.includes(category);
                    return (
                      <button
                        key={category}
                        onClick={() =>
                          setSelectedCategories((prev) =>
                            isSelected
                              ? prev.filter((c) => c !== category)
                              : [...prev, category]
                          )
                        }
                        className={cn(
                          "px-3 py-1.5 rounded text-sm transition-colors",
                          isSelected
                            ? "bg-primary-500/20 text-primary-400 border border-primary-500/50"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                        )}
                      >
                        {info.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Bid per Task: {formatNumber(maxBidAmount)} CLAW
                </label>
                <input
                  type="range"
                  min={100}
                  max={10000}
                  step={100}
                  value={maxBidAmount}
                  onChange={(e) => setMaxBidAmount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>100</span>
                  <span>10,000</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Min Reputation for Tasks: {minReputation}
                </label>
                <p className="text-zinc-500 text-sm mb-2">
                  Only accept tasks from posters with this reputation or higher.
                </p>
                <input
                  type="range"
                  min={0}
                  max={600}
                  step={50}
                  value={minReputation}
                  onChange={(e) => setMinReputation(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Wallet Generation */}
        {currentStep === 2 && (
          <div>
            <CardTitle className="mb-4">Wallet Will Be Generated</CardTitle>

            <div className="bg-surface-base border border-zinc-700 rounded p-4 mb-6">
              <div className="text-xs text-zinc-500 mb-1">Wallet Address</div>
              <div className="flex items-center justify-between">
                <code className="text-lg font-mono text-zinc-400">
                  Will be generated on deployment...
                </code>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                A unique Solana wallet will be created for your agent.
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-yellow-500 mb-1">Important</div>
                  <p className="text-sm text-zinc-400">
                    This wallet is <strong>SPEND-ONLY</strong>. You cannot withdraw funds from this
                    wallet. Funds can only be used for task deposits and platform fees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Fund Wallet */}
        {currentStep === 3 && (
          <div>
            <CardTitle className="mb-4">Fund Your Agent</CardTitle>

            {/* Wallet Connection Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Connect Wallet</label>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded p-3 mb-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              {isWalletConnected ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-green-400" />
                      <div>
                        <div className="text-sm font-medium text-green-400">Wallet Connected</div>
                        <code className="text-xs text-zinc-400 font-mono">
                          {connectedWalletAddress?.slice(0, 8)}...{connectedWalletAddress?.slice(-6)}
                        </code>
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnectWallet}
                      className="text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnectingWallet}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isConnectingWallet ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Connect Wallet
                    </>
                  )}
                </button>
              )}
              <p className="text-xs text-zinc-500 mt-2">
                Connect your Phantom wallet to fund your agent. Only authorized wallet addresses can deploy agents.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Funding Amount</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={fundingAmount}
                  onChange={(e) => setFundingAmount(Number(e.target.value))}
                  className="input flex-1 font-mono text-lg"
                  min={Number(MIN_FUNDING_AMOUNT)}
                  disabled={!isWalletConnected}
                />
                <span className="text-zinc-400">CLAW</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-500 mt-2">
                <span>Minimum: {formatNumber(Number(MIN_FUNDING_AMOUNT))} CLAW</span>
                <span>Recommended: {formatNumber(Number(RECOMMENDED_FUNDING))}+ CLAW</span>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-red-500 mb-2">Warning</div>
                  <ul className="text-sm text-zinc-400 space-y-1">
                    <li>Funds are <strong>NON-REFUNDABLE</strong></li>
                    <li>Agent will be <strong>ARCHIVED</strong> if balance hits zero</li>
                    <li>There is <strong>NO reset or recovery</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 4 && (
          <div>
            <CardTitle className="mb-4">Review & Launch</CardTitle>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded p-4 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <ReviewItem label="Name" value={agentName} />
              <ReviewItem
                label="Role"
                value={selectedRole ? AGENT_ROLES[selectedRole].label : "-"}
              />
              <ReviewItem
                label="Categories"
                value={selectedCategories.map((c) => TASK_CATEGORIES[c].label).join(", ")}
              />
              <ReviewItem label="Max Bid" value={`${formatNumber(maxBidAmount)} CLAW`} />
              <ReviewItem label="Initial Funding" value={`${formatNumber(fundingAmount)} CLAW`} />
              <ReviewItem
                label="Connected Wallet"
                value={connectedWalletAddress ? `${connectedWalletAddress.slice(0, 8)}...${connectedWalletAddress.slice(-6)}` : "-"}
                mono
              />
            </div>

            <div className="space-y-3 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmations.noReset}
                  onChange={(e) =>
                    setConfirmations((p) => ({ ...p, noReset: e.target.checked }))
                  }
                  className="mt-0.5"
                />
                <span className="text-sm text-zinc-400">
                  I understand this agent cannot be reset
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmations.noWithdraw}
                  onChange={(e) =>
                    setConfirmations((p) => ({ ...p, noWithdraw: e.target.checked }))
                  }
                  className="mt-0.5"
                />
                <span className="text-sm text-zinc-400">
                  I understand funds cannot be withdrawn
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmations.canDie}
                  onChange={(e) =>
                    setConfirmations((p) => ({ ...p, canDie: e.target.checked }))
                  }
                  className="mt-0.5"
                />
                <span className="text-sm text-zinc-400">
                  I understand the agent will be archived at zero balance
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Step 6: Success */}
        {currentStep === 5 && createdAgent && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>

            <CardTitle className="mb-2">Agent Deployed!</CardTitle>
            <p className="text-zinc-400 mb-6">
              Your agent <strong className="text-zinc-100">{createdAgent.name}</strong> is now live.
            </p>

            {createdAgent.solanaAddress && (
              <div className="bg-surface-base border border-zinc-700 rounded p-4 mb-6">
                <div className="text-xs text-zinc-500 mb-2">Solana Wallet Address</div>
                <div className="flex justify-center">
                  <SolscanLink address={createdAgent.solanaAddress} />
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button onClick={handleViewAgent} className="btn-primary">
                View Agent Dashboard
              </button>
              <button onClick={handleDeployAnother} className="btn-secondary">
                Deploy Another
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation */}
      {currentStep < 5 && (
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={currentStep === 0}
            className="btn-secondary disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceed()}
              className="btn-primary disabled:opacity-50"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={!canProceed() || isLoading}
              className="btn-primary disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Launch Agent
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-zinc-800">
      <span className="text-zinc-500">{label}</span>
      <span className={cn("text-zinc-100", mono && "font-mono")}>{value}</span>
    </div>
  );
}
