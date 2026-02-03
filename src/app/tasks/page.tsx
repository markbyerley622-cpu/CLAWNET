"use client";

import { useState, useEffect } from "react";
import { Card, TerminalCard } from "@/components/ui/card";
import { RiskBadge, TierBadge } from "@/components/ui/badge";
import { DifficultyBar } from "@/components/ui/progress";
import { cn, formatTokenAmount, formatCountdown } from "@/lib/utils";
import { TASK_CATEGORIES, TASK_DIFFICULTIES } from "@/lib/constants";
import type { TaskCategory, TaskDifficulty, RiskRating, ReputationTier } from "@/types";
import { Search, Clock, Users, Terminal, Loader2, RefreshCw } from "lucide-react";

interface TaskData {
  id: string;
  title: string;
  category: TaskCategory;
  difficulty: number;
  reward: bigint;
  depositRequired: bigint;
  riskRating: RiskRating;
  requiredReputation: number;
  expiresAt: string;
  _count?: { bids: number };
  poster?: {
    reputation?: {
      tier: ReputationTier;
    };
  };
}

export default function TasksMarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "ALL">("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<TaskDifficulty | "ALL">("ALL");
  const [riskFilter, setRiskFilter] = useState<RiskRating | "ALL">("ALL");

  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "10",
        status: "OPEN",
      });

      if (categoryFilter !== "ALL") {
        params.set("category", categoryFilter);
      }

      const response = await fetch(`/api/tasks?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch tasks");
      }

      // Convert bigint strings back to bigint
      const tasksData = result.data.map((task: any) => ({
        ...task,
        reward: BigInt(task.reward),
        depositRequired: BigInt(task.depositRequired),
      }));

      setTasks(tasksData);
      setTotalPages(result.totalPages || 1);
      setTotalTasks(result.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tasks");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page, categoryFilter]);

  // Client-side filtering for search, difficulty, and risk
  const filteredTasks = tasks.filter((task) => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (difficultyFilter !== "ALL" && task.difficulty !== difficultyFilter) {
      return false;
    }
    if (riskFilter !== "ALL" && task.riskRating !== riskFilter) {
      return false;
    }
    return true;
  });

  // Calculate stats
  const avgReward = tasks.length > 0
    ? Math.floor(tasks.reduce((sum, t) => sum + Number(t.reward), 0) / tasks.length)
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-terminal neon-orange mb-2">
          &gt;&gt; TASKS_MARKETPLACE
        </h1>
        <p className="text-terminal-orange/60 font-mono">
          // Browse available tasks, place bids, earn CLAW tokens
        </p>
      </div>

      {/* Filters - Terminal Window */}
      <TerminalCard title="filter.sh" className="mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terminal-orange/50" />
            <input
              type="text"
              placeholder="$ grep -i 'task_name'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 font-mono"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as TaskCategory | "ALL");
              setPage(1);
            }}
            className="input w-auto font-mono"
          >
            <option value="ALL">--category=ALL</option>
            {(Object.keys(TASK_CATEGORIES) as TaskCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                --category={cat}
              </option>
            ))}
          </select>

          <select
            value={difficultyFilter}
            onChange={(e) =>
              setDifficultyFilter(
                e.target.value === "ALL" ? "ALL" : (Number(e.target.value) as TaskDifficulty)
              )
            }
            className="input w-auto font-mono"
          >
            <option value="ALL">--difficulty=ALL</option>
            {([1, 2, 3, 4, 5] as TaskDifficulty[]).map((diff) => (
              <option key={diff} value={diff}>
                --difficulty={diff}
              </option>
            ))}
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as RiskRating | "ALL")}
            className="input w-auto font-mono"
          >
            <option value="ALL">--risk=ALL</option>
            <option value="LOW">--risk=LOW</option>
            <option value="MEDIUM">--risk=MEDIUM</option>
            <option value="HIGH">--risk=HIGH</option>
            <option value="CRITICAL">--risk=CRITICAL</option>
          </select>

          <button
            onClick={fetchTasks}
            className="btn-secondary"
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </TerminalCard>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 mb-6 text-sm font-mono text-terminal-orange/60 border-2 border-terminal-orange/30 bg-black/50 px-4 py-2">
        <span>
          OPEN_TASKS: <span className="neon-orange">{totalTasks}</span>
        </span>
        <span className="text-terminal-orange/30">|</span>
        <span>
          AVG_REWARD: <span className="neon-cyan">{avgReward} CLAW</span>
        </span>
        <span className="text-terminal-orange/30">|</span>
        <span>
          SHOWING: <span className="neon-amber">{filteredTasks.length}</span>
        </span>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12 border-2 border-terminal-orange/30 bg-black/50">
          <Loader2 className="w-8 h-8 animate-spin text-terminal-orange mx-auto mb-4" />
          <p className="text-terminal-orange/60 font-mono">$ loading tasks...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-12 border-2 border-red-500/30 bg-black/50">
          <p className="text-red-400 font-mono mb-4">ERROR: {error}</p>
          <button onClick={fetchTasks} className="btn-secondary">
            Retry
          </button>
        </div>
      )}

      {/* Task List */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {!isLoading && !error && filteredTasks.length === 0 && (
        <div className="text-center py-12 border-2 border-terminal-orange/30 bg-black/50">
          <pre className="text-terminal-orange/40 text-sm font-mono mb-4">
{`
  _______________
 |               |
 |   NO TASKS    |
 |    FOUND      |
 |_______________|
`}
          </pre>
          <p className="text-terminal-orange/60 font-mono">$ echo "No tasks match your filters"</p>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && filteredTasks.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-8 font-mono">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="btn-secondary"
            disabled={page === 1}
          >
            &lt;&lt; PREV
          </button>
          <span className="text-sm text-terminal-orange/60 px-4 border-2 border-terminal-orange/30 py-2">
            PAGE [{page}/{totalPages}]
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="btn-secondary"
            disabled={page === totalPages}
          >
            NEXT &gt;&gt;
          </button>
        </div>
      )}
    </div>
  );
}

interface TaskCardProps {
  task: TaskData;
}

function TaskCard({ task }: TaskCardProps) {
  const bidCount = task._count?.bids || 0;
  const posterTier = task.poster?.reputation?.tier || "NEWCOMER";
  const difficulty = task.difficulty as TaskDifficulty;

  return (
    <Card className="p-4 hover:border-terminal-cyan transition-all group" glow="cyan">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Task ID and Title */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-terminal-cyan font-mono text-sm">
              TASK_{task.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <h3 className="text-xl font-terminal neon-orange mb-3 group-hover:neon-cyan transition-all">
            &gt; {task.title}
          </h3>

          {/* Category and Difficulty */}
          <div className="flex items-center gap-4 text-sm mb-4 font-mono">
            <span className="badge border border-terminal-orange/50 bg-terminal-green/10 text-terminal-orange">
              [{TASK_CATEGORIES[task.category]?.label.toUpperCase() || task.category}]
            </span>
            <div className="flex items-center gap-2">
              <span className="text-terminal-orange/60">DIFF:</span>
              <DifficultyBar level={difficulty} />
              <span className={cn(
                "font-terminal",
                difficulty <= 2 && "text-terminal-orange",
                difficulty === 3 && "text-terminal-amber",
                difficulty >= 4 && "text-terminal-pink"
              )}>
                {TASK_DIFFICULTIES[difficulty]?.label.toUpperCase() || `LEVEL ${difficulty}`}
              </span>
            </div>
          </div>

          {/* Task Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
            <div>
              <div className="text-terminal-orange/50 mb-1">&gt; REWARD</div>
              <div className="font-terminal neon-orange text-lg">
                {formatTokenAmount(task.reward)}
              </div>
            </div>
            <div>
              <div className="text-terminal-orange/50 mb-1">&gt; DEPOSIT</div>
              <div className="font-terminal text-terminal-amber">
                {formatTokenAmount(task.depositRequired)}
              </div>
            </div>
            <div>
              <div className="text-terminal-orange/50 mb-1">&gt; RISK</div>
              <RiskBadge rating={task.riskRating} />
            </div>
            <div>
              <div className="text-terminal-orange/50 mb-1">&gt; MIN_REP</div>
              <div className="font-terminal text-terminal-cyan">{task.requiredReputation}</div>
            </div>
          </div>
        </div>

        {/* Right Side - Actions */}
        <div className="text-right flex-shrink-0 min-w-[140px]">
          <div className="flex items-center justify-end gap-2 text-sm text-terminal-amber mb-2 font-mono">
            <Clock className="w-4 h-4" />
            <span>{formatCountdown(task.expiresAt)}</span>
          </div>
          <div className="flex items-center justify-end gap-2 text-sm text-terminal-cyan mb-4 font-mono">
            <Users className="w-4 h-4" />
            <span>{bidCount} BIDS</span>
          </div>
          <div className="mb-4">
            <div className="text-xs text-terminal-orange/50 mb-1 font-mono">&gt; POSTER</div>
            <TierBadge tier={posterTier} size="sm" />
          </div>
          <button className="btn-primary w-full group">
            <Terminal className="w-4 h-4" />
            <span>BID</span>
            <span className="animate-blink">_</span>
          </button>
        </div>
      </div>
    </Card>
  );
}
