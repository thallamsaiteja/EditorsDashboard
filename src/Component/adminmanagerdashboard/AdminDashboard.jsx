import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './AdminDashboard.css';

// --- Comprehensive Mock Data ---
const mockUsers = [
    { userId: 'a1b2c3d4', fullName: 'Aarav Sharma', email: 'aarav.sharma@kaizernews.com', role: 'ADMIN', isActive: true },
    { userId: 'e5f6g7h8', fullName: 'Priya Patel', email: 'priya.patel@kaizernews.com', role: 'MANAGER', isActive: true },
    { userId: 'i9j0k1l2', fullName: 'Rohan Reddy', email: 'rohan.reddy@kaizernews.com', role: 'EDITOR', isActive: true },
    { userId: 'm3n4o5p6', fullName: 'Ananya Rao', email: 'ananya.rao@kaizernews.com', role: 'EDITOR', isActive: true },
    { userId: 'q7r8s9t0', fullName: 'Vikram Singh', email: 'vikram.singh@kaizernews.com', role: 'EDITOR', isActive: false },
];

const mockRecentSubmissions = [
    { id: 'sub-001', volunteerName: 'Fatima Khan', status: 'PENDING_REVIEW', submittedAt: '2025-09-22T11:45:00Z' },
    { id: 'sub-003', volunteerName: 'Lakshmi Iyer', status: 'PENDING_REVIEW', submittedAt: '2025-09-22T12:05:00Z' },
    { id: 'sub-004', volunteerName: 'Suresh Kumar', status: 'PENDING_REVIEW', submittedAt: '2025-09-22T12:15:00Z' },
    { id: 'sub-005', volunteerName: 'Arjun Nair', status: 'DECLINED', submittedAt: '2025-09-22T13:00:00Z' },
];

const mockAssignments = [
    { id: 'asg-01', videoTitle: "Banjara Hills Traffic Jam", assignedTo: "Rohan Reddy", reportedBy: "Suresh Kumar", status: "IN_PROGRESS", date: "2025-09-22T10:25:00Z" },
    { id: 'asg-02', videoTitle: "Charminar Festival Preparations", assignedTo: "Ananya Rao", reportedBy: "Fatima Khan", status: "COMPLETED", date: "2025-09-21T14:00:00Z" },
    { id: 'asg-03', videoTitle: "Interview with Local Artisan", assignedTo: "Rohan Reddy", reportedBy: "Deepa Murthy", status: "IN_PROGRESS", date: "2025-09-21T17:00:00Z" },
    { id: 'asg-04', videoTitle: "Golkonda Fort Light Show", assignedTo: "Ananya Rao", reportedBy: "Arjun Nair", status: "COMPLETED", date: "2025-09-20T15:00:00Z" },
];

const dailySubmissionsData = [
    { day: 'Mon', submissions: 15, completed: 12 }, { day: 'Tue', submissions: 22, completed: 18 }, { day: 'Wed', submissions: 18, completed: 20 }, { day: 'Thu', submissions: 25, completed: 23 }, { day: 'Fri', submissions: 30, completed: 28 }, { day: 'Sat', submissions: 12, completed: 15 }, { day: 'Sun', submissions: 8, completed: 10 },
];

const editorPerformanceData = [
    { name: 'Rohan Reddy', completed: 25, in_progress: 8 }, { name: 'Ananya Rao', completed: 35, in_progress: 4 }, { name: 'Vikram Singh', completed: 15, in_progress: 12 },
];

const volunteerPerformanceData = [
    { name: 'Fatima Khan', accepted: 32, declined: 4 }, { name: 'Suresh Kumar', accepted: 51, declined: 2 }, { name: 'Lakshmi Iyer', accepted: 18, declined: 9 }, { name: 'Mohammed Ali', accepted: 22, declined: 15 },
];

