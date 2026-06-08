'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import { FontSize } from '@/components/rich-text/font-size';

type Props = {
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  onChange?: (html: string) => void;
};

const TOOL_BTN =
  'inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium ' +
  'text-brand-ink hover:bg-brand-surface-2 ring-1 ring-inset ring-brand-border/70';
const TOOL_BTN_ACTIVE = 'bg-brand-surface-2';

function clampFontSize(px: number) {
  return Math.max(12, Math.min(24, Math.round(px)));
}

export function RichTextEditor({
  name,
  defaultValue = '',
  required = false,
  placeholder = 'Write the release content…',
  onChange,
}: Props) {
  const inputId = useId();
  const [html, setHtml] = useState<string>(defaultValue);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: { rel: 'noreferrer noopener', target: '_blank' },
      }),
      TextStyle,
      Color,
      FontSize,
    ],
    [placeholder]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: defaultValue || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'bb-rte-editor min-h-[240px] px-4 py-3 text-sm leading-relaxed text-brand-ink focus:outline-none',
        'aria-labelledby': `${inputId}-label`,
      },
    },
    onUpdate({ editor }) {
      const next = editor.getHTML();
      setHtml(next);
      onChange?.(next);
    },
  });

  useEffect(() => {
    if (!editor) return;
    // Keep hidden input in sync on first paint.
    const next = editor.getHTML();
    setHtml(next);
    onChange?.(next);
  }, [editor, onChange]);

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const next = window.prompt('Enter URL', prev ?? 'https://');
    if (next == null) return;
    const url = next.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  function setFontSize(sizePx: number) {
    if (!editor) return;
    const px = clampFontSize(sizePx);
    editor.chain().focus().setMark('textStyle', { fontSize: `${px}px` }).run();
  }

  return (
    <div className="rounded-xl bg-white ring-1 ring-inset ring-brand-border shadow-sm">
      <input id={inputId} type="hidden" name={name} value={html} required={required} />

      <div className="bb-rte-toolbar flex flex-wrap gap-2 border-b border-brand-border p-3">
        <button
          type="button"
          className={`${TOOL_BTN} ${editor?.isActive('bold') ? TOOL_BTN_ACTIVE : ''}`}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          aria-pressed={!!editor?.isActive('bold')}
        >
          Bold
        </button>
        <button
          type="button"
          className={`${TOOL_BTN} ${editor?.isActive('italic') ? TOOL_BTN_ACTIVE : ''}`}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          aria-pressed={!!editor?.isActive('italic')}
        >
          Italic
        </button>
        <button
          type="button"
          className={`${TOOL_BTN} ${editor?.isActive('underline') ? TOOL_BTN_ACTIVE : ''}`}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          aria-pressed={!!editor?.isActive('underline')}
        >
          Underline
        </button>

        <span className="mx-1 h-8 w-px bg-brand-border" aria-hidden />

        <button
          type="button"
          className={`${TOOL_BTN} ${editor?.isActive('heading', { level: 1 }) ? TOOL_BTN_ACTIVE : ''}`}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          aria-pressed={!!editor?.isActive('heading', { level: 1 })}
        >
          H1
        </button>
        <button
          type="button"
          className={`${TOOL_BTN} ${editor?.isActive('heading', { level: 2 }) ? TOOL_BTN_ACTIVE : ''}`}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-pressed={!!editor?.isActive('heading', { level: 2 })}
        >
          H2
        </button>
        <button
          type="button"
          className={`${TOOL_BTN} ${editor?.isActive('heading', { level: 3 }) ? TOOL_BTN_ACTIVE : ''}`}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-pressed={!!editor?.isActive('heading', { level: 3 })}
        >
          H3
        </button>

        <span className="mx-1 h-8 w-px bg-brand-border" aria-hidden />

        <button
          type="button"
          className={`${TOOL_BTN} ${editor?.isActive('bulletList') ? TOOL_BTN_ACTIVE : ''}`}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          aria-pressed={!!editor?.isActive('bulletList')}
        >
          Bullets
        </button>
        <button
          type="button"
          className={`${TOOL_BTN} ${editor?.isActive('orderedList') ? TOOL_BTN_ACTIVE : ''}`}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          aria-pressed={!!editor?.isActive('orderedList')}
        >
          Numbered
        </button>
        <button
          type="button"
          className={`${TOOL_BTN} ${editor?.isActive('blockquote') ? TOOL_BTN_ACTIVE : ''}`}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          aria-pressed={!!editor?.isActive('blockquote')}
        >
          Quote
        </button>

        <span className="mx-1 h-8 w-px bg-brand-border" aria-hidden />

        <button
          type="button"
          className={`${TOOL_BTN} ${editor?.isActive('link') ? TOOL_BTN_ACTIVE : ''}`}
          onClick={setLink}
          aria-pressed={!!editor?.isActive('link')}
        >
          Link
        </button>

        <label className="inline-flex items-center gap-2 text-xs text-brand-muted">
          <span className="sr-only">Font size</span>
          <select
            className="h-8 rounded-md bg-white px-2 text-xs text-brand-ink ring-1 ring-inset ring-brand-border/70"
            defaultValue="16"
            onChange={(e) => setFontSize(Number(e.target.value))}
          >
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16">16px</option>
            <option value="18">18px</option>
            <option value="20">20px</option>
            <option value="24">24px</option>
          </select>
        </label>

        <label className="inline-flex items-center gap-2 text-xs text-brand-muted">
          <span className="sr-only">Text color</span>
          <input
            type="color"
            className="h-8 w-10 rounded-md bg-white p-1 ring-1 ring-inset ring-brand-border/70"
            onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
            aria-label="Text color"
          />
        </label>

        <button
          type="button"
          className={TOOL_BTN}
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .unsetColor()
              .setMark('textStyle', { fontSize: null })
              .run()
          }
        >
          Clear styles
        </button>
      </div>

      <div className="bb-rte-content">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="min-h-[240px] px-4 py-3 text-sm text-brand-muted">
            Loading editor…
          </div>
        )}
      </div>
    </div>
  );
}

