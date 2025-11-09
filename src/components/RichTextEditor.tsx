import React, { useState, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bold, Italic, List, ListOrdered, Heading2, Link as LinkIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  teamMembers?: Array<{ id: string; full_name: string; email: string }>;
}

export function RichTextEditor({ content, onChange, placeholder, teamMembers = [] }: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Type your message...",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    
    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkUrl("");
    setLinkPopoverOpen(false);
  }, [editor, linkUrl]);

  // Sync editor content when content prop changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-shadow overflow-hidden">
      <div className="border-b p-2 flex gap-1 bg-muted/50 flex-wrap">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-muted" : ""}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-muted" : ""}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "bg-muted" : ""}
          title="Heading"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-muted" : ""}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-muted" : ""}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className={editor.isActive("link") ? "bg-muted" : ""}
              title="Add Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">URL</label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setLink();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={setLink}
                  className="flex-1"
                >
                  Add Link
                </Button>
                {editor.isActive("link") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      editor.chain().focus().unsetLink().run();
                      setLinkPopoverOpen(false);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}