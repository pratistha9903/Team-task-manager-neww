import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tasksAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { format, isPast } from 'date-fns';

const StatusBadge = ({ status }) => {
  const map = { TODO: 'badge-todo', IN_PROGRESS: 'badge-in-progress', DONE: 'badge-done' };
  const labels = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
  return <span className={map[status]}>{labels[status] || status}</span>;
};

const PriorityBadge = ({ priority }) => {
  const map = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high' };
  return <span className={map[priority]}>{priority}</span>;
};

const StatCard = ({ label, value, color, icon }) => (
  <div className="card">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
        {icon}
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksAPI.dashboard().then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  const { stats, overdueTasks, recentTasks } = data || {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good {getGreeting()}, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-gray-500 mt-1">Here's what's happening in your workspace.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={stats?.totalProjects ?? 0} color="text-blue-600"
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
        />
        <StatCard label="My Tasks" value={stats?.myTasks ?? 0} color="text-indigo-600"
          icon={<svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
        />
        <StatCard label="In Progress" value={stats?.inProgressCount ?? 0} color="text-yellow-600"
          icon={<svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="Overdue" value={stats?.overdueCount ?? 0} color="text-red-600"
          icon={<svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
      </div>

      {/* Progress bar */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Task Completion</h3>
        <div className="flex gap-2 items-center">
          {[
            { label: 'To Do', count: stats?.todoCount ?? 0, color: 'bg-gray-400' },
            { label: 'In Progress', count: stats?.inProgressCount ?? 0, color: 'bg-blue-500' },
            { label: 'Done', count: stats?.doneCount ?? 0, color: 'bg-green-500' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-sm text-gray-600">
              <span className={`w-3 h-3 rounded-full ${item.color}`} />
              {item.label}: <span className="font-semibold">{item.count}</span>
            </div>
          ))}
        </div>
        {stats?.totalTasks > 0 && (
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden flex">
            <div style={{ width: `${(stats.todoCount / stats.totalTasks) * 100}%` }} className="bg-gray-400 h-full" />
            <div style={{ width: `${(stats.inProgressCount / stats.totalTasks) * 100}%` }} className="bg-blue-500 h-full" />
            <div style={{ width: `${(stats.doneCount / stats.totalTasks) * 100}%` }} className="bg-green-500 h-full" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue tasks */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Overdue Tasks</h3>
            <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
              {overdueTasks?.length ?? 0}
            </span>
          </div>
          {overdueTasks?.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No overdue tasks. Great job!</p>
          ) : (
            <ul className="space-y-3">
              {overdueTasks?.map((task) => (
                <li key={task.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.project?.name}</p>
                    <p className="text-xs text-red-600 mt-0.5">Due {format(new Date(task.dueDate), 'MMM d, yyyy')}</p>
                  </div>
                  <StatusBadge status={task.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent tasks */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            <Link to="/tasks" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {recentTasks?.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No tasks yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentTasks?.map((task) => (
                <li key={task.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.project?.name} · {task.assignee?.name || 'Unassigned'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
