import { useRef, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { LedgerEvent, Actor } from "../types";
import { MessageBubble } from "./MessageBubble";

export interface VirtualMessageListProps {
  messages: LedgerEvent[];
  actors: Actor[];
  isDark: boolean;
  groupId: string;
  onReply: (ev: LedgerEvent) => void;
  onShowRecipients: (eventId: string) => void;
  showScrollButton: boolean;
  onScrollButtonClick: () => void;
  chatUnreadCount: number;
  onScrollChange?: (isAtBottom: boolean) => void;
}

export function VirtualMessageList({
  messages,
  actors,
  isDark,
  groupId,
  onReply,
  onShowRecipients,
  showScrollButton,
  onScrollButtonClick,
  chatUnreadCount,
  onScrollChange,
}: VirtualMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const prevMessageCountRef = useRef(messages.length);
  const isAtBottomRef = useRef(true);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  // Check if scrolled to bottom
  const checkIsAtBottom = useCallback(() => {
    const el = parentRef.current;
    if (!el) return true;
    const threshold = 100;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
    }
  }, [messages.length, virtualizer]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const atBottom = checkIsAtBottom();
    isAtBottomRef.current = atBottom;
    onScrollChange?.(atBottom);
  }, [checkIsAtBottom, onScrollChange]);

  // Auto-scroll when new messages arrive and user was at bottom
  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    const newCount = messages.length;
    prevMessageCountRef.current = newCount;

    if (newCount > prevCount && isAtBottomRef.current) {
      // Small delay to let virtualizer update
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [messages.length, scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, []);

  // Empty state
  if (messages.length === 0) {
    return (
      <section
        className="flex-1 min-h-0 overflow-auto px-4 py-4 relative"
        role="log"
        aria-label="Chat messages"
      >
        <div className="flex flex-col items-center justify-center h-full text-center pb-20 opacity-50">
          <div className="text-4xl mb-4 grayscale">💬</div>
          <p className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            No messages yet
          </p>
          <p className={`text-xs mt-1 ${isDark ? "text-slate-600" : "text-gray-400"}`}>
            Start the conversation with your AI team.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={parentRef}
      className="flex-1 min-h-0 overflow-auto px-4 py-4 relative"
      onScroll={handleScroll}
      role="log"
      aria-label="Chat messages"
    >
      {/* Virtual list container */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const message = messages[virtualRow.index];
          return (
            <div
              key={message.id || virtualRow.index}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="pb-6"
            >
              <MessageBubble
                event={message}
                actors={actors}
                isDark={isDark}
                groupId={groupId}
                onReply={() => onReply(message)}
                onShowRecipients={() => {
                  if (message.id) {
                    onShowRecipients(String(message.id));
                  }
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Scroll Button */}
      {showScrollButton && (
        <button
          className={`fixed bottom-24 right-6 p-3 rounded-full shadow-xl transition-all z-10 ${
            isDark
              ? "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"
          }`}
          onClick={onScrollButtonClick}
          aria-label="Scroll to bottom"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
          {chatUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] text-white items-center justify-center font-bold">
                {chatUnreadCount > 9 ? "!" : chatUnreadCount}
              </span>
            </span>
          )}
        </button>
      )}
    </section>
  );
}
