(function (global) {
  const envApi = global.__API_BASE_URL__;
  const hostApi = global.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://roleta-raspadinha-ki12.onrender.com';

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

  async function request(path, options = {}) {
    const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error?.message ||
        data?.error ||
        `HTTP ${response.status}`;

      console.error('Erro completo da API:', data);
      throw new Error(message);
    }

    return data;
  }

  CONFIG.request = request;
  CONFIG.fetch = request;

  global.CONFIG = CONFIG;
})(window);