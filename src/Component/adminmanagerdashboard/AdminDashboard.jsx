import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './AdminDashboard.css';
import LogoutButton from '../Auth/logout/logout.jsx'; // Import the LogoutButton component
// The base URL for your FastAPI backend
const API_BASE_URL = 'http://localhost:8000/api/v1/admin';

export default function AdminDashboard() {
    // Main state
    const [dashboardData, setDashboardData] = useState(null);
    const [adminProfile, setAdminProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);

    // View states
    const [assignmentView, setAssignmentView] = useState('IN_PROGRESS');
    const [showAddUserModal, setShowAddUserModal] = useState(false);

    // Form states
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('EDITOR');

    // SSE reference
    const eventSourceRef = useRef(null);
    const navigate = useNavigate();

    // Helper function to get auth token
    const getAuthToken = () => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; authToken=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };

    // Helper function to clear auth token and redirect to login
    const handleAuthError = () => {
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        navigate('/login');
    };

    // Helper function to handle non-admin users
    const handleUnauthorizedAccess = () => {
        navigate('/unauthorized');
    };

    // Helper function to make authenticated API calls
    const authenticatedFetch = async (url, options = {}) => {
        const token = getAuthToken();

        if (!token) {
            handleAuthError();
            throw new Error('No authentication token found');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        const response = await fetch(url, { ...options, ...defaultOptions });

        if (response.status === 401) {
            handleAuthError();
            throw new Error('Session expired. Please log in again.');
        }

        if (response.status === 403) {
            handleUnauthorizedAccess();
            throw new Error('Admin access required.');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        return response;
    };

    // Load initial dashboard data
    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await authenticatedFetch(`${API_BASE_URL}/dashboard-data`);
            const data = await response.json();

            setDashboardData(data);
            setAdminProfile(data.admin_profile || null);
            setConnectionStatus('Connected');
            console.log('✅ Admin dashboard data loaded:', data);

        } catch (error) {
            console.error('❌ Failed to fetch admin dashboard data:', error);
            setError(error.message);
            setConnectionStatus('Error loading data');

            if (error.message.includes('authentication') || error.message.includes('Session expired')) {
                handleAuthError();
            } else if (error.message.includes('Admin access required')) {
                handleUnauthorizedAccess();
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Establish SSE connection for real-time updates
    const establishSSEConnection = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const token = getAuthToken();
        if (!token) {
            handleAuthError();
            return;
        }

        try {
            // ✅ Pass token as query parameter for SSE (since headers don't work)
            const sseUrl = `${API_BASE_URL}/dashboard-stream?token=${encodeURIComponent(token)}`;
            const eventSource = new EventSource(sseUrl);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log('📡 Admin SSE connection established');
                setConnectionStatus('Connected');
            };

            eventSource.addEventListener('admin-update', (event) => {
                try {
                    const updateData = JSON.parse(event.data);
                    console.log('📊 Admin update received:', updateData);
                    setLastUpdate(new Date().toLocaleTimeString());

                    // Handle different types of updates
                    if (updateData.event === 'user_created') {
                        setDashboardData(prev => ({
                            ...prev,
                            users: [updateData.user, ...prev.users]
                        }));
                    } else if (updateData.event === 'user_role_updated') {
                        setDashboardData(prev => ({
                            ...prev,
                            users: prev.users.map(user =>
                                user.user_id === updateData.update.user_id
                                    ? { ...user, role: updateData.update.new_role }
                                    : user
                            )
                        }));
                    } else if (updateData.event === 'user_status_toggled') {
                        setDashboardData(prev => ({
                            ...prev,
                            users: prev.users.map(user =>
                                user.user_id === updateData.update.user_id
                                    ? { ...user, is_active: updateData.update.is_active }
                                    : user
                            )
                        }));
                    }

                    // Refresh overview data for any update
                    fetchOverviewData();

                } catch (error) {
                    console.error('❌ Error parsing admin SSE data:', error);
                }
            });

            eventSource.addEventListener('keep-alive', (event) => {
                console.log('💓 Admin keep-alive received');
            });

            eventSource.onerror = (error) => {
                console.error('❌ Admin SSE error:', error);
                setConnectionStatus('Connection Error');

                if (error.target && error.target.readyState === EventSource.CLOSED) {
                    setTimeout(() => {
                        const currentToken = getAuthToken();
                        if (currentToken) {
                            console.log('🔄 Attempting to reconnect admin SSE...');
                            establishSSEConnection();
                        } else {
                            handleAuthError();
                        }
                    }, 5000);
                }
            };

        } catch (error) {
            console.error('❌ Failed to establish SSE connection:', error);
            setConnectionStatus('SSE Error');
        }
    };

    // Fetch only overview data for real-time updates
    const fetchOverviewData = async () => {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/analytics/overview`);
            const data = await response.json();
            setDashboardData(prev => prev ? { ...prev, overview: data.overview } : null);
        } catch (error) {
            console.error('❌ Failed to refresh overview:', error);
        }
    };

    useEffect(() => {
        // Check authentication first
        const token = getAuthToken();
        if (!token) {
            handleAuthError();
            return;
        }

        fetchDashboardData();
        establishSSEConnection();

        // Cleanup
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [navigate]);

    // User management handlers
    const handleRoleChange = async (userId, newRole) => {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/management/users/role`, {
                method: 'PUT',
                body: JSON.stringify({ user_id: userId, new_role: newRole })
            });

            const result = await response.json();
            console.log('✅ Role updated:', result);

        } catch (error) {
            console.error('❌ Role update failed:', error);
            alert(`Error updating role: ${error.message}`);
        }
    };

    const handleStatusToggle = async (userId) => {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/management/users/${userId}/toggle-status`, {
                method: 'POST'
            });

            const result = await response.json();
            console.log('✅ Status toggled:', result);

        } catch (error) {
            console.error('❌ Status toggle failed:', error);
            alert(`Error toggling status: ${error.message}`);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();

        if (!newUserName || !newUserEmail) {
            alert("Please fill out both name and email.");
            return;
        }

        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/management/users`, {
                method: 'POST',
                body: JSON.stringify({
                    full_name: newUserName,
                    email: newUserEmail,
                    role: newUserRole
                })
            });

            const result = await response.json();
            console.log('✅ User created:', result);

            // Show temporary password to admin
            if (result.user.temporary_password) {
                alert(`User created successfully!\nTemporary password: ${result.user.temporary_password}\n\nPlease share this with the user securely.`);
            }

            // Reset form
            setNewUserName('');
            setNewUserEmail('');
            setNewUserRole('EDITOR');
            setShowAddUserModal(false);

        } catch (error) {
            console.error('❌ User creation failed:', error);
            alert(`Error creating user: ${error.message}`);
        }
    };

    // Chart components with real data
    const DailySubmissionsChart = () => (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData?.daily_submissions || []} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="day" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                <Legend />
                <Line type="monotone" dataKey="submissions" stroke="var(--accent-blue)" strokeWidth={2} name="Videos Received" />
            </LineChart>
        </ResponsiveContainer>
    );

    const EditorPerformanceChart = () => (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData?.editor_performance || []} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                <Legend />
                <Bar dataKey="completed" fill="var(--accent-green)" name="Completed" />
                <Bar dataKey="in_progress" fill="var(--accent-orange)" name="In Progress" />
            </BarChart>
        </ResponsiveContainer>
    );

    const VolunteerPerformanceChart = () => (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData?.volunteer_performance || []} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" stroke="var(--text-secondary)" />
                <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" width={100} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                <Legend />
                <Bar dataKey="accepted" fill="var(--accent-blue)" name="Accepted" />
                <Bar dataKey="declined" fill="var(--accent-red)" name="Declined" />
            </BarChart>
        </ResponsiveContainer>
    );

    const PressurePerformanceChart = () => (
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={dashboardData?.daily_submissions || []} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="day" stroke="var(--text-secondary)" />
                <YAxis yAxisId="left" stroke="var(--accent-blue)" label={{ value: 'Submissions', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--accent-green)" label={{ value: 'Completions', angle: -90, position: 'insideRight' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                <Legend />
                <Bar yAxisId="right" dataKey="completed" fill="var(--accent-green)" name="Tasks Completed" />
                <Line yAxisId="left" type="monotone" dataKey="submissions" stroke="var(--accent-blue)" strokeWidth={2} name="Videos Received (Pressure)" />
            </ComposedChart>
        </ResponsiveContainer>
    );

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleString();
        } catch (_) {
            return dateTimeString;
        }
    };

    const getStatusText = (status) => {
        const statusMap = {
            'PENDING_REVIEW': 'Pending Review',
            'PROCESSING': 'Processing',
            'ACCEPTED': 'Ready to Assign',
            'ASSIGNED': 'Assigned to Editor',
            'DECLINED': 'Declined',
            'USED': 'Used',
            'IN_PROGRESS': 'In Progress',
            'COMPLETED': 'Completed',
            'REVISION_NEEDED': 'Revision Needed'
        };
        return statusMap[status] || status;
    };

    const getStatusClass = (status) => status.toLowerCase().replace('_', '-');

    if (isLoading) {
        return (
            <div className="admin-dashboard-layout">
                <div className="loading-container">
                    <h2>Loading Admin Dashboard...</h2>
                    <p>Please wait while we fetch comprehensive analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-dashboard-layout">
                <div className="error-container">
                    <h2>Dashboard Error</h2>
                    <p>Failed to load dashboard: {error}</p>
                    <button onClick={fetchDashboardData} className="btn btn--primary">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="admin-dashboard-layout">
                <div className="loading-container">
                    <h2>No Data Available</h2>
                    <p>Dashboard data is not available at the moment.</p>
                </div>
            </div>
        );
    }

    // Filter assignments based on current view
    const filteredAssignments = dashboardData.assignments?.filter(assignment => {
        return assignment.status === assignmentView;
    }) || [];

    const assignmentCounts = {
        IN_PROGRESS: dashboardData.assignments?.filter(a => a.status === 'IN_PROGRESS').length || 0,
        COMPLETED: dashboardData.assignments?.filter(a => a.status === 'COMPLETED').length || 0,
        REVISION_NEEDED: dashboardData.assignments?.filter(a => a.status === 'REVISION_NEEDED').length || 0
    };

    return (
        <div className="admin-dashboard-layout">
            <header className="admin-header">
                <div className="header-content">
                    <div className="header-text">
                        <h1>Admin Dashboard</h1>
                        <p>Platform overview, performance analytics, and management tools.</p>
                    </div>
                    {/* ✅ NEW: Admin Profile Card */}
                    {adminProfile && (
                        <div className="admin-profile-card">
                            {/* <div className="admin-profile-avatar">
                                {adminProfile.full_name?.charAt(0) || 'A'}
                            </div> */}
                            <div className="admin-profile-info">
                                <h3>{adminProfile.full_name || 'Administrator'} <p>{adminProfile.email}</p></h3>
                                <span className="admin-badge">{adminProfile.role} </span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="connection-status">
                    <span className={`status-indicator ${connectionStatus.toLowerCase().replace(' ', '-')}`}>
                        ● {connectionStatus}
                    </span>
                    {lastUpdate && (
                        <span className="last-update">
                            Last update: {lastUpdate}
                        </span>
                    )}
                </div>
            </header>

            {/* Stats Grid with Real Data */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-card__value">{dashboardData.overview?.pending_submissions || 0}</div>
                    <div className="stat-card__label">Pending Submissions</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">{dashboardData.overview?.week_submissions || 0}</div>
                    <div className="stat-card__label">Submissions This Week</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">{dashboardData.overview?.total_users || 0}</div>
                    <div className="stat-card__label">Internal Team Members</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">{dashboardData.overview?.total_volunteers || 0}</div>
                    <div className="stat-card__label">Community Reporters</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">{dashboardData.overview?.completion_rate || 0}%</div>
                    <div className="stat-card__label">Completion Rate</div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="dashboard-grid">
                <section className="dashboard-section chart-section">
                    <h2 className="section-title">Daily Submission Volume</h2>
                    <div className="chart-container">
                        <DailySubmissionsChart />
                    </div>
                </section>

                <section className="dashboard-section chart-section">
                    <h2 className="section-title">Team Performance Under Pressure</h2>
                    <div className="chart-container">
                        <PressurePerformanceChart />
                    </div>
                </section>

                <section className="dashboard-section chart-section">
                    <h2 className="section-title">Editor Workload & Performance</h2>
                    <div className="chart-container">
                        <EditorPerformanceChart />
                    </div>
                </section>

                <section className="dashboard-section chart-section">
                    <h2 className="section-title">Volunteer Performance</h2>
                    <div className="chart-container">
                        <VolunteerPerformanceChart />
                    </div>
                </section>
            </div>

            {/* Assignment Overview */}
            <section className="dashboard-section">
                <div className="section-headerAdmin">
                    <h2 className="section-title">Assignment Overview</h2>
                    <div className="assignment-tabs">
                        <button
                            className={`tab-button ${assignmentView === 'IN_PROGRESS' ? 'active' : ''}`}
                            onClick={() => setAssignmentView('IN_PROGRESS')}
                        >
                            In Progress ({assignmentCounts.IN_PROGRESS})
                        </button>
                        <button
                            className={`tab-button ${assignmentView === 'COMPLETED' ? 'active' : ''}`}
                            onClick={() => setAssignmentView('COMPLETED')}
                        >
                            Completed ({assignmentCounts.COMPLETED})
                        </button>
                        <button
                            className={`tab-button ${assignmentView === 'REVISION_NEEDED' ? 'active' : ''}`}
                            onClick={() => setAssignmentView('REVISION_NEEDED')}
                        >
                            Revision Needed ({assignmentCounts.REVISION_NEEDED})
                        </button>
                    </div>
                </div>
                <div className="table-container scrollable-table">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Video Title</th>
                                <th>Assigned To</th>
                                <th>Reported By</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAssignments.map(assignment => (
                                <tr key={assignment.id}>
                                    <td data-label="Video Title">{assignment.video_title}</td>
                                    <td data-label="Assigned To">{assignment.assigned_to}</td>
                                    <td data-label="Reported By">{assignment.reported_by}</td>
                                    <td data-label="Status">
                                        <span className={`status-badge status--${getStatusClass(assignment.status)}`}>
                                            {getStatusText(assignment.status)}
                                        </span>
                                    </td>
                                    <td data-label="Date">{formatDateTime(assignment.assigned_at)}</td>
                                    <td data-label="Actions">
                                        {assignment.original_video_url && (
                                            <a href={assignment.original_video_url} target="_blank" rel="noopener noreferrer" className="btn btn--mini">
                                                View
                                            </a>
                                        )}
                                        {assignment.completed_video_url && (
                                            <a href={assignment.completed_video_url} target="_blank" rel="noopener noreferrer" className="btn btn--mini">
                                                Final
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAssignments.length === 0 && (
                        <p className="no-data-message">No assignments in this category.</p>
                    )}
                </div>
            </section>

            {/* Team Management */}
            <section className="dashboard-section">
                <div className="section-headerAdmin">
                    <h2 className="section-title">Manage Team</h2>
                    {/* <button
                        className="btn btn--primary"
                        onClick={() => setShowAddUserModal(true)}
                    >
                        Add New User
                    </button> */}
                </div>
                <div className="table-container scrollable-table">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Team Member</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboardData.users?.map(user => (
                                <tr key={user.user_id}>
                                    <td data-label="Team Member">
                                        <div className="user-info">
                                            {user.full_name}
                                            <span className="user-email">{user.email}</span>
                                        </div>
                                    </td>
                                    <td data-label="Role">
                                        <select
                                            className="role-select"
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                                        >
                                            <option value="USER">User</option>
                                            <option value="EDITOR">Editor</option>
                                            <option value="MANAGER">Manager</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                    </td>
                                    <td data-label="Status">
                                        <span className={`status-badge status--${user.is_active ? 'active' : 'inactive'}`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td data-label="Actions">
                                        <button
                                            className={`btn ${user.is_active ? 'btn--deactivate' : 'btn--activate'}`}
                                            onClick={() => handleStatusToggle(user.user_id)}
                                        >
                                            {user.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Recent Submissions with Enhanced Scrolling */}
            <section className="dashboard-section">
                <h2 className="section-title">Recent Submissions from Volunteers</h2>
                <div className="scrollable-submissions-container">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Reported By</th>
                                    <th>Status</th>
                                    <th>Submitted At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardData.recent_submissions?.map(submission => (
                                    <tr key={submission.id}>
                                        <td data-label="Reported By">
                                            {submission.volunteer_name}
                                            <span className="phone-number">{submission.phone_number}</span>
                                        </td>
                                        <td data-label="Status">
                                            <span className={`status-badge status--${getStatusClass(submission.status)}`}>
                                                {getStatusText(submission.status)}
                                            </span>
                                        </td>
                                        <td data-label="Submitted At">{formatDateTime(submission.submitted_at)}</td>
                                        <td data-label="Actions">
                                            <Link to="/managerdashboard" className="btn btn--view">Review</Link>
                                            {submission.video_url && (
                                                <a href={submission.video_url} target="_blank" rel="noopener noreferrer" className="btn btn--mini">
                                                    View Video
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Scroll Indicator */}
                    {dashboardData.recent_submissions && dashboardData.recent_submissions.length > 5 && (
                        <div className="scroll-indicator">
                            <span>↓ Scroll to see more submissions ↓</span>
                        </div>
                    )}
                </div>
            </section>

            {/* Add User Modal */}
            {showAddUserModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h2>Add New Team Member</h2>
                        <form onSubmit={handleAddUser}>
                            <div className="modal-form">
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={newUserName}
                                    onChange={e => setNewUserName(e.target.value)}
                                    required
                                />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={newUserEmail}
                                    onChange={e => setNewUserEmail(e.target.value)}
                                    required
                                />
                                <select
                                    value={newUserRole}
                                    onChange={e => setNewUserRole(e.target.value)}
                                >
                                    <option value="EDITOR">Editor</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn--secondary"
                                    onClick={() => setShowAddUserModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn--primary">
                                    Add User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="admin-footer-toolbar">
                <Link to="/" className="sidebar-link">Back to Home</Link>
                <LogoutButton
                    className="sidebar-link"
                    onBeforeLogout={() => {
                        if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; } // stop SSE [web:3]
                    }}
                />
            </div>
        </div>
    );
}


