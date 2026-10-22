import { useSyncExternalStore } from 'react'
import type { Progress } from '../types'
import { fetchRemoteProgress, saveRemoteProgress } from './cloud'
import { mergeProgress } from './merge'
import {
  applyProgress,
  clearProgress,
  defaultProgress,
  getProgress,
  subscribeProgress,
} from './storage'

const OWNER_KEY = 'kanji-trainer-owner-v1'
const DIRTY_KEY = 'kanji-trainer-dirty-v1'
const PUSH_DELAY_MS = 700
const PULL_MIN_MS = 15_000

export interface SyncSnapshot {
  state: 'idle' | 'syncing' | 'saving' | 'synced' | 'error'
  error: string | null
  lastSyncedAt: number | null
}

let snapshot: SyncSnapshot = { state: 'idle', error: null, lastSyncedAt: null }
const snapshotListeners = new Set<() => void>()

function setSnapshot(next: SyncSnapshot) {
  snapshot = next
  for (const listener of snapshotListeners) listener()
}

function subscribeSnapshot(cb: () => void): () => void {
  snapshotListeners.add(cb)
  return () => snapshotListeners.delete(cb)
}

export function useSyncStatus(): SyncSnapshot {
  return useSyncExternalStore(
    subscribeSnapshot,
    () => snapshot,
    () => snapshot,
  )
}

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
}

function writeOwner(userId: string | null) {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId)
    else localStorage.removeItem(OWNER_KEY)
  } catch {
    // Storage unavailable — sync still works for this page load.
  }
}

function readDirty(): boolean {
  try {
    return localStorage.getItem(DIRTY_KEY) === '1'
  } catch {
    return false
  }
}

function writeDirty(value: boolean) {
  try {
    if (value) localStorage.setItem(DIRTY_KEY, '1')
    else localStorage.removeItem(DIRTY_KEY)
  } catch {
    // Storage unavailable — keep the in-memory flag.
  }
}

function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Progress could not be synced.'
}

let activeUserId: string | null = null
let revision = 0
let dirty = false
let started = false
let applying = false
let pushTimer: ReturnType<typeof setTimeout> | undefined
let unsubscribeStorage: (() => void) | null = null
let pushChain: Promise<void> = Promise.resolve()
let lastPull = 0
let syncGeneration = 0

function applyRemote(next: Progress) {
  applying = true
  try {
    applyProgress(next)
  } finally {
    applying = false
  }
}

async function pushOnce() {
  const userId = activeUserId
  if (!userId) return

  const payload = getProgress()
  setSnapshot({ state: 'saving', error: null, lastSyncedAt: snapshot.lastSyncedAt })

  try {
    const savedRevision = await saveRemoteProgress(userId, payload, revision + 1)
    if (activeUserId !== userId) return

    revision = savedRevision
    if (JSON.stringify(getProgress()) === JSON.stringify(payload)) {
      dirty = false
      writeDirty(false)
      setSnapshot({ state: 'synced', error: null, lastSyncedAt: Date.now() })
    } else {
      dirty = true
      writeDirty(true)
      schedulePush()
    }
  } catch (error) {
    if (activeUserId !== userId) return
    dirty = true
    writeDirty(true)
    setSnapshot({ state: 'error', error: messageOf(error), lastSyncedAt: snapshot.lastSyncedAt })
  }
}

function pushNow(): Promise<void> {
  pushChain = pushChain.then(pushOnce, pushOnce)
  return pushChain
}

function schedulePush() {
  if (!activeUserId || applying || !started) return

  dirty = true
  writeDirty(true)
  setSnapshot({ state: 'saving', error: null, lastSyncedAt: snapshot.lastSyncedAt })

  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = undefined
    void pushNow()
  }, PUSH_DELAY_MS)
}

function onStorageChange() {
  if (started && !applying) schedulePush()
}

