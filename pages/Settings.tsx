
import React, { useState, useEffect } from 'react';
import { 
  User, Globe, Mail, Building, Share2, Shield, QrCode, Check, Copy, Save, Loader2 
} from 'lucide-react';
import { api } from '../services/api';
import { GeneralSettings, SmtpSettings, BusinessSettings, SocialSettings, PersonalSettings } from '../types';
import { Modal } from '../components/Modal';

type TabType = 'General' | 'SMTP' | 'Personal' | 'Business' | 'Social';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('General');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // State for each section
  const [general, setGeneral] = useState<GeneralSettings>({} as any);
  const [smtp, setSmtp] = useState<SmtpSettings>({} as any);
  const [business, setBusiness] = useState<BusinessSettings>({} as any);
  const [social, setSocial] = useState<SocialSettings>({} as any);
  const [personal, setPersonal] = useState<PersonalSettings>({} as any);

  // 2FA State
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState<1 | 2 | 3>(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState(['ABCD-1234', 'EFGH-5678', 'IJKL-9012']);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [genData, smtpData, bizData, socData, persData] = await Promise.all([
        api.settings.getGeneral(),
        api.settings.getSmtp(),
        api.settings.getBusiness(),
        api.settings.getSocial(),
        api.settings.getPersonal(),
      ]);
      setGeneral(genData);
      setSmtp(smtpData);
      setBusiness(bizData);
      setSocial(socData);
      setPersonal(persData);
    } catch (error) {
      console.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate saving currently active tab data
      let dataToSave = {};
      switch (activeTab) {
        case 'General': dataToSave = general; break;
        case 'SMTP': dataToSave = smtp; break;
        case 'Business': dataToSave = business; break;
        case 'Social': dataToSave = social; break;
        case 'Personal': dataToSave = personal; break;
      }
      await api.settings.update(activeTab, dataToSave);
      
      if (activeTab === 'Personal') {
        alert('Profile updated successfully! Refresh the page to see changes in the header.');
      } else {
        alert(`${activeTab} settings saved successfully!`);
      }
      
    } catch (error) {
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // 2FA Handlers
  const handleEnable2FA = () => {
    setTwoFaStep(1);
    setIs2FAModalOpen(true);
  };

  const verify2FA = async () => {
    if (verificationCode.length !== 6) return alert("Please enter a 6-digit code");
    await api.settings.toggle2FA(true);
    setPersonal({ ...personal, twoFactorEnabled: true });
    setTwoFaStep(3); // Show success/recovery codes
  };

  const disable2FA = async () => {
    if (window.confirm("Are you sure you want to disable 2FA? This will make your account less secure.")) {
      await api.settings.toggle2FA(false);
      setPersonal({ ...personal, twoFactorEnabled: false });
    }
  };

  const TabButton = ({ id, label, icon: Icon }: { id: TabType; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-3 rounded-lg w-full text-left transition-colors mb-1 ${
        activeTab === id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  if (loading) return <div className="p-10 text-center text-gray-500">Loading settings...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white rounded-xl shadow-sm border border-gray-100 p-4 shrink-0">
          <nav>
            <TabButton id="General" label="General" icon={Globe} />
            <TabButton id="SMTP" label="SMTP" icon={Mail} />
            <TabButton id="Personal" label="Personal" icon={User} />
            <TabButton id="Business" label="Business" icon={Building} />
            <TabButton id="Social" label="Social Media" icon={Share2} />
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="mb-6 pb-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">{activeTab} Configuration</h2>
            {activeTab !== 'Personal' && (
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm md:text-base"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>Save</span>
              </button>
            )}
          </div>

          {/* GENERAL TAB */}
          {activeTab === 'General' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg p-2.5" 
                  value={general.companyName} 
                  onChange={e => setGeneral({...general, companyName: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Official Email</label>
                <input 
                  type="email" 
                  className="w-full border rounded-lg p-2.5" 
                  value={general.email} 
                  onChange={e => setGeneral({...general, email: e.target.value})} 
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="+1 234 567 890"
                    className="w-full border rounded-lg p-2.5" 
                    value={general.phoneNumber || ''} 
                    onChange={e => setGeneral({...general, phoneNumber: e.target.value})} 
                  />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input 
                    type="text" 
                    placeholder="123 Main St, City, Country"
                    className="w-full border rounded-lg p-2.5" 
                    value={general.address || ''} 
                    onChange={e => setGeneral({...general, address: e.target.value})} 
                  />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select 
                    className="w-full border rounded-lg p-2.5 bg-white"
                    value={general.currency}
                    onChange={e => setGeneral({...general, currency: e.target.value})}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                  <select 
                    className="w-full border rounded-lg p-2.5 bg-white"
                    value={general.timezone}
                    onChange={e => setGeneral({...general, timezone: e.target.value})}
                  >
                    <option value="UTC">UTC</option>
                    <option value="EST">EST (UTC-5)</option>
                    <option value="PST">PST (UTC-8)</option>
                    <option value="IST">IST (UTC+5:30)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SMTP TAB */}
          {activeTab === 'SMTP' && (
             <div className="space-y-4 max-w-lg">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                 <input 
                   type="text" 
                   placeholder="e.g. smtp.gmail.com" 
                   className="w-full border rounded-lg p-2.5" 
                   value={smtp.host} 
                   onChange={e => setSmtp({...smtp, host: e.target.value})} 
                 />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                   <input 
                     type="number" 
                     placeholder="587" 
                     className="w-full border rounded-lg p-2.5" 
                     value={smtp.port} 
                     onChange={e => setSmtp({...smtp, port: Number(e.target.value)})} 
                   />
                 </div>
                 <div className="flex items-center pt-2 md:pt-6">
                   <label className="flex items-center space-x-2 cursor-pointer">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4 text-blue-600 rounded border-gray-300"
                       checked={smtp.enableSsl}
                       onChange={e => setSmtp({...smtp, enableSsl: e.target.checked})}
                     />
                     <span className="text-sm text-gray-700">Enable SSL/TLS</span>
                   </label>
                 </div>
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                 <input 
                   type="text" 
                   className="w-full border rounded-lg p-2.5" 
                   value={smtp.username} 
                   onChange={e => setSmtp({...smtp, username: e.target.value})} 
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                 <input type="password" placeholder="••••••••" className="w-full border rounded-lg p-2.5" />
               </div>
               <div className="pt-2">
                 <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Test Connection</button>
               </div>
             </div>
          )}

          {/* BUSINESS TAB */}
          {activeTab === 'Business' && (
             <div className="space-y-4 max-w-lg">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Registered Business Name</label>
                 <input 
                   type="text" 
                   className="w-full border rounded-lg p-2.5" 
                   value={business.businessName} 
                   onChange={e => setBusiness({...business, businessName: e.target.value})} 
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID / VAT / GST</label>
                 <input 
                   type="text" 
                   className="w-full border rounded-lg p-2.5" 
                   value={business.taxId} 
                   onChange={e => setBusiness({...business, taxId: e.target.value})} 
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Registered Address</label>
                 <textarea 
                   rows={3}
                   className="w-full border rounded-lg p-2.5" 
                   value={business.address} 
                   onChange={e => setBusiness({...business, address: e.target.value})} 
                 />
               </div>
             </div>
          )}

          {/* SOCIAL MEDIA TAB */}
          {activeTab === 'Social' && (
             <div className="space-y-4 max-w-lg">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Facebook URL</label>
                 <input 
                   type="text" 
                   placeholder="https://facebook.com/..."
                   className="w-full border rounded-lg p-2.5" 
                   value={social.facebook} 
                   onChange={e => setSocial({...social, facebook: e.target.value})} 
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Twitter / X URL</label>
                 <input 
                   type="text" 
                   placeholder="https://x.com/..."
                   className="w-full border rounded-lg p-2.5" 
                   value={social.twitter} 
                   onChange={e => setSocial({...social, twitter: e.target.value})} 
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                 <input 
                   type="text" 
                   placeholder="https://linkedin.com/company/..."
                   className="w-full border rounded-lg p-2.5" 
                   value={social.linkedin} 
                   onChange={e => setSocial({...social, linkedin: e.target.value})} 
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
                 <input 
                   type="text" 
                   placeholder="https://instagram.com/..."
                   className="w-full border rounded-lg p-2.5" 
                   value={social.instagram} 
                   onChange={e => setSocial({...social, instagram: e.target.value})} 
                 />
               </div>
             </div>
          )}

          {/* PERSONAL TAB (2FA) */}
          {activeTab === 'Personal' && (
             <div className="space-y-8 max-w-2xl">
               {/* Profile Info */}
               <div className="space-y-4 max-w-lg">
                 <h3 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">Profile Details</h3>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                   <input 
                     type="text" 
                     className="w-full border rounded-lg p-2.5" 
                     value={personal.name} 
                     onChange={e => setPersonal({...personal, name: e.target.value})} 
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                   <input 
                     type="email" 
                     className="w-full border rounded-lg p-2.5" 
                     value={personal.email} 
                     readOnly
                     disabled
                   />
                 </div>
                 <div className="pt-2">
                   <button 
                     onClick={handleSave} 
                     disabled={saving}
                     className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                   >
                     Update Profile
                   </button>
                 </div>
               </div>

               {/* 2FA Section */}
               <div className="border border-gray-200 rounded-xl overflow-hidden">
                 <div className="bg-gray-50 p-4 border-b border-gray-200">
                   <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                     <Shield size={20} className="text-indigo-600" />
                     Two-Factor Authentication (2FA)
                   </h3>
                   <p className="text-sm text-gray-500 mt-1">Add an extra layer of security to your account by requiring more than just a password to log in.</p>
                 </div>
                 <div className="p-6">
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                     <div>
                       <p className="font-medium text-gray-700">Status</p>
                       <p className={`text-sm font-semibold ${personal.twoFactorEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                         {personal.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                       </p>
                     </div>
                     {personal.twoFactorEnabled ? (
                       <button 
                         type="button"
                         onClick={disable2FA}
                         className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium w-full sm:w-auto"
                       >
                         Disable 2FA
                       </button>
                     ) : (
                       <button 
                         type="button"
                         onClick={handleEnable2FA}
                         className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium w-full sm:w-auto"
                       >
                         Enable 2FA
                       </button>
                     )}
                   </div>

                   {personal.twoFactorEnabled && (
                     <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                       <h4 className="text-sm font-semibold text-blue-800 mb-2">Recovery Codes</h4>
                       <p className="text-xs text-blue-600 mb-3">
                         Store these recovery codes safely. If you lose your device, you can use these to log in.
                       </p>
                       <div className="grid grid-cols-2 gap-2">
                         {recoveryCodes.map((code, idx) => (
                           <div key={idx} className="bg-white px-3 py-1.5 rounded border border-blue-100 text-sm font-mono text-gray-600 text-center">
                             {code}
                           </div>
                         ))}
                       </div>
                       <button className="mt-3 text-xs text-blue-700 font-medium hover:underline flex items-center gap-1">
                         <Copy size={12} /> Copy Codes
                       </button>
                     </div>
                   )}
                 </div>
               </div>
             </div>
          )}
        </div>
      </div>

      {/* 2FA Modal Flow */}
      <Modal isOpen={is2FAModalOpen} onClose={() => setIs2FAModalOpen(false)} title="Enable Two-Factor Authentication">
        <div className="p-2">
          {twoFaStep === 1 && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-200">
                  <QrCode size={160} className="text-gray-800" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Scan QR Code</h3>
                <p className="text-sm text-gray-500">
                  Open your authenticator app (Google Authenticator, Authy) and scan this code.
                </p>
              </div>
              <button 
                onClick={() => setTwoFaStep(2)}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Next Step
              </button>
            </div>
          )}

          {twoFaStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                 <h3 className="font-semibold text-gray-900">Verify Code</h3>
                 <p className="text-sm text-gray-500">Enter the 6-digit code from your authenticator app.</p>
              </div>
              <div className="flex justify-center">
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-3xl tracking-[0.5em] font-mono w-48 border-b-2 border-indigo-200 focus:border-indigo-600 outline-none py-2"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTwoFaStep(1)}
                  className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Back
                </button>
                <button 
                  onClick={verify2FA}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Verify & Enable
                </button>
              </div>
            </div>
          )}

          {twoFaStep === 3 && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <Check size={32} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">2FA Enabled!</h3>
                <p className="text-gray-500 mt-2">Your account is now more secure.</p>
              </div>
              <button 
                onClick={() => setIs2FAModalOpen(false)}
                className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
