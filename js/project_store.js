window.App = window.App || {};

App.ProjectStore = (() => {
  'use strict';

  async function ensureMigrated() {
    await App.DB.open();
    return App.DB.migrateDraftsToProjects();
  }

  function buildProjectFromWorkspace(workspace, metadata = {}, existing = null) {
    const now = new Date().toISOString();
    const version = (existing?.version || 0) + 1;
    const snapshots = Array.isArray(existing?.snapshots) ? [...existing.snapshots] : [];
    snapshots.push({
      version,
      capturedAt: now,
      workspace: workspace ? JSON.parse(JSON.stringify(workspace)) : null
    });
    return {
      projectId: existing?.projectId || `project_${Date.now()}`,
      title: metadata.title || existing?.title || 'Untitled Project',
      status: metadata.status || existing?.status || workspace?.workflow?.state || 'draft',
      owner: metadata.owner || existing?.owner || '',
      metadata: {
        issueDate: metadata.issueDate || existing?.metadata?.issueDate || '',
        campaignName: metadata.campaignName || existing?.metadata?.campaignName || '',
        audience: metadata.audience || existing?.metadata?.audience || ''
      },
      languageVariants: workspace?.variants || existing?.languageVariants || {},
      workflow: workspace?.workflow || existing?.workflow || null,
      version,
      snapshots,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
  }

  async function saveFromWorkspace(workspace, metadata = {}, projectId = null) {
    await ensureMigrated();
    const existing = projectId ? await App.DB.getProjectById(projectId) : null;
    const project = buildProjectFromWorkspace(workspace, metadata, existing);
    if (projectId) project.projectId = projectId;
    return App.DB.saveProject(project);
  }

  async function list() {
    await ensureMigrated();
    return App.DB.getAllProjects();
  }

  async function get(projectId) {
    await ensureMigrated();
    return App.DB.getProjectById(projectId);
  }

  async function remove(projectId) {
    await ensureMigrated();
    return App.DB.deleteProject(projectId);
  }

  return { ensureMigrated, buildProjectFromWorkspace, saveFromWorkspace, list, get, remove };
})();
