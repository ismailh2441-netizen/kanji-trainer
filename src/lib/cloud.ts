import type { Progress } from '../types'
import { normalizeProgress } from './storage'
import { supabase } from './supabase'

export interface RemoteProgress {
  data: Progress
  revision: number
}

export async function fetchRemoteProgress(userId: string): Promise<RemoteProgress | null> {
  const { data, error } = await supabase
    .from('progress')
    .select('data, revision')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    data: normalizeProgress(data.data),
    revision: typeof data.revision === 'number' ? data.revision : 0,
  }
}

export async function saveRemoteProgress(
  userId: string,
  progress: Progress,
  revision: number,
): Promise<number> {
  const { data, error } = await supabase
    .from('progress')
    .upsert({ user_id: userId, data: progress, revision }, { onConflict: 'user_id' })
    .select('revision')
    .single()

  if (error) throw error
  return typeof data?.revision === 'number' ? data.revision : revision
}

export async function deleteCloudAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account')
  if (!error) return

  if (error.message.toLowerCase().includes('not signed in')) {
    throw new Error('Your session expired. Sign in again, then delete your account.')
  }
  if (error.message.toLowerCase().includes('could not find the function')) {
    throw new Error('Account deletion is not set up in Supabase yet.')
  }
  throw new Error(error.message)
}
