"use client";

import { useRef, useState } from "react";
import { FileJson, Upload } from "lucide-react";
import { JsonEditor, Button, FormField, Input, RadioGroup } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { importConfig } from "../../store/slices/agentConfigurationsSlice";

const SAMPLE_CONFIG = JSON.stringify(
  {
    name: "Sample Agent",
    conversation_config: {
      agent: {
        first_message: "Hi there! How can I help you today?",
        language: "en",
        prompt: { prompt: "You are a helpful receptionist.", tools: [] },
      },
      tts: { voice_id: "voice_sample_001" },
    },
  },
  null,
  2,
);

export interface ImportPanelProps {
  onImported?: () => void;
}

export function ImportPanel({ onImported }: ImportPanelProps) {
  const dispatch = useAppDispatch();
  const parseError = useAppSelector((state) => state.agentConfigurations.parseError);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importMode, setImportMode] = useState<"paste" | "file">("paste");
  const [sourceText, setSourceText] = useState(SAMPLE_CONFIG);
  const [configName, setConfigName] = useState("Imported configuration");
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setSourceText(String(reader.result ?? ""));
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    dispatch(importConfig({ sourceText, importSource: importMode, name: configName || fileName || "Imported configuration" }));
    onImported?.();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--sandy-muted-foreground)]">
        This is grounded in a real sanitized ElevenLabs export — ElevenLabs still doesn&apos;t guarantee one export schema
        across every account, so unsupported fields are preserved rather than discarded. Upload a file or paste JSON below.
      </p>

      <FormField label="Configuration name" htmlFor="configName">
        <Input id="configName" value={configName} onChange={(event) => setConfigName(event.target.value)} />
      </FormField>

      <RadioGroup
        name="importMode"
        value={importMode}
        onChange={(value) => setImportMode(value as "paste" | "file")}
        orientation="horizontal"
        options={[
          { value: "paste", label: "Paste JSON" },
          { value: "file", label: "Upload file" },
        ]}
      />

      {importMode === "file" && (
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-4" /> Choose JSON file
          </Button>
          {fileName && (
            <span className="flex items-center gap-1.5 text-sm text-[var(--sandy-muted-foreground)]">
              <FileJson className="size-4" /> {fileName}
            </span>
          )}
          <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      <JsonEditor value={sourceText} onChange={setSourceText} height={280} ariaLabel="Agent configuration JSON" />

      {parseError && (
        <p role="alert" className="rounded-lg bg-[var(--sandy-danger-bg)] px-3 py-2 text-sm text-[var(--sandy-danger)]">
          {parseError}
        </p>
      )}

      <Button onClick={handleImport} className="self-start">
        Import configuration
      </Button>
    </div>
  );
}
