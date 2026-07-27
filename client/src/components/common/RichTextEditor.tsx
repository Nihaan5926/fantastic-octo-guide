import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, Heading1, Heading2, Quote, Code } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

const Toolbar: React.FC<{ editor: any }> = ({ editor }) => {
  if (!editor) return null;
  const btnClass = (active: boolean) =>
    `p-1.5 rounded hover:bg-bg-hover ${active ? 'text-accent bg-bg-hover' : 'text-text-secondary'}`;

  return (
    <div className="flex items-center gap-0.5 border-b border-border pb-2 mb-2 flex-wrap">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnClass(editor.isActive('bold'))}
        title="Bold"
      >
        <Bold size={15} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive('italic'))}
        title="Italic"
      >
        <Italic size={15} />
      </button>
      <div className="w-px h-5 bg-border mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btnClass(editor.isActive('heading', { level: 1 }))}
        title="Heading 1"
      >
        <Heading1 size={15} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btnClass(editor.isActive('heading', { level: 2 }))}
        title="Heading 2"
      >
        <Heading2 size={15} />
      </button>
      <div className="w-px h-5 bg-border mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnClass(editor.isActive('bulletList'))}
        title="Bullet List"
      >
        <List size={15} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btnClass(editor.isActive('blockquote'))}
        title="Quote"
      >
        <Quote size={15} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={btnClass(editor.isActive('codeBlock'))}
        title="Code Block"
      >
        <Code size={15} />
      </button>
    </div>
  );
};

function contentToHTML(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (content.content && Array.isArray(content.content)) {
    return contentToHTML(content.content);
  }
  if (Array.isArray(content)) {
    return content.map((node: any) => {
      if (node.type === 'paragraph') {
        const inner = node.content ? node.content.map((c: any) => c.text || '').join('') : '';
        return `<p>${inner}</p>`;
      }
      if (node.type === 'text') return node.text || '';
      return '';
    }).join('');
  }
  if (content.body) return content.body;
  return JSON.stringify(content);
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  editable = true,
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: contentToHTML(content),
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  return (
    <div
      className={`richtext-editor ${!editable ? 'richtext-readonly' : ''} border border-border rounded-lg bg-bg-primary ${className}`}
    >
      {editable && editor && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className={`prose prose-invert prose-sm max-w-none ${editable ? 'p-3' : 'p-4'}`}
      />
      <style>{`
        .richtext-editor .ProseMirror {
          min-height: ${editable ? '120px' : 'auto'};
          outline: none;
        }
        .richtext-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: #64748b;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .richtext-editor .ProseMirror h1 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0; }
        .richtext-editor .ProseMirror h2 { font-size: 1.25em; font-weight: 600; margin: 0.5em 0; }
        .richtext-editor .ProseMirror h3 { font-size: 1.1em; font-weight: 600; margin: 0.5em 0; }
        .richtext-editor .ProseMirror blockquote {
          border-left: 3px solid #3b82f6;
          padding-left: 1em;
          margin: 0.5em 0;
          color: #94a3b8;
        }
        .richtext-editor .ProseMirror ul { padding-left: 1.5em; list-style: disc; }
        .richtext-editor .ProseMirror ol { padding-left: 1.5em; list-style: decimal; }
        .richtext-editor .ProseMirror li { margin: 0.2em 0; }
        .richtext-editor .ProseMirror code { background: #1e293b; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; }
        .richtext-editor .ProseMirror pre {
          background: #1e293b; padding: 1em; border-radius: 8px; overflow-x: auto;
        }
        .richtext-editor .ProseMirror pre code { background: none; padding: 0; }
        .richtext-readonly .ProseMirror { cursor: default; }
        .richtext-editor .ProseMirror strong { font-weight: 700; color: #e2e8f0; }
        .richtext-editor .ProseMirror em { font-style: italic; }
      `}</style>
    </div>
  );
}
