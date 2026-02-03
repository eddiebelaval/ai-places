'use client';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 bg-neutral-800 rounded-full flex items-center justify-center">
          <OfflineIcon className="w-10 h-10 text-neutral-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          You&apos;re offline
        </h1>

        <p className="text-neutral-400 mb-8">
          It looks like you&apos;ve lost your internet connection.
          Please check your connection and try again.
        </p>

        <button
          onClick={handleRetry}
          className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
        >
          Try Again
        </button>

        <p className="text-neutral-500 text-sm mt-8">
          Some features may still work while offline
        </p>
      </div>
    </div>
  );
}

function OfflineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}
