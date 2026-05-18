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
  if (!data) return getMoneyDashboardSettings(userId)
  return data
}

// ─── Constants (capacity fields — opex fields are now in baseline_fixed_costs) ─

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

// ─── Baseline fixed costs ─────────────────────────────────────────────────────

export const getBaselineFixedCosts = async (userId) => {
  const { data, error } = await supabase
    .from('baseline_fixed_costs')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
  if (error) console.error('baseline_fixed_costs load:', error)
  return data || []
}

// Full replace: delete all existing rows for user, then insert the new set.
// Returns the freshly inserted rows.
export const saveBaselineFixedCosts = async (userId, costs) => {
  const { error: delErr } = await supabase
    .from('baseline_fixed_costs')
    .delete()
    .eq('user_id', userId)
  if (delErr) throw delErr

  if (!costs || costs.length === 0) return []

  const rows = costs.map((c, i) => ({
    user_id: userId,
    name: c.name,
    amount: Number(c.amount) || 0,
    frequency: c.frequency || 'monthly',
    sort_order: i,
  }))

  const { data, error } = await supabase
    .from('baseline_fixed_costs')
    .insert(rows)
    .select()
  if (error) throw error
  return data || []
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

// ─── Weekly variable expenses ──────────────────────────────────────────────────

export const getWeeklyVariableExpenses = async (entryId) => {
  if (!entryId) return []
  const { data, error } = await supabase
    .from('weekly_variable_expenses')
    .select('*')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true })
  if (error) console.error('variable_expenses load:', error)
  return data || []
}

// Full replace for the week: delete all rows for this entry, insert new set.
export const saveWeeklyVariableExpenses = async (entryId, userId, expenses) => {
  const { error: delErr } = await supabase
    .from('weekly_variable_expenses')
    .delete()
    .eq('entry_id', entryId)
  if (delErr) throw delErr

  if (!expenses || expenses.length === 0) return []

  const rows = expenses
    .filter(e => Number(e.amount) > 0)
    .map(e => ({
      entry_id: entryId,
      user_id: userId,
      category: e.category,
      amount: Number(e.amount) || 0,
    }))

  if (rows.length === 0) return []

  const { data, error } = await supabase
    .from('weekly_variable_expenses')
    .insert(rows)
    .select()
  if (error) throw error
  return data || []
}

// ─── Full model reset (used only when user explicitly resets) ─────────────────

export const resetDashboardForModelChange = async (userId, oldModel) => {
  await deleteMoneyDashboardEntriesForModel(userId, oldModel)
  await deleteMoneyDashboardConstants(userId, oldModel)
}
