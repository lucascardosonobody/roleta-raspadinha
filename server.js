const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;


// ==== LOGIN DO ADMIN ====
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'unisense#2025'; // troque pra uma senha forte de verdade depois

// ==== WEBHOOKS DO ZAPIER ====
const ZAPIER_WEBHOOK_PREMIO = 'https://hooks.zapier.com/hooks/catch/25364211/u8wlf1i/';
const ZAPIER_WEBHOOK_INDICACAO = 'https://hooks.zapier.com/hooks/catch/SEU_ID_AQUI/indicacao';

// Função para enviar dados ao Zapier
async function enviarParaZapier(webhookUrl, dados) {
    try {
        console.log('📤 Enviando para Zapier:', dados);
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dados)
        });
        
        if (response.ok) {
            console.log('✅ Zapier notificado com sucesso');
            return true;
        } else {
            console.error('❌ Erro ao notificar Zapier:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao enviar para Zapier:', error);
        return false;
    }
}

// 🧪 ROTA DE TESTE DO ZAPIER — precisa ficar ANTES do protegerAdmin
app.get('/api/testar-zapier', async (req, res) => {
    console.log('🧪 Testando envio para Zapier...');

    const dadosTeste = {
        nome: 'João Teste',
        email: 'lcc172007@gmail.com',
        whatsapp: '11999999999',
        premio: 'Teste de Prêmio 🎁',
        premio_descricao: 'Apenas um teste do sistema',
        premio_icone: '🎁',
        tipo_sorteio: 'Teste Manual',
        data_sorteio: new Date().toLocaleString('pt-BR'),
        sorteio_id: 999,
        timestamp: Date.now()
    };

    try {
        const resultado = await enviarParaZapier(ZAPIER_WEBHOOK_PREMIO, dadosTeste);
        res.json({ success: resultado, dados_enviados: dadosTeste });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// Middleware base
app.use(cors({
    origin: [
        'https://roleta-raspadinha.onrender.com',
        'https://geo-iot.com',
        'http://localhost:3000' // para testes locais
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Middleware adicional de CORS
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        'https://roleta-raspadinha.onrender.com',
        'https://geo-iot.com',
        'http://localhost:3000'
    ];
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Responder OPTIONS requests imediatamente
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true })); // pra ler <form method="POST">

// Sessão (login)
app.use(session({
    secret: 'umaSenhaBemSecretaAqui', // TROCA ISSO DEPOIS
    resave: false,
    saveUninitialized: false,
}));

// 🔒 Middleware de proteção para páginas administrativas
function protegerAdmin(req, res, next) {
    const path = req.path;

    console.log('[protegerAdmin]', {
        path: path,
        logado: !!(req.session && req.session.adminLogado),
        sessionID: req.sessionID || 'sem sessão'
    });

    // 🆕 Lista de páginas PÚBLICAS (não precisam de login)
    const paginasPublicas = [
        '/',
        '/final.html',
        '/login.html',
        '/testeroleta.html',
        '/login2.html'
    ];

    // Se for página pública, libera sem verificar login
    if (paginasPublicas.includes(path) || path.startsWith('/api/')) {
        return next();
    }

    // Lista de páginas que PRECISAM de login
    const paginasProtegidas = [
        '/dashboard.html',
        '/paineladm.html', 
        '/historico.html',
        '/indicacoes.html',
        '/notificacoes.html',
        '/raspadinha.html'
    ];

    if (paginasProtegidas.includes(path)) {
        if (!req.session || !req.session.adminLogado) {
            console.log('❌ Acesso negado - redirecionando para login');
            return res.redirect(`/login.html?redirect=${encodeURIComponent(path)}`);
        }
        
        console.log('✅ Acesso permitido ao', path);
    }

    return next();
}

// ⚠️ ROTAS DE AUTENTICAÇÃO DEVEM VIR ANTES DO MIDDLEWARE!
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    console.log('[POST /login] body =', req.body);

    if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
        req.session.adminLogado = true;
        console.log('✅ Admin logado com sucesso');
        
        // 🆕 VERIFICAR SE TEM REDIRECT NA QUERY
        const redirect = req.query.redirect || '/dashboard.html';
        console.log('📍 Redirecionando para:', redirect);
        
        return res.redirect(redirect);
    }

    console.log('❌ Login inválido');
    
    // 🆕 MANTER O REDIRECT MESMO COM ERRO
    const redirect = req.query.redirect ? `&redirect=${encodeURIComponent(req.query.redirect)}` : '';
    return res.redirect(`/login.html?erro=1${redirect}`);
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login.html');
    });
});

// 🔹 Servir arquivos estáticos
app.use(express.static(__dirname));

// 🔹 Rota raiz - redirecionar para final.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'final.html'));
});

app.use('/dashboard.html', protegerAdmin);
app.use('/paineladm.html', protegerAdmin);
app.use('/historico.html', protegerAdmin);
app.use('/indicacoes.html', protegerAdmin);
app.use('/notificacoes.html', protegerAdmin);
app.use('/raspadinha.html', protegerAdmin);

// 🟢 DAQUI PRA BAIXO, deixa TODO o seu código de banco, rotas /api etc.



// Banco de dados
const dbPath = path.join(__dirname, 'sorteios.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('✅ Conectado ao banco de dados SQLite');
        criarTabelas();
    }
});


// Criar tabelas
function criarTabelas() {
    db.serialize(() => {
        // Tabela de participantes
        db.run(`
            CREATE TABLE IF NOT EXISTS participantes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                whatsapp TEXT NOT NULL,
                data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
                sorteado INTEGER DEFAULT 0,
                data_sorteio DATETIME DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
            )
        `, (err) => {
            if (err) console.error('Erro ao criar tabela participantes:', err);
            else console.log('✅ Tabela participantes OK');
        });


        
        // Logo APÓS este bloco:
        // db.run(`CREATE TABLE IF NOT EXISTS participantes...`, (err) => { ... });

        // 🆕 ADICIONE ESTAS LINHAS:
        db.run(`ALTER TABLE participantes ADD COLUMN chances INTEGER DEFAULT 5`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.error('⚠️ Aviso ao adicionar coluna chances:', err.message);
            } else if (!err) {
                console.log('✅ Coluna chances adicionada');
            }
        });

        // Tabela de avaliações do Google
        db.run(`
            CREATE TABLE IF NOT EXISTS avaliacoes_google (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                participante_id INTEGER NOT NULL,
                participante_nome TEXT NOT NULL,
                participante_email TEXT NOT NULL,
                data_avaliacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (participante_id) REFERENCES participantes(id)
            )
        `, (err) => {
            if (err) console.error('Erro ao criar tabela avaliacoes_google:', err);
            else console.log('✅ Tabela avaliacoes_google OK');
        });

        db.run(`ALTER TABLE participantes ADD COLUMN indicado_por INTEGER`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.error('⚠️ Aviso ao adicionar coluna indicado_por:', err.message);
            } else if (!err) {
                console.log('✅ Coluna indicado_por adicionada');
            }
        });

        
        // Tabela de prêmios
        db.run(`
            CREATE TABLE IF NOT EXISTS premios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                descricao TEXT,
                tipo TEXT DEFAULT 'ambos',
                probabilidade INTEGER DEFAULT 20,
                icone TEXT DEFAULT '🎁',
                ativo INTEGER DEFAULT 1
            )
        `, (err) => {
            if (err) console.error('Erro ao criar tabela premios:', err);
            else {
                console.log('✅ Tabela premios OK');
                db.get('SELECT COUNT(*) as count FROM premios', (err, row) => {
                    if (!err && row.count === 0) {
                        inserirPremiosPadrao();
                    }
                });
            }
        });

        // Tabela de histórico de sorteios
        db.run(`
            CREATE TABLE IF NOT EXISTS historico_sorteios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT NOT NULL,
                whatsapp TEXT NOT NULL,
                premio_id INTEGER,
                premio_nome TEXT NOT NULL,
                premio_ganho INTEGER DEFAULT 1,
                data_sorteio DATETIME,
                tipo_sorteio TEXT DEFAULT 'cadastro'
            )
        `, (err) => {
            if (err) console.error('Erro ao criar tabela historico_sorteios:', err);
            else {
                console.log('✅ Tabela historico_sorteios OK');
                // 🆕 CHAMADA DA FUNÇÃO DE VERIFICAÇÃO
                verificarECorrigirTabelaHistorico();
            }
        });

        // Tabela de sorteios agendados
        db.run(`
            CREATE TABLE IF NOT EXISTS sorteios_agendados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data_sorteio TEXT NOT NULL,
                hora_inicio_sorteio TEXT DEFAULT '00:00',
                hora_fim_sorteio TEXT DEFAULT '23:59',
                premios_distribuicao TEXT,
                status TEXT DEFAULT 'pendente',
                created_at TEXT DEFAULT (datetime('now', 'localtime'))
            )
        `, (err) => {
            if (err) console.error('Erro ao criar tabela sorteios_agendados:', err);
            else console.log('✅ Tabela sorteios_agendados OK');
        });

        // Tabela de raspadinhas agendadas
        db.run(`
            CREATE TABLE IF NOT EXISTS raspadinhas_agendadas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data_raspadinha DATE NOT NULL,
                hora_inicio TIME NOT NULL,
                hora_fim TIME NOT NULL,
                premios_distribuicao TEXT NOT NULL,
                status TEXT DEFAULT 'pendente',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Erro ao criar tabela raspadinhas_agendadas:', err);
            else console.log('✅ Tabela raspadinhas_agendadas OK');
        });

        // Tabela de configurações
        db.run(`
            CREATE TABLE IF NOT EXISTS configuracoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chave TEXT UNIQUE NOT NULL,
                valor TEXT NOT NULL,
                atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Erro ao criar tabela configuracoes:', err);
            else {
                console.log('✅ Tabela configuracoes OK');
                db.run(`INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('sorteio_automatico_ativo', 'false')`);
                db.run(`INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('participantes_necessarios', '10')`);
                db.run(`INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('ultimo_sorteio_automatico', '')`);
            }
        });
    });
}

