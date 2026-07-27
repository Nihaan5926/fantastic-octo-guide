import { create } from 'zustand';

interface Channel {
  id: string;
  name: string;
  description: string;
  classification: string;
  status: string;
  created_by: string;
  created_at?: string;
}

interface Message {
  id: string;
  channel_id: string;
  sender: string;
  content?: string;
  body?: string;
  subject?: string;
  classification: string;
  read_by: any;
  created_at?: string;
}

interface Member {
  id: string;
  channel_id: string;
  user_id: string;
  user_name: string;
  role: string;
  joined_at?: string;
}

interface MessagingState {
  channels: Channel[];
  messages: Message[];
  members: Member[];
  selectedChannel: Channel | null;
  channelsPagination: { page: number; limit: number; total: number; totalPages: number };
  messagesPagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  search: string;

  setSearch: (search: string) => void;
  fetchChannels: (page?: number) => Promise<void>;
  fetchChannel: (id: string) => Promise<void>;
  createChannel: (data: Partial<Channel>) => Promise<void>;
  updateChannel: (id: string, data: Partial<Channel>) => Promise<void>;
  deleteChannel: (id: string) => Promise<void>;
  fetchMessages: (channelId: string, page?: number) => Promise<void>;
  sendMessage: (channelId: string, data: Partial<Message>) => Promise<void>;
  deleteMessage: (channelId: string, messageId: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  fetchMembers: (channelId: string) => Promise<void>;
  addMember: (channelId: string, data: Partial<Member>) => Promise<void>;
  removeMember: (channelId: string, memberId: string) => Promise<void>;
  selectChannel: (channel: Channel | null) => void;
  setChannelsPage: (page: number) => void;
  setMessagesPage: (page: number) => void;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  channels: [],
  messages: [],
  members: [],
  selectedChannel: null,
  channelsPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  messagesPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  isLoading: false,
  isSaving: false,
  error: null,
  search: '',

  setSearch: (search: string) => set({ search }),

  fetchChannels: async (page?: number) => {
    const { search, channelsPagination: pagination } = get();
    set({ isLoading: true, error: null });
    try {
      const { data } = await (await import('./api')).messagingApi.listChannels({
        page: page || pagination.page,
        limit: pagination.limit,
        search,
      });
      set({
        channels: data.data,
        channelsPagination: data.pagination,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isLoading: false });
    }
  },

  fetchChannel: async (id: string) => {
    try {
      const { data } = await (await import('./api')).messagingApi.getChannel(id);
      set({ selectedChannel: data });
    } catch {}
  },

  createChannel: async (channelData) => {
    set({ isSaving: true, error: null });
    try {
      await (await import('./api')).messagingApi.createChannel(channelData);
      set({ isSaving: false });
      await get().fetchChannels();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  updateChannel: async (id, channelData) => {
    set({ isSaving: true, error: null });
    try {
      await (await import('./api')).messagingApi.updateChannel(id, channelData);
      set({ isSaving: false });
      await get().fetchChannels();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  deleteChannel: async (id) => {
    set({ isSaving: true, error: null });
    try {
      await (await import('./api')).messagingApi.deleteChannel(id);
      set({ isSaving: false, selectedChannel: null });
      await get().fetchChannels();
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  fetchMessages: async (channelId, page?) => {
    const { messagesPagination: pagination } = get();
    set({ isLoading: true, error: null });
    try {
      const { data } = await (await import('./api')).messagingApi.listMessages({
        page: page || pagination.page,
        limit: pagination.limit,
        channel_id: channelId,
      });
      set({
        messages: data.data,
        messagesPagination: data.pagination,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isLoading: false });
    }
  },

  sendMessage: async (channelId, msgData) => {
    set({ isSaving: true });
    try {
      await (await import('./api')).messagingApi.sendMessage({ ...msgData, channel_id: channelId });
      set({ isSaving: false });
      await get().fetchMessages(channelId);
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, isSaving: false });
    }
  },

  deleteMessage: async (channelId, messageId) => {
    try {
      await (await import('./api')).messagingApi.deleteMessage(messageId);
      await get().fetchMessages(channelId);
    } catch {}
  },

  markAsRead: async (messageId) => {
    try {
      await (await import('./api')).messagingApi.updateMessage(messageId, { is_read: true });
    } catch {}
  },

  fetchMembers: async (channelId) => {
    try {
      const { data } = await (await import('./api')).messagingApi.listMembers(channelId);
      set({ members: data.data || data });
    } catch {}
  },

  addMember: async (channelId, memberData) => {
    try {
      await (await import('./api')).messagingApi.addMember(channelId, memberData);
      await get().fetchMembers(channelId);
    } catch {}
  },

  removeMember: async (channelId, memberId) => {
    try {
      await (await import('./api')).messagingApi.removeMember(channelId, memberId);
      await get().fetchMembers(channelId);
    } catch {}
  },

  selectChannel: (channel) => {
    set({ selectedChannel: channel, messages: [], members: [] });
    if (channel) {
      get().fetchMessages(channel.id);
      get().fetchMembers(channel.id);
    }
  },

  setChannelsPage: (page: number) => {
    set((s) => ({ channelsPagination: { ...s.channelsPagination, page } }));
  },

  setMessagesPage: (page: number) => {
    set((s) => ({ messagesPagination: { ...s.messagesPagination, page } }));
  },
}));
