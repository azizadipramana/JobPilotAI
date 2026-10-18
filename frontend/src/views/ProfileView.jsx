import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Briefcase, 
  GraduationCap, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  Sparkles, 
  DollarSign, 
  Loader2 
} from 'lucide-react';
import { api } from '../api';

export default function ProfileView({ profile, onProfileUpdated }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    professional_summary: '',
    skills: [],
    education: [],
    experience: [],
    projects: [],
    preferred_locations: [],
    preferred_countries: [],
    preferred_employment_types: [],
    preferred_keywords: [],
    min_salary: 8000000,
    max_salary: 20000000,
  });

  const [newSkill, setNewSkill] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
        linkedin_url: profile.linkedin_url || '',
        github_url: profile.github_url || '',
        portfolio_url: profile.portfolio_url || '',
        professional_summary: profile.professional_summary || '',
        skills: profile.skills || [],
        education: profile.education || [],
        experience: profile.experience || [],
        projects: profile.projects || [],
        preferred_locations: profile.preferred_locations || [],
        preferred_countries: profile.preferred_countries || ['id'],
        preferred_employment_types: profile.preferred_employment_types || ['full_time'],
        preferred_keywords: profile.preferred_keywords || [],
        min_salary: profile.min_salary || 5000000,
        max_salary: profile.max_salary || 15000000,
      });
    }
  }, [profile]);

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    if (!formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove),
    }));
  };

  const handleAddKeyword = (e) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    if (!formData.preferred_keywords.includes(newKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        preferred_keywords: [...prev.preferred_keywords, newKeyword.trim().toLowerCase()],
      }));
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kwToRemove) => {
    setFormData(prev => ({
      ...prev,
      preferred_keywords: prev.preferred_keywords.filter(k => k !== kwToRemove),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await api.updateProfile(profile.id, formData);
      setSaveMessage({ type: 'success', text: 'Candidate profile updated successfully!' });
      onProfileUpdated(updated);
    } catch (err) {
      setSaveMessage({ type: 'error', text: `Failed to save profile: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="glass-card" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} color="var(--accent-primary)" />
              Candidate Profile & Qualification Evidence
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              This profile serves as the factual ground truth for the Matching and CV Tailoring agents. JobPilot AI will never fabricate qualifications outside of this data.
            </p>
          </div>

          <button 
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ fontSize: '0.86rem', padding: '9px 20px' }}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving Profile...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Profile Changes
              </>
            )}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 8,
          marginBottom: 20,
          fontSize: '0.84rem',
          fontWeight: 500,
          background: saveMessage.type === 'error' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: saveMessage.type === 'error' ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
          color: saveMessage.type === 'error' ? 'var(--accent-rose)' : 'var(--accent-emerald)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <CheckCircle size={16} />
          <span>{saveMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Basic Personal Info */}
        <div className="glass-card">
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, marginBottom: 16, color: '#c7d2fe' }}>
            Personal & Contact Information
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <label className="label">Full Legal / Professional Name</label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Email Address</label>
              <input 
                type="email" 
                className="input-field" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Phone / WhatsApp</label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Location / City</label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 16 }}>
            <div>
              <label className="label">LinkedIn Profile URL</label>
              <input 
                type="url" 
                className="input-field" 
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              />
            </div>
            <div>
              <label className="label">GitHub Profile URL</label>
              <input 
                type="url" 
                className="input-field" 
                value={formData.github_url}
                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Portfolio Website URL</label>
              <input 
                type="url" 
                className="input-field" 
                value={formData.portfolio_url}
                onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="label">Professional Bio / Summary</label>
            <textarea 
              className="textarea-field"
              rows={4}
              value={formData.professional_summary}
              onChange={(e) => setFormData({ ...formData, professional_summary: e.target.value })}
              placeholder="Describe your background, core specialties, and career objectives..."
            />
          </div>
        </div>

        {/* Skills Tag Cloud & Adder */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#c7d2fe' }}>
                Skills & Technical Competencies ({formData.skills.length})
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                These are mapped against discovered job requirements during suitability evaluation.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input 
              type="text"
              className="input-field"
              placeholder="Add skill (e.g. Docker, PyTorch, GraphQL, Next.js)..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSkill(e)}
              style={{ maxWidth: 360 }}
            />
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleAddSkill}
            >
              <Plus size={16} /> Add Skill
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {formData.skills.map(skill => (
              <span 
                key={skill} 
                className="badge badge-indigo"
                style={{ fontSize: '0.82rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span>{skill}</span>
                <span 
                  onClick={() => handleRemoveSkill(skill)}
                  style={{ cursor: 'pointer', opacity: 0.7, padding: '0 2px' }}
                  title="Remove"
                >
                  &times;
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Job Preferences & Salary Expectations */}
        <div className="glass-card">
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, marginBottom: 16, color: '#c7d2fe' }}>
            Job Search & Matching Criteria
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <label className="label">Preferred Keywords</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input 
                  type="text"
                  className="input-field"
                  placeholder="e.g. backend, full stack, python"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword(e)}
                />
                <button type="button" className="btn btn-secondary" onClick={handleAddKeyword}>
                  <Plus size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {formData.preferred_keywords.map(kw => (
                  <span key={kw} className="badge badge-emerald" style={{ fontSize: '0.74rem' }}>
                    {kw}
                    <span 
                      onClick={() => handleRemoveKeyword(kw)} 
                      style={{ cursor: 'pointer', marginLeft: 4 }}
                    >
                      &times;
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Monthly Salary Range (IDR)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input 
                  type="number" 
                  step="500000"
                  className="input-field" 
                  value={formData.min_salary}
                  onChange={(e) => setFormData({ ...formData, min_salary: Number(e.target.value) })}
                  placeholder="Min"
                />
                <span style={{ color: 'var(--text-muted)' }}>-</span>
                <input 
                  type="number" 
                  step="500000"
                  className="input-field" 
                  value={formData.max_salary}
                  onChange={(e) => setFormData({ ...formData, max_salary: Number(e.target.value) })}
                  placeholder="Max"
                />
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                {(formData.min_salary / 1000000).toFixed(1)}M - {(formData.max_salary / 1000000).toFixed(1)}M IDR / month
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
