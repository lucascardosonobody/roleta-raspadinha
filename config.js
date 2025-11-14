// ============================================
// CONFIGURAÇÃO CENTRAL DO SISTEMA
// Arquivo: config.js
// ============================================

const CONFIG = {
    // 🌐 DOMÍNIO PRINCIPAL
    DOMAIN: 'https://geo-iot.com',
    
    // 📡 ENDPOINTS DA API
    API: {
        BASE_URL: 'https://geo-iot.com/api',
        
        // Endpoints específicos
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
        EXECUTAR_SORTEIO_AUTOMATICO: '/api/executar-sorteio-automatico',
        LIMPAR_COMANDO: '/api/limpar-comando',
        EXECUTAR_SORTEIO_AUTOMATICO: '/api/executar-sorteio-automatico'
    },
    
    // 📁 CAMINHOS DOS ARQUIVOS
    PATHS: {
        // Páginas públicas
        HOME: '/final.html',
        
        // Jogos
        ROLETA: '/testeroleta.html',
        RASPADINHA: '/login2.html',
        
        // Admin
        DASHBOARD: '/admin/dashboard.html',
        PAINEL_ADM: '/admin/paineladm.html',
        HISTORICO: '/admin/historico.html',
        INDICACOES: '/admin/indicacoes.html',
        
        // Recursos
        IMAGES: '/assets/images',
        VIDEOS: '/assets/videos'
    },
    
    // ⚙️ CONFIGURAÇÕES GERAIS
    SETTINGS: {
        POLLING_INTERVAL: 2000,        // 2 segundos
        AUTO_REFRESH_INTERVAL: 30000,  // 30 segundos
        DASHBOARD_REFRESH: 60000,      // 1 minuto
    }
};

// 🔧 Função auxiliar para construir URLs
CONFIG.buildURL = function(endpoint) {
    if (endpoint.startsWith('http')) {
        return endpoint;
    }
    return `${this.DOMAIN}${endpoint}`;
};

// 🔧 Função auxiliar para fazer requisições
CONFIG.fetch = async function(endpoint, options = {}) {
    const url = this.buildURL(endpoint);
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };
    
    try {
        console.log(`📡 Requisição para: ${url}`);
        const response = await fetch(url, mergedOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✅ Resposta recebida de: ${url}`);
        return { ok: true, data };
        
    } catch (error) {
        console.error(`❌ Erro na requisição para ${url}:`, error);
        return { ok: false, error: error.message };
    }
};

// Exportar configuração
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}