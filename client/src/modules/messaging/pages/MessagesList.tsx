import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Send, Users, MessageSquare, RefreshCw, Download, ChevronDown } from 'lucide-react';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import { messagingApi } from '../api';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormSelect, FormTextarea } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';
import { useMessagingStore } from '../store';
import { CardSkeleton } from '../../../components/common/LoadingSkeleton';
import { socket } from '../../../core/socket';

const defaultChannel = { name: '', description: '', channel_type: 'TEAM' };

export default function MessagesList() {
  const store = useMessagingStore();
  const [channelModal, setChannelModal] = useState(false);
  const [editChannel, setEditChannel] = useState<any>(null);
  const [channelForm, setChannelForm] = useState(defaultChannel);
  const [deleteChannelId, setDeleteChannelId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    socket.connect();
    socket.on('message:new', (msg: any) => {
      if (store.selectedChannel && msg.channel_id === store.selectedChannel.id) {
        store.fetchMessages(store.selectedChannel.id);
      }
    });
    socket.on('typing:start', (data: any) => {
      if (store.selectedChannel && data.channelId === store.selectedChannel.id) {
        setTypingUsers((prev) => {
          if (prev.includes(data.userId)) return prev;
          return [...prev, data.userId];
        });
      }
    });
    socket.on('typing:stop', (data: any) => {
      if (store.selectedChannel && data.channelId === store.selectedChannel.id) {
        setTypingUsers((prev) => prev.filter((u) => u !== data.userId));
      }
    });

    return () => {
      socket.off('message:new');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (store.selectedChannel) {
      socket.emit('channel:join', { channelId: store.selectedChannel.id });
    }
  }, [store.selectedChannel]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    store.fetchChannels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [store.messages]);

  const handleSearch = (val: string) => {
    store.setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      store.fetchChannels();
    }, 300);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data } = await messagingApi.listChannels({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToCSV(allItems, 'messaging-channels-export');
      toast.success(`Exported ${allItems.length} channels as CSV`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      const { data } = await messagingApi.listChannels({ limit: 1000 });
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, 'messaging-channels-export');
      toast.success(`Exported ${allItems.length} channels as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleChannelCreate = () => {
    setEditChannel(null);
    setChannelForm(defaultChannel);
    setChannelModal(true);
  };

  const handleChannelEdit = (channel: any) => {
    setEditChannel(channel);
    setChannelForm({ name: channel.name, description: channel.description || '', channel_type: channel.channel_type || 'TEAM' });
    setChannelModal(true);
  };

  const handleChannelSave = async () => {
    if (!channelForm.name) { toast.error('Channel name is required'); return; }
    if (editChannel) {
      await store.updateChannel(editChannel.id, channelForm);
      toast.success('Channel updated');
    } else {
      await store.createChannel(channelForm);
      toast.success('Channel created');
    }
    setChannelModal(false);
  };

  const handleChannelDelete = async () => {
    if (deleteChannelId) {
      await store.deleteChannel(deleteChannelId);
      toast.success('Channel deleted');
      setDeleteChannelId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !store.selectedChannel) return;
    const channelId = store.selectedChannel.id;
    try {
      if (socket.connected) {
        socket.emit('message:send', { channelId: channelId, body: messageText, subject: messageText.slice(0, 50) });
      } else {
        await store.sendMessage(channelId, { body: messageText, subject: messageText.slice(0, 50) });
      }
      setMessageText('');
      socket.emit('typing:stop', { channelId });
      toast.success('Message sent');
      setTimeout(() => store.fetchMessages(channelId), 300);
    } catch (err: any) {
      toast.error('Failed to send message');
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    if (!store.selectedChannel) return;
    socket.emit('typing:start', { channelId: store.selectedChannel.id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { channelId: store.selectedChannel?.id });
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0">
      <div className="w-80 shrink-0 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <PageHeader title="Channels" subtitle="Secure messaging" onCreate={handleChannelCreate} createLabel="New Channel">
            <SearchBar value={store.search} onChange={handleSearch} placeholder="Search channels..." />
          </PageHeader>
          <div className="px-4 pb-2">
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen(!exportOpen)}
                disabled={exporting}
                className="btn-secondary w-full text-xs"
              >
                {exporting ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-pulse">Exporting...</span>
                  </span>
                ) : (
                  <>
                    <Download size={14} />
                    Export Channels
                    <ChevronDown size={12} />
                  </>
                )}
              </button>
              {exportOpen && (
                <div className="absolute left-0 top-full mt-1 w-44 bg-bg-card border border-border rounded-xl shadow-xl z-50 py-1">
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2"
                  >
                    <Download size={14} /> Export JSON
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {store.isLoading && store.channels.length === 0 ? (
            <CardSkeleton />
          ) : store.channels.length === 0 ? (
            <div className="p-4 text-center text-text-muted text-sm">No channels found</div>
          ) : (
            store.channels.map((ch: any) => (
              <div
                key={ch.id}
                onClick={() => store.selectChannel(ch)}
                className={`p-3 cursor-pointer border-b border-border transition-colors hover:bg-bg-hover ${
                  store.selectedChannel?.id === ch.id ? 'bg-accent/10 border-l-2 border-l-accent' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-text-muted" />
                    <span className="text-sm font-medium truncate">{ch.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ClassificationBadge level={ch.classification} />
                  </div>
                </div>
                {ch.description && <p className="text-xs text-text-muted mt-1 truncate">{ch.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge label={ch.status} color={ch.status === 'ACTIVE' ? 'green' : 'gray'} />
                  <span className="text-[10px] text-text-muted">{ch.created_at ? new Date(ch.created_at).toLocaleDateString() : ''}</span>
                </div>
                <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleChannelEdit(ch)} className="p-0.5 rounded hover:bg-bg-hover text-text-muted" title="Edit">
                    <Edit size={12} />
                  </button>
                  <button onClick={() => setDeleteChannelId(ch.id)} className="p-0.5 rounded hover:bg-bg-hover text-accent-danger" title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {store.selectedChannel ? (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{store.selectedChannel.name}</h2>
                <p className="text-xs text-text-muted">{store.selectedChannel.description || 'No description'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => store.fetchMessages(store.selectedChannel!.id)} className="btn-ghost text-xs" title="Refresh">
                  <RefreshCw size={14} />
                </button>
                <span className="text-xs text-text-muted">{store.members.length} members</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {store.isLoading ? (
                <CardSkeleton />
              ) : store.messages.length === 0 ? (
                <div className="text-center text-text-muted py-8">No messages yet. Start the conversation.</div>
              ) : (
                store.messages.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'current' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-xl ${
                      msg.sender === 'current'
                        ? 'bg-accent/20 border border-accent/30'
                        : 'bg-bg-tertiary border border-border'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">{msg.sender}</span>
                        <ClassificationBadge level={msg.classification} />
                        <span className="text-[10px] text-text-muted">{new Date(msg.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.body || msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {typingUsers.length > 0 && (
              <div className="px-4 pb-1">
                <span className="text-xs text-text-muted italic">
                  {typingUsers.length === 1 ? 'Someone is typing...' : `${typingUsers.length} people are typing...`}
                </span>
              </div>
            )}

            <div className="p-4 border-t border-border">
              <div className="flex items-end gap-2">
                  <textarea
                    value={messageText}
                    onChange={handleTyping}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                  className="input min-h-[40px] resize-none flex-1"
                  rows={2}
                  disabled={store.isSaving}
                />
                <button onClick={handleSendMessage} disabled={store.isSaving || !messageText.trim()} className="btn-primary px-4">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto text-text-muted mb-4" />
              <h3 className="text-lg font-semibold mb-1">Select a Channel</h3>
              <p className="text-sm text-text-muted">Choose a channel from the left to view messages</p>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={channelModal} onClose={() => setChannelModal(false)} title={editChannel ? 'Edit Channel' : 'New Channel'} size="md">
        <div className="space-y-4">
          <FormInput label="Name" required value={channelForm.name} onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })} />
          <FormTextarea label="Description" value={channelForm.description} onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Channel Type" options={[{ value: 'TEAM', label: 'Team' }, { value: 'BROADCAST', label: 'Broadcast' }, { value: 'DIRECT', label: 'Direct' }]} value={channelForm.channel_type} onChange={(e) => setChannelForm({ ...channelForm, channel_type: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setChannelModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleChannelSave} disabled={store.isSaving} className="btn-primary">
            {store.isSaving ? 'Saving...' : editChannel ? 'Update' : 'Create'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteChannelId}
        onClose={() => setDeleteChannelId(null)}
        onConfirm={handleChannelDelete}
        title="Delete Channel"
        message="Are you sure you want to delete this channel? All messages will be lost."
        isLoading={store.isSaving}
      />
    </div>
  );
}