// Inserir prêmios padrão
function inserirPremiosPadrao() {
    const premiosPadrao = [
        { nome: 'Tratamento Facial Completo', descricao: 'Sessão completa de rejuvenescimento', tipo: 'ambos', probabilidade: 20, icone: '💆' },
        { nome: 'Massagem Relaxante 60min', descricao: 'Uma hora de puro relaxamento', tipo: 'ambos', probabilidade: 20, icone: '💆‍♀️' },
        { nome: 'Kit de Produtos Premium', descricao: 'Produtos exclusivos para você', tipo: 'ambos', probabilidade: 20, icone: '🎁' },
        { nome: 'Desconto 50%', descricao: 'Em qualquer tratamento', tipo: 'ambos', probabilidade: 20, icone: '🎫' },
        { nome: 'Limpeza de Pele', descricao: 'Tratamento profissional completo', tipo: 'ambos', probabilidade: 20, icone: '✨' }
    ];
    
    const stmt = db.prepare('INSERT INTO premios (nome, descricao, tipo, probabilidade, icone) VALUES (?, ?, ?, ?, ?)');
    premiosPadrao.forEach(p => {
        stmt.run(p.nome, p.descricao, p.tipo, p.probabilidade, p.icone);
    });
    stmt.finalize();
    console.log('✅ Prêmios padrão inseridos');
}

// ============================================
// FUNÇÃO PARA VERIFICAR E CORRIGIR TABELA
// ============================================
function verificarECorrigirTabelaHistorico() {
    // Verificar se a coluna tipo_sorteio existe
    db.all("PRAGMA table_info(historico_sorteios)", (err, columns) => {
        if (err) {
            console.error('❌ Erro ao verificar tabela:', err);
            return;
        }
        
        const temTipoSorteio = columns.some(col => col.name === 'tipo_sorteio');
        
        if (!temTipoSorteio) {
            console.log('⚠️  Coluna tipo_sorteio não existe. Adicionando...');
            db.run(`ALTER TABLE historico_sorteios ADD COLUMN tipo_sorteio TEXT DEFAULT 'cadastro'`, (err) => {
                if (err) {
                    console.error('❌ Erro ao adicionar coluna:', err);
                } else {
                    console.log('✅ Coluna tipo_sorteio adicionada com sucesso');
                }
            });
        } else {
            console.log('✅ Coluna tipo_sorteio já existe');
            
            // Atualizar registros NULL para 'cadastro'
            db.run(`UPDATE historico_sorteios SET tipo_sorteio = 'cadastro' WHERE tipo_sorteio IS NULL`, function(err) {
                if (err) {
                    console.error('❌ Erro ao atualizar registros:', err);
                } else if (this.changes > 0) {
                    console.log(`✅ ${this.changes} registros atualizados para tipo_sorteio = 'cadastro'`);
                }
            });
        }
    });
    
    // Verificar quantos registros existem
    db.get('SELECT COUNT(*) as total FROM historico_sorteios', (err, row) => {
        if (err) {
            console.error('❌ Erro ao contar registros:', err);
        } else {
            console.log(`📊 Total de registros no histórico: ${row.total}`);
            
            if (row.total === 0) {
                console.log('⚠️  ATENÇÃO: Tabela historico_sorteios está VAZIA!');
                console.log('   Certifique-se de que os sorteios estão sendo registrados corretamente.');
            }
        }
    });
}

// ============================================
// ROTAS DA API
// ============================================

// POST /api/signup
app.post('/api/signup', (req, res) => {
    const { nome, email, whatsapp } = req.body;
    
    if (!nome || !email || !whatsapp) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    db.get('SELECT id FROM participantes WHERE email = ?', [email], (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro ao verificar dados' });
        if (row) return res.status(409).json({ error: 'Email já cadastrado' });
        
        db.get('SELECT id FROM participantes WHERE whatsapp = ?', [whatsapp], (err, row) => {
            if (err) return res.status(500).json({ error: 'Erro ao verificar dados' });
            if (row) return res.status(409).json({ error: 'WhatsApp já cadastrado' });
            
            db.run(
                'INSERT INTO participantes (nome, email, whatsapp) VALUES (?, ?, ?)',
                [nome, email, whatsapp],
                function(err) {
                    if (err) return res.status(500).json({ error: 'Erro ao cadastrar' });
                    
                    res.json({ 
                        success: true, 
                        user: { id: this.lastID, nome, email, whatsapp },
                        participante_id: this.lastID
                    });
                }
            );
        });
    });
});

app.post('/api/indicacoes', async (req, res) => {
    console.log('📥 Recebendo indicações:', req.body);
    
    const { indicante_id, indicante_nome, indicante_email, indicante_whatsapp, indicacoes } = req.body;
    
    if (!indicante_id || !indicacoes || !Array.isArray(indicacoes) || indicacoes.length === 0) {
        console.error('❌ Dados inválidos:', req.body);
        return res.status(400).json({ 
            success: false, 
            error: 'Dados inválidos. Verifique se todas as informações foram enviadas.' 
        });
    }
    
    let indicacoesSalvas = 0;
    let erros = [];
    let indicadosDetalhes = []; // 🆕 Para enviar ao Zapier
    
    try {
        for (let i = 0; i < indicacoes.length; i++) {
            const { nome, whatsapp, email } = indicacoes[i];
            
            console.log(`  📝 Processando indicação ${i + 1}/${indicacoes.length}:`, { nome, whatsapp, email });
            
            // Verificar duplicados
            const existente = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT id, nome, email, whatsapp FROM participantes WHERE email = ? OR whatsapp = ?',
                    [email, whatsapp],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            
            if (existente) {
                if (existente.email === email) {
                    console.log(`  ⚠️ Email ${email} já cadastrado para ${existente.nome}`);
                    erros.push(`❌ ${nome}: Email já cadastrado`);
                } else if (existente.whatsapp === whatsapp) {
                    console.log(`  ⚠️ WhatsApp ${whatsapp} já cadastrado para ${existente.nome}`);
                    erros.push(`❌ ${nome}: WhatsApp já cadastrado`);
                }
                continue;
            }
            
            // Inserir indicação
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO participantes (nome, whatsapp, email, chances, sorteado, indicado_por, data_cadastro) 
                     VALUES (?, ?, ?, 5, 0, ?, datetime('now'))`,
                    [nome, whatsapp, email, indicante_id],
                    function(err) {
                        if (err) {
                            console.error(`  ❌ Erro ao inserir ${nome}:`, err);
                            erros.push(`Erro ao salvar ${nome}`);
                            reject(err);
                        } else {
                            console.log(`  ✅ ${nome} cadastrado com ID: ${this.lastID}, indicado por: ${indicante_id}`);
                            indicacoesSalvas++;
                            
                            // 🆕 Guardar detalhes para o Zapier
                            indicadosDetalhes.push({
                                nome: nome,
                                whatsapp: whatsapp,
                                email: email
                            });
                            
                            resolve();
                        }
                    }
                );
            });
        }
        
        // Adicionar chances ao indicante
        if (indicacoesSalvas > 0) {
            await new Promise((resolve, reject) => {
                db.run(
                    'UPDATE participantes SET chances = chances + ? WHERE id = ?',
                    [indicacoesSalvas, indicante_id],
                    (err) => {
                        if (err) {
                            console.error('  ❌ Erro ao adicionar chances:', err);
                            reject(err);
                        } else {
                            console.log(`  🎁 +${indicacoesSalvas} chance(s) adicionada(s) para ${indicante_nome}`);
                            resolve();
                        }
                    }
                );
            });
            
            // 🆕 ENVIAR PARA O ZAPIER
            const dadosZapier = {
                // Dados de quem indicou
                indicante_nome: indicante_nome,
                indicante_email: indicante_email,
                indicante_whatsapp: indicante_whatsapp,
                
                // Quantas pessoas foram indicadas
                total_indicacoes: indicacoesSalvas,
                chances_ganhas: indicacoesSalvas,
                
                // Lista de indicados
                indicados: indicadosDetalhes.map(ind => ind.nome).join(', '),
                indicados_detalhes: indicadosDetalhes,
                
                // Links para compartilhar
                link_roleta: `http://SEU_DOMINIO:3000/final.html?secao=roleta`,
                link_raspadinha: `http://SEU_DOMINIO:3000/final.html?secao=raspadinha`,
                link_geral: `http://SEU_DOMINIO:3000/final.html`,
                
                // Data
                data_indicacao: new Date().toLocaleString('pt-BR')
            };
            
            // Enviar para Zapier (não espera resposta)
            enviarParaZapier(ZAPIER_WEBHOOK_INDICACAO, dadosZapier).catch(err => {
                console.error('⚠️ Erro ao enviar para Zapier (não crítico):', err);
            });
        }
        
        if (indicacoesSalvas > 0) {
            console.log(`✅ Total de indicações salvas: ${indicacoesSalvas}`);
            res.json({
                success: true,
                message: `${indicacoesSalvas} indicação(ões) salva(s) com sucesso!`,
                indicacoes_salvas: indicacoesSalvas,
                chances_ganhas: indicacoesSalvas,
                erros: erros.length > 0 ? erros : null
            });
        } else {
            console.log('⚠️ Nenhuma indicação foi salva');
            res.status(400).json({
                success: false,
                error: erros.length > 0 ? erros.join(', ') : 'Nenhuma indicação foi salva',
                detalhes: erros
            });
        }
        
    } catch (error) {
        console.error('❌ Erro geral ao processar indicações:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao processar indicações: ' + error.message
        });
    }
});

