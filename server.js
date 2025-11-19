const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==== CONFIGURAÇÕES ====
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'unisense#2025';

const ZAPIER_WEBHOOK_PREMIO = 'https://hooks.zapier.com/hooks/catch/25364211/u8wlf1i/';
const ZAPIER_WEBHOOK_INDICACAO = 'https://hooks.zapier.com/hooks/catch/SEU_ID_AQUI/indicacao';

// ==== ORIGENS PERMITIDAS ====
const ALLOWED_ORIGINS = [
    'https://roleta-raspadinha.onrender.com',
    'https://geo-iot.com',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5500'
];

// ============================================
// CONFIGURAÇÃO DE CORS - PRIMEIRA COISA!
// ============================================

// Middleware CORS customizado
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Se a origem está na lista de permitidas, permite
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
    
    // Responder imediatamente a requisições OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// CORS do pacote cors (como backup)
app.use(cors({
    origin: function(origin, callback) {
        // Permitir requisições sem origem (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        
        if (ALLOWED_ORIGINS.indexOf(origin) === -1) {
            const msg = 'A política CORS para este site não permite acesso da origem especificada.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cookie']
}));

// ============================================
// MIDDLEWARES BASE
// ============================================

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'umaSenhaBemSecretaAqui_MUDE_ISSO',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// ============================================
// FUNÇÃO ZAPIER
// ============================================

async function enviarParaZapier(webhookUrl, dados) {
    try {
        console.log('📤 Enviando para Zapier:', JSON.stringify(dados, null, 2));
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        if (response.ok) {
            console.log('✅ Zapier notificado com sucesso');
            return true;
        } else {
            console.error('❌ Erro ao notificar Zapier:', response.status, await response.text());
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao enviar para Zapier:', error.message);
        return false;
    }
}

// ============================================
// BANCO DE DADOS
// ============================================

const dbPath = path.join(__dirname, 'sorteios.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao banco:', err);
    } else {
        console.log('✅ Conectado ao banco de dados SQLite');
        criarTabelas();
    }
});

