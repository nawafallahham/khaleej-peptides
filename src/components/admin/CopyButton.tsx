"use client";

import { useState } from "react";

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for older browsers.
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex items-center gap-2">
      <code className="truncate rounded bg-plum/10 px-2 py-1 text-[0.72rem] text-plum-deep">
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-plum/5"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