// GET /api/participantes
app.get('/api/participantes', (req, res) => {
    console.log('📡 API /api/participantes chamada');
    
    db.all('SELECT * FROM participantes ORDER BY data_cadastro DESC', [], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar participantes:', err);
            return res.status(500).json({ erro: 'Erro ao buscar participantes' });
        }
        
        console.log(`✅ Encontrados ${rows ? rows.length : 0} participantes`);
        res.json(rows || []);
    });
});

// GET /api/participantes-ativos
app.get('/api/participantes-ativos', (req, res) => {
    console.log('📡 API /api/participantes-ativos chamada');
    
    db.all('SELECT * FROM participantes WHERE sorteado = 0 ORDER BY nome', (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar participantes:', err);
            return res.status(500).json({ erro: 'Erro ao buscar participantes' });
        }
        
        console.log(`✅ Encontrados ${rows ? rows.length : 0} participantes ativos`);
        res.json({ participantes: rows || [] });
    });
});

// GET /api/premios
app.get('/api/premios', (req, res) => {
    db.all('SELECT * FROM premios ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar prêmios:', err);
            return res.status(500).json({ erro: 'Erro ao buscar prêmios' });
        }
        
        const premios = rows.map(row => ({
            ...row,
            ativo: row.ativo === 1
        }));
        
        res.json(premios);
    });
});

// GET /api/premios-ativos
app.get('/api/premios-ativos', (req, res) => {
    db.all('SELECT * FROM premios WHERE ativo = 1', (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar prêmios' });
        res.json({ premios: rows });
    });
});

// POST /api/premios
app.post('/api/premios', (req, res) => {
    const { nome, descricao, icone, tipo, probabilidade, ativo } = req.body;
    
    console.log('📝 Cadastrando prêmio:', req.body);
    
    if (!nome || !tipo) {
        return res.status(400).json({ erro: 'Nome e tipo são obrigatórios' });
    }
    
    db.run(`
        INSERT INTO premios (nome, descricao, icone, tipo, probabilidade, ativo)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [
        nome, 
        descricao || '', 
        icone || '🎁', 
        tipo, 
        probabilidade || 20, 
        ativo !== false ? 1 : 0
    ], function(err) {
        if (err) {
            console.error('❌ Erro ao cadastrar prêmio:', err);
            return res.status(500).json({ erro: 'Erro ao cadastrar prêmio' });
        }
        
        console.log(`✅ Prêmio cadastrado com ID: ${this.lastID}`);
        res.json({ 
            success: true,
            id: this.lastID,
            nome: nome
        });
    });
});

// PUT /api/premios/:id
app.put('/api/premios/:id', (req, res) => {
    const { id } = req.params;
    const { nome, descricao, tipo, probabilidade, icone, ativo } = req.body;
    
    const updates = [];
    const values = [];
    
    if (nome !== undefined) { updates.push('nome = ?'); values.push(nome); }
    if (descricao !== undefined) { updates.push('descricao = ?'); values.push(descricao); }
    if (tipo !== undefined) { updates.push('tipo = ?'); values.push(tipo); }
    if (probabilidade !== undefined) { updates.push('probabilidade = ?'); values.push(probabilidade); }
    if (icone !== undefined) { updates.push('icone = ?'); values.push(icone); }
    if (ativo !== undefined) { updates.push('ativo = ?'); values.push(ativo ? 1 : 0); }
    
    values.push(id);
    
    db.run(`UPDATE premios SET ${updates.join(', ')} WHERE id = ?`, values, function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao atualizar prêmio' });
        res.json({ success: true });
    });
});

// DELETE /api/premios/:id
app.delete('/api/premios/:id', (req, res) => {
    db.run('DELETE FROM premios WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao excluir prêmio' });
        res.json({ success: true });
    });
});

// DELETE /api/participantes/:id
app.delete('/api/participantes/:id', (req, res) => {
    db.run('DELETE FROM participantes WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao excluir participante' });
        res.json({ success: true });
    });
});

// GET /api/historico-sorteios
app.get('/api/historico-sorteios', (req, res) => {
    console.log('🔍 GET /api/historico-sorteios - Iniciando busca...');
    
    const { limit, premio_ganho } = req.query;
    
    // Query base - SEMPRE filtrar prêmios negativos
    let query = `SELECT * FROM historico_sorteios 
                 WHERE premio_nome NOT LIKE '%não foi dessa vez%' 
                 AND premio_nome NOT LIKE '%NÃO FOI DESSA VEZ%'
                 AND premio_nome NOT LIKE '%tente novamente%'
                 AND premio_nome NOT LIKE '%Tente novamente%'`;
    
    const values = [];
    
    if (premio_ganho === 'true') {
        query += ' AND premio_ganho = 1';
        console.log('  ↳ Filtrando apenas ganhadores');
    }
    
    query += ' ORDER BY data_sorteio DESC';
    
    if (limit) {
        query += ' LIMIT ?';
        values.push(parseInt(limit));
        console.log(`  ↳ Limitando a ${limit} registros`);
    }
    
    console.log('  ↳ Query SQL:', query);
    
    db.all(query, values, (err, rows) => {
        if (err) {
            console.error('❌ ERRO ao buscar histórico:', err);
            return res.status(500).json({ error: 'Erro ao buscar histórico' });
        }
        
        const historico = rows || [];
        
        const historicoProcessado = historico.map(row => ({
            ...row,
            tipo_sorteio: row.tipo_sorteio || 'cadastro'
        }));
        
        console.log(`✅ Histórico retornado: ${historicoProcessado.length} registros`);
        
        if (historicoProcessado.length > 0) {
            console.log('📋 Primeiros registros:');
            historicoProcessado.slice(0, 3).forEach((row, idx) => {
                console.log(`  ${idx + 1}. ${row.nome} - ${row.premio_nome} - ${row.data_sorteio}`);
            });
        } else {
            console.log('⚠️  Nenhum registro válido encontrado');
        }
        
        res.json(historicoProcessado);
    });
});

// Rota temporária para limpar registros inválidos
app.get('/api/limpar-registros-invalidos', (req, res) => {
    console.log('🧹 Limpando registros "Não foi dessa vez"...');
    
    db.run(`
        DELETE FROM historico_sorteios 
        WHERE premio_nome LIKE '%não foi dessa vez%' 
        OR premio_nome LIKE '%NÃO FOI DESSA VEZ%'
        OR premio_nome LIKE '%tente novamente%'
    `, function(err) {
        if (err) {
            console.error('❌ Erro ao limpar:', err);
            return res.status(500).json({ error: 'Erro ao limpar' });
        }
        
        console.log(`✅ ${this.changes} registros removidos`);
        res.json({ 
            success: true, 
            registros_removidos: this.changes 
        });
    });
});

// 1️⃣ ROTA: Buscar sorteio ativo AGORA (para a roleta)
app.get('/api/sorteio-ativo-agora', (req, res) => {
    console.log('🔍 Verificando sorteio ativo no momento...');
    
    const agora = new Date();
    const dataHoje = agora.toISOString().split('T')[0];
    const horaAtual = agora.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    
    console.log('📅 Data atual:', dataHoje);
    console.log('🕐 Hora atual:', horaAtual);
    
    db.get(`
        SELECT * FROM sorteios_agendados 
        WHERE data_sorteio = ? 
        AND hora_inicio_sorteio <= ? 
        AND hora_fim_sorteio >= ?
        AND status = 'pendente'
        LIMIT 1
    `, [dataHoje, horaAtual, horaAtual], (err, sorteio) => {
        if (err) {
            console.error('❌ Erro ao buscar sorteio:', err);
            return res.json({ ativo: false, premios: [] });
        }
        
        if (!sorteio) {
            console.log('⚠️  Nenhum sorteio ativo no momento');
            return res.json({ ativo: false, premios: [] });
        }
        
        console.log('✅ Sorteio ativo encontrado:', sorteio);
        
        let premiosDistribuicao = [];
        try {
            premiosDistribuicao = JSON.parse(sorteio.premios_distribuicao || '[]');
        } catch (e) {
            console.error('❌ Erro ao fazer parse dos prêmios:', e);
        }
        
        const premiosAtivos = premiosDistribuicao.filter(p => {
            return p.horario_inicio <= horaAtual && p.horario_fim >= horaAtual;
        });
        
        console.log('🎁 Prêmios ativos:', premiosAtivos);
        
        const proximosPremios = premiosDistribuicao.filter(p => {
            return p.horario_inicio > horaAtual;
        });
        
        res.json({
            ativo: true,
            sorteio_id: sorteio.id,
            data_sorteio: sorteio.data_sorteio,
            hora_inicio: sorteio.hora_inicio_sorteio,
            hora_fim: sorteio.hora_fim_sorteio,
            premios_ativos: premiosAtivos,
            proximos_premios: proximosPremios,
            todos_premios: premiosDistribuicao
        });
    });
});

// 2️⃣ ROTA: Buscar raspadinha ativa AGORA
app.get('/api/raspadinha-ativa-agora', (req, res) => {
    console.log('🎰 Verificando raspadinha ativa no momento...');
    
    const agora = new Date();
    const dataHoje = agora.toISOString().split('T')[0];
    const horaAtual = agora.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    
    console.log('📅 Data atual:', dataHoje);
    console.log('🕐 Hora atual:', horaAtual);
    
    db.get(`
        SELECT * FROM raspadinhas_agendadas 
        WHERE data_raspadinha = ? 
        AND hora_inicio <= ? 
        AND hora_fim >= ?
        AND status IN ('pendente', 'ativo')
        LIMIT 1
    `, [dataHoje, horaAtual, horaAtual], (err, raspadinha) => {
        if (err) {
            console.error('❌ Erro ao buscar raspadinha:', err);
            return res.json({ ativo: false, premios: [] });
        }
        
        if (!raspadinha) {
            console.log('⚠️  Nenhuma raspadinha ativa no momento');
            return res.json({ ativo: false, premios: [] });
        }
        
        console.log('✅ Raspadinha ativa encontrada:', raspadinha);
        
        let premiosDistribuicao = [];
        try {
            premiosDistribuicao = JSON.parse(raspadinha.premios_distribuicao || '[]');
        } catch (e) {
            console.error('❌ Erro ao fazer parse dos prêmios:', e);
        }
        
        const premiosAtivos = premiosDistribuicao.filter(p => {
            return p.horario_inicio <= horaAtual && p.horario_fim >= horaAtual;
        });
        
        console.log('🎁 Prêmios ativos na raspadinha:', premiosAtivos);
        
        res.json({
            ativo: true,
            raspadinha_id: raspadinha.id,
            data_raspadinha: raspadinha.data_raspadinha,
            hora_inicio: raspadinha.hora_inicio,
            hora_fim: raspadinha.hora_fim,
            premios_ativos: premiosAtivos,
            todos_premios: premiosDistribuicao
        });
    });
});

// 3️⃣ ROTA: Buscar detalhes de um sorteio específico
app.get('/api/sorteios-agendados/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM sorteios_agendados WHERE id = ?', [id], (err, sorteio) => {
        if (err) {
            console.error('❌ Erro ao buscar sorteio:', err);
            return res.status(500).json({ erro: 'Erro ao buscar sorteio' });
        }
        
        if (!sorteio) {
            return res.status(404).json({ erro: 'Sorteio não encontrado' });
        }
        
        let premiosDistribuicao = [];
        try {
            premiosDistribuicao = JSON.parse(sorteio.premios_distribuicao || '[]');
        } catch (e) {
            console.error('❌ Erro ao fazer parse:', e);
        }
        
        res.json({
            ...sorteio,
            premios_distribuicao: premiosDistribuicao
        });
    });
});

// ============================================
// ROTA: SALVAR/BUSCAR CONFIGURAÇÕES
// ============================================

// GET - Buscar configurações
app.get('/api/configuracoes', (req, res) => {
    db.all('SELECT * FROM configuracoes', (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar configurações:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// POST - Salvar configurações
app.post('/api/configuracoes', (req, res) => {
    const configs = req.body;
    console.log('💾 Salvando configurações:', configs);

    try {
        // Preparar queries
        const queries = [];
        
        for (const [chave, valor] of Object.entries(configs)) {
            queries.push(new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO configuracoes (chave, valor) 
                     VALUES (?, ?)
                     ON CONFLICT(chave) 
                     DO UPDATE SET valor = ?`,
                    [chave, valor, valor],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            }));
        }

        // Executar todas as queries
        Promise.all(queries)
            .then(() => {
                console.log('✅ Configurações salvas com sucesso');
                res.json({ success: true });
            })
            .catch(err => {
                console.error('❌ Erro ao salvar:', err);
                res.status(500).json({ error: err.message });
            });

    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ROTA: VERIFICAR SE DEVE SORTEAR
