import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useLanguage } from "@/components/providers/language.tsx";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useStore,
  type Node,
  type Edge,
  type EdgeProps,
  type NodeProps,
  type MiniMapNodeProps,
  type ReactFlowInstance,
  MarkerType,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Server,
  X,
  Database,
  HardDrive,
  Globe,
  Shield,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Layers,
  CheckCircle2,
  Wrench,
  CalendarClock,
  Archive,
  CircleDot,
  Plus,
  Edit,
  Trash2,
  Map,
  GitBranch,
  Activity,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Info,
  SlidersHorizontal,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import SystemFlowSVG from "../flow-diagram/_components/SystemFlowSVG.tsx";
import GanttChart from "../flow-diagram/_components/GanttChart.tsx";
import { formatVnd } from "@/lib/format.ts";

type System = Doc<"software_systems">;
type Integration = Doc<"integrations">;
type SystemModule = Doc<"system_modules">;

// ─── Metadata ───────────────────────────────────────────────────────────────

const TYPE_META: Record<
  string,
  { label: string; bg: string; border: string; text: string; badge: string }
> = {
  core: {
    label: "Core",
    bg: "#1a1f3e",
    border: "#6366f1",
    text: "#c7d2fe",
    badge: "#6366f1",
  },
  supporting: {
    label: "Supporting",
    bg: "#0f2318",
    border: "#22c55e",
    text: "#bbf7d0",
    badge: "#22c55e",
  },
  legacy: {
    label: "Legacy",
    bg: "#2a1a06",
    border: "#f59e0b",
    text: "#fde68a",
    badge: "#f59e0b",
  },
  pilot: {
    label: "Pilot",
    bg: "#0a1a35",
    border: "#3b82f6",
    text: "#bfdbfe",
    badge: "#3b82f6",
  },
};

const STATUS_META: Record<string, { color: string; icon: string }> = {
  active: { color: "#22c55e", icon: "●" },
  sunset: { color: "#ef4444", icon: "●" },
  pilot: { color: "#f59e0b", icon: "◑" },
  inactive: { color: "#6b7280", icon: "○" },
};

const HEALTH_META: Record<string, { color: string; label: string }> = {
  healthy: { color: "#22c55e", label: "Healthy" },
  degraded: { color: "#f59e0b", label: "Degraded" },
  down: { color: "#ef4444", label: "Down" },
  unknown: { color: "#6b7280", label: "Unknown" },
};

const HEALTH_CONFIG = {
  healthy: {
    label: "Healthy",
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-400/10",
    dot: "#22c55e",
  },
  degraded: {
    label: "Degraded",
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    dot: "#f59e0b",
  },
  down: {
    label: "Down",
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-400/10",
    dot: "#ef4444",
  },
  unknown: {
    label: "Unknown",
    icon: HelpCircle,
    color: "text-gray-400",
    bg: "bg-gray-400/10",
    dot: "#6b7280",
  },
} as const;

const METHOD_META: Record<string, { label: string; color: string }> = {
  realtime: { label: "Realtime", color: "#6366f1" },
  batch: { label: "Batch", color: "#64748b" },
  event_driven: { label: "Event", color: "#8b5cf6" },
  manual: { label: "Manual", color: "#94a3b8" },
};

const LIFECYCLE_META: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    Icon: React.ElementType;
    order: number;
  }
> = {
  in_use: {
    label: "Đang dùng",
    color: "#22c55e",
    bg: "#14532d33",
    Icon: CheckCircle2,
    order: 1,
  },
  in_development: {
    label: "Đang phát triển",
    color: "#3b82f6",
    bg: "#1e3a5f33",
    Icon: Wrench,
    order: 2,
  },
  planned: {
    label: "Kế hoạch",
    color: "#a855f7",
    bg: "#3b0764aa",
    Icon: CalendarClock,
    order: 3,
  },
  deprecated: {
    label: "Sắp bỏ",
    color: "#f59e0b",
    bg: "#78350f33",
    Icon: Archive,
    order: 4,
  },
  retired: {
    label: "Đã bỏ",
    color: "#6b7280",
    bg: "#1e293b",
    Icon: CircleDot,
    order: 5,
  },
};

// ─── Custom Node ─────────────────────────────────────────────────────────────
interface NodeData {
  system: System;
  inCount: number;
  outCount: number;
  worstHealth: string;
  isSelected: boolean;
  isCentral: boolean;
  groupKey: SystemZoneKey;
  isRiskMode: boolean;
  riskTone: "high" | "medium" | "low" | "unknown";
  riskColor: string;
  riskLabel: string;
}

interface ZoneNodeData {
  title: string;
  subtitle: string;
  accent: string;
  isCore: boolean;
  isPlaceholder: boolean;
}

type ArchitectureNodeData = NodeData | ZoneNodeData;

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 4, background: "#1e293b", borderRadius: 4 }}>
      <div
        style={{
          height: 4,
          borderRadius: 4,
          width: `${value}%`,
          background: color,
          transition: "width 0.3s",
        }}
      />
    </div>
  );
}

function scoreTone(value: number, goodAtHigh = true) {
  if (goodAtHigh) {
    return value >= 70 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#ef4444";
  }
  return value > 60 ? "#ef4444" : value > 30 ? "#f59e0b" : "#22c55e";
}

function riskToneForSystem(system: System, worstHealth: string) {
  if (
    system.riskLevel === "high" ||
    system.technicalDebtScore >= 70 ||
    worstHealth === "down"
  ) {
    return { tone: "high" as const, color: "#ef4444", label: "High risk" };
  }
  if (
    system.riskLevel === "medium" ||
    system.technicalDebtScore >= 40 ||
    worstHealth === "degraded"
  ) {
    return { tone: "medium" as const, color: "#f59e0b", label: "Watch" };
  }
  if (worstHealth === "unknown") {
    return { tone: "unknown" as const, color: "#64748b", label: "Unknown" };
  }
  return { tone: "low" as const, color: "#22c55e", label: "Stable" };
}

function systemIconFor(system: System) {
  const text = `${system.category} ${system.technology ?? ""} ${
    system.hosting ?? ""
  }`.toLowerCase();
  if (text.includes("data") || text.includes("bi") || text.includes("sql")) {
    return Database;
  }
  if (
    text.includes("identity") ||
    text.includes("security") ||
    text.includes("auth")
  ) {
    return Shield;
  }
  if (
    text.includes("web") ||
    text.includes("portal") ||
    text.includes("site") ||
    text.includes("app")
  ) {
    return Globe;
  }
  if (
    text.includes("infra") ||
    text.includes("cloud") ||
    text.includes("server") ||
    text.includes("aws") ||
    text.includes("gcp") ||
    text.includes("azure")
  ) {
    return HardDrive;
  }
  if (
    text.includes("hr") ||
    text.includes("crm") ||
    text.includes("student") ||
    text.includes("user")
  ) {
    return Users;
  }
  if (system.type === "core") return Server;
  return Layers;
}

// Reads only the current zoom scale (transform[2]) so a node re-renders
// when the user zooms, not on every pan. Semantic zoom: at a distance the
// canvas needs to read as a map, not a grid of full detail cards — dense
// datasets otherwise get crushed to unreadable 8-9px text at initial
// fitView (see .ai/architecture-overview-ux-review.md, P1.1).
const zoomSelector = (state: { transform: [number, number, number] }) =>
  state.transform[2];
const COMPACT_ZOOM_THRESHOLD = 0.35;

function SystemNode({ data }: NodeProps<NodeData>) {
  const isCompact = true;
  const {
    system: s,
    inCount,
    outCount,
    worstHealth,
    isSelected,
    isCentral,
    isRiskMode,
    riskTone,
    riskColor,
    riskLabel,
  } = data;
  const meta = TYPE_META[s.type] ?? TYPE_META.core;
  const statusMeta = STATUS_META[s.status] ?? STATUS_META.inactive;
  const healthColor = HEALTH_META[worstHealth]?.color ?? "#6b7280";
  const Icon = systemIconFor(s);
  const nodeWidth = isCentral ? 172 : 146;
  const iconSize = isCentral ? 22 : 20;
  const nodeBorder = isRiskMode ? riskColor : meta.border;
  const nodeBg = isRiskMode
    ? riskTone === "high"
      ? "#2a1015"
      : riskTone === "medium"
        ? "#251a08"
        : riskTone === "low"
          ? "#0f2318"
          : "#111827"
    : meta.bg;
  return (
    <div
      style={{
        background: nodeBg,
        borderRadius: 10,
        width: nodeWidth,
        cursor: "pointer",
        border: `${isSelected ? "2.5px" : "1.5px"} solid ${isSelected ? "#fff" : nodeBorder}`,
        boxShadow: isSelected
          ? `0 0 0 3px ${meta.border}55, 0 4px 24px #0008`
          : isRiskMode && riskTone === "high"
            ? `0 0 0 2px ${riskColor}55, 0 0 28px ${riskColor}33`
            : isRiskMode && riskTone === "medium"
              ? `0 0 0 1px ${riskColor}44, 0 0 18px ${riskColor}22`
              : isRiskMode
                ? `0 0 0 1px ${riskColor}33, 0 2px 12px #0006`
                : isCentral
                  ? `0 0 0 1px ${meta.border}66, 0 8px 30px ${meta.border}22`
                  : "0 2px 12px #0006",
        transition: "all 0.15s",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: healthColor,
          width: 8,
          height: 8,
          border: "2px solid #0f172a",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: healthColor,
          width: 8,
          height: 8,
          border: "2px solid #0f172a",
        }}
      />
      <div
        style={{
          // In Risk lens, risk is the primary signal (border/background
          // already encode it) — keeping the type badge's own color here
          // too stacks a second, unrelated color meaning on the same card
          // header (.ai/architecture-overview-ux-review.md, "Màu sắc đang
          // gánh quá nhiều nghĩa"). Neutralize it so risk color dominates.
          background: isRiskMode ? "#1e293b" : meta.badge,
          borderRadius: "8px 8px 0 0",
          padding: "3px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {meta.label}
        </span>
        <span style={{ color: "#fff", fontSize: 9, opacity: 0.9 }}>
          {isCentral ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                marginRight: 6,
                padding: "1px 5px",
                borderRadius: 999,
                background: "#ffffff22",
                fontSize: 8,
                fontWeight: 700,
              }}
            >
              Hub
            </span>
          ) : null}
          {isRiskMode ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                marginRight: 6,
                padding: "1px 5px",
                borderRadius: 999,
                background: `${riskColor}33`,
                color: "#fff",
                fontSize: 8,
                fontWeight: 700,
              }}
            >
              {riskLabel}
            </span>
          ) : null}
          <span style={{ color: statusMeta.color }}>{statusMeta.icon}</span>{" "}
          {s.status}
        </span>
      </div>
      <div style={{ padding: "7px 8px" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
          <div
            style={{
              width: iconSize,
              height: iconSize,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              background: `${meta.badge}44`,
              border: `1px solid ${meta.badge}66`,
              flexShrink: 0,
            }}
          >
            <Icon size={isCentral ? 13 : 12} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                color: meta.text,
                fontWeight: 700,
                fontSize: isCentral ? 11 : 10,
                lineHeight: 1.25,
                marginBottom: 1,
              }}
            >
              {s.name}
            </div>
            <div
              style={{
                color: meta.text,
                fontSize: 8,
                opacity: 0.6,
                marginBottom: 5,
              }}
            >
              {s.category}
              {s.criticality === "high" ? " · Critical" : ""}
            </div>
          </div>
        </div>
        {!isCompact && s.technology && (
          <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
            <span
              style={{
                fontSize: 8,
                color: "#64748b",
                background: "#1e293b",
                borderRadius: 4,
                padding: "1px 5px",
              }}
            >
              {s.technology}
            </span>
            {s.hosting && (
              <span
                style={{
                  fontSize: 8,
                  color: "#64748b",
                  background: "#1e293b",
                  borderRadius: 4,
                  padding: "1px 5px",
                }}
              >
                {s.hosting.includes("AWS")
                  ? "☁ AWS"
                  : s.hosting.includes("GCP")
                    ? "☁ GCP"
                    : s.hosting.includes("Azure")
                      ? "☁ Azure"
                      : s.hosting.includes("On-Premise")
                        ? "🖥 On-Prem"
                        : `☁ ${s.hosting}`}
              </span>
            )}
          </div>
        )}
        {!isCompact && (
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 8,
                color: "#64748b",
                marginBottom: 2,
              }}
            >
              <span>Arch Score</span>
              <span style={{ color: "#22c55e", fontWeight: 600 }}>
                {s.architectureScore}
              </span>
            </div>
            <ScoreBar value={s.architectureScore} color="#22c55e" />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 8,
                color: "#64748b",
                marginTop: 4,
                marginBottom: 2,
              }}
            >
              <span>Tech Debt</span>
              <span
                style={{
                  color:
                    s.technicalDebtScore > 60
                      ? "#ef4444"
                      : s.technicalDebtScore > 30
                        ? "#f59e0b"
                        : "#22c55e",
                  fontWeight: 600,
                }}
              >
                {s.technicalDebtScore}
              </span>
            </div>
            <ScoreBar
              value={s.technicalDebtScore}
              color={
                s.technicalDebtScore > 60
                  ? "#ef4444"
                  : s.technicalDebtScore > 30
                    ? "#f59e0b"
                    : "#22c55e"
              }
            />
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #1e293b",
            paddingTop: 4,
          }}
        >
          <span style={{ fontSize: 8, color: "#64748b" }}>← {inCount} in</span>
          <span
            style={{
              fontSize: 8,
              color: healthColor,
              background: `${healthColor}22`,
              borderRadius: 4,
              padding: "1px 5px",
              fontWeight: 600,
            }}
          >
            {HEALTH_META[worstHealth]?.label ?? "?"}
          </span>
          <span style={{ fontSize: 8, color: "#64748b" }}>
            {outCount} out →
          </span>
        </div>
      </div>
    </div>
  );
}

