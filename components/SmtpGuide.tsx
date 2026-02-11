import React, { useState } from 'react';
import { Mail, Key, ShieldCheck, ExternalLink, HelpCircle, ChevronRight, AlertTriangle, CheckCircle, Copy } from 'lucide-react';

interface SmtpGuideProps {
    onClose?: () => void;
}

export const SmtpGuide: React.FC<SmtpGuideProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'gmail' | 'switch'>('gmail');

    return (
        <div className="flex flex-col h-full max-h-[80vh]">
            <div className="flex bg-gray-50 p-1 rounded-xl mb-6 mx-6 mt-2">
                <button
                    onClick={() => setActiveTab('gmail')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'gmail'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Gmail App Password
                </button>
                <button
                    onClick={() => setActiveTab('switch')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'switch'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Switching Providers
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
                {activeTab === 'gmail' ? (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                            <div className="bg-white p-2 rounded-lg text-blue-600 h-fit shadow-sm">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-900 text-sm">Why do I need an App Password?</h4>
                                <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                    For security, Google requires a 16-character App Password instead of your regular Gmail password when using third-party apps like this one.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 relative before:absolute before:left-3.5 before:top-4 before:h-full before:w-0.5 before:bg-gray-100 pb-2">
                            {[
                                {
                                    title: "Enable 2-Step Verification",
                                    desc: "Go to your Google Account Security settings and ensure 2FA is turned ON.",
                                    href: "https://myaccount.google.com/security"
                                },
                                {
                                    title: "Search for 'App Passwords'",
                                    desc: "In the search bar at the top of your Google Account page, type 'App Passwords' and select it.",
                                },
                                {
                                    title: "Create App Name",
                                    desc: "Enter a custom name like 'MoneyFlow Finance Tracker' and click Create.",
                                },
                                {
                                    title: "Copy the 16-Digit Code",
                                    desc: "A yellow modal will appear with a code like 'abcd efgh ijkl mnop'. Copy this code.",
                                },
                                {
                                    title: "Paste in Settings",
                                    desc: "Come back here and paste the code into the 'SMTP Password' field without spaces.",
                                }
                            ].map((step, idx) => (
                                <div key={idx} className="relative pl-10">
                                    <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white border-2 border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm z-10">
                                        {idx + 1}
                                    </div>
                                    <h5 className="font-bold text-gray-900 text-sm">{step.title}</h5>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-sm">{step.desc}</p>
                                    {step.href && (
                                        <a
                                            href={step.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 mt-2 hover:underline"
                                        >
                                            Open Google Security <ExternalLink size={10} />
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={16} className="text-yellow-600" />
                                <h4 className="font-bold text-yellow-800 text-xs">Important Note</h4>
                            </div>
                            <p className="text-[10px] text-yellow-700 leading-relaxed">
                                If you change your main Google password, your App Password will be revoked and you'll need to generate a new one.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm mb-2">Common SMTP Providers</h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { name: 'Gmail', host: 'smtp.gmail.com', port: '587 (TLS) or 465 (SSL)' },
                                        { name: 'Outlook / Office365', host: 'smtp.office365.com', port: '587' },
                                        { name: 'Yahoo Mail', host: 'smtp.mail.yahoo.com', port: '465 or 587' },
                                        { name: 'Zoho Mail', host: 'smtp.zoho.com', port: '465 (SSL) or 587 (TLS)' },
                                    ].map((provider) => (
                                        <div key={provider.name} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-indigo-200 transition-colors">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-xs text-indigo-900">{provider.name}</span>
                                                <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">Host</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-600">
                                                <span className="font-mono">{provider.host}</span>
                                                <span className="text-gray-400">Port: {provider.port}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="font-bold text-gray-900 text-sm mb-3">Checklist for switching</h4>
                                <ul className="space-y-2">
                                    {[
                                        "Update Host Address (e.g., smtp.provider.com)",
                                        "Update Port (usually 587 for TLS, 465 for SSL)",
                                        "Toggle Secure Connection based on port",
                                        "Update Username (usually full email address)",
                                        "Update Password (app password if 2FA is on)"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                                            <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                                            <span className="leading-relaxed">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {onClose && (
                <div className="p-4 border-t border-gray-100 mt-auto flex justify-end bg-white rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-colors shadow-lg"
                    >
                        Got it, thanks!
                    </button>
                </div>
            )}
        </div>
    );
};
