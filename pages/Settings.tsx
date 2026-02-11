
import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Globe, Mail, Share2, Shield, Check, Save, Loader2, Sparkles, Plus, Trash2, CheckCircle, Send, AlertCircle, Zap, CloudLightning, Phone, MapPin, Building2, CreditCard, Link as LinkIcon, Upload, Info, ShieldCheck, ShieldAlert, ExternalLink, QrCode, Copy, Key, Server
} from 'lucide-react';
import { api, currencySymbols, timezones } from '../services/api';
import { GeneralSettings, SmtpSettings, SocialSettings, PersonalSettings, CustomLink } from '../types';
import { Modal } from '../components/Modal';
import { SmtpGuide } from '../components/SmtpGuide';
import { aiService } from '../services/aiService';

type TabType = 'General' | 'Smtp' | 'Personal' | 'Security' | 'Social';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('General');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // 2FA Flow State
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [isSmtpGuideOpen, setIsSmtpGuideOpen] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState<1 | 2 | 3>(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes] = useState(['ABCD-1234', 'EFGH-5678', 'IJKL-9012']);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [general, setGeneral] = useState<GeneralSettings>({ companyName: '', email: '', currency: 'USD', timezone: 'UTC', dateFormat: 'YYYY-MM-DD', address: '', phoneNumber: '', taxId: '' });
  const [smtp, setSmtp] = useState<SmtpSettings>({ host: 'smtp.gmail.com', port: 587, username: '', password: '', secure: false, senderName: 'MoneyFlow Admin', senderEmail: '', isEnabled: false });
  const [personal, setPersonal] = useState<PersonalSettings>({ name: '', email: '', twoFactorEnabled: false });
  const [social, setSocial] = useState<SocialSettings>({ website: '', facebook: '', twitter: '', linkedin: '', instagram: '', customLinks: [] });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [gen, cloud, pers, soc] = await Promise.all([
        api.settings.getGeneral(),
        api.settings.getCloudMail(),
        api.settings.getPersonal(),
        api.settings.getSocial(),
      ]);
      setGeneral(gen);
      setSmtp(cloud);
      setPersonal(pers);
      setSocial(soc);
      setIsDirty(false);
    } catch (e) {
      console.error("Failed to load settings", e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setIsAnalyzing(true);
      try {
        const extracted = await aiService.extractBusinessDetails(base64Data, file.type);
        if (extracted) {
          setGeneral(prev => ({
            ...prev,
            companyName: extracted.companyName || prev.companyName,
            address: extracted.address || prev.address,
            taxId: extracted.gstNumber || prev.taxId,
          }));
          setIsDirty(true);
        }
      } catch (err) {
        alert('Extraction failed. Please try a clearer document.');
      } finally { setIsAnalyzing(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    console.log("💾 Executing handleSave for tab:", activeTab);
    setSaving(true);
    try {
      let data = {};
      if (activeTab === 'General') data = general;
      if (activeTab === 'Smtp') data = smtp;
      if (activeTab === 'Personal') data = personal;
      if (activeTab === 'Social') data = social;
      if (activeTab === 'Security') {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          throw new Error("New passwords do not match");
        }
        data = { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword };
      }

      const res = await api.settings.update(activeTab === 'Smtp' ? 'cloudmail' : activeTab.toLowerCase(), data);
      setSaveStatus({ type: 'success', message: res.message || `${activeTab} updated!` });

      if (activeTab === 'Security') {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
      setIsDirty(false);
      setTimeout(() => setSaveStatus(null), 4000);

      if (activeTab === 'Personal') {
        localStorage.setItem('userName', personal.name);
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e: any) {
      setSaveStatus({ type: 'error', message: e.message || 'Failed to save settings' });
    } finally { setSaving(false); }
  };

  const handleTestMail = async () => {
    console.log("🧪 Executing handleTestMail...");
    setTesting(true);
    setSaveStatus(null);
    try {
      const res = await api.settings.testCloudMail(smtp);
      console.log("✅ Test result:", res);
      // Ensure we use the message from the server response
      setSaveStatus({ type: 'success', message: res.message || 'SMTP Connection Successful!' });
      setTimeout(() => setSaveStatus(null), 6000);
    } catch (e: any) {
      console.error("❌ Test failed:", e);
      setSaveStatus({ type: 'error', message: e.message || 'SMTP Test Failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleEnable2FA = async () => {
    try {
      setLoading(true);
      const res = await api.settings.send2FAOtp();
      setQrCodeUrl(res.qrCode);
      setTotpSecret(res.secret);
      setTwoFaStep(1);
      setIs2FAModalOpen(true);
    } catch (e) {
      console.error("Failed to generate 2FA", e);
      alert("Failed to generate QR Code");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Configuration</h1>
          <p className="text-gray-500 font-medium">Manage your workspace identity and SMTP delivery services.</p>
        </div>
        {saveStatus && (
          <div className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold shadow-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${saveStatus.type === 'success' ? 'bg-green-600 text-white border-green-500' : 'bg-red-600 text-white border-red-500'
            }`}>
            {saveStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {saveStatus.message}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-72 space-y-2 shrink-0">
          {[
            { id: 'General', icon: Building2, label: 'Identity' },
            { id: 'Smtp', icon: Mail, label: 'SMTP Service' },
            { id: 'Personal', icon: User, label: 'Profile' },
            { id: 'Security', icon: ShieldCheck, label: 'Security' },
            { id: 'Social', icon: Share2, label: 'Social & Links' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id as TabType); setSaveStatus(null); }}
              className={`w-full flex items-center space-x-3 p-4 rounded-xl font-bold transition-all duration-200 ${activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]'
                : 'bg-white text-gray-500 hover:bg-indigo-50 border border-transparent'
                }`}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 min-w-0">
          {activeTab === 'General' && (
            <div className="space-y-6">
              <div className="p-5 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl text-indigo-600 shadow-sm"><Sparkles size={24} /></div>
                  <div>
                    <h3 className="font-black text-indigo-900 leading-tight">Identity Scan</h3>
                    <p className="text-xs text-indigo-600 font-bold opacity-80 uppercase tracking-wider">Auto-fill via Document Extraction</p>
                  </div>
                </div>
                <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl cursor-pointer font-bold text-sm shadow-md transition-all flex items-center gap-2">
                  {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  <span>{isAnalyzing ? 'Extracting...' : 'Scan Document'}</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Company Name</label>
                  <input type="text" className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-gray-800" value={general.companyName} onChange={e => { setGeneral({ ...general, companyName: e.target.value }); setIsDirty(true); }} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Official Email</label>
                  <input type="email" className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-gray-800" value={general.email} onChange={e => { setGeneral({ ...general, email: e.target.value }); setIsDirty(true); }} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tax / GST ID</label>
                  <input type="text" className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-gray-800" value={general.taxId || ''} onChange={e => { setGeneral({ ...general, taxId: e.target.value }); setIsDirty(true); }} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input type="text" className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-gray-800" value={general.phoneNumber || ''} onChange={e => { setGeneral({ ...general, phoneNumber: e.target.value }); setIsDirty(true); }} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Physical Address</label>
                  <textarea rows={3} className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-gray-800" value={general.address || ''} onChange={e => { setGeneral({ ...general, address: e.target.value }); setIsDirty(true); }} placeholder="Full business address..." />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold">
                  <Info size={14} />
                  <span>Updates are applied instantly to documents.</span>
                </div>
                <button type="button" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3.5 rounded-xl font-black shadow-xl shadow-indigo-100 transition-all transform active:scale-95 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Update Identity'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Smtp' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${smtp.isEnabled ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400'}`}>
                    <CloudLightning size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-indigo-900 leading-tight">SMTP Master Switch</h3>
                    <p className="text-xs font-bold text-indigo-600 opacity-70">Enable or disable system emails</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSmtp({ ...smtp, isEnabled: !smtp.isEnabled }); setIsDirty(true); }}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${smtp.isEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${smtp.isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSmtpGuideOpen(true)}
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg"
                >
                  <Info size={14} />
                  How to generate App Password?
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SMTP Host</label>
                    <div className="relative">
                      <input type="text" placeholder="smtp.gmail.com" className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold" value={smtp.host} onChange={e => { setSmtp({ ...smtp, host: e.target.value }); setIsDirty(true); }} />
                      <Server size={18} className="absolute right-4 top-4 text-gray-300" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Port</label>
                    <input type="number" placeholder="587" className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold" value={smtp.port} onChange={e => { setSmtp({ ...smtp, port: Number(e.target.value) }); setIsDirty(true); }} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SMTP Username</label>
                    <input type="text" placeholder="your-email@example.com" className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold" value={smtp.username} onChange={e => { setSmtp({ ...smtp, username: e.target.value }); setIsDirty(true); }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SMTP Password</label>
                    <div className="relative">
                      <input type="password" placeholder="••••••••" className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold" value={smtp.password} onChange={e => { setSmtp({ ...smtp, password: e.target.value }); setIsDirty(true); }} />
                      <Key size={18} className="absolute right-4 top-4 text-gray-300" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-gray-900 uppercase">Secure Connection</h4>
                    <p className="text-[10px] font-bold text-gray-400">Enable SSL/TLS (required for Port 465)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSmtp({ ...smtp, secure: !smtp.secure }); setIsDirty(true); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${smtp.secure ? 'bg-green-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${smtp.secure ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sender Name</label>
                    <input type="text" placeholder="MoneyFlow Admin" className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold" value={smtp.senderName} onChange={e => { setSmtp({ ...smtp, senderName: e.target.value }); setIsDirty(true); }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sender Email</label>
                    <input type="email" placeholder="noreply@yourdomain.com" className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold" value={smtp.senderEmail} onChange={e => { setSmtp({ ...smtp, senderEmail: e.target.value }); setIsDirty(true); }} />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50 flex flex-col sm:flex-row items-center gap-4">
                <button
                  type="button"
                  onClick={handleTestMail}
                  disabled={testing || !smtp.host}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-indigo-600 text-indigo-600 rounded-xl font-black hover:bg-indigo-50 transition-all disabled:opacity-50"
                >
                  {testing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  <span>Test Connection</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-black shadow-xl shadow-indigo-100 transition-all"
                >
                  {saving ? 'Saving...' : 'Update Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Personal' && (
            <div className="space-y-8">
              <div className="flex flex-col items-center py-6 border-b border-gray-50">
                <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 font-black text-3xl mb-4 border border-indigo-100 shadow-inner">
                  {personal.name.charAt(0)}
                </div>
                <h3 className="text-xl font-black text-gray-900">{personal.name}</h3>
                <p className="text-sm text-gray-400 font-medium">{personal.email}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Display Name</label>
                  <input type="text" className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold" value={personal.name} onChange={e => { setPersonal({ ...personal, name: e.target.value }); setIsDirty(true); }} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Login Email</label>
                  <input disabled type="email" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-bold cursor-not-allowed" value={personal.email} />
                </div>
              </div>

              <div className="pt-6 flex justify-end">
                <button type="button" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3.5 rounded-xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50">
                  {saving ? 'Updating...' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}
          {activeTab === 'Security' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-lg font-black text-gray-900">Sign-in & Security</h2>
                <p className="text-gray-500 text-sm">Manage your password and 2-step verification methods.</p>

                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 p-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${personal.twoFactorEnabled ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`}>
                        <Shield size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900 leading-tight">Two-Factor Authentication</h3>
                        <p className="text-xs font-bold text-gray-400">Secure your account with OTP login</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { if (personal.twoFactorEnabled) { setPersonal({ ...personal, twoFactorEnabled: false }); setIsDirty(true); } else { handleEnable2FA(); } }}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${personal.twoFactorEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${personal.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {personal.twoFactorEnabled && (
                    <div className="p-5 bg-white">
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                        <h4 className="text-sm font-black text-indigo-900 mb-2">Recovery Backup Codes</h4>
                        <p className="text-xs font-bold text-indigo-600 mb-4 opacity-70 leading-relaxed">Keep these codes in a safe place. They allow access if you lose your authenticator.</p>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {recoveryCodes.map(code => (
                            <div key={code} className="bg-white px-3 py-2 rounded-lg border border-indigo-200 text-center text-xs font-mono font-black text-indigo-900 shadow-sm">{code}</div>
                          ))}
                        </div>
                        <button type="button" className="flex items-center gap-2 text-[10px] font-black text-indigo-700 uppercase tracking-widest hover:text-indigo-900 transition-colors">
                          <Copy size={12} /> Copy to Clipboard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-gray-100">
                <h2 className="text-lg font-black text-gray-900">Password</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
                    <input type="password" placeholder="••••••••" className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                    <input type="password" placeholder="••••••••" className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                    <input type="password" placeholder="••••••••" className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button type="button" onClick={handleSave} disabled={saving} className="bg-gray-900 hover:bg-black text-white px-8 py-3.5 rounded-xl font-black shadow-xl transition-all active:scale-95 disabled:opacity-50">
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Social' && (
            <div className="space-y-6">
              <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-6">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                  <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                    <Share2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-lg">Social Profiles</h3>
                    <p className="text-sm text-gray-500 font-medium">Connect your public presence.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Website URL</label>
                    <div className="relative">
                      <Globe size={18} className="absolute left-4 top-3.5 text-gray-400" />
                      <input type="url" placeholder="https://example.com" className="w-full pl-11 p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-gray-800"
                        value={social.website} onChange={e => { setSocial({ ...social, website: e.target.value }); setIsDirty(true); }} />
                    </div>
                  </div>

                  {[
                    { label: 'Facebook', value: social.facebook, key: 'facebook' },
                    { label: 'Twitter / X', value: social.twitter, key: 'twitter' },
                    { label: 'LinkedIn', value: social.linkedin, key: 'linkedin' },
                    { label: 'Instagram', value: social.instagram, key: 'instagram' },
                  ].map((item: any) => (
                    <div key={item.key} className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{item.label}</label>
                      <input type="url" placeholder={`https://${item.key}.com/...`} className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-gray-800"
                        value={item.value} onChange={e => { setSocial({ ...social, [item.key]: e.target.value }); setIsDirty(true); }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                      <LinkIcon size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900 text-lg">Custom Links</h3>
                      <p className="text-sm text-gray-500 font-medium">Add extra URLs to your profile.</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => {
                    setSocial(prev => ({ ...prev, customLinks: [...prev.customLinks, { id: Date.now().toString(), label: '', url: '' }] }));
                    setIsDirty(true);
                  }} className="flex items-center gap-2 text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors">
                    <Plus size={14} /> Add Link
                  </button>
                </div>

                <div className="space-y-4">
                  {social.customLinks.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-4 italic">No custom links added yet.</p>
                  )}
                  {social.customLinks.map((link, index) => (
                    <div key={link.id} className="flex gap-4 items-start animate-in fade-in slide-in-from-top-2">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="text" placeholder="Label (e.g. Portfolio)" className="md:col-span-1 w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-sm"
                          value={link.label}
                          onChange={e => {
                            const newLinks = [...social.customLinks];
                            newLinks[index].label = e.target.value;
                            setSocial({ ...social, customLinks: newLinks });
                            setIsDirty(true);
                          }}
                        />
                        <input type="url" placeholder="https://..." className="md:col-span-2 w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-medium text-sm"
                          value={link.url}
                          onChange={e => {
                            const newLinks = [...social.customLinks];
                            newLinks[index].url = e.target.value;
                            setSocial({ ...social, customLinks: newLinks });
                            setIsDirty(true);
                          }}
                        />
                      </div>
                      <button type="button" onClick={() => {
                        const newLinks = social.customLinks.filter((_, i) => i !== index);
                        setSocial({ ...social, customLinks: newLinks });
                        setIsDirty(true);
                      }} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 flex justify-end">
                <button type="button" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3.5 rounded-xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50">
                  {saving ? 'Updating...' : 'Save Social Links'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <Modal isOpen={is2FAModalOpen} onClose={() => setIs2FAModalOpen(false)} title="Enable Two-Factor Authentication">
        <div className="p-2">
          {twoFaStep === 1 && (
            <div className="text-center space-y-6 py-4">
              <div className="flex justify-center">
                <div className="bg-white p-6 rounded-3xl shadow-inner border border-gray-100">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                  ) : (
                    <QrCode size={180} className="text-gray-900" />
                  )}
                </div>
              </div>
              <div className="space-y-2 max-w-sm mx-auto">
                <h3 className="text-lg font-black text-gray-900">Scan QR Code</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  Open your authenticator app (Google Authenticator, Authy, etc.) and scan the code above to pair your device.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTwoFaStep(2)}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-black shadow-lg shadow-indigo-100 transition-all"
              >
                Enter Verification Code
              </button>
            </div>
          )}

          {twoFaStep === 2 && (
            <div className="space-y-8 py-4">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-gray-900">Verification</h3>
                <p className="text-sm text-gray-500 font-medium">Enter the 6-digit code from your app.</p>
              </div>
              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000 000"
                  className="text-center text-4xl tracking-[0.3em] font-black w-full max-w-xs border-b-4 border-indigo-100 focus:border-indigo-600 outline-none py-4 bg-transparent transition-all placeholder:text-gray-100"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setTwoFaStep(1)}
                  className="flex-1 py-4 text-gray-400 font-black hover:bg-gray-50 rounded-2xl transition-all"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.settings.verify2FAOtp(verificationCode);
                      setTwoFaStep(3);
                      setPersonal({ ...personal, twoFactorEnabled: true });
                      setIsDirty(true);
                    } catch (e) {
                      alert("Invalid Code. Please try again.");
                    }
                  }}
                  disabled={verificationCode.length !== 6}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-black shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  Verify & Enable
                </button>
              </div>
            </div>
          )}

          {twoFaStep === 3 && (
            <div className="text-center space-y-8 py-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 border-4 border-white shadow-xl">
                  <Check size={40} />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">2FA Active!</h3>
                <p className="text-gray-500 font-medium">Your MoneyFlow account is now protected with multi-layer security.</p>
              </div>
              <button
                type="button"
                onClick={() => setIs2FAModalOpen(false)}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl hover:bg-black font-black shadow-xl transition-all"
              >
                Finish Setup
              </button>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={isSmtpGuideOpen} onClose={() => setIsSmtpGuideOpen(false)} title="SMTP Configuration Guide">
        <SmtpGuide onClose={() => setIsSmtpGuideOpen(false)} />
      </Modal>
    </div>
  );
};