function ZoneNode({ data }: NodeProps<ZoneNodeData>) {
  if (data.isCore) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          border: `2px solid ${data.accent}`,
          borderRadius: 999,
          background: `radial-gradient(circle at 50% 48%, ${data.accent}32 0%, ${data.accent}1a 36%, #06101fdd 68%)`,
          boxShadow: `0 0 0 6px ${data.accent}14, 0 0 38px ${data.accent}55, inset 0 0 34px ${data.accent}32`,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            width: 1,
            height: "100%",
            background: "rgba(103, 232, 249, 0.22)",
            boxShadow: "0 0 18px rgba(34, 211, 238, 0.45)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            width: "100%",
            height: 1,
            background: "rgba(103, 232, 249, 0.22)",
            boxShadow: "0 0 18px rgba(34, 211, 238, 0.45)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 20,
            borderRadius: 999,
            border: "1px solid rgba(103, 232, 249, 0.22)",
            boxShadow: "0 0 42px rgba(34, 211, 238, 0.25)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 52,
            right: 52,
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "3px 8px",
              borderRadius: 999,
              background: "#050b18cc",
              border: `1px solid ${data.accent}55`,
              color: "#e0f2fe",
              fontSize: 10,
              fontWeight: 900,
              lineHeight: 1.2,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              textShadow: `0 0 18px ${data.accent}`,
            }}
          >
            {data.title}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: 48,
            right: 48,
            zIndex: 1,
          }}
        >
          <div
            style={{
              color: "#c4b5fd",
              fontSize: 8,
              lineHeight: 1.35,
            }}
          >
            {data.subtitle}
          </div>
        </div>
      </div>
    );
  }

  if (data.isPlaceholder) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          border: `1px solid ${data.accent}66`,
          borderRadius: 18,
          background: `linear-gradient(135deg, ${data.accent}12 0%, #071426b3 55%, #050b18cc 100%)`,
          boxShadow: `inset 0 0 20px ${data.accent}10`,
          pointerEvents: "none",
          overflow: "hidden",
          position: "relative",
          padding: "10px 12px",
        }}
      >
        <div
          style={{
            color: "#cbd5e1",
            fontSize: 11,
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: 0.35,
            textTransform: "uppercase",
          }}
        >
          {data.title}
        </div>
        <div
          style={{
            marginTop: 4,
            color: data.accent,
            fontSize: 8,
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        >
          Slot chưa có dữ liệu
        </div>
        <div
          style={{
            position: "absolute",
            right: 12,
            bottom: 10,
            width: 42,
            height: 3,
            borderRadius: 999,
            background: data.accent,
            boxShadow: `0 0 14px ${data.accent}`,
            opacity: 0.85,
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        border: `1px solid ${data.accent}66`,
        borderRadius: 24,
        background: data.isPlaceholder
          ? `linear-gradient(135deg, ${data.accent}0d 0%, #07142699 42%, #050b18aa 100%)`
          : `linear-gradient(135deg, ${data.accent}16 0%, #071426d9 42%, #050b18e8 100%)`,
        boxShadow: data.isPlaceholder
          ? `inset 0 0 24px ${data.accent}0d`
          : `inset 0 0 38px ${data.accent}12, 0 0 20px ${data.accent}10`,
        pointerEvents: "none",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          padding: "16px 18px 8px",
          color: data.isPlaceholder ? "#94a3b8" : "#f8fafc",
          fontSize: 15,
          fontWeight: 900,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          textShadow: `0 0 14px ${data.accent}66`,
        }}
      >
        {data.title}
      </div>
      <div
        style={{
          padding: "0 18px",
          color: "#94a3b8",
          fontSize: 10,
          lineHeight: 1.35,
          maxWidth: 300,
        }}
      >
        {data.subtitle}
      </div>
      <div
        style={{
          position: "absolute",
          inset: "auto 18px 12px auto",
          width: 58,
          height: 3,
          borderRadius: 999,
          background: data.accent,
          boxShadow: `0 0 18px ${data.accent}`,
          opacity: 0.75,
        }}
      />
      {data.isPlaceholder && (
        <div
          style={{
            position: "absolute",
            inset: "auto 14px 14px 14px",
            color: data.accent,
            fontSize: 9,
            fontWeight: 700,
            opacity: 0.8,
          }}
        >
          Slot chưa có dữ liệu
        </div>
      )}
    </div>
  );
}

const nodeTypes = { system: SystemNode, zone: ZoneNode };

// Zone background regions share the node id prefix "zone-" (see
// `layoutNodes`'s `zones` array below) — used to tell them apart from
// system nodes anywhere we only have an id to go on (e.g. inside MiniMap).
function isZoneNodeId(id: string): boolean {
  return id.startsWith("zone-");
}

function zoneKeyFromNodeId(id: string): SystemZoneKey | null {
  if (id === "zone-core") return "core";
  if (!id.startsWith("zone-")) return null;
  const key = id.replace("zone-", "") as EcosystemGroupKey;
  return key in ECOSYSTEM_GROUPS ? key : null;
}

// React Flow's <MiniMap> renders every node with a measured width/height
// that isn't `hidden` (see @reactflow/minimap's node selector) — that
// includes the six full-size zone background regions, which have no
// `system` to color by and end up as large default-colored blocks
// swamping the actual system dots. Zones are layout chrome, not part of
// the map being summarized, so exclude them from the minimap entirely
// instead of trying to pick a color for them.
function ArchitectureMiniMapNode(props: MiniMapNodeProps) {
  if (isZoneNodeId(props.id)) return null;
  const {
    id,
    x,
    y,
    width,
    height,
    color,
    strokeColor,
    strokeWidth,
    className,
    borderRadius,
    onClick,
  } = props;
  return (
    <rect
      className={className}
      x={x}
      y={y}
      rx={borderRadius}
      ry={borderRadius}
      width={width}
      height={height}
      fill={color}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      onClick={onClick ? (event) => onClick(event, id) : undefined}
    />
  );
}

// ─── Glow Edge ────────────────────────────────────────────────────────────────
function GlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const strokeColor = (style?.stroke as string) ?? "#6b7280";
  const strokeWidth = Number(style?.strokeWidth ?? 1.5);
  const edgeOpacity = Number(style?.opacity ?? 1);
  const zoom = useStore(zoomSelector);
  // Below this zoom, edge labels are unreadable anyway and just add noise
  // to an already-dense set of crossing lines — hide instead of rendering
  // illegible 8px text (.ai/architecture-overview-ux-review.md, P1.2).
  const showLabel = label && zoom >= COMPACT_ZOOM_THRESHOLD;

  return (
    <>
      {data?.isHighCritical && (
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 6}
          opacity={edgeOpacity * 0.12}
        />
      )}
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: "#0f172a",
              color: strokeColor,
              fontSize: 8,
              fontWeight: 500,
              borderRadius: 4,
              padding: "2px 5px",
              opacity: edgeOpacity > 0.5 ? 0.85 : 0.25,
              pointerEvents: "none",
            }}
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
const edgeTypes = { glow: GlowEdge };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function healthPriority(h: string) {
  return h === "down" ? 3 : h === "degraded" ? 2 : h === "unknown" ? 1 : 0;
}
type IntegrationMetrics = {
  inCount: number;
  outCount: number;
  worstHealth: string;
};

type EdgeFocus = "all" | "critical" | "issues" | "nonCompliant" | "realtime";
type MapMode = "ecosystem" | "risk";

type ArchitectureZone = {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
  accent: string;
  isPlaceholder?: boolean;
};

type ArchitectureLayout = {
  positions: Record<string, { x: number; y: number }>;
  centralIds: Set<string>;
  zones: ArchitectureZone[];
  metrics: globalThis.Map<string, IntegrationMetrics>;
};

type EcosystemGroupKey =
  | "workspace"
  | "learning"
  | "automation"
  | "platform"
  | "pilot"
  | "legacy";

type SystemZoneKey = EcosystemGroupKey | "core";
type ZoneFocus = SystemZoneKey | null;

type EcosystemGroupConfig = {
  title: string;
  subtitle: string;
  accent: string;
};

const ECOSYSTEM_GROUPS: Record<EcosystemGroupKey, EcosystemGroupConfig> = {
  workspace: {
    title: "Vận hành & Workspace",
    subtitle: "ERP, CRM, HR, tài chính, cổng nội bộ và công cụ tác nghiệp",
    accent: "#22c55e",
  },
  learning: {
    title: "Học thuật & Trải nghiệm",
    subtitle: "SIS, LMS, tuyển sinh, phụ huynh, học sinh và dịch vụ trường",
    accent: "#38bdf8",
  },
  automation: {
    title: "Tích hợp & Tự động hoá",
    subtitle: "API, workflow, event, đồng bộ dữ liệu và tác vụ tự động",
    accent: "#f97316",
  },
  platform: {
    title: "Dữ liệu & Nền tảng",
    subtitle: "BI, data, identity, cloud, database và hạ tầng dùng chung",
    accent: "#8b5cf6",
  },
  pilot: {
    title: "Pilot / thử nghiệm",
    subtitle: "Sáng kiến đang kiểm chứng trước khi đưa vào lõi vận hành",
    accent: "#3b82f6",
  },
  legacy: {
    title: "Legacy / chuyển đổi",
    subtitle: "Hệ thống nợ kỹ thuật, sunset hoặc cần tách khỏi lõi",
    accent: "#f59e0b",
  },
};

