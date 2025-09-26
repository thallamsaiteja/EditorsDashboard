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
    const [error, setError] = useState(null);


    // View states
    const [assignmentView, setAssignmentView] = useState('IN_PROGRESS');
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showVolunteerModal, setShowVolunteerModal] = useState(false);
    const [volunteerSearchTerm, setVolunteerSearchTerm] = useState('');
    const [showProfileMenu, setShowProfileMenu] = useState(false);


    // Form states
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('EDITOR');


    // SSE reference
    const eventSourceRef = useRef(null);
    const profileMenuRef = useRef(null);
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


    // Handle clicking outside profile menu to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    useEffect(() => {
        const token = getAuthToken();
        if (!token) {
            handleAuthError();
            return;
        }


        fetchDashboardData();
        establishSSEConnection();


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


            if (result.user.temporary_password) {
                alert(`User created successfully!\nTemporary password: ${result.user.temporary_password}\n\nPlease share this with the user securely.`);
            }


            setNewUserName('');
            setNewUserEmail('');
            setNewUserRole('EDITOR');
            setShowAddUserModal(false);


        } catch (error) {
            console.error('❌ User creation failed:', error);
            alert(`Error creating user: ${error.message}`);
        }
    };


    // Handle logout
    const handleLogout = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        navigate('/login');
    };


    // Helper function to get top 5 volunteers and sort all volunteers
    const getVolunteerData = () => {
        const allVolunteers = dashboardData?.volunteer_performance || [];
        
        const sortedVolunteers = [...allVolunteers].sort((a, b) => {
            const totalA = (a.accepted || 0) + (a.declined || 0);
            const totalB = (b.accepted || 0) + (b.declined || 0);
            return totalB - totalA;
        });

        const top5Volunteers = sortedVolunteers.slice(0, 5);
        
        return { top5Volunteers, allVolunteers: sortedVolunteers };
    };


    const getFilteredVolunteers = () => {
        const { allVolunteers } = getVolunteerData();
        
        if (!volunteerSearchTerm.trim()) {
            return allVolunteers;
        }
        
        return allVolunteers.filter(volunteer => 
            volunteer.name && volunteer.name.toLowerCase().includes(volunteerSearchTerm.toLowerCase())
        );
    };


    const downloadVolunteerExcel = () => {
        const { allVolunteers } = getVolunteerData();
        
        // Get current date and time for the Excel file
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        
        const excelData = allVolunteers.map((volunteer, index) => {
            const totalSubmissions = (volunteer.accepted || 0) + (volunteer.declined || 0);
            const acceptanceRate = totalSubmissions > 0 
                ? Math.round(((volunteer.accepted || 0) / totalSubmissions) * 100)
                : 0;
            
            return {
                'Rank': index + 1,
                'Volunteer Name': volunteer.name || 'N/A',
                'Accepted Submissions': volunteer.accepted || 0,
                'Declined Submissions': volunteer.declined || 0,
                'Total Submissions': totalSubmissions,
                'Success Rate (%)': acceptanceRate,
                'Performance Category': acceptanceRate >= 70 ? 'High Performer' : 
                                      acceptanceRate >= 50 ? 'Average Performer' : 'Needs Improvement',
                'Report Generated': dateStr,
                'Generated At': timeStr
            };
        });
        
        const headers = Object.keys(excelData[0] || {});
        const csvContent = [
            headers.join(','),
            ...excelData.map(row => 
                headers.map(header => {
                    const value = row[header];
                    return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                        ? `"${value.replace(/"/g, '""')}"` 
                        : value;
                }).join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `volunteer_performance_${now.toISOString().split('T')[0]}_${now.getHours()}-${now.getMinutes()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    const getCurrentDateTime = () => {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return now.toLocaleDateString('en-US', options);
    };


    const getTimeBasedGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
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


    const VolunteerPerformanceChart = () => {
        const { top5Volunteers } = getVolunteerData();
        
        return (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={top5Volunteers} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
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
    };


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
                    <button onClick={() => fetchDashboardData()} className="btn btn--primary">
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


    const filteredAssignments = dashboardData.assignments?.filter(assignment => {
        return assignment.status === assignmentView;
    }) || [];


    const assignmentCounts = {
        IN_PROGRESS: dashboardData.assignments?.filter(a => a.status === 'IN_PROGRESS').length || 0,
        COMPLETED: dashboardData.assignments?.filter(a => a.status === 'COMPLETED').length || 0,
        REVISION_NEEDED: dashboardData.assignments?.filter(a => a.status === 'REVISION_NEEDED').length || 0
    };


    const filteredVolunteers = getFilteredVolunteers();


    return (
        <div className="admin-dashboard-layout">
            {/* Simplified Header */}
            <header className="admin-header">
                {/* Top Row - Breadcrumb Only */}
                <div className="header-top-row">
                    <div className="breadcrumb">
                        <span className="breadcrumb-item">Home</span>
                        <span className="breadcrumb-separator">›</span>
                        <span className="breadcrumb-item active">Admin Dashboard</span>
                    </div>
                </div>

                {/* Main Content Row */}
                <div className="header-main-row">
                    <div className="header-left">
                        <h1 className="dashboard-title">
                            {getTimeBasedGreeting()}, {adminProfile?.full_name?.split(' ')[0] || 'Administrator'}!
                        </h1>
                        <p className="dashboard-subtitle">
                            Welcome to your comprehensive platform analytics and management center
                        </p>
                    </div>

                    <div className="header-right">
                        {adminProfile && (
                            <div className="admin-profile-card">
                                <div className="profile-avatar">
                                    <div className="avatar-circle">
                                        {adminProfile.full_name?.charAt(0) || 'A'}
                                    </div>
                                    <div className="online-indicator"></div>
                                </div>
                                <div className="profile-info">
                                    <h3 className="profile-name">{adminProfile.full_name || 'Administrator'}</h3>
                                    <p className="profile-email">{adminProfile.email}</p>
                                    <span className="profile-role">ADMIN</span>
                                </div>
                                <div className="profile-actions" ref={profileMenuRef}>
                                    <button 
                                        className="btn btn--profile-menu" 
                                        title="Profile Menu"
                                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    >
                                        ⚙️
                                    </button>
                                    
                                    {/* Profile Dropdown Menu */}
                                    {showProfileMenu && (
                                        <div className="profile-dropdown">
                                            <button 
                                                className="dropdown-item"
                                                onClick={() => {
                                                    setShowAddUserModal(true);
                                                    setShowProfileMenu(false);
                                                }}
                                            >
                                                <span className="dropdown-icon">👤+</span>
                                                Add User
                                            </button>
                                            <div className="dropdown-divider"></div>
                                            <button 
                                                className="dropdown-item logout-item"
                                                onClick={() => {
                                                    setShowProfileMenu(false);
                                                    handleLogout();
                                                }}
                                            >
                                                <span className="dropdown-icon">🚪</span>
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Platform Status - Blue Gradient */}
                <div className="platform-status">
                    <div className="status-item">
                        <span className="status-label">Platform Status:</span>
                        <span className={`status-indicator ${connectionStatus.toLowerCase().replace(' ', '-')}`}>
                            <span className="status-dot"></span>
                            {connectionStatus}
                        </span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">Session Time:</span>
                        <span className="status-value">
                            {getCurrentDateTime()}
                        </span>
                    </div>
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
                    <div className="section-header-with-action">
                        <h2 className="section-title">Top 5 Volunteer Performance</h2>
                        <button 
                            className="btn btn--view-more"
                            onClick={() => setShowVolunteerModal(true)}
                        >
                            View More
                        </button>
                    </div>
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


            {/* Recent Submissions */}
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


                    {dashboardData.recent_submissions && dashboardData.recent_submissions.length > 5 && (
                        <div className="scroll-indicator">
                            <span>↓ Scroll to see more submissions ↓</span>
                        </div>
                    )}
                </div>
            </section>


            {/* Volunteer Performance Modal */}
            {showVolunteerModal && (
                <div className="modal-backdrop" onClick={() => setShowVolunteerModal(false)}>
                    <div className="modal-content volunteer-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>All Volunteer Performance</h2>
                            <div className="modal-header-actions">
                                <button 
                                    className="btn btn--download"
                                    onClick={downloadVolunteerExcel}
                                    title="Download Excel Report"
                                >
                                    📊 Download Excel
                                </button>
                                <button 
                                    className="modal-close-btn"
                                    onClick={() => setShowVolunteerModal(false)}
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="volunteer-search-container">
                            <div className="search-input-wrapper">
                                <input
                                    type="text"
                                    placeholder="Search volunteers by name..."
                                    value={volunteerSearchTerm}
                                    onChange={(e) => setVolunteerSearchTerm(e.target.value)}
                                    className="volunteer-search-input"
                                />
                                <div className="search-icon">🔍</div>
                            </div>
                            {volunteerSearchTerm && (
                                <div className="search-results-info">
                                    Found {filteredVolunteers.length} volunteer{filteredVolunteers.length !== 1 ? 's' : ''}
                                    <button 
                                        className="clear-search-btn"
                                        onClick={() => setVolunteerSearchTerm('')}
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="volunteer-list-container">
                            {filteredVolunteers.length > 0 ? (
                                <div className="volunteer-list">
                                    {filteredVolunteers.map((volunteer, index) => {
                                        const totalSubmissions = (volunteer.accepted || 0) + (volunteer.declined || 0);
                                        const acceptanceRate = totalSubmissions > 0 
                                            ? Math.round(((volunteer.accepted || 0) / totalSubmissions) * 100)
                                            : 0;
                                        
                                        const { allVolunteers } = getVolunteerData();
                                        const originalRank = allVolunteers.findIndex(v => v.name === volunteer.name) + 1;
                                        
                                        return (
                                            <div key={volunteer.name || index} className="volunteer-item">
                                                <div className="volunteer-info">
                                                    <div className="volunteer-header">
                                                        <h4 className="volunteer-name">{volunteer.name}</h4>
                                                        <span className="volunteer-rank">#{originalRank}</span>
                                                    </div>
                                                    <div className="volunteer-stats">
                                                        <div className="stat-group">
                                                            <span className="stat-label">Accepted:</span>
                                                            <span className="stat-value accepted">{volunteer.accepted || 0}</span>
                                                        </div>
                                                        <div className="stat-group">
                                                            <span className="stat-label">Declined:</span>
                                                            <span className="stat-value declined">{volunteer.declined || 0}</span>
                                                        </div>
                                                        <div className="stat-group">
                                                            <span className="stat-label">Total:</span>
                                                            <span className="stat-value total">{totalSubmissions}</span>
                                                        </div>
                                                        <div className="stat-group">
                                                            <span className="stat-label">Success Rate:</span>
                                                            <span className={`stat-value rate ${acceptanceRate >= 70 ? 'high' : acceptanceRate >= 50 ? 'medium' : 'low'}`}>
                                                                {acceptanceRate}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="volunteer-performance-bar">
                                                    <div className="performance-bar">
                                                        <div 
                                                            className="performance-accepted" 
                                                            style={{ 
                                                                width: totalSubmissions > 0 
                                                                    ? `${((volunteer.accepted || 0) / totalSubmissions) * 100}%` 
                                                                    : '0%' 
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="no-volunteers">
                                    {volunteerSearchTerm ? (
                                        <p>No volunteers found matching "{volunteerSearchTerm}"</p>
                                    ) : (
                                        <p>No volunteer performance data available.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


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
            </div>
        </div>
    );
}
