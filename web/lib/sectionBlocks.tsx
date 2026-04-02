/**
 * Shared section content renderer used in both TaxonomyTab and ProjectsTab.
 */

import React from "react";
import { parseContent } from "@/lib/renderContent";

const REF_PATTERN =
  /\b(VMD\d{4,5}|VT\d{4,5}|VM\d{4,5}|(?:Module\s+)?(?:BL-[A-Z]+|M-[A-Z+]+|[A-Z]{2,}-[A-Z\d]+)|Equations?\s*\(\d+(?:[.-]\d+)*\)|Eq\.\s*\d+(?:[.-]\d+)*|(?:Equation|Table|Figure|Appendix)\s+\d+(?:[.-]\d+)*|Box\s+\d+|Quantification\s+Approach\s+\d+)\b/g;

export function inlineWithRefs(
  text: string,
  onRefClick: (ref: string) => void,
  openRef: string | null,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  REF_PATTERN.lastIndex = 0;
  while ((match = REF_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const normalized = match[0]
      .replace(/^Module\s+/, "")
      .replace(/^Equations\b/, "Equation");
    const active = openRef === normalized;
    parts.push(
      <button
        key={match.index}
        onClick={() => onRefClick(normalized)}
        className={`inline font-mono text-[11px] px-1 py-0.5 rounded border mx-0.5 transition-colors ${
          active
            ? "bg-blue-900/60 border-blue-700 text-blue-200"
            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        }`}
      >
        {match[0]}
      </button>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function SectionBlocks({
  content,
  onRefClick,
  openRef,
}: {
  content: string;
  onRefClick: (ref: string) => void;
  openRef: string | null;
}) {
  const blocks = parseContent(content);

  return (
    <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
      {blocks.map((block, bi) => {
        if (block.type === "pipe_table") {
          return (
            <div key={bi} className="overflow-x-auto">
              <table className="text-xs border-collapse">
                {block.headers.length > 0 && (
                  <thead>
                    <tr>
                      {block.headers.map((h, hi) => (
                        <th
                          key={hi}
                          className="text-left px-3 py-2 border border-zinc-700 bg-zinc-800/60 text-zinc-300 font-semibold whitespace-nowrap"
                        >
                          {inlineWithRefs(h, onRefClick, openRef)}
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
                          className="px-3 py-2 border border-zinc-700/60 text-zinc-300 align-top whitespace-nowrap"
                        >
                          {inlineWithRefs(cell, onRefClick, openRef)}
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
              className={"space-y-1 pl-4 " + (block.ordered ? "list-decimal" : "list-disc")}
            >
              {block.items.map((item, ii) => (
                <li key={ii}>{inlineWithRefs(item, onRefClick, openRef)}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={bi}>{inlineWithRefs(block.text, onRefClick, openRef)}</p>
        );
      })}
    </div>
  );
}
