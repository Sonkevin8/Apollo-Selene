// Helper to check ticket purchase status from Supabase
const checkTicketPurchase = async (sessionId) => {
  // Query the event_ticket_purchases table for this session
  const { data, error } = await supabase
    .from('event_ticket_purchases')
    .select('*')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle();
  if (error || !data) return null;
  if (data.payment_status !== 'paid') return null;
  return data;
};
  // On mount, check for Stripe redirect and confirm attendance if paid
  useEffect(() => {
    const url = new URL(window.location.href);
    const ticketStatus = url.searchParams.get('ticket');
    const sessionId = url.searchParams.get('session_id');
    if (ticketStatus === 'success' && sessionId) {
      (async () => {
        const purchase = await checkTicketPurchase(sessionId);
        if (purchase && purchase.event_id) {
          // Only add attendance if not already present
          const { data: existing } = await supabase
            .from(EVENT_ATTENDANCE_TABLE)
            .select('*')
            .eq('event_id', purchase.event_id)
            .eq('user_id', currentUserId);
          if (!existing || existing.length === 0) {
            // Add guest entry if not present
            let guestId;
            const { data: guests } = await supabase
              .from(EVENT_GUESTS_TABLE)
              .select('*')
              .eq('event_id', purchase.event_id)
              .eq('name', purchase.purchaser_email)
              .eq('added_by', currentUserId);
            if (guests && guests.length > 0) {
              guestId = guests[0].id;
            } else {
              const { data: newGuest } = await supabase
                .from(EVENT_GUESTS_TABLE)
                .insert([{ event_id: purchase.event_id, name: purchase.purchaser_email, contact: purchase.purchaser_email, added_by: currentUserId }])
                .select();
              guestId = newGuest && newGuest[0]?.id;
            }
            // Add attendance
            await supabase
              .from(EVENT_ATTENDANCE_TABLE)
              .upsert({ event_id: purchase.event_id, user_id: currentUserId, guest_id: guestId, name: purchase.purchaser_email, contact: purchase.purchaser_email });
            // Increment event attendee count
            const { data: eventData } = await supabase
              .from(EVENTS_TABLE)
              .select('*')
              .eq('id', purchase.event_id)
              .maybeSingle();
            if (eventData) {
              await supabase
                .from(EVENTS_TABLE)
                .update({ attendees: (eventData.attendees || 0) + 1 })
                .eq('id', purchase.event_id);
            }
            // Refresh all
            const fetchAll = async () => {
              const { data: eventData } = await supabase
                .from(EVENTS_TABLE)
                .select('*')
                .order('date', { ascending: true });
              if (eventData) setEvents(normalizeEvents(eventData));
              const { data: guestData } = await supabase
                .from(EVENT_GUESTS_TABLE)
                .select('*');
              const guestLists = {};
              (guestData || []).forEach(g => {
                if (!guestLists[g.event_id]) guestLists[g.event_id] = [];
                guestLists[g.event_id].push(g);
              });
              setEventGuestLists(guestLists);
              const { data: attendanceData } = await supabase
                .from(EVENT_ATTENDANCE_TABLE)
                .select('*');
              const attendanceMap = {};
              const userSet = new Set();
              (attendanceData || []).forEach(a => {
                attendanceMap[a.event_id] = a;
                if (a.user_id === currentUserId) userSet.add(a.event_id);
              });
              setAttendanceDetails(attendanceMap);
              setUserAttendance(userSet);
            };
            await fetchAll();
            alert('Ticket purchase confirmed! You have been added to the guest list.');
          }
        } else {
          alert('Could not confirm ticket purchase. Please contact support.');
        }
        // Clean up URL
        url.searchParams.delete('ticket');
        url.searchParams.delete('session_id');
        window.history.replaceState({}, document.title, url.pathname);
      })();
    }
  }, [currentUserId]);
