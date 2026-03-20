import { supabase } from './supabase'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'

// ─── Week helpers ─────────────────────────────────────────────────────────────

export const getWeekDates = (date = new Date()) => {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
    label: `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`,
  }
}

export const getPreviousWeekDates = (weeksBack = 1, from = new Date()) => {
  return getWeekDates(subWeeks(from, weeksBack))
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export const getMoneyDashboardSettings = async (userId) => {
  const { data, error } = await supabase
    .from('money_dashboard_settings')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') console.error('settings load:', error)
  return data || null
}

export const upsertMoneyDashboardSettings = async (userId, payload) => {
  const { data, error } = await supabase
    .from('money_dashboard_settings')
    .upsert(
      { user_id: userId, ...payload, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .maybeSingle()
  if (error) throw error
  // upsert succeeded but returned no row (can happen with some RLS configs) — fetch directly
  if (!data) return getMoneyDashboardSettings(userId)
  return data
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const getMoneyDashboardConstants = async (userId, businessModel) => {
  const { data, error } = await supabase
    .from('money_dashboard_constants')
    .select('*')
    .eq('user_id', userId)
    .eq('business_model', businessModel)
    .single()
  if (error && error.code !== 'PGRST116') console.error('constants load:', error)
  return data?.constants_json || null
}

export const upsertMoneyDashboardConstants = async (userId, businessModel, constantsJson) => {
  const { data, error } = await supabase
    .from('money_dashboard_constants')
    .upsert(
      {
        user_id: userId,
        business_model: businessModel,
        constants_json: constantsJson,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,business_model' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteMoneyDashboardConstants = async (userId, businessModel) => {
  const { error } = await supabase
    .from('money_dashboard_constants')
    .delete()
    .eq('user_id', userId)
    .eq('business_model', businessModel)
  if (error) throw error
}

// ─── Weekly entries ───────────────────────────────────────────────────────────

export const getMoneyDashboardEntryForWeek = async (userId, businessModel, weekStartDate) => {
  const { data, error } = await supabase
    .from('money_dashboard_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('business_model', businessModel)
    .eq('entry_week_start_date', weekStartDate)
    .single()
  if (error && error.code !== 'PGRST116') console.error('entry load:', error)
  return data || null
}

export const upsertMoneyDashboardEntry = async (userId, businessModel, weekStartDate, weekEndDate, entryJson, notes = '') => {
  const { data, error } = await supabase
    .from('money_dashboard_entries')
    .upsert(
      {
        user_id: userId,
        business_model: businessModel,
        entry_week_start_date: weekStartDate,
        entry_week_end_date: weekEndDate,
        entry_json: entryJson,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,business_model,entry_week_start_date' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export const getMoneyDashboardEntries = async (userId, businessModel, limit = 52) => {
  const { data, error } = await supabase
    .from('money_dashboard_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('business_model', businessModel)
    .order('entry_week_start_date', { ascending: false })
    .limit(limit)
  if (error) console.error('entries load:', error)
  return data || []
}

export const deleteMoneyDashboardEntriesForModel = async (userId, businessModel) => {
  const { error } = await supabase
    .from('money_dashboard_entries')
    .delete()
    .eq('user_id', userId)
    .eq('business_model', businessModel)
  if (error) throw error
}

// ─── Full model reset ─────────────────────────────────────────────────────────

export const resetDashboardForModelChange = async (userId, oldModel) => {
  await deleteMoneyDashboardEntriesForModel(userId, oldModel)
  await deleteMoneyDashboardConstants(userId, oldModel)
}
