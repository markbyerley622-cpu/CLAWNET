"use client";

import { useState } from "react";
import { useAdmin } from "./admin-provider";
import {
  X,
  Play,
  Pause,
  RefreshCw,
  Upload,
  Zap,
  Users,
  FileText,
  Settings,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Key,
  Copy,
  Check,
} from "lucide-react";

interface WalletData {
  agentName: string;
  role: string;
  solanaAddress: string;
  privateKey: string;
}

export function DevOverlay() {
  const { isOverlayOpen, closeOverlay, adminKey, setAdminKey, isAuthenticated } = useAdmin();
  const [inputKey, setInputKey] = useState("");
  const [activeTab, setActiveTab] = useState<"inject" | "upload" | "simulation" | "reset">("inject");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploadData, setUploadData] = useState("");
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOverlayOpen) return null;

  const handleAuth = () => {
    setAdminKey(inputKey);
    setInputKey("");
  };

  const handleLogout = () => {
    setAdminKey(null);
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const apiCall = async (url: string, options?: RequestInit) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey || "",
          ...options?.headers,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Request failed");
      }

      showMessage("success", result.message || "Success!");
      return result;
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Inject actions
  const injectSyntheticAgent = () => apiCall("/api/admin/inject", {
    method: "POST",
    body: JSON.stringify({ type: "agent", count: 1 }),
  });

  const injectSyntheticTask = () => apiCall("/api/admin/inject", {
    method: "POST",
    body: JSON.stringify({ type: "task", count: 3 }),
  });

  const injectActivityEvents = () => apiCall("/api/admin/inject", {
    method: "POST",
    body: JSON.stringify({ type: "activity", count: 5 }),
  });

  // Simulation actions
  const triggerTick = () => apiCall("/api/simulation/tick", { method: "POST" });

  const pauseSimulation = () => apiCall("/api/simulation/status", {
    method: "PATCH",
    body: JSON.stringify({ action: "pause" }),
  });

  const resumeSimulation = () => apiCall("/api/simulation/status", {
    method: "PATCH",
    body: JSON.stringify({ action: "resume" }),
  });

  const resetSimulation = () => apiCall("/api/simulation/status", {
    method: "PATCH",
    body: JSON.stringify({ action: "reset" }),
  });

  // Upload action
  const handleUpload = async () => {
    if (!uploadData.trim()) {
      showMessage("error", "Please enter JSON data");
      return;
    }

    try {
      const parsed = JSON.parse(uploadData);
      await apiCall("/api/admin/upload", {
        method: "POST",
        body: JSON.stringify(parsed),
      });
      setUploadData("");
    } catch {
      showMessage("error", "Invalid JSON format");
    }
  };

  // Force refresh
  const forceRefresh = () => apiCall("/api/admin/refresh", { method: "POST" });

  // Reset all data (keeps wallet backup)
  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset ALL agents and data? Wallet keys will be backed up and shown.")) {
      return;
    }

    const result = await apiCall("/api/admin/reset", {
      method: "POST",
      body: JSON.stringify({ keepWallets: true }),
    });

    if (result?.data?.wallets) {
      setWallets(result.data.wallets);
    }
  };

  // Fetch current wallets from database
  const fetchWallets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/wallets", {
        headers: {
          "x-admin-key": adminKey || "",
        },
      });
      const result = await response.json();
      if (result.data) {
        setWallets(result.data);
      }
    } catch {
      showMessage("error", "Failed to fetch wallets");
    } finally {
      setIsLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-400" />
            <h2 className="font-semibold">Dev Controls</h2>
            <span className="text-xs text-zinc-500">(CTRL+D to toggle)</span>
          </div>
          <button
            onClick={closeOverlay}
            className="text-zinc-400 hover:text-zinc-100 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
          {/* Auth Section */}
          {!isAuthenticated ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-4">Enter Admin Key</h3>
              <div className="flex gap-2 max-w-md mx-auto">
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="Admin key..."
                  className="input flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                />
                <button onClick={handleAuth} className="btn-primary">
                  Authenticate
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-4">
                Key is stored locally. Set ADMIN_DEV_KEY in .env
              </p>
            </div>
          ) : (
            <>
              {/* Status Message */}
              {message && (
                <div className={`flex items-center gap-2 p-3 rounded mb-4 ${
                  message.type === "success"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {message.type === "success" ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {message.text}
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { id: "inject", label: "Inject", icon: Zap },
                  { id: "upload", label: "Upload", icon: Upload },
                  { id: "simulation", label: "Simulation", icon: RefreshCw },
                  { id: "reset", label: "Reset & Keys", icon: Key },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                      activeTab === id
                        ? "bg-primary-500/20 text-primary-400"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "inject" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase">
                    Inject Synthetic Activity
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <ActionButton
                      icon={Users}
                      label="Spawn Agent"
                      description="Create 1 synthetic agent"
                      onClick={injectSyntheticAgent}
                      loading={isLoading}
                    />
                    <ActionButton
                      icon={FileText}
                      label="Generate Tasks"
                      description="Create 3 random tasks"
                      onClick={injectSyntheticTask}
                      loading={isLoading}
                    />
                    <ActionButton
                      icon={Zap}
                      label="Add Activity Events"
                      description="Create 5 activity events"
                      onClick={injectActivityEvents}
                      loading={isLoading}
                    />
                    <ActionButton
                      icon={RefreshCw}
                      label="Force Refresh"
                      description="Broadcast refresh signal"
                      onClick={forceRefresh}
                      loading={isLoading}
                    />
                  </div>
                </div>
              )}

              {activeTab === "upload" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase">
                    Upload JSON Data
                  </h3>
                  <textarea
                    value={uploadData}
                    onChange={(e) => setUploadData(e.target.value)}
                    placeholder={'{\n  "type": "agents",\n  "data": [...]\n}'}
                    className="input w-full h-48 font-mono text-sm"
                  />
                  <button
                    onClick={handleUpload}
                    disabled={isLoading}
                    className="btn-primary w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Upload
                  </button>
                  <p className="text-xs text-zinc-500">
                    Supported types: agents, tasks, activity
                  </p>
                </div>
              )}

              {activeTab === "simulation" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase">
                    Simulation Controls
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <ActionButton
                      icon={Play}
                      label="Manual Tick"
                      description="Execute one simulation tick"
                      onClick={triggerTick}
                      loading={isLoading}
                    />
                    <ActionButton
                      icon={Pause}
                      label="Pause"
                      description="Pause simulation"
                      onClick={pauseSimulation}
                      loading={isLoading}
                    />
                    <ActionButton
                      icon={Play}
                      label="Resume"
                      description="Resume simulation"
                      onClick={resumeSimulation}
                      loading={isLoading}
                    />
                    <ActionButton
                      icon={RefreshCw}
                      label="Reset State"
                      description="Reset simulation state"
                      onClick={resetSimulation}
                      loading={isLoading}
                    />
                  </div>

                  {/* Reset All Agents */}
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-red-400 mb-1">Reset All Agents</div>
                        <p className="text-xs text-zinc-400 mb-3">
                          Delete ALL agents, wallets, and tasks. Start fresh.
                        </p>
                        <button
                          onClick={handleReset}
                          disabled={isLoading}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded text-red-400 text-sm font-medium disabled:opacity-50"
                        >
                          {isLoading ? "Resetting..." : "DELETE ALL AGENTS"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "reset" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase">
                    Reset & Wallet Keys
                  </h3>

                  {/* Reset Button */}
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-4">
                    <div className="flex items-start gap-3">
                      <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-red-400 mb-1">Reset All Data</div>
                        <p className="text-xs text-zinc-400 mb-3">
                          This will delete ALL agents, tasks, and activity. Wallet keys will be backed up and displayed below.
                        </p>
                        <button
                          onClick={handleReset}
                          disabled={isLoading}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded text-red-400 text-sm font-medium disabled:opacity-50"
                        >
                          {isLoading ? "Resetting..." : "Reset Everything"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Refresh Wallets Button */}
                  <button
                    onClick={fetchWallets}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded text-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh Wallet List
                  </button>

                  {/* Wallet Keys */}
                  {wallets.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-zinc-500 uppercase">
                        Wallet Private Keys ({wallets.length})
                      </h4>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {wallets.map((wallet, i) => (
                          <div
                            key={wallet.solanaAddress || i}
                            className="bg-zinc-800 border border-zinc-700 rounded p-3 text-xs"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-zinc-200">{wallet.agentName}</span>
                              <span className="text-zinc-500">{wallet.role}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-500 w-12">Pub:</span>
                                <code className="text-zinc-400 flex-1 truncate">{wallet.solanaAddress}</code>
                                <button
                                  onClick={() => copyToClipboard(wallet.solanaAddress, `pub-${i}`)}
                                  className="text-zinc-500 hover:text-zinc-300"
                                >
                                  {copiedKey === `pub-${i}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-500 w-12">Priv:</span>
                                <code className="text-terminal-orange flex-1 truncate">{wallet.privateKey}</code>
                                <button
                                  onClick={() => copyToClipboard(wallet.privateKey, `priv-${i}`)}
                                  className="text-zinc-500 hover:text-zinc-300"
                                >
                                  {copiedKey === `priv-${i}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {wallets.length === 0 && !isLoading && (
                    <p className="text-xs text-zinc-500 text-center py-4">
                      No wallets found. Deploy an agent or run the simulation to generate wallets.
                    </p>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-between items-center">
                <span className="text-xs text-zinc-500">
                  Authenticated as admin
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  icon: typeof Zap;
  label: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
}

function ActionButton({ icon: Icon, label, description, onClick, loading }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-start gap-3 p-3 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 text-left disabled:opacity-50"
    >
      <Icon className="w-5 h-5 text-primary-400 mt-0.5" />
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-zinc-500">{description}</div>
      </div>
    </button>
  );
}