// --- Reusable Chart Components ---
const DailySubmissionsChart = () => (<ResponsiveContainer width="100%" height={300}><LineChart data={dailySubmissionsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis dataKey="day" stroke="var(--text-secondary)" /><YAxis stroke="var(--text-secondary)" /><Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} /><Legend /><Line type="monotone" dataKey="submissions" stroke="var(--accent-blue)" strokeWidth={2} name="Videos Received" /></LineChart></ResponsiveContainer>);
const EditorPerformanceChart = () => (<ResponsiveContainer width="100%" height={300}><BarChart data={editorPerformanceData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis dataKey="name" stroke="var(--text-secondary)" /><YAxis stroke="var(--text-secondary)" /><Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} /><Legend /><Bar dataKey="completed" fill="var(--accent-green)" name="Completed" /><Bar dataKey="in_progress" fill="var(--accent-orange)" name="In Progress" /></BarChart></ResponsiveContainer>);
const VolunteerPerformanceChart = () => (<ResponsiveContainer width="100%" height={300}><BarChart data={volunteerPerformanceData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis type="number" stroke="var(--text-secondary)" /><YAxis type="category" dataKey="name" stroke="var(--text-secondary)" width={100} /><Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} /><Legend /><Bar dataKey="accepted" fill="var(--accent-blue)" name="Accepted" /><Bar dataKey="declined" fill="var(--accent-red)" name="Declined" /></BarChart></ResponsiveContainer>);
const PressurePerformanceChart = () => (<ResponsiveContainer width="100%" height={300}><ComposedChart data={dailySubmissionsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis dataKey="day" stroke="var(--text-secondary)" /><YAxis yAxisId="left" stroke="var(--accent-blue)" label={{ value: 'Submissions', angle: -90, position: 'insideLeft' }} /><YAxis yAxisId="right" orientation="right" stroke="var(--accent-green)" label={{ value: 'Completions', angle: -90, position: 'insideRight' }} /><Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} /><Legend /><Bar yAxisId="right" dataKey="completed" fill="var(--accent-green)" name="Tasks Completed" /><Line yAxisId="left" type="monotone" dataKey="submissions" stroke="var(--accent-blue)" strokeWidth={2} name="Videos Received (Pressure)" /></ComposedChart></ResponsiveContainer>);

