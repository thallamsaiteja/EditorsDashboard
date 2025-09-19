import React from 'react';

// --- SVG Icon Components ---
// Using components for icons makes the main App component cleaner.

const LogoIcon = () => (
    <svg className="w-8 h-8 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5l3 3m0 0l3-3m-3 3v-6m1.06-4.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
);

const Step1Icon = () => (
    <svg className="w-8 h-8 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.092 1.21-.138 2.43-.138 3.662v.514a48.678 48.678 0 007.324 0v-.514zM12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 8.25h.008v.008h-.008V8.25z" />
    </svg>
);

const Step2Icon = () => (
     <svg className="w-8 h-8 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

const Step3Icon = () => (
    <svg className="w-8 h-8 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
);

const FeatureSpeedIcon = () => (
    <svg className="w-10 h-10 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
);

const FeatureSecureIcon = () => (
    <svg className="w-10 h-10 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" />
    </svg>
);

const FeatureShareIcon = () => (
    <svg className="w-10 h-10 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.195.025.39.044.585.058a2.25 2.25 0 012.25 2.25m0-2.25a2.25 2.25 0 00-2.25 2.25m0-2.25c.195.025.39.044.585.058a2.25 2.25 0 012.25 2.25m-2.25 2.25a2.25 2.25 0 002.25 2.25m0-2.25c-.195-.025-.39-.044-.585-.058a2.25 2.25 0 00-2.25-2.25m0 2.25a2.25 2.25 0 01-2.25-2.25m0 2.25c-.195-.025-.39-.044-.585-.058a2.25 2.25 0 00-2.25-2.25" />
    </svg>
);


// --- Main App Component ---
export default function App() {
    const botUsername = "@your_bot_username"; // Replace with your actual bot username

    // Inline styles for body to set background and font
    const bodyStyle = {
        fontFamily: "'Inter', sans-serif",
        backgroundColor: '#0f172a',
        color: '#f8fafc',
    };

    // Applying styles directly to the root element that wraps the app
    // In a real app, you'd likely set this on the body in your main index.html or a global CSS file.
    if (typeof window !== 'undefined') {
        document.body.style.backgroundColor = bodyStyle.backgroundColor;
        document.body.style.fontFamily = bodyStyle.fontFamily;
        document.body.style.color = bodyStyle.color;
    }

    return (
        <div className="bg-slate-900 text-slate-50">
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <LogoIcon />
                        <span className="text-2xl font-bold text-white">Tele-Upload</span>
                    </div>
                    <a href={`https://t.me/${botUsername.substring(1)}`} target="_blank" rel="noopener noreferrer" className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-5 py-2 rounded-lg transition-colors duration-300">
                        Start on Telegram
                    </a>
                </nav>
            </header>

            {/* Main Content */}
            <main>
                {/* Hero Section */}
                <section className="py-24 md:py-32 text-center">
                    <div className="container mx-auto px-6">
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">The Effortless Way to<br /> <span className="bg-gradient-to-r from-sky-400 to-indigo-400 text-transparent bg-clip-text">Upload & Share Videos</span></h1>
                        <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-8">
                            No more complex websites or slow uploads. Just send a video to our Telegram bot, and get a secure, shareable link in seconds.
                        </p>
                        <div className="flex justify-center">
                            <a href={`https://t.me/${botUsername.substring(1)}`} target="_blank" rel="noopener noreferrer" className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-lg px-8 py-4 rounded-xl transition-transform duration-300 hover:scale-105 shadow-lg shadow-sky-500/20">
                                Try It Now
                            </a>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section id="how-it-works" className="py-20 bg-slate-800/50">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold">Get Your Link in 3 Simple Steps</h2>
                            <p className="text-slate-400 mt-2">It's as easy as sending a message.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Step 1 */}
                            <div className="bg-slate-800 border border-slate-700 hover:border-sky-500 p-8 rounded-2xl text-center transition-all duration-300 transform hover:-translate-y-1">
                                <div className="bg-slate-700 inline-flex p-4 rounded-full mb-6"><Step1Icon /></div>
                                <h3 className="text-xl font-semibold mb-2">1. Find our Bot</h3>
                                <p className="text-slate-400">Search for <span className="font-medium text-sky-400">{botUsername}</span> on Telegram and start a chat.</p>
                            </div>

                            {/* Step 2 */}
                             <div className="bg-slate-800 border border-slate-700 hover:border-sky-500 p-8 rounded-2xl text-center transition-all duration-300 transform hover:-translate-y-1">
                                <div className="bg-slate-700 inline-flex p-4 rounded-full mb-6"><Step2Icon /></div>
                                <h3 className="text-xl font-semibold mb-2">2. Send Your Video</h3>
                                <p className="text-slate-400">Simply attach or drag-and-drop your video file into the chat and send it.</p>
                            </div>

                            {/* Step 3 */}
                             <div className="bg-slate-800 border border-slate-700 hover:border-sky-500 p-8 rounded-2xl text-center transition-all duration-300 transform hover:-translate-y-1">
                                <div className="bg-slate-700 inline-flex p-4 rounded-full mb-6"><Step3Icon /></div>
                                <h3 className="text-xl font-semibold mb-2">3. Get Your Link</h3>
                                <p className="text-slate-400">The bot will instantly process your video and send back a secure, shareable link.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-20">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12">
                             <h2 className="text-3xl md:text-4xl font-bold">Why Choose Tele-Upload?</h2>
                            <p className="text-slate-400 mt-2">Everything you need, nothing you don't.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl flex flex-col items-center text-center">
                                <FeatureSpeedIcon />
                                <h3 className="text-xl font-semibold mt-4 mb-2">Fast & Simple</h3>
                                <p className="text-slate-400">Leverage Telegram's fast infrastructure. No sign-ups, no forms, just send.</p>
                            </div>
                            <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl flex flex-col items-center text-center">
                                <FeatureSecureIcon />
                                <h3 className="text-xl font-semibold mt-4 mb-2">Secure Storage</h3>
                                <p className="text-slate-400">Your files are uploaded to industry-standard secure cloud storage.</p>
                            </div>
                             <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl flex flex-col items-center text-center">
                                <FeatureShareIcon />
                                <h3 className="text-xl font-semibold mt-4 mb-2">Easily Shareable</h3>
                                <p className="text-slate-400">Get a direct link that you can share with anyone, anywhere.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-700 mt-12">
                <div className="container mx-auto px-6 py-6 text-center text-slate-400">
                    <p>&copy; {new Date().getFullYear()} Tele-Upload. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
