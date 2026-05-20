import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import toast from 'react-hot-toast';

function ProjectModal({ onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || { name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{initial ? 'Edit Project' : 'New Project'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    projectsAPI.list().then((res) => setProjects(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (form) => {
    const res = await projectsAPI.create(form);
    toast.success('Project created!');
    setProjects((prev) => [{ ...res.data, myRole: 'ADMIN' }, ...prev]);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700">No projects yet</h3>
          <p className="text-gray-400 mt-1">Create your first project to get started.</p>
          <button className="btn-primary mt-4" onClick={() => setShowModal(true)}>Create Project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="card hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                  {project.name[0].toUpperCase()}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${project.myRole === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                  {project.myRole}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
              )}
              <div className="flex gap-4 mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400">
                <span>{project._count?.members ?? 0} members</span>
                <span>{project._count?.tasks ?? 0} tasks</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <ProjectModal
          onClose={() => setShowModal(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}
