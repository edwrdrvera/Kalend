"use client";

import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_INPUT_CLS } from "@/components/DateField";
import { parseWebLink } from "@/lib/web-link";

// Placeholder: links and files live in component state only, nothing is saved
// or uploaded yet. Swap in real storage when Resources get a backend.

interface ResourceLink {
  id: number;
  url: string;
  host: string;
}
interface ResourceFile {
  id: number;
  name: string;
  ext: string;
  size: string;
}

const SAMPLE_FILES: Omit<ResourceFile, "id">[] = [
  { name: "Scan 0412.pdf", ext: "PDF", size: "640 KB" },
  { name: "Photo.jpg", ext: "IMG", size: "2.1 MB" },
  { name: "Notes.docx", ext: "DOC", size: "32 KB" },
];

const HEADER_BTN =
  "flex h-7 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[12px] font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const REMOVE_BTN =
  "grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function PanelResourcesTab({ kindWord }: { kindWord: "Space" | "Group" }) {
  const [links, setLinks] = useState<ResourceLink[]>([]);
  const [files, setFiles] = useState<ResourceFile[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [seq, setSeq] = useState(1);

  function commitLink(e: FormEvent) {
    e.preventDefault();
    const raw = draft.trim();
    if (!raw) {
      setLinkOpen(false);
      return;
    }
    const link = parseWebLink(raw);
    if (!link) {
      setError("That does not look like a web address.");
      return;
    }
    setLinks((q) => [...q, { id: seq, url: link.href, host: link.host }]);
    setSeq(seq + 1);
    setLinkOpen(false);
    setDraft("");
    setError("");
  }

  function addFile() {
    const sample = SAMPLE_FILES[files.length % SAMPLE_FILES.length];
    setFiles((q) => [...q, { id: seq, ...sample }]);
    setSeq(seq + 1);
  }

  return (
    <div className="px-4 py-3">
      <section aria-label="Links">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-muted-foreground">
            Links<span className="ml-1.5 font-normal">{links.length}</span>
          </h3>
          <button type="button" onClick={() => setLinkOpen(true)} className={HEADER_BTN}>
            <Plus aria-hidden className="size-3.5" />
            Add link
          </button>
        </div>
        {linkOpen && (
          <form onSubmit={commitLink} className="mt-2">
            <input
              autoFocus
              aria-label="Link address"
              placeholder="Paste a link, then Enter"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError("");
              }}
              onBlur={() => {
                if (!draft.trim()) setLinkOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setLinkOpen(false);
                  setDraft("");
                  setError("");
                }
              }}
              className={cn(APP_INPUT_CLS, "w-full")}
            />
            {error && <p className="mt-1 text-[11.5px] text-red-600">{error}</p>}
          </form>
        )}
        {links.length === 0 && !linkOpen && (
          <p className="mt-2.5 text-[13px] leading-snug text-muted-foreground">
            Course pages, docs, shared folders. Add a link to keep it with this {kindWord}.
          </p>
        )}
        <ul className="mt-1.5">
          {links.map((link) => (
            <li key={link.id} className="flex items-center gap-2.5 py-1">
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  aria-hidden="true"
                  className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-muted text-[14px] font-bold text-muted-foreground"
                >
                  {link.host.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 truncate text-[13px]">{link.host}</span>
              </a>
              <button
                type="button"
                aria-label={`Remove ${link.host}`}
                onClick={() => setLinks((q) => q.filter((l) => l.id !== link.id))}
                className={REMOVE_BTN}
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Files" className="mt-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-muted-foreground">
            Files<span className="ml-1.5 font-normal">{files.length}</span>
          </h3>
          <button type="button" onClick={addFile} className={HEADER_BTN}>
            <Plus aria-hidden className="size-3.5" />
            Add file
          </button>
        </div>
        {files.length === 0 && (
          <div className="mt-3 rounded-xl border border-dashed border-border px-4 py-7 text-center text-[13px] text-muted-foreground">
            <div className="font-semibold text-foreground">No files yet</div>
            <p className="mt-1">Use Add file. Uploads are not saved yet.</p>
          </div>
        )}
        <ul className="mt-1.5">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-2.5 py-1">
              <div className="flex min-w-0 flex-1 items-center gap-2.5 py-1">
                <span
                  aria-hidden="true"
                  className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-muted text-[10px] font-bold tracking-wide text-muted-foreground"
                >
                  {file.ext}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px]">{file.name}</span>
                  <span className="block text-[11.5px] text-muted-foreground">{file.size}</span>
                </span>
              </div>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => setFiles((q) => q.filter((f) => f.id !== file.id))}
                className={REMOVE_BTN}
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
