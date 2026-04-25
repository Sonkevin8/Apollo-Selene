import React, { useEffect, useState } from 'react';

const EVENTS_STORAGE_KEY = 'apollo-selene-events';
const GUEST_LISTS_STORAGE_KEY = 'apollo-selene-guest-lists';
const USER_ATTENDANCE_STORAGE_KEY = 'apollo-selene-user-attendance';
const ATTENDANCE_DETAILS_STORAGE_KEY = 'apollo-selene-attendance-details';
const CURRENT_USER_ID_STORAGE_KEY = 'apollo-selene-current-user-id';

const defaultEvents = [
  {
    id: 1,
    title: 'Sunroom Sketch Night',
    date: '2024-12-28',
    time: '2:00 PM - 5:00 PM',
    location: 'Apollo Selene Lounge',
    description: 'A relaxed creative evening with sketch materials, soft music, and plenty of room to unwind before or after conversation.',
    poster: 'https://images.pexels.com/photos/1109541/pexels-photo-1109541.jpeg?auto=compress&cs=tinysrgb&w=400',
    attendees: 23,
    maxAttendees: 50
  },
  {
    id: 2,
    title: 'Moonlight Story Circle',
    date: '2025-01-05',
    time: '7:00 PM - 9:00 PM',
    location: 'Riverside Quiet Room',
    description: 'A low-pressure gathering for listening, reflecting, and sharing stories at your own pace in a calm environment.',
    poster: 'https://images.pexels.com/photos/1708936/pexels-photo-1708936.jpeg?auto=compress&cs=tinysrgb&w=400',
    attendees: 15,
    maxAttendees: 30
  },
  {
    id: 3,
    title: 'Apollo Selene Open House',
    date: '2025-01-15',
    time: '6:00 PM - 10:00 PM',
    location: 'The Lantern Hall',
    description: 'Meet the community, explore upcoming plans, and enjoy a welcoming night designed for easy conversation and gentle connection.',
    poster: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400',
    attendees: 42,
    maxAttendees: 100
  }
];

const initialGuestLists = {
  1: ['Ari M.', 'Nadia K.', 'Leah P.', 'Jasper T.', 'Mina R.'],
  2: ['Rowan C.', 'Elio S.', 'Nora V.', 'Priya N.'],
  3: ['Noah L.', 'Anya B.', 'Sofia R.', 'Mason K.', 'Iris D.', 'Kai M.']
};

