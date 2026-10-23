"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileJson, Upload } from "lucide-react";
import { parseSubmissionBundle } from "@sandy/shared-utils";
import { Button, JsonEditor, Modal, RadioGroup, useToast } from "@sandy/ui";
import { useAppDispatch } from "../../store/hooks";
import { importSubmissionBundle } from "../../store/thunks/importSubmissionBundle";

export interface ImportSubmissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportSubmissionDialog({ isOpen, onClose }: ImportSubmissionDialogProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [sourceText, setSourceText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setSourceText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const handleImport = () => {
    const result = parseSubmissionBundle(sourceText);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    dispatch(importSubmissionBundle(result.bundle));
    showToast({
      tone: "success",
      title: "Submission imported",
      description: `${result.bundle.client.name} — ${result.bundle.agentRequests.length} agent configuration draft(s) generated.`,
    });
    setSourceText("");
    setFileName(null);
    onClose();
    router.push(`/clients/${result.bundle.client.id}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import client submission" size="lg">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--sandy-muted-foreground)]">
          Paste or upload the submission file a client exported from the Client Portal&apos;s review screen. This is the
          explicit, user-driven bridge between the two apps in this demo phase — there is no shared backend yet.
        </p>

        <RadioGroup
          name="importMode"
          value={mode}
          onChange={(value) => setMode(value as "paste" | "file")}
          orientation="horizontal"
          options={[
            { value: "paste", label: "Paste JSON" },
            { value: "file", label: "Upload file" },
          ]}
        />

        {mode === "file" && (
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" /> Choose submission file
            </Button>
            {fileName && (
              <span className="flex items-center gap-1.5 text-sm text-[var(--sandy-muted-foreground)]">
                <FileJson className="size-4" /> {fileName}
              </span>
            )}
            <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        <JsonEditor value={sourceText} onChange={setSourceText} height={260} ariaLabel="Client submission JSON" />

        {error && (
          <p role="alert" className="rounded-lg bg-[var(--sandy-danger-bg)] px-3 py-2 text-sm text-[var(--sandy-danger)]">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleImport} disabled={!sourceText.trim()}>
            Import submission
          </Button>
        </div>
      </div>
    </Modal>
  );
}
