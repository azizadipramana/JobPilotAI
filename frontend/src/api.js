const BASE_URL = '/api/v1';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

export const api = {
  // System & Health
  getHealth: () => request('/health'),
  getLLMStatus: () => request('/llm/ping'),

  // Profiles
  getProfiles: () => request('/profiles'),
  getProfile: (id) => request(`/profiles/${id}`),
  createProfile: (data) => request('/profiles', { method: 'POST', body: JSON.stringify(data) }),
  updateProfile: (id, data) => request(`/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Jobs & Discovery
  getJobs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.country) query.append('country', params.country);
    if (params.employment_type) query.append('employment_type', params.employment_type);
    if (params.keyword) query.append('keyword', params.keyword);
    if (params.profile_id) query.append('profile_id', params.profile_id);
    if (params.skip !== undefined) query.append('skip', params.skip);
    if (params.limit !== undefined) query.append('limit', params.limit);
    return request(`/jobs?${query.toString()}`);
  },
  getJob: (id) => request(`/jobs/${id}`),
  getJobMatch: (jobId, profileId) => request(`/jobs/${jobId}/match?profile_id=${profileId}`),

  // Workflows
  startWorkflow: (data) => request('/workflows', { method: 'POST', body: JSON.stringify(data) }),
  getWorkflow: (id) => request(`/workflows/${id}`),
  listWorkflows: (profileId) => request(`/workflows${profileId ? `?profile_id=${profileId}` : ''}`),

  // Application Drafts (CV + Email)
  createDraftForJob: (jobId, profileId) =>
    request(`/jobs/${jobId}/drafts`, {
      method: 'POST',
      body: JSON.stringify({ profile_id: profileId }),
    }),
  getDrafts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.profile_id) query.append('profile_id', params.profile_id);
    if (params.job_id) query.append('job_id', params.job_id);
    if (params.status) query.append('status', params.status);
    return request(`/drafts?${query.toString()}`);
  },
  getDraft: (id) => request(`/drafts/${id}`),
  updateDraft: (id, data) =>
    request(`/drafts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  approveDraft: (id, contentHash, notes = '') =>
    request(`/drafts/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ content_hash: contentHash, notes }),
    }),
  rejectDraft: (id, contentHash, notes = '') =>
    request(`/drafts/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ content_hash: contentHash, notes }),
    }),
  getCVDownloadUrl: (id) => `${BASE_URL}/drafts/${id}/cv`,

  // Applications
  getApplications: (params = {}) => {
    const query = new URLSearchParams();
    if (params.profile_id) query.append('profile_id', params.profile_id);
    if (params.status) query.append('status', params.status);
    return request(`/applications?${query.toString()}`);
  },
  sendApplication: (id) =>
    request(`/applications/${id}/send`, { method: 'POST' }),
};
