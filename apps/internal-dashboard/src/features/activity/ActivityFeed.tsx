"use client";

import { useEffect } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { formatDateTime } from "@sandy/shared-utils";
import { EmptyState, GlassPanel, LoadingState, StatusBadge } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchActivity } from "../../store/slices/activitySlice";

const actorTone = {
  client: "info",
  internal: "primary",
  system: "neutral",
} as const;

export function ActivityFeed() {
  const dispatch = useAppDispatch();
  const activity = useAppSelector((state) => state.activity);

  useEffect(() => {
    if (activity.status === "idle") dispatch(fetchActivity());
  }, [dispatch, activity.status]);

  if (activity.status === "loading" && activity.items.length === 0) {
    return <LoadingState label="Loading activity…" />;
  }

  if (activity.items.length === 0) {
    return <EmptyState icon={<History className="size-6" />} title="No activity recorded yet" />;
  }

  return (
    <GlassPanel>
      <ol className="flex flex-col gap-4 border-l border-[var(--sandy-border)] pl-4">
        {activity.items.map((entry) => (
          <li key={entry.id} className="relative">
            <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-[var(--sandy-primary)]" />
            <div className="mb-1 flex items-center gap-2">
              <StatusBadge label={entry.actorType} tone={actorTone[entry.actorType]} />
              <span className="text-xs text-[var(--sandy-muted-foreground)]">{formatDateTime(entry.createdAt)}</span>
            </div>
            <p className="text-sm text-[var(--sandy-foreground)]">{entry.description}</p>
            {entry.clientId && (
              <Link href={`/clients/${entry.clientId}`} className="text-xs text-[var(--sandy-primary)] hover:underline">
                View client
              </Link>
            )}
          </li>
        ))}
      </ol>
    </GlassPanel>
  );
}