async function pullRemote() {
  const userId = activeUserId
  if (!userId || applying || dirty) return

  try {
    const remote = await fetchRemoteProgress(userId)
    if (!remote || activeUserId !== userId) return

    const local = getProgress()
    const remoteIsNewer =
      remote.revision > revision || (remote.data.updatedAt ?? 0) > (local.updatedAt ?? 0)
    if (!remoteIsNewer) return

    applyRemote(remote.data)
    revision = remote.revision
    dirty = false
    writeDirty(false)
    setSnapshot({ state: 'synced', error: null, lastSyncedAt: Date.now() })
  } catch (error) {
    if (activeUserId === userId) {
      setSnapshot({ state: 'error', error: messageOf(error), lastSyncedAt: snapshot.lastSyncedAt })
    }
  }
}

function onVisible() {
  if (document.visibilityState !== 'visible' || !activeUserId) return

  const now = Date.now()
  if (now - lastPull < PULL_MIN_MS) return
  lastPull = now

  if (dirty) void pushNow()
  else void pullRemote()
}

function onPageHide() {
  if (activeUserId && dirty) void pushNow()
}

function detach() {
  started = false
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = undefined
  }
  unsubscribeStorage?.()
  unsubscribeStorage = null
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener('focus', onVisible)
  window.removeEventListener('pagehide', onPageHide)
}

/**
 * Load the cloud snapshot and merge it with local progress.
 *
 * - First sign-in with anonymous local progress: merge once, then cloud is authoritative.
 * - Returning on this browser: cloud wins unless the local copy has unsynced edits.
 * - Switching accounts: the previous account's local cache is discarded.
 */
export async function startSync(userId: string) {
  detach()
  const generation = ++syncGeneration
  activeUserId = userId
  revision = 0
  dirty = readDirty()
  setSnapshot({ state: 'syncing', error: null, lastSyncedAt: null })

  try {
    const remote = await fetchRemoteProgress(userId)
    if (activeUserId !== userId || generation !== syncGeneration) return

    const owner = readOwner()
    const local = getProgress()

    if (owner && owner !== userId) {
      // Never carry another account's cached progress into this one.
      clearProgress()
      if (remote) {
        applyRemote(remote.data)
        revision = remote.revision
        dirty = false
        writeDirty(false)
      } else {
        applyRemote(defaultProgress())
        revision = 0
        await pushNow()
      }
    } else if (owner === userId) {
      revision = remote?.revision ?? 0
      if (dirty) {
        applyRemote(mergeProgress(local, remote?.data ?? defaultProgress()))
        await pushNow()
      } else if (remote) {
        const localIsNewer = (local.updatedAt ?? 0) > (remote.data.updatedAt ?? 0)
        if (localIsNewer) {
          applyRemote(mergeProgress(local, remote.data))
          await pushNow()
        } else {
          applyRemote(remote.data)
          dirty = false
          writeDirty(false)
        }
      } else {
        await pushNow()
      }
    } else {
      // First sign-in on this browser: merge any anonymous progress into the account.
      const merged = mergeProgress(local, remote?.data ?? defaultProgress())
      applyRemote(merged)
      revision = remote?.revision ?? 0
      dirty = true
      writeDirty(true)
      await pushNow()
    }

    if (activeUserId !== userId || generation !== syncGeneration) return

    writeOwner(userId)
    started = true
    unsubscribeStorage = subscribeProgress(onStorageChange)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener('pagehide', onPageHide)
    lastPull = Date.now()

    if (snapshot.state !== 'error') {
      setSnapshot({ state: 'synced', error: null, lastSyncedAt: Date.now() })
    }
  } catch (error) {
    if (generation !== syncGeneration || activeUserId !== userId) return
    setSnapshot({ state: 'error', error: messageOf(error), lastSyncedAt: null })
    throw error
  }
}

/** Push pending edits before signing out. */
export function flushSync(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = undefined
  }
  return dirty ? pushNow() : Promise.resolve()
}

export function stopSync(clearLocal = true) {
  syncGeneration += 1
  detach()
  activeUserId = null
  revision = 0
  pushChain = Promise.resolve()

  if (clearLocal) {
    dirty = false
    writeDirty(false)
    writeOwner(null)
    clearProgress()
  }

  setSnapshot({ state: 'idle', error: null, lastSyncedAt: null })
}