// --- Main Dashboard Component ---
export default function AdminDashboard() {
    const [users, setUsers] = useState(mockUsers);
    const [assignmentView, setAssignmentView] = useState('IN_PROGRESS');
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('EDITOR');

    const handleRoleChange = (userId, newRole) => setUsers(users.map(u => u.userId === userId ? { ...u, role: newRole } : u));
    const handleStatusToggle = (userId) => setUsers(users.map(u => u.userId === userId ? { ...u, isActive: !u.isActive } : u));
    
    const handleAddUser = (e) => {
        e.preventDefault();
        if (!newUserName || !newUserEmail) return alert("Please fill out both name and email.");
        const newUser = {
            userId: `uuid-new-${Math.random().toString(16).slice(2)}`,
            fullName: newUserName, email: newUserEmail, role: newUserRole, isActive: true,
        };
        setUsers([...users, newUser]);
        setNewUserName(''); setNewUserEmail(''); setNewUserRole('EDITOR');
    };

    const assignmentData = {
        'IN_PROGRESS': mockAssignments.filter(a => a.status === 'IN_PROGRESS'),
        'COMPLETED': mockAssignments.filter(a => a.status === 'COMPLETED'),
    };
    const filteredAssignments = assignmentData[assignmentView];

    return (
        <div className="admin-dashboard-layout">
            <header className="admin-header"><h1>Admin Dashboard</h1><p>Platform overview, performance analytics, and management tools.</p></header>
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-card__value">{mockRecentSubmissions.filter(s => s.status === 'PENDING_REVIEW').length}</div><div className="stat-card__label">Pending Submissions</div></div>
                <div className="stat-card"><div className="stat-card__value">{dailySubmissionsData.reduce((s, a) => s + a.submissions, 0)}</div><div className="stat-card__label">Submissions This Week</div></div>
                <div className="stat-card"><div className="stat-card__value">{users.filter(u => u.role !== 'USER').length}</div><div className="stat-card__label">Internal Team Members</div></div>
                <div className="stat-card"><div className="stat-card__value">350+</div><div className="stat-card__label">Community Reporters</div></div>
            </div>
            
            <div className="dashboard-grid">
                <section className="dashboard-section chart-section"><h2 className="section-title">Daily Submission Volume</h2><div className="chart-container"><DailySubmissionsChart /></div></section>
                <section className="dashboard-section chart-section"><h2 className="section-title">Team Performance Under Pressure</h2><div className="chart-container"><PressurePerformanceChart /></div></section>
                <section className="dashboard-section chart-section"><h2 className="section-title">Editor Workload & Performance</h2><div className="chart-container"><EditorPerformanceChart /></div></section>
                <section className="dashboard-section chart-section"><h2 className="section-title">Volunteer Performance</h2><div className="chart-container"><VolunteerPerformanceChart /></div></section>
            </div>

            <section className="dashboard-section">
                <div className="section-header">
                    <h2 className="section-title">Assignment Overview</h2>
                    <div className="assignment-tabs">
                        <button className={`tab-button ${assignmentView === 'IN_PROGRESS' ? 'active' : ''}`} onClick={() => setAssignmentView('IN_PROGRESS')}>In Progress ({assignmentData.IN_PROGRESS.length})</button>
                        <button className={`tab-button ${assignmentView === 'COMPLETED' ? 'active' : ''}`} onClick={() => setAssignmentView('COMPLETED')}>Completed ({assignmentData.COMPLETED.length})</button>
                    </div>
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Video Title</th><th>Assigned To</th><th>Reported By</th><th>Status</th><th>Date</th></tr></thead>
                        <tbody>{filteredAssignments.map(item => (<tr key={item.id}><td data-label="Video Title">{item.videoTitle}</td><td data-label="Assigned To">{item.assignedTo}</td><td data-label="Reported By">{item.reportedBy}</td><td data-label="Status"><span className={`status-badge status--${item.status.toLowerCase()}`}>{item.status.replace('_', ' ')}</span></td><td data-label="Date">{new Date(item.date).toLocaleString()}</td></tr>))
                        }</tbody>
                    </table>
                    {filteredAssignments.length === 0 && <p className="no-data-message">No tasks in this category.</p>}
                </div>
            </section>

            <section className="dashboard-section">
                <h2 className="section-title">Manage Team</h2>
                <div className="management-grid">
                    <div className="table-container">
                        <table className="data-table">
                            <thead><tr><th>Team Member</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>{users.map(user => (<tr key={user.userId}>
                                <td data-label="Team Member"><div className="user-info">{user.fullName}<span className="user-email">{user.email}</span></div></td>
                                <td data-label="Role"><select className="role-select" value={user.role} onChange={(e) => handleRoleChange(user.userId, e.target.value)}><option value="USER">User</option><option value="EDITOR">Editor</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option></select></td>
                                <td data-label="Status"><span className={`status-badge status--${user.isActive ? 'active' : 'inactive'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td data-label="Actions"><button className={`btn ${user.isActive ? 'btn--deactivate' : 'btn--activate'}`} onClick={() => handleStatusToggle(user.userId)}>{user.isActive ? 'Deactivate' : 'Activate'}</button></td>
                            </tr>))}
                            </tbody>
                        </table>
                    </div>
                    <form className="add-user-form" onSubmit={handleAddUser}>
                        <h3>Add New Team Member</h3>
                        <input type="text" placeholder="Full Name" value={newUserName} onChange={e => setNewUserName(e.target.value)} required />
                        <input type="email" placeholder="Email Address" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required />
                        <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                            <option value="EDITOR">Editor</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option>
                        </select>
                        <button type="submit" className="btn btn--add">Add User</button>
                    </form>
                </div>
            </section>
            
            {/* --- NEW: Recent Submissions Section --- */}
            <section className="dashboard-section">
                <h2 className="section-title">Recent Submissions from Volunteers</h2>
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Reported By</th><th>Status</th><th>Submitted At</th><th>Actions</th></tr></thead>
                        <tbody>
                            {mockRecentSubmissions.map(sub => (
                                <tr key={sub.id}>
                                    <td data-label="Reported By">{sub.volunteerName}</td>
                                    <td data-label="Status"><span className={`status-badge status--${sub.status.toLowerCase()}`}>{sub.status.replace('_', ' ')}</span></td>
                                    <td data-label="Submitted At">{new Date(sub.submittedAt).toLocaleString()}</td>
                                    <td data-label="Actions"><Link to="/managerdashboard" className="btn btn--view">Review</Link></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

