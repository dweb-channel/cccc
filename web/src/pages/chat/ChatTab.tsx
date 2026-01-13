// ChatTab is the main chat page component.
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import { Actor, GroupMeta, LedgerEvent, ReplyTarget, PresenceAgent } from "../../types";
import { VirtualMessageList } from "../../components/VirtualMessageList";
import { classNames } from "../../utils/classNames";
import { SetupChecklist } from "./SetupChecklist";
import { ChatComposer } from "./ChatComposer";

export interface ChatTabProps {
  isDark: boolean;
  isSmallScreen: boolean;
  selectedGroupId: string;
  groupLabelById: Record<string, string>;
  actors: Actor[];
  presenceAgents: PresenceAgent[];
  busy: string;
  chatFilter: "all" | "to_user" | "attention";
  setChatFilter: (v: "all" | "to_user" | "attention") => void;

  // Setup checklist
  showSetupCard: boolean;
  needsScope: boolean;
  needsActors: boolean;
  needsStart: boolean;
  hasForeman: boolean;
  onAddAgent: () => void;
  onStartGroup: () => void;

  // Messages + scrolling
  chatMessages: LedgerEvent[];
  hasAnyChatMessages: boolean;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  showScrollButton: boolean;
  chatUnreadCount: number;
  onScrollButtonClick: () => void;
  onScrollChange: (isAtBottom: boolean) => void;
  onReply: (ev: LedgerEvent) => void;
  onShowRecipients: (eventId: string) => void;
  onAckMessage: (eventId: string) => void;
  onCopyMessageLink?: (eventId: string) => void;
  onRelayMessage?: (eventId: string) => void;
  onOpenSourceMessage?: (srcGroupId: string, srcEventId: string) => void;

  // Jump-to window mode (optional)
  chatWindow?: {
    centerEventId: string;
    hasMoreBefore: boolean;
    hasMoreAfter: boolean;
  } | null;
  onExitChatWindow?: () => void;
  chatViewKey?: string;
  chatInitialScrollTargetId?: string;
  chatInitialScrollAnchorId?: string;
  chatInitialScrollAnchorOffsetPx?: number;
  chatHighlightEventId?: string;
  onScrollSnapshot?: (snap: { atBottom: boolean; anchorId: string; offsetPx: number }) => void;

  // Composer
  replyTarget: ReplyTarget;
  onCancelReply: () => void;
  toTokens: string[];
  onToggleRecipient: (token: string) => void;
  onClearRecipients: () => void;
  groups: GroupMeta[];
  destGroupId: string;
  setDestGroupId: (groupId: string) => void;
  destGroupScopeLabel?: string;
  recipientActors: Actor[];
  recipientActorsBusy?: boolean;

  composerFiles: File[];
  onRemoveComposerFile: (index: number) => void;
  appendComposerFiles: (files: File[]) => void;

  fileInputRef: RefObject<HTMLInputElement>;
  composerRef: RefObject<HTMLTextAreaElement>;
  composerText: string;
  setComposerText: Dispatch<SetStateAction<string>>;
  priority: "normal" | "attention";
  setPriority: (priority: "normal" | "attention") => void;
  onSendMessage: () => void;

  // Mention menu
  showMentionMenu: boolean;
  setShowMentionMenu: Dispatch<SetStateAction<boolean>>;
  mentionSuggestions: string[];
  mentionSelectedIndex: number;
  setMentionSelectedIndex: Dispatch<SetStateAction<number>>;
  setMentionFilter: Dispatch<SetStateAction<string>>;
  onAppendRecipientToken: (token: string) => void;

  // History loading
  isLoadingHistory?: boolean;
  hasMoreHistory?: boolean;
  onLoadMore?: () => void;
}

