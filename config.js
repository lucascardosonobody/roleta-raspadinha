// ============================================
// CONFIGURAÇÃO CENTRAL DO SISTEMA
// Arquivo: config.js
// ============================================

const CONFIG = {
    // 🌐 DETECÇÃO AUTOMÁTICA DE AMBIENTE
    get DOMAIN() {
        // Se estiver em ambiente Node.js (servidor)
        if (typeof window === 'undefined') {
            return process.env.API_URL || 'http://localhost:3000';
        }
        
        // Se estiver no navegador
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        // Localhost e variações
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        
        // Render.com
        if (hostname.includes('onrender.com')) {
            return `${protocol}//${hostname}`;
        }
        
        // Domínio em produção
        if (hostname === 'geo-iot.com' || hostname === 'www.geo-iot.com') {
            return 'https://geo-iot.com';
        }
        
        // Fallback: usar o próprio domínio atual
        return `${protocol}//${hostname}${window.location.port ? ':' + window.location.port : ''}`;
    },

    // 🔗 URL base da API (pode ser diferente do domínio principal)
    get API_BASE() {
        return this.DOMAIN;
    },

    // 📡 ENDPOINTS DA API
    API: {
        // === PARTICIPANTES ===
        PARTICIPANTES: '/api/participantes',
        PARTICIPANTES_ATIVOS: '/api/participantes-ativos',
        PARTICIPANTES_COM_INDICACOES: '/api/participantes-com-indicacoes',
        INDICADOS: '/api/indicados',
        MEUS_INDICADOS: (id) => `/api/meus-indicados/${id}`,
        
        // === PRÊMIOS ===
        PREMIOS: '/api/premios',
        PREMIOS_ATIVOS: '/api/premios-ativos',
        PREMIO_BY_ID: (id) => `/api/premios/${id}`,
        
        // === SORTEIOS ===
        SORTEIOS_AGENDADOS: '/api/sorteios-agendados',
        SORTEIO_BY_ID: (id) => `/api/sorteios-agendados/${id}`,
        SORTEIO_ATIVO_AGORA: '/api/sorteio-ativo-agora',
        GERAR_SORTEIO_SINCRONIZADO: '/api/gerar-sorteio-sincronizado',
        SORTEIO_SINCRONIZADO_BY_SEED: (seed) => `/api/sorteio-sincronizado/${seed}`,
        
        // === RASPADINHAS ===
        RASPADINHAS_AGENDADAS: '/api/raspadinhas-agendadas',
        RASPADINHA_BY_ID: (id) => `/api/raspadinhas-agendadas/${id}`,
        RASPADINHA_ATIVA_AGORA: '/api/raspadinha-ativa-agora',
        
        // === HISTÓRICO ===
        HISTORICO: '/api/historico-sorteios',
        LIMPAR_REGISTROS_INVALIDOS: '/api/limpar-registros-invalidos',
        TESTE_HISTORICO: '/api/teste-historico',
        
        // === DASHBOARD ===
        DASHBOARD: '/api/dashboard',
        
        // === CADASTRO E AÇÕES ===
        SIGNUP: '/api/signup',
        INDICACOES: '/api/indicacoes',
        REGISTRAR_SORTEIO: '/api/registrar-sorteio',
        REGISTRAR_AVALIACAO: '/api/registrar-avaliacao',
        
        // === COMANDOS (Sistema de comunicação Admin -> Cliente) ===
        VERIFICAR_COMANDO: '/api/verificar-comando',
        ENVIAR_COMANDO: '/api/enviar-comando',
        LIMPAR_COMANDO: '/api/limpar-comando',
        STREAM_COMANDOS: '/api/stream-comandos',
        
        // === CONFIGURAÇÕES ===
        CONFIGURACOES: '/api/configuracoes',
        CONFIG_SORTEIO: '/api/config-sorteio',
        VERIFICAR_SORTEIO: '/api/verificar-sorteio',
        
        // === ZAPIER ===
        TESTAR_ZAPIER: '/api/testar-zapier',
        
        // === UTILITÁRIOS ===
        CORRIGIR_HORARIOS: '/api/corrigir-horarios'
    },

    // 📁 CAMINHOS DOS ARQUIVOS
    PATHS: {
        // === PÁGINAS PÚBLICAS ===
        HOME: '/final.html',
        LOGIN: '/login.html',
        
        // === JOGOS ===
        ROLETA: '/testeroleta.html',
        RASPADINHA: '/login2.html',
        
        // === ADMIN ===
        DASHBOARD: '/dashboard.html',
        PAINEL_ADM: '/paineladm.html',
        HISTORICO: '/historico.html',
        INDICACOES: '/indicacoes.html',
        NOTIFICACOES: '/notificacoes.html',
        
        // === RECURSOS ===
        IMAGES: '/assets/images',
        VIDEOS: '/assets/videos',
        CSS: '/assets/css',
        JS: '/assets/js'
    },

    // ⚙️ CONFIGURAÇÕES GERAIS
    SETTINGS: {
        // Intervalos de polling/refresh
        POLLING_INTERVAL: 2000,           // 2 segundos (verificação de comandos)
        AUTO_REFRESH_INTERVAL: 30000,     // 30 segundos (refresh automático)
        DASHBOARD_REFRESH: 60000,         // 1 minuto (refresh do dashboard)
        SSE_HEARTBEAT: 15000,             // 15 segundos (heartbeat SSE)
        
        // Timeouts
        REQUEST_TIMEOUT: 30000,           // 30 segundos
        COMMAND_TIMEOUT: 5000,            // 5 segundos (limpeza automática de comandos)
        
        // Limites
        MAX_RETRIES: 3,                   // Máximo de tentativas em caso de erro
        RETRY_DELAY: 1000,                // Delay entre tentativas (1 segundo)
        
        // Cache
        CACHE_TTL: 300000,                // 5 minutos
        
        // UI
        TOAST_DURATION: 3000,             // 3 segundos
        LOADING_MIN_TIME: 500             // Tempo mínimo de loading (UX)
    },

    // 🎨 CONFIGURAÇÕES DE INTERFACE
    UI: {
        COLORS: {
            PRIMARY: '#FF1493',
            SECONDARY: '#FFD700',
            SUCCESS: '#10B981',
            ERROR: '#EF4444',
            WARNING: '#F59E0B',
            INFO: '#3B82F6'
        },
        
        ANIMATIONS: {
            DURATION_FAST: 200,
            DURATION_NORMAL: 300,
            DURATION_SLOW: 500
        }
    },

    // 🔐 CONFIGURAÇÕES DE SEGURANÇA
    SECURITY: {
        ALLOWED_ORIGINS: [
            'https://roleta-raspadinha.onrender.com',
            'https://roleta-raspadinha-m7li2z5db-lucascardosonobodys-projects.vercel.app/dashboard.html',
            'https://geo-iot.com',
            'http://localhost:3000',
            'http://localhost:5500',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5500'
        ]
    }
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Constrói URL completa a partir de um endpoint
 * @param {string} endpoint - Endpoint da API ou path
 * @returns {string} URL completa
 */
CONFIG.buildURL = function(endpoint) {
    // Se já for uma URL completa, retorna ela mesma
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        return endpoint;
    }
    
    // Se for uma função (endpoint dinâmico), não processa agora
    if (typeof endpoint === 'function') {
        throw new Error('Use CONFIG.buildURL() após chamar a função do endpoint. Ex: CONFIG.buildURL(CONFIG.API.PREMIO_BY_ID(5))');
    }
    
    // Garante que o endpoint começa com /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    
    // Retorna URL completa
    return `${this.API_BASE}${cleanEndpoint}`;
};