function classifyEcosystemGroup(system: System): EcosystemGroupKey {
  const text = `${system.category} ${system.name} ${system.description ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");

  if (
    system.type === "legacy" ||
    system.status === "sunset" ||
    system.status === "inactive" ||
    system.technicalDebtScore >= 75
  ) {
    return "legacy";
  }
  if (system.type === "pilot" || system.status === "pilot") return "pilot";
  if (
    /\b(api|integration|integrations|workflow|automation|sync|etl|event|queue|middleware|ipaas)\b/.test(
      text,
    )
  ) {
    return "automation";
  }
  if (
    /\b(bi|data|analytics|warehouse|lake|database|db|identity|iam|sso|security|infra|infrastructure|cloud|network)\b/.test(
      text,
    )
  ) {
    return "platform";
  }
  if (
    /\b(sis|lms|learning|academic|student|parent|admission|admissions|library|school|campus|curriculum|assessment)\b/.test(
      text,
    )
  ) {
    return "learning";
  }
  return "workspace";
}

function placeGrid(
  items: System[],
  x: number,
  y: number,
  columns: number,
  positions: Record<string, { x: number; y: number }>,
) {
  const nodeW = 146;
  const nodeH = 86;
  const gapX = 12;
  const gapY = 12;
  items.forEach((system, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    positions[system._id] = {
      x: x + 16 + col * (nodeW + gapX),
      y: y + 56 + row * (nodeH + gapY),
    };
  });
}

function zoneSizeFor(count: number) {
  // A fixed 1-2 column grid makes zone height grow linearly with count —
  // a real dataset skewed toward one bucket (e.g. many systems falling
  // through to the "workspace" catch-all in classifyEcosystemGroup) can
  // produce a zone thousands of pixels tall that dwarfs its row neighbor
  // and forces fitView far past what's still readable
  // (.ai/architecture-overview-ux-review.md, P1.4 — verified numerically:
  // 30 systems in one group was ~2546px tall under the old formula).
  // Scaling columns with sqrt(count) keeps the zone closer to
  // square-shaped instead of an ever-taller single/double column. Cap at
  // three columns so the 4-corner ecosystem layout stays balanced instead of
  // becoming a very wide infographic.
  const columns = count <= 3 ? 1 : Math.min(3, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / columns);
  const width =
    columns === 1 ? 184 : 16 + columns * 146 + (columns - 1) * 12 + 24;
  return {
    columns,
    rows,
    width,
    height: Math.max(150, 64 + rows * 86 + (rows - 1) * 12 + 18),
  };
}

function buildIntegrationMetrics(integrations: Integration[]) {
  const metrics = new globalThis.Map<string, IntegrationMetrics>();
  const getMetrics = (systemId: string) => {
    const current = metrics.get(systemId);
    if (current) return current;
    const initial = { inCount: 0, outCount: 0, worstHealth: "unknown" };
    metrics.set(systemId, initial);
    return initial;
  };

  for (const integration of integrations) {
    const source = getMetrics(integration.sourceSystemId);
    const destination = getMetrics(integration.destinationSystemId);
    source.outCount += 1;
    destination.inCount += 1;

    for (const item of [source, destination]) {
      if (
        item.worstHealth === "unknown" ||
        healthPriority(integration.healthStatus) >
          healthPriority(item.worstHealth)
      ) {
        item.worstHealth = integration.healthStatus;
      }
    }
  }

  return metrics;
}

function worstHealthFor(sysId: string, integrations: Integration[]): string {
  const connected = integrations.filter(
    (integration) =>
      integration.sourceSystemId === sysId ||
      integration.destinationSystemId === sysId,
  );
  if (!connected.length) return "unknown";
  return connected.reduce(
    (worst, integration) =>
      healthPriority(integration.healthStatus) > healthPriority(worst)
        ? integration.healthStatus
        : worst,
    "healthy",
  );
}

type RiskRecommendation = {
  tone: "high" | "medium" | "low";
  title: string;
  detail: string;
};

function buildRiskRecommendations(
  system: System,
  connectedIntegrations: Integration[],
): RiskRecommendation[] {
  const worstHealth = worstHealthFor(system._id, connectedIntegrations);
  const nonCompliant = connectedIntegrations.filter(
    (integration) => !integration.isArchitectureCompliant,
  );
  const failingFlows = connectedIntegrations.filter((integration) =>
    ["degraded", "down"].includes(integration.healthStatus),
  );
  const criticalFlows = connectedIntegrations.filter(
    (integration) => integration.criticalLevel === "high",
  );
  const errorFlows = connectedIntegrations.filter(
    (integration) => (integration.errorRate ?? 0) > 0,
  );
  const recommendations: RiskRecommendation[] = [];

  if (system.riskLevel === "high" || worstHealth === "down") {
    recommendations.push({
      tone: "high",
      title: "Ưu tiên xử lý trong phiên điều hành gần nhất",
      detail:
        "Đưa hệ thống vào danh sách theo dõi CTO, xác định owner chịu trách nhiệm và cập nhật ETA khắc phục.",
    });
  }

  if (system.technicalDebtScore >= 70) {
    recommendations.push({
      tone: "high",
      title: "Lập backlog giảm nợ kỹ thuật",
      detail:
        "Tách các hạng mục nâng cấp nền tảng, chuẩn hoá dữ liệu và loại bỏ phụ thuộc cũ trước khi mở rộng tính năng.",
    });
  } else if (system.technicalDebtScore >= 40) {
    recommendations.push({
      tone: "medium",
      title: "Theo dõi nợ kỹ thuật theo quý",
      detail:
        "Giữ ngưỡng cảnh báo cho các module có xu hướng xuống cấp và rà soát chi phí duy trì.",
    });
  }

  if (failingFlows.length > 0) {
    recommendations.push({
      tone: worstHealth === "down" ? "high" : "medium",
      title: "Kiểm tra các luồng degraded/down",
      detail: `${failingFlows.length} tích hợp đang có vấn đề sức khoẻ; ưu tiên luồng realtime hoặc luồng ảnh hưởng dữ liệu vận hành.`,
    });
  }

  if (nonCompliant.length > 0) {
    recommendations.push({
      tone: "medium",
      title: "Chuẩn hoá tích hợp chưa tuân thủ",
      detail: `${nonCompliant.length} luồng chưa đạt chuẩn kiến trúc; cần rà lại protocol, ownership, logging và cơ chế retry.`,
    });
  }

  if (criticalFlows.length > 0 && system.criticality === "high") {
    recommendations.push({
      tone: "medium",
      title: "Xác nhận phương án dự phòng cho luồng critical",
      detail: `${criticalFlows.length} luồng critical liên quan hệ thống trọng yếu; nên kiểm tra SLA, fallback và cảnh báo sự cố.`,
    });
  }

  if (errorFlows.length > 0) {
    recommendations.push({
      tone: "medium",
      title: "Giảm error rate của tích hợp",
      detail: `${errorFlows.length} luồng đang ghi nhận lỗi; cần xem log đồng bộ, dữ liệu đầu vào và retry policy.`,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      tone: "low",
      title: "Duy trì trạng thái ổn định",
      detail:
        "Tiếp tục theo dõi health, chi phí và thay đổi module để tránh tích luỹ rủi ro âm thầm.",
    });
  }

  return recommendations.slice(0, 5);
}
function layoutNodes(
  systems: System[],
  integrations: Integration[],
): ArchitectureLayout {
  const metrics = buildIntegrationMetrics(integrations);
  const positions: Record<string, { x: number; y: number }> = {};

  if (!systems.length) {
    return { positions, centralIds: new Set(), zones: [], metrics };
  }

  const centralityScore = (system: System) => {
    const m = metrics.get(system._id);
    const connectionScore = (m?.inCount ?? 0) + (m?.outCount ?? 0);
    return (
      connectionScore * 4 +
      (system.type === "core" ? 18 : 0) +
      (system.criticality === "high" ? 8 : 0) +
      (system.status === "active" ? 3 : 0) +
      Math.round(system.architectureScore / 25)
    );
  };

  const sorted = [...systems].sort((a, b) => {
    const scoreDelta = centralityScore(b) - centralityScore(a);
    if (scoreDelta !== 0) return scoreDelta;
    return a.name.localeCompare(b.name);
  });
  const centralCount = Math.min(
    systems.length > 14 ? 3 : systems.length > 7 ? 2 : 1,
    systems.length,
  );
  const centralIds = new Set(sorted.slice(0, centralCount).map((s) => s._id));

  const central = sorted.filter((system) => centralIds.has(system._id));
  const satellites = sorted.filter((system) => !centralIds.has(system._id));

  const groups = new globalThis.Map<EcosystemGroupKey, System[]>();
  (Object.keys(ECOSYSTEM_GROUPS) as EcosystemGroupKey[]).forEach((key) => {
    groups.set(key, []);
  });
  satellites.forEach((system) => {
    groups.get(classifyEcosystemGroup(system))!.push(system);
  });

  const zones: ArchitectureZone[] = [];
  const quadrantGapX = 48;
  const quadrantGapY = 28;
  const stackGap = 8;
  const canvasLeft = 10;
  const canvasTop = 18;
  const coreWidth = 270;
  const centralGap = 96;
  const centralHeight = Math.max(286, 96 + central.length * centralGap);
  const zoneSpecs = new globalThis.Map<
    EcosystemGroupKey,
    {
      items: System[];
      config: EcosystemGroupConfig;
      columns: number;
      width: number;
      height: number;
      isPlaceholder: boolean;
    }
  >();

  groups.forEach((items, key) => {
    const config = ECOSYSTEM_GROUPS[key];
    const isPlaceholder = items.length === 0;
    const size = isPlaceholder
      ? { columns: 1, rows: 1, width: 142, height: 58 }
      : zoneSizeFor(items.length);
    zoneSpecs.set(key, {
      items,
      config,
      columns: size.columns,
      width: size.width,
      height: size.height,
      isPlaceholder,
    });
  });

  const zoneHeight = (key: EcosystemGroupKey) =>
    zoneSpecs.get(key)?.height ?? 0;
  const zoneWidth = (key: EcosystemGroupKey) => zoneSpecs.get(key)?.width ?? 0;
  const maxZoneWidth = (keys: EcosystemGroupKey[]) =>
    Math.max(...keys.map((key) => zoneWidth(key)), 168);
  const leftKeys: EcosystemGroupKey[] = ["workspace", "platform", "pilot"];
  const rightKeys: EcosystemGroupKey[] = ["learning", "automation", "legacy"];
  const leftWidth = maxZoneWidth(leftKeys);
  const rightWidth = maxZoneWidth(rightKeys);
  const topRowHeight = Math.max(
    zoneHeight("workspace"),
    zoneHeight("learning"),
  );
  const leftX = canvasLeft;
  const coreX = leftX + leftWidth + quadrantGapX;
  const rightX = coreX + coreWidth + quadrantGapX;
  const coreY = canvasTop + topRowHeight + quadrantGapY;
  const bottomRowY = coreY + centralHeight + quadrantGapY;

  const placeZone = (key: EcosystemGroupKey, x: number, y: number) => {
    const spec = zoneSpecs.get(key);
    if (!spec) return;
    const issueCount = spec.items.filter((system) =>
      ["degraded", "down"].includes(
        metrics.get(system._id)?.worstHealth ?? "unknown",
      ),
    ).length;
    const highDebtCount = spec.items.filter(
      (system) => system.technicalDebtScore >= 70,
    ).length;
    const statusNotes = [
      spec.isPlaceholder ? "Chưa có hệ thống" : `${spec.items.length} hệ thống`,
      issueCount ? `${issueCount} cần chú ý` : null,
      highDebtCount ? `${highDebtCount} nợ kỹ thuật cao` : null,
    ].filter(Boolean);
    if (!spec.isPlaceholder) {
      placeGrid(spec.items, x, y, spec.columns, positions);
    }
    zones.push({
      id: `zone-${key}`,
      title: spec.config.title,
      subtitle: `${statusNotes.join(" · ")} · ${spec.config.subtitle}`,
      x,
      y,
      width: spec.width,
      height: spec.height,
      accent: spec.config.accent,
      isPlaceholder: spec.isPlaceholder,
    });
  };

  const placeInQuadrant = (
    key: EcosystemGroupKey,
    x: number,
    y: number,
    width: number,
  ) => {
    const spec = zoneSpecs.get(key);
    if (!spec) return;
    placeZone(key, x + (width - spec.width) / 2, y);
  };

  placeInQuadrant(
    "workspace",
    leftX,
    canvasTop + topRowHeight - zoneHeight("workspace"),
    leftWidth,
  );
  placeInQuadrant(
    "learning",
    rightX,
    canvasTop + topRowHeight - zoneHeight("learning"),
    rightWidth,
  );

  const placeStack = (
    keys: EcosystemGroupKey[],
    x: number,
    y: number,
    width: number,
  ) => {
    let cursorY = y;
    keys.forEach((key) => {
      const spec = zoneSpecs.get(key);
      if (!spec) return;
      placeZone(key, x + (width - spec.width) / 2, cursorY);
      cursorY += spec.height + stackGap;
    });
  };

  const centralBlockHeight = 86 + (central.length - 1) * centralGap;
  const centralStartY =
    coreY + Math.max(72, (centralHeight - centralBlockHeight) / 2 + 22);
  central.forEach((system, index) => {
    positions[system._id] = {
      x: coreX + (coreWidth - 172) / 2,
      y: centralStartY + index * centralGap,
    };
  });
  zones.push({
    id: "zone-core",
    title: "Lõi dữ liệu & điều phối hệ thống",
    subtitle:
      central.length === 1
        ? "Trung tâm dữ liệu, kết nối và điều phối các vệ tinh vận hành"
        : `${central.length} hub trung tâm điều phối dữ liệu, kết nối và luồng vận hành`,
    x: coreX,
    y: coreY,
    width: coreWidth,
    height: centralHeight,
    accent: "#a78bfa",
  });
  placeStack(["platform", "pilot"], leftX, bottomRowY, leftWidth);
  placeStack(["automation", "legacy"], rightX, bottomRowY, rightWidth);

  return {
    positions,
    centralIds,
    metrics,
    zones,
  };
}

// ─── Module Form ─────────────────────────────────────────────────────────────
type ModuleFormData = {
  name: string;
  lifecycle: SystemModule["lifecycle"];
  health: SystemModule["health"];
  version: string;
  description: string;
  notes: string;
  plannedDate: string;
  usedBy: string;
};
const defaultModuleForm: ModuleFormData = {
  name: "",
  lifecycle: "in_use",
  health: "healthy",
  version: "",
  description: "",
  notes: "",
  plannedDate: "",
  usedBy: "",
};

function ModuleForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<ModuleFormData>;
  onSave: (d: ModuleFormData) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<ModuleFormData>(() => {
    const src = (initial ?? {}) as Record<string, unknown>;
    return Object.keys(defaultModuleForm).reduce<ModuleFormData>(
      (acc, k) => ({
        ...acc,
        [k]: k in src ? src[k] : defaultModuleForm[k as keyof ModuleFormData],
      }),
      { ...defaultModuleForm },
    );
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ModuleFormData>(k: K, v: ModuleFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(t("common.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          (err instanceof Error ? err.message : t("common.saveFailed")),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{t("module.name")}</Label>
        <Input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={t("module.namePlaceholder")}
          className="bg-input"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>{t("module.lifecycle")}</Label>
          <Select
            value={form.lifecycle}
            onValueChange={(v) =>
              set("lifecycle", v as ModuleFormData["lifecycle"])
            }
          >
            <SelectTrigger className="bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.keys(LIFECYCLE_META) as (keyof typeof LIFECYCLE_META)[]
              ).map((lc) => (
                <SelectItem key={lc} value={lc}>
                  {t(`lifecycle.${lc}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t("module.health")}</Label>
          <Select
            value={form.health}
            onValueChange={(v) => set("health", v as ModuleFormData["health"])}
          >
            <SelectTrigger className="bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(HEALTH_META) as (keyof typeof HEALTH_META)[]).map(
                (h) => (
                  <SelectItem key={h} value={h}>
                    {t(`health.${h}`)}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>{t("module.version")}</Label>
          <Input
            value={form.version}
            onChange={(e) => set("version", e.target.value)}
            placeholder={t("module.versionPlaceholder")}
            className="bg-input"
          />
        </div>
        <div className="space-y-1">
          <Label>{t("module.targetDate")}</Label>
          <Input
            type="date"
            value={form.plannedDate}
            onChange={(e) => set("plannedDate", e.target.value)}
            className="bg-input"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>
          {t("module.usedBy")}{" "}
          <span className="text-muted-foreground text-[10px]">
            {t("module.usedByHint")}
          </span>
        </Label>
        <Input
          value={form.usedBy}
          onChange={(e) => set("usedBy", e.target.value)}
          placeholder={t("module.usedByPlaceholder")}
          className="bg-input"
        />
      </div>
      <div className="space-y-1">
        <Label>{t("common.description")}</Label>
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          className="bg-input"
        />
      </div>
      <div className="space-y-1">
        <Label>{t("common.notes")}</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          className="bg-input"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("common.saving") : t("module.saveModule")}
        </Button>
      </div>
    </div>
  );
}

