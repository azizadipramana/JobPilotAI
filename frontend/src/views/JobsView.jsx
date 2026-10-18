import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Building, 
  DollarSign, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Send, 
  Loader2, 
  Globe 
} from 'lucide-react';
import { api } from '../api';

export default function JobsView({ 
  jobs, 
  profile, 
  onSelectJobForDraft, 
  onRefresh 
}) {
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [matchDetails, setMatchDetails] = useState({});
  const [loadingMatch, setLoadingMatch] = useState({});
  const [generatingDraft, setGeneratingDraft] = useState({});

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const textMatch = 
      !search || 
      job.title.toLowerCase().includes(search.toLowerCase()) || 
      (job.company && job.company.toLowerCase().includes(search.toLowerCase())) ||
      (job.description && job.description.toLowerCase().includes(search.toLowerCase()));

    const countryMatch = 
      !selectedCountry || 
      (job.country && job.country.toLowerCase() === selectedCountry.toLowerCase());

    const typeMatch = 
      !selectedType || 
      (job.employment_type && job.employment_type.toLowerCase() === selectedType.toLowerCase());

    const scoreMatch = (job.match_score || 0) >= minScore;

    return textMatch && countryMatch && typeMatch && scoreMatch;
  });

  const toggleExpand = async (jobId) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      return;
    }

    setExpandedJobId(jobId);
    if (!matchDetails[jobId] && profile) {
      setLoadingMatch(prev => ({ ...prev, [jobId]: true }));
      try {
        const details = await api.getJobMatch(jobId, profile.id);
        setMatchDetails(prev => ({ ...prev, [jobId]: details }));
      } catch (e) {
        console.error('Failed to load match details', e);
      } finally {
        setLoadingMatch(prev => ({ ...prev, [jobId]: false }));
      }
    }
  };

  const handleGenerateDraft = async (job) => {
    if (!profile) return;
    setGeneratingDraft(prev => ({ ...prev, [job.id]: true }));
    try {
      await onSelectJobForDraft(job);
    } finally {
      setGeneratingDraft(prev => ({ ...prev, [job.id]: false }));
    }
  };

  const getScoreBadgeClass = (score) => {
    if (score >= 0.75) return 'badge-emerald';
    if (score >= 0.5) return 'badge-amber';
    return 'badge-rose';
  };

  return (
    <div>
      {/* Header and Filter Controls */}
      <div className="glass-card" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 14 }}>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search 
              size={18} 
              color="var(--text-muted)" 
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} 
            />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search title, tech stack, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>

          {/* Country filter */}
          <div>
            <select 
              className="select-field"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              <option value="">All Countries</option>
              <option value="id">🇮🇩 Indonesia (ID)</option>
              <option value="sg">🇸🇬 Singapore (SG)</option>
              <option value="my">🇲🇾 Malaysia (MY)</option>
              <option value="us">🇺🇸 United States (US)</option>
              <option value="gb">🇬🇧 United Kingdom (GB)</option>
            </select>
          </div>

          {/* Employment Type */}
          <div>
            <select 
              className="select-field"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Job Types</option>
              <option value="full_time">Full-Time</option>
              <option value="internship">Internship (Magang)</option>
              <option value="contract">Contract</option>
              <option value="part_time">Part-Time</option>
            </select>
          </div>

          {/* Min Score filter */}
          <div>
            <select 
              className="select-field"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
            >
              <option value="0">Any Match Score</option>
              <option value="0.5">Score &ge; 50%</option>
              <option value="0.7">Score &ge; 70% (High)</option>
              <option value="0.85">Score &ge; 85% (Top)</option>
            </select>
          </div>
        </div>

        {/* Quick summary counts */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span>Showing <strong>{filteredJobs.length}</strong> of {jobs.length} discovered opportunities</span>
          <span>Matching evaluation for: <strong style={{ color: '#fff' }}>{profile?.full_name}</strong></span>
        </div>
      </div>

      {/* Jobs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredJobs.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <Search size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No jobs found matching your filters</h4>
            <p style={{ fontSize: '0.82rem', marginTop: 4 }}>Try clearing the search query or launching the discovery agent from the Dashboard.</p>
          </div>
        ) : (
          filteredJobs.map(job => {
            const isExpanded = expandedJobId === job.id;
            const scorePercent = Math.round((job.match_score || 0) * 100);
            const isGenerating = generatingDraft[job.id];
            const details = matchDetails[job.id];

            return (
              <div 
                key={job.id} 
                className="glass-card"
                style={{
                  padding: 20,
                  borderColor: isExpanded ? 'rgba(99, 102, 241, 0.4)' : undefined,
                }}
              >
                {/* Main Card Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: '#fff' }}>
                        {job.title}
                      </h3>
                      {job.match_score !== undefined && job.match_score !== null && (
                        <span className={`badge ${getScoreBadgeClass(job.match_score)}`}>
                          <Sparkles size={12} />
                          {scorePercent}% Compatibility
                        </span>
                      )}
                      <span className="badge badge-indigo" style={{ textTransform: 'capitalize' }}>
                        {job.employment_type?.replace('_', ' ') || 'Full Time'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: '0.82rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontWeight: 500 }}>
                        <Building size={14} color="var(--accent-primary)" />
                        {job.company || 'Confidential'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <MapPin size={14} color="var(--text-muted)" />
                        {job.location || 'Location not specified'} ({job.country || 'ID'})
                      </span>
                      {(job.salary_min || job.salary_max) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent-emerald)', fontWeight: 600 }}>
                          <DollarSign size={14} />
                          {job.salary_currency || 'IDR'} {job.salary_min ? (job.salary_min / 1000000).toFixed(1) + 'M' : '0'} - {job.salary_max ? (job.salary_max / 1000000).toFixed(1) + 'M' : ''}
                        </span>
                      )}
                      <span style={{ color: 'var(--text-muted)' }}>
                        Source: {job.source?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button 
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                      onClick={() => toggleExpand(job.id)}
                    >
                      {isExpanded ? (
                        <>Hide Details <ChevronUp size={14} /></>
                      ) : (
                        <>View Match Analysis <ChevronDown size={14} /></>
                      )}
                    </button>

                    <button 
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                      disabled={isGenerating}
                      onClick={() => handleGenerateDraft(job)}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Tailoring CV & Email...
                        </>
                      ) : (
                        <>
                          <FileText size={14} />
                          Tailor CV & Draft Email
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Job Description Excerpt */}
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.5 }}>
                  {job.description?.slice(0, 220)}...
                </p>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border-subtle)' }}>
                    {loadingMatch[job.id] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                        <Loader2 size={16} className="animate-spin" />
                        Fetching AI match breakdown...
                      </div>
                    ) : details ? (
                      <div>
                        {/* Score Breakdown Bars */}
                        <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 12, color: '#c7d2fe' }}>
                          Compatibility Breakdown Score
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 18 }}>
                          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Skills Match</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>
                              {Math.round((details.skill_score || 0) * 100)}%
                            </div>
                          </div>
                          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Location Fit</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>
                              {Math.round((details.location_score || 0) * 100)}%
                            </div>
                          </div>
                          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Keywords</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>
                              {Math.round((details.keyword_score || 0) * 100)}%
                            </div>
                          </div>
                          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Experience Weight</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>
                              {Math.round((details.experience_score || 0) * 100)}%
                            </div>
                          </div>
                        </div>

                        {/* Matched Skills & Missing Requirements */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                          <div>
                            <span className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-emerald)' }}>
                              <CheckCircle size={14} /> Matched Skills Verified in Profile
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                              {details.matched_skills && details.matched_skills.length > 0 ? (
                                details.matched_skills.map((skill, i) => (
                                  <span key={i} className="badge badge-emerald">
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No direct skill keyword overlap detected</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-amber)' }}>
                              <AlertTriangle size={14} /> Gaps / Requirements Attention
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                              {details.missing_requirements && details.missing_requirements.length > 0 ? (
                                details.missing_requirements.map((req, i) => (
                                  <span key={i} className="badge badge-amber">
                                    {req}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)' }}>All core educational & experience criteria satisfied</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* AI Semantic Evaluation */}
                        {details.llm_analysis && (
                          <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: 14, borderRadius: 8 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Sparkles size={12} /> Local AI Career Advisor Evaluation
                            </div>
                            <p style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                              {details.llm_analysis}
                            </p>
                          </div>
                        )}

                        {/* Full Description & Requirements */}
                        <div style={{ marginTop: 16 }}>
                          <span className="label">Full Vacancy Description & Details</span>
                          <div style={{ 
                            background: 'rgba(0, 0, 0, 0.3)', 
                            border: '1px solid var(--border-subtle)', 
                            borderRadius: 8, 
                            padding: 14, 
                            fontSize: '0.8rem', 
                            color: 'var(--text-secondary)',
                            whiteSpace: 'pre-line',
                            maxHeight: 220,
                            overflowY: 'auto'
                          }}>
                            {job.description}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{job.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
