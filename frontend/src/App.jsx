import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DashboardView from './views/DashboardView';
import JobsView from './views/JobsView';
import ReviewView from './views/ReviewView';
import TrackerView from './views/TrackerView';
import ProfileView from './views/ProfileView';
import SettingsView from './views/SettingsView';
import { api } from './api';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Initial load
  const loadInitialData = useCallback(async () => {
    try {
      const profs = await api.getProfiles();
      setProfiles(profs);
      const current = profs[0] || null;
      setActiveProfile(current);

      if (current) {
        const [jobsData, draftsData, appsData] = await Promise.all([
          api.getJobs({ profile_id: current.id, limit: 50 }),
          api.getDrafts({ profile_id: current.id }),
          api.getApplications({ profile_id: current.id }),
        ]);
        setJobs(jobsData);
        setDrafts(draftsData);
        setApplications(appsData);
      }
    } catch (err) {
      console.error('Initial data load failed:', err);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Sync data refresh
  const handleRefresh = async () => {
    if (!activeProfile) return;
    setRefreshing(true);
    try {
      const [jobsData, draftsData, appsData] = await Promise.all([
        api.getJobs({ profile_id: activeProfile.id, limit: 50 }),
        api.getDrafts({ profile_id: activeProfile.id }),
        api.getApplications({ profile_id: activeProfile.id }),
      ]);
      setJobs(jobsData);
      setDrafts(draftsData);
      setApplications(appsData);
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Generate Draft for a specific job
  const handleSelectJobForDraft = async (job) => {
    if (!activeProfile) return;
    try {
      const res = await api.createDraftForJob(job.id, activeProfile.id);
      await handleRefresh();
      setSelectedDraftId(res.draft_id);
      setActiveTab('review');
    } catch (err) {
      alert(`Draft generation failed: ${err.message}`);
    }
  };

  // Profile update handler
  const handleProfileUpdated = (updated) => {
    setActiveProfile(updated);
    setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
    handleRefresh();
  };

  const pendingDraftsCount = drafts.filter(
    d => d.status === 'draft' || d.status === 'awaiting_approval'
  ).length;

  if (loadingInitial) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: '#fff',
        gap: 16,
      }}>
        <Loader2 size={36} className="animate-spin" color="var(--accent-primary)" />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Initializing JobPilot AI Agent Environment...</h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Verifying local database, loading candidate evidence, and querying job matches
        </span>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingDraftsCount}
        profiles={profiles}
        activeProfile={activeProfile}
        onSelectProfile={(p) => {
          setActiveProfile(p);
          handleRefresh();
        }}
      />

      <div className="main-wrapper">
        <TopBar 
          activeTab={activeTab}
          activeProfile={activeProfile}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />

        <main className="content-scrollable">
          {activeTab === 'dashboard' && (
            <DashboardView 
              profile={activeProfile}
              jobs={jobs}
              drafts={drafts}
              applications={applications}
              setActiveTab={setActiveTab}
              onRefresh={handleRefresh}
              onSelectJobForDraft={handleSelectJobForDraft}
            />
          )}

          {activeTab === 'jobs' && (
            <JobsView 
              jobs={jobs}
              profile={activeProfile}
              onSelectJobForDraft={handleSelectJobForDraft}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'review' && (
            <ReviewView 
              drafts={drafts}
              selectedDraftId={selectedDraftId}
              onRefresh={handleRefresh}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'tracker' && (
            <TrackerView 
              applications={applications}
              drafts={drafts}
              jobs={jobs}
              onRefresh={handleRefresh}
              setActiveTab={setActiveTab}
              onSelectDraft={(draftId) => {
                setSelectedDraftId(draftId);
                setActiveTab('review');
              }}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView 
              profile={activeProfile}
              onProfileUpdated={handleProfileUpdated}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>
    </div>
  );
}
