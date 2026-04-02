/**
 * Renders extracted section content (plain text from PDFs) with:
 * - Pipe-style markdown tables → <table>
 * - ASCII grid tables (---+--- separators) → <table>
 * - Numbered/bullet lists → <ol>/<ul>
 * - Plain paragraphs
 */

import React from "react";

type Block =
  | { type: "paragraph"; text: string }
  | { type: "pipe_table"; headers: string[]; rows: string[][] }
  | { type: "list"; ordered: boolean; items: string[] };

function splitCells(line: string): string[] {
  return line
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isSeparatorLine(line: string): boolean {
  return /^[\s|:\-+]+$/.test(line) && line.includes("-");
}

function isPipeLine(line: string): boolean {
  return line.trim().startsWith("|") || (line.includes("|") && line.trim().startsWith("|"));
}

export function parseContent(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines between blocks
    if (!trimmed) {
      i++;
      continue;
    }

    // --- Pipe table ---
    if (isPipeLine(trimmed)) {
      const tableLines: string[] = [];
      while (i < lines.length && (isPipeLine(lines[i].trim()) || isSeparatorLine(lines[i].trim()))) {
        tableLines.push(lines[i]);
        i++;
      }
      // Find header row (first non-separator)
      const dataLines = tableLines.filter((l) => !isSeparatorLine(l.trim()));
      if (dataLines.length >= 2) {
        const headers = splitCells(dataLines[0]);
        const rows = dataLines.slice(1).map(splitCells);
        blocks.push({ type: "pipe_table", headers, rows });
      } else if (dataLines.length === 1) {
        // Single row — just a row, no header
        blocks.push({ type: "pipe_table", headers: splitCells(dataLines[0]), rows: [] });
      }
      continue;
    }

    // --- Ordered list ---
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[\.\)]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    // --- Bullet list ---
    if (/^[-•*]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-•*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-•*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    // --- Paragraph: collect until blank line or block start ---
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isPipeLine(lines[i].trim()) &&
      !/^\d+[\.\)]\s/.test(lines[i].trim()) &&
      !/^[-•*]\s/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join(" ").trim() });
    }
  }

  return blocks;
}

export function RenderContent({ content }: { content: string }) {
  const blocks = parseContent(content);

  return (
    <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
      {blocks.map((block, bi) => {
        if (block.type === "pipe_table") {
          return (
            <div key={bi} className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                {block.headers.length > 0 && (
                  <thead>
                    <tr>
                      {block.headers.map((h, hi) => (
                        <th
                          key={hi}
                          className="text-left px-3 py-2 border border-zinc-700 bg-zinc-800/60 text-zinc-300 font-semibold whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {block.rows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? "bg-zinc-900/30" : ""}>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className="px-3 py-2 border border-zinc-700/60 text-zinc-300 align-top"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag
              key={bi}
              className={`space-y-1 ${block.ordered ? "list-decimal list-inside" : "list-disc list-inside"}`}
            >
              {block.items.map((item, ii) => (
                <li key={ii} className="text-zinc-300">
                  {item}
                </li>
              ))}
            </Tag>
          );
        }

        // paragraph
        return (
          <p key={bi} className="text-zinc-300">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