// ============================================

app.get('/api/verificar-sorteio', (req, res) => {
    console.log('🔍 Verificando condições para sorteio...');
    
    db.get(
        'SELECT valor FROM configuracoes WHERE chave = ?',
        ['sorteio_automatico_ativo'],
        (err, sorteioAtivo) => {
            if (err) {
                return res.json({ deve_sortear: false, erro: err.message });
            }
            
            if (!sorteioAtivo || sorteioAtivo.valor !== 'true') {
                return res.json({ 
                    deve_sortear: false, 
                    motivo: 'Sorteio automático desativado',
                    participantes_atuais: 0,
                    participantes_necessarios: 0
                });
            }
            
            db.get(
                'SELECT valor FROM configuracoes WHERE chave = ?',
                ['participantes_necessarios'],
                (err, configParticipantes) => {
                    if (err) {
                        return res.json({ deve_sortear: false, erro: err.message });
                    }
                    
                    const participantesNecessarios = parseInt(configParticipantes?.valor || 0);
                    
                    db.get(
                        'SELECT COUNT(*) as total FROM participantes WHERE sorteado = 0',
                        (err, result) => {
                            if (err) {
                                return res.json({ deve_sortear: false, erro: err.message });
                            }
                            
                            const participantesAtuais = result.total;
                            const deveSortear = participantesAtuais >= participantesNecessarios;
                            
                            console.log(`📊 ${participantesAtuais}/${participantesNecessarios} - Sortear? ${deveSortear ? 'SIM' : 'NÃO'}`);
                            
                            res.json({
                                deve_sortear: deveSortear,
                                participantes_atuais: participantesAtuais,
                                participantes_necessarios: participantesNecessarios,
                                sorteio_ativo: true
                            });
                        }
                    );
                }
            );
        }
    );
});

// ============================================
// ROTA: SALVAR/BUSCAR CONFIGURAÇÕES
// ============================================

