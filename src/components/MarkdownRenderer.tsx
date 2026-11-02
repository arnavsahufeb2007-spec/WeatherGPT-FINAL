import React from "react";

export type MarkdownNodeType =
  | "heading"
  | "code-block"
  | "bullet-list"
  | "bullet-item"
  | "numbered-list"
  | "numbered-item"
  | "blockquote"
  | "paragraph"
  | "text"
  | "bold"
  | "italic"
  | "code"
  | "link";

export interface MarkdownNode {
  type: MarkdownNodeType;
  level?: number;
  language?: string;
  href?: string;
  text?: string;
  children?: MarkdownNode[];
}

/**
 * Validates URLs to prevent script injection and malicious schemes.
 * Only http, https, and mailto protocols are permitted.
 */
export function isSafeUrl(url?: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Disallow forbidden protocols
  if (/^(?:javascript|data|vbscript|file):/i.test(trimmed)) {
    return false;
  }

  try {
    // Relative URLs or anchors
    if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
      return true;
    }
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:";
  } catch {
    // If not a valid absolute URL, allow safe relative paths only
    return !trimmed.includes(":") && !trimmed.startsWith("//");
  }
}

/**
 * Parse inline markdown tokens: **bold**, *italic*, `code`, and [link](url).
 * Preserves mathematical operations (e.g. 3 * 5 = 15) and currency/symbols ($100, 28°C).
 */
export function parseInlineMarkdown(text: string): MarkdownNode[] {
  if (!text) return [];

  const nodes: MarkdownNode[] = [];
  let index = 0;
  const len = text.length;

  while (index < len) {
    // 1. Inline code: `code`
    if (text[index] === "`") {
      const endTick = text.indexOf("`", index + 1);
      if (endTick !== -1) {
        const codeText = text.slice(index + 1, endTick);
        nodes.push({ type: "code", text: codeText });
        index = endTick + 1;
        continue;
      }
    }

    // 2. Bold text: **bold** or __bold__
    if (
      (text[index] === "*" && text[index + 1] === "*") ||
      (text[index] === "_" && text[index + 1] === "_")
    ) {
      const marker = text.slice(index, index + 2);
      const endMarker = text.indexOf(marker, index + 2);
      if (endMarker !== -1) {
        const boldContent = text.slice(index + 2, endMarker);
        // Recursively parse any nested tokens inside bold (e.g. bold link or code)
        nodes.push({
          type: "bold",
          text: boldContent,
          children: parseInlineMarkdown(boldContent),
        });
        index = endMarker + 2;
        continue;
      }
    }

    // 3. Links: [title](url)
    if (text[index] === "[") {
      const closeBracket = text.indexOf("]", index + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === "(") {
        const closeParen = text.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          const title = text.slice(index + 1, closeBracket);
          const rawUrl = text.slice(closeBracket + 2, closeParen).trim();
          const safeHref = isSafeUrl(rawUrl) ? rawUrl : "#";
          nodes.push({
            type: "link",
            text: title,
            href: safeHref,
          });
          index = closeParen + 1;
          continue;
        }
      }
    }

    // 4. Italic text: *italic* or _italic_
    // Distinguish from standalone math multiplication: "3 * 5 = 15" or bullet characters
    if ((text[index] === "*" || text[index] === "_") && index + 1 < len) {
      const marker = text[index];
      // If preceded or followed by digits/spaces in a math pattern, treat as literal text
      const prevChar = index > 0 ? text[index - 1] : " ";
      const nextChar = text[index + 1];

      const isLikelyMath =
        (/\d|\s/.test(prevChar) && /\s/.test(nextChar)) ||
        (/\s/.test(prevChar) && /\s|\d/.test(nextChar));

      if (!isLikelyMath) {
        const endMarker = text.indexOf(marker, index + 1);
        if (endMarker !== -1 && endMarker > index + 1) {
          const italicContent = text.slice(index + 1, endMarker);
          nodes.push({
            type: "italic",
            text: italicContent,
          });
          index = endMarker + 1;
          continue;
        }
      }
    }

    // Accumulate plain text chunk until next token candidate
    let nextTokenPos = len;
    for (const char of ["`", "*", "_", "["]) {
      const pos = text.indexOf(char, index + 1);
      if (pos !== -1 && pos < nextTokenPos) {
        nextTokenPos = pos;
      }
    }

    const plainText = text.slice(index, nextTokenPos);
    nodes.push({ type: "text", text: plainText });
    index = nextTokenPos;
  }

  return nodes;
}