// ─── Module section ───────────────────────────────────────────────────────────
function ModuleRow({
  mod,
  canWrite,
  onEdit,
  onDelete,
}: {
  mod: SystemModule;
  canWrite: boolean;
  onEdit: (m: SystemModule) => void;
  onDelete: (id: SystemModule["_id"]) => void;
}) {
  const { t } = useLanguage();
  const lm = LIFECYCLE_META[mod.lifecycle] ?? LIFECYCLE_META.in_use;
  const hm = HEALTH_META[mod.health] ?? HEALTH_META.unknown;
  const Icon = lm.Icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg border cursor-pointer transition-all"
      style={{
        borderColor: expanded ? lm.color + "55" : "#1e293b",
        background: expanded ? lm.bg : "#0d1526",
      }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: lm.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold truncate">{mod.name}</span>
            {mod.version && (
              <span className="text-[9px] text-muted-foreground font-mono bg-muted px-1 py-0.5 rounded shrink-0">
                {mod.version}
              </span>
            )}
          </div>
        </div>
        {(mod.lifecycle === "in_use" || mod.lifecycle === "deprecated") && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: hm.color }}
          />
        )}
        {mod.plannedDate && mod.lifecycle !== "in_use" && (
          <span className="text-[9px] shrink-0" style={{ color: lm.color }}>
            {mod.plannedDate.slice(0, 7)}
          </span>
        )}
        {canWrite && (
          <div
            className="flex gap-0.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onEdit(mod)}
              className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-colors cursor-pointer"
            >
              <Edit className="h-3 w-3" />
            </button>
            <button
              onClick={() => onDelete(mod._id)}
              className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
        <span className="text-muted-foreground text-xs ml-0.5">
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {expanded && (
        <div
          className="px-3 pb-3 space-y-2 border-t"
          style={{ borderColor: lm.color + "33" }}
        >
          <div className="flex flex-wrap gap-1.5 pt-2">
            <span
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: lm.bg,
                color: lm.color,
                border: `1px solid ${lm.color}44`,
              }}
            >
              <Icon className="h-2.5 w-2.5" />
              {t(`lifecycle.${mod.lifecycle}`)}
            </span>
            {(mod.lifecycle === "in_use" || mod.lifecycle === "deprecated") && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: hm.color + "22",
                  color: hm.color,
                  border: `1px solid ${hm.color}44`,
                }}
              >
                {t(`health.${mod.health}`)}
              </span>
            )}
          </div>
          {mod.description && (
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {mod.description}
            </p>
          )}
          {mod.notes && (
            <div
              className="rounded px-2.5 py-1.5 text-[10px] leading-relaxed"
              style={{
                background: lm.color + "15",
                color: lm.color,
                border: `1px solid ${lm.color}33`,
              }}
            >
              📌 {mod.notes}
            </div>
          )}
          {mod.usedBy.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {mod.usedBy.map((u) => (
                <span
                  key={u}
                  className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded"
                >
                  {u}
                </span>
              ))}
            </div>
          )}
          {mod.plannedDate && (
            <div className="text-[10px] text-muted-foreground">
              {t("module.target")}{" "}
              <span className="font-medium" style={{ color: lm.color }}>
                {mod.plannedDate}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModulesTab({
  modules,
  canWrite,
  onAdd,
  onEdit,
  onDelete,
}: {
  modules: SystemModule[];
  canWrite: boolean;
  onAdd: () => void;
  onEdit: (m: SystemModule) => void;
  onDelete: (id: SystemModule["_id"]) => void;
}) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<string>("all");

  const lifecycles = useMemo(() => {
    const seen = new Set(modules.map((m) => m.lifecycle));
    return (
      Object.keys(LIFECYCLE_META) as (keyof typeof LIFECYCLE_META)[]
    ).filter((k) => seen.has(k as SystemModule["lifecycle"]));
  }, [modules]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    modules.forEach((m) => {
      c[m.lifecycle] = (c[m.lifecycle] ?? 0) + 1;
    });
    return c;
  }, [modules]);

  const filtered = useMemo(() => {
    const sorted = [...modules].sort((a, b) => {
      const oa = LIFECYCLE_META[a.lifecycle]?.order ?? 99;
      const ob = LIFECYCLE_META[b.lifecycle]?.order ?? 99;
      return oa !== ob ? oa - ob : a.sortOrder - b.sortOrder;
    });
    if (filter === "all") return sorted;
    return sorted.filter((m) => m.lifecycle === filter);
  }, [modules, filter]);

  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
        <Layers className="h-8 w-8 opacity-30" />
        <p className="text-sm">{t("module.noModules")}</p>
        {canWrite && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onAdd}
            className="gap-1.5 mt-1"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("module.addModule")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canWrite && (
        <Button
          size="sm"
          variant="outline"
          onClick={onAdd}
          className="gap-1.5 w-full"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("module.addModule")}
        </Button>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className="text-[10px] px-2.5 py-1 rounded-full font-medium cursor-pointer transition-all border"
          style={{
            background: filter === "all" ? "#ffffff22" : "transparent",
            borderColor: filter === "all" ? "#ffffff44" : "#1e293b",
            color: filter === "all" ? "#fff" : "#64748b",
          }}
        >
          {t("module.all")} {modules.length}
        </button>
        {lifecycles.map((lc) => {
          const lm = LIFECYCLE_META[lc];
          const Icon = lm.Icon;
          return (
            <button
              key={lc}
              onClick={() => setFilter(filter === lc ? "all" : lc)}
              className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-medium cursor-pointer transition-all border"
              style={{
                background: filter === lc ? lm.bg : "transparent",
                borderColor: filter === lc ? lm.color + "88" : "#1e293b",
                color: filter === lc ? lm.color : "#64748b",
              }}
            >
              <Icon className="h-2.5 w-2.5" />
              {t(`lifecycle.${lc}`)} {counts[lc] ?? 0}
            </button>
          );
        })}
      </div>
      <div className="space-y-1.5">
        {filtered.map((mod) => (
          <ModuleRow
            key={mod._id}
            mod={mod}
            canWrite={canWrite}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
type PanelTab = "overview" | "modules" | "integrations";

function DetailPanel({
  system,
  integrations,
  systems,
  modules,
  onClose,
  onSelectIntegration,
}: {
  system: System;
  integrations: Integration[];
  systems: System[];
  modules: SystemModule[];
  onClose: () => void;
  onSelectIntegration: (id: Id<"integrations">) => void;
}) {
  const { canWrite } = useCurrentUser();
  const { t } = useLanguage();
  const createModule = useMutation(api.system_modules.create);
  const updateModule = useMutation(api.system_modules.update);
  const removeModule = useMutation(api.system_modules.remove);

  const [showModuleForm, setShowModuleForm] = useState(false);
  const [editingModule, setEditingModule] = useState<SystemModule | null>(null);

  const meta = TYPE_META[system.type] ?? TYPE_META.core;
  const outbound = useMemo(
    () => integrations.filter((i) => i.sourceSystemId === system._id),
    [integrations, system._id],
  );
  const inbound = useMemo(
    () => integrations.filter((i) => i.destinationSystemId === system._id),
    [integrations, system._id],
  );
  const connectedSystemIntegrations = useMemo(
    () => [...outbound, ...inbound],
    [outbound, inbound],
  );
  const riskRecommendations = useMemo(
    () => buildRiskRecommendations(system, connectedSystemIntegrations),
    [system, connectedSystemIntegrations],
  );
  const [activeTab, setActiveTab] = useState<PanelTab>("modules");

  const handleCreateModule = async (data: ModuleFormData) => {
    await createModule({
      systemId: system._id,
      name: data.name,
      lifecycle: data.lifecycle,
      health: data.health,
      version: data.version || undefined,
      description: data.description || undefined,
      notes: data.notes || undefined,
      plannedDate: data.plannedDate || undefined,
      usedBy: data.usedBy
        ? data.usedBy
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      sortOrder: modules.length,
    });
    toast.success(t("toast.moduleAdded"));
  };

  const handleUpdateModule = async (data: ModuleFormData) => {
    if (!editingModule) return;
    await updateModule({
      id: editingModule._id,
      name: data.name,
      lifecycle: data.lifecycle,
      health: data.health,
      version: data.version || undefined,
      description: data.description || undefined,
      notes: data.notes || undefined,
      plannedDate: data.plannedDate || undefined,
      usedBy: data.usedBy
        ? data.usedBy
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    });
    toast.success(t("toast.moduleUpdated"));
  };

  const handleDeleteModule = async (id: SystemModule["_id"]) => {
    await removeModule({ id });
    toast.success(t("toast.moduleDeleted"));
  };

  const moduleCount = modules.length;
  const inUseCnt = modules.filter((m) => m.lifecycle === "in_use").length;
  const plannedCnt = modules.filter(
    (m) => m.lifecycle === "planned" || m.lifecycle === "in_development",
  ).length;
  const depCnt = modules.filter(
    (m) => m.lifecycle === "deprecated" || m.lifecycle === "retired",
  ).length;

  const TABS: { id: PanelTab; label: string; count?: number }[] = [
    { id: "modules", label: t("detail.modules"), count: moduleCount },
    {
      id: "integrations",
      label: t("detail.integrations"),
      count: outbound.length + inbound.length,
    },
    { id: "overview", label: t("detail.overview") },
  ];

  return (
    <div className="w-[340px] border-l border-border bg-background flex flex-col overflow-hidden shrink-0">
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0"
        style={{ background: meta.bg }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Server className="h-4 w-4 shrink-0" style={{ color: meta.badge }} />
          <div className="min-w-0">
            <div
              className="font-bold text-sm truncate"
              style={{ color: meta.text }}
            >
              {system.name}
            </div>
            <div
              className="text-[10px] opacity-60"
              style={{ color: meta.text }}
            >
              {system.category} · {t(`systemType.${system.type}`)}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {moduleCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/10 shrink-0">
          <span className="text-[10px] text-muted-foreground">
            {moduleCount} {t("detail.modules").toLowerCase()}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-green-400">
              {inUseCnt} {t("detail.active")}
            </span>
          </div>
          {plannedCnt > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] text-blue-400">
                {plannedCnt} {t("detail.upcoming")}
              </span>
            </div>
          )}
          {depCnt > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-[10px] text-yellow-400">
                {depCnt} {t("detail.deprecated")}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex border-b border-border shrink-0 bg-muted/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium cursor-pointer transition-colors border-b-2"
            style={{
              borderBottomColor:
                activeTab === tab.id ? meta.badge : "transparent",
              color: activeTab === tab.id ? "#fff" : "#64748b",
              background: activeTab === tab.id ? meta.bg + "88" : "transparent",
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className="text-[9px] rounded-full px-1.5 py-0.5 font-mono"
                style={{
                  background:
                    activeTab === tab.id ? meta.badge + "55" : "#1e293b",
                  color: activeTab === tab.id ? meta.text : "#64748b",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "modules" && (
          <ModulesTab
            modules={modules}
            canWrite={canWrite}
            onAdd={() => setShowModuleForm(true)}
            onEdit={(m) => setEditingModule(m)}
            onDelete={handleDeleteModule}
          />
        )}

        {activeTab === "integrations" && (
          <div className="space-y-4">
            {outbound.length > 0 && (
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2 flex items-center gap-1.5">
                  <ArrowRight className="h-3 w-3" /> {t("detail.outbound")} (
                  {outbound.length})
                </div>
                <div className="space-y-1.5">
                  {outbound.map((intg) => {
                    const dest = systems.find(
                      (s) => s._id === intg.destinationSystemId,
                    );
                    const hc =
                      HEALTH_META[intg.healthStatus] ?? HEALTH_META.unknown;
                    const mc = METHOD_META[intg.method] ?? METHOD_META.manual;
                    return (
                      <button
                        type="button"
                        key={intg._id}
                        onClick={() => onSelectIntegration(intg._id)}
                        className="w-full bg-muted/30 rounded-lg p-2.5 space-y-1.5 border text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ borderColor: hc.color + "33" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold truncate">
                            {dest?.name ?? t("detail.unknown")}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                            style={{
                              background: hc.color + "22",
                              color: hc.color,
                            }}
                          >
                            {t(`health.${intg.healthStatus}`)}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {intg.name}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono">
                            {intg.protocol}
                          </span>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                            style={{
                              background: mc.color + "22",
                              color: mc.color,
                            }}
                          >
                            {t(`method.${intg.method}`)}
                          </span>
                          {!intg.isArchitectureCompliant && (
                            <span className="text-[9px] text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">
                              {t("detail.nonCompliant")}
                            </span>
                          )}
                          {intg.errorRate !== undefined &&
                            intg.errorRate > 0 && (
                              <span className="text-[9px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
                                {t("detail.error")} {intg.errorRate}%
                              </span>
                            )}
                        </div>
                        {intg.lastSync && (
                          <div className="text-[9px] text-muted-foreground">
                            {t("detail.lastSync")}:{" "}
                            {intg.lastSync.slice(0, 16).replace("T", " ")}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {inbound.length > 0 && (
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2 flex items-center gap-1.5">
                  <ArrowLeft className="h-3 w-3" /> {t("detail.inbound")} (
                  {inbound.length})
                </div>
                <div className="space-y-1.5">
                  {inbound.map((intg) => {
                    const src = systems.find(
                      (s) => s._id === intg.sourceSystemId,
                    );
                    const hc =
                      HEALTH_META[intg.healthStatus] ?? HEALTH_META.unknown;
                    const mc = METHOD_META[intg.method] ?? METHOD_META.manual;
                    return (
                      <button
                        type="button"
                        key={intg._id}
                        onClick={() => onSelectIntegration(intg._id)}
                        className="w-full bg-muted/30 rounded-lg p-2.5 space-y-1.5 border text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ borderColor: hc.color + "33" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold truncate">
                            {src?.name ?? t("detail.unknown")}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                            style={{
                              background: hc.color + "22",
                              color: hc.color,
                            }}
                          >
                            {t(`health.${intg.healthStatus}`)}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {intg.name}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono">
                            {intg.protocol}
                          </span>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                            style={{
                              background: mc.color + "22",
                              color: mc.color,
                            }}
                          >
                            {t(`method.${intg.method}`)}
                          </span>
                          {!intg.isArchitectureCompliant && (
                            <span className="text-[9px] text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">
                              {t("detail.nonCompliant")}
                            </span>
                          )}
                          {intg.errorRate !== undefined &&
                            intg.errorRate > 0 && (
                              <span className="text-[9px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
                                {t("detail.error")} {intg.errorRate}%
                              </span>
                            )}
                        </div>
                        {intg.lastSync && (
                          <div className="text-[9px] text-muted-foreground">
                            {t("detail.lastSync")}:{" "}
                            {intg.lastSync.slice(0, 16).replace("T", " ")}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {outbound.length === 0 && inbound.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                {t("detail.noIntegrations")}
              </p>
            )}
          </div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <h3 className="text-xs font-semibold">Khuyến nghị xử lý</h3>
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                  {riskRecommendations.length} mục
                </span>
              </div>
              <div className="space-y-2">
                {riskRecommendations.map((item) => {
                  const tone =
                    item.tone === "high"
                      ? {
                          border: "#ef444444",
                          bg: "#ef444414",
                          color: "#fca5a5",
                          Icon: XCircle,
                        }
                      : item.tone === "medium"
                        ? {
                            border: "#f59e0b44",
                            bg: "#f59e0b14",
                            color: "#fcd34d",
                            Icon: AlertTriangle,
                          }
                        : {
                            border: "#22c55e44",
                            bg: "#22c55e12",
                            color: "#86efac",
                            Icon: CheckCircle2,
                          };
                  const Icon = tone.Icon;
                  return (
                    <div
                      key={`${item.tone}-${item.title}`}
                      className="rounded-md border p-2"
                      style={{
                        borderColor: tone.border,
                        background: tone.bg,
                      }}
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <Icon
                          className="h-3 w-3 shrink-0"
                          style={{ color: tone.color }}
                        />
                        <span className="text-[11px] font-semibold">
                          {item.title}
                        </span>
                      </div>
                      <p className="pl-4 text-[10px] leading-relaxed text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: t("detail.status"),
                  value: system.status,
                  color: STATUS_META[system.status]?.color ?? "#6b7280",
                },
                {
                  label: t("detail.criticality"),
                  value: system.criticality,
                  color:
                    system.criticality === "high"
                      ? "#ef4444"
                      : system.criticality === "medium"
                        ? "#f59e0b"
                        : "#22c55e",
                },
                {
                  label: t("detail.riskLevel"),
                  value: system.riskLevel,
                  color:
                    system.riskLevel === "high"
                      ? "#ef4444"
                      : system.riskLevel === "medium"
                        ? "#f59e0b"
                        : "#22c55e",
                },
                {
                  label: t("detail.hosting"),
                  value: system.hosting ?? "—",
                  color: "#64748b",
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-muted/40 rounded-lg p-2">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">
                    {label}
                  </div>
                  <div
                    className="text-xs font-semibold capitalize"
                    style={{ color }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-2.5 w-2.5" />{" "}
                    {t("detail.architectureScore")}
                  </span>
                  <span
                    className="font-mono font-bold"
                    style={{
                      color:
                        system.architectureScore >= 70
                          ? "#22c55e"
                          : system.architectureScore >= 50
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  >
                    {system.architectureScore}/100
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${system.architectureScore}%`,
                      background:
                        system.architectureScore >= 70
                          ? "#22c55e"
                          : system.architectureScore >= 50
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingDown className="h-2.5 w-2.5" />{" "}
                    {t("detail.technicalDebt")}
                  </span>
                  <span
                    className="font-mono font-bold"
                    style={{
                      color:
                        system.technicalDebtScore > 60
                          ? "#ef4444"
                          : system.technicalDebtScore > 30
                            ? "#f59e0b"
                            : "#22c55e",
                    }}
                  >
                    {system.technicalDebtScore}/100
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${system.technicalDebtScore}%`,
                      background:
                        system.technicalDebtScore > 60
                          ? "#ef4444"
                          : system.technicalDebtScore > 30
                            ? "#f59e0b"
                            : "#22c55e",
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {system.technology && (
                <span className="flex items-center gap-1 text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                  <Database className="h-2.5 w-2.5" />
                  {system.technology}
                </span>
              )}
              {system.database && (
                <span className="flex items-center gap-1 text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                  <HardDrive className="h-2.5 w-2.5" />
                  {system.database}
                </span>
              )}
              {system.sla && (
                <span className="flex items-center gap-1 text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                  <Shield className="h-2.5 w-2.5" />
                  {system.sla}
                </span>
              )}
            </div>
            <div className="space-y-1.5 text-xs">
              {system.owner && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("detail.owner")}
                  </span>
                  <span className="font-medium">{system.owner}</span>
                </div>
              )}
              {system.licenseType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("detail.license")}
                  </span>
                  <span className="font-medium">{system.licenseType}</span>
                </div>
              )}
              {system.costPerYear !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("detail.annualCost")}
                  </span>
                  <span className="font-medium">
                    {formatVnd(system.costPerYear)}
                  </span>
                </div>
              )}
              {system.contractEndDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("detail.contractEnd")}
                  </span>
                  <span className="font-medium">{system.contractEndDate}</span>
                </div>
              )}
              {system.departments.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("detail.departments")}
                  </span>
                  <span className="font-medium text-right max-w-[55%]">
                    {system.departments.join(", ")}
                  </span>
                </div>
              )}
              {system.campuses.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("detail.campuses")}
                  </span>
                  <span className="font-medium text-right max-w-[55%]">
                    {system.campuses.join(", ")}
                  </span>
                </div>
              )}
              {system.description && (
                <p className="text-muted-foreground leading-relaxed pt-1">
                  {system.description}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={showModuleForm} onOpenChange={setShowModuleForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("modal.addModule")}</DialogTitle>
          </DialogHeader>
          <ModuleForm
            onSave={handleCreateModule}
            onClose={() => setShowModuleForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingModule}
        onOpenChange={(open) => !open && setEditingModule(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("modal.editModule")}</DialogTitle>
          </DialogHeader>
          {editingModule && (
            <ModuleForm
              initial={{
                name: editingModule.name,
                lifecycle: editingModule.lifecycle,
                health: editingModule.health,
                version: editingModule.version ?? "",
                description: editingModule.description ?? "",
                notes: editingModule.notes ?? "",
                plannedDate: editingModule.plannedDate ?? "",
                usedBy: editingModule.usedBy.join(", "),
              }}
              onSave={handleUpdateModule}
              onClose={() => setEditingModule(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IntegrationInspector({
  integration,
  systems,
  onClose,
  onSelectSystem,
}: {
  integration: Integration;
  systems: System[];
  onClose: () => void;
  onSelectSystem: (id: Id<"software_systems">) => void;
}) {
  const { t } = useLanguage();
  const source = systems.find(
    (system) => system._id === integration.sourceSystemId,
  );
  const destination = systems.find(
    (system) => system._id === integration.destinationSystemId,
  );
  const health = HEALTH_META[integration.healthStatus] ?? HEALTH_META.unknown;
  const method = METHOD_META[integration.method] ?? METHOD_META.manual;

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col overflow-hidden border-l border-border bg-background">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("detail.integration")}
          </div>
          <h2 className="truncate text-sm font-bold">{integration.name}</h2>
        </div>
        <button
          type="button"
          aria-label={t("common.close")}
          onClick={onClose}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex flex-wrap gap-2">
          <span
            className="rounded-full px-2 py-1 text-[10px] font-semibold"
            style={{ background: `${health.color}22`, color: health.color }}
          >
            {t(`health.${integration.healthStatus}`)}
          </span>
          <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold">
            {integration.protocol} · {t(`method.${integration.method}`)}
          </span>
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
              integration.isArchitectureCompliant
                ? "bg-green-500/10 text-green-400"
                : "bg-orange-500/10 text-orange-400"
            }`}
          >
            {integration.isArchitectureCompliant
              ? t("integrations.compliant")
              : t("detail.nonCompliant")}
          </span>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectSystem(integration.sourceSystemId)}
              className="min-w-0 text-left"
            >
              <div className="text-[10px] text-muted-foreground">
                {t("integrations.form.source")}
              </div>
              <div className="truncate text-xs font-semibold text-blue-400">
                {source?.name ?? t("detail.unknown")}
              </div>
            </button>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <button
              type="button"
              onClick={() => onSelectSystem(integration.destinationSystemId)}
              className="min-w-0 text-right"
            >
              <div className="text-[10px] text-muted-foreground">
                {t("integrations.form.destination")}
              </div>
              <div className="truncate text-xs font-semibold text-purple-400">
                {destination?.name ?? t("detail.unknown")}
              </div>
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-muted-foreground">
              {t("integrations.form.criticalLevel")}
            </dt>
            <dd className="mt-0.5 font-medium capitalize">
              {integration.criticalLevel}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {t("integrations.form.owner")}
            </dt>
            <dd className="mt-0.5 font-medium">
              {integration.owner || t("common.unassigned")}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {t("integrations.form.errorRate")}
            </dt>
            <dd className="mt-0.5 font-medium">
              {integration.errorRate ?? 0}%
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("detail.lastSync")}</dt>
            <dd className="mt-0.5 font-medium">
              {integration.lastSync?.slice(0, 16).replace("T", " ") ?? "—"}
            </dd>
          </div>
        </dl>

        {integration.description && (
          <div>
            <div className="text-xs text-muted-foreground">
              {t("common.description")}
            </div>
            <p className="mt-1 text-xs leading-relaxed">
              {integration.description}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <Button asChild className="w-full" size="sm">
          <Link to={`/integrations?selected=${integration._id}`}>
            {t("architecture.openIntegration")}
          </Link>
        </Button>
      </div>
    </aside>
  );
}

// ─── Phòng Ban ───────────────────────────────────────────────────────────────
type ConfigResult =
  | { department: { name: string; color?: string; order: number }[] }
  | undefined
  | null;

function DeptSummaryCard({
  name,
  color,
  systems,
  integrations,
  onClick,
}: {
  name: string;
  color: string;
  systems: System[];
  integrations: Integration[];
  onClick: () => void;
}) {
  const { t } = useLanguage();
  const healthCounts: Record<string, number> = {
    healthy: 0,
    degraded: 0,
    down: 0,
    unknown: 0,
  };
  systems.forEach((s) => {
    const h = worstHealthFor(s._id, integrations);
    healthCounts[h] = (healthCounts[h] ?? 0) + 1;
  });

  const totalCost = systems.reduce((sum, s) => sum + (s.costPerYear ?? 0), 0);
  const criticalCount = systems.filter((s) => s.criticality === "high").length;
  const noOwnerCount = systems.filter((s) => !s.owner).length;
  const avgArchitecture = systems.length
    ? Math.round(
        systems.reduce((sum, s) => sum + s.architectureScore, 0) /
          systems.length,
      )
    : 0;
  const avgDebt = systems.length
    ? Math.round(
        systems.reduce((sum, s) => sum + s.technicalDebtScore, 0) /
          systems.length,
      )
    : 0;
  const unhealthyCount = healthCounts.degraded + healthCounts.down;

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-lg border p-4 hover:bg-muted/25 transition-all cursor-pointer w-full"
      style={{ borderColor: color + "55", background: color + "08" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: color }}
            />
            <span className="font-semibold text-sm truncate">{name}</span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {systems.length} {t("arch.systemsWord")}
          </p>
        </div>
        <div
          className="rounded-md px-2 py-1 text-right"
          style={{ background: color + "14" }}
        >
          <div className="text-lg font-bold leading-none" style={{ color }}>
            {systems.length > 0 ? avgArchitecture : "—"}
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">
            {t("dept.avgArchitecture")}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-md bg-background/50 border border-border/60 p-2">
          <div className="text-[9px] text-muted-foreground">
            {t("dept.critical")}
          </div>
          <div className="text-sm font-semibold text-red-400">
            {criticalCount}
          </div>
        </div>
        <div className="rounded-md bg-background/50 border border-border/60 p-2">
          <div className="text-[9px] text-muted-foreground">
            {t("dept.noOwner")}
          </div>
          <div className="text-sm font-semibold text-orange-400">
            {noOwnerCount}
          </div>
        </div>
        <div className="rounded-md bg-background/50 border border-border/60 p-2">
          <div className="text-[9px] text-muted-foreground">
            {t("dept.avgDebt")}
          </div>
          <div
            className="text-sm font-semibold"
            style={{ color: scoreTone(avgDebt, false) }}
          >
            {systems.length > 0 ? avgDebt : "—"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted">
        {(Object.entries(healthCounts) as [string, number][])
          .filter(([, c]) => c > 0)
          .map(([h, c]) => {
            const hm = HEALTH_META[h] ?? HEALTH_META.unknown;
            return (
              <span
                key={h}
                className="h-full"
                style={{
                  width: `${(c / Math.max(systems.length, 1)) * 100}%`,
                  background: hm.color,
                }}
              />
            );
          })}
      </div>

      <div
        className="mt-3 flex items-center justify-between gap-3 border-t pt-3 text-[10px] text-muted-foreground"
        style={{ borderColor: color + "33" }}
      >
        <span>
          {unhealthyCount > 0
            ? `${unhealthyCount} ${t("health.degraded").toLowerCase()}`
            : t("health.healthy")}
        </span>
        <span className="font-mono text-green-400">
          {totalCost > 0
            ? `${formatVnd(totalCost)}${t("vendors.perYear")}`
            : "—"}
        </span>
      </div>
    </button>
  );
}

function DeptView({
  systems,
  integrations,
  config,
}: {
  systems: System[];
  integrations: Integration[];
  config: ConfigResult;
}) {
  const { t } = useLanguage();
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const departments = config?.department ?? [];

  const byDept = useMemo(() => {
    const map: Record<string, System[]> = {};
    for (const sys of systems) {
      const depts = sys.departments.length > 0 ? sys.departments : ["__none__"];
      for (const d of depts) {
        (map[d] ??= []).push(sys);
      }
    }
    return map;
  }, [systems]);

  const noDepSystems = byDept["__none__"] ?? [];

  const deptColor = (name: string) =>
    departments.find((d) => d.name === name)?.color ?? "#6366f1";

  const activeSystems =
    selectedDept === "__none__"
      ? noDepSystems
      : selectedDept
        ? (byDept[selectedDept] ?? [])
        : systems;

  const integrationCounts = useMemo(() => {
    const counts = new globalThis.Map<
      Id<"software_systems">,
      { inbound: number; outbound: number }
    >();
    for (const integration of integrations) {
      const source = counts.get(integration.sourceSystemId) ?? {
        inbound: 0,
        outbound: 0,
      };
      source.outbound += 1;
      counts.set(integration.sourceSystemId, source);

      const destination = counts.get(integration.destinationSystemId) ?? {
        inbound: 0,
        outbound: 0,
      };
      destination.inbound += 1;
      counts.set(integration.destinationSystemId, destination);
    }
    return counts;
  }, [integrations]);

  // Stats for selected dept
  const totalCost = activeSystems.reduce(
    (sum, s) => sum + (s.costPerYear ?? 0),
    0,
  );
  const criticalCount = activeSystems.filter(
    (s) => s.criticality === "high",
  ).length;
  const noOwnerCount = activeSystems.filter((s) => !s.owner).length;
  const avgArchitecture = activeSystems.length
    ? Math.round(
        activeSystems.reduce((sum, s) => sum + s.architectureScore, 0) /
          activeSystems.length,
      )
    : 0;
  const avgDebt = activeSystems.length
    ? Math.round(
        activeSystems.reduce((sum, s) => sum + s.technicalDebtScore, 0) /
          activeSystems.length,
      )
    : 0;
  const healthCounts = activeSystems.reduce<Record<string, number>>(
    (acc, s) => {
      const h = worstHealthFor(s._id, integrations);
      acc[h] = (acc[h] ?? 0) + 1;
      return acc;
    },
    { healthy: 0, degraded: 0, down: 0, unknown: 0 },
  );

  return (
    <div className="flex flex-1 flex-col lg:flex-row overflow-hidden bg-background">
      {/* ── Sidebar ── */}
      <div className="lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-border overflow-y-auto p-3 bg-muted/10">
        <div className="mb-3 px-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t("dept.portfolio")}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {t("dept.selectHint")}
          </p>
        </div>
        <button
          onClick={() => setSelectedDept(null)}
          className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
            selectedDept === null
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <span>{t("dept.all")}</span>
          <span className="font-mono text-[10px]">{systems.length}</span>
        </button>

        <div className="px-3 pt-2 pb-1">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t("dept.departments")}
          </div>
        </div>

        {departments.map((dept) => {
          const count = (byDept[dept.name] ?? []).length;
          const color = dept.color ?? "#6366f1";
          return (
            <button
              key={dept.name}
              onClick={() => setSelectedDept(dept.name)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                selectedDept === dept.name
                  ? "font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              style={
                selectedDept === dept.name
                  ? { background: color + "18", color }
                  : {}
              }
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: color }}
              />
              <span className="flex-1 truncate">{dept.name}</span>
              <span className="font-mono text-[10px] shrink-0">{count}</span>
            </button>
          );
        })}

        {noDepSystems.length > 0 && (
          <>
            <div className="px-3 pt-2 pb-1">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t("dept.other")}
              </div>
            </div>
            <button
              onClick={() => setSelectedDept("__none__")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                selectedDept === "__none__"
                  ? "bg-muted text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
              <span className="flex-1">{t("dept.uncategorized")}</span>
              <span className="font-mono text-[10px]">
                {noDepSystems.length}
              </span>
            </button>
          </>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Stats bar */}
        <div className="shrink-0 border-b border-border bg-muted/10 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold truncate">
                {selectedDept === null
                  ? t("dept.all")
                  : selectedDept === "__none__"
                    ? t("dept.uncategorized")
                    : selectedDept}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                {(Object.entries(healthCounts) as [string, number][])
                  .filter(([, c]) => c > 0)
                  .map(([h, c]) => {
                    const hm = HEALTH_META[h] ?? HEALTH_META.unknown;
                    return (
                      <span key={h} className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: hm.color }}
                        />
                        <span style={{ color: hm.color }}>
                          {t(`health.${h}`)} {c}
                        </span>
                      </span>
                    );
                  })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {[
                [t("arch.systemsWord"), activeSystems.length, "#94a3b8"],
                [t("dept.critical"), criticalCount, "#ef4444"],
                [t("dept.noOwner"), noOwnerCount, "#f97316"],
                [
                  t("dept.avgArchitecture"),
                  activeSystems.length > 0 ? avgArchitecture : "—",
                  scoreTone(avgArchitecture),
                ],
                [
                  t("dept.avgDebt"),
                  activeSystems.length > 0 ? avgDebt : "—",
                  scoreTone(avgDebt, false),
                ],
                [
                  t("dept.totalSpend"),
                  totalCost > 0 ? formatVnd(totalCost) : "—",
                  "#22c55e",
                ],
              ].map(([label, value, color]) => (
                <div
                  key={String(label)}
                  className="rounded-md border border-border bg-background/60 px-3 py-2"
                >
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    {label}
                  </div>
                  <div
                    className="mt-1 truncate text-sm font-semibold"
                    style={{ color: String(color) }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overview grid (all depts) */}
        {selectedDept === null && (
          <div className="flex-1 overflow-y-auto p-5">
            {departments.length === 0 && noDepSystems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Users className="h-10 w-10 opacity-20" />
                <p className="text-sm">{t("dept.noDataTitle")}</p>
                <p className="text-xs">{t("dept.noDataHint")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                {departments.map((dept) => (
                  <DeptSummaryCard
                    key={dept.name}
                    name={dept.name}
                    color={dept.color ?? "#6366f1"}
                    systems={byDept[dept.name] ?? []}
                    integrations={integrations}
                    onClick={() => setSelectedDept(dept.name)}
                  />
                ))}
                {noDepSystems.length > 0 && (
                  <DeptSummaryCard
                    name={t("dept.uncategorized")}
                    color="#64748b"
                    systems={noDepSystems}
                    integrations={integrations}
                    onClick={() => setSelectedDept("__none__")}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* System list for selected dept */}
        {selectedDept !== null && (
          <div className="flex-1 overflow-y-auto">
            {activeSystems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Server className="h-8 w-8 opacity-20" />
                <p className="text-sm">{t("dept.noSystemsInDept")}</p>
              </div>
            ) : (
              <div className="grid gap-3 p-4 xl:grid-cols-2">
                {activeSystems.map((sys) => {
                  const meta = TYPE_META[sys.type] ?? TYPE_META.core;
                  const statusMeta =
                    STATUS_META[sys.status] ?? STATUS_META.inactive;
                  const worst = worstHealthFor(sys._id, integrations);
                  const hm = HEALTH_META[worst] ?? HEALTH_META.unknown;
                  const flow = integrationCounts.get(sys._id) ?? {
                    inbound: 0,
                    outbound: 0,
                  };
                  const architectureColor = scoreTone(sys.architectureScore);
                  const debtColor = scoreTone(sys.technicalDebtScore, false);
                  return (
                    <div
                      key={sys._id}
                      className="rounded-lg border border-border bg-card/80 p-4 transition-colors hover:bg-muted/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {sys.name}
                          </div>
                          <div className="mt-1 text-[10px] text-muted-foreground truncate">
                            {sys.category}
                            {sys.technology ? ` · ${sys.technology}` : ""}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: hm.color }}
                          />
                          <span
                            className="text-[10px] font-medium"
                            style={{ color: hm.color }}
                          >
                            {t(`health.${worst}`)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span
                          className="text-[10px] px-2 py-1 rounded font-medium"
                          style={{
                            background: meta.badge + "22",
                            color: meta.badge,
                          }}
                        >
                          {t(`systemType.${sys.type}`)}
                        </span>
                        <span
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-background/60"
                          style={{ color: statusMeta.color }}
                        >
                          {statusMeta.icon}
                          {t(`status.${sys.status}`)}
                        </span>
                        {sys.criticality === "high" && (
                          <span className="text-[10px] px-2 py-1 rounded bg-red-500/15 text-red-400">
                            {t("systems.badge.critical")}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] sm:grid-cols-4">
                        <div className="rounded-md bg-background/50 border border-border/60 p-2">
                          <div className="text-muted-foreground">
                            {t("dept.owner")}
                          </div>
                          <div className="mt-1 truncate font-medium">
                            {sys.owner ?? t("common.unassigned")}
                          </div>
                        </div>
                        <div className="rounded-md bg-background/50 border border-border/60 p-2">
                          <div className="text-muted-foreground">
                            {t("dept.integrationFlow")}
                          </div>
                          <div className="mt-1 font-medium">
                            {t("dept.outbound")} {flow.outbound} ·{" "}
                            {t("dept.inbound")} {flow.inbound}
                          </div>
                        </div>
                        <div className="rounded-md bg-background/50 border border-border/60 p-2">
                          <div className="text-muted-foreground">
                            {t("dept.col.costPerYear")}
                          </div>
                          <div className="mt-1 truncate font-mono font-medium text-green-400">
                            {sys.costPerYear !== undefined
                              ? formatVnd(sys.costPerYear)
                              : "—"}
                          </div>
                        </div>
                        <div className="rounded-md bg-background/50 border border-border/60 p-2">
                          <div className="text-muted-foreground">
                            {t("dept.riskDebt")}
                          </div>
                          <div
                            className="mt-1 font-medium"
                            style={{ color: debtColor }}
                          >
                            {t(`level.${sys.riskLevel}`)} ·{" "}
                            {sys.technicalDebtScore}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{t("detail.architectureScore")}</span>
                            <span style={{ color: architectureColor }}>
                              {sys.architectureScore}
                            </span>
                          </div>
                          <ScoreBar
                            value={sys.architectureScore}
                            color={architectureColor}
                          />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{t("detail.technicalDebt")}</span>
                            <span style={{ color: debtColor }}>
                              {sys.technicalDebtScore}
                            </span>
                          </div>
                          <ScoreBar
                            value={sys.technicalDebtScore}
                            color={debtColor}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
type ViewTab = "map" | "flow" | "gantt" | "dept";

function ArchitectureContent() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSystems = useQuery(api.software_systems.list);
  const rawIntegrations = useQuery(api.integrations.list);
  const rawModules = useQuery(api.system_modules.list);
  const roadmapItems = useQuery(api.roadmap.list) ?? [];
  const config = useQuery(api.config.listAll);
  const systems = useMemo(() => rawSystems ?? [], [rawSystems]);
  const integrations = useMemo(() => rawIntegrations ?? [], [rawIntegrations]);
  const allModules = useMemo(() => rawModules ?? [], [rawModules]);

  const initialView = searchParams.get("view");
  const [viewTab, setViewTab] = useState<ViewTab>(
    initialView === "flow" || initialView === "gantt" || initialView === "dept"
      ? initialView
      : "map",
  );
  const [selectedId, setSelectedId] = useState<Id<"software_systems"> | null>(
    () => searchParams.get("system") as Id<"software_systems"> | null,
  );
  const [selectedIntegrationId, setSelectedIntegrationId] =
    useState<Id<"integrations"> | null>(
      () => searchParams.get("integration") as Id<"integrations"> | null,
    );
  const [filterType, setFilterType] = useState<string>("all");
  const [filterHealth, setFilterHealth] = useState<string>("all");
  const [edgeFocus, setEdgeFocus] = useState<EdgeFocus>("all");
  const [mapMode, setMapMode] = useState<MapMode>("ecosystem");
  const [selectedZoneKey, setSelectedZoneKey] = useState<ZoneFocus>(null);
  const [hiddenZoneKeys, setHiddenZoneKeys] = useState<Set<SystemZoneKey>>(
    () => new Set(),
  );
  const [showHelp, setShowHelp] = useState(false);
  const [showQuickRead, setShowQuickRead] = useState(false);
  // Imperative handle to the canvas instead of useReactFlow(), because the
  // toolbar/panels that need to trigger a fit live outside <ReactFlow>'s own
  // subtree (useReactFlow() only works inside it without a separate
  // <ReactFlowProvider> wrapper).
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const handleFitAll = () => {
    reactFlowRef.current?.fitView({ padding: 0.035, duration: 300 });
  };
  const handleFocusZoneCamera = (nodeIds: string[]) => {
    if (!nodeIds.length) return;
    reactFlowRef.current?.fitView({
      nodes: nodeIds.map((id) => ({ id })),
      padding: 0.25,
      duration: 300,
    });
  };

  const selectedSystem = useMemo(
    () => systems.find((s) => s._id === selectedId) ?? null,
    [systems, selectedId],
  );
  const selectedIntegration = useMemo(
    () =>
      integrations.find(
        (integration) => integration._id === selectedIntegrationId,
      ) ?? null,
    [integrations, selectedIntegrationId],
  );

  useEffect(() => {
    if (rawSystems === undefined || rawIntegrations === undefined) return;
    const next = new URLSearchParams(searchParams);
    if (viewTab === "map") next.delete("view");
    else next.set("view", viewTab);
    if (selectedSystem) next.set("system", selectedSystem._id);
    else next.delete("system");
    if (selectedIntegration) next.set("integration", selectedIntegration._id);
    else next.delete("integration");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    rawSystems,
    rawIntegrations,
    searchParams,
    selectedIntegration,
    selectedSystem,
    setSearchParams,
    viewTab,
  ]);

  const selectSystem = (id: Id<"software_systems"> | null) => {
    setSelectedIntegrationId(null);
    setSelectedId(id);
  };

  const selectIntegration = (id: Id<"integrations"> | null) => {
    setSelectedId(null);
    setSelectedZoneKey(null);
    setSelectedIntegrationId(id);
  };
  const selectedModules = useMemo(
    () => allModules.filter((m) => m.systemId === selectedId),
    [allModules, selectedId],
  );
  const architectureLayout = useMemo(
    () => layoutNodes(systems, integrations),
    [systems, integrations],
  );
  // Reuse the metrics `layoutNodes` already computed for centralityScore
  // instead of running the same O(integrations) aggregation a second time.
  const integrationMetrics = architectureLayout.metrics;

  const connectedIntegrations = useMemo(() => {
    if (!selectedId) return [];
    return integrations.filter(
      (i) =>
        i.sourceSystemId === selectedId || i.destinationSystemId === selectedId,
    );
  }, [selectedId, integrations]);

  const filteredSystems = useMemo(
    () =>
      systems.filter((s) => {
        if (filterType !== "all" && s.type !== filterType) return false;
        if (
          filterHealth !== "all" &&
          (integrationMetrics.get(s._id)?.worstHealth ?? "unknown") !==
            filterHealth
        )
          return false;
        return true;
      }),
    [systems, integrationMetrics, filterType, filterHealth],
  );

  const filteredIds = useMemo(
    () => new Set(filteredSystems.map((s) => s._id)),
    [filteredSystems],
  );

  const systemGroupMap = useMemo(() => {
    const groups = new globalThis.Map<string, ZoneFocus>();
    systems.forEach((system) => {
      groups.set(
        system._id,
        architectureLayout.centralIds.has(system._id)
          ? "core"
          : classifyEcosystemGroup(system),
      );
    });
    return groups;
  }, [systems, architectureLayout.centralIds]);

  const connectedNodeIds = useMemo(() => {
    if (!selectedId) return null;
    const ids = new Set<string>([selectedId]);
    integrations.forEach((i) => {
      if (i.sourceSystemId === selectedId) ids.add(i.destinationSystemId);
      if (i.destinationSystemId === selectedId) ids.add(i.sourceSystemId);
    });
    return ids;
  }, [selectedId, integrations]);

  const focusedZoneIds = useMemo(() => {
    if (!selectedZoneKey) return null;
    const ids = new Set<string>();
    systems.forEach((system) => {
      if (systemGroupMap.get(system._id) === selectedZoneKey) {
        ids.add(system._id);
      }
    });
    return ids;
  }, [selectedZoneKey, systems, systemGroupMap]);

  const hubIdsConnectedToFocusedZone = useMemo(() => {
    if (!focusedZoneIds) return new Set<string>();
    const ids = new Set<string>();
    integrations.forEach((integration) => {
      const sourceInZone = focusedZoneIds.has(integration.sourceSystemId);
      const targetInZone = focusedZoneIds.has(integration.destinationSystemId);
      if (
        sourceInZone &&
        architectureLayout.centralIds.has(integration.destinationSystemId)
      ) {
        ids.add(integration.destinationSystemId);
      }
      if (
        targetInZone &&
        architectureLayout.centralIds.has(integration.sourceSystemId)
      ) {
        ids.add(integration.sourceSystemId);
      }
    });
    return ids;
  }, [focusedZoneIds, integrations, architectureLayout.centralIds]);

  const nodes: Node<ArchitectureNodeData>[] = useMemo(() => {
    const zoneNodes: Node<ZoneNodeData>[] = architectureLayout.zones.map(
      (zone) => {
        const zoneKey = zoneKeyFromNodeId(zone.id);
        const isHidden = zoneKey ? hiddenZoneKeys.has(zoneKey) : false;
        return {
          id: zone.id,
          type: "zone",
          position: { x: zone.x, y: zone.y },
          data: {
            title: zone.title,
            subtitle: zone.subtitle,
            accent: zone.accent,
            isCore: zone.id === "zone-core",
            isPlaceholder: Boolean(zone.isPlaceholder),
          },
          draggable: false,
          selectable: false,
          connectable: false,
          focusable: false,
          zIndex: -1,
          style: {
            width: zone.width,
            height: zone.height,
            opacity: isHidden ? 0.04 : 1,
            pointerEvents: "none",
          },
        };
      },
    );
    const systemNodes: Node<NodeData>[] = systems.map((s) => {
      const metrics = integrationMetrics.get(s._id) ?? {
        inCount: 0,
        outCount: 0,
        worstHealth: "unknown",
      };
      const riskTone = riskToneForSystem(s, metrics.worstHealth);
      const isCentral = architectureLayout.centralIds.has(s._id);
      const isInFocusedZone = focusedZoneIds?.has(s._id) ?? false;
      const isFocusedHub =
        selectedZoneKey &&
        isCentral &&
        (selectedZoneKey === "core" || hubIdsConnectedToFocusedZone.has(s._id));
      const isRiskRelevant =
        riskTone.tone === "high" || riskTone.tone === "medium";
      const systemZoneKey =
        systemGroupMap.get(s._id) ?? classifyEcosystemGroup(s);
      const isHiddenZone = hiddenZoneKeys.has(systemZoneKey);
      return {
        id: s._id,
        type: "system",
        position: architectureLayout.positions[s._id] ?? { x: 0, y: 0 },
        data: {
          system: s,
          inCount: metrics.inCount,
          outCount: metrics.outCount,
          worstHealth: metrics.worstHealth,
          isSelected: selectedId === s._id,
          isCentral,
          groupKey: systemZoneKey,
          isRiskMode: mapMode === "risk",
          riskTone: riskTone.tone,
          riskColor: riskTone.color,
          riskLabel: riskTone.label,
        },
        style: {
          opacity: isHiddenZone
            ? 0.06
            : selectedId
              ? connectedNodeIds!.has(s._id)
                ? 1
                : 0.2
              : selectedZoneKey
                ? isInFocusedZone
                  ? 1
                  : isFocusedHub
                    ? 0.9
                    : 0.18
                : filteredIds.has(s._id)
                  ? mapMode === "risk"
                    ? isRiskRelevant
                      ? 1
                      : 0.45
                    : 1
                  : 0.2,
          pointerEvents: isHiddenZone ? "none" : undefined,
        },
      };
    });
    return [...zoneNodes, ...systemNodes];
  }, [
    systems,
    integrationMetrics,
    architectureLayout,
    selectedId,
    selectedZoneKey,
    mapMode,
    hiddenZoneKeys,
    filteredIds,
    connectedNodeIds,
    focusedZoneIds,
    hubIdsConnectedToFocusedZone,
    systemGroupMap,
  ]);

  // Derived from the same `nodes` array the canvas actually renders, so
  // this count can never drift from what filters/hide/selection/lens are
  // doing to opacity — "visible" used to just mean type+health filter
  // match, which could say "20/20 hệ thống" while most nodes were faded to
  // near-invisible by an active zone focus or hidden zone
  // (.ai/architecture-overview-ux-review.md, "visible" vocabulary issue).
  const emphasizedSystemCount = useMemo(
    () =>
      nodes.filter((n) => n.type === "system" && n.style?.opacity === 1).length,
    [nodes],
  );

  const edges: Edge[] = useMemo(
    () =>
      integrations.map((intg) => {
        const hc = HEALTH_META[intg.healthStatus] ?? HEALTH_META.unknown;
        const matchesEdgeFocus =
          edgeFocus === "all" ||
          (edgeFocus === "critical" && intg.criticalLevel === "high") ||
          (edgeFocus === "issues" &&
            ["degraded", "down"].includes(intg.healthStatus)) ||
          (edgeFocus === "nonCompliant" && !intg.isArchitectureCompliant) ||
          (edgeFocus === "realtime" && intg.method === "realtime");
        const isRiskEdge =
          intg.criticalLevel === "high" ||
          ["degraded", "down"].includes(intg.healthStatus) ||
          !intg.isArchitectureCompliant;
        const matchesMapMode =
          mapMode === "risk"
            ? edgeFocus === "all"
              ? isRiskEdge
              : matchesEdgeFocus
            : matchesEdgeFocus;
        const isFocused =
          selectedIntegrationId === intg._id ||
          selectedId === intg.sourceSystemId ||
          selectedId === intg.destinationSystemId;
        const isFiltered =
          filteredIds.has(intg.sourceSystemId) &&
          filteredIds.has(intg.destinationSystemId);
        const sourceZoneKey = systemGroupMap.get(intg.sourceSystemId);
        const targetZoneKey = systemGroupMap.get(intg.destinationSystemId);
        const isHiddenEdge =
          (sourceZoneKey ? hiddenZoneKeys.has(sourceZoneKey) : false) ||
          (targetZoneKey ? hiddenZoneKeys.has(targetZoneKey) : false);
        const sourceInZone = focusedZoneIds?.has(intg.sourceSystemId) ?? false;
        const targetInZone =
          focusedZoneIds?.has(intg.destinationSystemId) ?? false;
        const isZoneToHubEdge =
          (sourceInZone &&
            architectureLayout.centralIds.has(intg.destinationSystemId)) ||
          (targetInZone &&
            architectureLayout.centralIds.has(intg.sourceSystemId));
        const isZoneEdge = sourceInZone || targetInZone || isZoneToHubEdge;
        const isDefaultOverview =
          !selectedId &&
          !selectedIntegrationId &&
          !selectedZoneKey &&
          mapMode === "ecosystem" &&
          edgeFocus === "all";
        const edgeOpacity = isHiddenEdge
          ? 0.025
          : selectedId || selectedIntegrationId
            ? isFocused && matchesEdgeFocus
              ? 1
              : 0.1
            : selectedZoneKey
              ? isZoneEdge && matchesMapMode
                ? 0.9
                : 0.08
              : isFiltered && matchesMapMode
                ? mapMode === "risk" && !isRiskEdge
                  ? 0.22
                  : isDefaultOverview && !isRiskEdge
                    ? 0.18
                    : 0.9
                : mapMode === "risk"
                  ? 0.08
                  : 0.1;
        return {
          id: intg._id,
          source: intg.sourceSystemId,
          target: intg.destinationSystemId,
          type: "glow",
          label: isHiddenEdge
            ? undefined
            : selectedId && isFocused
              ? `${intg.protocol} · ${
                  METHOD_META[intg.method]?.label ?? intg.method
                }${intg.errorRate ? ` · ${intg.errorRate}% err` : ""}`
              : edgeFocus !== "all" || (mapMode === "risk" && isRiskEdge)
                ? (METHOD_META[intg.method]?.label ?? intg.method)
                : undefined,
          data: { isHighCritical: intg.criticalLevel === "high" },
          style: {
            stroke: hc.color,
            strokeWidth:
              selectedIntegrationId === intg._id
                ? 4
                : intg.criticalLevel === "high"
                  ? 2.5
                  : intg.criticalLevel === "medium"
                    ? 1.8
                    : 1.2,
            strokeDasharray: !intg.isArchitectureCompliant ? "6,4" : undefined,
            opacity: edgeOpacity,
          },
          animated: !isHiddenEdge && intg.method === "realtime",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: hc.color,
            width: 16,
            height: 16,
          },
        };
      }),
    [
      integrations,
      selectedId,
      selectedIntegrationId,
      selectedZoneKey,
      mapMode,
      filteredIds,
      edgeFocus,
      focusedZoneIds,
      architectureLayout.centralIds,
      hiddenZoneKeys,
      systemGroupMap,
    ],
  );

  const healthSummary = useMemo(() => {
    const c: Record<string, number> = {
      healthy: 0,
      degraded: 0,
      down: 0,
      unknown: 0,
    };
    integrations.forEach((i) => {
      c[i.healthStatus] = (c[i.healthStatus] ?? 0) + 1;
    });
    return c;
  }, [integrations]);

  const architectureSummary = useMemo(() => {
    const criticalIntegrations = integrations.filter(
      (i) => i.criticalLevel === "high",
    ).length;
    const issueIntegrations = integrations.filter((i) =>
      ["degraded", "down"].includes(i.healthStatus),
    ).length;
    const nonCompliantIntegrations = integrations.filter(
      (i) => !i.isArchitectureCompliant,
    ).length;
    // Deduped, single-unit "flows needing attention" — issueIntegrations +
    // nonCompliantIntegrations double-counts any flow that is both
    // degraded/down AND non-compliant (.ai/architecture-overview-ux-review.md,
    // "Summary có thể gây hiểu sai").
    const flowsNeedingAttention = integrations.filter(
      (i) =>
        ["degraded", "down"].includes(i.healthStatus) ||
        !i.isArchitectureCompliant,
    ).length;
    const highDebtSystems = systems.filter(
      (s) => s.technicalDebtScore >= 70,
    ).length;
    const highRiskSystems = systems.filter(
      (s) =>
        s.riskLevel === "high" ||
        s.technicalDebtScore >= 70 ||
        (integrationMetrics.get(s._id)?.worstHealth ?? "unknown") === "down",
    ).length;
    const criticalSystems = systems.filter(
      (s) => s.criticality === "high",
    ).length;
    const affectedHubs = systems.filter((s) => {
      if (!architectureLayout.centralIds.has(s._id)) return false;
      const connected = integrations.filter(
        (i) => i.sourceSystemId === s._id || i.destinationSystemId === s._id,
      );
      return connected.some(
        (i) =>
          ["degraded", "down"].includes(i.healthStatus) ||
          !i.isArchitectureCompliant,
      );
    }).length;
    return {
      hubs: architectureLayout.centralIds.size,
      satellites: Math.max(
        systems.length - architectureLayout.centralIds.size,
        0,
      ),
      // Systems actually standing out on the canvas right now (opacity 1),
      // not just the ones matching the type/health filter — see
      // emphasizedSystemCount above for why these must stay in sync.
      emphasizedSystems: emphasizedSystemCount,
      criticalIntegrations,
      issueIntegrations,
      nonCompliantIntegrations,
      flowsNeedingAttention,
      highDebtSystems,
      highRiskSystems,
      criticalSystems,
      affectedHubs,
      zones: architectureLayout.zones.filter((zone) => zone.id !== "zone-core")
        .length,
    };
  }, [
    systems,
    integrations,
    integrationMetrics,
    architectureLayout,
    emphasizedSystemCount,
  ]);

  const handleSetViewTab = (tab: ViewTab) => {
    setViewTab(tab);
    setSelectedZoneKey(null);
    setHiddenZoneKeys(new Set());
  };

  const handleSetSelectedZone = (zoneKey: SystemZoneKey) => {
    if (hiddenZoneKeys.has(zoneKey)) return;
    setSelectedId(null);
    setSelectedIntegrationId(null);
    const isSameZone = selectedZoneKey === zoneKey;
    setSelectedZoneKey(isSameZone ? null : zoneKey);
    // "Focus cụm" should actually move the camera to that cluster, not just
    // dim everything else while the viewport stays put
    // (.ai/architecture-overview-ux-review.md, camera section).
    if (isSameZone) {
      handleFitAll();
    } else {
      const nodeIds = systems
        .filter((s) => systemGroupMap.get(s._id) === zoneKey)
        .map((s) => s._id);
      handleFocusZoneCamera(nodeIds);
    }
  };

  const handleToggleZoneVisibility = (zoneKey: SystemZoneKey) => {
    setHiddenZoneKeys((current) => {
      const next = new Set(current);
      if (next.has(zoneKey)) {
        next.delete(zoneKey);
      } else {
        next.add(zoneKey);
        if (selectedZoneKey === zoneKey) setSelectedZoneKey(null);
        if (
          selectedSystem &&
          systemGroupMap.get(selectedSystem._id) === zoneKey
        ) {
          setSelectedId(null);
        }
      }
      return next;
    });
  };

  const activeFilterCount =
    (filterHealth !== "all" ? 1 : 0) +
    (filterType !== "all" ? 1 : 0) +
    (edgeFocus !== "all" ? 1 : 0);

  const hasMapFocus =
    selectedId !== null ||
    selectedIntegrationId !== null ||
    selectedZoneKey !== null ||
    filterType !== "all" ||
    filterHealth !== "all" ||
    edgeFocus !== "all" ||
    mapMode !== "ecosystem" ||
    hiddenZoneKeys.size > 0;

  const handleClearMapFocus = () => {
    setSelectedId(null);
    setSelectedIntegrationId(null);
    setSelectedZoneKey(null);
    setFilterType("all");
    setFilterHealth("all");
    setEdgeFocus("all");
    setMapMode("ecosystem");
    setHiddenZoneKeys(new Set());
    handleFitAll();
  };

  if (rawSystems === undefined || rawIntegrations === undefined) {
    return (
      <div className="p-6">
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => handleSetViewTab("map")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              viewTab === "map"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Map className="h-3.5 w-3.5" />
            {t("arch.tab.map")}
          </button>
          <button
            onClick={() => handleSetViewTab("flow")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              viewTab === "flow"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GitBranch className="h-3.5 w-3.5" />
            {t("arch.tab.flow")}
          </button>
          <button
            onClick={() => handleSetViewTab("gantt")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              viewTab === "gantt"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            {t("arch.tab.gantt")}
          </button>
          <button
            onClick={() => handleSetViewTab("dept")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              viewTab === "dept"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            {t("arch.tab.dept")}
          </button>
        </div>

        {/* Architecture Map filters */}
        {viewTab === "map" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
              {(
                [
                  ["ecosystem", "Hệ sinh thái"],
                  ["risk", "Rủi ro"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setMapMode(mode)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    mapMode === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-border" />
            <button
              onClick={handleFitAll}
              title="Về toàn cảnh"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 cursor-pointer transition-colors"
            >
              <Maximize2 className="h-3 w-3" /> Về toàn cảnh
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                  <SlidersHorizontal className="h-3 w-3" />
                  Bộ lọc
                  {activeFilterCount > 0 && (
                    <span className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[360px] bg-slate-950/95 border-slate-700 text-slate-200"
              >
                <div className="space-y-3">
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Sức khoẻ luồng
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        ["healthy", "degraded", "down", "unknown"] as const
                      ).map((h) => {
                        const hc = HEALTH_META[h];
                        return (
                          <button
                            key={h}
                            onClick={() =>
                              setFilterHealth(filterHealth === h ? "all" : h)
                            }
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer border transition-all"
                            style={{
                              background:
                                filterHealth === h
                                  ? `${hc.color}22`
                                  : "transparent",
                              borderColor:
                                filterHealth === h ? hc.color : "#334155",
                              color: hc.color,
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: hc.color }}
                            />
                            {t(`health.${h}`)} {healthSummary[h] ?? 0}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Loại hệ thống
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          "all",
                          "core",
                          "supporting",
                          "legacy",
                          "pilot",
                        ] as const
                      ).map((ft) => (
                        <button
                          key={ft}
                          onClick={() => setFilterType(ft)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer border transition-all"
                          style={{
                            background:
                              filterType === ft ? "#6366f133" : "transparent",
                            borderColor:
                              filterType === ft ? "#6366f1" : "#334155",
                            color: filterType === ft ? "#c7d2fe" : "#94a3b8",
                          }}
                        >
                          {ft === "all"
                            ? t("systemType.allTypes")
                            : t(`systemType.${ft}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Luồng tích hợp
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          ["all", "Tất cả luồng"],
                          ["critical", "Critical"],
                          ["issues", "Có lỗi"],
                          ["nonCompliant", "Sai chuẩn"],
                          ["realtime", "Realtime"],
                        ] as const
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setEdgeFocus(key)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer border transition-all"
                          style={{
                            background:
                              edgeFocus === key ? "#f9731633" : "transparent",
                            borderColor:
                              edgeFocus === key ? "#f97316" : "#334155",
                            color: edgeFocus === key ? "#fed7aa" : "#94a3b8",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {selectedId && (
              <button
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-3 w-3" /> {t("common.clear")}
              </button>
            )}
            {selectedZoneKey && (
              <button
                onClick={() => setSelectedZoneKey(null)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-orange-400/40 text-orange-200 hover:text-orange-100 cursor-pointer transition-colors"
              >
                <X className="h-3 w-3" /> Xoá cụm
              </button>
            )}
            {hasMapFocus && (
              <button
                onClick={handleClearMapFocus}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-slate-500/50 bg-slate-900/60 text-slate-200 hover:text-white cursor-pointer transition-colors"
              >
                <X className="h-3 w-3" /> Xoá tất cả
              </button>
            )}
          </div>
        )}

        {/* Integration Flow stats */}
        {viewTab === "flow" && (
          <div className="flex flex-wrap gap-2">
            {(
              Object.entries(HEALTH_CONFIG) as [
                string,
                (typeof HEALTH_CONFIG)[keyof typeof HEALTH_CONFIG],
              ][]
            ).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const count = healthSummary[key] ?? 0;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${cfg.bg} text-xs`}
                >
                  <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  <span className={cfg.color}>{t(`health.${key}`)}</span>
                  <span className="text-muted-foreground font-mono">
                    {count}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5" />
              {integrations.length} {t("arch.integrationsWord")} ·{" "}
              {systems.length} {t("arch.systemsWord")}
            </div>
          </div>
        )}
      </div>

      {/* ── Architecture Map View ── */}
      {viewTab === "map" && (
        <>
          <div className="shrink-0 px-5 py-1.5 border-b border-border flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground bg-muted/20">
            <span className="font-semibold text-foreground">
              {t("arch.legend.edge")}
            </span>
            {(Object.keys(HEALTH_META) as (keyof typeof HEALTH_META)[]).map(
              (hk) => (
                <span key={hk} className="flex items-center gap-1">
                  <span
                    className="inline-block w-5 h-0.5 rounded"
                    style={{ background: HEALTH_META[hk].color }}
                  />
                  {t(`health.${hk}`)}
                </span>
              ),
            )}
            <span className="flex items-center gap-1">
              <span className="inline-block w-5 border-t-2 border-dashed border-orange-400" />{" "}
              {t("detail.nonCompliant")}
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="h-2.5 w-2.5 text-indigo-400" />{" "}
              {t("method.realtime")}
            </span>
            {mapMode === "risk" ? (
              <>
                <span className="font-semibold text-foreground ml-2">
                  Risk lens
                </span>
                {[
                  ["#ef4444", "High risk / down / debt ≥ 70"],
                  ["#f59e0b", "Watch / degraded / debt 40-69"],
                  ["#22c55e", "Stable"],
                ].map(([color, label]) => (
                  <span key={label} className="flex items-center gap-1">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: color }}
                    />
                    {label}
                  </span>
                ))}
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground ml-2">
                  {t("arch.legend.moduleIcons")}
                </span>
                {(
                  Object.keys(LIFECYCLE_META) as (keyof typeof LIFECYCLE_META)[]
                ).map((lk) => {
                  const lm = LIFECYCLE_META[lk];
                  const Icon = lm.Icon;
                  return (
                    <span
                      key={lk}
                      className="flex items-center gap-1"
                      style={{ color: lm.color }}
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {t(`lifecycle.${lk}`)}
                    </span>
                  );
                })}
              </>
            )}
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div
              className="flex-1 overflow-hidden"
              style={{ background: "#060d1f" }}
            >
              {systems.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Server className="h-12 w-12 mx-auto opacity-20" />
                    <p className="font-medium">
                      {t("arch.noSystemsToDisplay")}
                    </p>
                  </div>
                </div>
              ) : (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.035 }}
                  minZoom={0.08}
                  maxZoom={1.8}
                  onInit={(instance) => {
                    reactFlowRef.current = instance;
                  }}
                  attributionPosition="bottom-right"
                  proOptions={{ hideAttribution: true }}
                  onNodeClick={(_evt, node) => {
                    if (isZoneNodeId(node.id)) return;
                    setSelectedZoneKey(null);
                    selectSystem(node.id as Id<"software_systems">);
                  }}
                  onEdgeClick={(_evt, edge) =>
                    selectIntegration(edge.id as Id<"integrations">)
                  }
                  onPaneClick={() => {
                    setSelectedId(null);
                    setSelectedIntegrationId(null);
                  }}
                >
                  <div className="absolute left-4 top-4 z-10">
                    <Popover open={showHelp} onOpenChange={setShowHelp}>
                      <PopoverTrigger asChild>
                        <button
                          title="Cách đọc sơ đồ"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/85 text-slate-300 shadow-lg backdrop-blur hover:text-white cursor-pointer transition-colors"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-[300px] bg-slate-950/95 border-slate-700 text-[10px] text-slate-300"
                      >
                        <div className="mb-1 font-semibold text-slate-100">
                          {mapMode === "risk"
                            ? "Cách đọc Risk lens"
                            : "Cách đọc bản đồ hệ sinh thái"}
                        </div>
                        {mapMode === "risk" ? (
                          <div className="space-y-0.5">
                            <div>
                              <span className="text-red-300">Đỏ:</span> risk cao
                              / down / nợ kỹ thuật ≥ 70 — cần xử lý trước
                            </div>
                            <div>
                              <span className="text-amber-300">Cam:</span> cần
                              theo dõi / degraded / nợ 40-69
                            </div>
                            <div>
                              <span className="text-emerald-300">Xanh:</span> ổn
                              định
                            </div>
                            <div>
                              <span className="text-amber-300">Luồng:</span>{" "}
                              click hệ thống để soi kết nối và chi tiết
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div>
                              <span className="text-indigo-300">
                                Trung tâm:
                              </span>{" "}
                              hub có nhiều kết nối và mức trọng yếu cao
                            </div>
                            <div>
                              <span className="text-emerald-300">
                                Xung quanh:
                              </span>{" "}
                              cụm vệ tinh theo vai trò nghiệp vụ/nền tảng
                            </div>
                            <div>
                              <span className="text-amber-300">Luồng:</span>{" "}
                              click hệ thống để soi kết nối và chi tiết tích hợp
                            </div>
                            <div>
                              <span className="text-sky-300">Hub:</span> tính
                              theo kết nối + core + criticality + active + arch
                              score
                            </div>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div
                    className={`absolute right-4 top-4 z-10 rounded-xl border border-slate-700/80 bg-slate-950/85 p-3 text-slate-200 shadow-lg backdrop-blur ${showQuickRead ? "max-h-[calc(100%-240px)] w-[270px] overflow-y-auto" : "w-[230px]"}`}
                  >
                    <button
                      onClick={() => setShowQuickRead((v) => !v)}
                      className="flex w-full items-center justify-between gap-2 cursor-pointer"
                      title={showQuickRead ? "Thu gọn" : "Mở rộng"}
                    >
                      <div className="text-left">
                        <div className="text-xs font-semibold text-slate-100">
                          {mapMode === "risk"
                            ? "Đọc nhanh rủi ro"
                            : "Đọc nhanh hệ sinh thái"}
                        </div>
                        {showQuickRead && (
                          <div className="text-[10px] text-slate-400">
                            {architectureSummary.emphasizedSystems}/
                            {systems.length} hệ thống nổi bật ·{" "}
                            {architectureSummary.zones} cụm vệ tinh
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="rounded-full border border-indigo-400/40 bg-indigo-400/10 px-2 py-1 text-[10px] font-semibold text-indigo-200">
                          {mapMode === "risk" ? "Risk lens" : "Ecosystem"}
                        </span>
                        {showQuickRead ? (
                          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </div>
                    </button>
                    {showQuickRead && (
                      <>
                        {mapMode === "risk" ? (
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-2">
                              <div className="text-slate-400">Risk cao</div>
                              <div className="text-lg font-bold text-red-200">
                                {architectureSummary.highRiskSystems}
                              </div>
                            </div>
                            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-2">
                              <div className="text-slate-400">
                                Nợ kỹ thuật cao
                              </div>
                              <div className="text-lg font-bold text-amber-200">
                                {architectureSummary.highDebtSystems}
                              </div>
                            </div>
                            <div className="rounded-lg border border-orange-400/20 bg-orange-400/10 p-2">
                              <div className="text-slate-400">Luồng lỗi</div>
                              <div className="text-lg font-bold text-orange-200">
                                {architectureSummary.issueIntegrations}
                              </div>
                            </div>
                            <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-2">
                              <div className="text-slate-400">Sai chuẩn</div>
                              <div className="text-lg font-bold text-rose-200">
                                {architectureSummary.nonCompliantIntegrations}
                              </div>
                            </div>
                            <div className="rounded-lg border border-indigo-400/20 bg-indigo-400/10 p-2">
                              <div className="text-slate-400">
                                Critical system
                              </div>
                              <div className="text-lg font-bold text-indigo-200">
                                {architectureSummary.criticalSystems}
                              </div>
                            </div>
                            <div className="rounded-lg border border-fuchsia-400/20 bg-fuchsia-400/10 p-2">
                              <div className="text-slate-400">
                                Hub ảnh hưởng
                              </div>
                              <div className="text-lg font-bold text-fuchsia-200">
                                {architectureSummary.affectedHubs}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="rounded-lg border border-indigo-400/20 bg-indigo-400/10 p-2">
                              <div className="text-slate-400">
                                Hub trung tâm
                              </div>
                              <div className="text-lg font-bold text-indigo-200">
                                {architectureSummary.hubs}
                              </div>
                            </div>
                            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-2">
                              <div className="text-slate-400">Vệ tinh</div>
                              <div className="text-lg font-bold text-emerald-200">
                                {architectureSummary.satellites}
                              </div>
                            </div>
                            <div className="rounded-lg border border-orange-400/20 bg-orange-400/10 p-2">
                              <div className="text-slate-400">
                                Critical flow
                              </div>
                              <div className="text-lg font-bold text-orange-200">
                                {architectureSummary.criticalIntegrations}
                              </div>
                            </div>
                            <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-2">
                              <div className="text-slate-400">
                                Luồng cần chú ý
                              </div>
                              <div className="text-lg font-bold text-red-200">
                                {architectureSummary.flowsNeedingAttention}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="mt-3 border-t border-slate-700/70 pt-2">
                          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Focus cụm
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => handleSetSelectedZone("core")}
                              className="rounded-full border px-2 py-1 text-[10px] font-medium transition-colors"
                              style={{
                                borderColor:
                                  selectedZoneKey === "core"
                                    ? "#a78bfa"
                                    : "#334155",
                                color:
                                  selectedZoneKey === "core"
                                    ? "#ddd6fe"
                                    : "#94a3b8",
                                background:
                                  selectedZoneKey === "core"
                                    ? "#a78bfa22"
                                    : "transparent",
                              }}
                            >
                              Trung tâm
                            </button>
                            {(
                              Object.entries(ECOSYSTEM_GROUPS) as [
                                EcosystemGroupKey,
                                EcosystemGroupConfig,
                              ][]
                            ).map(([key, group]) => {
                              const hasZone = architectureLayout.zones.some(
                                (zone) => zone.id === `zone-${key}`,
                              );
                              if (!hasZone) return null;
                              return (
                                <button
                                  key={key}
                                  onClick={() => handleSetSelectedZone(key)}
                                  className="rounded-full border px-2 py-1 text-[10px] font-medium transition-colors"
                                  style={{
                                    borderColor:
                                      selectedZoneKey === key
                                        ? group.accent
                                        : "#334155",
                                    color:
                                      selectedZoneKey === key
                                        ? "#f8fafc"
                                        : "#94a3b8",
                                    background:
                                      selectedZoneKey === key
                                        ? `${group.accent}26`
                                        : "transparent",
                                  }}
                                >
                                  {group.title.split(" & ")[0]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="mt-3 border-t border-slate-700/70 pt-2">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Ẩn/hiện cụm
                            </span>
                            {hiddenZoneKeys.size > 0 && (
                              <button
                                onClick={() => setHiddenZoneKeys(new Set())}
                                className="text-[10px] font-medium text-sky-300 hover:text-sky-200"
                              >
                                Hiện tất cả
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => handleToggleZoneVisibility("core")}
                              className="rounded-full border px-2 py-1 text-[10px] font-medium transition-colors"
                              style={{
                                borderColor: hiddenZoneKeys.has("core")
                                  ? "#475569"
                                  : "#a78bfa",
                                color: hiddenZoneKeys.has("core")
                                  ? "#64748b"
                                  : "#ddd6fe",
                                background: hiddenZoneKeys.has("core")
                                  ? "transparent"
                                  : "#a78bfa22",
                                opacity: hiddenZoneKeys.has("core") ? 0.75 : 1,
                              }}
                            >
                              {hiddenZoneKeys.has("core") ? "Ẩn" : "Hiện"} ·
                              Trung tâm
                            </button>
                            {(
                              Object.entries(ECOSYSTEM_GROUPS) as [
                                EcosystemGroupKey,
                                EcosystemGroupConfig,
                              ][]
                            ).map(([key, group]) => {
                              const hasZone = architectureLayout.zones.some(
                                (zone) => zone.id === `zone-${key}`,
                              );
                              if (!hasZone) return null;
                              const isHidden = hiddenZoneKeys.has(key);
                              return (
                                <button
                                  key={key}
                                  onClick={() =>
                                    handleToggleZoneVisibility(key)
                                  }
                                  className="rounded-full border px-2 py-1 text-[10px] font-medium transition-colors"
                                  style={{
                                    borderColor: isHidden
                                      ? "#475569"
                                      : group.accent,
                                    color: isHidden ? "#64748b" : "#f8fafc",
                                    background: isHidden
                                      ? "transparent"
                                      : `${group.accent}26`,
                                    opacity: isHidden ? 0.75 : 1,
                                  }}
                                >
                                  {isHidden ? "Ẩn" : "Hiện"} ·{" "}
                                  {group.title.split(" & ")[0]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <Background color="#1e293b" gap={28} size={1} />
                  <Controls
                    style={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                    }}
                  />
                  <MiniMap
                    nodeComponent={ArchitectureMiniMapNode}
                    nodeColor={(node) => {
                      const system = systems.find((s) => s._id === node.id);
                      if (!system) return "#6366f1";
                      // Match the lens: in Risk mode the map's primary
                      // encoding is risk, not system type, so the MiniMap
                      // should read the same way as the canvas
                      // (.ai/architecture-overview-ux-review.md, "MiniMap
                      // luôn theo system type").
                      if (mapMode === "risk") {
                        const worstHealth =
                          integrationMetrics.get(system._id)?.worstHealth ??
                          "unknown";
                        return riskToneForSystem(system, worstHealth).color;
                      }
                      return TYPE_META[system.type]?.badge ?? "#6366f1";
                    }}
                    style={{
                      background: "#0a1628",
                      border: "1px solid #1e293b",
                    }}
                    maskColor="#06101e99"
                  />
                </ReactFlow>
              )}
            </div>
            <div
              className={`shrink-0 transition-all duration-300 overflow-hidden ${
                selectedSystem || selectedIntegration ? "w-[340px]" : "w-0"
              }`}
            >
              {selectedIntegration ? (
                <IntegrationInspector
                  integration={selectedIntegration}
                  systems={systems}
                  onClose={() => selectIntegration(null)}
                  onSelectSystem={selectSystem}
                />
              ) : selectedSystem ? (
                <DetailPanel
                  key={selectedSystem._id}
                  system={selectedSystem}
                  integrations={integrations}
                  systems={systems}
                  modules={selectedModules}
                  onClose={() => selectSystem(null)}
                  onSelectIntegration={selectIntegration}
                />
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* ── Integration Flow View ── */}
      {viewTab === "flow" && (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 p-4 overflow-hidden flex flex-col gap-3">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground shrink-0">
              <span className="font-medium text-foreground">
                {t("arch.flow.systemType")}
              </span>
              {[
                { key: "core", color: "#6366f1" },
                { key: "supporting", color: "#22c55e" },
                { key: "legacy", color: "#f59e0b" },
                { key: "pilot", color: "#3b82f6" },
              ].map((st) => (
                <span key={st.key} className="flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block"
                    style={{ background: st.color }}
                  />
                  {t(`systemType.${st.key}`)}
                </span>
              ))}
              <span className="border-l border-border pl-4">
                {t("arch.flow.edgeHealth")}
              </span>
              {Object.entries(HEALTH_CONFIG).map(([key, cfg]) => (
                <span key={key} className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ background: cfg.dot }}
                  />
                  {t(`health.${key}`)}
                </span>
              ))}
              <span className="border-l border-border pl-4">
                {t("arch.flow.legendNote")}
              </span>
            </div>

            {systems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center bg-[#050d1a] rounded-lg border border-border text-muted-foreground">
                <div className="text-center space-y-2">
                  <GitBranch className="h-10 w-10 mx-auto opacity-30" />
                  <p className="text-sm font-medium">
                    {t("arch.noSystemsToDisplay")}
                  </p>
                  <p className="text-xs">{t("arch.addSystemsFirst")}</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-[400px]">
                <SystemFlowSVG
                  systems={systems}
                  integrations={integrations}
                  selectedId={selectedId}
                  onSelectSystem={setSelectedId}
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center shrink-0">
              {t("arch.flow.hint")}
            </p>
          </div>

          {/* Side panel */}
          <div
            className={`shrink-0 border-l border-border overflow-y-auto transition-all duration-300 ${
              selectedSystem ? "w-72 p-4" : "w-0 p-0 overflow-hidden"
            }`}
          >
            {selectedSystem && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-sm">{selectedSystem.name}</h2>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {selectedSystem.category} · {selectedSystem.type}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-muted-foreground hover:text-foreground text-lg leading-none cursor-pointer"
                  >
                    ×
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                      selectedSystem.status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : selectedSystem.status === "sunset"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {selectedSystem.status}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                      selectedSystem.criticality === "high"
                        ? "bg-red-500/20 text-red-400"
                        : selectedSystem.criticality === "medium"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {selectedSystem.criticality}{" "}
                    {t("arch.flow.criticalitySuffix")}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      selectedSystem.riskLevel === "high"
                        ? "bg-red-500/20 text-red-400"
                        : selectedSystem.riskLevel === "medium"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {t("arch.flow.riskPrefix")} {selectedSystem.riskLevel}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        {t("detail.architectureScore")}
                      </span>
                      <span className="font-mono text-green-400">
                        {selectedSystem.architectureScore}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${selectedSystem.architectureScore}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        {t("detail.technicalDebt")}
                      </span>
                      <span className="font-mono text-red-400">
                        {selectedSystem.technicalDebtScore}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{
                          width: `${selectedSystem.technicalDebtScore}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    {t("arch.flow.connections")} ({connectedIntegrations.length}
                    )
                  </h3>
                  <div className="space-y-1.5">
                    {connectedIntegrations.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {t("arch.flow.noIntegrations")}
                      </p>
                    ) : (
                      connectedIntegrations.map((intg) => {
                        const isSrc = intg.sourceSystemId === selectedId;
                        const otherId = isSrc
                          ? intg.destinationSystemId
                          : intg.sourceSystemId;
                        const otherSys = systems.find((s) => s._id === otherId);
                        const hcfg =
                          HEALTH_CONFIG[
                            intg.healthStatus as keyof typeof HEALTH_CONFIG
                          ];
                        return (
                          <div
                            key={intg._id}
                            className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: hcfg?.dot ?? "#6b7280" }}
                            />
                            <span className="text-muted-foreground">
                              {isSrc ? "→" : "←"}
                            </span>
                            <span className="font-medium truncate flex-1">
                              {otherSys?.name ?? t("detail.unknown")}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                              {intg.protocol}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {selectedSystem.description && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                      {t("common.description")}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {selectedSystem.description}
                    </p>
                  </div>
                )}

                {selectedSystem.technology && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">
                        {t("detail.technology")}
                      </span>
                      <p className="font-medium mt-0.5">
                        {selectedSystem.technology}
                      </p>
                    </div>
                    {selectedSystem.hosting && (
                      <div>
                        <span className="text-muted-foreground">
                          {t("detail.hosting")}
                        </span>
                        <p className="font-medium mt-0.5">
                          {selectedSystem.hosting}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Gantt Timeline View ── */}
      {viewTab === "gantt" && (
        <div className="flex-1 overflow-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm">{t("arch.gantt.title")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {roadmapItems.length} {t("arch.gantt.itemsWord")} ·{" "}
                {t("arch.gantt.byDates")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              {[
                { key: "status.notStarted", color: "#334155" },
                { key: "status.inProgress", color: "#3b82f6" },
                { key: "status.blocked", color: "#ef4444" },
                { key: "status.done", color: "#22c55e" },
                { key: "status.cancelled", color: "#475569" },
              ].map((s) => (
                <span
                  key={s.key}
                  className="flex items-center gap-1.5 text-muted-foreground"
                >
                  <span
                    className="w-3 h-3 rounded-sm inline-block"
                    style={{ background: s.color }}
                  />
                  {t(s.key)}
                </span>
              ))}
              <span className="flex items-center gap-1 text-yellow-400">
                <span className="inline-block border-l-2 border-dashed border-yellow-400 h-3" />
                {t("arch.gantt.today")}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <GanttChart items={roadmapItems} />
          </div>
        </div>
      )}

      {/* ── Phòng Ban View ── */}
      {viewTab === "dept" && (
        <DeptView
          systems={systems}
          integrations={integrations}
          config={config}
        />
      )}
    </div>
  );
}

export default function ArchitecturePage() {
  return <ArchitectureContent />;
}
