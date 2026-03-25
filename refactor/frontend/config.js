(function (global) {
  const envApi = global.__API_BASE_URL__;
  const hostApi = global.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://SEU-BACKEND-NO-RENDER.onrender.com';

  const API_BASE_URL = (envApi || hostApi).replace(/\/$/, '');

  const CONFIG = {
    DOMAIN: API_BASE_URL,
    API: {
      BASE_URL: API_BASE_URL,
      PARTICIPANTES: '/api/participantes',
      PARTICIPANTES_ATIVOS: '/api/participantes-ativos',
      PARTICIPANTES_COM_INDICACOES: '/api/participantes-com-indicacoes',
      PREMIOS: '/api/premios',
      PREMIOS_ATIVOS: '/api/premios-ativos',
      SORTEIOS_AGENDADOS: '/api/sorteios-agendados',
      RASPADINHAS_AGENDADAS: '/api/raspadinhas-agendadas',
      HISTORICO: '/api/historico-sorteios',
      DASHBOARD: '/api/dashboard',
      SIGNUP: '/api/signup',
      INDICACOES: '/api/indicacoes',
      REGISTRAR_SORTEIO: '/api/registrar-sorteio',
      REGISTRAR_AVALIACAO: '/api/registrar-avaliacao',
      VERIFICAR_COMANDO: '/api/verificar-comando',
      ENVIAR_COMANDO: '/api/enviar-comando',
      LIMPAR_COMANDO: '/api/limpar-comando',
      EXECUTAR_SORTEIO_AUTOMATICO: '/api/executar-sorteio-automatico',
      CONFIG_SORTEIO: '/api/config-sorteio',
      INDICACOES_BY_PARTICIPANTE: (id) => `/api/indicacoes/${id}`,
      MEUS_INDICADOS: (id) => `/api/meus-indicados/${id}`
    },
    PATHS: {
      HOME: '/final.html',
      ROLETA: '/testeroleta.html',
      RASPADINHA: '/login2.html',
      DASHBOARD: '/admin/dashboard.html',
      PAINEL_ADM: '/admin/paineladm.html',
      HISTORICO: '/admin/historico.html',
      INDICACOES: '/admin/indicacoes.html'
    }
  };

  CONFIG.buildURL = function buildURL(endpoint) {
    if (typeof endpoint === 'function') return endpoint;
    return endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  };

  CONFIG.fetch = async function request(endpoint, options = {}) {
    const resolvedEndpoint = typeof endpoint === 'function' ? endpoint() : endpoint;
    const url = CONFIG.buildURL(resolvedEndpoint);

    const headers = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };

    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message = payload && typeof payload === 'object' ? (payload.error || payload.message) : String(payload);
      throw new Error(message || `Erro HTTP ${response.status}`);
    }

    return payload;
  };

  global.CONFIG = CONFIG;
})(window);
