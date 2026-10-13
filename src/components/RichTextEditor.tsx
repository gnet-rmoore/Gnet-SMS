import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Image as ImageIcon,
  Code,
  Eye,
  Eraser,
  Heading1,
  Heading2,
  Quote,
  Palette,
  Undo,
  Redo,
  X,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const TEXT_COLORS = [
  "#000000",
  "#4b5563",
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#16a34a",
  "#0d9488",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#db2777",
];

const HIGHLIGHT_COLORS = [
  "#ffffff",
  "#f3f4f6",
  "#fee2e2",
  "#ffedd5",
  "#fef3c7",
  "#dcfce7",
  "#ccfbf1",
  "#dbeafe",
  "#e0e7ff",
  "#f3e8ff",
  "#fce7f3",
];

function ToolBtn({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${
        active ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-200 text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-slate-200 mx-1" />;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Write something…",
  minHeight = "200px",
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlValue, setHtmlValue] = useState(value || "");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("https://");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-indigo-600 underline font-semibold",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-xl max-w-full h-auto my-2",
        },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "w-full p-4 focus:outline-none overflow-y-auto text-slate-800 text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:text-slate-900 [&_h1]:my-2 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-slate-900 [&_h2]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_a]:text-indigo-600 [&_a]:underline",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      setHtmlValue(html);
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor || isHtmlMode) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next !== current) {
      editor.commands.setContent(next, { emitUpdate: false });
      setHtmlValue(next);
    }
  }, [value, editor, isHtmlMode]);

  if (!editor) {
    return (
      <div
        className="border border-slate-200 rounded-2xl bg-slate-50 animate-pulse"
        style={{ minHeight }}
      />
    );
  }

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url || url === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setLinkOpen(false);
    setLinkUrl("https://");
  };

  const applyImage = () => {
    const url = imageUrl.trim();
    if (url && url !== "https://") {
      editor.chain().focus().setImage({ src: url }).run();
    }
    setImageOpen(false);
    setImageUrl("https://");
  };

  const exitHtmlMode = () => {
    editor.commands.setContent(htmlValue || "", { emitUpdate: false });
    onChange(htmlValue || "");
    setIsHtmlMode(false);
  };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] hover:border-slate-300 transition-all focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200">
        <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="w-4 h-4" />
        </ToolBtn>

        <Divider />

        <ToolBtn
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn
          title="Strike"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="w-4 h-4" />
        </ToolBtn>

        <Divider />

        <ToolBtn
          title="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn
          title="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="w-4 h-4" />
        </ToolBtn>

        <Divider />

        <ToolBtn
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="w-4 h-4" />
        </ToolBtn>

        <Divider />

        <ToolBtn
          title="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn
          title="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn
          title="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="w-4 h-4" />
        </ToolBtn>

        <Divider />

        <div className="relative">
          <ToolBtn
            title="Text color"
            onClick={() => {
              setShowColorPicker((v) => !v);
              setShowBgColorPicker(false);
            }}
          >
            <Palette className="w-4 h-4 text-indigo-600" />
          </ToolBtn>
          {showColorPicker && (
            <div className="absolute top-8 left-0 z-50 bg-white border border-slate-200 shadow-xl rounded-xl p-2 grid grid-cols-6 gap-1 w-44">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowColorPicker(false);
                  }}
                  className="w-6 h-6 rounded-md border border-slate-100 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <ToolBtn
            title="Highlight"
            onClick={() => {
              setShowBgColorPicker((v) => !v);
              setShowColorPicker(false);
            }}
          >
            <span className="w-4 h-4 rounded bg-amber-200 border border-amber-300 block text-xs font-bold text-center leading-tight text-slate-700">
              A
            </span>
          </ToolBtn>
          {showBgColorPicker && (
            <div className="absolute top-8 left-0 z-50 bg-white border border-slate-200 shadow-xl rounded-xl p-2 grid grid-cols-6 gap-1 w-44">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (color === "#ffffff") {
                      editor.chain().focus().unsetHighlight().run();
                    } else {
                      editor.chain().focus().toggleHighlight({ color }).run();
                    }
                    setShowBgColorPicker(false);
                  }}
                  className="w-6 h-6 rounded-md border border-slate-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        <Divider />

        <ToolBtn
          title="Insert link"
          active={editor.isActive("link")}
          onClick={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            setLinkUrl(prev || "https://");
            setLinkOpen(true);
            setImageOpen(false);
            setShowColorPicker(false);
            setShowBgColorPicker(false);
          }}
        >
          <Link2 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn
          title="Insert image URL"
          onClick={() => {
            setImageOpen(true);
            setLinkOpen(false);
            setShowColorPicker(false);
            setShowBgColorPicker(false);
          }}
        >
          <ImageIcon className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn
          title="Clear formatting"
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().setParagraph().run()
          }
        >
          <Eraser className="w-4 h-4" />
        </ToolBtn>

        <div className="w-px h-5 bg-slate-200 mx-1 flex-1 min-w-[4px]" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (isHtmlMode) {
              exitHtmlMode();
            } else {
              setHtmlValue(editor.getHTML());
              setIsHtmlMode(true);
            }
          }}
          className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all ${
            isHtmlMode ? "bg-slate-800 text-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]" : "hover:bg-slate-200 text-slate-700"
          }`}
          title={isHtmlMode ? "Visual view" : "HTML source"}
        >
          {isHtmlMode ? <Eye className="w-4 h-4" /> : <Code className="w-4 h-4" />}
          <span>{isHtmlMode ? "Visual" : "Source"}</span>
        </button>
      </div>

      {(linkOpen || imageOpen) && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-white border-b border-slate-100">
          {linkOpen && (
            <>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  }
                }}
                className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://…"
                autoFocus
              />
              <button
                type="button"
                onClick={applyLink}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                Apply link
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setLinkOpen(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setLinkOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          {imageOpen && (
            <>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyImage();
                  }
                }}
                className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Image https://…"
                autoFocus
              />
              <button
                type="button"
                onClick={applyImage}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                Insert
              </button>
              <button
                type="button"
                onClick={() => setImageOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}

      {isHtmlMode ? (
        <textarea
          value={htmlValue}
          onChange={(e) => {
            setHtmlValue(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full p-4 font-mono text-sm bg-slate-900 text-emerald-400 border-none focus:outline-none focus:ring-0 resize-y"
          style={{ minHeight }}
          placeholder="HTML source…"
        />
      ) : (
        <div className="relative" style={{ minHeight }}>
          {editor.isEmpty && (
            <p className="absolute top-4 left-4 text-slate-400 text-sm pointer-events-none select-none">
              {placeholder}
            </p>
          )}
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
};