app.get('/api/configuracoes', (req, res) => {
    db.all('SELECT * FROM configuracoes', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

app.post('/api/configuracoes', (req, res) => {
    const configs = req.body;
    console.log('💾 Salvando configurações:', configs);

    const queries = [];
    
    for (const [chave, valor] of Object.entries(configs)) {
        queries.push(new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO configuracoes (chave, valor) 
                 VALUES (?, ?)
                 ON CONFLICT(chave) 
                 DO UPDATE SET valor = ?`,
                [chave, valor, valor],
                (err) => err ? reject(err) : resolve()
            );
        }));
    }

    Promise.all(queries)
        .then(() => {
            console.log('✅ Configurações salvas');
            res.json({ success: true });
        })
        .catch(err => {
            console.error('❌ Erro:', err);
            res.status(500).json({ error: err.message });
        });
});

// ============================================
// ROTA: REGISTRAR SORTEIO E ENVIAR PARA ZAPIER
// ============================================

app.post('/api/registrar-sorteio', async (req, res) => {
    const { participante, premio, tipo_sorteio } = req.body;
    
    console.log('📝 [API] Registrando sorteio:', { 
        participante: participante?.nome, 
        premio: premio?.nome, 
        tipo: tipo_sorteio 
    });
    
    // ✅ VALIDAÇÃO: Dados obrigatórios
    if (!participante || !premio) {
        console.error('❌ Dados incompletos:', req.body);
        return res.status(400).json({ 
            success: false,
            error: 'Dados incompletos: participante ou prêmio faltando' 
        });
    }
    
    // 🚫 NÃO SALVAR se for "Não foi dessa vez"
    const premioNome = premio.nome || '';
    const naoGanhou = premioNome.toLowerCase().includes('não foi dessa vez') || 
                      premioNome.toLowerCase().includes('tente novamente');
    
    if (naoGanhou) {
        console.log('⚠️ Prêmio negativo - não será salvo');
        return res.json({ 
            success: true, 
            message: 'Sorteio não registrado (tente novamente)',
            registrado: false
        });
    }
    
    const tipo = tipo_sorteio || 'cadastro';
    
    try {
        // 1️⃣ SALVAR NO BANCO DE DADOS
        const sorteioId = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO historico_sorteios 
                (nome, email, whatsapp, premio_id, premio_nome, premio_ganho, tipo_sorteio) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    participante.nome, 
                    participante.email, 
                    participante.whatsapp || '', 
                    premio.id || 0, 
                    premio.nome, 
                    1, 
                    tipo
                ],
                function(err) {
                    if (err) {
                        console.error('❌ Erro ao inserir no banco:', err);
                        reject(err);
                    } else {
                        console.log(`✅ Sorteio salvo no banco! ID: ${this.lastID}`);
                        resolve(this.lastID);
                    }
                }
            );
        });
        
        // 2️⃣ PREPARAR DADOS PARA O ZAPIER
        const dadosZapier = {
            // 👤 Dados do ganhador
            nome: participante.nome,
            email: participante.email,
            whatsapp: participante.whatsapp || 'Não informado',
            
            // 🎁 Dados do prêmio
            premio: premio.nome,
            premio_descricao: premio.descricao || '',
            premio_icone: premio.icone || '🎁',
            
            // 📊 Dados do sorteio
            tipo_sorteio: tipo === 'roleta' ? 'Roleta da Sorte' : 
                         tipo === 'raspadinha' ? 'Raspadinha' : 
                         'Cadastro',
            data_sorteio: new Date().toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            
            // 🔗 Links úteis
            link_sistema: `http://localhost:${PORT}/final.html`,
            
            // 🆔 ID para rastreamento
            sorteio_id: sorteioId,
            timestamp: Date.now()
        };
        
        console.log('📤 Enviando para Zapier:', dadosZapier);
        
        // 3️⃣ ENVIAR PARA O ZAPIER (SEM ESPERAR RESPOSTA)
        enviarParaZapier(ZAPIER_WEBHOOK_PREMIO, dadosZapier)
            .then(enviado => {
                if (enviado) {
                    console.log('✅ Zapier notificado com sucesso!');
                } else {
                    console.log('⚠️ Falha ao notificar Zapier (mas sorteio foi salvo)');
                }
            })
            .catch(err => {
                console.error('❌ Erro ao enviar para Zapier:', err);
            });
        
        // 4️⃣ RESPONDER IMEDIATAMENTE (NÃO ESPERA O ZAPIER)
        res.json({ 
            success: true, 
            sorteio_id: sorteioId, 
            tipo: tipo,
            zapier_enviado: true,
            registrado: true,
            message: 'Sorteio registrado com sucesso!'
        });
        
    } catch (error) {
        console.error('❌ Erro ao registrar sorteio:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro ao registrar sorteio: ' + error.message 
        });
    }
});

// 🧪 ROTA DE TESTE DO ZAPIER
app.get('/api/testar-zapier', async (req, res) => {
    console.log('🧪 Testando envio para Zapier...');
    
    const dadosTeste = {
        nome: 'João Teste',
        email: 'joao@teste.com',
        whatsapp: '11999999999',
        premio: 'Teste de Prêmio 🎁',
        premio_descricao: 'Apenas um teste do sistema',
        premio_icone: '🎁',
        tipo_sorteio: 'Teste Manual',
        data_sorteio: new Date().toLocaleString('pt-BR'),
        sorteio_id: 999,
        timestamp: Date.now()
    };
    
    try {
        console.log('📤 Enviando dados de teste:', dadosTeste);
        
        const resultado = await enviarParaZapier(ZAPIER_WEBHOOK_PREMIO, dadosTeste);
        
        if (resultado) {
            console.log('✅ Teste bem-sucedido!');
            res.json({ 
                success: true, 
                mensagem: '✅ Zapier recebeu os dados!',
                dados_enviados: dadosTeste,
                webhook_url: ZAPIER_WEBHOOK_PREMIO
            });
        } else {
            console.log('❌ Teste falhou - Zapier não respondeu OK');
            res.json({ 
                success: false, 
                erro: 'Zapier não respondeu com status 200',
                dados_enviados: dadosTeste,
                webhook_url: ZAPIER_WEBHOOK_PREMIO
            });
        }
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        res.status(500).json({ 
            success: false, 
            erro: error.message,
            dados_enviados: dadosTeste 
        });
    }
});



// Rota para registrar avaliação do Google
app.post('/api/registrar-avaliacao', async (req, res) => {
    const { participante_id, participante_nome, participante_email } = req.body;
    
    if (!participante_id) {
        return res.status(400).json({ 
            success: false, 
            error: 'ID do participante não fornecido' 
        });
    }
    
    console.log('⭐ Registrando avaliação do Google para:', participante_nome);
    
    try {
        // Verificar se já avaliou
        const jaAvaliou = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id FROM avaliacoes_google WHERE participante_id = ?',
                [participante_id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (jaAvaliou) {
            console.log('⚠️ Participante já avaliou anteriormente');
        }
        
        // Registrar avaliação
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO avaliacoes_google (participante_id, participante_nome, participante_email, data_avaliacao)
                 VALUES (?, ?, ?, datetime('now'))`,
                [participante_id, participante_nome, participante_email],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        // Adicionar +2 chances
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE participantes SET chances = chances + 2 WHERE id = ?',
                [participante_id],
                (err) => {
                    if (err) reject(err);
                    else {
                        console.log(`✅ +2 chances adicionadas para ${participante_nome}`);
                        resolve();
                    }
                }
            );
        });
        
        res.json({
            success: true,
            message: '+2 chances adicionadas com sucesso!',
            chances_ganhas: 2
        });
        
    } catch (error) {
        console.error('❌ Erro ao registrar avaliação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao registrar avaliação: ' + error.message
        });
    }
});

// ============================================
// ROTA DO DASHBOARD - PRINCIPAL!
// ============================================

app.get('/api/dashboard', async (req, res) => {
    console.log('📊 GET /api/dashboard');
    
    try {
        const stats = await Promise.all([
            // Total de participantes
            new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as total FROM participantes', (err, row) => {
                    if (err) reject(err);
                    else resolve({ total_participantes: row.total || 0 });
                });
            }),
            
            // Prêmios distribuídos
            new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as total FROM historico_sorteios WHERE premio_ganho = 1', (err, row) => {
                    if (err) reject(err);
                    else resolve({ premios_distribuidos: row.total || 0 });
                });
            }),
            
            // Sorteios realizados
            new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as total FROM historico_sorteios', (err, row) => {
                    if (err) reject(err);
                    else resolve({ sorteios_realizados: row.total || 0 });
                });
            }),
            
            // Taxa de conversão
            new Promise((resolve, reject) => {
                db.get(`
                    SELECT 
                        (SELECT COUNT(*) FROM historico_sorteios WHERE premio_ganho = 1) as premios,
                        (SELECT COUNT(*) FROM participantes) as participantes
                `, (err, row) => {
                    if (err) reject(err);
                    else {
                        const taxa = row.participantes > 0 
                            ? Math.round((row.premios / row.participantes) * 100) 
                            : 0;
                        resolve({ taxa_conversao: taxa });
                    }
                });
            }),
            
            // Crescimento semanal
            new Promise((resolve, reject) => {
                db.get(`
                    SELECT COUNT(*) as total 
                    FROM participantes 
                    WHERE date(data_cadastro) >= date('now', '-7 days')
                `, (err, row) => {
                    if (err) reject(err);
                    else resolve({ participantes_semana: row.total || 0 });
                });
            }),
            
            // Crescimento mensal
            new Promise((resolve, reject) => {
                db.get(`
                    SELECT COUNT(*) as total 
                    FROM participantes 
                    WHERE date(data_cadastro) >= date('now', 'start of month')
                `, (err, row) => {
                    if (err) reject(err);
                    else resolve({ participantes_mes: row.total || 0 });
                });
            }),
            
            // Sorteios recentes (últimos 10)
            new Promise((resolve, reject) => {
                db.all(`
                    SELECT nome, premio_nome, data_sorteio, tipo_sorteio
                    FROM historico_sorteios 
                    WHERE date(data_sorteio) >= date('now', '-7 days')
                    ORDER BY data_sorteio DESC 
                    LIMIT 10
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve({ sorteios_recentes: rows || [] });
                });
            }),
            
            // Prêmios mais sorteados
            new Promise((resolve, reject) => {
                db.all(`
                    SELECT premio_nome, COUNT(*) as quantidade
                    FROM historico_sorteios 
                    WHERE premio_ganho = 1
                    GROUP BY premio_nome 
                    ORDER BY quantidade DESC 
                    LIMIT 5
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve({ premios_mais_sorteados: rows || [] });
                });
            }),
            
            // Ganhadores da raspadinha
            new Promise((resolve, reject) => {
                db.all(`
                    SELECT nome, premio_nome, data_sorteio
                    FROM historico_sorteios 
                    WHERE tipo_sorteio = 'raspadinha'
                    ORDER BY data_sorteio DESC 
                    LIMIT 7
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve({ ganhadores_raspadinha: rows || [] });
                });
            }),

            // 🆕 GANHADORES DA ROLETA - ADICIONE AQUI
            new Promise((resolve, reject) => {
                db.all(`
                    SELECT nome, premio_nome, data_sorteio
                    FROM historico_sorteios 
                    WHERE tipo_sorteio = 'roleta'
                    ORDER BY data_sorteio DESC 
                    LIMIT 10
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve({ ganhadores_roleta: rows || [] });
                });
            }),
            
            // Últimos ganhadores (geral)
            new Promise((resolve, reject) => {
                db.all(`
                    SELECT nome, premio_nome, data_sorteio, tipo_sorteio
                    FROM historico_sorteios 
                    ORDER BY data_sorteio DESC 
                    LIMIT 10
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve({ ultimos_ganhadores: rows || [] });
                });
            }),
            
            // Prêmios disponíveis
            new Promise((resolve, reject) => {
                db.all(`
                    SELECT nome, icone, tipo, ativo
                    FROM premios 
                    WHERE ativo = 1
                    ORDER BY id DESC
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve({ premios_disponiveis: rows || [] });
                });
            }),
            
            // Sorteios agendados hoje
            new Promise((resolve, reject) => {
                const hoje = new Date().toISOString().split('T')[0];
                db.all(`
                    SELECT * 
                    FROM sorteios_agendados 
                    WHERE data_sorteio = ? AND status = 'pendente'
                    ORDER BY hora_inicio_sorteio
                `, [hoje], (err, rows) => {
                    if (err) reject(err);
                    else resolve({ sorteios_hoje: rows || [] });
                });
            }),
            
            // Raspadinhas ativas hoje
            new Promise((resolve, reject) => {
                const hoje = new Date().toISOString().split('T')[0];
                db.all(`
                    SELECT * 
                    FROM raspadinhas_agendadas 
                    WHERE data_raspadinha = ? AND status IN ('pendente', 'ativo')
                    ORDER BY hora_inicio
                `, [hoje], (err, rows) => {
                    if (err) reject(err);
                    else resolve({ raspadinhas_hoje: rows || [] });
                });
            })
        ]);
        
        // Combinar resultados
        const dashboard = stats.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        
        // Calcular crescimento percentual
        if (dashboard.total_participantes > 0) {
            dashboard.crescimento_semana = Math.round(
                (dashboard.participantes_semana / dashboard.total_participantes) * 100
            );
            dashboard.crescimento_mes = Math.round(
                (dashboard.participantes_mes / dashboard.total_participantes) * 100
            );
        } else {
            dashboard.crescimento_semana = 0;
            dashboard.crescimento_mes = 0;
        }
        
        console.log('✅ Dashboard:', {
            participantes: dashboard.total_participantes,
            premios: dashboard.premios_distribuidos,
            sorteios: dashboard.sorteios_realizados
        });
        
        res.json(dashboard);
        
    } catch (error) {
        console.error('❌ Erro no dashboard:', error);
        res.status(500).json({ erro: 'Erro ao carregar dashboard' });
    }
});

// ============================================
// SORTEIOS AGENDADOS
// ============================================

app.get('/api/sorteios-agendados', (req, res) => {
    const { status, data_inicio, data_fim } = req.query;
    
    let query = 'SELECT * FROM sorteios_agendados';
    const conditions = [];
    const values = [];
    
    if (status && status !== 'todos') { 
        conditions.push('status = ?'); 
        values.push(status); 
    }
    if (data_inicio) { 
        conditions.push('data_sorteio >= ?'); 
        values.push(data_inicio); 
    }
    if (data_fim) { 
        conditions.push('data_sorteio <= ?'); 
        values.push(data_fim); 
    }
    
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY data_sorteio DESC, hora_inicio_sorteio DESC';
    
    db.all(query, values, (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar sorteios' });
        res.json(rows || []);
    });
});

app.post('/api/sorteios-agendados', (req, res) => {
    const { data_sorteio, hora_inicio_sorteio, hora_fim_sorteio, premios_distribuicao } = req.body;
    
    if (!data_sorteio || !hora_inicio_sorteio || !hora_fim_sorteio) {
        return res.status(400).json({ erro: 'Dados obrigatórios faltando' });
    }
    
    if (!Array.isArray(premios_distribuicao) || premios_distribuicao.length === 0) {
        return res.status(400).json({ erro: 'Adicione pelo menos um prêmio' });
    }
    
    db.run(`
        INSERT INTO sorteios_agendados 
        (data_sorteio, hora_inicio_sorteio, hora_fim_sorteio, premios_distribuicao, status) 
        VALUES (?, ?, ?, ?, 'pendente')
    `, [data_sorteio, hora_inicio_sorteio, hora_fim_sorteio, JSON.stringify(premios_distribuicao)], 
    function(err) {
        if (err) return res.status(500).json({ erro: 'Erro ao agendar sorteio' });
        res.json({ success: true, sorteio_id: this.lastID });
    });
});

app.put('/api/sorteios-agendados/:id', (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    
    db.run('UPDATE sorteios_agendados SET status = ? WHERE id = ?', [status, id], function(err) {
        if (err) return res.status(500).json({ erro: 'Erro ao atualizar' });
        res.json({ success: true });
    });
});

// ============================================
// SORTEIO AUTOMÁTICO
// ============================================

app.get('/api/config-sorteio', (req, res) => {
    db.all(
        'SELECT chave, valor FROM configuracoes WHERE chave IN (?, ?)', 
        ['sorteio_automatico_ativo', 'participantes_necessarios'], 
        (err, rows) => {
            if (err) return res.status(500).json({ erro: 'Erro ao buscar configurações' });
            
            const config = { ativo: false, participantes_necessarios: 10 };
            
            rows.forEach(row => {
                if (row.chave === 'sorteio_automatico_ativo') {
                    config.ativo = row.valor === 'true';
                }
                if (row.chave === 'participantes_necessarios') {
                    config.participantes_necessarios = parseInt(row.valor) || 10;
                }
            });
            
            res.json(config);
        }
    );
});

app.post('/api/config-sorteio', (req, res) => {
    const { ativo, participantes_necessarios } = req.body;
    
    if (ativo === undefined || participantes_necessarios === undefined) {
        return res.status(400).json({ erro: 'Parâmetros inválidos' });
    }
    
    db.serialize(() => {
        db.run(
            'UPDATE configuracoes SET valor = ? WHERE chave = ?',
            [ativo.toString(), 'sorteio_automatico_ativo']
        );
        
        db.run(
            'UPDATE configuracoes SET valor = ? WHERE chave = ?',
            [participantes_necessarios.toString(), 'participantes_necessarios'],
            function(err) {
                if (err) return res.status(500).json({ erro: 'Erro ao salvar configurações' });
                res.json({ success: true });
            }
        );
    });
});

// ============================================
// RASPADINHAS AGENDADAS
// ============================================

app.get('/api/raspadinhas-agendadas', (req, res) => {
    const { status } = req.query;
    let query = 'SELECT * FROM raspadinhas_agendadas';
    const params = [];
    
    if (status && status !== 'todos') {
        query += ' WHERE status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY data_raspadinha DESC, hora_inicio DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar raspadinhas' });
        res.json(rows || []);
    });
});

app.post('/api/raspadinhas-agendadas', (req, res) => {
    const { data_raspadinha, hora_inicio, hora_fim, premios_distribuicao } = req.body;
    
    if (!data_raspadinha || !hora_inicio || !hora_fim) {
        return res.status(400).json({ erro: 'Dados obrigatórios faltando' });
    }
    
    db.run(`
        INSERT INTO raspadinhas_agendadas 
        (data_raspadinha, hora_inicio, hora_fim, premios_distribuicao, status) 
        VALUES (?, ?, ?, ?, 'pendente')
    `, [data_raspadinha, hora_inicio, hora_fim, JSON.stringify(premios_distribuicao || [])], 
    function(err) {
        if (err) return res.status(500).json({ erro: 'Erro ao agendar raspadinha' });
        res.json({ success: true, id: this.lastID });
    });
});

app.put('/api/raspadinhas-agendadas/:id', (req, res) => {
    const { status } = req.body;
    
    db.run('UPDATE raspadinhas_agendadas SET status = ? WHERE id = ?', [status, req.params.id], 
    function(err) {
        if (err) return res.status(500).json({ erro: 'Erro ao atualizar raspadinha' });
        res.json({ success: true });
    });
});

app.delete('/api/raspadinhas-agendadas/:id', (req, res) => {
    db.run('DELETE FROM raspadinhas_agendadas WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ erro: 'Erro ao excluir raspadinha' });
        res.json({ success: true });
    });
});

// ============================================
// ROTA DE TESTE - TEMPORÁRIA
// ============================================
app.get('/api/teste-historico', (req, res) => {
    console.log('🧪 Teste de histórico iniciado...');
    
    Promise.all([
        // Contar total de registros
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as total FROM historico_sorteios', (err, row) => {
                if (err) reject(err);
                else resolve({ total: row.total });
            });
        }),
        
        // Buscar últimos 5 registros
        new Promise((resolve, reject) => {
            db.all('SELECT * FROM historico_sorteios ORDER BY data_sorteio DESC LIMIT 5', (err, rows) => {
                if (err) reject(err);
                else resolve({ ultimos: rows || [] });
            });
        }),
        
        // Contar por tipo
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    tipo_sorteio,
                    COUNT(*) as quantidade
                FROM historico_sorteios
                GROUP BY tipo_sorteio
            `, (err, rows) => {
                if (err) reject(err);
                else resolve({ por_tipo: rows || [] });
            });
        })
    ])
    .then(results => {
        const dados = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        console.log('✅ Teste concluído:', JSON.stringify(dados, null, 2));
        res.json(dados);
    })
    .catch(err => {
        console.error('❌ Erro no teste:', err);
        res.status(500).json({ error: err.message });
    });
});

