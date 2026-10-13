import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const eventTypes = new Set([
  'prescription_pending',
  'prescription_reviewed',
  'clinical_annotation',
  'health_variable',
  'medication_administered',
]);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const accessToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!accessToken) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Server configuration missing' }, 500);

  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } });
  const service = createClient(supabaseUrl, serviceRoleKey);
  const { data: authData, error: authError } = await caller.auth.getUser(accessToken);
  if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { eventId, eventType, patientId } = body ?? {};
  if (typeof eventId !== 'string' || typeof patientId !== 'string' || !eventTypes.has(eventType)) {
    return json({ error: 'Invalid notification event' }, 400);
  }

  const actorId = authData.user.id;
  const verifiedEvent = await verifyEvent(service, eventId, eventType, patientId, actorId);
  if (!verifiedEvent) return json({ error: 'Event not found or not authorized' }, 403);

  const { error: claimError } = await service
    .from('notification_dispatches')
    .insert({ event_id: eventId, event_type: eventType });
  if (claimError?.code === '23505') return json({ sent: 0, duplicate: true });
  if (claimError) return json({ error: 'Could not claim notification event' }, 500);

  const { data: links, error: linksError } = await service
    .from('paciente_usuario')
    .select('usuario_id')
    .eq('paciente_id', patientId)
    .neq('usuario_id', actorId);
  if (linksError) return json({ error: 'Could not resolve recipients' }, 500);

  const userIds = [...new Set((links ?? []).map((link) => link.usuario_id))];
  if (!userIds.length) {
    return json({ sent: 0 });
  }

  const [{ data: preferences }, { data: devices }, { data: activeUsers }] = await Promise.all([
    service.from('notification_preferences').select('user_id, medicines, alerts').in('user_id', userIds),
    service.from('push_devices').select('user_id, expo_push_token').in('user_id', userIds),
    service.from('usuarios').select('id').in('id', userIds).eq('activo', true),
  ]);

  const activeIds = new Set((activeUsers ?? []).map((user) => user.id));
  const preferenceByUser = new Map((preferences ?? []).map((item) => [item.user_id, item]));
  const preferenceKey = eventType === 'clinical_annotation' || eventType === 'health_variable' ? 'alerts' : 'medicines';
  const tokens = (devices ?? [])
    .filter((device) => activeIds.has(device.user_id) && (preferenceByUser.get(device.user_id)?.[preferenceKey] ?? true))
    .map((device) => device.expo_push_token);

  if (!tokens.length) {
    return json({ sent: 0 });
  }

  const notification = notificationCopy(eventType, verifiedEvent.estado);
  const messages = tokens.map((to) => ({
    to,
    title: notification.title,
    body: notification.body,
    sound: 'default',
    priority: 'high',
    channelId: 'clinical-updates',
    data: { eventType, patientId },
  }));

  let expoResponse;
  try {
    expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch {
    await releaseClaim(service, eventId, eventType);
    return json({ error: 'Push provider is unavailable' }, 502);
  }
  if (!expoResponse.ok) {
    await releaseClaim(service, eventId, eventType);
    return json({ error: 'Push provider request failed' }, 502);
  }

  const tickets = await expoResponse.json();
  if (Array.isArray(tickets.data) && !tickets.data.some((ticket) => ticket.status === 'ok')) {
    await releaseClaim(service, eventId, eventType);
    return json({ error: 'Push provider rejected all device tokens' }, 502);
  }
  return json({ sent: messages.length });
});

async function verifyEvent(service, eventId, eventType, patientId, actorId) {
  if (eventType === 'prescription_pending') {
    const { data } = await service.from('medicamentos').select('id, paciente_id, estado, recetado_por').eq('id', eventId).maybeSingle();
    return data?.paciente_id === patientId && data.estado === 'pendiente' && data.recetado_por === actorId ? data : null;
  }
  if (eventType === 'prescription_reviewed') {
    const { data } = await service.from('medicamentos').select('id, paciente_id, estado, revisado_por').eq('id', eventId).maybeSingle();
    return data?.paciente_id === patientId && ['aprobado', 'revision'].includes(data.estado) && data.revisado_por === actorId ? data : null;
  }
  if (eventType === 'clinical_annotation') {
    const { data } = await service.from('anotaciones').select('id, paciente_id, registrado_por').eq('id', eventId).maybeSingle();
    return data?.paciente_id === patientId && data.registrado_por === actorId ? data : null;
  }
  if (eventType === 'health_variable') {
    const { data } = await service.from('variables_salud').select('id, paciente_id, registrado_por').eq('id', eventId).maybeSingle();
    return data?.paciente_id === patientId && data.registrado_por === actorId ? data : null;
  }

  const { data: record } = await service
    .from('registro_medicacion')
    .select('id, medicamento_id, registrado_por')
    .eq('id', eventId)
    .maybeSingle();
  if (!record || record.registrado_por !== actorId) return null;
  const { data: medication } = await service.from('medicamentos').select('paciente_id').eq('id', record.medicamento_id).maybeSingle();
  return medication?.paciente_id === patientId ? record : null;
}

function notificationCopy(eventType, status) {
  if (eventType === 'prescription_pending') return { title: 'Nueva prescripción', body: 'Hay una prescripción pendiente de revisión.' };
  if (eventType === 'prescription_reviewed') return {
    title: status === 'aprobado' ? 'Prescripción aprobada' : 'Prescripción requiere revisión',
    body: status === 'aprobado' ? 'Se actualizó una prescripción asociada.' : 'Una prescripción fue enviada a revisión.',
  };
  if (eventType === 'clinical_annotation') return { title: 'Nueva observación', body: 'Se registró una actualización clínica.' };
  if (eventType === 'health_variable') return { title: 'Nueva medición', body: 'Se registró una variable de salud.' };
  return { title: 'Actualización de medicamento', body: 'Se registró un cambio en la administración de una dosis.' };
}

async function releaseClaim(service, eventId, eventType) {
  await service.from('notification_dispatches')
    .delete()
    .eq('event_id', eventId)
    .eq('event_type', eventType);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}