/**
 * Top-level block parser: converts markdown string into structured AST.
 * Handles headings, code blocks, lists (unordered & ordered), blockquotes, and paragraphs.
 */
export function parseMarkdownToNodes(content: string): MarkdownNode[] {
  if (!content) return [];

  const lines = content.split("\n");
  const nodes: MarkdownNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];

  let currentBulletList: MarkdownNode[] | null = null;
  let currentNumberedList: MarkdownNode[] | null = null;

  const flushLists = () => {
    if (currentBulletList) {
      nodes.push({
        type: "bullet-list",
        children: currentBulletList,
      });
      currentBulletList = null;
    }
    if (currentNumberedList) {
      nodes.push({
        type: "numbered-list",
        children: currentNumberedList,
      });
      currentNumberedList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Fenced Code Block handling (```lang ... ```)
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        nodes.push({
          type: "code-block",
          language: codeBlockLang,
          text: codeBlockLines.join("\n"),
        });
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = "";
      } else {
        flushLists();
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Empty line separates blocks and flushes lists
    if (!trimmed) {
      flushLists();
      continue;
    }

    // Headings: #, ##, ###, ####
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushLists();
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      nodes.push({
        type: "heading",
        level,
        text,
        children: parseInlineMarkdown(text),
      });
      continue;
    }

    // Blockquote: > quote
    if (trimmed.startsWith("> ")) {
      flushLists();
      const quoteText = trimmed.slice(2).trim();
      nodes.push({
        type: "blockquote",
        text: quoteText,
        children: parseInlineMarkdown(quoteText),
      });
      continue;
    }

    // Unordered List Items: •, -, * (with space)
    const bulletMatch = trimmed.match(/^(?:•|-|\*)\s+(.+)$/);
    if (bulletMatch) {
      if (currentNumberedList) {
        flushLists();
      }
      if (!currentBulletList) {
        currentBulletList = [];
      }
      const itemText = bulletMatch[1];
      currentBulletList.push({
        type: "bullet-item",
        text: itemText,
        children: parseInlineMarkdown(itemText),
      });
      continue;
    }

    // Ordered List Items: 1., 2. etc.
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      if (currentBulletList) {
        flushLists();
      }
      if (!currentNumberedList) {
        currentNumberedList = [];
      }
      const itemText = numberedMatch[2];
      currentNumberedList.push({
        type: "numbered-item",
        text: itemText,
        children: parseInlineMarkdown(itemText),
      });
      continue;
    }

    // Standard Paragraph
    flushLists();
    nodes.push({
      type: "paragraph",
      text: line,
      children: parseInlineMarkdown(line),
    });
  }

  // Handle unclosed code block or trailing list items (streaming safety)
  if (inCodeBlock) {
    nodes.push({
      type: "code-block",
      language: codeBlockLang,
      text: codeBlockLines.join("\n"),
    });
  }

  flushLists();
  return nodes;
}

/**
 * Render inline AST node into safe React components
 */
