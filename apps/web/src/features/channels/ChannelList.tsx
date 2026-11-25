import { Hash, LockKeyhole, Megaphone } from 'lucide-react';
import type { Channel } from '@gc/shared';

export interface ChannelWithAccess extends Channel {
  messageCount: number;
  canPost: boolean;
}

export function ChannelList({ channels, selectedId, onSelect }: { channels: ChannelWithAccess[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <nav className="channel-list" aria-label="Canais da comunidade">
      <div className="channel-list__header"><span>Canais</span><small>{channels.length} disponíveis</small></div>
      {channels.map((channel) => {
        const Icon = channel.type === 'private' ? LockKeyhole : channel.type === 'announcement' ? Megaphone : Hash;
        return (
          <button key={channel.id} className={selectedId === channel.id ? 'channel-item channel-item--active' : 'channel-item'} onClick={() => onSelect(channel.id)}>
            <span className="channel-item__icon"><Icon size={17} /></span>
            <span><strong>{channel.name}</strong><small>{channel.description}</small></span>
            <em>{channel.messageCount}</em>
          </button>
        );
      })}
    </nav>
  );
}
