import { Fragment } from "react";
import { parseNotes, type NotesInline } from "@/lib/notes-format";

function Inline({ part }: { part: NotesInline }) {
  if (part.type === "bold") return <strong className="font-semibold text-foreground">{part.text}</strong>;
  if (part.type === "link")
    return (
      <a
        href={part.href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-primary-text underline-offset-2 hover:underline"
      >
        {part.text}
      </a>
    );
  return <>{part.text}</>;
}

function Line({ parts }: { parts: NotesInline[] }) {
  return (
    <>
      {parts.map((part, i) => (
        <Inline key={i} part={part} />
      ))}
    </>
  );
}

/** Notes text with bold, bullet lists, and links shown as formatted. Builds React
 *  elements only, never HTML, and links only open http(s) addresses. */
export default function NotesView({ value }: { value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {parseNotes(value).map((block, i) =>
        block.type === "list" ? (
          <ul key={i} className="list-disc pl-5 marker:text-muted-foreground">
            {block.items.map((item, j) => (
              <li key={j}>
                <Line parts={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Line parts={line} />
              </Fragment>
            ))}
          </p>
        )
      )}
    </div>
  );
}
