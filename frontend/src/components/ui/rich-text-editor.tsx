"use client";

import dynamic from "next/dynamic";
import { useMemo, ComponentType } from "react";

interface QuillProps {
  theme: string;
  value: string;
  onChange: (value: string, delta: unknown, source: unknown, editor: unknown) => void;
  modules: Record<string, unknown>;
  formats: string[];
  placeholder?: string;
  className?: string;
}

const ReactQuill = dynamic(
  () => import("react-quill-new").then(mod => (mod.default || mod) as unknown as ComponentType<QuillProps>),
  { 
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-slate-50 border border-slate-200 animate-pulse rounded-md flex items-center justify-center text-slate-400">Memuat Editor...</div>
  }
);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  
  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ font: [] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      [{ color: [] }, { background: [] }],
      ["link", "image", "video"],
      ["clean"],
    ],
  }), []);

  const formats = [
    "header",
    "font",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "list",
    "align",
    "color",
    "background",
    "link",
    "image",
    "video",
  ];

  return (
    <div className={`relative ${className || ''}`}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="bg-white rounded-md mb-12 min-h-[300px] [&>.ql-container]:min-h-[300px] [&>.ql-container]:text-base [&>.ql-container]:rounded-b-md [&>.ql-toolbar]:rounded-t-md [&>.ql-toolbar]:bg-slate-50 [&>.ql-editor]:min-h-[300px]"
      />
      {/* Global styles overriding Quill defaults for a modern look */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://cdn.jsdelivr.net/npm/react-quill-new@3/dist/quill.snow.css');
        .ql-toolbar.ql-snow {
          border-color: var(--color-slate-200);
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          padding: 8px 12px;
        }
        .ql-container.ql-snow {
          border-color: var(--color-slate-200);
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
        }
        .ql-editor {
          font-family: inherit;
        }
      `}} />
    </div>
  );
}