// Helper to call Supabase Edge Function for Stripe checkout
const createTicketCheckout = async ({ event }) => {
  const origin = window.location.origin;
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-ticket-checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabase.auth.session()?.access_token || ''}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventLocation: event.location,
        origin,
      }),
    }
  );
  const data = await res.json();
  if (data?.url) {
    window.location.href = data.url;
  } else {
    alert('Could not start checkout: ' + (data?.error || 'Unknown error'));
  }
};
import React, { useEffect, useState } from 'react';
import { supabase, EVENTS_TABLE, EVENT_GUESTS_TABLE, EVENT_ATTENDANCE_TABLE } from '../lib/supabaseClient';

const EVENTS_STORAGE_KEY = 'apollo-selene-events';
const USER_ATTENDANCE_STORAGE_KEY = 'apollo-selene-user-attendance';
const ATTENDANCE_DETAILS_STORAGE_KEY = 'apollo-selene-attendance-details';
const CURRENT_USER_ID_STORAGE_KEY = 'apollo-selene-current-user-id';

const EVENT_PHASES = {
  apollo: 'apollo',
  selene: 'selene'
};

const defaultEvents = [
  {
    id: 1,
    title: 'Sunroom Sketch Session',
    date: '2024-12-28',
    time: '2:00 PM - 5:00 PM',
    location: 'Apollo Selene Lounge',
    description: 'A bright afternoon sketch session with tea, open tables, and enough quiet structure to ease into conversation while the room is full of daylight.',
    poster: 'https://images.pexels.com/photos/1109541/pexels-photo-1109541.jpeg?auto=compress&cs=tinysrgb&w=400',
    attendees: 23,
    maxAttendees: 50,
    phase: EVENT_PHASES.apollo
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
    maxAttendees: 30,
    phase: EVENT_PHASES.selene
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
    maxAttendees: 100,
    phase: EVENT_PHASES.selene
  }
];

// Guest lists and attendance are now stored in Supabase

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
  } catch {
    return fallbackValue;
  }
};

const inferEventPhase = (timeRange = '') => {
  const firstTime = timeRange.split('-')[0]?.trim() || timeRange.trim();
  const match = firstTime.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);

  if (!match) {
    return EVENT_PHASES.selene;
  }

  const hour = Number(match[1]) % 12;
  const minutes = Number(match[2] || 0);
  const meridiem = match[3].toUpperCase();
  const hour24 = meridiem === 'PM' ? hour + 12 : hour;
  const startsAfterDaylight = hour24 > 17 || (hour24 === 17 && minutes > 30);

  return startsAfterDaylight ? EVENT_PHASES.selene : EVENT_PHASES.apollo;
};

const normalizeEvent = (event) => ({
  ...event,
  phase: event?.phase || inferEventPhase(event?.time)
});

const normalizeEvents = (items) => (items || []).map(normalizeEvent);

const createEventDraft = (theme) => ({
  title: '',
  date: '',
  time: '',
  phase: theme === EVENT_PHASES.apollo ? EVENT_PHASES.apollo : EVENT_PHASES.selene,
  location: '',
  description: '',
  poster: '',
  maxAttendees: 50
});

