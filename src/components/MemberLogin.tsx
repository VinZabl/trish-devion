import React, { useState } from 'react';
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useMemberAuth } from '../hooks/useMemberAuth';

interface MemberLoginProps {
  onBack: () => void;
  onLoginSuccess: (memberId: string) => void;
}

const MemberLogin: React.FC<MemberLoginProps> = ({ onBack, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, currentMember } = useMemberAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const result = await login({
          email: formData.email,
          password: formData.password
        });

        if (result.success && result.member) {
          // State is updated synchronously, so we can call this immediately
          onLoginSuccess(result.member.id);
        } else {
          setError(result.error || 'Login failed');
        }
      } else {
        // Registration
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        const result = await register({
          username: formData.username,
          email: formData.email,
          password: formData.password
        });

        if (result.success && result.member) {
          // State is updated synchronously, so we can call this immediately
          onLoginSuccess(result.member.id);
        } else {
          setError(result.error || 'Registration failed');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  return (
    <div className="min-h-screen bg-cafe-darkBg bg-logo-overlay flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="mb-6 flex items-center text-cafe-text hover:text-cafe-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>

        <div className="glass-card rounded-xl p-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-cafe-primary to-cafe-secondary rounded-full mb-4">
              <User className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-cafe-text mb-2">
              {isLogin ? 'Member Login' : 'Member Registration'}
            </h2>
            <p className="text-cafe-textMuted">
              {isLogin ? 'Welcome back!' : 'Create your account'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 glass-strong border border-red-500/30 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-cafe-text mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cafe-text/50" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 glass border border-cafe-primary/30 rounded-lg text-cafe-text placeholder-cafe-textMuted focus:outline-none focus:ring-2 focus:ring-cafe-primary focus:border-cafe-primary"
                    placeholder="Enter username"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-cafe-text mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cafe-text/50" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 glass border border-cafe-primary/30 rounded-lg text-cafe-text placeholder-cafe-textMuted focus:outline-none focus:ring-2 focus:ring-cafe-primary focus:border-cafe-primary"
                    placeholder="Enter email"
                    required
                  />
              </div>
            </div>


            <div>
              <label className="block text-sm font-medium text-cafe-text mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cafe-text/50" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full pl-10 pr-12 py-3 glass border border-cafe-primary/30 rounded-lg text-cafe-text placeholder-cafe-textMuted focus:outline-none focus:ring-2 focus:ring-cafe-primary focus:border-cafe-primary"
                    placeholder="Enter password"
                    required
                  />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cafe-text/50 hover:text-cafe-text"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-cafe-text mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cafe-text/50" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 glass border border-cafe-primary/30 rounded-lg text-cafe-text placeholder-cafe-textMuted focus:outline-none focus:ring-2 focus:ring-cafe-primary focus:border-cafe-primary"
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cafe-primary to-cafe-secondary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({
                  username: '',
                  email: '',
                  password: '',
                  confirmPassword: ''
                });
              }}
              className="text-cafe-primary hover:text-cafe-secondary transition-colors text-sm"
            >
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberLogin;
