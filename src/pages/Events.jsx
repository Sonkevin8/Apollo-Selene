import React, { useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import {
  createTicketCheckoutSession,
  fetchPaidEventTicketPurchases,
  fetchMyProfile,
  getCurrentSession,
  onAuthStateChange,
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
} from '../lib/mixtapeExchange';

const EVENTS_STORAGE_KEY = 'apollo-selene-events';
const GUEST_LISTS_STORAGE_KEY = 'apollo-selene-guest-lists';
const USER_ATTENDANCE_STORAGE_KEY = 'apollo-selene-user-attendance';
const ATTENDANCE_DETAILS_STORAGE_KEY = 'apollo-selene-attendance-details';

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

const initialGuestLists = {
  1: ['Ari M.', 'Nadia K.', 'Leah P.', 'Jasper T.', 'Mina R.'],
  2: ['Rowan C.', 'Elio S.', 'Nora V.', 'Priya N.'],
  3: ['Noah L.', 'Anya B.', 'Sofia R.', 'Mason K.', 'Iris D.', 'Kai M.']
};

const createGuestId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const defaultAuthForm = {
  email: '',
  password: '',
  displayName: '',
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
  const [events, setEvents] = useState(() => normalizeEvents(getStoredJson(EVENTS_STORAGE_KEY, defaultEvents)));

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [authForm, setAuthForm] = useState(defaultAuthForm);
  const [authMessage, setAuthMessage] = useState('');
  const [checkoutEventId, setCheckoutEventId] = useState(null);
  const [checkoutErrorEventId, setCheckoutErrorEventId] = useState(null);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [hasSyncedPaidTickets, setHasSyncedPaidTickets] = useState(false);
  const [paidTicketEventIds, setPaidTicketEventIds] = useState(() => new Set());
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
  const [userAttendance, setUserAttendance] = useState(
    () => new Set(getStoredJson(USER_ATTENDANCE_STORAGE_KEY, []))
  );
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
  const [editingGuestId, setEditingGuestId] = useState(null);
  const [editingGuestForm, setEditingGuestForm] = useState({ name: '', contact: '' });
  const [editingGuestContactError, setEditingGuestContactError] = useState('');
  const [attendeeContactError, setAttendeeContactError] = useState('');
  const [extraGuestContactError, setExtraGuestContactError] = useState('');

  const currentUserId = session?.user?.id || null;

  const isAdmin = useMemo(() => {
    if (!session?.user) {
      return false;
    }

    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const userEmail = (session.user.email || '').toLowerCase();

    return (
      profile?.plan_tier === 'label' ||
      profile?.username === 'admin' ||
      adminEmails.includes(userEmail)
    );
  }, [profile, session]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined;
    }

    let isMounted = true;

    const syncAuthProfile = async (nextSession) => {
      if (!nextSession?.user?.id) {
        if (isMounted) {
          setProfile(null);
        }
        return;
      }

      try {
        const nextProfile = await fetchMyProfile({ userId: nextSession.user.id });
        if (isMounted) {
          setProfile(nextProfile || null);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
        }
      }
    };

    const initializeSession = async () => {
      try {
        const existingSession = await getCurrentSession();
        if (!isMounted) {
          return;
        }

        setSession(existingSession);
        await syncAuthProfile(existingSession);
      } catch {
        if (isMounted) {
          setSession(null);
          setProfile(null);
        }
      }
    };

    initializeSession();

    const { data: authSubscription } = onAuthStateChange(async (_, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      await syncAuthProfile(nextSession);
    });

    return () => {
      isMounted = false;
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setHasSyncedPaidTickets(false);
    setPaidTicketEventIds(new Set());
  }, [currentUserId]);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUserId || hasSyncedPaidTickets) {
      return;
    }

    let isMounted = true;

    const syncPaidTickets = async () => {
      try {
        const purchases = await fetchPaidEventTicketPurchases({ userId: currentUserId, limit: 200 });
        if (!isMounted || purchases.length === 0) {
          if (isMounted) {
            setHasSyncedPaidTickets(true);
          }
          return;
        }

        const paidEventIds = purchases
          .map((purchase) => String(purchase.event_id || ''))
          .filter(Boolean);

        const eventsById = new Map(events.map((eventItem) => [String(eventItem.id), eventItem]));
        const matchedEventIds = paidEventIds
          .map((eventId) => eventsById.get(eventId)?.id)
          .filter((value) => value !== undefined);

        setPaidTicketEventIds(new Set(matchedEventIds));

        if (matchedEventIds.length === 0) {
          setHasSyncedPaidTickets(true);
          return;
        }

        const paidEventIdSet = new Set(matchedEventIds);
        const newlyAddedEventIdSet = new Set(
          matchedEventIds.filter((eventId) => !userAttendance.has(eventId))
        );
        const attendeeName = session?.user?.user_metadata?.display_name || session?.user?.email || 'Ticket Holder';
        const attendeeContact = session?.user?.email || '';

        setUserAttendance((prev) => {
          const next = new Set(prev);
          let changed = false;

          paidEventIdSet.forEach((eventId) => {
            if (!next.has(eventId)) {
              next.add(eventId);
              changed = true;
            }
          });

          return changed ? next : prev;
        });

        setAttendanceDetails((prev) => {
          const next = { ...prev };
          let changed = false;

          paidEventIdSet.forEach((eventId) => {
            const ticketGuestId = `ticket-${eventId}-${currentUserId}`;
            if (!next[eventId]) {
              next[eventId] = {
                name: attendeeName,
                contact: attendeeContact,
                guestId: ticketGuestId,
              };
              changed = true;
            }
          });

          return changed ? next : prev;
        });

        setEventGuestLists((prev) => {
          const next = { ...prev };
          let changed = false;

          paidEventIdSet.forEach((eventId) => {
            const ticketGuestId = `ticket-${eventId}-${currentUserId}`;
            const guests = next[eventId] || [];
            const hasTicketGuest = guests.some((guest) => guest.id === ticketGuestId);

            if (!hasTicketGuest) {
              next[eventId] = [
                ...guests,
                {
                  id: ticketGuestId,
                  name: attendeeName,
                  contact: attendeeContact,
                  addedBy: currentUserId,
                },
              ];
              changed = true;
            }
          });

          return changed ? next : prev;
        });

        if (newlyAddedEventIdSet.size > 0) {
          setEvents((prev) =>
            prev.map((eventItem) => {
              if (!newlyAddedEventIdSet.has(eventItem.id)) {
                return eventItem;
              }

              return {
                ...eventItem,
                attendees: Math.min(eventItem.maxAttendees, eventItem.attendees + 1),
              };
            })
          );
        }

        setHasSyncedPaidTickets(true);
      } catch {
        if (isMounted) {
          setHasSyncedPaidTickets(true);
        }
      }
    };

    syncPaidTickets();

    return () => {
      isMounted = false;
    };
  }, [currentUserId, events, hasSyncedPaidTickets, isSupabaseConfigured, session, userAttendance]);

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

  const openAuthModal = (mode = 'signin') => {
    setAuthMode(mode);
    setAuthMessage('');
    setShowLogin(true);
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthMessage('');

    try {
      if (authMode === 'signup') {
        await signUpWithEmail({
          email: authForm.email,
          password: authForm.password,
          displayName: authForm.displayName,
        });
        setAuthMessage('Account created. Confirm your email, then sign in.');
      } else {
        await signInWithEmail({
          email: authForm.email,
          password: authForm.password,
        });
        setShowLogin(false);
      }
    } catch (error) {
      setAuthMessage(error.message || 'Authentication failed.');
    }
  };

  const handleAuthLogout = async () => {
    try {
      await signOutUser();
    } catch {
      // no-op
    }
  };

  const handleAddEvent = (e) => {
    e.preventDefault();
    const event = {
      ...newEvent,
      id: Date.now(),
      attendees: 0,
      phase: newEvent.phase || inferEventPhase(newEvent.time),
      updatedAt: new Date().toISOString()
    };
    setEvents([...events, event]);
    setNewEvent(createEventDraft(theme));
    setEventGuestLists((prev) => ({ ...prev, [event.id]: [] }));
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
              phase: editEventData.phase || inferEventPhase(editEventData.time),
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

  const ensureSignedIn = () => {
    if (!isSupabaseConfigured) {
      window.alert('Sign-in requires Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return false;
    }

    if (currentUserId) {
      return true;
    }

    openAuthModal('signin');
    return false;
  };

  const openAttendConfirm = (eventId) => {
    setSelectedEventId(eventId);
    setShowAttendConfirm(true);
  };

  const handleBuyTicket = async (event) => {
    if (!ensureSignedIn()) {
      return;
    }

    setCheckoutMessage('');
    setCheckoutErrorEventId(null);
    setCheckoutEventId(event.id);

    try {
      const result = await createTicketCheckoutSession({
        eventId: String(event.id),
        eventTitle: event.title,
        eventDate: event.date,
        eventLocation: event.location,
      });

      if (typeof window !== 'undefined') {
        window.location.assign(result.url);
      }
    } catch (error) {
      setCheckoutMessage(error.message || 'Unable to open Stripe checkout right now.');
      setCheckoutErrorEventId(event.id);
      setCheckoutEventId(null);
    }
  };

  const confirmAttendance = (e) => {
    e.preventDefault();

    if (!ensureSignedIn()) {
      return;
    }

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
    if (!ensureSignedIn()) {
      return;
    }

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
    setEditingGuestId(null);
    setEditingGuestForm({ name: '', contact: '' });
    setEditingGuestContactError('');
    setExtraGuestForm({ name: '', contact: '' });
    setOpenGuestListForEvent((prev) => (prev === eventId ? null : eventId));
  };

  const closeGuestListModal = () => {
    setOpenGuestListForEvent(null);
    setShowAddGuestForm(false);
    setEditingGuestId(null);
    setEditingGuestForm({ name: '', contact: '' });
    setEditingGuestContactError('');
    setExtraGuestForm({ name: '', contact: '' });
    setExtraGuestContactError('');
  };

  const openAddGuestForm = () => {
    setExtraGuestContactError('');
    setShowAddGuestForm(true);
  };

  const handleAddAnotherGuest = (e) => {
    e.preventDefault();

    if (!ensureSignedIn()) {
      return;
    }

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
    const canManageGuest = Boolean(guest) && (isAdmin || guest.addedBy === currentUserId);
    if (!canManageGuest) {
      return;
    }

    if (isAdmin) {
      const confirmed = window.confirm(`Remove ${guest.name} from this guest ledger?`);
      if (!confirmed) {
        return;
      }
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

    if (editingGuestId === guestId) {
      setEditingGuestId(null);
      setEditingGuestForm({ name: '', contact: '' });
      setEditingGuestContactError('');
    }
  };

  const startEditGuest = (guest) => {
    if (!isAdmin) {
      return;
    }

    setEditingGuestId(guest.id);
    setEditingGuestForm({
      name: guest.name || '',
      contact: guest.contact || ''
    });
    setEditingGuestContactError('');
    setShowAddGuestForm(false);
  };

  const cancelEditGuest = () => {
    setEditingGuestId(null);
    setEditingGuestForm({ name: '', contact: '' });
    setEditingGuestContactError('');
  };

  const saveEditedGuest = (eventId, guestId) => {
    if (!isAdmin) {
      return;
    }

    const nextName = editingGuestForm.name.trim();
    const nextContact = editingGuestForm.contact.trim();

    if (!nextName) {
      return;
    }

    if (!nextContact || !isValidContact(nextContact)) {
      setEditingGuestContactError('Enter a valid email or phone number.');
      return;
    }

    setEditingGuestContactError('');

    setEventGuestLists((prev) => ({
      ...prev,
      [eventId]: (prev[eventId] || []).map((entry) =>
        entry.id === guestId
          ? {
              ...entry,
              name: nextName,
              contact: nextContact
            }
          : entry
      )
    }));

    setAttendanceDetails((prev) => {
      if (!prev[eventId] || prev[eventId].guestId !== guestId) {
        return prev;
      }

      return {
        ...prev,
        [eventId]: {
          ...prev[eventId],
          name: nextName,
          contact: nextContact
        }
      };
    });

    cancelEditGuest();
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
          {session?.user?.email ? (
            <span className="guest-list-count">Signed in as {session.user.email}</span>
          ) : null}
          {!session && (
            <button onClick={() => openAuthModal('signin')} className="admin-btn">
              Sign In
            </button>
          )}
          {session && (
            <>
              {isAdmin && (
                <button onClick={() => setShowAddEvent(true)} className="add-event-btn">
                  Add Event
                </button>
              )}
              <button onClick={handleAuthLogout} className="logout-btn">
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
            <h3>{authMode === 'signup' ? 'Create Account' : 'Sign In'}</h3>
            <div className="account-actions">
              <button
                type="button"
                className={`button-link secondary-link ${authMode === 'signin' ? 'is-active' : ''}`}
                onClick={() => setAuthMode('signin')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`button-link secondary-link ${authMode === 'signup' ? 'is-active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </button>
            </div>
            <form onSubmit={handleAuthSubmit}>
              <input
                type="email"
                placeholder="Email"
                value={authForm.email}
                onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                required
                minLength={8}
              />
              {authMode === 'signup' ? (
                <input
                  type="text"
                  placeholder="Display Name"
                  value={authForm.displayName}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, displayName: e.target.value }))}
                  required
                />
              ) : null}
              {authMessage ? <p className="form-error">{authMessage}</p> : null}
              <div className="modal-actions">
                <button type="submit">{authMode === 'signup' ? 'Create Account' : 'Sign In'}</button>
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
                    {editingGuestId === guest.id ? (
                      <div className="guest-edit-row">
                        <input
                          type="text"
                          value={editingGuestForm.name}
                          onChange={(e) => setEditingGuestForm((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Guest Name"
                          required
                        />
                        <input
                          type="text"
                          value={editingGuestForm.contact}
                          onChange={(e) => {
                            setEditingGuestForm((prev) => ({ ...prev, contact: e.target.value }));
                            if (editingGuestContactError) {
                              setEditingGuestContactError('');
                            }
                          }}
                          placeholder="Contact (email or phone)"
                          required
                        />
                        {editingGuestContactError ? (
                          <p className="form-error guest-edit-error">{editingGuestContactError}</p>
                        ) : null}
                        <div className="guest-list-item-actions">
                          <button
                            type="button"
                            className="edit-guest-btn"
                            onClick={() => saveEditedGuest(openGuestListForEvent, guest.id)}
                          >
                            Save
                          </button>
                          <button type="button" className="remove-guest-btn" onClick={cancelEditGuest}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span>
                          {guest.name}
                          {guest.contact ? ` - ${guest.contact}` : ''}
                        </span>
                        <div className="guest-list-item-actions">
                          {isAdmin && (
                            <button
                              type="button"
                              className="edit-guest-btn"
                              onClick={() => startEditGuest(guest)}
                            >
                              Edit
                            </button>
                          )}
                          {(isAdmin || guest.addedBy === currentUserId) && (
                            <button
                              type="button"
                              className="remove-guest-btn"
                              onClick={() => removeGuestFromEvent(openGuestListForEvent, guest.id)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </>
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
              {paidTicketEventIds.has(event.id) ? (
                <p className="event-ticket-badge">Paid Ticket Confirmed</p>
              ) : null}
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
                      : 'Request Invitation'
                  }
                </button>

                <button
                  type="button"
                  className="buy-ticket-btn"
                  onClick={() => handleBuyTicket(event)}
                  disabled={checkoutEventId === event.id}
                >
                  {checkoutEventId === event.id ? 'Opening Checkout...' : 'Buy Ticket'}
                </button>
                {checkoutMessage && checkoutErrorEventId === event.id ? (
                  <p className="form-error ticket-error">{checkoutMessage}</p>
                ) : null}

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