export function ChatTab({
  isDark,
  isSmallScreen,
  selectedGroupId,
  groupLabelById,
  actors,
  presenceAgents,
  busy,
  chatFilter,
  setChatFilter,
  showSetupCard,
  needsScope,
  needsActors,
  needsStart,
  onAddAgent,
  onStartGroup,
  chatMessages,
  hasAnyChatMessages,
  scrollRef,
  showScrollButton,
  chatUnreadCount,
  onScrollButtonClick,
  onScrollChange,
  onReply,
  onShowRecipients,
  onAckMessage,
  onCopyMessageLink,
  onRelayMessage,
  onOpenSourceMessage,
  chatWindow,
  onExitChatWindow,
  chatViewKey,
  chatInitialScrollTargetId,
  chatInitialScrollAnchorId,
  chatInitialScrollAnchorOffsetPx,
  chatHighlightEventId,
  onScrollSnapshot,
  replyTarget,
  onCancelReply,
  toTokens,
  onToggleRecipient,
  onClearRecipients,
  groups,
  destGroupId,
  setDestGroupId,
  destGroupScopeLabel,
  recipientActors,
  recipientActorsBusy,
  composerFiles,
  onRemoveComposerFile,
  appendComposerFiles,
  fileInputRef,
  composerRef,
  composerText,
  setComposerText,
  priority,
  setPriority,
  onSendMessage,
  showMentionMenu,
  setShowMentionMenu,
  mentionSuggestions,
  mentionSelectedIndex,
  setMentionSelectedIndex,
  setMentionFilter,
  onAppendRecipientToken,
  isLoadingHistory,
  hasMoreHistory,
  onLoadMore,
}: ChatTabProps) {
  // Empty state: show full-screen setup guidance.
  if (chatMessages.length === 0 && showSetupCard) {
    return (
      <>
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-auto px-4 py-4 relative"
          role="log"
          aria-label="Chat messages"
        >
          <div className="flex flex-col items-center justify-center h-full text-center pb-20">
            <div className={classNames("w-full max-w-md", isDark ? "text-slate-200" : "text-gray-800")}>
              <div className="text-4xl mb-4">🧭</div>
              <div className={classNames("text-sm font-semibold", isDark ? "text-slate-200" : "text-gray-800")}>
                Next steps
              </div>
              <SetupChecklist
                isDark={isDark}
                selectedGroupId={selectedGroupId}
                busy={busy}
                needsScope={needsScope}
                needsActors={needsActors}
                needsStart={needsStart}
                onAddAgent={onAddAgent}
                onStartGroup={onStartGroup}
                variant="full"
              />
            </div>
          </div>
        </div>
        <ChatComposer
          isDark={isDark}
          isSmallScreen={isSmallScreen}
          selectedGroupId={selectedGroupId}
          actors={actors}
          recipientActors={recipientActors}
          recipientActorsBusy={recipientActorsBusy}
          groups={groups}
          destGroupId={destGroupId}
          setDestGroupId={setDestGroupId}
          destGroupScopeLabel={destGroupScopeLabel}
          busy={busy}
          replyTarget={replyTarget}
          onCancelReply={onCancelReply}
          toTokens={toTokens}
          onToggleRecipient={onToggleRecipient}
          onClearRecipients={onClearRecipients}
          composerFiles={composerFiles}
          onRemoveComposerFile={onRemoveComposerFile}
          appendComposerFiles={appendComposerFiles}
          fileInputRef={fileInputRef}
          composerRef={composerRef}
          composerText={composerText}
          setComposerText={setComposerText}
          priority={priority}
          setPriority={setPriority}
          onSendMessage={onSendMessage}
          showMentionMenu={showMentionMenu}
          setShowMentionMenu={setShowMentionMenu}
          mentionSuggestions={mentionSuggestions}
          mentionSelectedIndex={mentionSelectedIndex}
          setMentionSelectedIndex={setMentionSelectedIndex}
          setMentionFilter={setMentionFilter}
          onAppendRecipientToken={onAppendRecipientToken}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-transparent">
      {/* 1. Header Area: For critical banners/setup only, very space-efficient */}
      <header className="flex-shrink-0 z-10 flex flex-col w-full">
        {/* Jump-to window banner */}
        {chatWindow && (
          <div className="px-4 pt-4">
            <div
              className={classNames(
                "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-sm",
                isDark ? "border-slate-700/50 bg-slate-900/40" : "border-gray-200 bg-white/70"
              )}
              role="status"
              aria-label="Viewing message context window"
            >
              <div className="min-w-0">
                <div className={classNames("text-sm font-semibold", isDark ? "text-slate-200" : "text-gray-800")}>
                  Viewing a message
                </div>
                <div className={classNames("text-xs mt-0.5", isDark ? "text-slate-400" : "text-gray-600")}>
                  {isLoadingHistory
                    ? "Loading context…"
                    : chatWindow.hasMoreBefore || chatWindow.hasMoreAfter
                      ? "Context is truncated."
                      : "Context loaded."}
                </div>
              </div>
              <button
                type="button"
                className={classNames(
                  "flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors",
                  isDark
                    ? "border-slate-600 text-slate-200 hover:bg-slate-800/60"
                    : "border-gray-200 text-gray-800 hover:bg-gray-100"
                )}
                onClick={() => onExitChatWindow?.()}
              >
                Return to latest
              </button>
            </div>
          </div>
        )}

        {/* Compact setup card */}
        {showSetupCard && chatMessages.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <div
              className={classNames(
                "rounded-2xl border p-4 sm:p-5",
                isDark ? "border-slate-700/50 bg-slate-900/40" : "border-gray-200 bg-white/70"
              )}
              role="region"
              aria-label="Setup checklist"
            >
              <div className={classNames("text-sm font-semibold", isDark ? "text-slate-200" : "text-gray-800")}>
                Next steps
              </div>
              <SetupChecklist
                isDark={isDark}
                selectedGroupId={selectedGroupId}
                busy={busy}
                needsScope={needsScope}
                needsActors={needsActors}
                needsStart={needsStart}
                onAddAgent={onAddAgent}
                onStartGroup={onStartGroup}
                variant="compact"
              />
            </div>
          </div>
        )}
      </header>

      {/* 2. Body Area: Contains the List + the Floating Filter Pill */}
      <main className="flex-1 min-h-0 relative flex flex-col">
        {/* Space-efficient Floating Filter Pill */}
        {!chatWindow && hasAnyChatMessages && (
          <div
            className="absolute top-4 left-4 z-20 pointer-events-none"
            style={{ width: "calc(100% - 32px)" }}
          >
            <div
              className={classNames(
                "inline-flex items-center gap-1 rounded-full border p-1 shadow-lg pointer-events-auto backdrop-blur-md transition-all",
                isDark
                  ? "border-slate-700/60 bg-slate-900/60 shadow-black/20"
                  : "border-gray-200/80 bg-white/70 shadow-gray-200/50"
              )}
              role="tablist"
              aria-label="Chat filters"
            >
              {[
                ["all", "All"],
                ["to_user", "To user"],
                ["attention", "Important"],
              ].map(([key, label]) => {
                const k = key as "all" | "to_user" | "attention";
                const active = chatFilter === k;
                return (
                  <button
                    key={k}
                    type="button"
                    className={classNames(
                      "text-xs px-4 py-1.5 rounded-full transition-all font-medium",
                      active
                        ? "bg-blue-600 text-white shadow-sm"
                        : isDark
                          ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    )}
                    onClick={() => setChatFilter(k)}
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <VirtualMessageList
          messages={chatMessages}
          actors={actors}
          presenceAgents={presenceAgents}
          isDark={isDark}
          groupId={selectedGroupId}
          groupLabelById={groupLabelById}
          viewKey={chatViewKey}
          initialScrollTargetId={chatInitialScrollTargetId}
          initialScrollAnchorId={chatInitialScrollAnchorId}
          initialScrollAnchorOffsetPx={chatInitialScrollAnchorOffsetPx}
          highlightEventId={chatHighlightEventId}
          scrollRef={scrollRef}
          onReply={onReply}
          onShowRecipients={onShowRecipients}
          onAck={onAckMessage}
          onCopyLink={onCopyMessageLink}
          onRelay={onRelayMessage}
          onOpenSource={onOpenSourceMessage}
          showScrollButton={showScrollButton}
          onScrollButtonClick={onScrollButtonClick}
          chatUnreadCount={chatUnreadCount}
          onScrollChange={onScrollChange}
          onScrollSnapshot={onScrollSnapshot}
          isLoadingHistory={isLoadingHistory}
          hasMoreHistory={hasMoreHistory}
          onLoadMore={onLoadMore}
        />
      </main>

      {/* 3. Footer Area: Composer */}
      <footer className="flex-shrink-0 w-full bg-transparent">
        <ChatComposer
          isDark={isDark}
          isSmallScreen={isSmallScreen}
          selectedGroupId={selectedGroupId}
          actors={actors}
          recipientActors={recipientActors}
          recipientActorsBusy={recipientActorsBusy}
          groups={groups}
          destGroupId={destGroupId}
          setDestGroupId={setDestGroupId}
          destGroupScopeLabel={destGroupScopeLabel}
          busy={busy}
          replyTarget={replyTarget}
          onCancelReply={onCancelReply}
          toTokens={toTokens}
          onToggleRecipient={onToggleRecipient}
          onClearRecipients={onClearRecipients}
          composerFiles={composerFiles}
          onRemoveComposerFile={onRemoveComposerFile}
          appendComposerFiles={appendComposerFiles}
          fileInputRef={fileInputRef}
          composerRef={composerRef}
          composerText={composerText}
          setComposerText={setComposerText}
          priority={priority}
          setPriority={setPriority}
          onSendMessage={onSendMessage}
          showMentionMenu={showMentionMenu}
          setShowMentionMenu={setShowMentionMenu}
          mentionSuggestions={mentionSuggestions}
          mentionSelectedIndex={mentionSelectedIndex}
          setMentionSelectedIndex={setMentionSelectedIndex}
          setMentionFilter={setMentionFilter}
          onAppendRecipientToken={onAppendRecipientToken}
        />
      </footer>
    </div>
  );
}
