"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon, FileUploadIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  acceptAttributeForFilePicker,
  DOCUMENT_CLASSIFICATIONS,
  validateDocumentFile,
} from "@/src/lib/documents/constants";
import {
  removeDocumentFromStorage,
  uploadDocumentFileToStorage,
} from "@/src/lib/documents/client-upload";
import {
  createDocumentRecordAction,
  getDocumentUploadContextAction,
} from "@/src/lib/documents/actions";
import { ANALYSIS_ERRORS } from "@/src/lib/ai-review/document-analysis/messages";
import type { DocumentClassification } from "@/src/types/database";

const selectClassName = cn(
  "h-7 w-full rounded-md border border-input bg-input/20 px-2 text-sm transition-colors outline-none",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

type UploadPhase = "idle" | "uploading" | "processing" | "complete" | "failed";

type DocumentUploadZoneProps = {
  projectId: string;
};

export function DocumentUploadZone({
  projectId,
}: DocumentUploadZoneProps) {
  const router = useRouter();
  const [documentType, setDocumentType] =
    useState<DocumentClassification>("other");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = phase === "uploading" || phase === "processing";

  const handleFiles = useCallback((files: FileList | null) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLastFailedFile(null);

    if (!files?.length) {
      return;
    }

    const file = files[0];
    const validationError = validateDocumentFile(file);

    if (validationError) {
      setSelectedFile(null);
      setErrorMessage(validationError);
      setPhase("failed");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setSelectedFile(file);
    setPhase("idle");
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles]
  );

  const runUpload = useCallback(
    async (file: File) => {
      const validationError = validateDocumentFile(file);
      if (validationError) {
        setErrorMessage(validationError);
        setPhase("failed");
        setLastFailedFile(file);
        return;
      }

      setPhase("uploading");
      setErrorMessage(null);
      setSuccessMessage(null);

      let uploadedStoragePath: string | null = null;

      try {
        const context = await getDocumentUploadContextAction(projectId);

        if (context.error || !context.organisationId) {
          setErrorMessage(
            context.error ?? "Organisation not found. Complete onboarding first."
          );
          setPhase("failed");
          setLastFailedFile(file);
          return;
        }

        const uploadResult = await uploadDocumentFileToStorage(
          file,
          context.organisationId,
          projectId
        );

        if (!uploadResult.ok) {
          setErrorMessage(uploadResult.error || ANALYSIS_ERRORS.uploadFailed);
          setPhase("failed");
          setLastFailedFile(file);
          return;
        }

        uploadedStoragePath = uploadResult.storagePath;
        setPhase("processing");

        const recordResult = await createDocumentRecordAction({
          projectId,
          fileName: file.name,
          storagePath: uploadResult.storagePath,
          fileType: uploadResult.fileType,
          documentType,
        });

        if (recordResult.error) {
          await removeDocumentFromStorage(uploadResult.storagePath);
          setErrorMessage(recordResult.error);
          setPhase("failed");
          setLastFailedFile(file);
          return;
        }

        setSuccessMessage(`${file.name} uploaded successfully.`);
        setSelectedFile(null);
        setLastFailedFile(null);
        setPhase("complete");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        router.refresh();
      } catch (error) {
        if (uploadedStoragePath) {
          await removeDocumentFromStorage(uploadedStoragePath);
        }

        setErrorMessage(
          error instanceof Error ? error.message : ANALYSIS_ERRORS.uploadFailed
        );
        setPhase("failed");
        setLastFailedFile(file);
      }
    },
    [documentType, projectId, router]
  );

  async function handleUpload() {
    if (!selectedFile) {
      setErrorMessage("Choose a file to upload.");
      return;
    }

    await runUpload(selectedFile);
  }

  async function handleRetry() {
    const file = lastFailedFile ?? selectedFile;
    if (!file) {
      return;
    }
    setSelectedFile(file);
    await runUpload(file);
  }

  const statusLabel =
    phase === "uploading"
      ? "Uploading…"
      : phase === "processing"
        ? "Processing…"
        : phase === "complete"
          ? "Complete"
          : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload documents</CardTitle>
        <CardDescription>
          PDF, PNG, JPG, DOCX, and XLSX up to 50 MB. Files upload directly to
          secure storage.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <Label htmlFor="documentType">Document type</Label>
          <select
            id="documentType"
            className={selectClassName}
            value={documentType}
            onChange={(event) =>
              setDocumentType(event.target.value as DocumentClassification)
            }
            disabled={isBusy}
          >
            {DOCUMENT_CLASSIFICATIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors",
            "hover:border-primary/40 hover:bg-muted/50",
            isDragging && "border-primary bg-primary/5",
            isBusy && "pointer-events-none opacity-60"
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-background ring-1 ring-border">
            <HugeiconsIcon
              icon={isDragging ? FileUploadIcon : CloudUploadIcon}
              className="size-5 text-muted-foreground"
              strokeWidth={2}
            />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Drag and drop a file here
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              or use the file picker below
            </p>
          </div>
          {selectedFile ? (
            <p className="font-mono text-xs text-foreground">
              {selectedFile.name}
            </p>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptAttributeForFilePicker()}
          className="sr-only"
          disabled={isBusy}
          onChange={(event) => {
            handleFiles(event.target.files);
          }}
        />

        {isBusy || phase === "complete" ? (
          <div className="space-y-2" role="status" aria-live="polite">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{statusLabel}</span>
              {phase === "complete" ? (
                <span className="text-emerald-700 dark:text-emerald-400">
                  Done
                </span>
              ) : null}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  phase === "complete"
                    ? "w-full bg-emerald-600"
                    : "w-2/3 animate-pulse bg-primary"
                )}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose file
          </Button>
          <Button
            type="button"
            disabled={isBusy || !selectedFile}
            onClick={() => void handleUpload()}
          >
            {phase === "uploading"
              ? "Uploading…"
              : phase === "processing"
                ? "Processing…"
                : "Upload document"}
          </Button>
          {phase === "failed" && (lastFailedFile || selectedFile) ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isBusy}
              onClick={() => void handleRetry()}
            >
              Retry upload
            </Button>
          ) : null}
        </div>

        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p
            className="text-sm text-emerald-700 dark:text-emerald-400"
            role="status"
          >
            {successMessage}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
