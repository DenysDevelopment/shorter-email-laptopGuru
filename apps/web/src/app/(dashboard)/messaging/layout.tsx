'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ConversationList } from '@/components/messaging/conversation-list';

const SETTINGS_PATHS = [
	'/messaging/settings',
	'/messaging/analytics',
];

function isSettingsOrSubPage(pathname: string): boolean {
	return SETTINGS_PATHS.some((p) => pathname.startsWith(p));
}

function isConversationPage(pathname: string): boolean {
	return pathname.startsWith('/messaging/conversations/');
}

const NAV_TABS = [
	{ href: '/messaging', label: 'Входящие', icon: InboxIcon },
];

export default function MessagingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();

	// On settings/contacts/analytics sub-pages, show full-width layout
	const showSidebar = isSettingsOrSubPage(pathname);
	// On conversation detail on mobile, hide the list
	const isConversation = isConversationPage(pathname);

	if (showSidebar) {
		return (
			<div className='flex flex-col h-screen'>
				{/* Sub-navigation */}
				<div className='bg-white border-b border-gray-200'>
					<div className='max-w-6xl mx-auto px-4 sm:px-6'>
						<div className='flex items-center gap-1 py-2 overflow-x-auto'>
							{NAV_TABS.map((tab) => {
								const isActive =
									tab.href === '/messaging'
										? pathname === '/messaging' || pathname.startsWith('/messaging/inbox') || pathname.startsWith('/messaging/conversations')
										: pathname.startsWith(tab.href);
								return (
									<Link
										key={tab.href}
										href={tab.href}
										className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
											isActive
												? 'text-brand bg-brand-light'
												: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
										}`}>
										<tab.icon className={`w-4 h-4 ${isActive ? 'text-brand' : 'text-gray-400'}`} />
										{tab.label}
									</Link>
								);
							})}
						</div>
					</div>
				</div>
				<div className='max-w-6xl mx-auto px-4 sm:px-6 py-6'>
					{children}
				</div>
			</div>
		);
	}

	// Inbox / Conversation layout: left panel (conversation list) + right panel (content)
	return (
		<div className='flex flex-col h-screen'>
			{/* Top nav */}
			<div className='bg-white border-b border-gray-200 flex-shrink-0'>
				<div className='flex items-center gap-1 px-3 py-2 overflow-x-auto'>
					{NAV_TABS.map((tab) => {
						const isActive =
							tab.href === '/messaging'
								? pathname === '/messaging' || pathname.startsWith('/messaging/inbox') || pathname.startsWith('/messaging/conversations')
								: pathname.startsWith(tab.href);
						return (
							<Link
								key={tab.href}
								href={tab.href}
								className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
									isActive
										? 'text-brand bg-brand-light'
										: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
								}`}>
								<tab.icon className={`w-4 h-4 ${isActive ? 'text-brand' : 'text-gray-400'}`} />
								{tab.label}
							</Link>
						);
					})}
				</div>
			</div>

			<div className='flex flex-1 min-h-0'>
				{/* Left panel: conversation list */}
				<div
					className={`w-full md:w-80 md:flex-shrink-0 bg-white border-r border-gray-200 flex flex-col ${
						isConversation ? 'hidden md:flex' : 'flex'
					}`}>
					<ConversationList />
				</div>

				{/* Right panel: content */}
				<div
					className={`flex-1 min-w-0 flex flex-col bg-gray-50/50 ${
						isConversation ? 'flex' : 'hidden md:flex'
					}`}>
					{children}
				</div>
			</div>
		</div>
	);
}

// --- Nav icons ---

function InboxIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor'>
			<path strokeLinecap='round' strokeLinejoin='round' d='M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h2.21a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-17.5 0V6.75A2.25 2.25 0 0 1 4.5 4.5h15A2.25 2.25 0 0 1 21.75 6.75v6.75m-19.5 0v4.5A2.25 2.25 0 0 1 4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25v-4.5' />
		</svg>
	);
}

function ContactsIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor'>
			<path strokeLinecap='round' strokeLinejoin='round' d='M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z' />
		</svg>
	);
}

function ChartIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor'>
			<path strokeLinecap='round' strokeLinejoin='round' d='M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z' />
		</svg>
	);
}

function GearIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor'>
			<path strokeLinecap='round' strokeLinejoin='round' d='M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z' />
			<path strokeLinecap='round' strokeLinejoin='round' d='M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' />
		</svg>
	);
}
