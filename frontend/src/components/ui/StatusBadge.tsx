"use client";
import { CheckCircle2, Clock, AlertTriangle, Trash2 } from "lucide-react";
import type { ItemStatus } from "@/types";

interface StatusBadgeProps {
  status: ItemStatus;
  size?:  "sm" | "md";
}

const cfg = {
  verified: { label: "Verified",  icon: CheckCircle2,  cls: "status-verified" },
  pending:  { label: "Checking…", icon: Clock,          cls: "status-pending"  },
  flagged:  { label: "Flagged",   icon: AlertTriangle,  cls: "status-flagged"  },
  removed:  { label: "Removed",   icon: Trash2,         cls: "status-removed"  },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const { label, icon: Icon, cls } = cfg[status] ?? cfg.pending;
  return (
    <span className={cls}>
      <Icon size={size === "sm" ? 10 : 12} />
      {label}
    </span>
  );
}
