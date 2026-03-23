"use client";

import { useRef, useEffect } from "react";

export function EmailBodyViewer({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resize = () => {
      const doc = iframe.contentDocument;
      if (doc?.body) {
        iframe.style.height = `${doc.body.scrollHeight + 20}px`;
      }
    };

    iframe.addEventListener("load", resize);
    return () => iframe.removeEventListener("load", resize);
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-500">Тело письма</h3>
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        sandbox=""
        className="w-full border-0"
        style={{ minHeight: 200 }}
      />
    </div>
  );
}