const createGuestId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getCurrentUserId = () => {
  if (typeof window === 'undefined') {
    return 'server-user';
  }

  const existingUserId = window.localStorage.getItem(CURRENT_USER_ID_STORAGE_KEY);
  if (existingUserId) {
    return existingUserId;
  }

  const newUserId = `user-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(CURRENT_USER_ID_STORAGE_KEY, newUserId);
  return newUserId;
};

const normalizeGuestEntry = (entry, index) => {
  if (typeof entry === 'string') {
    return {
      id: `legacy-${index}-${entry}`,
      name: entry,
      contact: '',
      addedBy: null
    };
  }

  return {
    id: entry?.id || createGuestId(),
    name: entry?.name || '',
    contact: entry?.contact || '',
    addedBy: entry?.addedBy || null
  };
};

const normalizeGuestLists = (guestLists) => {
  const normalized = {};

  Object.entries(guestLists || {}).forEach(([eventId, entries]) => {
    normalized[eventId] = (entries || [])
      .map((entry, index) => normalizeGuestEntry(entry, index))
      .filter((entry) => entry.name);
  });

  return normalized;
};

const isValidContact = (value) => {
  const trimmedValue = value.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^\+?[\d\s().-]{7,20}$/;

  return emailPattern.test(trimmedValue) || phonePattern.test(trimmedValue);
};

const getStoredJson = (key, fallbackValue) => {
  if (typeof window === 'undefined') {
    return fallbackValue;
  }

  try {
    const savedValue = window.localStorage.getItem(key);
    if (!savedValue) {
      return fallbackValue;
    }

    return JSON.parse(savedValue);
  } catch (error) {
    return fallbackValue;
  }
};

const Events = () => {
  const [events, setEvents] = useState(() => getStoredJson(EVENTS_STORAGE_KEY, defaultEvents));

  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    poster: '',
    maxAttendees: 50
  });
  const [editingEventId, setEditingEventId] = useState(null);
  const [editEventData, setEditEventData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    poster: '',
    maxAttendees: 50
  });
  const [userAttendance, setUserAttendance] = useState(
    () => new Set(getStoredJson(USER_ATTENDANCE_STORAGE_KEY, []))
  );
  const [currentUserId] = useState(() => getCurrentUserId());
  const [attendanceDetails, setAttendanceDetails] = useState(
    () => getStoredJson(ATTENDANCE_DETAILS_STORAGE_KEY, {})
  );
  const [eventGuestLists, setEventGuestLists] = useState(
    () => normalizeGuestLists(getStoredJson(GUEST_LISTS_STORAGE_KEY, initialGuestLists))
  );
  const [openGuestListForEvent, setOpenGuestListForEvent] = useState(null);
  const [showAttendConfirm, setShowAttendConfirm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [attendeeForm, setAttendeeForm] = useState({ name: '', contact: '' });
  const [showAddGuestForm, setShowAddGuestForm] = useState(false);
  const [extraGuestForm, setExtraGuestForm] = useState({ name: '', contact: '' });
  const [attendeeContactError, setAttendeeContactError] = useState('');
  const [extraGuestContactError, setExtraGuestContactError] = useState('');

  useEffect(() => {
    window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    window.localStorage.setItem(GUEST_LISTS_STORAGE_KEY, JSON.stringify(eventGuestLists));
  }, [eventGuestLists]);

  useEffect(() => {
    window.localStorage.setItem(
      USER_ATTENDANCE_STORAGE_KEY,
      JSON.stringify(Array.from(userAttendance))
    );
  }, [userAttendance]);

  useEffect(() => {
    window.localStorage.setItem(
      ATTENDANCE_DETAILS_STORAGE_KEY,
      JSON.stringify(attendanceDetails)
    );
  }, [attendanceDetails]);

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple admin check (in real app, this would be secure authentication)
    if (loginData.username === 'admin' && loginData.password === 'apolloselene2024') {
      setIsAdmin(true);
      setShowLogin(false);
      setLoginData({ username: '', password: '' });
    } else {
      alert('Invalid credentials. Try username: admin, password: apolloselene2024');
    }
  };

  const handleAddEvent = (e) => {
    e.preventDefault();
    const event = {
      ...newEvent,
      id: Date.now(),
      attendees: 0,
      updatedAt: new Date().toISOString()
    };
    setEvents([...events, event]);
    setNewEvent({
      title: '',
      date: '',
      time: '',
      location: '',
      description: '',
      poster: '',
      maxAttendees: 50
    });
    setEventGuestLists((prev) => ({ ...prev, [event.id]: [] }));
    setShowAddEvent(false);
  };

  const openEditEventModal = (event) => {
    setEditingEventId(event.id);
    setEditEventData({
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      description: event.description,
      poster: event.poster,
      maxAttendees: event.maxAttendees
    });
    setShowEditEvent(true);
  };

  const closeEditEventModal = () => {
    setShowEditEvent(false);
    setEditingEventId(null);
    setEditEventData({
      title: '',
      date: '',
      time: '',
      location: '',
      description: '',
      poster: '',
      maxAttendees: 50
    });
  };

  const handleEditEvent = (e) => {
    e.preventDefault();
    if (!editingEventId) {
      return;
    }

    const parsedMaxAttendees = Number(editEventData.maxAttendees);
    const safeMaxAttendees = Number.isFinite(parsedMaxAttendees) && parsedMaxAttendees > 0
      ? parsedMaxAttendees
      : 1;

    setEvents((prev) =>
      prev.map((event) =>
        event.id === editingEventId
          ? {
              ...event,
              ...editEventData,
              maxAttendees: safeMaxAttendees,
              attendees: Math.min(event.attendees, safeMaxAttendees),
              updatedAt: new Date().toISOString()
            }
          : event
      )
    );

    closeEditEventModal();
  };

  const handleDeleteEvent = (eventId) => {
    const eventToDelete = events.find((event) => event.id === eventId);
    if (!eventToDelete) {
      return;
    }

    const confirmed = window.confirm(`Remove "${eventToDelete.title}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setEvents((prev) => prev.filter((event) => event.id !== eventId));
    setEventGuestLists((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setAttendanceDetails((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setUserAttendance((prev) => {
      const next = new Set(prev);
      next.delete(eventId);
      return next;
    });

    if (openGuestListForEvent === eventId) {
      closeGuestListModal();
    }
    if (selectedEventId === eventId) {
      closeAttendConfirm();
    }
    if (editingEventId === eventId) {
      closeEditEventModal();
    }
  };

  const closeAttendConfirm = () => {
    setShowAttendConfirm(false);
    setSelectedEventId(null);
    setAttendeeForm({ name: '', contact: '' });
    setAttendeeContactError('');
  };

  const openAttendConfirm = (eventId) => {
    setSelectedEventId(eventId);
    setShowAttendConfirm(true);
  };

  const confirmAttendance = (e) => {
    e.preventDefault();

    const event = events.find((item) => item.id === selectedEventId);
    if (!event || event.attendees >= event.maxAttendees) {
      closeAttendConfirm();
      return;
    }

    setUserAttendance((prev) => new Set([...prev, selectedEventId]));
    const attendeeName = attendeeForm.name.trim();
    const attendeeContact = attendeeForm.contact.trim();
    if (!isValidContact(attendeeContact)) {
      setAttendeeContactError('Enter a valid email or phone number.');
      return;
    }

    setAttendeeContactError('');
    const existingGuest = (eventGuestLists[selectedEventId] || []).find(
      (guest) =>
        guest.addedBy === currentUserId &&
        guest.name.toLowerCase() === attendeeName.toLowerCase()
    );
    const attendeeGuestId = existingGuest?.id || createGuestId();

    setAttendanceDetails((prev) => ({
      ...prev,
      [selectedEventId]: {
        name: attendeeName,
        contact: attendeeContact,
        guestId: attendeeGuestId
      }
    }));
    setEventGuestLists((prev) => {
      const currentGuests = prev[selectedEventId] || [];
      if (currentGuests.some((guest) => guest.id === attendeeGuestId)) {
        return prev;
      }

      return {
        ...prev,
        [selectedEventId]: [
          ...currentGuests,
          {
            id: attendeeGuestId,
            name: attendeeName,
            contact: attendeeContact,
            addedBy: currentUserId
          }
        ]
      };
    });
    setEvents((prev) =>
      prev.map((item) =>
        item.id === selectedEventId
          ? { ...item, attendees: item.attendees + 1 }
          : item
      )
    );

    closeAttendConfirm();
  };

  const handleAttendEvent = (eventId) => {
    if (userAttendance.has(eventId)) {
      const attendeeName = attendanceDetails[eventId]?.name;
      const attendeeGuestId = attendanceDetails[eventId]?.guestId;

      // User is already attending, remove them
      setUserAttendance(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      setAttendanceDetails((prev) => {
        const updatedDetails = { ...prev };
        delete updatedDetails[eventId];
        return updatedDetails;
      });
      if (attendeeName) {
        setEventGuestLists((prev) => ({
          ...prev,
          [eventId]: (prev[eventId] || []).filter((guest) => {
            if (attendeeGuestId) {
              return guest.id !== attendeeGuestId;
            }

            return !(guest.name === attendeeName && guest.addedBy === currentUserId);
          })
        }));
      }
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, attendees: Math.max(0, event.attendees - 1) }
          : event
      ));
    } else {
      // User wants to attend
      const event = events.find(e => e.id === eventId);
      if (event && event.attendees < event.maxAttendees) {
        openAttendConfirm(eventId);
      }
    }
  };

  const toggleGuestList = (eventId) => {
    setShowAddGuestForm(false);
    setExtraGuestForm({ name: '', contact: '' });
    setOpenGuestListForEvent((prev) => (prev === eventId ? null : eventId));
  };

  const closeGuestListModal = () => {
    setOpenGuestListForEvent(null);
    setShowAddGuestForm(false);
    setExtraGuestForm({ name: '', contact: '' });
    setExtraGuestContactError('');
  };

  const openAddGuestForm = () => {
    setExtraGuestContactError('');
    setShowAddGuestForm(true);
  };

  const handleAddAnotherGuest = (e) => {
    e.preventDefault();

    const eventId = openGuestListForEvent;
    const event = events.find((item) => item.id === eventId);
    if (!event || event.attendees >= event.maxAttendees) {
      return;
    }

    const guestName = extraGuestForm.name.trim();
    const guestContact = extraGuestForm.contact.trim();
    if (!guestName || !guestContact) {
      return;
    }

    if (!isValidContact(guestContact)) {
      setExtraGuestContactError('Enter a valid email or phone number.');
      return;
    }

    setExtraGuestContactError('');

    let addedGuest = false;
    setEventGuestLists((prev) => {
      const currentGuests = prev[eventId] || [];
      const duplicateGuest = currentGuests.some(
        (guest) =>
          guest.addedBy === currentUserId &&
          guest.name.toLowerCase() === guestName.toLowerCase()
      );
      if (duplicateGuest) {
        return prev;
      }

      addedGuest = true;
      return {
        ...prev,
        [eventId]: [
          ...currentGuests,
          {
            id: createGuestId(),
            name: guestName,
            contact: guestContact,
            addedBy: currentUserId
          }
        ]
      };
    });

    if (addedGuest) {
      setEvents((prev) =>
        prev.map((item) =>
          item.id === eventId
            ? { ...item, attendees: Math.min(item.maxAttendees, item.attendees + 1) }
            : item
        )
      );
    }

    setExtraGuestForm({ name: '', contact: '' });
    setShowAddGuestForm(false);
  };

  const removeGuestFromEvent = (eventId, guestId) => {
    const guest = (eventGuestLists[eventId] || []).find((entry) => entry.id === guestId);
    if (!guest || guest.addedBy !== currentUserId) {
      return;
    }

    setEventGuestLists((prev) => ({
      ...prev,
      [eventId]: (prev[eventId] || []).filter((entry) => entry.id !== guestId)
    }));
    setEvents((prev) =>
      prev.map((item) =>
        item.id === eventId
          ? { ...item, attendees: Math.max(0, item.attendees - 1) }
          : item
      )
    );

    const isCurrentUserAttendance =
      userAttendance.has(eventId) && attendanceDetails[eventId]?.guestId === guestId;
    if (isCurrentUserAttendance) {
      setUserAttendance((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
      setAttendanceDetails((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
    }
  };

  const selectedGuestEvent = events.find((event) => event.id === openGuestListForEvent);

  return (
    <div className="content-section">
      <div className="flex justify-between items-center mb-4">
        <h1>Apollo Selene Events</h1>
        <div className="flex gap-2">
          {!isAdmin && (
            <button onClick={() => setShowLogin(true)} className="admin-btn">
              Admin Login
            </button>
          )}
          {isAdmin && (
            <>
              <button onClick={() => setShowAddEvent(true)} className="add-event-btn">
                Add Event
              </button>
              <button onClick={() => setIsAdmin(false)} className="logout-btn">
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <p>
          This is the calm center of Apollo Selene. When a new event is announced, you can come here to read the details, get a feel for the atmosphere, and decide when you are ready to join us.
        </p>
        <p>
          Every gathering is designed to feel welcoming, unhurried, and easy to step into, whether you are meeting people for the first time or returning to a familiar room.
        </p>
      </div>

      {/* Admin Login Modal */}
      {showLogin && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Admin Login</h3>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                placeholder="Username"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                required
              />
              <div className="modal-actions">
                <button type="submit">Login</button>
                <button type="button" onClick={() => setShowLogin(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add New Event</h3>
            <form onSubmit={handleAddEvent}>
              <input
                type="text"
                placeholder="Event Title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                required
              />
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Time (e.g., 7:00 PM - 9:00 PM)"
                value={newEvent.time}
                onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Location"
                value={newEvent.location}
                onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                required
              />
              <textarea
                placeholder="Event Description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                rows="4"
                required
              />
              <input
                type="url"
                placeholder="Poster Image URL (optional)"
                value={newEvent.poster}
                onChange={(e) => setNewEvent({...newEvent, poster: e.target.value})}
              />
              <input
                type="number"
                placeholder="Max Attendees"
                value={newEvent.maxAttendees}
                onChange={(e) => setNewEvent({...newEvent, maxAttendees: parseInt(e.target.value)})}
                min="1"
                required
              />
              <div className="modal-actions">
                <button type="submit">Add Event</button>
                <button type="button" onClick={() => setShowAddEvent(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditEvent && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Event</h3>
            <form onSubmit={handleEditEvent}>
              <input
                type="text"
                placeholder="Event Title"
                value={editEventData.title}
                onChange={(e) => setEditEventData({ ...editEventData, title: e.target.value })}
                required
              />
              <input
                type="date"
                value={editEventData.date}
                onChange={(e) => setEditEventData({ ...editEventData, date: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Time (e.g., 7:00 PM - 9:00 PM)"
                value={editEventData.time}
                onChange={(e) => setEditEventData({ ...editEventData, time: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Location"
                value={editEventData.location}
                onChange={(e) => setEditEventData({ ...editEventData, location: e.target.value })}
                required
              />
              <textarea
                placeholder="Event Description"
                value={editEventData.description}
                onChange={(e) => setEditEventData({ ...editEventData, description: e.target.value })}
                rows="4"
                required
              />
              <input
                type="url"
                placeholder="Poster Image URL (optional)"
                value={editEventData.poster}
                onChange={(e) => setEditEventData({ ...editEventData, poster: e.target.value })}
              />
              <input
                type="number"
                placeholder="Max Attendees"
                value={editEventData.maxAttendees}
                onChange={(e) => setEditEventData({ ...editEventData, maxAttendees: Number(e.target.value) })}
                min="1"
                required
              />
              <div className="modal-actions">
                <button type="submit">Save Changes</button>
                <button type="button" onClick={closeEditEventModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attend Confirmation Modal */}
      {showAttendConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Attendance</h3>
            <p>
              Please share your name and a contact method to confirm your spot.
            </p>
            <form onSubmit={confirmAttendance}>
              <input
                type="text"
                placeholder="Your Name"
                value={attendeeForm.name}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, name: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Contact (email or phone)"
                value={attendeeForm.contact}
                onChange={(e) => {
                  setAttendeeForm({ ...attendeeForm, contact: e.target.value });
                  if (attendeeContactError) {
                    setAttendeeContactError('');
                  }
                }}
                required
              />
              {attendeeContactError && <p className="form-error">{attendeeContactError}</p>}
              <div className="modal-actions">
                <button type="submit">Confirm</button>
                <button type="button" onClick={closeAttendConfirm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guest List Modal */}
      {openGuestListForEvent && (
        <div className="modal-overlay">
          <div className="modal guest-list-modal">
            <h3>{selectedGuestEvent ? `${selectedGuestEvent.title} Guest List` : 'Guest List'}</h3>
            {(eventGuestLists[openGuestListForEvent] || []).length > 0 ? (
              <ul className="guest-list">
                {(eventGuestLists[openGuestListForEvent] || []).map((guest) => (
                  <li key={guest.id} className="guest-list-item">
                    <span>{guest.name}</span>
                    {guest.addedBy === currentUserId && (
                      <button
                        type="button"
                        className="remove-guest-btn"
                        onClick={() => removeGuestFromEvent(openGuestListForEvent, guest.id)}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="guest-list-empty">No attendees listed yet.</p>
            )}

            {(eventGuestLists[openGuestListForEvent] || []).length > 0 && !showAddGuestForm && (
              <button
                type="button"
                className="add-guest-btn"
                onClick={openAddGuestForm}
                disabled={selectedGuestEvent ? selectedGuestEvent.attendees >= selectedGuestEvent.maxAttendees : false}
              >
                {selectedGuestEvent && selectedGuestEvent.attendees >= selectedGuestEvent.maxAttendees
                  ? 'Event Full'
                  : 'Add Another Guest'}
              </button>
            )}

            {showAddGuestForm && (
              <form className="add-guest-form" onSubmit={handleAddAnotherGuest}>
                <input
                  type="text"
                  placeholder="Guest Name"
                  value={extraGuestForm.name}
                  onChange={(e) => setExtraGuestForm({ ...extraGuestForm, name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Contact (email or phone)"
                  value={extraGuestForm.contact}
                  onChange={(e) => {
                    setExtraGuestForm({ ...extraGuestForm, contact: e.target.value });
                    if (extraGuestContactError) {
                      setExtraGuestContactError('');
                    }
                  }}
                  required
                />
                {extraGuestContactError && <p className="form-error">{extraGuestContactError}</p>}
                <div className="modal-actions add-guest-actions">
                  <button type="submit">Save Guest</button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddGuestForm(false);
                      setExtraGuestContactError('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="modal-actions">
              <button type="button" onClick={closeGuestListModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Events Grid */}
      <div className="events-grid">
        {events.map(event => (
          <div key={event.id} className="event-card">
            {event.poster && (
              <div className="event-poster">
                <img src={event.poster} alt={event.title} />
              </div>
            )}
            <div className="event-content">
              <h3>{event.title}</h3>
              {event.updatedAt && (
                <p className="event-updated-at">
                  Last updated: {new Date(event.updatedAt).toLocaleString()}
                </p>
              )}
              <div className="event-details">
                <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {event.time}</p>
                <p><strong>Location:</strong> {event.location}</p>
              </div>
              <p className="event-description">{event.description}</p>
              
              <div className="event-attendance">
                {isAdmin && (
                  <div className="event-admin-actions">
                    <button
                      type="button"
                      className="event-admin-btn"
                      onClick={() => openEditEventModal(event)}
                    >
                      Edit Event
                    </button>
                    <button
                      type="button"
                      className="event-admin-btn event-admin-btn-danger"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      Remove Event
                    </button>
                  </div>
                )}

                <div className="attendance-info">
                  <span className="attendee-count">
                    {event.attendees}/{event.maxAttendees} attending
                  </span>
                  {attendanceDetails[event.id] && userAttendance.has(event.id) && (
                    <span className="attendee-count">
                      You are attending as {attendanceDetails[event.id].name}
                    </span>
                  )}
                  <div className="attendance-bar">
                    <div 
                      className="attendance-fill" 
                      style={{ width: `${(event.attendees / event.maxAttendees) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <button 
                  className={`attend-btn ${userAttendance.has(event.id) ? 'attending' : ''}`}
                  onClick={() => handleAttendEvent(event.id)}
                  disabled={!userAttendance.has(event.id) && event.attendees >= event.maxAttendees}
                >
                  {userAttendance.has(event.id) 
                    ? 'Cancel Attendance' 
                    : event.attendees >= event.maxAttendees 
                      ? 'Event Full' 
                      : 'Attend Event'
                  }
                </button>

                <div className="guest-list-controls">
                  <button
                    type="button"
                    className="guest-list-btn"
                    onClick={() => toggleGuestList(event.id)}
                  >
                    See Guest List
                  </button>
                  <span className="guest-list-count">
                    {(eventGuestLists[event.id] || []).length} guests listed
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Events;