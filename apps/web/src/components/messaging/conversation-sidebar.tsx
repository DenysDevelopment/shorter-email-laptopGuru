'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { hasPermission, PERMISSIONS } from '@shorterlink/shared';
import { ChannelIcon, getChannelLabel } from './channel-icon';
import { normalizeListResponse } from '@/lib/utils/normalize-response';

interface ConversationDetail {
	id: string;
	status: string;
	priority: string;
	channelType: string;
	subject: string | null;
	createdAt: string;
	closedAt: string | null;
	contact: {
		id: string;
		name: string | null;
		email: string | null;
		phone: string | null;
		avatarUrl: string | null;
		company: string | null;
		channels: { type: string; externalId: string }[];
	} | null;
	assignee: {
		id: string;
		name: string | null;
		email: string | null;
	} | null;
	tags: { id: string; name: string; color: string }[];
}

interface Note {
	id: string;
	body: string;
	createdAt: string;
	author: { id: string; name: string | null } | null;
}

interface Tag {
	id: string;
	name: string;
	color: string;
}

interface Team {
	id: string;
	name: string;
	members: { id: string; name: string | null; email: string }[];
}

const STATUS_OPTIONS = [
	{ value: 'NEW', label: 'Новый', color: 'bg-blue-100 text-blue-700' },
	{ value: 'OPEN', label: 'Открыт', color: 'bg-green-100 text-green-700' },
	{ value: 'WAITING', label: 'Ожидание', color: 'bg-amber-100 text-amber-700' },
	{ value: 'CLOSED', label: 'Закрыт', color: 'bg-gray-100 text-gray-600' },
];

const PRIORITY_OPTIONS = [
	{ value: 'LOW', label: 'Низкий' },
	{ value: 'NORMAL', label: 'Обычный' },
	{ value: 'HIGH', label: 'Высокий' },
	{ value: 'URGENT', label: 'Срочный' },
];

