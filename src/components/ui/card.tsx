import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "green" | "cyan" | "pink" | "amber" | "purple";
}

export function Card({ children, className, hover, glow }: CardProps) {
  const glowClasses = {
    green: "hover:shadow-neon-green hover:border-terminal-green",
    cyan: "hover:shadow-neon-cyan hover:border-terminal-cyan",
    pink: "hover:shadow-neon-pink hover:border-terminal-pink",
    amber: "hover:shadow-neon-amber hover:border-terminal-amber",
    purple: "hover:shadow-neon-purple hover:border-terminal-purple",
  };

  return (
    <div
      className={cn(
        "card p-4",
        hover && "hover:border-terminal-cyan hover:bg-surface-overlay transition-all cursor-pointer",
        glow && glowClasses[glow],
        className
      )}
    >
      {children}
    </div>
  );
}

interface TerminalCardProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function TerminalCard({ children, title, className }: TerminalCardProps) {
  return (
    <div className={cn("terminal-window", className)}>
      <div className="terminal-header">
        <span className="terminal-btn terminal-btn-close" />
        <span className="terminal-btn terminal-btn-min" />
        <span className="terminal-btn terminal-btn-max" />
        {title && <span className="ml-4 text-terminal-green/60 text-xs font-mono">{title}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn("text-sm font-terminal text-terminal-green/60 uppercase tracking-wider", className)}>
      <span className="text-terminal-cyan mr-1">&gt;</span>
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("font-mono", className)}>{children}</div>;
}

interface CardValueProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  color?: "green" | "cyan" | "pink" | "amber";
}

export function CardValue({ children, className, size = "md", color = "green" }: CardValueProps) {
  const sizeClasses = {
    sm: "text-lg font-terminal",
    md: "text-2xl font-terminal",
    lg: "text-3xl font-terminal",
  };

  const colorClasses = {
    green: "neon-green",
    cyan: "neon-cyan",
    pink: "neon-pink",
    amber: "neon-amber",
  };

  return (
    <div className={cn(sizeClasses[size], colorClasses[color], "tabular-nums", className)}>
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  className?: string;
  color?: "green" | "cyan" | "pink" | "amber";
}

export function StatCard({ title, value, subtitle, className, color = "green" }: StatCardProps) {
  return (
    <Card className={className}>
      <CardTitle>{title}</CardTitle>
      <CardValue className="mt-1" color={color}>{value}</CardValue>
      {subtitle && <p className="text-sm text-terminal-green/50 mt-1 font-mono">{subtitle}</p>}
    </Card>
  );
}
