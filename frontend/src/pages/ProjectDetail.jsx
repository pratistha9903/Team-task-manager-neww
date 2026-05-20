import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectsAPI, tasksAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const StatusBadge = ({ status }) => {
  const map = { TODO: 'badge-todo', IN_PROGRESS: 'badge-in-progress', DONE: 'badge-done' };
  const labels = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
  return <span className={map[status]}>{labels[status] || status}</span>;
};
const PriorityBadge = ({ priority }) => {
  const map = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high' };
  return <span className={map[priority]}>{priority}</span>;
};

function TaskModal({ project, task, onClose, onSave }) {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(
    task
      ? { title: task.title, description: task.description || '', status: task.status, priority: task.priority, dueDate: task.dueDate ? task.dueDate.split('T')[0] : '', assigneeId: task.assignee?.id || '' }
      : { title: '', description: '', status: 'TODO', priority: 'MEDIUM', dueDate: '', assigneeId: '' }
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMembers(project.members || []);
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, assigneeId: form.assigneeId || null });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{task ? 'Edit Task' : 'New Task'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
              <select className="input" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.user?.name}</option>
                ))}
              </select>
            </div>
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

function AddMemberModal({ projectId, onClose, onAdd }) {
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [role, setRole] = useState('MEMBER');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    usersAPI.list().then((res) => setAllUsers(res.data));
  }, []);

  const filtered = allUsers.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await onAdd(selected.id, role);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Member</h2>
        <input className="input mb-3" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg mb-3">
          {filtered.map((u) => (
            <button key={u.id} onClick={() => setSelected(u)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left ${selected?.id === u.id ? 'bg-blue-50' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {u.name[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{u.name}</p>
                <p className="text-xs text-gray-400">{u.email}</p>
              </div>
              {selected?.id === u.id && <span className="ml-auto text-blue-600 text-xs">Selected</span>}
            </button>
          ))}
          {filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No users found</p>}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleAdd} disabled={!selected || saving}>
            {saving ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tasks');
  const [taskModal, setTaskModal] = useState(null);
  const [memberModal, setMemberModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(() => {
    projectsAPI.get(parseInt(id)).then((res) => setProject(res.data)).catch(() => navigate('/projects')).finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const isAdmin = project?.myRole === 'ADMIN';

  const handleCreateTask = async (form) => {
    const res = await tasksAPI.create({ ...form, projectId: parseInt(id) });
    toast.success('Task created!');
    setProject((p) => ({ ...p, tasks: [res.data, ...p.tasks] }));
  };

  const handleUpdateTask = async (taskId, form) => {
    const res = await tasksAPI.update(taskId, form);
    toast.success('Task updated!');
    setProject((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === taskId ? res.data : t)) }));
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    await tasksAPI.delete(taskId);
    toast.success('Task deleted');
    setProject((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }));
  };

  const handleAddMember = async (userId, role) => {
    const res = await projectsAPI.addMember(parseInt(id), { userId, role });
    toast.success('Member added!');
    load();
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    await projectsAPI.removeMember(parseInt(id), userId);
    toast.success('Member removed');
    load();
  };

  const handleDeleteProject = async () => {
    if (!confirm('Delete this project? This will remove all tasks too.')) return;
    await projectsAPI.delete(parseInt(id));
    toast.success('Project deleted');
    navigate('/projects');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  const filteredTasks = (project?.tasks || []).filter((t) => !statusFilter || t.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link to="/projects" className="hover:text-blue-600">Projects</Link>
            <span>/</span>
            <span className="text-gray-700">{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && <p className="text-gray-500 mt-1">{project.description}</p>}
        </div>
        {isAdmin && (
          <button onClick={handleDeleteProject} className="btn-danger text-sm">Delete Project</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {['tasks', 'members'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
            {t} {t === 'tasks' ? `(${project.tasks?.length || 0})` : `(${project.members?.length || 0})`}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2">
              {['', 'TODO', 'IN_PROGRESS', 'DONE'].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                  {s === '' ? 'All' : s === 'IN_PROGRESS' ? 'In Progress' : s === 'TODO' ? 'To Do' : 'Done'}
                </button>
              ))}
            </div>
            <button className="btn-primary text-sm" onClick={() => setTaskModal('new')}>+ Add Task</button>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-400">No tasks found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div key={task.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                      </div>
                      {task.description && <p className="text-sm text-gray-500 line-clamp-2">{task.description}</p>}
                      <div className="flex gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                        <span>Assignee: <span className="font-medium text-gray-600">{task.assignee?.name || 'Unassigned'}</span></span>
                        {task.dueDate && (
                          <span className={new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-500 font-medium' : ''}>
                            Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </span>
                        )}
                        <span>By: {task.creator?.name}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {(isAdmin || task.assigneeId === user.id || task.creatorId === user.id) && (
                        <button onClick={() => setTaskModal(task)} className="text-xs btn-secondary py-1 px-2">Edit</button>
                      )}
                      {(isAdmin || task.creatorId === user.id) && (
                        <button onClick={() => handleDeleteTask(task.id)} className="text-xs btn-danger py-1 px-2">Delete</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {isAdmin && (
              <button className="btn-primary text-sm" onClick={() => setMemberModal(true)}>+ Add Member</button>
            )}
          </div>
          <div className="space-y-3">
            {project.members?.map((m) => (
              <div key={m.id} className="card flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {m.user?.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{m.user?.name}</p>
                  <p className="text-sm text-gray-400">{m.user?.email}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                  {m.role}
                </span>
                {isAdmin && m.userId !== project.ownerId && m.userId !== user.id && (
                  <button onClick={() => handleRemoveMember(m.userId)} className="text-xs text-red-600 hover:underline">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {taskModal === 'new' && (
        <TaskModal project={project} onClose={() => setTaskModal(null)} onSave={handleCreateTask} />
      )}
      {taskModal && taskModal !== 'new' && (
        <TaskModal project={project} task={taskModal} onClose={() => setTaskModal(null)}
          onSave={(form) => handleUpdateTask(taskModal.id, form)} />
      )}
      {memberModal && (
        <AddMemberModal projectId={parseInt(id)} onClose={() => setMemberModal(false)} onAdd={handleAddMember} />
      )}
    </div>
  );
}