export function ConversationSidebar({
	conversation,
	onUpdate,
}: {
	conversation: ConversationDetail;
	onUpdate: () => void;
}) {
	const { data: session } = useSession();
	const userRole = session?.user?.role;
	const userPermissions = session?.user?.permissions;

	const [notes, setNotes] = useState<Note[]>([]);
	const [newNote, setNewNote] = useState('');
	const [savingNote, setSavingNote] = useState(false);
	const [allTags, setAllTags] = useState<Tag[]>([]);
	const [showTagPicker, setShowTagPicker] = useState(false);
	const [teams, setTeams] = useState<Team[]>([]);
	const [showAssignPicker, setShowAssignPicker] = useState(false);

	const canWrite = hasPermission(userRole, userPermissions, PERMISSIONS.MESSAGING_CONVERSATIONS_WRITE);
	const canAssign = hasPermission(userRole, userPermissions, PERMISSIONS.MESSAGING_CONVERSATIONS_ASSIGN);
	const canManageTags = hasPermission(userRole, userPermissions, PERMISSIONS.MESSAGING_TAGS_MANAGE);
	const canWriteNotes = hasPermission(userRole, userPermissions, PERMISSIONS.MESSAGING_NOTES_WRITE);

	// Fetch notes
	useEffect(() => {
		fetch(`/api/messaging/conversations/${conversation.id}/notes`)
			.then((r) => (r.ok ? r.json() : []))
			.then((data) => setNotes(normalizeListResponse(data)))
			.catch(() => {});
	}, [conversation.id]);

	// Fetch all tags for picker
	const loadTags = useCallback(async () => {
		try {
			const res = await fetch('/api/messaging/tags');
			if (res.ok) {
				const data = await res.json();
				setAllTags(normalizeListResponse(data));
			}
		} catch { /* ignore */ }
	}, []);

	// Fetch teams for assign picker
	const loadTeams = useCallback(async () => {
		try {
			const res = await fetch('/api/messaging/teams');
			if (res.ok) {
				const data = await res.json();
				setTeams(normalizeListResponse(data));
			}
		} catch { /* ignore */ }
	}, []);

	const updateConversation = async (field: string, value: string) => {
		try {
			await fetch(`/api/messaging/conversations/${conversation.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ [field]: value }),
			});
			onUpdate();
		} catch { /* ignore */ }
	};

	const assignConversation = async (assigneeId: string) => {
		try {
			await fetch(`/api/messaging/conversations/${conversation.id}/assign`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assigneeId }),
			});
			setShowAssignPicker(false);
			onUpdate();
		} catch { /* ignore */ }
	};

	const addTag = async (tagId: string) => {
		try {
			await fetch(`/api/messaging/conversations/${conversation.id}/tags`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tagId }),
			});
			setShowTagPicker(false);
			onUpdate();
		} catch { /* ignore */ }
	};

	const addNote = async () => {
		const trimmed = newNote.trim();
		if (!trimmed || savingNote) return;
		setSavingNote(true);
		try {
			const res = await fetch('/api/messaging/notes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ conversationId: conversation.id, body: trimmed }),
			});
			if (res.ok) {
				const note = await res.json();
				setNotes((prev) => [...prev, note]);
				setNewNote('');
			}
		} catch { /* ignore */ }
		setSavingNote(false);
	};

	const contact = conversation.contact;

	return (
		<div className='w-80 border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0 hidden lg:block'>
			<div className='p-4 space-y-5'>
				{/* Status & Priority */}
				<section>
					<h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'>
						Статус
					</h3>
					<div className='space-y-2'>
						<select
							value={conversation.status}
							onChange={(e) => updateConversation('status', e.target.value)}
							disabled={!canWrite}
							className='w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand disabled:opacity-50'>
							{STATUS_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
						<select
							value={conversation.priority}
							onChange={(e) => updateConversation('priority', e.target.value)}
							disabled={!canWrite}
							className='w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand disabled:opacity-50'>
							{PRIORITY_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
				</section>

				{/* Assignee */}
				<section>
					<h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'>
						Оператор
					</h3>
					{conversation.assignee ? (
						<div className='flex items-center gap-2 p-2 bg-gray-50 rounded-lg'>
							<div className='w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-xs font-medium text-brand'>
								{conversation.assignee.name?.[0]?.toUpperCase() || '?'}
							</div>
							<div className='min-w-0 flex-1'>
								<p className='text-sm font-medium text-gray-700 truncate'>
									{conversation.assignee.name || conversation.assignee.email}
								</p>
							</div>
							{canAssign && (
								<button
									onClick={() => {
										setShowAssignPicker(!showAssignPicker);
										if (!showAssignPicker) loadTeams();
									}}
									className='text-xs text-gray-400 hover:text-gray-600'>
									Изменить
								</button>
							)}
						</div>
					) : (
						<div>
							{canAssign ? (
								<button
									onClick={() => {
										setShowAssignPicker(!showAssignPicker);
										if (!showAssignPicker) loadTeams();
									}}
									className='w-full text-sm text-gray-400 hover:text-gray-600 border border-dashed border-gray-200 rounded-lg p-2.5 transition-colors'>
									+ Назначить оператора
								</button>
							) : (
								<p className='text-sm text-gray-400'>Не назначен</p>
							)}
						</div>
					)}

					{/* Assign picker */}
					{showAssignPicker && (
						<div className='mt-2 border border-gray-200 rounded-lg bg-white shadow-sm max-h-48 overflow-y-auto'>
							{teams.length === 0 ? (
								<p className='px-3 py-2 text-xs text-gray-400'>Нет команд</p>
							) : (
								teams.map((team) => (
									<div key={team.id}>
										<p className='px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-50'>
											{team.name}
										</p>
										{team.members.map((m) => (
											<button
												key={m.id}
												onClick={() => assignConversation(m.id)}
												className='w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors'>
												{m.name || m.email}
											</button>
										))}
									</div>
								))
							)}
						</div>
					)}
				</section>

				{/* Contact card */}
				{contact && (
					<section>
						<h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'>
							Контакт
						</h3>
						<div className='bg-gray-50 rounded-xl p-3'>
							<div className='flex items-center gap-3 mb-3'>
								{contact.avatarUrl ? (
									<img
										src={contact.avatarUrl}
										alt={contact.name || ''}
										className='w-10 h-10 rounded-full object-cover'
									/>
								) : (
									<div className='w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600'>
										{(contact.name || '?')[0]?.toUpperCase()}
									</div>
								)}
								<div className='min-w-0'>
									<p className='text-sm font-medium text-gray-900 truncate'>
										{contact.name || 'Без имени'}
									</p>
									{contact.company && (
										<p className='text-xs text-gray-400'>{contact.company}</p>
									)}
								</div>
							</div>

							{contact.email && (
								<div className='flex items-center gap-2 text-xs text-gray-500 mb-1'>
									<svg className='w-3.5 h-3.5 text-gray-400' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor'>
										<path strokeLinecap='round' strokeLinejoin='round' d='M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75' />
									</svg>
									{contact.email}
								</div>
							)}
							{contact.phone && (
								<div className='flex items-center gap-2 text-xs text-gray-500 mb-1'>
									<svg className='w-3.5 h-3.5 text-gray-400' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor'>
										<path strokeLinecap='round' strokeLinejoin='round' d='M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z' />
									</svg>
									{contact.phone}
								</div>
							)}

							{/* Channel badges */}
							{contact.channels && contact.channels.length > 0 && (
								<div className='flex flex-wrap gap-1.5 mt-2'>
									{contact.channels.map((ch, idx) => (
										<span
											key={idx}
											className='inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-100'>
											<ChannelIcon channel={ch.type} size={10} />
											{getChannelLabel(ch.type)}
										</span>
									))}
								</div>
							)}
						</div>
					</section>
				)}

				{/* Tags */}
				<section>
					<h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'>
						Теги
					</h3>
					<div className='flex flex-wrap gap-1.5'>
						{conversation.tags.map((tag) => (
							<span
								key={tag.id}
								className='inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md'
								style={{
									backgroundColor: tag.color + '20',
									color: tag.color,
								}}>
								<span
									className='w-1.5 h-1.5 rounded-full'
									style={{ backgroundColor: tag.color }}
								/>
								{tag.name}
							</span>
						))}
						{canManageTags && (
							<button
								onClick={() => {
									setShowTagPicker(!showTagPicker);
									if (!showTagPicker) loadTags();
								}}
								className='text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-200 rounded-md px-2 py-1 transition-colors'>
								+ Тег
							</button>
						)}
					</div>

					{showTagPicker && (
						<div className='mt-2 border border-gray-200 rounded-lg bg-white shadow-sm max-h-36 overflow-y-auto'>
							{allTags
								.filter((t) => !conversation.tags.find((ct) => ct.id === t.id))
								.map((tag) => (
									<button
										key={tag.id}
										onClick={() => addTag(tag.id)}
										className='w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2'>
										<span
											className='w-2 h-2 rounded-full'
											style={{ backgroundColor: tag.color }}
										/>
										{tag.name}
									</button>
								))}
						</div>
					)}
				</section>

				{/* Internal notes */}
				<section>
					<h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'>
						Заметки
					</h3>
					<div className='space-y-2'>
						{notes.map((note) => (
							<div
								key={note.id}
								className='bg-amber-50 border border-amber-100 rounded-lg p-2.5'>
								<p className='text-sm text-gray-700 whitespace-pre-wrap'>
									{note.body}
								</p>
								<div className='flex items-center gap-2 mt-1.5'>
									<span className='text-[10px] text-gray-400'>
										{note.author?.name || 'Система'}
									</span>
									<span className='text-[10px] text-gray-300'>
										{new Date(note.createdAt).toLocaleString('ru-RU', {
											day: 'numeric',
											month: 'short',
											hour: '2-digit',
											minute: '2-digit',
										})}
									</span>
								</div>
							</div>
						))}

						{canWriteNotes && (
							<div className='flex gap-2'>
								<input
									type='text'
									value={newNote}
									onChange={(e) => setNewNote(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && addNote()}
									placeholder='Добавить заметку...'
									className='flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand placeholder:text-gray-400'
								/>
								<button
									onClick={addNote}
									disabled={!newNote.trim() || savingNote}
									className='px-3 py-2 text-sm font-medium text-brand hover:bg-brand-light rounded-lg transition-colors disabled:opacity-50'>
									{savingNote ? '...' : 'OK'}
								</button>
							</div>
						)}
					</div>
				</section>

				{/* Metadata */}
				<section>
					<h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'>
						Информация
					</h3>
					<div className='space-y-1.5 text-xs'>
						<div className='flex justify-between'>
							<span className='text-gray-400'>Канал</span>
							<span className='text-gray-600 flex items-center gap-1'>
								<ChannelIcon channel={conversation.channelType} size={12} />
								{getChannelLabel(conversation.channelType)}
							</span>
						</div>
						<div className='flex justify-between'>
							<span className='text-gray-400'>Создан</span>
							<span className='text-gray-600'>
								{new Date(conversation.createdAt).toLocaleString('ru-RU', {
									day: 'numeric',
									month: 'short',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit',
								})}
							</span>
						</div>
						{conversation.closedAt && (
							<div className='flex justify-between'>
								<span className='text-gray-400'>Закрыт</span>
								<span className='text-gray-600'>
									{new Date(conversation.closedAt).toLocaleString('ru-RU', {
										day: 'numeric',
										month: 'short',
										year: 'numeric',
										hour: '2-digit',
										minute: '2-digit',
									})}
								</span>
							</div>
						)}
						{conversation.subject && (
							<div className='flex justify-between'>
								<span className='text-gray-400'>Тема</span>
								<span className='text-gray-600 text-right max-w-[60%] truncate'>
									{conversation.subject}
								</span>
							</div>
						)}
					</div>
				</section>
			</div>
		</div>
	);
}

export type { ConversationDetail };
