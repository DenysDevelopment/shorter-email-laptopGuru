'use client';

import { useState, useEffect } from 'react';

interface DaySchedule {
	enabled: boolean;
	startTime: string;
	endTime: string;
}

interface BusinessHours {
	id: string;
	timezone: string;
	schedule: Record<string, DaySchedule>;
}

const DAYS = [
	{ key: 'monday', label: 'Понедельник' },
	{ key: 'tuesday', label: 'Вторник' },
	{ key: 'wednesday', label: 'Среда' },
	{ key: 'thursday', label: 'Четверг' },
	{ key: 'friday', label: 'Пятница' },
	{ key: 'saturday', label: 'Суббота' },
	{ key: 'sunday', label: 'Воскресенье' },
];

const DEFAULT_SCHEDULE: Record<string, DaySchedule> = {
	monday: { enabled: true, startTime: '09:00', endTime: '18:00' },
	tuesday: { enabled: true, startTime: '09:00', endTime: '18:00' },
	wednesday: { enabled: true, startTime: '09:00', endTime: '18:00' },
	thursday: { enabled: true, startTime: '09:00', endTime: '18:00' },
	friday: { enabled: true, startTime: '09:00', endTime: '18:00' },
	saturday: { enabled: false, startTime: '10:00', endTime: '15:00' },
	sunday: { enabled: false, startTime: '10:00', endTime: '15:00' },
};

export default function BusinessHoursSettingsPage() {
	const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
	const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(DEFAULT_SCHEDULE);
	const [timezone, setTimezone] = useState('Europe/Warsaw');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		fetch('/api/messaging/business-hours')
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) {
					const item = Array.isArray(data) ? data[0] : data;
					if (item) {
						setBusinessHours(item);
						setSchedule(item.schedule || DEFAULT_SCHEDULE);
						setTimezone(item.timezone || 'Europe/Warsaw');
					}
				}
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	const updateDay = (day: string, field: keyof DaySchedule, value: string | boolean) => {
		setSchedule((prev) => ({
			...prev,
			[day]: {
				...prev[day],
				[field]: value,
			},
		}));
		setSaved(false);
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const url = businessHours
				? `/api/messaging/business-hours/${businessHours.id}`
				: '/api/messaging/business-hours';
			const method = businessHours ? 'PATCH' : 'POST';
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ timezone, schedule }),
			});
			if (res.ok) {
				const data = await res.json();
				setBusinessHours(data);
				setSaved(true);
				setTimeout(() => setSaved(false), 2000);
			}
		} catch { /* ignore */ }
		setSaving(false);
	};

	if (loading) {
		return <div className='text-center py-12 text-gray-400'>Загрузка...</div>;
	}

	return (
		<div>
			<div className='flex items-center justify-between mb-6'>
				<div>
					<h1 className='text-2xl font-bold text-gray-900'>Рабочие часы</h1>
					<p className='mt-1 text-sm text-gray-500'>
						Расписание работы операторов
					</p>
				</div>
				<button
					onClick={handleSave}
					disabled={saving}
					className='inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50'>
					{saving ? 'Сохранение...' : saved ? 'Сохранено!' : 'Сохранить'}
				</button>
			</div>

			{/* Timezone */}
			<div className='bg-white rounded-xl border border-gray-100 p-4 mb-4'>
				<label className='block text-sm font-medium text-gray-700 mb-1'>Часовой пояс</label>
				<select
					value={timezone}
					onChange={(e) => {
						setTimezone(e.target.value);
						setSaved(false);
					}}
					className='w-full max-w-xs px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand'>
					<option value='Europe/Warsaw'>Europe/Warsaw (CET)</option>
					<option value='Europe/Moscow'>Europe/Moscow (MSK)</option>
					<option value='Europe/Kiev'>Europe/Kiev (EET)</option>
					<option value='Europe/London'>Europe/London (GMT)</option>
					<option value='America/New_York'>America/New_York (EST)</option>
					<option value='UTC'>UTC</option>
				</select>
			</div>

			{/* Schedule grid */}
			<div className='bg-white rounded-xl border border-gray-100 overflow-hidden'>
				<div className='divide-y divide-gray-100'>
					{DAYS.map((day) => {
						const daySchedule = schedule[day.key] || {
							enabled: false,
							startTime: '09:00',
							endTime: '18:00',
						};

						return (
							<div
								key={day.key}
								className='flex items-center gap-4 px-4 py-3'>
								<label className='flex items-center gap-3 w-36 cursor-pointer'>
									<input
										type='checkbox'
										checked={daySchedule.enabled}
										onChange={(e) => updateDay(day.key, 'enabled', e.target.checked)}
										className='w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand/20'
									/>
									<span
										className={`text-sm font-medium ${
											daySchedule.enabled ? 'text-gray-900' : 'text-gray-400'
										}`}>
										{day.label}
									</span>
								</label>

								{daySchedule.enabled ? (
									<div className='flex items-center gap-2'>
										<input
											type='time'
											value={daySchedule.startTime}
											onChange={(e) => updateDay(day.key, 'startTime', e.target.value)}
											className='px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand'
										/>
										<span className='text-gray-400'>-</span>
										<input
											type='time'
											value={daySchedule.endTime}
											onChange={(e) => updateDay(day.key, 'endTime', e.target.value)}
											className='px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand'
										/>
									</div>
								) : (
									<span className='text-sm text-gray-400'>Выходной</span>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