// ============================================
// SISTEMA DE COMANDOS PARA SORTEIO AUTOMÁTICO
// ============================================

let comandoSorteioAtual = null;

// Rota: Enviar comando de sorteio
app.post('/api/comando-sorteio', (req, res) => {
    const { acao, timestamp } = req.body;
    
    comandoSorteioAtual = {
        acao: acao,
        timestamp: timestamp || Date.now(),
        executado: false
    };
    
    console.log('🎰 Novo comando de sorteio recebido:', comandoSorteioAtual);
    
    res.json({ 
        success: true, 
        mensagem: 'Comando registrado!',
        comando: comandoSorteioAtual 
    });
});

// Rota: Verificar se tem comando pendente
app.get('/api/comando-sorteio', (req, res) => {
    if (!comandoSorteioAtual) {
        return res.json({ 
            success: true, 
            comando: null 
        });
    }
    
    // Verificar se o comando é recente (menos de 30 segundos)
    const idade = Date.now() - comandoSorteioAtual.timestamp;
    
    if (idade > 30000 || comandoSorteioAtual.executado) {
        comandoSorteioAtual = null;
        return res.json({ 
            success: true, 
            comando: null 
        });
    }
    
    res.json({ 
        success: true, 
        comando: comandoSorteioAtual 
    });
});

