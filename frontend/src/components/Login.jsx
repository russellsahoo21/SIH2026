import React, { useState } from 'react';
import { api, setAuth } from '../services/api';
import { Lock, User, RefreshCw, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('officer.rb1');
  const [password, setPassword] = useState('Demo@123');
  const [role, setRole] = useState('OFFICER');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('7K4P9');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
  };

  const handleRolePreset = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'OFFICER') setUsername('officer.rb1');
    else if (selectedRole === 'HEAD') setUsername('head.rb');
    else if (selectedRole === 'COORDINATOR') setUsername('coordinator');
    else if (selectedRole === 'MANAGEMENT') setUsername('management');
    else if (selectedRole === 'ADMIN') setUsername('admin');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setError('Invalid security captcha code. Please try again.');
      generateCaptcha();
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(username, password);
      setAuth(res.data.token, res.data.user);
      onLoginSuccess(res.data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 120px)',
      background: 'linear-gradient(135deg, #0A2540 0%, #0F3E6D 50%, #15528E 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative India Map / Tech watermark background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `radial-gradient(circle at 20% 40%, rgba(255, 153, 51, 0.15) 0%, transparent 40%),
                          radial-gradient(circle at 80% 80%, rgba(19, 136, 8, 0.15) 0%, transparent 40%)`,
        pointerEvents: 'none'
      }} />

      <div style={{
        maxWidth: '1060px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        zIndex: 1
      }}>
        {/* Left Side: National Portal Presentation Banner (Mockup 2) */}
        <div style={{
          padding: '44px 40px',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid rgba(255,255,255,0.12)',
          position: 'relative'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 153, 51, 0.2)',
              border: '1px solid #FF9933',
              color: '#FFB870',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '20px'
            }}>
              <ShieldCheck size={14} /> Official Government of India Portal
            </div>

            <h2 style={{
              fontSize: '32px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              lineHeight: 1.25,
              borderLeft: '4px solid #FF9933',
              paddingLeft: '16px',
              marginBottom: '18px'
            }}>
              Integrated Complaint Monitoring Dashboard
            </h2>

            <p style={{
              fontSize: '15px',
              color: '#E2E8F0',
              lineHeight: 1.6,
              maxWidth: '460px',
              marginBottom: '32px'
            }}>
              A digital platform for time-bound, transparent, and accountable grievance redressal across AICTE bureaus, cells, and regional offices.
            </p>
          </div>

          {/* Quick Demo Credentials Card */}
          <div style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '16px 20px',
            fontSize: '12.5px'
          }}>
            <div style={{ fontWeight: 700, color: '#FFB870', marginBottom: '8px' }}>
              ⚡ Demo Roles & Fast-Fill
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['OFFICER', 'HEAD', 'COORDINATOR', 'MANAGEMENT', 'ADMIN'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRolePreset(r)}
                  style={{
                    background: role === r ? '#E65100' : 'rgba(255,255,255,0.12)',
                    color: 'white',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <div style={{ color: '#94A3B8', marginTop: '10px', fontSize: '11px' }}>
              Standard password for all demo accounts: <strong>Demo@123</strong>
            </div>
          </div>
        </div>

        {/* Right Side: Officer Login Form (Matching Slide 2) */}
        <div style={{
          background: '#FFFFFF',
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '22px',
              fontFamily: 'var(--font-heading)',
              color: '#0A3663',
              fontWeight: 700,
              position: 'relative',
              display: 'inline-block'
            }}>
              Officer Login
              <span style={{
                position: 'absolute',
                bottom: '-4px',
                left: 0,
                width: '40px',
                height: '3px',
                background: '#E65100'
              }} />
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '8px' }}>
              Enter your credentials to access the internal redressal portal
            </p>
          </div>

          {error && (
            <div style={{
              background: '#FFEBEE',
              color: '#C62828',
              padding: '10px 14px',
              borderRadius: '4px',
              fontSize: '13px',
              marginBottom: '18px',
              borderLeft: '4px solid #C62828'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Username / Officer ID
              </label>
              <div className="input-with-icon">
                <User size={16} />
                <input
                  type="text"
                  required
                  className="gov-input"
                  placeholder="Enter Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Password
              </label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="gov-input"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748B'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Designated Role
              </label>
              <select
                className="gov-select"
                value={role}
                onChange={(e) => handleRolePreset(e.target.value)}
              >
                <option value="OFFICER">Bureau Officer (OFFICER)</option>
                <option value="HEAD">Bureau Head (HEAD)</option>
                <option value="COORDINATOR">Case Coordinator (COORDINATOR)</option>
                <option value="MANAGEMENT">Senior Management (MANAGEMENT)</option>
                <option value="ADMIN">System Administrator (ADMIN)</option>
              </select>
            </div>

            {/* Visual Gov Security Captcha Box */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Security Verification
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{
                  background: 'repeating-linear-gradient(45deg, #F1F5F9, #F1F5F9 10px, #E2E8F0 10px, #E2E8F0 20px)',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  padding: '6px 14px',
                  fontFamily: 'monospace',
                  fontSize: '18px',
                  fontWeight: '700',
                  letterSpacing: '5px',
                  color: '#1E293B',
                  userSelect: 'none',
                  textDecoration: 'line-through'
                }}>
                  {captchaCode}
                </div>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="gov-btn gov-btn-secondary"
                  style={{ padding: '8px 10px' }}
                  title="Refresh Captcha"
                >
                  <RefreshCw size={14} />
                </button>
                <input
                  type="text"
                  required
                  placeholder="Enter Captcha"
                  className="gov-input"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="gov-btn gov-btn-primary"
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 700
              }}
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Please contact AICTE IT Helpdesk at helpdesk@aicte-india.org to reset password.'); }} style={{ fontSize: '12px', color: '#0A3663', textDecoration: 'none', fontWeight: 600 }}>
                Forgot Password?
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
