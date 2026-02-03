import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0-100 or 0-1000 for reputation
  max?: number;
  size?: "sm" | "md" | "lg";
  color?: "green" | "cyan" | "amber" | "pink" | "purple";
  showLabel?: boolean;
  variant?: "bar" | "ascii";
  className?: string;
}

const colorClasses = {
  green: "bg-terminal-green shadow-[0_0_10px_rgba(0,255,65,0.5)]",
  cyan: "bg-terminal-cyan shadow-[0_0_10px_rgba(0,255,255,0.5)]",
  amber: "bg-terminal-amber shadow-[0_0_10px_rgba(255,176,0,0.5)]",
  pink: "bg-terminal-pink shadow-[0_0_10px_rgba(255,110,199,0.5)]",
  purple: "bg-terminal-purple shadow-[0_0_10px_rgba(191,95,255,0.5)]",
};

const textColors = {
  green: "text-terminal-green",
  cyan: "text-terminal-cyan",
  amber: "text-terminal-amber",
  pink: "text-terminal-pink",
  purple: "text-terminal-purple",
};

const sizeClasses = {
  sm: "h-1",
  md: "h-2",
  lg: "h-4",
};

export function ProgressBar({
  value,
  max = 100,
  size = "md",
  color = "green",
  showLabel,
  variant = "bar",
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  if (variant === "ascii") {
    const totalBlocks = 20;
    const filledBlocks = Math.round((percentage / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;

    return (
      <div className={cn("font-mono", className)}>
        <div className="flex items-center gap-2">
          <span className="text-terminal-green/60">[</span>
          <span className={textColors[color]}>
            {"█".repeat(filledBlocks)}
            <span className="text-terminal-green/30">{"░".repeat(emptyBlocks)}</span>
          </span>
          <span className="text-terminal-green/60">]</span>
          {showLabel && (
            <span className={cn("text-sm tabular-nums", textColors[color])}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full bg-black border border-terminal-green/30 overflow-hidden", sizeClasses[size])}>
        <div
          className={cn("h-full transition-all duration-300", colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs font-mono">
          <span className="text-terminal-green/60">{value}</span>
          <span className="text-terminal-green/60">{max}</span>
        </div>
      )}
    </div>
  );
}

interface ReputationBarProps {
  score: number;
  label: string;
  className?: string;
}

export function ReputationBar({ score, label, className }: ReputationBarProps) {
  // Determine color based on score (tier-based)
  let color: "green" | "cyan" | "amber" | "pink" | "purple" = "green";
  if (score < 200) color = "green"; // Actually gray-ish for untrusted but we'll use green
  else if (score < 400) color = "green"; // Newcomer
  else if (score < 600) color = "cyan"; // Reliable
  else if (score < 800) color = "purple"; // Trusted
  else if (score < 900) color = "pink"; // Elite
  else color = "amber"; // Legendary

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-sm font-mono">
        <span className="text-terminal-green/60">&gt; {label}</span>
        <span className={cn("tabular-nums font-terminal", textColors[color])}>{score}/1000</span>
      </div>
      <ProgressBar value={score} max={1000} size="sm" color={color} />
    </div>
  );
}

interface DifficultyBarProps {
  level: number; // 1-5
  className?: string;
}

const difficultyColors: Record<number, string> = {
  1: "text-terminal-green/50",
  2: "text-terminal-green",
  3: "text-terminal-amber",
  4: "text-orange-400",
  5: "text-terminal-pink",
};

export function DifficultyBar({ level, className }: DifficultyBarProps) {
  return (
    <div className={cn("flex gap-1 font-mono", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            "text-lg",
            i <= level ? difficultyColors[level] : "text-terminal-green/20"
          )}
        >
          {i <= level ? "◆" : "◇"}
        </span>
      ))}
    </div>
  );
}

interface AsciiMeterProps {
  value: number;
  max: number;
  width?: number;
  color?: "green" | "cyan" | "amber" | "pink";
  label?: string;
  className?: string;
}

export function AsciiMeter({
  value,
  max,
  width = 10,
  color = "green",
  label,
  className,
}: AsciiMeterProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  return (
    <div className={cn("font-mono text-sm", className)}>
      {label && <span className="text-terminal-green/60 mr-2">{label}:</span>}
      <span className="text-terminal-green/60">[</span>
      <span className={textColors[color]}>{"=".repeat(filled)}</span>
      <span className="text-terminal-green/30">{"-".repeat(empty)}</span>
      <span className="text-terminal-green/60">]</span>
      <span className={cn("ml-2 tabular-nums", textColors[color])}>
        {value}/{max}
      </span>
    </div>
  );
}