// Rota: Marcar comando como executado
app.post('/api/comando-sorteio/executado', (req, res) => {
    if (comandoSorteioAtual) {
        comandoSorteioAtual.executado = true;
        console.log('✅ Comando marcado como executado');
    }
    
    res.json({ success: true });
});

// ============================================
// SISTEMA DE EVENTOS EM TEMPO REAL (SSE)
// Funciona 100% em celulares!
// ============================================

let clientesConectados = [];

// Rota SSE: Escutar comandos de sorteio
app.get('/api/stream-comandos', (req, res) => {
    console.log('📡 Novo cliente conectado ao stream');
    
    // Configurar headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Adicionar cliente à lista
    const clienteId = Date.now();
    const cliente = { id: clienteId, res };
    clientesConectados.push(cliente);
    
    console.log(`✅ Cliente ${clienteId} adicionado. Total: ${clientesConectados.length}`);
    
    // Enviar heartbeat a cada 15 segundos para manter conexão viva
    const heartbeat = setInterval(() => {
        res.write(`:heartbeat ${Date.now()}\n\n`);
    }, 15000);
    
    // Remover cliente quando desconectar
    req.on('close', () => {
        clearInterval(heartbeat);
        clientesConectados = clientesConectados.filter(c => c.id !== clienteId);
        console.log(`❌ Cliente ${clienteId} desconectado. Restam: ${clientesConectados.length}`);
    });
    
    // Enviar mensagem inicial
    res.write(`data: ${JSON.stringify({ tipo: 'conectado', timestamp: Date.now() })}\n\n`);
});

// Modificar a rota POST /api/comando-sorteio para notificar clientes
app.post('/api/comando-sorteio', (req, res) => {
    const { acao, timestamp } = req.body;
    
    comandoSorteioAtual = {
        acao: acao,
        timestamp: timestamp || Date.now(),
        executado: false
    };
    
    console.log('🎰 Novo comando de sorteio recebido:', comandoSorteioAtual);
    
    // 🆕 NOTIFICAR TODOS OS CLIENTES CONECTADOS VIA SSE
    console.log(`📢 Notificando ${clientesConectados.length} clientes...`);
    
    clientesConectados.forEach((cliente, index) => {
        try {
            const mensagem = JSON.stringify({
                tipo: 'INICIAR_SORTEIO',
                acao: acao,
                timestamp: timestamp
            });
            
            cliente.res.write(`data: ${mensagem}\n\n`);
            console.log(`  ✅ Cliente ${index + 1} notificado`);
        } catch (error) {
            console.error(`  ❌ Erro ao notificar cliente ${index + 1}:`, error.message);
        }
    });
    
    res.json({ 
        success: true, 
        mensagem: 'Comando registrado e clientes notificados!',
        clientes_notificados: clientesConectados.length,
        comando: comandoSorteioAtual 
    });
});

console.log('✅ Sistema SSE configurado (funciona em celulares!)');

// ============================================
// ADICIONE ESTAS LINHAS NO server.js
// Logo após as outras rotas da API
// ============================================

// Variável global para armazenar comando pendente
let comandoPendente = null;

// Rota para o painel enviar comando
app.post('/api/enviar-comando', (req, res) => {
    const comando = req.body;
    console.log('📨 [API] Comando recebido:', comando);
    
    // Armazenar comando pendente
    comandoPendente = {
        ...comando,
        timestamp: Date.now()
    };
    
    console.log('💾 [API] Comando armazenado para polling');
    
    // Também notificar via SSE (se houver clientes conectados)
    if (clientesConectados && clientesConectados.length > 0) {
        clientesConectados.forEach(client => {
            try {
                client.res.write(`data: ${JSON.stringify(comando)}\n\n`);
            } catch (error) {
                console.error('❌ Erro ao enviar para cliente SSE:', error.message);
            }
        });
        console.log(`📡 [SSE] Comando enviado para ${clientesConectados.length} cliente(s)`);
    }
    
    res.json({ 
        success: true, 
        clientesSSE: clientesConectados ? clientesConectados.length : 0,
        comandoArmazenado: true
    });
});

// Nova rota para polling (verificar comando pendente)
app.get('/api/verificar-comando', (req, res) => {
    console.log('🔍 [POLLING] Verificação de comando recebida');
    
    if (comandoPendente) {
        console.log('✅ [POLLING] Comando pendente encontrado:', comandoPendente);
        
        // Enviar comando
        const comando = comandoPendente;
        
        // Limpar comando após 5 segundos (evita reprocessamento)
        setTimeout(() => {
            if (comandoPendente && comandoPendente.timestamp === comando.timestamp) {
                comandoPendente = null;
                console.log('🗑️ [POLLING] Comando limpo após timeout');
            }
        }, 5000);
        
        res.json({
            success: true,
            comando: comando
        });
    } else {
        console.log('⏳ [POLLING] Nenhum comando pendente');
        res.json({
            success: true,
            comando: null
        });
    }
});

// Rota para limpar comando manualmente (opcional)
app.post('/api/limpar-comando', (req, res) => {
    comandoPendente = null;
    console.log('🗑️ [API] Comando pendente limpo manualmente');
    res.json({ success: true });
});

// Rota para ver indicações de um participante
app.get('/api/indicacoes/:participante_id', (req, res) => {
    const { participante_id } = req.params;
    
    db.all(`
        SELECT 
            p.id,
            p.nome,
            p.email,
            p.whatsapp,
            p.data_cadastro,
            indicado.nome as indicado_por_nome,
            indicado.email as indicado_por_email
        FROM participantes p
        LEFT JOIN participantes indicado ON p.indicado_por = indicado.id
        WHERE p.indicado_por = ? OR p.id = ?
        ORDER BY p.data_cadastro DESC
    `, [participante_id, participante_id], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar indicações:', err);
            return res.status(500).json({ error: 'Erro ao buscar indicações' });
        }
        
        res.json({
            success: true,
            indicacoes: rows || []
        });
    });
});

// Rota para ver indicados de um participante
app.get('/api/meus-indicados/:participante_id', (req, res) => {
    const { participante_id } = req.params;
    
    db.all(`
        SELECT 
            id,
            nome,
            email,
            whatsapp,
            data_cadastro,
            chances
        FROM participantes
        WHERE indicado_por = ?
        ORDER BY data_cadastro DESC
    `, [participante_id], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar indicados:', err);
            return res.status(500).json({ error: 'Erro ao buscar indicados' });
        }
        
        res.json({
            success: true,
            total_indicados: rows ? rows.length : 0,
            indicados: rows || []
        });
    });
});

