import { useMemo, useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import { classNames } from '../utils/classNames';

interface MarkdownRendererProps {
    content: string;
    isDark: boolean;
    className?: string;
}

export function MarkdownRenderer({ content, isDark, className }: MarkdownRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const md = useMemo(() => {
        const instance = new MarkdownIt({
            html: false, // Security: Disable raw HTML to prevent XSS
            linkify: true,
            typographer: true,
            breaks: true,
            highlight: (str: string, lang: string): string => {
                const finalLang = lang?.toLowerCase().trim() || 'code';
                const escaped = instance.utils.escapeHtml(str);

                // 代码块带 Copy 按钮，无语法高亮
                return (
                    '<div class="code-block-wrapper relative group">' +
                    '<div class="code-block-header flex items-center justify-between px-4 py-1.5 text-[10px] font-medium border-b border-gray-200/50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 rounded-t-lg">' +
                    '<span class="text-gray-500 dark:text-gray-400 uppercase">' + finalLang + '</span>' +
                    '<button class="copy-button transition-all hover:text-blue-500 dark:hover:text-cyan-400 text-gray-400 dark:text-gray-500 flex items-center gap-1" data-code="' + encodeURIComponent(str) + '">' +
                    '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>' +
                    'Copy' +
                    '</button>' +
                    '</div>' +
                    '<pre class="!mt-0 !rounded-t-none"><code class="language-' + finalLang + '">' + escaped + '</code></pre>' +
                    '</div>'
                );
            },
        });
        return instance;
    }, []);

    const htmlContent = useMemo(() => {
        return md.render(content || "");
    }, [md, content]);

    // 使用事件委托处理复制逻辑
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleCopy = async (e: MouseEvent) => {
            const button = (e.target as HTMLElement).closest('.copy-button');
            if (!button) return;

            const code = decodeURIComponent(button.getAttribute('data-code') || '');
            try {
                await navigator.clipboard.writeText(code);

                // 简单的反馈效果
                const originalContent = button.innerHTML;
                button.innerHTML = '<span class="text-green-500 dark:text-emerald-400 flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Copied!</span>';
                button.classList.add('pointer-events-none');

                setTimeout(() => {
                    button.innerHTML = originalContent;
                    button.classList.remove('pointer-events-none');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy code:', err);
            }
        };

        container.addEventListener('click', handleCopy);
        return () => container.removeEventListener('click', handleCopy);
    }, [htmlContent]);

    return (
        <div
            ref={containerRef}
            className={classNames(
                'markdown-body prose max-w-none prose-sm sm:prose-base',
                isDark ? 'prose-invert' : '',
                '[&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1',
                className
            )}
            style={{ color: 'inherit' }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
}
