import { isSupabaseConfigured, supabase } from './supabaseClient';

export const MIXTAPE_TABLE = 'mixtape_exchanges';
export const PROFILE_TABLE = 'profiles';
export const INVITE_TABLE = 'mixtape_invites';
export const TICKET_PURCHASE_TABLE = 'event_ticket_purchases';

const requireSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
};

export const getCurrentSession = async () => {
  requireSupabase();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
};

export const signUpWithEmail = async ({ email, password, displayName }) => {
  requireSupabase();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const signInWithEmail = async ({ email, password }) => {
  requireSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const signOutUser = async () => {
  requireSupabase();

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
};

export const onAuthStateChange = (callback) => {
  requireSupabase();
  return supabase.auth.onAuthStateChange(callback);
};

export const fetchReceiverProfiles = async ({ currentUserId }) => {
  requireSupabase();

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select('id, display_name, email, city')
    .neq('id', currentUserId)
    .order('display_name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};

export const fetchMyProfile = async ({ userId }) => {
  requireSupabase();

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const updateMyProfile = async ({ userId, profile }) => {
  requireSupabase();

  const payload = {
    id: userId,
    display_name: profile.display_name || null,
    city: profile.city || null,
    username: profile.username || null,
    bio: profile.bio || null,
  };

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const fetchMyMixtapeExchanges = async ({ userId, limit = 200 }) => {
  requireSupabase();

  const { data, error } = await supabase
    .from(MIXTAPE_TABLE)
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};

export const createMixtapeExchange = async (payload) => {
  requireSupabase();

  const { data, error } = await supabase
    .from(MIXTAPE_TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const updateMixtapeStatus = async ({ exchangeId, status }) => {
  requireSupabase();

  const { data, error } = await supabase
    .from(MIXTAPE_TABLE)
    .update({ status })
    .eq('id', exchangeId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const createMixtapeInvite = async ({ senderId, inviteEmail }) => {
  requireSupabase();

  const payload = {
    sender_id: senderId,
    invite_email: inviteEmail,
    status: 'pending',
  };

  const { data, error } = await supabase
    .from(INVITE_TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const markInviteStatus = async ({ inviteId, status }) => {
  requireSupabase();

  const { data, error } = await supabase
    .from(INVITE_TABLE)
    .update({ status })
    .eq('id', inviteId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const sendMixtapeInviteEmail = async ({ inviteEmail, senderEmail }) => {
  requireSupabase();

  const { data, error } = await supabase.functions.invoke('send-mixtape-invite', {
    body: {
      inviteEmail,
      senderEmail,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const createTicketCheckoutSession = async ({ eventId, eventTitle, eventDate, eventLocation }) => {
  requireSupabase();

  const { data, error } = await supabase.functions.invoke('create-ticket-checkout', {
    body: {
      eventId,
      eventTitle,
      eventDate,
      eventLocation,
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.url) {
    throw new Error('Unable to start ticket checkout session.');
  }

  return data;
};

export const fetchPaidEventTicketPurchases = async ({ userId, limit = 200 }) => {
  requireSupabase();

  const { data, error } = await supabase
    .from(TICKET_PURCHASE_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};
