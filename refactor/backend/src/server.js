import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { supabase } from './lib/supabase.js';
import { badRequest, ok, nowIso, mapPrize } from './lib/utils.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const frontendUrl = process.env.FRONTEND_URL || '*';

app.use(cors({ origin: frontendUrl === '*' ? true : [frontendUrl], credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => ok(res, { ok: true, service: 'roleta-raspadinha-backend', at: nowIso() }));

async function getActiveCommand() {
  const { data, error } = await supabase
    .from('commands')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

app.post('/api/signup', async (req, res) => {
  try {
    const { nome, email, whatsapp } = req.body;
    if (!nome || !whatsapp) return badRequest(res, 'Nome e WhatsApp são obrigatórios.');

    const normalizedEmail = email?.trim() || `nao-informado-${Date.now()}@exemplo.com`;
    const payload = {
      nome: nome.trim(),
      email: normalizedEmail.toLowerCase(),
      whatsapp: String(whatsapp).trim(),
      chances: 5,
      sorteado: false
    };

    const { data, error } = await supabase
      .from('participants')
      .upsert(payload, { onConflict: 'email' })
      .select('*')
      .single();

    if (error) throw error;
    return ok(res, { success: true, participante: data }, 201);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.get('/api/participantes', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('participants').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return ok(res, data || []);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.get('/api/participantes-ativos', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('sorteado', false)
      .gt('chances', 0)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return ok(res, data || []);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.get('/api/premios', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('prizes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return ok(res, (data || []).map(mapPrize));
  } catch (error) {
    return badRequest(res, error);
  }
});

app.get('/api/premios-ativos', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('prizes').select('*').eq('ativo', true).order('nome');
    if (error) throw error;
    return ok(res, (data || []).map(mapPrize));
  } catch (error) {
    return badRequest(res, error);
  }
});

app.post('/api/premios', async (req, res) => {
  try {
    const { nome, descricao = '', icone = '🎁', ativo = true, tipo = 'ambos', probabilidade = 1 } = req.body;
    if (!nome) return badRequest(res, 'Nome do prêmio é obrigatório.');
    const { data, error } = await supabase
      .from('prizes')
      .insert({ nome, descricao, icone, ativo, tipo, probabilidade })
      .select('*')
      .single();
    if (error) throw error;
    return ok(res, { success: true, premio: mapPrize(data) }, 201);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.put('/api/premios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patch = { ...req.body, updated_at: nowIso() };
    const { data, error } = await supabase.from('prizes').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return ok(res, { success: true, premio: mapPrize(data) });
  } catch (error) {
    return badRequest(res, error);
  }
});

app.delete('/api/premios/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('prizes').delete().eq('id', req.params.id);
    if (error) throw error;
    return ok(res, { success: true });
  } catch (error) {
    return badRequest(res, error);
  }
});

app.delete('/api/participantes/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('participants').delete().eq('id', req.params.id);
    if (error) throw error;
    return ok(res, { success: true });
  } catch (error) {
    return badRequest(res, error);
  }
});

app.post('/api/indicacoes', async (req, res) => {
  try {
    const { participante_id, indicacoes } = req.body;
    if (!participante_id || !Array.isArray(indicacoes) || !indicacoes.length) {
      return badRequest(res, 'Participante e indicações são obrigatórios.');
    }

    const rows = indicacoes
      .filter((item) => item?.nome && item?.whatsapp)
      .map((item) => ({
        participante_id,
        nome: item.nome,
        whatsapp: item.whatsapp,
        email: item.email || null
      }));

    const { data, error } = await supabase.from('referrals').insert(rows).select('*');
    if (error) throw error;

    await supabase.rpc('increment_participant_chances', { participant_id_input: participante_id, increment_by: rows.length });

    return ok(res, { success: true, indicacoes: data || [] }, 201);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.get('/api/indicacoes/:participante_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('participante_id', req.params.participante_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ok(res, data || []);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.get('/api/meus-indicados/:participante_id', async (req, res) => {
  return app._router.handle({ ...req, url: `/api/indicacoes/${req.params.participante_id}`, method: 'GET' }, res, () => null);
});

app.get('/api/participantes-com-indicacoes', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('participants_with_referrals')
      .select('*')
      .order('data_cadastro', { ascending: false });
    if (error) throw error;
    return ok(res, { success: true, participantes: data || [] });
  } catch (error) {
    return badRequest(res, error);
  }
});

app.get('/api/sorteios-agendados', async (_req, res) => {
  try {
    const { data: campaigns, error: campaignsError } = await supabase
      .from('draw_campaigns')
      .select('*')
      .order('data_sorteio', { ascending: false });

    if (campaignsError) throw campaignsError;

    const { data: schedules, error: schedulesError } = await supabase
      .from('prize_schedules')
      .select('*')
      .eq('campaign_kind', 'roleta');

    if (schedulesError) throw schedulesError;

    const data = (campaigns || []).map((campaign) => ({
      ...campaign,
      prize_schedules: (schedules || []).filter(
        (item) => item.campaign_id === campaign.id
      )
    }));

    return ok(res, data);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.post('/api/sorteios-agendados', async (req, res) => {
  try {
    const { data_sorteio, hora_inicio, hora_fim, horarios = [] } = req.body;
    const { data, error } = await supabase.from('draw_campaigns').insert({ data_sorteio, hora_inicio, hora_fim, tipo: 'roleta', status: 'pendente' }).select('*').single();
    if (error) throw error;
    if (Array.isArray(horarios) && horarios.length) {
      const rows = horarios.map((item) => ({ ...item, campaign_id: data.id, campaign_kind: 'roleta' }));
      const { error: scheduleError } = await supabase.from('prize_schedules').insert(rows);
      if (scheduleError) throw scheduleError;
    }
    return ok(res, { success: true, sorteio: data }, 201);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.put('/api/sorteios-agendados/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('draw_campaigns').update(req.body).eq('id', req.params.id).select('*').single();
    if (error) throw error;
    return ok(res, { success: true, sorteio: data });
  } catch (error) {
    return badRequest(res, error);
  }
});

app.get('/api/raspadinhas-agendadas', async (_req, res) => {
  try {
    const { data: campaigns, error: campaignsError } = await supabase
      .from('scratch_campaigns')
      .select('*')
      .order('data_raspadinha', { ascending: false });

    if (campaignsError) throw campaignsError;

    const { data: schedules, error: schedulesError } = await supabase
      .from('prize_schedules')
      .select('*')
      .eq('campaign_kind', 'raspadinha');

    if (schedulesError) throw schedulesError;

    const data = (campaigns || []).map((campaign) => ({
      ...campaign,
      prize_schedules: (schedules || []).filter(
        (item) => item.campaign_id === campaign.id
      )
    }));

    return ok(res, data);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.post('/api/raspadinhas-agendadas', async (req, res) => {
  try {
    const { data_raspadinha, hora_inicio, hora_fim, horarios = [] } = req.body;
    const { data, error } = await supabase.from('scratch_campaigns').insert({ data_raspadinha, hora_inicio, hora_fim, status: 'pendente' }).select('*').single();
    if (error) throw error;
    if (Array.isArray(horarios) && horarios.length) {
      const rows = horarios.map((item) => ({ ...item, campaign_id: data.id, campaign_kind: 'raspadinha' }));
      const { error: scheduleError } = await supabase.from('prize_schedules').insert(rows);
      if (scheduleError) throw scheduleError;
    }
    return ok(res, { success: true, raspadinha: data }, 201);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.put('/api/raspadinhas-agendadas/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('scratch_campaigns').update(req.body).eq('id', req.params.id).select('*').single();
    if (error) throw error;
    return ok(res, { success: true, raspadinha: data });
  } catch (error) {
    return badRequest(res, error);
  }
});

app.delete('/api/raspadinhas-agendadas/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('scratch_campaigns').delete().eq('id', req.params.id);
    if (error) throw error;
    return ok(res, { success: true });
  } catch (error) {
    return badRequest(res, error);
  }
});

app.get('/api/dashboard', async (_req, res) => {
  try {
    const [{ count: participantes }, { count: premios }, { count: historico }] = await Promise.all([
      supabase.from('participants').select('*', { count: 'exact', head: true }),
      supabase.from('prizes').select('*', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('winners').select('*', { count: 'exact', head: true })
    ]);

    const { data: latestWinners, error } = await supabase
      .from('winners')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    return ok(res, {
      total_participantes: participantes || 0,
      premios_distribuidos: historico || 0,
      sorteios_realizados: historico || 0,
      taxa_conversao: participantes ? Math.round(((historico || 0) / participantes) * 100) : 0,
      participantes_semana: 0,
      participantes_mes: 0,
      crescimento_semana: 0,
      premios_mais_sorteados: latestWinners || [],
      ganhadores_roleta: (latestWinners || []).filter((item) => item.tipo_sorteio === 'roleta'),
      ganhadores_raspadinha: (latestWinners || []).filter((item) => item.tipo_sorteio === 'raspadinha'),
      premios_disponiveis: premios || 0
    });
  } catch (error) {
    return badRequest(res, error);
  }
});

app.get('/api/historico-sorteios', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('winners').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return ok(res, data || []);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.post('/api/registrar-sorteio', async (req, res) => {
  try {
    const { participante_id, premio_id, tipo_sorteio = 'roleta' } = req.body;
    if (!participante_id || !premio_id) return badRequest(res, 'participante_id e premio_id são obrigatórios.');

    const [{ data: participante }, { data: premio }] = await Promise.all([
      supabase.from('participants').select('*').eq('id', participante_id).single(),
      supabase.from('prizes').select('*').eq('id', premio_id).single()
    ]);

    if (!participante || !premio) return badRequest(res, 'Participante ou prêmio não encontrado.', 404);

    const { data, error } = await supabase
      .from('winners')
      .insert({
        participante_id,
        premio_id,
        nome: participante.nome,
        email: participante.email,
        whatsapp: participante.whatsapp,
        premio_nome: premio.nome,
        premio_descricao: premio.descricao,
        premio_icone: premio.icone,
        tipo_sorteio
      })
      .select('*')
      .single();
    if (error) throw error;

    await supabase.from('participants').update({ sorteado: true, chances: 0, data_sorteio: nowIso() }).eq('id', participante_id);
    return ok(res, { success: true, sorteio: data }, 201);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.post('/api/registrar-avaliacao', async (req, res) => {
  try {
    const { participante_id } = req.body;
    if (!participante_id) return badRequest(res, 'participante_id é obrigatório.');
    const { data, error } = await supabase.from('reviews').insert({ participante_id }).select('*').single();
    if (error) throw error;
    await supabase.rpc('increment_participant_chances', { participant_id_input: participante_id, increment_by: 2 });
    return ok(res, { success: true, avaliacao: data }, 201);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.get('/api/config-sorteio', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('app_settings').select('*').eq('key', 'config_sorteio').maybeSingle();
    if (error) throw error;
    return ok(res, data?.value || { ativo: false, participantes_necessarios: 10 });
  } catch (error) {
    return badRequest(res, error);
  }
});

app.post('/api/config-sorteio', async (req, res) => {
  try {
    const { data, error } = await supabase.from('app_settings').upsert({ key: 'config_sorteio', value: req.body }).select('*').single();
    if (error) throw error;
    return ok(res, { success: true, configuracao: data.value });
  } catch (error) {
    return badRequest(res, error);
  }
});

app.post('/api/enviar-comando', async (req, res) => {
  try {
    const { tipo = 'INICIAR_SORTEIO', payload = {} } = req.body;
    const { data, error } = await supabase.from('commands').insert({ tipo, payload, status: 'pending' }).select('*').single();
    if (error) throw error;
    return ok(res, { success: true, comando: data }, 201);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.get('/api/verificar-comando', async (_req, res) => {
  try {
    const comando = await getActiveCommand();
    return ok(res, { success: true, comando: comando || null });
  } catch (error) {
    return badRequest(res, error);
  }
});

app.post('/api/limpar-comando', async (_req, res) => {
  try {
    const comando = await getActiveCommand();
    if (comando) {
      const { error } = await supabase.from('commands').update({ status: 'processed' }).eq('id', comando.id);
      if (error) throw error;
    }
    return ok(res, { success: true });
  } catch (error) {
    return badRequest(res, error);
  }
});

app.post('/api/executar-sorteio-automatico', async (req, res) => {
  try {
    const { participante_id, premio_id } = req.body;
    req.body.tipo_sorteio = 'roleta';
    return app._router.handle({ ...req, url: '/api/registrar-sorteio', method: 'POST', body: { participante_id, premio_id, tipo_sorteio: 'roleta' } }, res, () => null);
  } catch (error) {
    return badRequest(res, error);
  }
});

app.listen(port, () => {
  console.log(`🚀 Backend rodando na porta ${port}`);
});
