'use client';

export default function InboxPage() {
	// The inbox page shows the same placeholder as the main messaging page.
	// The conversation list is rendered by the layout.
	return (
		<div className='flex items-center justify-center h-full'>
			<div className='text-center px-6'>
				<svg
					className='w-20 h-20 mx-auto text-gray-200 mb-4'
					fill='none'
					viewBox='0 0 24 24'
					strokeWidth={0.75}
					stroke='currentColor'>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						d='M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h2.21a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-17.5 0V6.75A2.25 2.25 0 0 1 4.5 4.5h15A2.25 2.25 0 0 1 21.75 6.75v6.75m-19.5 0v4.5A2.25 2.25 0 0 1 4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25v-4.5'
					/>
				</svg>
				<h2 className='text-lg font-semibold text-gray-900 mb-1'>Входящие</h2>
				<p className='text-sm text-gray-400 max-w-sm'>
					Выберите разговор из списка слева для просмотра сообщений
				</p>
			</div>
		</div>
	);
}
