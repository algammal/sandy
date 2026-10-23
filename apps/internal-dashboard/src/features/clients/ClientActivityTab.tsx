"use client";

import { useEffect } from "react";
import { History } from "lucide-react";
import { formatDateTime } from "@sandy/shared-utils";
import { EmptyState, GlassPanel } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchActivity } from "../../store/slices/activitySlice";

export function ClientActivityTab({ clientId }: { clientId: string }) {
  const dispatch = useAppDispatch();
  const activity = useAppSelector((state) => state.activity);

  useEffect(() => {
    if (activity.status === "idle") dispatch(fetchActivity());
  }, [dispatch, activity.status]);

  const entries = activity.items.filter((entry) => entry.clientId === clientId);

  if (entries.length === 0) {
    return <EmptyState icon={<History className="size-6" />} title="No activity recorded yet" />;
  }

  return (
    <GlassPanel>
      <ol className="flex flex-col gap-3 border-l border-[var(--sandy-border)] pl-4">
        {entries.map((entry) => (
          <li key={entry.id} className="relative">
            <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-[var(--sandy-primary)]" />
            <p className="text-sm text-[var(--sandy-foreground)]">{entry.description}</p>
            <p className="text-xs text-[var(--sandy-muted-foreground)]">
              {entry.actorName} · {formatDateTime(entry.createdAt)}
            </p>
          </li>
        ))}
      </ol>
    </GlassPanel>
  );
}
