'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageBubble } from './message-bubble';
import type { Message } from './message-bubble';
import { useMessagingEvents } from '@/hooks/use-messaging-events';

interface MessageThreadProps {
	conversationId: string;
}

function formatDateSeparator(dateStr: string): string {
	const date = new Date(dateStr);
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);

	if (date.toDateString() === today.toDateString()) return 'Сегодня';
	if (date.toDateString() === yesterday.toDateString()) return 'Вчера';

	return date.toLocaleDateString('ru-RU', {
		day: 'numeric',
		month: 'long',
		year:
			date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
	});
}

function groupMessagesByDate(messages: Message[]): { date: string; messages: Message[] }[] {
	const groups: { date: string; messages: Message[] }[] = [];
	let currentDate = '';

	for (const msg of messages) {
		const dateKey = new Date(msg.createdAt).toDateString();
		if (dateKey !== currentDate) {
			currentDate = dateKey;
			groups.push({ date: msg.createdAt, messages: [msg] });
		} else {
			groups[groups.length - 1].messages.push(msg);
		}
	}
	return groups;
}

export function MessageThread({ conversationId }: MessageThreadProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const initialScrollDone = useRef(false);

	const fetchMessages = useCallback(
		async (pageNum: number, prepend: boolean) => {
			if (prepend) setLoadingMore(true);
			else setLoading(true);

			try {
				const params = new URLSearchParams({
					page: String(pageNum),
					limit: '50',
				});
				const res = await fetch(
					`/api/messaging/conversations/${conversationId}/messages?${params}`,
				);
				if (!res.ok) return;
				const data = await res.json();
				const items = data.items || data.data || data;
				const list: Message[] = Array.isArray(items) ? items : [];

				if (prepend) {
					setMessages((prev) => [...list.reverse(), ...prev]);
				} else {
					setMessages(list.reverse());
				}
				setHasMore(list.length >= 50);
			} catch {
				// silently fail
			} finally {
				setLoading(false);
				setLoadingMore(false);
			}
		},
		[conversationId],
	);

	useEffect(() => {
		initialScrollDone.current = false;
		setPage(1);
		setMessages([]);
		fetchMessages(1, false);
	}, [conversationId, fetchMessages]);

	// Auto-scroll to bottom on initial load and new messages
	useEffect(() => {
		if (messages.length > 0 && !initialScrollDone.current) {
			bottomRef.current?.scrollIntoView();
			initialScrollDone.current = true;
		}
	}, [messages]);

	// Real-time updates via SSE
	useMessagingEvents((event) => {
		if (
			event.conversationId === conversationId &&
			(event.type === 'new_message' || event.type === 'conversation_updated')
		) {
			fetchMessages(1, false);
		}
	});

	const loadMore = () => {
		const next = page + 1;
		setPage(next);
		fetchMessages(next, true);
	};

	// Public method for parent to add an optimistic message
	const addMessage = (msg: Message) => {
		setMessages((prev) => [...prev, msg]);
		setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
	};

	// Attach addMessage to the container div for parent access
	useEffect(() => {
		const el = containerRef.current;
		if (el) {
			(el as HTMLDivElement & { addMessage?: (m: Message) => void }).addMessage = addMessage;
		}
	});

	const grouped = groupMessagesByDate(messages);

	if (loading && messages.length === 0) {
		return (
			<div className='flex-1 flex items-center justify-center'>
				<div className='text-center'>
					<div className='w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto' />
					<p className='text-xs text-gray-400 mt-2'>Загрузка сообщений...</p>
				</div>
			</div>
		);
	}

	return (
		<div ref={containerRef} className='flex-1 overflow-y-auto py-4'>
			{/* Load more */}
			{hasMore && (
				<div className='text-center py-3'>
					<button
						onClick={loadMore}
						disabled={loadingMore}
						className='text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50'>
						{loadingMore ? 'Загрузка...' : 'Загрузить ранние сообщения'}
					</button>
				</div>
			)}

			{messages.length === 0 ? (
				<div className='flex items-center justify-center h-full'>
					<div className='text-center'>
						<svg
							className='w-16 h-16 mx-auto text-gray-200 mb-3'
							fill='none'
							viewBox='0 0 24 24'
							strokeWidth={0.75}
							stroke='currentColor'>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								d='M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z'
							/>
						</svg>
						<p className='text-sm text-gray-400'>Нет сообщений</p>
						<p className='text-xs text-gray-400 mt-1'>Напишите первое сообщение</p>
					</div>
				</div>
			) : (
				grouped.map((group) => (
					<div key={group.date}>
						{/* Date separator */}
						<div className='flex items-center gap-3 px-4 py-3'>
							<div className='flex-1 h-px bg-gray-200' />
							<span className='text-xs text-gray-400 font-medium'>
								{formatDateSeparator(group.date)}
							</span>
							<div className='flex-1 h-px bg-gray-200' />
						</div>
						{group.messages.map((msg) => (
							<MessageBubble key={msg.id} message={msg} />
						))}
					</div>
				))
			)}
			<div ref={bottomRef} />
		</div>
	);
}
