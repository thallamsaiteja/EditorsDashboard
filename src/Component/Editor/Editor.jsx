import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Editor.css';

// The base URL for your FastAPI backend
const API_BASE_URL = 'http://localhost:8000/api/v1/editor';

// Default editor ID (temporary until auth is complete)
const DEFAULT_EDITOR_ID = "5b6a490e-25df-4011-ae79-1a0dd4fb1fa4";

export default function EditorPage() {
  const [assignments, setAssignments] = useState([]);
  const [editorProfile, setEditorProfile] = useState(null);
  const [stats, setStats] = useState({ total_assignments: 0, in_progress: 0, completed: 0, revision_needed: 0 });
  const [currentView, setCurrentView] = useState('in_progress'); // 'in_progress', 'completed', 'revision_needed'
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [completedVideoUrl, setCompletedVideoUrl] = useState('');
  const [editorNotes, setEditorNotes] = useState('');
  const eventSourceRef = useRef(null);

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

  // Helper function to check if URL is an api.video embed URL
  const isApiVideoUrl = (url) => {
    return url && url.includes('embed.api.video');
  };

  // Helper function to handle video download
  const handleDownload = async (videoUrl, volunteerName, assignmentId) => {
    if (!videoUrl) {
      alert('No video URL available for download');
      return;
    }

    try {
      // For api.video URLs, we need to extract the actual video file URL
      if (isApiVideoUrl(videoUrl)) {
        // Open in new tab since api.video embed URLs can't be directly downloaded
        window.open(videoUrl, '_blank');
        return;
      }

      // For direct video URLs, trigger download
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `video_${volunteerName}_${assignmentId.slice(0, 8)}.mp4`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab
      window.open(videoUrl, '_blank');
    }
  };

  useEffect(() => {
    // Function to fetch initial data
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/dashboard-data?editor_id=${DEFAULT_EDITOR_ID}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAssignments(data.assignments || []);
        setStats(data.stats || { total_assignments: 0, in_progress: 0, completed: 0, revision_needed: 0 });
        setEditorProfile(data.editor_profile || null);
        setConnectionStatus('Connected');
        console.log('Initial editor data loaded:', data);
      } catch (error) {
        console.error("Failed to fetch initial editor data:", error);
        setConnectionStatus('Error loading data');
      } finally {
        setIsLoading(false);
      }
    };

    // Function to establish SSE connection
    const establishSSEConnection = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`${API_BASE_URL}/dashboard-stream?editor_id=${DEFAULT_EDITOR_ID}`);
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
                  manager_name: updateData.assigned_editor_name || 'Unknown Manager', // Updated
                  manager_id: updateData.assigned_manager_id, // Added
                  assignment_status: updateData.status,
                  submission_status: updateData.submission_status,
                  assigned_at: updateData.assigned_at,
                  completed_at: null,
                  completed_video_url: null,
                  editor_notes: null,
                  manager_notes: null,
                  received_at: null
                };
                return [newAssignment, ...prevAssignments];
              }
              return prevAssignments;
            });
          } else if (updateData.event === 'assignment_update') {
            console.log("Assignment status updated:", updateData);
            setAssignments(prevAssignments =>
              prevAssignments.map(assignment =>
                assignment.assignment_id === updateData.assignment_id
                  ? {
                    ...assignment,
                    assignment_status: updateData.status,
                    completed_video_url: updateData.completed_video_url,
                    completed_at: updateData.completed_at,
                    editor_notes: updateData.editor_notes
                  }
                  : assignment
              )
            );
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
        setTimeout(() => {
          if (eventSource.readyState === EventSource.CLOSED) {
            console.log("Attempting to reconnect editor SSE...");
            establishSSEConnection();
          }
        }, 5000);
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
  }, []);

  // Handle opening completion modal
  const handleOpenModal = (assignment) => {
    setSelectedAssignment(assignment);
    setCompletedVideoUrl('');
    setEditorNotes(assignment.editor_notes || '');
    setShowModal(true);
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAssignment(null);
    setCompletedVideoUrl('');
    setEditorNotes('');
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
      url.searchParams.append('editor_id', DEFAULT_EDITOR_ID);

      if (editorNotes && editorNotes.trim()) {
        url.searchParams.append('editor_notes', editorNotes.trim());
      }

      const response = await fetch(url.toString(), { method: 'POST' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to complete assignment');
      }

      const result = await response.json();
      console.log("Assignment completed successfully:", result);

      // The SSE will update the UI automatically, but we can also update locally
      setAssignments(prevAssignments =>
        prevAssignments.map(assignment =>
          assignment.assignment_id === selectedAssignment.assignment_id
            ? {
              ...assignment,
              assignment_status: 'COMPLETED',
              completed_video_url: completedVideoUrl.trim(),
              completed_at: new Date().toISOString(),
              editor_notes: editorNotes.trim() || assignment.editor_notes
            }
            : assignment
        )
      );

      handleCloseModal();
    } catch (error) {
      console.error("Error completing assignment:", error);
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

        {/* Filter Tabs */}
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

        {/* Task Grid */}
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
                  {/* Date Tag */}
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 10,
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    backgroundColor: dateClassification === 'today' ? '#d4edda' :
                      dateClassification === 'yesterday' ? '#fff3cd' : '#f8d7da',
                    color: dateClassification === 'today' ? '#155724' :
                      dateClassification === 'yesterday' ? '#856404' : '#721c24',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    pointerEvents: 'none'
                  }}>
                    {dateTag.text}
                  </div>

                  {/* Download Button */}
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 10
                  }}>
                    <button
                      className="btn btn--download"
                      onClick={() => handleDownload(assignment.video_url, assignment.volunteer_name, assignment.assignment_id)}
                      title="Download video"
                      style={{
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '14px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#0056b3';
                        e.target.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#007bff';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      ⬇
                    </button>
                  </div>

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
                            borderRadius: '4px'
                          }}
                          title={`Video by ${assignment.volunteer_name}`}
                        />
                      ) : (
                        <video controls style={{ width: '100%', height: '100%' }}>
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

                  {/* Assignment Details - Updated with Manager Info */}
                  <div className="task-card__details">
                    <h3 className="task-card__title">Video Assignment</h3>
                    <p className="task-card__meta"><strong>From:</strong> {assignment.volunteer_name}</p>
                    <p className="task-card__meta"><strong>Assigned by:</strong> {assignment.manager_name || 'Unknown Manager'}</p>
                    <p className="task-card__meta"><strong>Assigned:</strong> {formatDateTime(assignment.assigned_at)}</p>
                    <p className="task-card__meta"><strong>Status:</strong>
                      <span className={`status-badge status-${assignment.assignment_status.toLowerCase().replace('_', '-')}`}>
                        {assignment.assignment_status.replace('_', ' ')}
                      </span>
                    </p>

                    {assignment.completed_at && (
                      <p className="task-card__meta"><strong>Completed:</strong> {formatDateTime(assignment.completed_at)}</p>
                    )}

                    {assignment.completed_video_url && (
                      <p className="task-card__meta--completed">
                        <strong>Final Video:</strong> <a href={assignment.completed_video_url} target="_blank" rel="noopener noreferrer">View</a>
                      </p>
                    )}

                    {assignment.manager_notes && (
                      <p className="task-card__notes"><strong>Manager Notes:</strong> <em>{assignment.manager_notes}</em></p>
                    )}

                    {assignment.editor_notes && (
                      <p className="task-card__notes"><strong>My Notes:</strong> <em>{assignment.editor_notes}</em></p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {assignment.assignment_status === 'IN_PROGRESS' && (
                    <div className="task-card__actions">
                      <button
                        className="btn btn--primary"
                        onClick={() => handleOpenModal(assignment)}
                      >
                        Complete Assignment
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
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

        <Link to="/" className="sidebar-link">Back to Home</Link>
      </aside>

      {/* Completion Modal - Enhanced with Manager Context */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Complete Assignment</h2>
            <div className="assignment-context" style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #e9ecef'
            }}>
              <p><strong>Video from:</strong> {selectedAssignment?.volunteer_name}</p>
              <p><strong>Assigned by:</strong> {selectedAssignment?.manager_name || 'Unknown Manager'}</p>
              <p><strong>Assigned on:</strong> {formatDateTime(selectedAssignment?.assigned_at)}</p>
              {selectedAssignment?.manager_notes && (
                <p><strong>Manager Instructions:</strong> <em>{selectedAssignment.manager_notes}</em></p>
              )}
            </div>

            <div className="modal-form">
              <label htmlFor="completed-url">Completed Video URL *</label>
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
                placeholder="Add any notes about the editing process..."
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
                Complete Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
