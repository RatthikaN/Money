
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, Sparkles, Loader2, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { aiService } from '../services/aiService';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    companyName: '',
    companyAddress: '',
    city: '',
    state: '',
    zipCode: '',
    gstNumber: ''
  });

  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Size Validation
    const maxSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSize) {
      alert('File is too large. Max size is 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      
      setIsAnalyzing(true);
      try {
        const extracted = await aiService.extractBusinessDetails(base64Data, file.type);
        if (extracted) {
          setFormData(prev => ({
            ...prev,
            companyName: extracted.companyName || prev.companyName,
            companyAddress: extracted.address || prev.companyAddress,
            gstNumber: extracted.gstNumber || prev.gstNumber,
            city: extracted.city || prev.city,
            state: extracted.state || prev.state,
            zipCode: extracted.zipCode || prev.zipCode
          }));
        }
      } catch (err) {
        console.error(err);
        alert('Failed to extract details from the image.');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.auth.register({
        ...formData,
        role: 'Admin' // First user is Admin
      });
      alert('Account created successfully! Please log in.');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Side - Info */}
        <div className="bg-blue-600 p-8 text-white md:w-1/3 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center font-bold text-2xl mb-6">M</div>
            <h2 className="text-3xl font-bold mb-4">Join MoneyFlow</h2>
            <p className="text-blue-100 mb-6">Manage your business finances with ease. Automate expenses, track income, and generate reports.</p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle size={20} />
                <span>Smart AI Automation</span>
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle size={20} />
                <span>Recurring Billing</span>
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle size={20} />
                <span>Financial Reports</span>
              </div>
            </div>
          </div>
          <div className="mt-8 text-sm text-blue-200">
            © 2024 MoneyFlow Inc.
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="p-8 md:w-2/3 overflow-y-auto max-h-[90vh]">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create your account</h2>
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {/* AI Upload Section */}
          <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
             <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-lg text-indigo-600 shadow-sm">
                   <Sparkles size={24} />
                </div>
                <div className="flex-1">
                   <h3 className="font-semibold text-indigo-900">Auto-fill Business Details</h3>
                   <p className="text-xs text-indigo-700 mt-1 mb-3">Upload your GST Certificate or Business Registration photo to automatically fill in the details below.</p>
                   
                   <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors">
                      {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      <span>{isAnalyzing ? 'Analyzing...' : 'Upload Document'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                   </label>
                </div>
             </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input required type="text" name="name" className="w-full border rounded-lg p-2.5" value={formData.name} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input required type="tel" name="phoneNumber" className="w-full border rounded-lg p-2.5" value={formData.phoneNumber} onChange={handleChange} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input required type="email" name="email" className="w-full border rounded-lg p-2.5" value={formData.email} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input required type="password" name="password" className="w-full border rounded-lg p-2.5" value={formData.password} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input required type="password" name="confirmPassword" className="w-full border rounded-lg p-2.5" value={formData.confirmPassword} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2">Business Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input required type="text" name="companyName" className="w-full border rounded-lg p-2.5" value={formData.companyName} onChange={handleChange} />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">GST / Registration Number</label>
                    <input type="text" name="gstNumber" className="w-full border rounded-lg p-2.5" value={formData.gstNumber} onChange={handleChange} />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
                    <input required type="text" name="companyAddress" placeholder="Street Address" className="w-full border rounded-lg p-2.5" value={formData.companyAddress} onChange={handleChange} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input required type="text" name="city" className="w-full border rounded-lg p-2.5" value={formData.city} onChange={handleChange} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input required type="text" name="state" className="w-full border rounded-lg p-2.5" value={formData.state} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                        <input required type="text" name="zipCode" className="w-full border rounded-lg p-2.5" value={formData.zipCode} onChange={handleChange} />
                    </div>
                 </div>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all transform active:scale-95 disabled:opacity-70"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