/**
 * Faz requisições HTTP com retry automático
 * @param {string} endpoint - Endpoint da API
 * @param {object} options - Opções do fetch
 * @returns {Promise<any>} Dados da resposta
 */
CONFIG.fetch = async function(endpoint, options = {}) {
    const url = this.buildURL(endpoint);
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'include' // Importante para cookies de sessão
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };

    let lastError = null;
    
    // Sistema de retry
    for (let attempt = 1; attempt <= this.SETTINGS.MAX_RETRIES; attempt++) {
        try {
            console.log(`📡 [Tentativa ${attempt}/${this.SETTINGS.MAX_RETRIES}] Requisição para: ${url}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.SETTINGS.REQUEST_TIMEOUT);
            
            const response = await fetch(url, {
                ...mergedOptions,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Verificar status HTTP
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            // Tentar parsear JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                console.log(`✅ Resposta recebida de: ${url}`, data);
                return data;
            } else {
                const text = await response.text();
                console.log(`✅ Resposta (texto) recebida de: ${url}`);
                return text;
            }
            
        } catch (error) {
            lastError = error;
            console.error(`❌ [Tentativa ${attempt}/${this.SETTINGS.MAX_RETRIES}] Erro na requisição para ${url}:`, error.message);
            
            // Se não for a última tentativa, aguarda antes de tentar novamente
            if (attempt < this.SETTINGS.MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, this.SETTINGS.RETRY_DELAY * attempt));
            }
        }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    console.error(`❌ FALHA COMPLETA após ${this.SETTINGS.MAX_RETRIES} tentativas para ${url}`);
    throw lastError;
};

/**
 * GET request simplificado
 */
CONFIG.get = async function(endpoint, options = {}) {
    return this.fetch(endpoint, { ...options, method: 'GET' });
};

/**
 * POST request simplificado
 */
CONFIG.post = async function(endpoint, data = {}, options = {}) {
    return this.fetch(endpoint, {
        ...options,
        method: 'POST',
        body: JSON.stringify(data)
    });
};

/**
 * PUT request simplificado
 */
CONFIG.put = async function(endpoint, data = {}, options = {}) {
    return this.fetch(endpoint, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(data)
    });
};

/**
 * DELETE request simplificado
 */
CONFIG.delete = async function(endpoint, options = {}) {
    return this.fetch(endpoint, { ...options, method: 'DELETE' });
};

/**
 * Verifica se está em ambiente de desenvolvimento
 */
CONFIG.isDevelopment = function() {
    if (typeof window === 'undefined') {
        return process.env.NODE_ENV !== 'production';
    }
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

/**
 * Verifica se está em ambiente de produção
 */
CONFIG.isProduction = function() {
    return !this.isDevelopment();
};

/**
 * Log condicional (só mostra em desenvolvimento)
 */
CONFIG.log = function(...args) {
    if (this.isDevelopment()) {
        console.log('[CONFIG]', ...args);
    }
};

/**
 * Conecta ao stream SSE de comandos
 */
CONFIG.connectSSE = function(onMessage, onError) {
    const url = this.buildURL(this.API.STREAM_COMANDOS);
    
    console.log('📡 Conectando ao SSE:', url);
    
    const eventSource = new EventSource(url);
    
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('📨 Mensagem SSE recebida:', data);
            if (onMessage) onMessage(data);
        } catch (error) {
            console.error('❌ Erro ao processar mensagem SSE:', error);
        }
    };
    
    eventSource.onerror = (error) => {
        console.error('❌ Erro na conexão SSE:', error);
        if (onError) onError(error);
    };
    
    return eventSource;
};

/**
 * Inicia polling de comandos
 */
CONFIG.startPolling = function(callback, interval = null) {
    const pollInterval = interval || this.SETTINGS.POLLING_INTERVAL;
    
    const poll = async () => {
        try {
            const response = await this.get(this.API.VERIFICAR_COMANDO);
            if (response && response.comando) {
                callback(response.comando);
            }
        } catch (error) {
            console.error('❌ Erro no polling:', error);
        }
    };
    
    // Primeira chamada imediata
    poll();
    
    // Configurar interval
    const intervalId = setInterval(poll, pollInterval);
    
    // Retornar função para parar o polling
    return () => clearInterval(intervalId);
};

// ============================================
// EXPORTAÇÃO
// ============================================

// Node.js / CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// ES6 Modules
if (typeof exports !== 'undefined') {
    exports.CONFIG = CONFIG;
}

// Browser global
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// Log de inicialização
if (typeof window !== 'undefined') {
    console.log('✅ CONFIG carregado com sucesso!');
    console.log('🌐 Domínio detectado:', CONFIG.DOMAIN);
    console.log('🔧 Ambiente:', CONFIG.isDevelopment() ? 'Desenvolvimento' : 'Produção');
}
