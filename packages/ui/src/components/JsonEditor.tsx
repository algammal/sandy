"use client";

import { useTheme } from "next-themes";
import Editor, { type OnMount } from "@monaco-editor/react";
import { cn } from "../utils/cn";

export interface JsonEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string | number;
  className?: string;
  ariaLabel?: string;
}

/**
 * A professional JSON editor with syntax highlighting, backed by Monaco
 * (the editor that powers VS Code). Used for ElevenLabs config import,
 * inspection and manual editing in Agent Studio.
 */
export function JsonEditor({ value, onChange, readOnly, height = 420, className, ariaLabel }: JsonEditorProps) {
  const { resolvedTheme } = useTheme();

  const handleMount: OnMount = (editor) => {
    editor.updateOptions({ tabSize: 2 });
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? "JSON editor"}
      className={cn("overflow-hidden rounded-xl border border-[var(--sandy-border-strong)]", className)}
    >
      <Editor
        height={height}
        defaultLanguage="json"
        value={value}
        onChange={(next) => onChange?.(next ?? "")}
        onMount={handleMount}
        theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          formatOnPaste: true,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
