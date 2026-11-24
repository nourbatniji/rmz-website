"use client";

import { useState } from "react";

/** Makes an element a drop target for ONE file. `accept` is a MIME prefix ("image/", "video/"); other files are reported through `onReject`. */
export function useDrop(accept: string, onFile: (file: File) => void, onReject: (message: string) => void, disabled = false) {
  const [over, setOver] = useState(false);
  return {
    over,
    props: {
      onDragEnter: (e: React.DragEvent) => {
        if (disabled) return;
        e.preventDefault();
        setOver(true);
      },
      onDragOver: (e: React.DragEvent) => {
        if (disabled) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setOver(true);
      },
      onDragLeave: (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setOver(false);
        if (disabled) return;
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (!file.type.startsWith(accept)) return onReject(accept === "image/" ? "That isn't an image. Drop a JPG, PNG, WebP or AVIF file." : "That isn't a video. Drop an MP4 or WebM file.");
        onFile(file);
      },
    },
  };
}