function renderInlineNode(node: MarkdownNode, key: string | number): React.ReactNode {
  switch (node.type) {
    case "bold":
      return (
        <strong key={key} className="font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900">
          {node.children && node.children.length > 0
            ? node.children.map((c, i) => renderInlineNode(c, `${key}_${i}`))
            : node.text}
        </strong>
      );
    case "italic":
      return (
        <em key={key} className="italic text-slate-300 dark:text-slate-300 light:text-slate-700">
          {node.text}
        </em>
      );
    case "code":
      return (
        <code
          key={key}
          className="px-1 py-0.5 rounded-[3px] bg-[#252A32] dark:bg-[#252A32] light:bg-slate-200 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-800 font-mono text-xs border border-[#30353D] dark:border-[#30353D] light:border-slate-300"
        >
          {node.text}
        </code>
      );
    case "link":
      return (
        <a
          key={key}
          href={node.href || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#8ECAE6] hover:underline underline-offset-2 font-medium"
        >
          {node.text || node.href}
        </a>
      );
    case "text":
    default:
      return <React.Fragment key={key}>{node.text}</React.Fragment>;
  }
}

/**
 * Render block AST node into safe React components
 */
function renderBlockNode(node: MarkdownNode, index: number): React.ReactNode {
  switch (node.type) {
    case "heading": {
      const headingContent = node.children
        ? node.children.map((c, i) => renderInlineNode(c, i))
        : node.text;

      if (node.level === 1) {
        return (
          <h1 key={index} className="text-base sm:text-lg font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900 my-2">
            {headingContent}
          </h1>
        );
      }
      if (node.level === 2) {
        return (
          <h2 key={index} className="text-sm sm:text-base font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900 my-1.5">
            {headingContent}
          </h2>
        );
      }
      if (node.level === 3) {
        return (
          <h3 key={index} className="text-xs sm:text-sm font-semibold font-mono text-slate-200 dark:text-slate-200 light:text-slate-800 my-1">
            {headingContent}
          </h3>
        );
      }
      return (
        <h4 key={index} className="text-xs font-semibold font-mono text-slate-300 dark:text-slate-300 light:text-slate-700 my-1">
          {headingContent}
        </h4>
      );
    }

    case "code-block":
      return (
        <div key={index} className="my-2.5 rounded-[6px] overflow-hidden border border-[#30353D] dark:border-[#30353D] light:border-slate-300 bg-[#0F141A] dark:bg-[#0F141A] light:bg-slate-900">
          {node.language && (
            <div className="px-3 py-1 bg-[#171C23] border-b border-[#30353D] text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              {node.language}
            </div>
          )}
          <pre className="p-3 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed whitespace-pre">
            <code>{node.text}</code>
          </pre>
        </div>
      );

    case "bullet-list":
      return (
        <ul key={index} className="list-disc pl-5 my-1.5 space-y-1 text-inherit">
          {node.children?.map((item, itemIdx) => (
            <li key={itemIdx} className="leading-relaxed">
              {item.children?.map((c, i) => renderInlineNode(c, i)) || item.text}
            </li>
          ))}
        </ul>
      );

    case "numbered-list":
      return (
        <ol key={index} className="list-decimal pl-5 my-1.5 space-y-1 text-inherit">
          {node.children?.map((item, itemIdx) => (
            <li key={itemIdx} className="leading-relaxed">
              {item.children?.map((c, i) => renderInlineNode(c, i)) || item.text}
            </li>
          ))}
        </ol>
      );

    case "blockquote":
      return (
        <blockquote
          key={index}
          className="border-l-2 border-[#8ECAE6] pl-3 py-1 my-2 text-xs sm:text-sm text-slate-400 italic bg-[#1B2027]/50 rounded-r"
        >
          {node.children?.map((c, i) => renderInlineNode(c, i)) || node.text}
        </blockquote>
      );

    case "paragraph":
    default:
      return (
        <p key={index} className="leading-relaxed min-h-[1.25rem]">
          {node.children && node.children.length > 0
            ? node.children.map((c, i) => renderInlineNode(c, i))
            : node.text}
        </p>
      );
  }
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Secure Markdown Renderer for WeatherGPT chat responses.
 *
 * Guarantees:
 * 1. Safe parsing of headings, bold text, bullet/numbered lists, inline code, code blocks, and links.
 * 2. Strict XSS prevention: rejects javascript: and data: URLs; never uses innerHTML.
 * 3. Preserves mathematical symbols (*, $, %, °C, #) without indiscriminate stripping.
 * 4. Safe progressive streaming without layout collapse.
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  const nodes = parseMarkdownToNodes(content);

  return (
    <div className={`space-y-1.5 text-xs sm:text-sm leading-relaxed ${className}`}>
      {nodes.map((node, i) => renderBlockNode(node, i))}
    </div>
  );
}