function criarTabelas() {
    db.serialize(() => {
        // Tabela participantes
        db.run(`
            CREATE TABLE IF NOT EXISTS participantes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                whatsapp TEXT NOT NULL,
                data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
                sorteado INTEGER DEFAULT 0,
                chances INTEGER DEFAULT 5,
                indicado_por INTEGER,
                data_sorteio DATETIME DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
            )
        `, err => {
            if (err) console.error('❌ Erro tabela participantes:', err);
            else console.log('✅ Tabela participantes OK');
        });

        // Tabela avaliacoes_google
        db.run(`
            CREATE TABLE IF NOT EXISTS avaliacoes_google (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                participante_id INTEGER NOT NULL,
                participante_nome TEXT NOT NULL,
                participante_email TEXT NOT NULL,
                data_avaliacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (participante_id) REFERENCES participantes(id)
            )
        `, err => {
            if (err) console.error('❌ Erro tabela avaliacoes_google:', err);
            else console.log('✅ Tabela avaliacoes_google OK');
        });

        // Tabela premios
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
        `, err => {
            if (err) console.error('❌ Erro tabela premios:', err);
            else {
                console.log('✅ Tabela premios OK');
                db.get('SELECT COUNT(*) as count FROM premios', (err, row) => {
                    if (!err && row.count === 0) inserirPremiosPadrao();
                });
            }
        });

        // Tabela historico_sorteios
        db.run(`
            CREATE TABLE IF NOT EXISTS historico_sorteios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT NOT NULL,
                whatsapp TEXT NOT NULL,
                premio_id INTEGER,
                premio_nome TEXT NOT NULL,
                premio_ganho INTEGER DEFAULT 1,
                data_sorteio DATETIME DEFAULT CURRENT_TIMESTAMP,
                tipo_sorteio TEXT DEFAULT 'cadastro'
            )
        `, err => {
            if (err) console.error('❌ Erro tabela historico_sorteios:', err);
            else console.log('✅ Tabela historico_sorteios OK');
        });

        // Tabela sorteios_agendados
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
        `, err => {
            if (err) console.error('❌ Erro tabela sorteios_agendados:', err);
            else console.log('✅ Tabela sorteios_agendados OK');
        });

        // Tabela raspadinhas_agendadas
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
        `, err => {
            if (err) console.error('❌ Erro tabela raspadinhas_agendadas:', err);
            else console.log('✅ Tabela raspadinhas_agendadas OK');
        });

        // Tabela configuracoes
        db.run(`
            CREATE TABLE IF NOT EXISTS configuracoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chave TEXT UNIQUE NOT NULL,
                valor TEXT NOT NULL,
                atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, err => {
            if (err) console.error('❌ Erro tabela configuracoes:', err);
            else {
                console.log('✅ Tabela configuracoes OK');
                db.run(`INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('sorteio_automatico_ativo', 'false')`);
                db.run(`INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('participantes_necessarios', '10')`);
                db.run(`INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('ultimo_sorteio_automatico', '')`);
            }
        });

        // Tabela sorteios_sincronizados
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
        `, err => {
            if (err) console.error('❌ Erro tabela sorteios_sincronizados:', err);
            else console.log('✅ Tabela sorteios_sincronizados OK');
        });
    });
}

function inserirPremiosPadrao() {
    const premios = [
        { nome: 'Tratamento Facial Completo', descricao: 'Sessão completa de rejuvenescimento', tipo: 'ambos', probabilidade: 20, icone: '💆' },
        { nome: 'Massagem Relaxante 60min', descricao: 'Uma hora de puro relaxamento', tipo: 'ambos', probabilidade: 20, icone: '💆‍♀️' },
        { nome: 'Kit de Produtos Premium', descricao: 'Produtos exclusivos para você', tipo: 'ambos', probabilidade: 20, icone: '🎁' },
        { nome: 'Desconto 50%', descricao: 'Em qualquer tratamento', tipo: 'ambos', probabilidade: 20, icone: '🎫' },
        { nome: 'Limpeza de Pele', descricao: 'Tratamento profissional completo', tipo: 'ambos', probabilidade: 20, icone: '✨' }
    ];
    
    const stmt = db.prepare('INSERT INTO premios (nome, descricao, tipo, probabilidade, icone) VALUES (?, ?, ?, ?, ?)');
    premios.forEach(p => stmt.run(p.nome, p.descricao, p.tipo, p.probabilidade, p.icone));
    stmt.finalize();
    console.log('✅ Prêmios padrão inseridos');
}

// ============================================
// MIDDLEWARE DE PROTEÇÃO ADMIN
// ============================================

function protegerAdmin(req, res, next) {
    const paginasPublicas = ['/', '/final.html', '/login.html', '/testeroleta.html', '/login2.html'];
    
    if (paginasPublicas.includes(req.path) || req.path.startsWith('/api/')) {
        return next();
    }
    
    const paginasProtegidas = ['/dashboard.html', '/paineladm.html', '/historico.html', '/indicacoes.html', '/notificacoes.html', '/raspadinha.html'];
    
    if (paginasProtegidas.includes(req.path)) {
        if (!req.session || !req.session.adminLogado) {
            return res.redirect(`/login.html?redirect=${encodeURIComponent(req.path)}`);
        }
    }
    
    next();
}

// ============================================
// ROTAS DE AUTENTICAÇÃO
// ============================================

app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    
    if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
        req.session.adminLogado = true;
        const redirect = req.query.redirect || '/dashboard.html';
        return res.redirect(redirect);
    }
    
    const redirect = req.query.redirect ? `&redirect=${encodeURIComponent(req.query.redirect)}` : '';
    res.redirect(`/login.html?erro=1${redirect}`);
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login.html'));
});

// ============================================
// SERVIR ARQUIVOS ESTÁTICOS
// ============================================

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'final.html')));

app.use('/dashboard.html', protegerAdmin);
app.use('/paineladm.html', protegerAdmin);
app.use('/historico.html', protegerAdmin);
app.use('/indicacoes.html', protegerAdmin);
app.use('/notificacoes.html', protegerAdmin);
app.use('/raspadinha.html', protegerAdmin);

// ============================================
// ROTAS DA API
// ============================================

// Cadastro de participante
app.post('/api/signup', (req, res) => {
    const { nome, email, whatsapp } = req.body;
    
    if (!nome || !email || !whatsapp) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    db.get('SELECT id FROM participantes WHERE email = ? OR whatsapp = ?', [email, whatsapp], (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro ao verificar dados' });
        if (row) return res.status(409).json({ error: 'Email ou WhatsApp já cadastrado' });
        
        db.run('INSERT INTO participantes (nome, email, whatsapp) VALUES (?, ?, ?)', [nome, email, whatsapp], function(err) {
            if (err) return res.status(500).json({ error: 'Erro ao cadastrar' });
            res.json({ success: true, user: { id: this.lastID, nome, email, whatsapp }, participante_id: this.lastID });
        });
    });
});

// Indicações
app.post('/api/indicacoes', async (req, res) => {
    const { indicante_id, indicante_nome, indicante_email, indicante_whatsapp, indicacoes } = req.body;
    
    if (!indicante_id || !indicacoes || !Array.isArray(indicacoes) || indicacoes.length === 0) {
        return res.status(400).json({ success: false, error: 'Dados inválidos' });
    }
    
    let indicacoesSalvas = 0;
    let erros = [];
    let indicadosDetalhes = [];
    
    try {
        for (const ind of indicacoes) {
            const { nome, whatsapp, email } = ind;
            
            const existente = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM participantes WHERE email = ? OR whatsapp = ?', [email, whatsapp], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (existente) {
                erros.push(`❌ ${nome}: Já cadastrado`);
                continue;
            }
            
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO participantes (nome, whatsapp, email, chances, sorteado, indicado_por) VALUES (?, ?, ?, 5, 0, ?)',
                    [nome, whatsapp, email, indicante_id],
                    function(err) {
                        if (err) {
                            erros.push(`Erro ao salvar ${nome}`);
                            reject(err);
                        } else {
                            indicacoesSalvas++;
                            indicadosDetalhes.push({ nome, whatsapp, email });
                            resolve();
                        }
                    }
                );
            });
        }
        
        if (indicacoesSalvas > 0) {
            await new Promise((resolve, reject) => {
                db.run('UPDATE participantes SET chances = chances + ? WHERE id = ?', [indicacoesSalvas, indicante_id], err => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            // Enviar para Zapier (não bloqueia)
            enviarParaZapier(ZAPIER_WEBHOOK_INDICACAO, {
                indicante_nome, indicante_email, indicante_whatsapp,
                total_indicacoes: indicacoesSalvas,
                chances_ganhas: indicacoesSalvas,
                indicados: indicadosDetalhes.map(i => i.nome).join(', '),
                indicados_detalhes: indicadosDetalhes,
                data_indicacao: new Date().toLocaleString('pt-BR')
            }).catch(err => console.error('⚠️ Erro Zapier:', err));
            
            res.json({
                success: true,
                message: `${indicacoesSalvas} indicação(ões) salva(s)!`,
                indicacoes_salvas: indicacoesSalvas,
                chances_ganhas: indicacoesSalvas,
                erros: erros.length > 0 ? erros : null
            });
        } else {
            res.status(400).json({ success: false, error: erros.join(', '), detalhes: erros });
        }
    } catch (error) {
        console.error('❌ Erro ao processar indicações:', error);
        res.status(500).json({ success: false, error: 'Erro ao processar: ' + error.message });
    }
});

// Listar participantes
app.get('/api/participantes', (req, res) => {
    db.all('SELECT * FROM participantes ORDER BY data_cadastro DESC', (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar' });
        res.json(rows || []);
    });
});

// Participantes ativos
app.get('/api/participantes-ativos', (req, res) => {
    db.all('SELECT * FROM participantes WHERE sorteado = 0 ORDER BY nome', (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar' });
        res.json({ participantes: rows || [] });
    });
});

// Listar prêmios
app.get('/api/premios', (req, res) => {
    db.all('SELECT * FROM premios ORDER BY id DESC', (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar' });
        res.json(rows.map(r => ({ ...r, ativo: r.ativo === 1 })));
    });
});

// Prêmios ativos
app.get('/api/premios-ativos', (req, res) => {
    db.all('SELECT * FROM premios WHERE ativo = 1', (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar' });
        res.json({ premios: rows });
    });
});

// Criar prêmio
app.post('/api/premios', (req, res) => {
    const { nome, descricao, icone, tipo, probabilidade, ativo } = req.body;
    
    if (!nome || !tipo) return res.status(400).json({ erro: 'Nome e tipo obrigatórios' });
    
    db.run(
        'INSERT INTO premios (nome, descricao, icone, tipo, probabilidade, ativo) VALUES (?, ?, ?, ?, ?, ?)',
        [nome, descricao || '', icone || '🎁', tipo, probabilidade || 20, ativo !== false ? 1 : 0],
        function(err) {
            if (err) return res.status(500).json({ erro: 'Erro ao cadastrar' });
            res.json({ success: true, id: this.lastID, nome });
        }
    );
});

// Atualizar prêmio
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
    
    db.run(`UPDATE premios SET ${updates.join(', ')} WHERE id = ?`, values, err => {
        if (err) return res.status(500).json({ error: 'Erro ao atualizar' });
        res.json({ success: true });
    });
});

// Deletar prêmio
app.delete('/api/premios/:id', (req, res) => {
    db.run('DELETE FROM premios WHERE id = ?', [req.params.id], err => {
        if (err) return res.status(500).json({ error: 'Erro ao excluir' });
        res.json({ success: true });
    });
});

// Deletar participante
app.delete('/api/participantes/:id', (req, res) => {
    db.run('DELETE FROM participantes WHERE id = ?', [req.params.id], err => {
        if (err) return res.status(500).json({ error: 'Erro ao excluir' });
        res.json({ success: true });
    });
});

// Histórico de sorteios
app.get('/api/historico-sorteios', (req, res) => {
    const { limit, premio_ganho } = req.query;
    
    let query = `SELECT * FROM historico_sorteios 
                 WHERE premio_nome NOT LIKE '%não foi dessa vez%' 
                 AND premio_nome NOT LIKE '%tente novamente%'`;
    const values = [];
    
    if (premio_ganho === 'true') query += ' AND premio_ganho = 1';
    query += ' ORDER BY data_sorteio DESC';
    if (limit) { query += ' LIMIT ?'; values.push(parseInt(limit)); }
    
    db.all(query, values, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar' });
        res.json((rows || []).map(r => ({ ...r, tipo_sorteio: r.tipo_sorteio || 'cadastro' })));
    });
});

// Registrar sorteio
app.post('/api/registrar-sorteio', async (req, res) => {
    const { participante, premio, tipo_sorteio } = req.body;
    
    if (!participante || !premio) {
        return res.status(400).json({ success: false, error: 'Dados incompletos' });
    }
    
    const premioNome = premio.nome || '';
    const naoGanhou = premioNome.toLowerCase().includes('não foi dessa vez') || 
                      premioNome.toLowerCase().includes('tente novamente');
    
    if (naoGanhou) {
        return res.json({ success: true, message: 'Não registrado (tente novamente)', registrado: false });
    }
    
    const tipo = tipo_sorteio || 'cadastro';
    
    try {
        const sorteioId = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO historico_sorteios (nome, email, whatsapp, premio_id, premio_nome, premio_ganho, tipo_sorteio) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [participante.nome, participante.email, participante.whatsapp || '', premio.id || 0, premio.nome, 1, tipo],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
        
        // Enviar para Zapier (não bloqueia)
        enviarParaZapier(ZAPIER_WEBHOOK_PREMIO, {
            nome: participante.nome,
            email: participante.email,
            whatsapp: participante.whatsapp || 'Não informado',
            premio: premio.nome,
            premio_descricao: premio.descricao || '',
            premio_icone: premio.icone || '🎁',
            tipo_sorteio: tipo === 'roleta' ? 'Roleta da Sorte' : tipo === 'raspadinha' ? 'Raspadinha' : 'Cadastro',
            data_sorteio: new Date().toLocaleString('pt-BR'),
            sorteio_id: sorteioId,
            timestamp: Date.now()
        }).catch(err => console.error('⚠️ Erro Zapier:', err));
        
        res.json({ success: true, sorteio_id: sorteioId, tipo, registrado: true, message: 'Registrado!' });
    } catch (error) {
        console.error('❌ Erro ao registrar:', error);
        res.status(500).json({ success: false, error: 'Erro: ' + error.message });
    }
});

// Dashboard
app.get('/api/dashboard', async (req, res) => {
    try {
        const stats = await Promise.all([
            new Promise((resolve, reject) => db.get('SELECT COUNT(*) as total FROM participantes', (err, row) => err ? reject(err) : resolve({ total_participantes: row.total || 0 }))),
            new Promise((resolve, reject) => db.get('SELECT COUNT(*) as total FROM historico_sorteios WHERE premio_ganho = 1', (err, row) => err ? reject(err) : resolve({ premios_distribuidos: row.total || 0 }))),
            new Promise((resolve, reject) => db.get('SELECT COUNT(*) as total FROM historico_sorteios', (err, row) => err ? reject(err) : resolve({ sorteios_realizados: row.total || 0 }))),
            new Promise((resolve, reject) => db.all('SELECT nome, premio_nome, data_sorteio, tipo_sorteio FROM historico_sorteios ORDER BY data_sorteio DESC LIMIT 10', (err, rows) => err ? reject(err) : resolve({ ultimos_ganhadores: rows || [] })))
        ]);
        
        const dashboard = stats.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        res.json(dashboard);
    } catch (error) {
        console.error('❌ Erro dashboard:', error);
        res.status(500).json({ erro: 'Erro ao carregar' });
    }
});

// Sorteios agendados
app.get('/api/sorteios-agendados', (req, res) => {
    const { status } = req.query;
    let query = 'SELECT * FROM sorteios_agendados';
    const params = [];
    
    if (status && status !== 'todos') { query += ' WHERE status = ?'; params.push(status); }
    query += ' ORDER BY data_sorteio DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar' });
        res.json(rows || []);
    });
});

app.post('/api/sorteios-agendados', (req, res) => {
    const { data_sorteio, hora_inicio_sorteio, hora_fim_sorteio, premios_distribuicao } = req.body;
    
    if (!data_sorteio || !hora_inicio_sorteio || !hora_fim_sorteio || !Array.isArray(premios_distribuicao) || premios_distribuicao.length === 0) {
        return res.status(400).json({ erro: 'Dados inválidos' });
    }
    
    db.run(
        'INSERT INTO sorteios_agendados (data_sorteio, hora_inicio_sorteio, hora_fim_sorteio, premios_distribuicao, status) VALUES (?, ?, ?, ?, ?)',
        [data_sorteio, hora_inicio_sorteio, hora_fim_sorteio, JSON.stringify(premios_distribuicao), 'pendente'],
        function(err) {
            if (err) return res.status(500).json({ erro: 'Erro ao agendar' });
            res.json({ success: true, sorteio_id: this.lastID });
        }
    );
});

app.put('/api/sorteios-agendados/:id', (req, res) => {
    const { status } = req.body;
    db.run('UPDATE sorteios_agendados SET status = ? WHERE id = ?', [status, req.params.id], err => {
        if (err) return res.status(500).json({ erro: 'Erro ao atualizar' });
        res.json({ success: true });
    });
});

// Sorteio ativo agora
app.get('/api/sorteio-ativo-agora', (req, res) => {
    const agora = new Date();
    const dataHoje = agora.toISOString().split('T')[0];
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    db.get(
        'SELECT * FROM sorteios_agendados WHERE data_sorteio = ? AND hora_inicio_sorteio <= ? AND hora_fim_sorteio >= ? AND status = ? LIMIT 1',
        [dataHoje, horaAtual, horaAtual, 'pendente'],
        (err, sorteio) => {
            if (err || !sorteio) return res.json({ ativo: false, premios: [] });
            
            let premiosDistribuicao = [];
            try { premiosDistribuicao = JSON.parse(sorteio.premios_distribuicao || '[]'); } catch (e) {}
            
            const premiosAtivos = premiosDistribuicao.filter(p => p.horario_inicio <= horaAtual && p.horario_fim >= horaAtual);
            
            res.json({
                ativo: true,
                sorteio_id: sorteio.id,
                data_sorteio: sorteio.data_sorteio,
                hora_inicio: sorteio.hora_inicio_sorteio,
                hora_fim: sorteio.hora_fim_sorteio,
                premios_ativos: premiosAtivos,
                todos_premios: premiosDistribuicao
            });
        }
    );
});

// Raspadinhas agendadas
app.get('/api/raspadinhas-agendadas', (req, res) => {
    const { status } = req.query;
    let query = 'SELECT * FROM raspadinhas_agendadas';
    const params = [];
    
    if (status && status !== 'todos') { query += ' WHERE status = ?'; params.push(status); }
    query += ' ORDER BY data_raspadinha DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar' });
        res.json(rows || []);
    });
});

app.post('/api/raspadinhas-agendadas', (req, res) => {
    const { data_raspadinha, hora_inicio, hora_fim, premios_distribuicao } = req.body;
    
    if (!data_raspadinha || !hora_inicio || !hora_fim) {
        return res.status(400).json({ erro: 'Dados obrigatórios faltando' });
    }
    
    db.run(
        'INSERT INTO raspadinhas_agendadas (data_raspadinha, hora_inicio, hora_fim, premios_distribuicao, status) VALUES (?, ?, ?, ?, ?)',
        [data_raspadinha, hora_inicio, hora_fim, JSON.stringify(premios_distribuicao || []), 'pendente'],
        function(err) {
            if (err) return res.status(500).json({ erro: 'Erro ao agendar' });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/raspadinhas-agendadas/:id', (req, res) => {
    const { status } = req.body;
    db.run('UPDATE raspadinhas_agendadas SET status = ? WHERE id = ?', [status, req.params.id], err => {
        if (err) return res.status(500).json({ erro: 'Erro ao atualizar' });
        res.json({ success: true });
    });
});

app.delete('/api/raspadinhas-agendadas/:id', (req, res) => {
    db.run('DELETE FROM raspadinhas_agendadas WHERE id = ?', [req.params.id], err => {
        if (err) return res.status(500).json({ erro: 'Erro ao excluir' });
        res.json({ success: true });
    });
});

// Raspadinha ativa agora
app.get('/api/raspadinha-ativa-agora', (req, res) => {
    const agora = new Date();
    const dataHoje = agora.toISOString().split('T')[0];
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    db.get(
        'SELECT * FROM raspadinhas_agendadas WHERE data_raspadinha = ? AND hora_inicio <= ? AND hora_fim >= ? AND status IN (?, ?) LIMIT 1',
        [dataHoje, horaAtual, horaAtual, 'pendente', 'ativo'],
        (err, raspadinha) => {
            if (err || !raspadinha) return res.json({ ativo: false, premios: [] });
            
            let premiosDistribuicao = [];
            try { premiosDistribuicao = JSON.parse(raspadinha.premios_distribuicao || '[]'); } catch (e) {}
            
            const premiosAtivos = premiosDistribuicao.filter(p => p.horario_inicio <= horaAtual && p.horario_fim >= horaAtual);
            
            res.json({
                ativo: true,
                raspadinha_id: raspadinha.id,
                data_raspadinha: raspadinha.data_raspadinha,
                hora_inicio: raspadinha.hora_inicio,
                hora_fim: raspadinha.hora_fim,
                premios_ativos: premiosAtivos,
                todos_premios: premiosDistribuicao
            });
        }
    );
});

// Configurações
app.get('/api/configuracoes', (req, res) => {
    db.all('SELECT * FROM configuracoes', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/configuracoes', (req, res) => {
    const configs = req.body;
    const queries = [];
    
    for (const [chave, valor] of Object.entries(configs)) {
        queries.push(new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = ?',
                [chave, valor, valor],
                err => err ? reject(err) : resolve()
            );
        }));
    }
    
    Promise.all(queries)
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Registrar avaliação Google
app.post('/api/registrar-avaliacao', async (req, res) => {
    const { participante_id, participante_nome, participante_email } = req.body;
    
    if (!participante_id) {
        return res.status(400).json({ success: false, error: 'ID não fornecido' });
    }
    
    try {
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO avaliacoes_google (participante_id, participante_nome, participante_email) VALUES (?, ?, ?)',
                [participante_id, participante_nome, participante_email],
                err => err ? reject(err) : resolve()
            );
        });
        
        await new Promise((resolve, reject) => {
            db.run('UPDATE participantes SET chances = chances + 2 WHERE id = ?', [participante_id], err => err ? reject(err) : resolve());
        });
        
        res.json({ success: true, message: '+2 chances!', chances_ganhas: 2 });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Indicações de um participante
app.get('/api/indicacoes/:participante_id', (req, res) => {
    db.all(
        'SELECT p.* FROM participantes p WHERE p.indicado_por = ? OR p.id = ? ORDER BY p.data_cadastro DESC',
        [req.params.participante_id, req.params.participante_id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Erro ao buscar' });
            res.json({ success: true, indicacoes: rows || [] });
        }
    );
});

// Participantes com indicações
app.get('/api/participantes-com-indicacoes', (req, res) => {
    db.all(
        `SELECT p.*, indicador.nome as indicador_nome, indicador.email as indicador_email 
         FROM participantes p 
         LEFT JOIN participantes indicador ON p.indicado_por = indicador.id 
         ORDER BY p.data_cadastro DESC`,
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Erro ao buscar' });
            res.json({ success: true, total: rows.length, participantes: rows });
        }
    );
});

// ============================================
// SISTEMA DE COMANDOS (SSE + POLLING)
// ============================================

let clientesConectados = [];
let comandoPendente = null;

// SSE - Stream de comandos
app.get('/api/stream-comandos', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const clienteId = Date.now();
    const cliente = { id: clienteId, res };
    clientesConectados.push(cliente);
    
    console.log(`✅ Cliente ${clienteId} conectado. Total: ${clientesConectados.length}`);
    
    const heartbeat = setInterval(() => {
        try { res.write(`:heartbeat ${Date.now()}\n\n`); } catch (e) {}
    }, 15000);
    
    req.on('close', () => {
        clearInterval(heartbeat);
        clientesConectados = clientesConectados.filter(c => c.id !== clienteId);
        console.log(`❌ Cliente ${clienteId} desconectado. Restam: ${clientesConectados.length}`);
    });
    
    res.write(`data: ${JSON.stringify({ tipo: 'conectado', timestamp: Date.now() })}\n\n`);
});

// Enviar comando (do painel admin para os clientes)
app.post('/api/enviar-comando', async (req, res) => {
    const comando = req.body;
    
    // Se for sorteio, gerar seed sincronizado
    if (comando.tipo === 'INICIAR_SORTEIO' || comando.acao === 'sortear') {
        try {
            const participantes = await new Promise((resolve, reject) => {
                db.all('SELECT * FROM participantes WHERE sorteado = 0 ORDER BY nome', (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
            
            if (participantes.length > 0) {
                const seed = Date.now().toString() + Math.floor(Math.random() * 10000);
                const indice_vencedor = parseInt(seed) % participantes.length;
                
                comandoPendente = {
                    ...comando,
                    seed,
                    indice_vencedor,
                    total_participantes: participantes.length,
                    timestamp: Date.now()
                };
            } else {
                comandoPendente = { ...comando, timestamp: Date.now() };
            }
        } catch (error) {
            console.error('❌ Erro ao gerar seed:', error);
            comandoPendente = { ...comando, timestamp: Date.now() };
        }
    } else {
        comandoPendente = { ...comando, timestamp: Date.now() };
    }
    
    // Notificar clientes via SSE
    if (clientesConectados.length > 0) {
        clientesConectados.forEach(client => {
            try {
                client.res.write(`data: ${JSON.stringify(comandoPendente)}\n\n`);
            } catch (error) {
                console.error('❌ Erro ao notificar SSE:', error.message);
            }
        });
    }
    
    res.json({
        success: true,
        clientesSSE: clientesConectados.length,
        comandoArmazenado: true,
        sincronizado: !!comandoPendente.seed
    });
});

// Polling - Verificar comando pendente
app.get('/api/verificar-comando', (req, res) => {
    if (comandoPendente) {
        const comando = comandoPendente;
        
        // Auto-limpar após 5 segundos
        setTimeout(() => {
            if (comandoPendente && comandoPendente.timestamp === comando.timestamp) {
                comandoPendente = null;
            }
        }, 5000);
        
        res.json({ success: true, comando });
    } else {
        res.json({ success: true, comando: null });
    }
});

// Limpar comando
app.post('/api/limpar-comando', (req, res) => {
    comandoPendente = null;
    res.json({ success: true });
});

// ============================================
// SORTEIOS SINCRONIZADOS
// ============================================

app.post('/api/gerar-sorteio-sincronizado', async (req, res) => {
    const { total_participantes, premio_id, premio_nome } = req.body;
    
    if (!total_participantes || total_participantes <= 0) {
        return res.status(400).json({ success: false, message: 'Total inválido' });
    }
    
    try {
        const seed = Date.now().toString() + Math.floor(Math.random() * 10000);
        const indice_vencedor = parseInt(seed) % total_participantes;
        
        const participantes = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM participantes WHERE sorteado = 0 ORDER BY nome', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        if (participantes.length === 0 || indice_vencedor >= participantes.length) {
            return res.status(400).json({ success: false, message: 'Sem participantes' });
        }
        
        const vencedor = participantes[indice_vencedor];
        
        const sorteio_id = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO sorteios_sincronizados (seed, indice_vencedor, total_participantes, premio_id, premio_nome, participante_id, participante_nome, participante_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [seed, indice_vencedor, total_participantes, premio_id || 0, premio_nome || 'Prêmio', vencedor.id, vencedor.nome, vencedor.email],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
        
        res.json({
            success: true,
            sorteio: {
                id: sorteio_id,
                seed,
                indice_vencedor,
                total_participantes,
                vencedor: { id: vencedor.id, nome: vencedor.nome, email: vencedor.email, whatsapp: vencedor.whatsapp }
            }
        });
    } catch (error) {
        console.error('❌ Erro sorteio sincronizado:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/sorteio-sincronizado/:seed', (req, res) => {
    db.get('SELECT * FROM sorteios_sincronizados WHERE seed = ? ORDER BY data_criacao DESC LIMIT 1', [req.params.seed], (err, row) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!row) return res.status(404).json({ success: false, message: 'Não encontrado' });
        res.json({ success: true, sorteio: row });
    });
});

// ============================================
// TESTE ZAPIER
// ============================================

app.get('/api/testar-zapier', async (req, res) => {
    const dadosTeste = {
        nome: 'João Teste',
        email: 'teste@example.com',
        whatsapp: '11999999999',
        premio: 'Teste de Prêmio 🎁',
        tipo_sorteio: 'Teste Manual',
        data_sorteio: new Date().toLocaleString('pt-BR'),
        timestamp: Date.now()
    };
    
    try {
        const resultado = await enviarParaZapier(ZAPIER_WEBHOOK_PREMIO, dadosTeste);
        res.json({ success: resultado, mensagem: resultado ? '✅ Sucesso!' : '❌ Falhou', dados_enviados: dadosTeste });
    } catch (error) {
        res.status(500).json({ success: false, erro: error.message });
    }
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 SERVIDOR INICIADO COM SUCESSO!');
    console.log('='.repeat(50));
    console.log(`\n📍 Endereço: http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(`🎯 Painel Admin: http://localhost:${PORT}/paineladm.html`);
    console.log(`\n✅ CORS configurado para:`);
    ALLOWED_ORIGINS.forEach(origin => console.log(`   - ${origin}`));
    console.log('\n' + '='.repeat(50) + '\n');
});
