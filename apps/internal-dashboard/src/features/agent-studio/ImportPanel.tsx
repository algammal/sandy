"use client";

import { useRef, useState } from "react";
import { FileJson, FolderUp, Upload } from "lucide-react";
import { JsonEditor, Button, FormField, Input, RadioGroup, useToast } from "@sandy/ui";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { importConfig } from "../../store/slices/agentConfigurationsSlice";
import { mergeConfigFolder, type PickedFile } from "./folderImport";
import { createDefaultAgentTemplate } from "./baseTemplate";

const SAMPLE_CONFIG = JSON.stringify(createDefaultAgentTemplate(), null, 2);

export interface ImportPanelProps {
  onImported?: () => void;
}

type ImportMode = "paste" | "file" | "folder";

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsText(file);
  });
}

export function ImportPanel({ onImported }: ImportPanelProps) {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const parseError = useAppSelector((state) => state.agentConfigurations.parseError);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [importMode, setImportMode] = useState<ImportMode>("paste");
  const [sourceText, setSourceText] = useState(SAMPLE_CONFIG);
  const [configName, setConfigName] = useState("Imported configuration");
  const [fileName, setFileName] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [isReadingFolder, setIsReadingFolder] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    readFileAsText(file).then(setSourceText);
  };

  const handleFolderChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    setIsReadingFolder(true);
    setFolderError(null);
    try {
      const picked: PickedFile[] = await Promise.all(
        Array.from(fileList)
          .filter((file) => /\.(json|md)$/i.test(file.name))
          .map(async (file) => ({
            // webRelativePath carries the folder structure (e.g. "ai-sales-employee-test-package/agent-config/agent.sanitized.json")
            path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
            content: await readFileAsText(file),
          })),
      );
      const result = mergeConfigFolder(picked);
      if (!result.ok) {
        setFolderError(result.error);
        return;
      }
      setSourceText(result.mergedJson);
      setFileName(result.summary.baseFileName);
      showToast({
        tone: "success",
        title: "Folder merged",
        description: `Base config found, plus ${result.summary.procedureCount} procedure(s) and ${result.summary.knowledgeDocCount} knowledge document(s).`,
      });
    } finally {
      setIsReadingFolder(false);
    }
  };

  const handleImport = () => {
    const importSource = importMode === "folder" ? "file" : importMode;
    dispatch(importConfig({ sourceText, importSource, name: configName || fileName || "Imported configuration" }));
    onImported?.();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--sandy-muted-foreground)]">
        This is grounded in a real sanitized ElevenLabs export — ElevenLabs still doesn&apos;t guarantee one export schema
        across every account, so unsupported fields are preserved rather than discarded. Paste JSON, upload one file, or
        import a whole exported package folder (base config + procedures + knowledge base) below.
      </p>

      <FormField label="Configuration name" htmlFor="configName">
        <Input id="configName" value={configName} onChange={(event) => setConfigName(event.target.value)} />
      </FormField>

      <RadioGroup
        name="importMode"
        value={importMode}
        onChange={(value) => setImportMode(value as ImportMode)}
        orientation="horizontal"
        options={[
          { value: "paste", label: "Paste JSON" },
          { value: "file", label: "Upload file" },
          { value: "folder", label: "Import folder (full configuration)" },
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

      {importMode === "folder" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[var(--sandy-muted-foreground)]">
            Select the exported package folder (e.g. <code className="font-technical">ai-sales-employee-test-package</code>). This reads the
            base agent configuration plus any <code className="font-technical">procedures/structured/*.json</code> and{" "}
            <code className="font-technical">knowledge-base/*.md</code> files it finds and merges them into one configuration — nothing leaves
            your browser.
          </p>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => folderInputRef.current?.click()} isLoading={isReadingFolder}>
              <FolderUp className="size-4" /> Choose folder
            </Button>
            {fileName && importMode === "folder" && (
              <span className="flex items-center gap-1.5 text-sm text-[var(--sandy-muted-foreground)]">
                <FileJson className="size-4" /> Base: {fileName}
              </span>
            )}
            <input
              ref={(element) => {
                folderInputRef.current = element;
                if (element) {
                  element.setAttribute("webkitdirectory", "");
                  element.setAttribute("directory", "");
                }
              }}
              type="file"
              multiple
              className="hidden"
              onChange={handleFolderChange}
            />
          </div>
          {folderError && (
            <p role="alert" className="rounded-lg bg-[var(--sandy-danger-bg)] px-3 py-2 text-sm text-[var(--sandy-danger)]">
              {folderError}
            </p>
          )}
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
