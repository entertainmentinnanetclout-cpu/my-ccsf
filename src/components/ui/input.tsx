import * as React from "react";

import { cn } from "@/lib/utils";
import { normaliseEvidenceMimeType } from "@/lib/evidenceFiles";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, onClick, onPointerDown, ...props }, ref) => {
    const isFileInput = type === "file";

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (isFileInput && event.currentTarget.files?.length && typeof DataTransfer !== "undefined") {
        try {
          const transfer = new DataTransfer();
          Array.from(event.currentTarget.files).forEach((file) => {
            const normalizedType = normaliseEvidenceMimeType(file);
            const needsNormalizedType = !file.type || file.type === "application/octet-stream";
            transfer.items.add(needsNormalizedType
              ? new File([file], file.name, { type: normalizedType, lastModified: file.lastModified })
              : file);
          });
          event.currentTarget.files = transfer.files;
        } catch (error) {
          console.warn("The mobile file metadata could not be normalised; using the original file selection.", error);
        }
      }
      onChange?.(event);
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onChange={handleChange}
        onPointerDown={(event) => {
          if (isFileInput) {
            try {
              sessionStorage.setItem("ccsf:file-picker-route", `${window.location.pathname}${window.location.search}${window.location.hash}`);
            } catch {
              // Session storage can be unavailable in strict private-browser modes.
            }
          }
          onPointerDown?.(event);
        }}
        onClick={(event) => {
          if (isFileInput) event.stopPropagation();
          onClick?.(event);
        }}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };