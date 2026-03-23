'use client';

import {
	ChevronDown,
	Copy,
	ExternalLink,
	Link2,
	Monitor,
	Plus,
	Smartphone,
	Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface QuickLinkVisit {
	id: string;
	visitedAt: string;
	ip: string | null;
	country: string | null;
	city: string | null;
	browser: string | null;
	os: string | null;
	deviceType: string | null;
	referrerDomain: string | null;
}

interface QuickLink {
	id: string;
	slug: string;
	targetUrl: string;
	name: string | null;
	clicks: number;
	createdAt: string;
	_count: { visits: number };
	visits: QuickLinkVisit[];
}

export default function QuickLinksPage() {
	const [links, setLinks] = useState<QuickLink[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [slug, setSlug] = useState('');
	const [targetUrl, setTargetUrl] = useState('');
	const [name, setName] = useState('');
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState('');
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

	function loadLinks() {
		fetch('/api/quicklinks')
			.then(r => r.json())
			.then(d => {
				setLinks(d);
				setLoading(false);
			});
	}

	useEffect(() => {
		loadLinks();
	}, []);

	async function handleCreate() {
		if (!slug || !targetUrl) return;
		setCreating(true);
		setError('');

		const res = await fetch('/api/quicklinks', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug, targetUrl, name: name || undefined }),
		});

		if (!res.ok) {
			const data = await res.json();
			setError(data.error || 'Ошибка');
		} else {
			setSlug('');
			setTargetUrl('');
			setName('');
			setShowForm(false);
			loadLinks();
		}
		setCreating(false);
	}

	async function handleDelete(id: string) {
		if (!confirm('Удалить ссылку?')) return;
		await fetch('/api/quicklinks', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id }),
		});
		loadLinks();
	}

	function copyLink(s: string) {
		navigator.clipboard.writeText(`${appUrl}/go/${s}`);
	}

	return (
		<div>
			<div className='flex items-center justify-between mb-6'>
				<div>
					<h1 className='text-2xl font-bold text-gray-900 flex items-center gap-2'>
						<Link2 className='w-6 h-6 text-brand' /> Редиректы
					</h1>
				</div>
				<button
					onClick={() => setShowForm(!showForm)}
					className='cursor-pointer flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm'>
					<Plus className='w-4 h-4' /> Новая ссылка
				</button>
			</div>

			{/* Create form */}
			{showForm && (
				<div className='bg-white rounded-xl border border-gray-100 p-5 mb-6 space-y-3'>
					{error && <p className='text-red-500 text-sm'>{error}</p>}
					<div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
						<div>
							<label className='block text-xs font-medium text-gray-500 mb-1'>
								Slug (латиница)
							</label>
							<div className='flex items-center gap-1'>
								<span className='text-xs text-gray-400'>/go/</span>
								<input
									value={slug}
									onChange={e =>
										setSlug(
											e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
										)
									}
									placeholder='allegro'
									className='flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand-muted outline-none'
								/>
							</div>
						</div>
						<div>
							<label className='block text-xs font-medium text-gray-500 mb-1'>
								URL назначения
							</label>
							<input
								value={targetUrl}
								onChange={e => setTargetUrl(e.target.value)}
								placeholder='https://allegro.pl/...'
								className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand-muted outline-none'
							/>
						</div>
						<div>
							<label className='block text-xs font-medium text-gray-500 mb-1'>
								Название (опционально)
							</label>
							<input
								value={name}
								onChange={e => setName(e.target.value)}
								placeholder='Allegro MacBook'
								className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand-muted outline-none'
							/>
						</div>
					</div>
					<button
						onClick={handleCreate}
						disabled={creating || !slug || !targetUrl}
						className='cursor-pointer bg-brand hover:bg-brand-hover text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50'>
						{creating ? 'Создание...' : 'Создать'}
					</button>
				</div>
			)}

			{/* Links list */}
			{loading ? (
				<div className='text-center py-12 text-gray-400'>Загрузка...</div>
			) : links.length === 0 ? (
				<div className='text-center py-12'>
					<Link2 className='w-12 h-12 text-gray-200 mx-auto mb-3' />
					<p className='text-gray-400'>Ссылок пока нет</p>
					<p className='text-gray-400 text-sm mt-1'>
						Нажмите «Новая ссылка» чтобы создать
					</p>
				</div>
			) : (
				<div className='space-y-3'>
					{links.map(link => (
						<div
							key={link.id}
							className='bg-white rounded-xl border border-gray-100 overflow-hidden'>
							{/* Link summary */}
							<div className='p-4 flex items-center gap-4'>
								<div className='flex-1 min-w-0'>
									<div className='flex items-center gap-2 mb-1'>
										{link.name && (
											<span className='text-sm font-semibold text-gray-900'>
												{link.name}
											</span>
										)}
										<button
											onClick={() => copyLink(link.slug)}
											className='cursor-pointer flex items-center gap-1 text-xs text-brand hover:text-brand-hover transition-colors'>
											<Copy className='w-3 h-3' />
											/go/{link.slug}
										</button>
									</div>
									<a
										href={link.targetUrl}
										target='_blank'
										rel='noopener'
										className='text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 truncate'>
										<ExternalLink className='w-3 h-3 flex-shrink-0' />
										{link.targetUrl}
									</a>
								</div>

								<div className='flex items-center gap-4 flex-shrink-0'>
									<div className='text-center'>
										<p className='text-2xl font-bold text-brand'>
											{link.clicks}
										</p>
										<p className='text-[10px] text-gray-400'>переходов</p>
									</div>

									<button
										onClick={() =>
											setExpandedId(expandedId === link.id ? null : link.id)
										}
										className='cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors'>
										<ChevronDown
											className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === link.id ? 'rotate-180' : ''}`}
										/>
									</button>

									<button
										onClick={() => handleDelete(link.id)}
										className='cursor-pointer p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-300 hover:text-red-500'>
										<Trash2 className='w-4 h-4' />
									</button>
								</div>
							</div>

							{/* Expanded visits */}
							{expandedId === link.id && (
								<div className='border-t border-gray-100 px-4 py-3'>
									{link.visits.length === 0 ? (
										<p className='text-xs text-gray-400 text-center py-4'>
											Переходов пока нет
										</p>
									) : (
										<div className='space-y-1.5 max-h-[300px] overflow-y-auto'>
											{link.visits.map(v => (
												<div
													key={v.id}
													className='flex items-center gap-3 text-xs text-gray-600 py-1.5 border-b border-gray-50 last:border-0'>
													<span className='text-gray-400 whitespace-nowrap w-24'>
														{new Date(v.visitedAt).toLocaleString('ru-RU', {
															day: '2-digit',
															month: '2-digit',
															hour: '2-digit',
															minute: '2-digit',
														})}
													</span>
													<span className='w-28 truncate'>
														{v.city && v.country
															? `${v.city}, ${v.country}`
															: v.ip || '—'}
													</span>
													<span className='flex items-center gap-1 w-20'>
														{v.deviceType === 'mobile' ||
														v.deviceType === 'tablet' ? (
															<Smartphone className='w-3 h-3 text-gray-400' />
														) : (
															<Monitor className='w-3 h-3 text-gray-400' />
														)}
														{v.browser || '—'}
													</span>
													<span className='text-gray-400 w-16'>
														{v.os || '—'}
													</span>
													<span className='text-gray-300 truncate'>
														{v.referrerDomain || 'прямой'}
													</span>
												</div>
											))}
										</div>
									)}
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
