import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Editor.css';
import LogoutButton from '../Auth/logout/logout.jsx'; // Import the LogoutButton component

// The base URL for your FastAPI backend
const API_BASE_URL = 'http://localhost:8000/api/v1/editor';

export default function EditorPage() {
  const [assignments, setAssignments] = useState([]);
  const [editorProfile, setEditorProfile] = useState(null);
  const [stats, setStats] = useState({ total_assignments: 0, in_progress: 0, completed: 0, revision_needed: 0 });
  const [currentView, setCurrentView] = useState('in_progress');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [completedVideoUrl, setCompletedVideoUrl] = useState('');
  const [editorNotes, setEditorNotes] = useState('');

  // New state for revision modal
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');

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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response;
  };

  // Helper function to calculate stats from assignments
  const calculateStats = (assignmentsList) => {
    const stats = {
      total_assignments: assignmentsList.length,
      in_progress: assignmentsList.filter(a => a.assignment_status === 'IN_PROGRESS').length,
      completed: assignmentsList.filter(a => a.assignment_status === 'COMPLETED').length,
      revision_needed: assignmentsList.filter(a => a.assignment_status === 'REVISION_NEEDED').length
    };
    return stats;
  };

  // Helper function to get date classification
  const getDateClassification = (dateTimeString) => {
    if (!dateTimeString) return 'old';

    try {
      const assignedDate = dateTimeString.split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (assignedDate === today) return 'today';
      if (assignedDate === yesterday) return 'yesterday';
      return 'old';
    } catch (error) {
      return 'old';
    }
  };

  // Helper function to get date tag display
  const getDateTag = (classification) => {
    switch (classification) {
      case 'today':
        return { text: "Today's Task", class: 'date-tag-today' };
      case 'yesterday':
        return { text: 'Yesterday', class: 'date-tag-yesterday' };
      case 'old':
        return { text: 'Older Task', class: 'date-tag-old' };
      default:
        return { text: 'Older Task', class: 'date-tag-old' };
    }
  };

  // Helper function to format date with classification for "Assigned" field
  const formatDateTimeWithClassification = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';

    try {
      const date = new Date(dateTimeString);
      const classification = getDateClassification(dateTimeString);

      if (classification === 'today') {
        return `Today at ${date.toLocaleTimeString()}`;
      } else if (classification === 'yesterday') {
        return `Yesterday at ${date.toLocaleTimeString()}`;
      } else {
        return date.toLocaleString();
      }
    } catch (error) {
      return dateTimeString;
    }
  };

  // Helper function to check if URL is an api.video embed URL
  const isApiVideoUrl = (url) => {
    return url && url.includes('embed.api.video');
  };

  useEffect(() => {
    // Check authentication first
    const token = getAuthToken();
    if (!token) {
      handleAuthError();
      return;
    }

    // Function to fetch initial data
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);

        const response = await authenticatedFetch(`${API_BASE_URL}/dashboard-data`);
        const data = await response.json();

        setAssignments(data.assignments || []);
        setStats(data.stats || calculateStats(data.assignments || []));
        setEditorProfile(data.editor_profile || null);
        setConnectionStatus('Connected');
        console.log('Initial editor data loaded:', data);

      } catch (error) {
        console.error("Failed to fetch initial editor data:", error);
        setConnectionStatus('Error loading data');
        if (error.message.includes('authentication') || error.message.includes('Session expired')) {
          handleAuthError();
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Function to establish SSE connection
    const establishSSEConnection = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const token = getAuthToken();
      if (!token) {
        handleAuthError();
        return;
      }

      // ✅ Pass token as query parameter for SSE (since headers don't work)
      const sseUrl = `${API_BASE_URL}/dashboard-stream?token=${encodeURIComponent(token)}`;
      const eventSource = new EventSource(sseUrl);

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("Editor SSE connection established.");
        setConnectionStatus('Connected');
      };

      // Listen for editor-specific updates
      eventSource.addEventListener('editor-update', (event) => {
        try {
          console.log("Raw editor event data:", event.data);
          const updateData = JSON.parse(event.data);
          console.log("Parsed editor update data:", updateData);
          setLastUpdate(new Date().toLocaleTimeString());

          // Handle different types of editor events
          if (updateData.event === 'new_assignment') {
            console.log("New assignment received:", updateData);
            setAssignments(prevAssignments => {
              const exists = prevAssignments.some(a => a.assignment_id === updateData.assignment_id);
              if (!exists) {
                const newAssignment = {
                  assignment_id: updateData.assignment_id,
                  submission_id: updateData.video_submission_id,
                  video_url: updateData.video_url,
                  volunteer_name: updateData.volunteer_name,
                  manager_name: updateData.assigned_editor_name || 'Unknown Manager',
                  manager_id: updateData.assigned_manager_id,
                  assignment_status: updateData.status,
                  submission_status: updateData.submission_status,
                  assigned_at: updateData.assigned_at,
                  completed_at: null,
                  completed_video_url: null,
                  editor_notes: null,
                  manager_notes: null,
                  revision_notes: null,
                  received_at: null
                };
                const updatedAssignments = [newAssignment, ...prevAssignments];
                setStats(calculateStats(updatedAssignments));
                return updatedAssignments;
              }
              return prevAssignments;
            });
          } else if (updateData.event === 'assignment_update') {
            console.log("Assignment status updated:", updateData);
            setAssignments(prevAssignments => {
              const updatedAssignments = prevAssignments.map(assignment =>
                assignment.assignment_id === updateData.assignment_id
                  ? {
                    ...assignment,
                    assignment_status: updateData.status,
                    completed_video_url: updateData.completed_video_url,
                    completed_at: updateData.completed_at,
                    editor_notes: updateData.editor_notes,
                    revision_notes: updateData.revision_notes
                  }
                  : assignment
              );
              setStats(calculateStats(updatedAssignments));
              return updatedAssignments;
            });
          }
        } catch (error) {
          console.error("Error parsing editor SSE data:", error);
        }
      });

      // Listen for keep-alive messages
      eventSource.addEventListener('keep-alive', (event) => {
        console.log("Editor keep-alive received:", event.data);
      });

      eventSource.onerror = (error) => {
        console.error("Editor SSE error:", error);
        setConnectionStatus('Connection Error');

        // Check if it's an auth error (401)
        if (error.target && error.target.readyState === EventSource.CLOSED) {
          setTimeout(() => {
            const currentToken = getAuthToken();
            if (currentToken) {
              console.log("Attempting to reconnect editor SSE...");
              establishSSEConnection();
            } else {
              handleAuthError();
            }
          }, 5000);
        }
      };
    };

    // Initialize the editor dashboard
    fetchInitialData();
    establishSSEConnection();

    // Cleanup function
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [navigate]);

  // Handle opening completion modal
  const handleOpenModal = (assignment) => {
    setSelectedAssignment(assignment);
    setCompletedVideoUrl('');
    setEditorNotes(assignment.editor_notes || '');
    setShowModal(true);
  };

  // Handle closing completion modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAssignment(null);
    setCompletedVideoUrl('');
    setEditorNotes('');
  };

  // Handle opening revision modal
  const handleOpenRevisionModal = (assignment) => {
    setSelectedAssignment(assignment);
    setRevisionNotes('');
    setShowRevisionModal(true);
  };

  // Handle closing revision modal
  const handleCloseRevisionModal = () => {
    setShowRevisionModal(false);
    setSelectedAssignment(null);
    setRevisionNotes('');
  };

  // Handle assignment completion
  const handleCompleteAssignment = async () => {
    if (!completedVideoUrl || !completedVideoUrl.trim()) {
      alert('Please provide the completed video URL.');
      return;
    }

    try {
      const url = new URL(`${API_BASE_URL}/complete-assignment`);
      url.searchParams.append('assignment_id', selectedAssignment.assignment_id);
      url.searchParams.append('completed_video_url', completedVideoUrl.trim());

      if (editorNotes && editorNotes.trim()) {
        url.searchParams.append('editor_notes', editorNotes.trim());
      }

      const response = await authenticatedFetch(url.toString(), { method: 'POST' });
      const result = await response.json();

      console.log("Assignment completed successfully:", result);

      // Update assignments and stats immediately
      setAssignments(prevAssignments => {
        const updatedAssignments = prevAssignments.map(assignment =>
          assignment.assignment_id === selectedAssignment.assignment_id
            ? {
              ...assignment,
              assignment_status: 'COMPLETED',
              completed_video_url: completedVideoUrl.trim(),
              completed_at: new Date().toISOString(),
              editor_notes: editorNotes.trim() || assignment.editor_notes
            }
            : assignment
        );
        setStats(calculateStats(updatedAssignments));
        return updatedAssignments;
      });

      handleCloseModal();

    } catch (error) {
      console.error("Error completing assignment:", error);
      alert(`Error: ${error.message}`);
    }
  };

  // Handle revision request
  const handleRequestRevision = async () => {
    if (!revisionNotes || !revisionNotes.trim()) {
      alert('Please provide a reason for revision.');
      return;
    }

    try {
      const url = new URL(`${API_BASE_URL}/request-revision`);
      url.searchParams.append('assignment_id', selectedAssignment.assignment_id);
      url.searchParams.append('revision_notes', revisionNotes.trim());

      const response = await authenticatedFetch(url.toString(), { method: 'POST' });
      const result = await response.json();

      console.log("Revision requested successfully:", result);

      // Update assignments and stats immediately
      setAssignments(prevAssignments => {
        const updatedAssignments = prevAssignments.map(assignment =>
          assignment.assignment_id === selectedAssignment.assignment_id
            ? {
              ...assignment,
              assignment_status: 'REVISION_NEEDED',
              revision_notes: revisionNotes.trim(),
              updated_at: new Date().toISOString()
            }
            : assignment
        );
        setStats(calculateStats(updatedAssignments));
        return updatedAssignments;
      });

      handleCloseRevisionModal();

    } catch (error) {
      console.error("Error requesting revision:", error);
      alert(`Error: ${error.message}`);
    }
  };

  // Filter assignments based on current view
  const filteredAssignments = assignments.filter(assignment => {
    switch (currentView) {
      case 'in_progress':
        return assignment.assignment_status === 'IN_PROGRESS';
      case 'completed':
        return assignment.assignment_status === 'COMPLETED';
      case 'revision_needed':
        return assignment.assignment_status === 'REVISION_NEEDED';
      default:
        return false;
    }
  });

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString();
    } catch (_) {
      return dateTimeString;
    }
  };

  if (isLoading) {
    return (
      <div className="editor-dashboard-layout">
        <div className="loading-container">
          <h2>Loading Editor Dashboard...</h2>
          <p>Please wait while we fetch your assignments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-dashboard-layout">
      {/* Main Content */}
      <main className="editor-dashboard-main">
        <header className="editor-dashboard-header">
          <h1>Editor Dashboard</h1>
          <p>Your assigned video editing tasks.</p>
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

        {/* Filter Tabs - Now with live updating counts */}
        <div className="editor-tabs">
          <button
            className={`tab-button ${currentView === 'in_progress' ? 'active' : ''}`}
            onClick={() => setCurrentView('in_progress')}
          >
            In Progress ({stats.in_progress})
          </button>
          <button
            className={`tab-button ${currentView === 'completed' ? 'active' : ''}`}
            onClick={() => setCurrentView('completed')}
          >
            Completed ({stats.completed})
          </button>
          <button
            className={`tab-button ${currentView === 'revision_needed' ? 'active' : ''}`}
            onClick={() => setCurrentView('revision_needed')}
          >
            Revision Needed ({stats.revision_needed})
          </button>
        </div>

        {/* Task Grid Container - IMPROVED SCROLLING AND SPACING */}
        <div className="task-grid-container">
          <div className="task-grid">
            {filteredAssignments.length === 0 ? (
              <div className="no-tasks">
                <h3>No {currentView.replace('_', ' ')} assignments found</h3>
                <p>Assignments will appear here when they are available.</p>
              </div>
            ) : (
              filteredAssignments.map((assignment) => {
                const dateClassification = getDateClassification(assignment.assigned_at);
                const dateTag = getDateTag(dateClassification);

                return (
                  <div key={assignment.assignment_id} className={`task-card status-${assignment.assignment_status.toLowerCase()}`}>
                    {/* Video Preview */}
                    <div className="task-card__preview">
                      {assignment.video_url ? (
                        isApiVideoUrl(assignment.video_url) ? (
                          <iframe
                            src={assignment.video_url}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            scrolling="no"
                            allowFullScreen
                            style={{
                              width: '100%',
                              height: '100%',
                              border: 'none',
                              borderRadius: '0'
                            }}
                            title={`Video by ${assignment.volunteer_name}`}
                          />
                        ) : (
                          <video 
                            controls 
                            style={{ 
                              width: '100%', 
                              height: '100%',
                              borderRadius: '0'
                            }}
                          >
                            <source src={assignment.video_url} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        )
                      ) : (
                        <div className="video-placeholder">
                          <p>Video Preview</p>
                          <small>Loading...</small>
                        </div>
                      )}
                    </div>

                    {/* Assignment Details */}
                    <div className="task-card__details">
                      <h3 className="task-card__title">Video Assignment</h3>
                      
                      <div className="task-card__info-grid">
                        <div className="info-item">
                          <span className="info-label">From:</span>
                          <span className="info-value">{assignment.volunteer_name}</span>
                        </div>
                        
                        <div className="info-item">
                          <span className="info-label">Assigned by:</span>
                          <span className="info-value">{assignment.manager_name || 'Unknown Manager'}</span>
                        </div>
                        
                        <div className="info-item">
                          <span className="info-label">Assigned:</span>
                          <span className="info-value">{formatDateTimeWithClassification(assignment.assigned_at)}</span>
                        </div>
                        
                        <div className="info-item">
                          <span className="info-label">Status:</span>
                          <span className={`status-badge status-${assignment.assignment_status.toLowerCase().replace('_', '-')}`}>
                            {assignment.assignment_status.replace('_', ' ')}
                          </span>
                        </div>

                        {assignment.completed_at && (
                          <div className="info-item">
                            <span className="info-label">Completed:</span>
                            <span className="info-value">{formatDateTime(assignment.completed_at)}</span>
                          </div>
                        )}

                        {assignment.completed_video_url && (
                          <div className="info-item completed-video">
                            <span className="info-label">Final Video:</span>
                            <a href={assignment.completed_video_url} target="_blank" rel="noopener noreferrer" className="video-link">
                              View Final Video
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Notes Section */}
                      <div className="task-card__notes-section">
                        {assignment.manager_notes && (
                          <div className="note-item">
                            <span className="note-label">Manager Notes:</span>
                            <p className="note-content">{assignment.manager_notes}</p>
                          </div>
                        )}

                        {assignment.editor_notes && (
                          <div className="note-item">
                            <span className="note-label">My Notes:</span>
                            <p className="note-content">{assignment.editor_notes}</p>
                          </div>
                        )}

                        {assignment.revision_notes && (
                          <div className="note-item revision-notes">
                            <span className="note-label">Revision Notes:</span>
                            <p className="note-content">{assignment.revision_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - UPDATED FOR REVISION NEEDED */}
                    {(assignment.assignment_status === 'IN_PROGRESS' || assignment.assignment_status === 'REVISION_NEEDED') && (
                      <div className="task-card__actions">
                        <button
                          className="btn btn--primary"
                          onClick={() => handleOpenModal(assignment)}
                        >
                          {assignment.assignment_status === 'REVISION_NEEDED' 
                            ? 'Submit Revised Version' 
                            : 'Complete Assignment'
                          }
                        </button>

                        {assignment.assignment_status === 'IN_PROGRESS' && (
                          <button
                            className="btn btn--warning"
                            onClick={() => handleOpenRevisionModal(assignment)}
                          >
                            Request Revision
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Sidebar */}
      <aside className="editor-dashboard-sidebar">
        <div className="sidebar-profile">
          <div className="sidebar-profile__avatar">
            {editorProfile?.full_name?.charAt(0) || 'E'}
          </div>
          <h2 className="sidebar-profile__name">
            {editorProfile?.full_name || 'Editor Name'}
          </h2>
          <p className="sidebar-profile__email">
            {editorProfile?.email || 'editor@kaizernews.com'}
          </p>
        </div>

        <div className="sidebar-stats">
          <h3 className="sidebar-title">Your Stats</h3>
          <div className="stat-item">
            <span className="stat-item__label">Total Assignments</span>
            <span className="stat-item__value">{stats.total_assignments}</span>
          </div>
          <div className="stat-item">
            <span className="stat-item__label">In Progress</span>
            <span className="stat-item__value">{stats.in_progress}</span>
          </div>
          <div className="stat-item">
            <span className="stat-item__label">Completed</span>
            <span className="stat-item__value">{stats.completed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-item__label">Revision Needed</span>
            <span className="stat-item__value">{stats.revision_needed}</span>
          </div>
        </div>

        {/* <Link to="/" className="sidebar-link">Back to Home</Link> */}

        <LogoutButton
          className="sidebar-link"
          onBeforeLogout={() => {
            if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; } // stop SSE [web:3]
          }}
        />
      </aside>

      {/* Completion Modal - UPDATED TITLE */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>
              {selectedAssignment?.assignment_status === 'REVISION_NEEDED' 
                ? 'Submit Revised Assignment' 
                : 'Complete Assignment'
              }
            </h2>
            <div className="assignment-context">
              <p><strong>Video from:</strong> {selectedAssignment?.volunteer_name}</p>
              <p><strong>Assigned by:</strong> {selectedAssignment?.manager_name || 'Unknown Manager'}</p>
              <p><strong>Assigned on:</strong> {formatDateTime(selectedAssignment?.assigned_at)}</p>
              <p><strong>Current Status:</strong>
                <span className={`status-badge status-${selectedAssignment?.assignment_status.toLowerCase().replace('_', '-')}`} style={{ marginLeft: '8px' }}>
                  {selectedAssignment?.assignment_status.replace('_', ' ')}
                </span>
              </p>
              {selectedAssignment?.manager_notes && (
                <p><strong>Manager Instructions:</strong> <em>{selectedAssignment.manager_notes}</em></p>
              )}
              {selectedAssignment?.revision_notes && (
                <p><strong>Revision Notes:</strong> <em>{selectedAssignment.revision_notes}</em></p>
              )}
            </div>

            <div className="modal-form">
              <label htmlFor="completed-url">
                {selectedAssignment?.assignment_status === 'REVISION_NEEDED' 
                  ? 'Revised Video URL *' 
                  : 'Completed Video URL *'
                }
              </label>
              <input
                id="completed-url"
                type="text"
                className="modal-input"
                placeholder="https://example.com/edited_video.mp4"
                value={completedVideoUrl}
                onChange={(e) => setCompletedVideoUrl(e.target.value)}
                required
              />

              <label htmlFor="editor-notes">Editor Notes (Optional)</label>
              <textarea
                id="editor-notes"
                className="modal-textarea"
                placeholder={selectedAssignment?.assignment_status === 'REVISION_NEEDED' 
                  ? 'Add notes about the revisions made...' 
                  : 'Add any notes about the editing process...'
                }
                value={editorNotes}
                onChange={(e) => setEditorNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={handleCloseModal}>
                Cancel
              </button>
              <button className="btn btn--primary" onClick={handleCompleteAssignment}>
                {selectedAssignment?.assignment_status === 'REVISION_NEEDED' 
                  ? 'Submit Revised Version' 
                  : 'Complete Assignment'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Modal */}
      {showRevisionModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Request Revision</h2>
            <div className="assignment-context revision-context">
              <p><strong>Video from:</strong> {selectedAssignment?.volunteer_name}</p>
              <p><strong>Assigned by:</strong> {selectedAssignment?.manager_name || 'Unknown Manager'}</p>
              <p><strong>Assigned on:</strong> {formatDateTime(selectedAssignment?.assigned_at)}</p>
              {selectedAssignment?.manager_notes && (
                <p><strong>Manager Instructions:</strong> <em>{selectedAssignment.manager_notes}</em></p>
              )}
            </div>

            <div className="modal-form">
              <label htmlFor="revision-notes">Reason for Revision *</label>
              <textarea
                id="revision-notes"
                className="modal-textarea"
                placeholder="Explain why this assignment needs revision..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={handleCloseRevisionModal}>
                Cancel
              </button>
              <button className="btn btn--warning" onClick={handleRequestRevision}>
                Request Revision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
