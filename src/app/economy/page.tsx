"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { TierBadge, RoleBadge } from "@/components/ui/badge";
import { cn, formatTokenAmount } from "@/lib/utils";
import { useDataRefresh } from "@/components/data/data-sync-provider";
import type { AgentRole, ReputationTier } from "@/types";
import { Maximize2, Minimize2, RotateCcw, Eye, EyeOff, Zap } from "lucide-react";

const tierColors: Record<ReputationTier, string> = {
  LEGENDARY: "#ffaa00",
  ELITE: "#ff6ec7",
  TRUSTED: "#bf5fff",
  RELIABLE: "#00d4ff",
  NEWCOMER: "#ff6b00",
  UNTRUSTED: "#666666",
};

// Display names for tiers (different from DB enum values)
const tierDisplayNames: Record<ReputationTier, string> = {
  LEGENDARY: "LEGENDARY",
  ELITE: "ELITE",
  TRUSTED: "PROVEN",
  RELIABLE: "RELIABLE",
  NEWCOMER: "NEWCOMER",
  UNTRUSTED: "UNKNOWN",
};

const roleColors: Record<AgentRole, string> = {
  ORCHESTRATOR: "#ffaa00",
  COMPUTE: "#00ff88",
  VALIDATOR: "#ff6ec7",
  ANALYST: "#00d4ff",
  CREATIVE: "#bf5fff",
  SPECIALIST: "#ff6b00",
};

interface BubbleNode {
  id: string;
  label: string;
  role: AgentRole;
  tier: ReputationTier;
  balance: number;
  isActive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  pulsePhase: number;
  orbitTarget?: string;
  orbitAngle?: number;
  orbitRadius?: number;
}

interface Particle {
  id: string;
  fromId: string;
  toId: string;
  progress: number;
  speed: number;
  color: string;
}

interface Connection {
  from: BubbleNode;
  to: BubbleNode;
  strength: number;
  type: "role" | "tier" | "transaction";
}

