import { LedgerEvent, Actor, getRuntimeColor } from "../types";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// Format ISO timestamp to friendly relative/absolute time
function formatTime(isoStr: string | undefined): string {
  if (!isoStr) return "—";
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return isoStr;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    const month = date.toLocaleString("en", { month: "short" });
    const day = date.getDate();
    const year = date.getFullYear();
    const currentYear = now.getFullYear();
    if (year === currentYear) return `${month} ${day}`;
    return `${month} ${day}, ${year}`;
  } catch {
    return isoStr;
  }
}

function formatEventLine(ev: LedgerEvent): string {
  if (ev.kind === "chat.message" && ev.data && typeof ev.data === "object") {
    return String(ev.data.text || "");
  }
  return "";
}

export interface MessageBubbleProps {
  event: LedgerEvent;
  actors: Actor[];
  isDark: boolean;
  groupId: string;
  onReply: () => void;
  onShowRecipients: () => void;
}

export function MessageBubble({
  event: ev,
  actors,
  isDark,
  groupId,
  onReply,
  onShowRecipients,
}: MessageBubbleProps) {
  const isUserMessage = ev.by === "user";
  const quoteText = ev.data?.quote_text;
  const attachments = Array.isArray(ev.data?.attachments) ? (ev.data.attachments as any[]) : [];
  const blobAttachments = attachments
    .filter((a) => a && typeof a === "object")
    .map((a) => ({
      kind: String((a as any).kind || "file"),
      path: String((a as any).path || ""),
      title: String((a as any).title || ""),
      bytes: Number((a as any).bytes || 0),
      mime_type: String((a as any).mime_type || ""),
    }))
    .filter((a) => a.path.startsWith("state/blobs/"));

  const readStatus = ev._read_status;
  const recipients = ev.data?.to as string[] | undefined;
  const visibleReadStatusEntries = readStatus
    ? actors
        .map((a) => String(a.id || ""))
        .filter((id) => id && Object.prototype.hasOwnProperty.call(readStatus, id))
        .map((id) => [id, !!readStatus[id]] as const)
    : [];
  const toLabel = recipients && recipients.length > 0 ? recipients.join(", ") : "@all";
  const readPreviewEntries = visibleReadStatusEntries.slice(0, 3);
  const readPreviewOverflow = Math.max(0, visibleReadStatusEntries.length - readPreviewEntries.length);

  const senderActor = actors.find((a) => a.id === ev.by);

  return (
    <div
      className={classNames(
        "flex gap-2 sm:gap-3 group",
        isUserMessage
          ? "flex-col items-end sm:items-start sm:flex-row-reverse"
          : "flex-col items-start sm:flex-row"
      )}
    >
      {/* Desktop Avatar (Hidden on mobile) */}
      <div
        className={classNames(
          "hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full items-center justify-center text-xs font-bold shadow-sm mt-1",
          isUserMessage
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
            : isDark
              ? "bg-slate-700 text-slate-200"
              : "bg-white border border-gray-200 text-gray-700"
        )}
      >
        {isUserMessage ? "U" : (ev.by || "?")[0].toUpperCase()}
      </div>

      {/* Message Content */}
      <div
        className={classNames(
          "flex flex-col w-full sm:w-auto sm:max-w-[75%]",
          isUserMessage ? "items-end" : "items-start"
        )}
      >
        {/* Mobile Header Row (Visible only on mobile) */}
        <div
          className={classNames(
            "flex items-center gap-2 mb-1 sm:hidden",
            isUserMessage ? "flex-row-reverse" : "flex-row"
          )}
        >
          <div
            className={classNames(
              "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm",
              isUserMessage
                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                : isDark
                  ? "bg-slate-700 text-slate-200"
                  : "bg-white border border-gray-200 text-gray-700"
            )}
          >
            {isUserMessage ? "U" : (ev.by || "?")[0].toUpperCase()}
          </div>
          <span className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>
            {ev.by}
          </span>
          <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
            {formatTime(ev.ts)}
          </span>
        </div>

        {/* Desktop Metadata Header (Hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-2 mb-1 px-1">
          <span className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            {ev.by}
          </span>
          <span className={`text-[10px] ${isDark ? "text-slate-600" : "text-gray-400"}`}>
            {formatTime(ev.ts)}
          </span>
        </div>

        {/* Bubble */}
        <div
          className={classNames(
            "relative px-4 py-2.5 shadow-sm text-sm leading-relaxed",
            isUserMessage
              ? "bg-blue-600 text-white rounded-2xl rounded-tr-none"
              : isDark
                ? "bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl rounded-tl-none"
                : "bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-none"
          )}
        >
          {/* Reply Context */}
          {quoteText && (
            <div
              className={`mb-2 text-xs border-l-2 pl-2 italic truncate opacity-80 ${
                isUserMessage ? "border-blue-400" : isDark ? "border-slate-600" : "border-gray-300"
              }`}
            >
              "{quoteText}"
            </div>
          )}

          {/* Text Content */}
          <div className="whitespace-pre-wrap break-words">{formatEventLine(ev)}</div>

          {/* Attachments */}
          {blobAttachments.length > 0 && groupId && (
            <div className="mt-3 flex flex-wrap gap-2">
              {blobAttachments.map((a, i) => {
                const parts = a.path.split("/");
                const blobName = parts[parts.length - 1] || "";
                const href = `/api/v1/groups/${encodeURIComponent(groupId)}/blobs/${encodeURIComponent(blobName)}`;
                const label = a.title || blobName || "file";
                return (
                  <a
                    key={`${blobName}:${i}`}
                    href={href}
                    className={classNames(
                      "inline-flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors max-w-full",
                      isUserMessage
                        ? "bg-blue-700/50 hover:bg-blue-700 text-white border border-blue-500"
                        : isDark
                          ? "bg-slate-900/50 hover:bg-slate-900 text-slate-300 border border-slate-700"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                    )}
                    title={`Download ${label}`}
                    download
                  >
                    <span className="opacity-70">📎</span>
                    <span className="truncate">{label}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Message meta (always visible): to + per-recipient read status */}
        <div
          className={classNames(
            "flex items-center justify-between gap-3 mt-1 px-1 text-[10px] transition-opacity",
            "opacity-70 group-hover:opacity-100",
            isDark ? "text-slate-500" : "text-gray-500"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className={classNames(
                "touch-target-sm px-1 rounded hover:underline transition-colors",
                isDark ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"
              )}
              onClick={onReply}
            >
              Reply
            </button>
            <span className="min-w-0 truncate" title={`to ${toLabel}`}>
              to {toLabel}
            </span>
          </div>

          {visibleReadStatusEntries.length > 0 && (
            <button
              type="button"
              className={classNames(
                "touch-target-sm flex items-center gap-2 min-w-0 rounded-lg px-2 py-1",
                isDark ? "hover:bg-slate-800/60" : "hover:bg-gray-100"
              )}
              onClick={onShowRecipients}
              aria-label="Show recipient status"
            >
              <div className="flex items-center gap-2 min-w-0">
                {readPreviewEntries.map(([id, cleared]) => (
                  <span key={id} className="inline-flex items-center gap-1 min-w-0">
                    <span className="truncate max-w-[10ch]">{id}</span>
                    <span
                      className={classNames(
                        "text-[10px] font-semibold tracking-tight",
                        cleared
                          ? isDark
                            ? "text-emerald-400"
                            : "text-emerald-600"
                          : isDark
                            ? "text-slate-500"
                            : "text-gray-500"
                      )}
                      aria-label={cleared ? "read" : "pending"}
                    >
                      {cleared ? "✓✓" : "✓"}
                    </span>
                  </span>
                ))}
                {readPreviewOverflow > 0 && (
                  <span className={classNames("text-[10px]", isDark ? "text-slate-500" : "text-gray-500")}>
                    +{readPreviewOverflow}
                  </span>
                )}
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
