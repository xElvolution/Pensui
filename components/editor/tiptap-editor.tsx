"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Image as ImageIcon,
  Link as LinkIcon,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";

interface Props {
  content: string;
  onChange: (content: string) => void;
}

function TbBtn({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors",
        active
          ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-hover)]"
          : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--surface)]"
      )}
    >
      {children}
    </button>
  );
}

export function TipTapEditor({ content, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: "Start writing…" }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[color:var(--accent-hover)] underline underline-offset-[3px]" },
      }),
      Underline,
    ],
    content: content ? safeParse(content) : undefined,
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },
  });

  const onUpload = useCallback(() => fileInputRef.current?.click(), []);

  const onFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload-image", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = await res.json();
        editor.chain().focus().setImage({ src: url }).run();
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [editor]
  );

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter URL:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return <div className="card h-[480px] skeleton" />;

  return (
    <div className="tiptap-editor card !p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 px-3 h-12 border-b border-[color:var(--border)] bg-[color:var(--surface)]">
        <TbBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="w-4 h-4" strokeWidth={2} />
        </TbBtn>
        <TbBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="w-4 h-4" strokeWidth={2} />
        </TbBtn>
        <TbBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" strokeWidth={2} />
        </TbBtn>

        <div className="w-px h-5 bg-[color:var(--border)] mx-1" />

        <TbBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" strokeWidth={2} />
        </TbBtn>
        <TbBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" strokeWidth={2} />
        </TbBtn>

        <div className="w-px h-5 bg-[color:var(--border)] mx-1" />

        <TbBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="w-4 h-4" strokeWidth={2} />
        </TbBtn>
        <TbBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" strokeWidth={2} />
        </TbBtn>
        <TbBtn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Quote"
        >
          <Quote className="w-4 h-4" strokeWidth={2} />
        </TbBtn>
        <TbBtn
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Code Block"
        >
          <Code className="w-4 h-4" strokeWidth={2} />
        </TbBtn>

        <div className="w-px h-5 bg-[color:var(--border)] mx-1" />

        <TbBtn onClick={onUpload} title="Insert Image">
          {uploading ? (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[color:var(--fg-muted)] border-t-[color:var(--accent-hover)] animate-spin" />
          ) : (
            <ImageIcon className="w-4 h-4" strokeWidth={2} />
          )}
        </TbBtn>
        <TbBtn
          onClick={addLink}
          active={editor.isActive("link")}
          title="Add Link"
        >
          <LinkIcon className="w-4 h-4" strokeWidth={2} />
        </TbBtn>

        <div className="flex-1" />

        <TbBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="w-4 h-4" strokeWidth={2} />
        </TbBtn>
        <TbBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="w-4 h-4" strokeWidth={2} />
        </TbBtn>
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelect}
        className="hidden"
      />
    </div>
  );
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