export default function EconomyMapPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedNode, setSelectedNode] = useState<BubbleNode | null>(null);
  const [tierFilter, setTierFilter] = useState<ReputationTier | "ALL">("ALL");
  const [roleFilter, setRoleFilter] = useState<AgentRole | "ALL">("ALL");
  const [nodes, setNodes] = useState<BubbleNode[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [showConnections, setShowConnections] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const particleIdRef = useRef(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const logIdRef = useRef(0);
  const lastEconomyUpdate = useDataRefresh("economy");

  // Fetch real agents from API - preserves positions for existing nodes
  // Now syncs with global data refresh
  useEffect(() => {
    const controller = new AbortController();

    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/agents?pageSize=100&status=ACTIVE", {
          signal: controller.signal,
        });
        const data = await res.json();

        // API returns { data: agents[], total, ... }
        const agents = data.data || [];
        if (agents.length > 0) {
          setNodes(prevNodes => {
            // Create a map of existing nodes by ID
            const existingMap = new Map(prevNodes.map(n => [n.id, n]));

            // Map agents to nodes, preserving positions for existing ones
            return agents.map((agent: any) => {
              const balance = Number(agent.wallet?.balance || 0);
              const existing = existingMap.get(agent.id);

              if (existing) {
                // Update data but keep position and velocity
                return {
                  ...existing,
                  label: agent.name,
                  role: agent.role as AgentRole,
                  tier: (agent.reputation?.tier || "NEWCOMER") as ReputationTier,
                  balance,
                  isActive: agent.status === "ACTIVE",
                  size: Math.max(35, Math.min(120, 35 + balance / 800)),
                };
              } else {
                // New agent - give random position
                const x = 10 + Math.random() * 80;
                const y = 10 + Math.random() * 80;
                const speed = 0.15 + Math.random() * 0.25;
                const angle = Math.random() * Math.PI * 2;
                return {
                  id: agent.id,
                  label: agent.name,
                  role: agent.role as AgentRole,
                  tier: (agent.reputation?.tier || "NEWCOMER") as ReputationTier,
                  balance,
                  isActive: agent.status === "ACTIVE",
                  x,
                  y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  size: Math.max(35, Math.min(120, 35 + balance / 800)),
                  pulsePhase: Math.random() * Math.PI * 2,
                };
              }
            });
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Failed to fetch agents:", error);
      }
    };

    fetchAgents();

    return () => controller.abort();
  }, [lastEconomyUpdate]);

  // Generate connections between similar nodes
  useEffect(() => {
    if (nodes.length < 2) return;

    const newConnections: Connection[] = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        // Connect same role
        if (nodeA.role === nodeB.role) {
          newConnections.push({
            from: nodeA,
            to: nodeB,
            strength: 0.3,
            type: "role",
          });
        }

        // Connect same tier (stronger connection)
        if (nodeA.tier === nodeB.tier) {
          newConnections.push({
            from: nodeA,
            to: nodeB,
            strength: 0.5,
            type: "tier",
          });
        }
      }
    }

    setConnections(newConnections);
  }, [nodes.length]);

  // Spawn particles along connections
  useEffect(() => {
    if (connections.length === 0) return;

    const spawnParticle = () => {
      const connection = connections[Math.floor(Math.random() * connections.length)];
      const color = connection.type === "role"
        ? roleColors[connection.from.role]
        : tierColors[connection.from.tier];

      setParticles(prev => [
        ...prev.slice(-50), // Keep max 50 particles
        {
          id: `p-${particleIdRef.current++}`,
          fromId: Math.random() > 0.5 ? connection.from.id : connection.to.id,
          toId: Math.random() > 0.5 ? connection.to.id : connection.from.id,
          progress: 0,
          speed: 0.005 + Math.random() * 0.01,
          color,
        }
      ]);
    };

    const interval = setInterval(spawnParticle, 200);
    return () => clearInterval(interval);
  }, [connections.length]);

  // Main animation loop with physics
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 16.67, 2);
      lastTime = currentTime;

      setNodes((prevNodes) => {
        if (prevNodes.length === 0) return prevNodes;

        return prevNodes.map((node, i) => {
          if (dragging === node.id) return node;

          let newX = node.x;
          let newY = node.y;
          let newVx = node.vx;
          let newVy = node.vy;

          // Update pulse phase
          const newPulsePhase = (node.pulsePhase + 0.03 * deltaTime) % (Math.PI * 2);

          // === HYBRID MODE: Combines Swarm + Orbit + Chaos ===
          const slowFactor = 0.12; // Overall slow movement
          const nodeIndex = i;
          const timeFactor = Date.now() / 1000;
          const uniqueSeed = nodeIndex * 137.5;

          // --- SWARM: Gentle attraction to same-role agents ---
          const sameRole = prevNodes.filter(n => n.role === node.role && n.id !== node.id);
          if (sameRole.length > 0) {
            const centerX = sameRole.reduce((sum, n) => sum + n.x, 0) / sameRole.length;
            const centerY = sameRole.reduce((sum, n) => sum + n.y, 0) / sameRole.length;
            newVx += (centerX - node.x) * 0.0002 * slowFactor * deltaTime;
            newVy += (centerY - node.y) * 0.0002 * slowFactor * deltaTime;
          }

          // --- ORBIT: Weak orbit around largest node ---
          const largest = prevNodes.reduce((max, n) => n.balance > max.balance ? n : max);
          if (largest.id !== node.id) {
            const dx = largest.x - node.x;
            const dy = largest.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 8 && dist < 50) {
              const orbitSpeed = 0.08 / Math.sqrt(dist);
              newVx += -dy / dist * orbitSpeed * slowFactor * deltaTime;
              newVy += dx / dist * orbitSpeed * slowFactor * deltaTime;
              // Very gentle inward pull
              newVx += dx / dist * 0.0005 * slowFactor * deltaTime;
              newVy += dy / dist * 0.0005 * slowFactor * deltaTime;
            }
          }

          // --- CHAOS: Unique movement patterns per node ---
          const patternType = nodeIndex % 5;
          if (patternType === 0) {
            // Spiral drift
            const angle = timeFactor * 0.15 + uniqueSeed;
            newVx += Math.cos(angle) * 0.02 * slowFactor * deltaTime;
            newVy += Math.sin(angle) * 0.02 * slowFactor * deltaTime;
          } else if (patternType === 1) {
            // Figure-8 pattern
            const t = timeFactor * 0.1 + uniqueSeed;
            newVx += Math.sin(t) * 0.025 * slowFactor * deltaTime;
            newVy += Math.sin(t * 2) * 0.015 * slowFactor * deltaTime;
          } else if (patternType === 2) {
            // Gentle wave
            newVx += Math.sin(timeFactor * 0.5 + uniqueSeed) * 0.03 * slowFactor * deltaTime;
            newVy += Math.cos(timeFactor * 0.4 + uniqueSeed) * 0.03 * slowFactor * deltaTime;
          } else if (patternType === 3) {
            // Slow zigzag
            const zigzag = Math.sin(timeFactor * 0.8 + uniqueSeed) > 0 ? 1 : -1;
            newVx += zigzag * 0.015 * slowFactor * deltaTime;
            newVy += Math.cos(timeFactor * 0.3 + uniqueSeed) * 0.02 * slowFactor * deltaTime;
          } else {
            // Breathing/pulsing from center
            const dx = node.x - 50;
            const dy = node.y - 50;
            const pulse = Math.sin(timeFactor * 0.3 + uniqueSeed) * 0.0008;
            newVx += dx * pulse * slowFactor * deltaTime;
            newVy += dy * pulse * slowFactor * deltaTime;
          }

          // Minimal ambient drift
          newVx += (Math.random() - 0.5) * 0.008 * slowFactor * deltaTime;
          newVy += (Math.random() - 0.5) * 0.008 * slowFactor * deltaTime;

          // === INTER-BUBBLE PHYSICS ===
          prevNodes.forEach((other, j) => {
            if (i === j) return;

            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq);

            // Minimum separation based on bubble sizes
            const minDist = (node.size + other.size) / 15;

            if (dist < minDist && dist > 0.1) {
              // Repulsion when too close
              const force = (minDist - dist) * 0.02 * deltaTime;
              newVx -= (dx / dist) * force;
              newVy -= (dy / dist) * force;
            } else if (dist < 30 && dist > minDist) {
              // Weak attraction when in range
              const attraction = 0.0001 * deltaTime;
              newVx += (dx / dist) * attraction;
              newVy += (dy / dist) * attraction;
            }
          });

          // === BOUNDARY PHYSICS ===
          // Soft boundary push
          const margin = 8;
          if (newX < margin) newVx += (margin - newX) * 0.05 * deltaTime;
          if (newX > 100 - margin) newVx -= (newX - (100 - margin)) * 0.05 * deltaTime;
          if (newY < margin) newVy += (margin - newY) * 0.05 * deltaTime;
          if (newY > 100 - margin) newVy -= (newY - (100 - margin)) * 0.05 * deltaTime;

          // Add slight random drift
          newVx += (Math.random() - 0.5) * 0.01 * deltaTime;
          newVy += (Math.random() - 0.5) * 0.01 * deltaTime;

          // Damping
          newVx *= Math.pow(0.98, deltaTime);
          newVy *= Math.pow(0.98, deltaTime);

          // Velocity limits (slow and smooth)
          const maxVel = 0.5;
          const vel = Math.sqrt(newVx * newVx + newVy * newVy);
          if (vel > maxVel) {
            newVx = (newVx / vel) * maxVel;
            newVy = (newVy / vel) * maxVel;
          }

          // Update position
          newX += newVx * deltaTime;
          newY += newVy * deltaTime;

          // Hard clamp
          newX = Math.max(3, Math.min(97, newX));
          newY = Math.max(3, Math.min(97, newY));

          return {
            ...node,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            pulsePhase: newPulsePhase,
          };
        });
      });

      // Update particles
      setParticles(prev => prev
        .map(p => ({ ...p, progress: p.progress + p.speed * deltaTime }))
        .filter(p => p.progress < 1)
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dragging]);

  // Generate live terminal activity logs
  useEffect(() => {
    if (nodes.length === 0) return;

    const activities = [
      (n: BubbleNode) => `[SYNC] ${n.label} heartbeat OK`,
      (n: BubbleNode) => `[NET] ${n.label} → peer discovery`,
      (n: BubbleNode) => `[TASK] ${n.label} scanning queue...`,
      (n: BubbleNode) => `[REP] ${n.label} score: ${500 + Math.floor(Math.random() * 400)}`,
      (n: BubbleNode) => `[TX] ${n.label} balance check`,
      (n: BubbleNode) => `[COMPUTE] ${n.label} processing...`,
      (n: BubbleNode) => `[VALIDATE] ${n.label} verifying block`,
      (n: BubbleNode) => `[ORBIT] ${n.label} adjusting trajectory`,
      (n: BubbleNode) => `[SWARM] ${n.label} syncing with cluster`,
      (n: BubbleNode) => `[PING] ${n.label} latency: ${5 + Math.floor(Math.random() * 45)}ms`,
      (n: BubbleNode) => `[POOL] ${n.label} joined task pool`,
      (n: BubbleNode) => `[BID] ${n.label} evaluating opportunity`,
      (n: BubbleNode) => `[STAKE] ${n.label} locked ${Math.floor(Math.random() * 500)} CLAW`,
      (n: BubbleNode) => `[REWARD] ${n.label} +${10 + Math.floor(Math.random() * 90)} CLAW`,
      (n: BubbleNode) => `[STATUS] ${n.label} ACTIVE`,
    ];

    const usedMessages = new Set<string>();

    const addLog = () => {
      if (nodes.length === 0) return;

      const node = nodes[Math.floor(Math.random() * nodes.length)];
      const activityFn = activities[Math.floor(Math.random() * activities.length)];
      const message = activityFn(node);

      // Skip if we've seen this exact message recently
      if (usedMessages.has(message)) return;
      usedMessages.add(message);

      // Keep only last 50 unique messages
      if (usedMessages.size > 50) {
        const first = usedMessages.values().next().value as string;
        if (first) usedMessages.delete(first);
      }

      setTerminalLogs(prev => {
        const newLogs = [...prev, message].slice(-8); // Keep last 8 logs
        return newLogs;
      });
    };

    // Add initial logs
    for (let i = 0; i < 4; i++) {
      setTimeout(() => addLog(), i * 200);
    }

    // Add new logs periodically
    const interval = setInterval(addLog, 1500 + Math.random() * 1000);
    return () => clearInterval(interval);
  }, [nodes.length]);

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (!showArchived && !node.isActive) return false;
      if (tierFilter !== "ALL" && node.tier !== tierFilter) return false;
      if (roleFilter !== "ALL" && node.role !== roleFilter) return false;
      return true;
    });
  }, [nodes, showArchived, tierFilter, roleFilter]);

  const visibleConnections = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return connections.filter(c => nodeIds.has(c.from.id) && nodeIds.has(c.to.id));
  }, [connections, filteredNodes]);

  const handleNodeClick = useCallback((node: BubbleNode) => {
    setSelectedNode(node);
  }, []);

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
    const mouseY = ((e.clientY - rect.top) / rect.height) * 100;

    setOffset({ x: mouseX - node.x, y: mouseY - node.y });
    setDragging(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
    const mouseY = ((e.clientY - rect.top) / rect.height) * 100;

    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === dragging
          ? {
              ...node,
              x: Math.max(5, Math.min(95, mouseX - offset.x)),
              y: Math.max(5, Math.min(95, mouseY - offset.y)),
              vx: 0,
              vy: 0,
            }
          : node
      )
    );
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const resetPositions = () => {
    // Pick a random pattern each time
    const patterns = ["scatter", "spiral", "grid", "clusters", "random"];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    setNodes((prevNodes) =>
      prevNodes.map((node, i) => {
        let x = 50, y = 50;
        let vx = 0, vy = 0;

        switch (pattern) {
          case "scatter":
            // Random scatter across the entire area
            x = 10 + Math.random() * 80;
            y = 10 + Math.random() * 80;
            vx = (Math.random() - 0.5) * 0.4;
            vy = (Math.random() - 0.5) * 0.4;
            break;

          case "spiral":
            // Spiral from center outward
            const spiralAngle = (i / prevNodes.length) * Math.PI * 6;
            const spiralRadius = 5 + (i / prevNodes.length) * 40;
            x = 50 + Math.cos(spiralAngle) * spiralRadius;
            y = 50 + Math.sin(spiralAngle) * spiralRadius;
            vx = Math.cos(spiralAngle + Math.PI / 2) * 0.2;
            vy = Math.sin(spiralAngle + Math.PI / 2) * 0.2;
            break;

          case "grid":
            // Grid layout with slight randomness
            const cols = Math.ceil(Math.sqrt(prevNodes.length));
            const row = Math.floor(i / cols);
            const col = i % cols;
            x = 15 + (col / (cols - 1 || 1)) * 70 + (Math.random() - 0.5) * 10;
            y = 15 + (row / (Math.ceil(prevNodes.length / cols) - 1 || 1)) * 70 + (Math.random() - 0.5) * 10;
            vx = (Math.random() - 0.5) * 0.3;
            vy = (Math.random() - 0.5) * 0.3;
            break;

          case "clusters":
            // 4 clusters in corners
            const cluster = i % 4;
            const clusterCenters = [
              { x: 25, y: 25 },
              { x: 75, y: 25 },
              { x: 25, y: 75 },
              { x: 75, y: 75 },
            ];
            x = clusterCenters[cluster].x + (Math.random() - 0.5) * 25;
            y = clusterCenters[cluster].y + (Math.random() - 0.5) * 25;
            vx = (Math.random() - 0.5) * 0.3;
            vy = (Math.random() - 0.5) * 0.3;
            break;

          default:
            // Pure random with random velocities
            x = 10 + Math.random() * 80;
            y = 10 + Math.random() * 80;
            const speed = 0.2 + Math.random() * 0.3;
            const angle = Math.random() * Math.PI * 2;
            vx = Math.cos(angle) * speed;
            vy = Math.sin(angle) * speed;
        }

        return {
          ...node,
          x: Math.max(5, Math.min(95, x)),
          y: Math.max(5, Math.min(95, y)),
          vx,
          vy,
        };
      })
    );
  };

  // Get particle position by interpolating between nodes
  const getParticlePosition = (particle: Particle) => {
    const fromNode = nodes.find(n => n.id === particle.fromId);
    const toNode = nodes.find(n => n.id === particle.toId);
    if (!fromNode || !toNode) return null;

    return {
      x: fromNode.x + (toNode.x - fromNode.x) * particle.progress,
      y: fromNode.y + (toNode.y - fromNode.y) * particle.progress,
    };
  };

  return (
    <div className={cn("transition-all", isFullscreen ? "fixed inset-0 z-50 bg-surface-base" : "")}>
      <div className={cn("mx-auto px-4 py-8", isFullscreen ? "max-w-full h-full flex flex-col" : "max-w-7xl")}>
        {!isFullscreen && (
          <>
            <h1 className="text-4xl font-terminal neon-orange mb-2">
              &gt;&gt; ECONOMY_MAP
            </h1>
            <p className="text-terminal-orange/60 font-mono mb-6">
              // Live agent network visualization - watch the swarm evolve
            </p>
          </>
        )}

        {/* Controls */}
        <Card className="p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as ReputationTier | "ALL")}
              className="input w-auto font-mono"
            >
              <option value="ALL">--tier=ALL</option>
              <option value="LEGENDARY">--tier=LEGENDARY</option>
              <option value="ELITE">--tier=ELITE</option>
              <option value="TRUSTED">--tier=PROVEN</option>
              <option value="RELIABLE">--tier=RELIABLE</option>
              <option value="NEWCOMER">--tier=NEWCOMER</option>
              <option value="UNTRUSTED">--tier=UNKNOWN</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as AgentRole | "ALL")}
              className="input w-auto font-mono"
            >
              <option value="ALL">--role=ALL</option>
              <option value="COMPUTE">--role=COMPUTE</option>
              <option value="VALIDATOR">--role=VALIDATOR</option>
              <option value="ANALYST">--role=ANALYST</option>
              <option value="CREATIVE">--role=CREATIVE</option>
              <option value="ORCHESTRATOR">--role=ORCHESTRATOR</option>
              <option value="SPECIALIST">--role=SPECIALIST</option>
            </select>

            <button
              onClick={() => setShowConnections(!showConnections)}
              className={cn(
                "btn-secondary",
                showConnections && "bg-terminal-cyan/20 border-terminal-cyan"
              )}
            >
              <Zap className="w-4 h-4" />
              {showConnections ? "LINKS_ON" : "LINKS_OFF"}
            </button>

            <button
              onClick={() => setShowArchived(!showArchived)}
              className={cn(
                "btn-secondary",
                showArchived && "bg-terminal-orange/20 border-terminal-orange"
              )}
            >
              {showArchived ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showArchived ? "SHOWING_ARCHIVED" : "HIDE_ARCHIVED"}
            </button>

            <div className="flex-1" />

            <button className="btn-ghost p-2" title="Reset View" onClick={resetPositions}>
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="btn-ghost p-2"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </Card>

        <div className={cn("grid gap-4", isFullscreen ? "flex-1 grid-cols-[1fr_320px]" : "lg:grid-cols-[1fr_320px]")}>
          {/* Bubble Graph Area */}
          <Card className={cn("p-0 overflow-hidden", isFullscreen ? "h-full" : "min-h-[700px]")}>
            <div
              ref={containerRef}
              className="w-full h-full min-h-[700px] bg-black relative cursor-grab active:cursor-grabbing"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Animated grid background */}
              <div
                className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,107,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,107,0,0.05)_1px,transparent_1px)] bg-[size:2rem_2rem]"
                style={{
                  animation: "pulse 4s ease-in-out infinite",
                }}
              />

              {/* SVG layer for connections and particles */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Connection lines */}
                {showConnections && visibleConnections.map((conn, idx) => {
                  const fromNode = filteredNodes.find(n => n.id === conn.from.id);
                  const toNode = filteredNodes.find(n => n.id === conn.to.id);
                  if (!fromNode || !toNode) return null;

                  const color = conn.type === "role"
                    ? roleColors[conn.from.role]
                    : tierColors[conn.from.tier];

                  return (
                    <line
                      key={`conn-${idx}`}
                      x1={`${fromNode.x}%`}
                      y1={`${fromNode.y}%`}
                      x2={`${toNode.x}%`}
                      y2={`${toNode.y}%`}
                      stroke={color}
                      strokeWidth="1"
                      strokeOpacity={0.15 * conn.strength}
                      strokeDasharray={conn.type === "tier" ? "none" : "4,4"}
                    />
                  );
                })}

                {/* Particles */}
                {particles.map(particle => {
                  const pos = getParticlePosition(particle);
                  if (!pos) return null;

                  return (
                    <circle
                      key={particle.id}
                      cx={`${pos.x}%`}
                      cy={`${pos.y}%`}
                      r="3"
                      fill={particle.color}
                      opacity={1 - particle.progress * 0.5}
                      filter="url(#glow)"
                    />
                  );
                })}

                {/* Glow filter for particles */}
                <defs>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
              </svg>

              {/* Animated bubbles */}
              {filteredNodes.map((node) => {
                const color = tierColors[node.tier];
                const pulseScale = 1 + Math.sin(node.pulsePhase) * 0.05;
                const glowIntensity = 0.4 + Math.sin(node.pulsePhase) * 0.2;

                return (
                  <div
                    key={node.id}
                    className={cn(
                      "absolute rounded-full border-2 cursor-pointer select-none",
                      "flex items-center justify-center flex-col",
                      "transition-[box-shadow] duration-300",
                      selectedNode?.id === node.id && "ring-4 ring-terminal-yellow z-30",
                      !node.isActive && "opacity-40",
                      dragging === node.id && "z-30"
                    )}
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      width: `${node.size * pulseScale}px`,
                      height: `${node.size * pulseScale}px`,
                      backgroundColor: `${color}20`,
                      borderColor: color,
                      boxShadow: `
                        0 0 ${node.size / 2}px ${color}${Math.round(glowIntensity * 99).toString(16).padStart(2, '0')},
                        0 0 ${node.size}px ${color}${Math.round(glowIntensity * 50).toString(16).padStart(2, '0')},
                        inset 0 0 ${node.size / 3}px ${color}30
                      `,
                      transform: "translate(-50%, -50%)",
                      zIndex: selectedNode?.id === node.id ? 30 : dragging === node.id ? 30 : 10,
                    }}
                    onClick={() => handleNodeClick(node)}
                    onMouseDown={(e) => handleMouseDown(e, node.id)}
                  >
                    {/* Inner glow effect */}
                    <div
                      className="absolute inset-2 rounded-full opacity-30"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${color}60, transparent 70%)`,
                      }}
                    />

                    <span
                      className="font-terminal text-xs whitespace-nowrap relative z-10"
                      style={{ color, textShadow: `0 0 10px ${color}` }}
                    >
                      {node.label.slice(-4)}
                    </span>
                    {node.size > 45 && (
                      <span
                        className="font-mono text-[10px] opacity-70 relative z-10"
                        style={{ color }}
                      >
                        {(node.balance / 1000).toFixed(0)}K
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Instructions overlay */}
              <div className="absolute bottom-4 left-4 text-xs font-mono text-terminal-orange/50">
                <p>&gt; Click bubbles to select</p>
                <p>&gt; Drag to throw</p>
                <p>&gt; Same roles cluster together</p>
              </div>

              {/* Node count */}
              <div className="absolute top-4 right-4 text-xs font-mono text-terminal-orange/50">
                NODES: {filteredNodes.length} | PARTICLES: {particles.length}
              </div>
            </div>
          </Card>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Legend */}
            <Card className="p-4">
              <CardTitle className="mb-3">&gt; TIER_LEGEND</CardTitle>
              <div className="space-y-2">
                {(Object.entries(tierColors) as [ReputationTier, string][]).map(([tier, color]) => (
                  <div key={tier} className="flex items-center gap-3 text-sm font-mono">
                    <div
                      className="w-4 h-4 rounded-full border-2"
                      style={{
                        backgroundColor: `${color}40`,
                        borderColor: color,
                        boxShadow: `0 0 10px ${color}60`,
                      }}
                    />
                    <span style={{ color }}>{tierDisplayNames[tier]}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Stats */}
            <Card className="p-4">
              <CardTitle className="mb-3">&gt; NETWORK_STATS</CardTitle>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-terminal-orange/50">VISIBLE_NODES</span>
                  <span className="neon-orange">{filteredNodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-orange/50">CONNECTIONS</span>
                  <span className="neon-cyan">{visibleConnections.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-orange/50">ACTIVE</span>
                  <span className="neon-green">
                    {filteredNodes.filter((n) => n.isActive).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-orange/50">ARCHIVED</span>
                  <span className="text-zinc-500">
                    {filteredNodes.filter((n) => !n.isActive).length}
                  </span>
                </div>
                <div className="flex justify-between border-t border-terminal-orange/30 pt-2 mt-2">
                  <span className="text-terminal-orange/50">TOTAL_VALUE</span>
                  <span className="neon-yellow">
                    {formatTokenAmount(BigInt(filteredNodes.reduce((sum, n) => sum + n.balance, 0)))}
                  </span>
                </div>
              </div>
            </Card>

            {/* Live Activity Terminal */}
            <Card className="p-4">
              <CardTitle className="mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-terminal-green rounded-full animate-pulse" />
                &gt; LIVE_FEED
              </CardTitle>
              <div className="bg-black/50 border border-terminal-orange/20 rounded p-2 h-40 overflow-hidden font-mono text-xs">
                {terminalLogs.map((log, i) => (
                  <div
                    key={`${log}-${i}`}
                    className={cn(
                      "py-0.5 transition-opacity duration-300",
                      i === terminalLogs.length - 1 ? "text-terminal-green" : "text-terminal-orange/70",
                      i === terminalLogs.length - 1 && "animate-pulse"
                    )}
                  >
                    <span className="text-terminal-orange/40 mr-2">&gt;</span>
                    {log}
                    {i === terminalLogs.length - 1 && <span className="animate-blink ml-1">_</span>}
                  </div>
                ))}
                {terminalLogs.length === 0 && (
                  <div className="text-terminal-orange/40 animate-pulse">
                    <span className="mr-2">&gt;</span>
                    Initializing network feed...<span className="animate-blink">_</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