// ============================================
// ROTAS PARA VISUALIZAR INDICAÇÕES
// ============================================

// Ver TODOS os participantes com seus indicadores
app.get('/api/participantes-com-indicacoes', (req, res) => {
    console.log('📊 Buscando participantes com indicações...');
    
    db.all(`
        SELECT 
            p.id,
            p.nome,
            p.email,
            p.whatsapp,
            p.chances,
            p.data_cadastro,
            p.indicado_por,
            indicador.nome as indicador_nome,
            indicador.email as indicador_email,
            indicador.whatsapp as indicador_whatsapp
        FROM participantes p
        LEFT JOIN participantes indicador ON p.indicado_por = indicador.id
        ORDER BY p.data_cadastro DESC
    `, (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar participantes:', err);
            return res.status(500).json({ error: 'Erro ao buscar participantes' });
        }
        
        console.log(`✅ Encontrados ${rows.length} participantes`);
        
        res.json({
            success: true,
            total: rows.length,
            participantes: rows
        });
    });
});

// Ver apenas os INDICADOS (quem foi indicado por alguém)
app.get('/api/indicados', (req, res) => {
    console.log('📊 Buscando apenas indicados...');
    
    db.all(`
        SELECT 
            p.id,
            p.nome as indicado_nome,
            p.email as indicado_email,
            p.whatsapp as indicado_whatsapp,
            p.data_cadastro,
            indicador.id as indicador_id,
            indicador.nome as indicador_nome,
            indicador.email as indicador_email,
            indicador.whatsapp as indicador_whatsapp
        FROM participantes p
        INNER JOIN participantes indicador ON p.indicado_por = indicador.id
        ORDER BY p.data_cadastro DESC
    `, (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar indicados:', err);
            return res.status(500).json({ error: 'Erro ao buscar indicados' });
        }
        
        console.log(`✅ Encontrados ${rows.length} indicados`);
        
        res.json({
            success: true,
            total: rows.length,
            indicados: rows
        });
    });
});

// Rota para corrigir horários existentes
app.get('/api/corrigir-horarios', (req, res) => {
    db.run(`
        UPDATE historico_sorteios 
        SET data_sorteio = datetime(data_sorteio, '-3 hours')
        WHERE data_sorteio > datetime('now', '-1 day')
    `, function(err) {
        if (err) {
            return res.json({ error: err.message });
        }
        res.json({ 
            success: true, 
            registros_atualizados: this.changes 
        });
    });
});

// Tabela para controlar sorteios sincronizados
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS sorteios_sincronizados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seed TEXT NOT NULL,
            indice_vencedor INTEGER NOT NULL,
            total_participantes INTEGER NOT NULL,
            premio_id INTEGER,
            premio_nome TEXT,
            participante_id INTEGER,
            participante_nome TEXT,
            participante_email TEXT,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Erro ao criar tabela sorteios_sincronizados:', err);
        else console.log('✅ Tabela sorteios_sincronizados OK');
    });
});

// ============================================
// ROTA: GERAR SORTEIO SINCRONIZADO
// ============================================

app.post('/api/gerar-sorteio-sincronizado', async (req, res) => {
    const { total_participantes, premio_id, premio_nome } = req.body;
    
    console.log('🎰 [SYNC] Gerando sorteio sincronizado...', {
        total_participantes,
        premio_id,
        premio_nome
    });
    
    if (!total_participantes || total_participantes <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Total de participantes inválido'
        });
    }
    
    try {
        // 1️⃣ GERAR SEED ÚNICO (timestamp + random)
        const seed = Date.now().toString() + Math.floor(Math.random() * 10000);
        
        // 2️⃣ CALCULAR ÍNDICE DO VENCEDOR (mesmo algoritmo do client)
        const indice_vencedor = parseInt(seed) % total_participantes;
        
        console.log('🎯 [SYNC] Seed gerado:', seed);
        console.log('🎯 [SYNC] Índice do vencedor:', indice_vencedor);
        
        // 3️⃣ BUSCAR PARTICIPANTES ATIVOS
        const participantes = await new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM participantes WHERE sorteado = 0 ORDER BY nome',
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
        
        if (participantes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum participante disponível'
            });
        }
        
        if (indice_vencedor >= participantes.length) {
            return res.status(400).json({
                success: false,
                message: 'Índice do vencedor fora dos limites'
            });
        }
        
        const vencedor = participantes[indice_vencedor];
        
        console.log('👤 [SYNC] Vencedor selecionado:', vencedor.nome);
        
        // 4️⃣ SALVAR NO BANCO
        const sorteio_id = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO sorteios_sincronizados 
                (seed, indice_vencedor, total_participantes, premio_id, premio_nome, 
                 participante_id, participante_nome, participante_email)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    seed,
                    indice_vencedor,
                    total_participantes,
                    premio_id || 0,
                    premio_nome || 'Prêmio',
                    vencedor.id,
                    vencedor.nome,
                    vencedor.email
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
        
        console.log('✅ [SYNC] Sorteio sincronizado salvo! ID:', sorteio_id);
        
        // 5️⃣ RETORNAR RESULTADO
        res.json({
            success: true,
            sorteio: {
                id: sorteio_id,
                seed: seed,
                indice_vencedor: indice_vencedor,
                total_participantes: total_participantes,
                premio_id: premio_id,
                premio_nome: premio_nome,
                vencedor: {
                    id: vencedor.id,
                    nome: vencedor.nome,
                    email: vencedor.email,
                    whatsapp: vencedor.whatsapp
                }
            }
        });
        
    } catch (error) {
        console.error('❌ [SYNC] Erro ao gerar sorteio:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar sorteio: ' + error.message
        });
    }
});

// ============================================
// ROTA: BUSCAR SORTEIO SINCRONIZADO POR SEED
// ============================================

app.get('/api/sorteio-sincronizado/:seed', (req, res) => {
    const { seed } = req.params;
    
    db.get(
        'SELECT * FROM sorteios_sincronizados WHERE seed = ? ORDER BY data_criacao DESC LIMIT 1',
        [seed],
        (err, row) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }
            
            if (!row) {
                return res.status(404).json({
                    success: false,
                    message: 'Sorteio não encontrado'
                });
            }
            
            res.json({
                success: true,
                sorteio: row
            });
        }
    );
});

app.post('/api/enviar-comando', async (req, res) => {
    const comando = req.body;
    console.log('📨 [API] Comando recebido:', comando);
    
    // Se for comando de sorteio, gerar sorteio sincronizado
    if (comando.tipo === 'INICIAR_SORTEIO' || comando.acao === 'sortear') {
        console.log('🎰 [SYNC] Gerando sorteio sincronizado para comando...');
        
        try {
            // Buscar participantes ativos
            const participantes = await new Promise((resolve, reject) => {
                db.all(
                    'SELECT * FROM participantes WHERE sorteado = 0 ORDER BY nome',
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    }
                );
            });
            
            if (participantes.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Nenhum participante disponível'
                });
            }
            
            // Gerar seed único
            const seed = Date.now().toString() + Math.floor(Math.random() * 10000);
            const indice_vencedor = parseInt(seed) % participantes.length;
            
            console.log('🎯 [SYNC] Seed:', seed);
            console.log('🎯 [SYNC] Índice:', indice_vencedor);
            
            // Armazenar comando COM os dados sincronizados
            comandoPendente = {
                ...comando,
                seed: seed,
                indice_vencedor: indice_vencedor,
                total_participantes: participantes.length,
                timestamp: Date.now()
            };
            
            console.log('💾 [SYNC] Comando sincronizado armazenado');
            
        } catch (error) {
            console.error('❌ [SYNC] Erro ao gerar seed:', error);
            // Continua com comando normal se falhar
            comandoPendente = {
                ...comando,
                timestamp: Date.now()
            };
        }
    } else {
        // Comando normal (sem sincronização)
        comandoPendente = {
            ...comando,
            timestamp: Date.now()
        };
    }
    
    // Notificar via SSE (se houver clientes conectados)
    if (clientesConectados && clientesConectados.length > 0) {
        clientesConectados.forEach(client => {
            try {
                client.res.write(`data: ${JSON.stringify(comandoPendente)}\n\n`);
            } catch (error) {
                console.error('❌ Erro ao enviar para cliente SSE:', error.message);
            }
        });
        console.log(`📡 [SSE] Comando enviado para ${clientesConectados.length} cliente(s)`);
    }
    
    res.json({ 
        success: true, 
        clientesSSE: clientesConectados ? clientesConectados.length : 0,
        comandoArmazenado: true,
        sincronizado: !!comandoPendente.seed
    });
});

console.log('✅ Sistema de sorteio sincronizado configurado!');

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/admin/dashboard.html`);
    console.log(`🎯 Painel Admin: http://localhost:${PORT}/admin`);
    console.log(`\n✅ Todas as rotas configuradas!`);
});
