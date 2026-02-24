// src/lib/supabase.js
// ════════════════════════════════════════
// Supabase kliens konfiguráció
// ════════════════════════════════════════
// A VITE_SUPABASE_URL és VITE_SUPABASE_ANON_KEY értékeket
// a .env fájlba kell beírni (lásd: DEPLOY-GUIDE.md)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials missing! Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// ── Auth helpers (PIN-based) ──

export async function loginCoach(pin) {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('pin', pin)
    .eq('active', true)
    .single();
  if (error || !data) return { error: 'Hibás PIN' };
  return { data, type: 'coach' };
}

export async function loginPlayer(name, pin) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .ilike('name', `%${name}%`)
    .eq('pin', pin)
    .eq('active', true)
    .single();
  if (error || !data) return { error: 'Hibás név vagy PIN' };
  return { data, type: 'player' };
}

// ── Coaches CRUD ──

export async function getCoaches() {
  const { data } = await supabase.from('coaches').select('*').order('created_at');
  return data || [];
}

export async function upsertCoach(coach) {
  const { data, error } = await supabase.from('coaches').upsert(coach).select().single();
  return { data, error };
}

export async function deleteCoach(id) {
  return supabase.from('coaches').delete().eq('id', id);
}

// ── Players CRUD ──

export async function getPlayers() {
  const { data } = await supabase.from('players').select('*').order('id');
  return data || [];
}

export async function upsertPlayer(player) {
  const { data, error } = await supabase.from('players').upsert(player).select().single();
  return { data, error };
}

export async function deletePlayer(id) {
  return supabase.from('players').delete().eq('id', id);
}

export async function togglePlayerActive(id, active) {
  return supabase.from('players').update({ active }).eq('id', id);
}

// ── Events CRUD ──

export async function getEvents() {
  const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
  return data || [];
}

export async function createEvent(event) {
  const { data, error } = await supabase.from('events').insert(event).select().single();
  return { data, error };
}

export async function deleteEvent(id) {
  return supabase.from('events').delete().eq('id', id);
}

// ── Wellness Logs ──

export async function getWellnessLogs(playerId, days = 28) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from('wellness_logs')
    .select('*')
    .eq('player_id', playerId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date');
  return data || [];
}

export async function getAllWellnessToday() {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('wellness_logs')
    .select('*')
    .eq('date', today);
  return data || [];
}

export async function submitWellness(log) {
  const { data, error } = await supabase
    .from('wellness_logs')
    .upsert(log, { onConflict: 'player_id,date' })
    .select()
    .single();
  return { data, error };
}

// ── RPE Logs ──

export async function getRpeLogs(playerId, days = 28) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from('rpe_logs')
    .select('*')
    .eq('player_id', playerId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date');
  return data || [];
}

export async function submitRpe(log) {
  const { data, error } = await supabase
    .from('rpe_logs')
    .upsert(log, { onConflict: 'player_id,event_id' })
    .select()
    .single();
  return { data, error };
}

// ── Injuries ──

export async function getInjuries() {
  const { data } = await supabase.from('injuries').select('*').order('date', { ascending: false });
  return data || [];
}

export async function createInjury(injury) {
  const { data, error } = await supabase.from('injuries').insert(injury).select().single();
  return { data, error };
}

export async function updateInjuryRtp(id, rtpPhase) {
  return supabase.from('injuries').update({ rtp_phase: rtpPhase }).eq('id', id);
}

export async function deleteInjury(id) {
  return supabase.from('injuries').delete().eq('id', id);
}

// ── Force Plate ──

export async function getForcePlate(playerId, days = 28) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from('force_plate_logs')
    .select('*')
    .eq('player_id', playerId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date');
  return data || [];
}

export async function submitForcePlate(log) {
  const { data, error } = await supabase
    .from('force_plate_logs')
    .upsert(log, { onConflict: 'player_id,date' })
    .select()
    .single();
  return { data, error };
}

// ── Settings ──

export async function getSettings() {
  const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single();
  return data;
}

export async function updateSettings(settings) {
  return supabase.from('app_settings').update({ ...settings, updated_at: new Date().toISOString() }).eq('id', 1);
}

