import type { ClientSubmissionBundle } from "@sandy/shared-types";
import { createLocalStorageAdapter, serializeSubmissionBundle } from "@sandy/shared-utils";

const storage = createLocalStorageAdapter("sandy-demo-bridge");
const LATEST_BUNDLE_KEY = "client-portal:latest-submission-bundle";

/**
 * The explicit, user-driven bridge between this app and the Internal
 * Dashboard. `localStorage` is per-origin, so it cannot silently sync across
 * the two separate Next.js apps — this service makes that visible instead of
 * pretending it works: it persists the bundle for this app's own reloads,
 * and provides the file the client can hand to internal staff (or that staff
 * can grab from the client's submission confirmation screen) to import on
 * the Internal Dashboard side. A real backend replaces this entirely.
 */
export const submissionBridgeService = {
  persistLocally(bundle: ClientSubmissionBundle): void {
    storage.write(LATEST_BUNDLE_KEY, bundle);
  },

  getLastPersisted(): ClientSubmissionBundle | undefined {
    return storage.read<ClientSubmissionBundle>(LATEST_BUNDLE_KEY);
  },

  downloadAsFile(bundle: ClientSubmissionBundle): void {
    if (typeof document === "undefined") return;
    const json = serializeSubmissionBundle(bundle);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `submission-${bundle.client.name.toLowerCase().replace(/\s+/g, "-")}-${bundle.submissionId}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },

  async copyToClipboard(bundle: ClientSubmissionBundle): Promise<void> {
    const json = serializeSubmissionBundle(bundle);
    await navigator.clipboard.writeText(json);
  },
};
