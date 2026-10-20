export type Permission =
  | 'VIEW_PRIVATE_CHANNELS'
  | 'POST_ANNOUNCEMENTS'
  | 'MODERATE_MESSAGES'
  | 'CREATE_EVENTS'
  | 'MANAGE_EVENTS'
  | 'MANAGE_MEMBERS'
  | 'MODERATE_MEMBERS'
  | 'MANAGE_ROLES'
  | 'CREATE_INVITES'
  | 'CREATE_CHANNELS';

export interface Community {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface CommunityDirectoryEntry {
  community: Community;
  category: string;
  accent: string;
  createdBy: string;
  memberIds: string[];
}

export interface CommunitySummary extends CommunityDirectoryEntry {
  role?: Role;
  memberCount: number;
  isMember: boolean;
  sharedMembers: PublicUser[];
}

export interface CommunityMembershipView {
  community: Community;
  category: string;
  role: Role;
  roleDescription: string;
}

export interface DemoAccountView extends PublicUser {
  memberships: CommunityMembershipView[];
}

export interface Role {
  id: string;
  name: string;
  color: string;
  rank: number;
  system: boolean;
  permissions: Permission[];
}

export interface UserActivity {
  label: string;
  date: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  bio: string;
  avatarColor?: string;
  status: 'online' | 'away' | 'offline';
  memberStatus: 'active' | 'banned' | 'removed';
  joinedAt: string;
  lastActiveAt: string;
  activity: UserActivity[];
  passwordSalt: string;
  passwordHash: string;
}

export type SafeUser = Omit<User, 'passwordSalt' | 'passwordHash'>;

export interface PublicUser extends SafeUser {
  role: Role;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'announcement' | 'private';
  order: number;
  allowedRoleIds: string[];
  allowedUserIds?: string[];
  createdBy?: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface DirectThread {
  id: string;
  name?: string;
  participantIds: string[];
  updatedAt: string;
}

export interface DirectMessage {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  locationDescription?: string;
  googleMapsUrl?: string;
  googleMapsEmbedUrl?: string;
  startsAt: string;
  endsAt: string;
  category: string;
  color: string;
  recurring: boolean;
  recurrence: 'weekly' | 'monthly' | null;
  createdBy: string;
  invitedUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EventParticipant {
  id: string;
  eventId: string;
  userId: string;
  status: 'going' | 'not_going';
  updatedAt: string;
}

export interface Invite {
  id: string;
  code: string;
  link: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  uses: number;
  revokedAt: string | null;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface CommunitySpace {
  community: Community;
  memberships: Array<{ userId: string; roleId: string; memberStatus: User['memberStatus'] }>;
  roles: Role[];
  channels: Channel[];
  messages: Message[];
  events: CommunityEvent[];
  eventParticipants: EventParticipant[];
  invites: Invite[];
  auditLogs: AuditLog[];
}

export interface AccessRequest {
  id: string;
  kind: 'direct' | 'channel';
  requesterId: string;
  recipientId: string;
  communityId: string;
  targetId: string;
  title: string;
  participantIds: string[];
  status: 'pending' | 'ignored' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface AccessRequestView extends AccessRequest {
  requesterName: string;
  recipientName: string;
  communityName: string;
}

export interface PersonalNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  checklist: Array<{ text: string; done: boolean }>;
  table: string[][];
  locationDescription: string;
  googleMapsUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface DemoDatabase {
  accessPolicyVersion?: 1;
  accessRequests?: AccessRequest[];
  notes?: PersonalNote[];
  schemaVersion: 1;
  community: Community;
  users: User[];
  roles: Role[];
  channels: Channel[];
  messages: Message[];
  directThreads: DirectThread[];
  directMessages: DirectMessage[];
  events: CommunityEvent[];
  eventParticipants: EventParticipant[];
  invites: Invite[];
  auditLogs: AuditLog[];
  primaryMemberStatuses?: Record<string, User['memberStatus']>;
  communitySpaces?: CommunitySpace[];
  communityDirectory?: CommunityDirectoryEntry[];
  demoAccountIds?: string[];
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiFailure {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export interface MemberCapabilities {
  canChangeRole: boolean;
  canModerate: boolean;
}

export interface MemberView extends PublicUser {
  capabilities: MemberCapabilities;
}

export interface EventView extends CommunityEvent {
  creator: PublicUser;
  attendance: {
    going: number;
    notGoing: number;
    current: 'going' | 'not_going' | null;
  };
}

export interface MessageView extends Message {
  author: PublicUser;
  canDelete: boolean;
}

export interface DirectThreadView extends DirectThread {
  otherParticipant: PublicUser;
  participants?: PublicUser[];
  title?: string;
  isGroup?: boolean;
  latestMessage: DirectMessage | null;
}
