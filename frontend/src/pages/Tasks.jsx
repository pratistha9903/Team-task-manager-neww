import { useState, useEffect } from 'react';
import { tasksAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const StatusBadge = ({ status }) => {
  const map = { TODO: 'badge-todo', IN_PROGRESS: 'badge-in-progress', DONE: 'badge-done' };
  const labels = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
  return <span className={map[status]}>{labels[status] || status}</span>;
};
const PriorityBadge = ({ priority }) => {
  const map = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high' };
  return <span className={map[priority]}>{priority}</span>;
};

function QuickStatusUpdate({ task, onUpdated }) {
  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    setLoading(true);
    try {
      const res = await tasksAPI.update(task.id, { status: e.target.value });
      toast.success('Status updated');
      onUpdated(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
      value={task.status}
      onChange={handleChange}
      disabled={loading}
    >
      <option value="TODO">To Do</option>
      <option value="IN_PROGRESS">In Progress</option>
      <option value="DONE">Done</option>
    </select>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', mine: false });

  const load = () => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.mine) params.assigneeId = user.id;
    tasksAPI.list(params).then((res) => setTasks(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters]);

  const handleUpdated = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    await tasksAPI.delete(taskId);
    toast.success('Task deleted');
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <p className="text-gray-500 mt-1">{tasks.length} task{tasks.length !== 1 ? 's' : ''} across all your projects</p>
      </div>

      {/* Filters */}
      <div className="card py-4 flex flex-wrap gap-3 items-center">
        <span className="text-sm font-medium text-gray-600">Filter:</span>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={filters.mine} onChange={(e) => setFilters({ ...filters, mine: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          Assigned to me
        </label>

        <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>

        <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>

        {(filters.status || filters.priority || filters.mine) && (
          <button onClick={() => setFilters({ status: '', priority: '', mine: false })} className="text-sm text-blue-600 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-400">No tasks match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <PriorityBadge priority={task.priority} />
                    {task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && (
                      <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">Overdue</span>
                    )}
                  </div>
                  {task.description && <p className="text-sm text-gray-500 line-clamp-1 mb-2">{task.description}</p>}
                  <div className="flex gap-3 text-xs text-gray-400 flex-wrap">
                    <Link to={`/projects/${task.project?.id}`} className="text-blue-500 hover:underline">
                      {task.project?.name}
                    </Link>
                    <span>Assignee: <span className="font-medium text-gray-600">{task.assignee?.name || 'Unassigned'}</span></span>
                    {task.dueDate && <span>Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end flex-shrink-0">
                  <StatusBadge status={task.status} />
                  {(task.assigneeId === user.id || task.creatorId === user.id) && (
                    <QuickStatusUpdate task={task} onUpdated={handleUpdated} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
