'use client';

export default function MessagingPage() {
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
						d='M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z'
					/>
				</svg>
				<h2 className='text-lg font-semibold text-gray-900 mb-1'>Мессенджер</h2>
				<p className='text-sm text-gray-400 max-w-sm'>
					Выберите разговор из списка слева или дождитесь новых сообщений
				</p>
			</div>
		</div>
	);
}
