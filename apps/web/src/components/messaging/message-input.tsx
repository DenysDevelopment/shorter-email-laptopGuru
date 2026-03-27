'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { normalizeListResponse } from '@/lib/utils/normalize-response';

interface QuickReply {
	id: string;
	shortcut: string;
	title: string;
	body: string;
}

interface Template {
	id: string;
	name: string;
	body: string;
	status: string;
}

interface MessageInputProps {
	conversationId: string;
	onMessageSent?: (msg: { body: string; contentType: string }) => void;
	disabled?: boolean;
}

export function MessageInput({ conversationId, onMessageSent, disabled }: MessageInputProps) {
	const [body, setBody] = useState('');
	const [sending, setSending] = useState(false);
	const [showQuickReplies, setShowQuickReplies] = useState(false);
	const [showTemplates, setShowTemplates] = useState(false);
	const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
	const [templates, setTemplates] = useState<Template[]>([]);
	const [quickReplyFilter, setQuickReplyFilter] = useState('');
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Auto-resize textarea
	useEffect(() => {
		const el = textareaRef.current;
		if (el) {
			el.style.height = 'auto';
			el.style.height = Math.min(el.scrollHeight, 150) + 'px';
		}
	}, [body]);

	// Fetch quick replies on demand
	const loadQuickReplies = useCallback(async () => {
		try {
			const res = await fetch('/api/messaging/quick-replies');
			if (res.ok) {
				const data = await res.json();
				setQuickReplies(normalizeListResponse(data));
			}
		} catch { /* ignore */ }
	}, []);

	// Fetch templates on demand
	const loadTemplates = useCallback(async () => {
		try {
			const res = await fetch('/api/messaging/templates');
			if (res.ok) {
				const data = await res.json();
				const list = normalizeListResponse<Template>(data);
				setTemplates(list.filter((t: Template) => t.status === 'APPROVED' || t.status === 'ACTIVE'));
			}
		} catch { /* ignore */ }
	}, []);

	const handleSend = async () => {
		const trimmed = body.trim();
		if (!trimmed || sending || disabled) return;

		setSending(true);
		try {
			const res = await fetch(`/api/messaging/conversations/${conversationId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body: trimmed, contentType: 'TEXT' }),
			});
			if (res.ok) {
				setBody('');
				onMessageSent?.({ body: trimmed, contentType: 'TEXT' });
			}
		} catch {
			// silently fail
		} finally {
			setSending(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		// "/" at start of text -> quick reply mode
		if (e.key === '/' && body === '') {
			e.preventDefault();
			setShowQuickReplies(true);
			loadQuickReplies();
			return;
		}

		// Enter without shift sends message
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const val = e.target.value;
		setBody(val);

		// Quick reply filtering
		if (val.startsWith('/')) {
			setQuickReplyFilter(val.slice(1).toLowerCase());
			if (!showQuickReplies) {
				setShowQuickReplies(true);
				loadQuickReplies();
			}
		} else {
			setShowQuickReplies(false);
			setQuickReplyFilter('');
		}
	};

	const selectQuickReply = (qr: QuickReply) => {
		setBody(qr.body);
		setShowQuickReplies(false);
		setQuickReplyFilter('');
		textareaRef.current?.focus();
	};

	const selectTemplate = (template: Template) => {
		setBody(template.body);
		setShowTemplates(false);
		textareaRef.current?.focus();
	};

	const filteredQuickReplies = quickReplies.filter(
		(qr) =>
			qr.shortcut.toLowerCase().includes(quickReplyFilter) ||
			qr.title.toLowerCase().includes(quickReplyFilter),
	);

	const handleFileClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		// For now, just insert filename as message text. Full file upload requires backend support.
		setBody((prev) => prev + ` [Файл: ${file.name}]`);
		e.target.value = '';
	};

	return (
		<div className='relative border-t border-gray-200 bg-white'>
			{/* Quick replies dropdown */}
			{showQuickReplies && (
				<div className='absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-t-xl shadow-lg max-h-48 overflow-y-auto'>
					{filteredQuickReplies.length === 0 ? (
						<div className='px-4 py-3 text-sm text-gray-400'>
							Быстрые ответы не найдены
						</div>
					) : (
						filteredQuickReplies.map((qr) => (
							<button
								key={qr.id}
								onClick={() => selectQuickReply(qr)}
								className='w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0'>
								<div className='flex items-center gap-2'>
									<span className='text-xs font-mono text-brand bg-brand-light px-1.5 py-0.5 rounded'>
										/{qr.shortcut}
									</span>
									<span className='text-sm font-medium text-gray-700'>
										{qr.title}
									</span>
								</div>
								<p className='text-xs text-gray-400 mt-0.5 truncate'>{qr.body}</p>
							</button>
						))
					)}
				</div>
			)}

			{/* Templates dropdown */}
			{showTemplates && (
				<div className='absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-t-xl shadow-lg max-h-48 overflow-y-auto'>
					{templates.length === 0 ? (
						<div className='px-4 py-3 text-sm text-gray-400'>
							Нет доступных шаблонов
						</div>
					) : (
						templates.map((t) => (
							<button
								key={t.id}
								onClick={() => selectTemplate(t)}
								className='w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0'>
								<span className='text-sm font-medium text-gray-700'>
									{t.name}
								</span>
								<p className='text-xs text-gray-400 mt-0.5 truncate'>{t.body}</p>
							</button>
						))
					)}
				</div>
			)}

			{/* Input area */}
			<div className='flex items-end gap-2 p-3'>
				{/* Attachment */}
				<button
					onClick={handleFileClick}
					className='flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50'>
					<svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor'>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							d='m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13'
						/>
					</svg>
				</button>
				<input
					ref={fileInputRef}
					type='file'
					className='hidden'
					onChange={handleFileChange}
				/>

				{/* Template picker */}
				<button
					onClick={() => {
						setShowTemplates(!showTemplates);
						setShowQuickReplies(false);
						if (!showTemplates) loadTemplates();
					}}
					className={`flex-shrink-0 p-2 transition-colors rounded-lg ${
						showTemplates
							? 'text-brand bg-brand-light'
							: 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
					}`}>
					<svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor'>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							d='M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z'
						/>
					</svg>
				</button>

				{/* Textarea */}
				<textarea
					ref={textareaRef}
					value={body}
					onChange={handleBodyChange}
					onKeyDown={handleKeyDown}
					placeholder='Напишите сообщение... (/ для быстрых ответов)'
					disabled={disabled || sending}
					rows={1}
					className='flex-1 resize-none px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand placeholder:text-gray-400 disabled:opacity-50 max-h-[150px]'
				/>

				{/* Send button */}
				<button
					onClick={handleSend}
					disabled={!body.trim() || sending || disabled}
					className='flex-shrink-0 p-2.5 bg-brand hover:bg-brand-hover text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
					{sending ? (
						<div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
					) : (
						<svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor'>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								d='M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5'
							/>
						</svg>
					)}
				</button>
			</div>
		</div>
	);
}