const Events = ({ theme }) => {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [newEvent, setNewEvent] = useState(() => createEventDraft(theme));
  const [editingEventId, setEditingEventId] = useState(null);
  const [editEventData, setEditEventData] = useState({
    title: '',
    date: '',
    time: '',
    phase: EVENT_PHASES.selene,
    location: '',
    description: '',
    poster: '',
    maxAttendees: 50
  });
  const [currentUserId] = useState(() => getCurrentUserId());
  // Guest/attendance state
  const [eventGuestLists, setEventGuestLists] = useState({});
  const [attendanceDetails, setAttendanceDetails] = useState({});
  const [userAttendance, setUserAttendance] = useState(new Set());
  const [openGuestListForEvent, setOpenGuestListForEvent] = useState(null);
  const [showAttendConfirm, setShowAttendConfirm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [attendeeForm, setAttendeeForm] = useState({ name: '', contact: '' });
  const [showAddGuestForm, setShowAddGuestForm] = useState(false);
  const [extraGuestForm, setExtraGuestForm] = useState({ name: '', contact: '' });
  const [attendeeContactError, setAttendeeContactError] = useState('');
  const [extraGuestContactError, setExtraGuestContactError] = useState('');


  // Fetch events, guests, and attendance from Supabase on mount
  useEffect(() => {
    const fetchAll = async () => {
      setLoadingEvents(true);
      // Events
      const { data: eventData } = await supabase
        .from(EVENTS_TABLE)
        .select('*')
        .order('date', { ascending: true });
      if (eventData) setEvents(normalizeEvents(eventData));
      // Guests
      const { data: guestData } = await supabase
        .from(EVENT_GUESTS_TABLE)
        .select('*');
      const guestLists = {};
      (guestData || []).forEach(g => {
        if (!guestLists[g.event_id]) guestLists[g.event_id] = [];
        guestLists[g.event_id].push(g);
      });
      setEventGuestLists(guestLists);
      // Attendance
      const { data: attendanceData } = await supabase
        .from(EVENT_ATTENDANCE_TABLE)
        .select('*');
      const attendanceMap = {};
      const userSet = new Set();
      (attendanceData || []).forEach(a => {
        attendanceMap[a.event_id] = a;
        if (a.user_id === currentUserId) userSet.add(a.event_id);
      });
      setAttendanceDetails(attendanceMap);
      setUserAttendance(userSet);
      setLoadingEvents(false);
    };
    fetchAll();
  }, [currentUserId]);



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

  const handleAddEvent = async (e) => {
    e.preventDefault();
    const event = {
      title: newEvent.title,
      date: newEvent.date,
      time: newEvent.time,
      phase: newEvent.phase || inferEventPhase(newEvent.time),
      location: newEvent.location,
      description: newEvent.description,
      poster: newEvent.poster,
      max_attendees: newEvent.maxAttendees,
      attendees: 0,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from(EVENTS_TABLE).insert([event]);
    if (!error) {
      // Refresh events from backend
      const { data } = await supabase
        .from(EVENTS_TABLE)
        .select('*')
        .order('date', { ascending: true });
      setEvents(normalizeEvents(data));
    }
    setNewEvent(createEventDraft(theme));
    setShowAddEvent(false);
  };

  const openEditEventModal = (event) => {
    setEditingEventId(event.id);
    setEditEventData({
      title: event.title,
      date: event.date,
      time: event.time,
      phase: event.phase || inferEventPhase(event.time),
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
      phase: EVENT_PHASES.selene,
      location: '',
      description: '',
      poster: '',
      maxAttendees: 50
    });
  };

  const handleEditEvent = async (e) => {
    e.preventDefault();
    if (!editingEventId) {
      return;
    }

    const parsedMaxAttendees = Number(editEventData.maxAttendees);
    const safeMaxAttendees = Number.isFinite(parsedMaxAttendees) && parsedMaxAttendees > 0
      ? parsedMaxAttendees
      : 1;

    const update = {
      ...editEventData,
      phase: editEventData.phase || inferEventPhase(editEventData.time),
      max_attendees: safeMaxAttendees,
      updated_at: new Date().toISOString()
    };
    // Remove maxAttendees for DB update, use max_attendees
    delete update.maxAttendees;

    await supabase
      .from(EVENTS_TABLE)
      .update(update)
      .eq('id', editingEventId);

    // Refresh events from backend
    const { data } = await supabase
      .from(EVENTS_TABLE)
      .select('*')
      .order('date', { ascending: true });
    setEvents(normalizeEvents(data));

    closeEditEventModal();
  };

  const handleDeleteEvent = async (eventId) => {
    const eventToDelete = events.find((event) => event.id === eventId);
    if (!eventToDelete) {
      return;
    }

    const confirmed = window.confirm(`Remove "${eventToDelete.title}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    await supabase
      .from(EVENTS_TABLE)
      .delete()
      .eq('id', eventId);

    // Refresh events from backend
    const { data } = await supabase
      .from(EVENTS_TABLE)
      .select('*')
      .order('date', { ascending: true });
    setEvents(normalizeEvents(data));

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

  const confirmAttendance = async (e) => {
    e.preventDefault();
    const event = events.find((item) => item.id === selectedEventId);
    if (!event || event.attendees >= event.maxAttendees) {
      closeAttendConfirm();
      return;
    }
    const attendeeName = attendeeForm.name.trim();
    const attendeeContact = attendeeForm.contact.trim();
    if (!isValidContact(attendeeContact)) {
      setAttendeeContactError('Enter a valid email or phone number.');
      return;
    }
    setAttendeeContactError('');
    // Add guest
    let guestId;
    const { data: existingGuests } = await supabase
      .from(EVENT_GUESTS_TABLE)
      .select('*')
      .eq('event_id', selectedEventId)
      .eq('name', attendeeName)
      .eq('added_by', currentUserId);
    if (existingGuests && existingGuests.length > 0) {
      guestId = existingGuests[0].id;
    } else {
      const { data: newGuest } = await supabase
        .from(EVENT_GUESTS_TABLE)
        .insert([{ event_id: selectedEventId, name: attendeeName, contact: attendeeContact, added_by: currentUserId }])
        .select();
      guestId = newGuest && newGuest[0]?.id;
    }
    // Add attendance
    await supabase
      .from(EVENT_ATTENDANCE_TABLE)
      .upsert({ event_id: selectedEventId, user_id: currentUserId, guest_id: guestId, name: attendeeName, contact: attendeeContact });
    // Increment event attendee count
    await supabase
      .from(EVENTS_TABLE)
      .update({ attendees: event.attendees + 1 })
      .eq('id', selectedEventId);
    // Refresh all
    const fetchAll = async () => {
      const { data: eventData } = await supabase
        .from(EVENTS_TABLE)
        .select('*')
        .order('date', { ascending: true });
      if (eventData) setEvents(normalizeEvents(eventData));
      const { data: guestData } = await supabase
        .from(EVENT_GUESTS_TABLE)
        .select('*');
      const guestLists = {};
      (guestData || []).forEach(g => {
        if (!guestLists[g.event_id]) guestLists[g.event_id] = [];
        guestLists[g.event_id].push(g);
      });
      setEventGuestLists(guestLists);
      const { data: attendanceData } = await supabase
        .from(EVENT_ATTENDANCE_TABLE)
        .select('*');
      const attendanceMap = {};
      const userSet = new Set();
      (attendanceData || []).forEach(a => {
        attendanceMap[a.event_id] = a;
        if (a.user_id === currentUserId) userSet.add(a.event_id);
      });
      setAttendanceDetails(attendanceMap);
      setUserAttendance(userSet);
    };
    await fetchAll();
    closeAttendConfirm();
  };

  const handleAttendEvent = async (eventId) => {
    if (userAttendance.has(eventId)) {
      // Remove attendance
      await supabase
        .from(EVENT_ATTENDANCE_TABLE)
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', currentUserId);
      // Decrement event attendee count
      const event = events.find(e => e.id === eventId);
      if (event) {
        await supabase
          .from(EVENTS_TABLE)
          .update({ attendees: Math.max(0, event.attendees - 1) })
          .eq('id', eventId);
      }
      // Refresh all
      const fetchAll = async () => {
        const { data: eventData } = await supabase
          .from(EVENTS_TABLE)
          .select('*')
          .order('date', { ascending: true });
        if (eventData) setEvents(normalizeEvents(eventData));
        const { data: guestData } = await supabase
          .from(EVENT_GUESTS_TABLE)
          .select('*');
        const guestLists = {};
        (guestData || []).forEach(g => {
          if (!guestLists[g.event_id]) guestLists[g.event_id] = [];
          guestLists[g.event_id].push(g);
        });
        setEventGuestLists(guestLists);
        const { data: attendanceData } = await supabase
          .from(EVENT_ATTENDANCE_TABLE)
          .select('*');
        const attendanceMap = {};
        const userSet = new Set();
        (attendanceData || []).forEach(a => {
          attendanceMap[a.event_id] = a;
          if (a.user_id === currentUserId) userSet.add(a.event_id);
        });
        setAttendanceDetails(attendanceMap);
        setUserAttendance(userSet);
      };
      await fetchAll();
    } else {
      // User wants to attend: start Stripe checkout
      const event = events.find(e => e.id === eventId);
      if (event && event.attendees < event.maxAttendees) {
        await createTicketCheckout({ event });
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

  const handleAddAnotherGuest = async (e) => {
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
    // Check for duplicate
    const { data: existingGuests } = await supabase
      .from(EVENT_GUESTS_TABLE)
      .select('*')
      .eq('event_id', eventId)
      .eq('name', guestName)
      .eq('added_by', currentUserId);
    if (existingGuests && existingGuests.length > 0) {
      setShowAddGuestForm(false);
      setExtraGuestForm({ name: '', contact: '' });
      return;
    }
    // Add guest
    await supabase
      .from(EVENT_GUESTS_TABLE)
      .insert([{ event_id: eventId, name: guestName, contact: guestContact, added_by: currentUserId }]);
    // Increment event attendee count
    await supabase
      .from(EVENTS_TABLE)
      .update({ attendees: event.attendees + 1 })
      .eq('id', eventId);
    // Refresh all
    const fetchAll = async () => {
      const { data: eventData } = await supabase
        .from(EVENTS_TABLE)
        .select('*')
        .order('date', { ascending: true });
      if (eventData) setEvents(normalizeEvents(eventData));
      const { data: guestData } = await supabase
        .from(EVENT_GUESTS_TABLE)
        .select('*');
      const guestLists = {};
      (guestData || []).forEach(g => {
        if (!guestLists[g.event_id]) guestLists[g.event_id] = [];
        guestLists[g.event_id].push(g);
      });
      setEventGuestLists(guestLists);
      const { data: attendanceData } = await supabase
        .from(EVENT_ATTENDANCE_TABLE)
        .select('*');
      const attendanceMap = {};
      const userSet = new Set();
      (attendanceData || []).forEach(a => {
        attendanceMap[a.event_id] = a;
        if (a.user_id === currentUserId) userSet.add(a.event_id);
      });
      setAttendanceDetails(attendanceMap);
      setUserAttendance(userSet);
    };
    await fetchAll();
    setExtraGuestForm({ name: '', contact: '' });
    setShowAddGuestForm(false);
  };

  const removeGuestFromEvent = async (eventId, guestId) => {
    // Only allow removing your own guests
    const guest = (eventGuestLists[eventId] || []).find((entry) => entry.id === guestId);
    if (!guest || guest.added_by !== currentUserId) {
      return;
    }
    await supabase
      .from(EVENT_GUESTS_TABLE)
      .delete()
      .eq('id', guestId);
    // Decrement event attendee count
    const event = events.find(e => e.id === eventId);
    if (event) {
      await supabase
        .from(EVENTS_TABLE)
        .update({ attendees: Math.max(0, event.attendees - 1) })
        .eq('id', eventId);
    }
    // Remove attendance if this guest was the user's attendance
    const attendance = attendanceDetails[eventId];
    if (attendance && attendance.guest_id === guestId && attendance.user_id === currentUserId) {
      await supabase
        .from(EVENT_ATTENDANCE_TABLE)
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', currentUserId);
    }
    // Refresh all
    const fetchAll = async () => {
      const { data: eventData } = await supabase
        .from(EVENTS_TABLE)
        .select('*')
        .order('date', { ascending: true });
      if (eventData) setEvents(normalizeEvents(eventData));
      const { data: guestData } = await supabase
        .from(EVENT_GUESTS_TABLE)
        .select('*');
      const guestLists = {};
      (guestData || []).forEach(g => {
        if (!guestLists[g.event_id]) guestLists[g.event_id] = [];
        guestLists[g.event_id].push(g);
      });
      setEventGuestLists(guestLists);
      const { data: attendanceData } = await supabase
        .from(EVENT_ATTENDANCE_TABLE)
        .select('*');
      const attendanceMap = {};
      const userSet = new Set();
      (attendanceData || []).forEach(a => {
        attendanceMap[a.event_id] = a;
        if (a.user_id === currentUserId) userSet.add(a.event_id);
      });
      setAttendanceDetails(attendanceMap);
      setUserAttendance(userSet);
    };
    await fetchAll();
  };

  const visibleEvents = events.filter((event) => (event.phase || inferEventPhase(event.time)) === theme);
  const phaseTitle = theme === EVENT_PHASES.apollo ? 'Apollo daylight invitations' : 'Selene night invitations';
  const phaseSummary = theme === EVENT_PHASES.apollo
    ? 'Apollo mode reveals only daytime gatherings, salons, and afternoon invitations held in full light.'
    : 'Selene mode reveals only night gatherings, after-dark circles, and invitations meant for the late-hour atmosphere.';
  const emptyStateCopy = theme === EVENT_PHASES.apollo
    ? 'No daytime invitations are unsealed right now. Switch to Selene to browse the night list.'
    : 'No night invitations are unsealed right now. Switch to Apollo to browse the daytime list.';

  const selectedGuestEvent = events.find((event) => event.id === openGuestListForEvent);

  return (
    <div className="content-section">
      <div className="flex justify-between items-center mb-4">
        <h1>
          Apollo Selene Events <span className="name-secret">confidential</span>
        </h1>
        <div className="flex gap-2">
          {!isAdmin && (
            <button onClick={() => setShowLogin(true)} className="admin-btn">
              Login
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

      <div className="card events-intro-card">
        <p className="section-kicker">Invitation Circle</p>
        <h2>{phaseTitle}</h2>
        <p>
          This is the private bulletin room of Apollo Selene. New gatherings appear here quietly, with limited seats and details shared only when each announcement is unsealed.
        </p>
        <p>
          {phaseSummary}
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
              <select
                value={newEvent.phase}
                onChange={(e) => setNewEvent({ ...newEvent, phase: e.target.value })}
                required
              >
                <option value={EVENT_PHASES.apollo}>Apollo Day Event</option>
                <option value={EVENT_PHASES.selene}>Selene Night Event</option>
              </select>
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
              <div style={{ margin: '10px 0' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!newEvent.ticketed}
                    onChange={e => setNewEvent({ ...newEvent, ticketed: e.target.checked })}
                  />
                  {' '}Require ticket purchase (Stripe)
                </label>
              </div>
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
              <select
                value={editEventData.phase}
                onChange={(e) => setEditEventData({ ...editEventData, phase: e.target.value })}
                required
              >
                <option value={EVENT_PHASES.apollo}>Apollo Day Event</option>
                <option value={EVENT_PHASES.selene}>Selene Night Event</option>
              </select>
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
              <div style={{ margin: '10px 0' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!editEventData.ticketed}
                    onChange={e => setEditEventData({ ...editEventData, ticketed: e.target.checked })}
                  />
                  {' '}Require ticket purchase (Stripe)
                </label>
              </div>
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
        {visibleEvents.length === 0 ? (
          <div className="card events-empty-state">
            <p className="section-kicker">Nothing Unsealed</p>
            <h3>{phaseTitle}</h3>
            <p>{emptyStateCopy}</p>
          </div>
        ) : visibleEvents.map(event => (
          <div key={event.id} className="event-card">
            {event.poster && (
              <div className="event-poster">
                <img src={event.poster} alt={event.title} />
              </div>
            )}
            <div className="event-content">
              <div className="event-card-meta">
                <p className="event-whisper">Sealed announcement</p>
                <span className="event-seal">
                  {event.phase === EVENT_PHASES.apollo ? 'Day Invitation' : 'Night Invitation'}
                </span>
              </div>
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
                    {event.attendees}/{event.maxAttendees} reserved seats
                  </span>
                  {attendanceDetails[event.id] && userAttendance.has(event.id) && (
                    <span className="attendee-count">
                      Invitation held as {attendanceDetails[event.id].name}
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
                    ? 'Release Invitation'
                    : event.attendees >= event.maxAttendees
                      ? 'Sealed Full'
                      : event.ticketed === false
                        ? 'Attend Free'
                        : 'Buy Ticket'}
                </button>
                <div style={{ marginTop: 4, fontSize: 13, color: '#888' }}>
                  {event.ticketed === false ? 'Free event' : 'Ticketed event'}
                </div>

                <div className="guest-list-controls">
                  <button
                    type="button"
                    className="guest-list-btn"
                    onClick={() => toggleGuestList(event.id)}
                  >
                    View Guest Ledger
                  </button>
                  <span className="guest-list-count">
                    {(eventGuestLists[event.id] || []).length} names in ledger
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