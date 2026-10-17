import { createContext, useContext } from 'react';
import type { AppNotification, Group, Thread, ThreadRef, User, WishItem } from './types';

export type Route =
  | { name: 'home' }
  | { name: 'groups' }
  | { name: 'draws' }
  | { name: 'wishes'; ownerId?: string; ownerName?: string }
  | { name: 'chats' }
  | { name: 'profile' }
  | { name: 'createGroup' }
  | { name: 'group'; id: string }
  | { name: 'members'; id: string }
  | { name: 'draw'; id: string }
  | { name: 'conv'; ref: ThreadRef }
  | { name: 'notifications' }
  | { name: 'account' }
  | { name: 'privacy' }
  | { name: 'help' };

export const TABS: Route['name'][] = ['home', 'groups', 'draws', 'wishes', 'chats', 'profile'];

export interface AppState {
  user: User;
  groups: Group[];
  groupsReady: boolean;
  threads: Thread[];
  /** gid -> id de quem eu tirei (ronda atual) */
  assignments: Record<string, string | null>;
  notifications: AppNotification[];
  myWishes: WishItem[];
  chatError: string;
  route: Route;
  depth: number;
  go: (r: Route) => void;
  tab: (r: Route) => void;
  back: () => void;
  replace: (r: Route) => void;
  openJoin: (code?: string) => void;
  openShare: (g: Group) => void;
}

export const AppCtx = createContext<AppState>(null as unknown as AppState);
export const useApp = () => useContext(AppCtx);

export const unreadOf = (t: Thread | undefined, uid: string) => (t ? Math.max(0, t.count - (t.reads[uid] || 0)) : 0);
