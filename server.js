require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
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

// CONFIGURAÇÃO DO POSTGRESQL
// ============================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://usuario:senha@localhost:5432/sorteios_db',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Testar conexão
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erro ao conectar ao PostgreSQL:', err.stack);
    } else {
        console.log('✅ Conectado ao PostgreSQL');
        release();
        criarTabelas();
    }
});

// ============================================
// CONFIGURAÇÃO DE CORS - PRIMEIRA COISA!
// ============================================

app.use((req, res, next) => {
    const origin = req.headers.origin;
    
 4eefa95 (Ajustes finais do sistema para deploy no Render)
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');
 HEAD
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
    
    // Responder imediatamente a requisições OPTIONS (preflight)

    res.setHeader('Access-Control-Max-Age', '86400');
    
 4eefa95 (Ajustes finais do sistema para deploy no Render)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

 HEAD
// CORS do pacote cors (como backup)
app.use(cors({
    origin: function(origin, callback) {
        // Permitir requisições sem origem (mobile apps, curl, etc)

app.use(cors({
    origin: function(origin, callback) {
 4eefa95 (Ajustes finais do sistema para deploy no Render)
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

 HEAD
// Sessão

 4eefa95 (Ajustes finais do sistema para deploy no Render)
app.use(session({
    secret: process.env.SESSION_SECRET || 'umaSenhaBemSecretaAqui_MUDE_ISSO',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
 HEAD
        maxAge: 24 * 60 * 60 * 1000 // 24 horas

        maxAge: 24 * 60 * 60 * 1000
 4eefa95 (Ajustes finais do sistema para deploy no Render)
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
 HEAD
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

// BANCO DE DADOS - CRIAÇÃO DE TABELAS
// ============================================

async function criarTabelas() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Tabela participantes
        await client.query(`
 4eefa95 (Ajustes finais do sistema para deploy no Render)
            CREATE TABLE IF NOT EXISTS participantes (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                whatsapp TEXT NOT NULL,
                data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sorteado INTEGER DEFAULT 0,
                chances INTEGER DEFAULT 5,
                indicado_por INTEGER,
 HEAD
                data_sorteio DATETIME DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
            )
        `, err => {
            if (err) console.error('❌ Erro tabela participantes:', err);
            else console.log('✅ Tabela participantes OK');
        });

        // Tabela avaliacoes_google
        db.run(`

                data_sorteio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela participantes OK');

        // Tabela avaliacoes_google
        await client.query(`
 4eefa95 (Ajustes finais do sistema para deploy no Render)
            CREATE TABLE IF NOT EXISTS avaliacoes_google (
                id SERIAL PRIMARY KEY,
                participante_id INTEGER NOT NULL,
                participante_nome TEXT NOT NULL,
                participante_email TEXT NOT NULL,
                data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (participante_id) REFERENCES participantes(id)
            )
 HEAD
        `, err => {
            if (err) console.error('❌ Erro tabela avaliacoes_google:', err);
            else console.log('✅ Tabela avaliacoes_google OK');
        });

        // Tabela premios
        db.run(`

        `);
        console.log('✅ Tabela avaliacoes_google OK');

        // Tabela premios
        await client.query(`
 4eefa95 (Ajustes finais do sistema para deploy no Render)
            CREATE TABLE IF NOT EXISTS premios (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                descricao TEXT,
                tipo TEXT DEFAULT 'ambos',
                probabilidade INTEGER DEFAULT 20,
                icone TEXT DEFAULT '🎁',
                ativo INTEGER DEFAULT 1
            )
 HEAD
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

        `);
        console.log('✅ Tabela premios OK');
        
        // Verificar se precisa inserir prêmios padrão
        const result = await client.query('SELECT COUNT(*) as count FROM premios');
        if (parseInt(result.rows[0].count) === 0) {
            await inserirPremiosPadrao(client);
        }

        // Tabela historico_sorteios
        await client.query(`
 4eefa95 (Ajustes finais do sistema para deploy no Render)
            CREATE TABLE IF NOT EXISTS historico_sorteios (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                email TEXT NOT NULL,
                whatsapp TEXT NOT NULL,
                premio_id INTEGER,
                premio_nome TEXT NOT NULL,
                premio_ganho INTEGER DEFAULT 1,
<<<<<<< HEAD
                data_sorteio DATETIME DEFAULT CURRENT_TIMESTAMP,
                tipo_sorteio TEXT DEFAULT 'cadastro'
            )
        `, err => {
            if (err) console.error('❌ Erro tabela historico_sorteios:', err);
            else console.log('✅ Tabela historico_sorteios OK');
        });

        // Tabela sorteios_agendados
        db.run(`
=======
                data_sorteio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                tipo_sorteio TEXT DEFAULT 'cadastro'
            )
        `);
        console.log('✅ Tabela historico_sorteios OK');

        // Tabela sorteios_agendados
        await client.query(`
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
            CREATE TABLE IF NOT EXISTS sorteios_agendados (
                id SERIAL PRIMARY KEY,
                data_sorteio TEXT NOT NULL,
                hora_inicio_sorteio TEXT DEFAULT '00:00',
                hora_fim_sorteio TEXT DEFAULT '23:59',
                premios_distribuicao TEXT,
                status TEXT DEFAULT 'pendente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
<<<<<<< HEAD
        `, err => {
            if (err) console.error('❌ Erro tabela sorteios_agendados:', err);
            else console.log('✅ Tabela sorteios_agendados OK');
        });

        // Tabela raspadinhas_agendadas
        db.run(`
=======
        `);
        console.log('✅ Tabela sorteios_agendados OK');

        // Tabela raspadinhas_agendadas
        await client.query(`
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
            CREATE TABLE IF NOT EXISTS raspadinhas_agendadas (
                id SERIAL PRIMARY KEY,
                data_raspadinha DATE NOT NULL,
                hora_inicio TIME NOT NULL,
                hora_fim TIME NOT NULL,
                premios_distribuicao TEXT NOT NULL,
                status TEXT DEFAULT 'pendente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
<<<<<<< HEAD
        `, err => {
            if (err) console.error('❌ Erro tabela raspadinhas_agendadas:', err);
            else console.log('✅ Tabela raspadinhas_agendadas OK');
        });

        // Tabela configuracoes
        db.run(`
=======
        `);
        console.log('✅ Tabela raspadinhas_agendadas OK');

        // Tabela configuracoes
        await client.query(`
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
            CREATE TABLE IF NOT EXISTS configuracoes (
                id SERIAL PRIMARY KEY,
                chave TEXT UNIQUE NOT NULL,
                valor TEXT NOT NULL,
                atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
<<<<<<< HEAD
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
=======
        `);
        console.log('✅ Tabela configuracoes OK');
        
        // Inserir configurações padrão
        await client.query(`
            INSERT INTO configuracoes (chave, valor) 
            VALUES ('sorteio_automatico_ativo', 'false')
            ON CONFLICT (chave) DO NOTHING
        `);
        await client.query(`
            INSERT INTO configuracoes (chave, valor) 
            VALUES ('participantes_necessarios', '10')
            ON CONFLICT (chave) DO NOTHING
        `);
        await client.query(`
            INSERT INTO configuracoes (chave, valor) 
            VALUES ('ultimo_sorteio_automatico', '')
            ON CONFLICT (chave) DO NOTHING
        `);

        // Tabela sorteios_sincronizados
        await client.query(`
            CREATE TABLE IF NOT EXISTS sorteios_sincronizados (
                id SERIAL PRIMARY KEY,
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
                seed TEXT NOT NULL,
                indice_vencedor INTEGER NOT NULL,
                total_participantes INTEGER NOT NULL,
                premio_id INTEGER,
                premio_nome TEXT,
                participante_id INTEGER,
                participante_nome TEXT,
                participante_email TEXT,
<<<<<<< HEAD
                data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, err => {
            if (err) console.error('❌ Erro tabela sorteios_sincronizados:', err);
            else console.log('✅ Tabela sorteios_sincronizados OK');
        });
    });
}

function inserirPremiosPadrao() {
=======
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela sorteios_sincronizados OK');

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao criar tabelas:', err);
    } finally {
        client.release();
    }
}

async function inserirPremiosPadrao(client) {
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
    const premios = [
        { nome: 'Tratamento Facial Completo', descricao: 'Sessão completa de rejuvenescimento', tipo: 'ambos', probabilidade: 20, icone: '💆' },
        { nome: 'Massagem Relaxante 60min', descricao: 'Uma hora de puro relaxamento', tipo: 'ambos', probabilidade: 20, icone: '💆‍♀️' },
        { nome: 'Kit de Produtos Premium', descricao: 'Produtos exclusivos para você', tipo: 'ambos', probabilidade: 20, icone: '🎁' },
        { nome: 'Desconto 50%', descricao: 'Em qualquer tratamento', tipo: 'ambos', probabilidade: 20, icone: '🎫' },
        { nome: 'Limpeza de Pele', descricao: 'Tratamento profissional completo', tipo: 'ambos', probabilidade: 20, icone: '✨' }
    ];
    
<<<<<<< HEAD
    const stmt = db.prepare('INSERT INTO premios (nome, descricao, tipo, probabilidade, icone) VALUES (?, ?, ?, ?, ?)');
    premios.forEach(p => stmt.run(p.nome, p.descricao, p.tipo, p.probabilidade, p.icone));
    stmt.finalize();
=======
    for (const p of premios) {
        await client.query(
            'INSERT INTO premios (nome, descricao, tipo, probabilidade, icone) VALUES ($1, $2, $3, $4, $5)',
            [p.nome, p.descricao, p.tipo, p.probabilidade, p.icone]
        );
    }
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
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
<<<<<<< HEAD
app.post('/api/signup', (req, res) => {
=======
app.post('/api/signup', async (req, res) => {
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
    const { nome, email, whatsapp } = req.body;
    
    if (!nome || !email || !whatsapp) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }
    
<<<<<<< HEAD
    db.get('SELECT id FROM participantes WHERE email = ? OR whatsapp = ?', [email, whatsapp], (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro ao verificar dados' });
        if (row) return res.status(409).json({ error: 'Email ou WhatsApp já cadastrado' });
        
        db.run('INSERT INTO participantes (nome, email, whatsapp) VALUES (?, ?, ?)', [nome, email, whatsapp], function(err) {
            if (err) return res.status(500).json({ error: 'Erro ao cadastrar' });
            res.json({ success: true, user: { id: this.lastID, nome, email, whatsapp }, participante_id: this.lastID });
        });
    });
=======
    try {
        const checkResult = await pool.query(
            'SELECT id FROM participantes WHERE email = $1 OR whatsapp = $2',
            [email, whatsapp]
        );
        
        if (checkResult.rows.length > 0) {
            return res.status(409).json({ error: 'Email ou WhatsApp já cadastrado' });
        }
        
        const insertResult = await pool.query(
            'INSERT INTO participantes (nome, email, whatsapp) VALUES ($1, $2, $3) RETURNING id',
            [nome, email, whatsapp]
        );
        
        const participante_id = insertResult.rows[0].id;
        res.json({ success: true, user: { id: participante_id, nome, email, whatsapp }, participante_id });
    } catch (err) {
        console.error('❌ Erro ao cadastrar:', err);
        res.status(500).json({ error: 'Erro ao cadastrar' });
    }
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
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
<<<<<<< HEAD
    
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
=======
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        for (const ind of indicacoes) {
            const { nome, whatsapp, email } = ind;
            
            const existente = await client.query(
                'SELECT id FROM participantes WHERE email = $1 OR whatsapp = $2',
                [email, whatsapp]
            );
            
            if (existente.rows.length > 0) {
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
                erros.push(`❌ ${nome}: Já cadastrado`);
                continue;
            }
            
<<<<<<< HEAD
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
            
=======
            await client.query(
                'INSERT INTO participantes (nome, whatsapp, email, chances, sorteado, indicado_por) VALUES ($1, $2, $3, 5, 0, $4)',
                [nome, whatsapp, email, indicante_id]
            );
            
            indicacoesSalvas++;
            indicadosDetalhes.push({ nome, whatsapp, email });
        }
        
        if (indicacoesSalvas > 0) {
            await client.query(
                'UPDATE participantes SET chances = chances + $1 WHERE id = $2',
                [indicacoesSalvas, indicante_id]
            );
        }
        
        await client.query('COMMIT');
        
        if (indicacoesSalvas > 0) {
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
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
<<<<<<< HEAD
        console.error('❌ Erro ao processar indicações:', error);
        res.status(500).json({ success: false, error: 'Erro ao processar: ' + error.message });
=======
        await client.query('ROLLBACK');
        console.error('❌ Erro ao processar indicações:', error);
        res.status(500).json({ success: false, error: 'Erro ao processar: ' + error.message });
    } finally {
        client.release();
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
    }
});

// Listar participantes
<<<<<<< HEAD
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
=======
app.get('/api/participantes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM participantes ORDER BY data_cadastro DESC');
        res.json(result.rows || []);
    } catch (err) {
        console.error('❌ Erro ao buscar participantes:', err);
        res.status(500).json({ erro: 'Erro ao buscar' });
    }
});

// Participantes ativos
app.get('/api/participantes-ativos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM participantes WHERE sorteado = 0 ORDER BY nome');
        res.json({ participantes: result.rows || [] });
    } catch (err) {
        console.error('❌ Erro ao buscar participantes ativos:', err);
        res.status(500).json({ erro: 'Erro ao buscar' });
    }
});

// Listar prêmios
app.get('/api/premios', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM premios ORDER BY id DESC');
        res.json(result.rows.map(r => ({ ...r, ativo: r.ativo === 1 })));
    } catch (err) {
        console.error('❌ Erro ao buscar prêmios:', err);
        res.status(500).json({ erro: 'Erro ao buscar' });
    }
});

// Prêmios ativos
app.get('/api/premios-ativos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM premios WHERE ativo = 1');
        res.json({ premios: result.rows });
    } catch (err) {
        console.error('❌ Erro ao buscar prêmios ativos:', err);
        res.status(500).json({ error: 'Erro ao buscar' });
    }
});

// Criar prêmio
app.post('/api/premios', async (req, res) => {
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
    const { nome, descricao, icone, tipo, probabilidade, ativo } = req.body;
    
    if (!nome || !tipo) return res.status(400).json({ erro: 'Nome e tipo obrigatórios' });
    
<<<<<<< HEAD
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
=======
    try {
        const result = await pool.query(
            'INSERT INTO premios (nome, descricao, icone, tipo, probabilidade, ativo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [nome, descricao || '', icone || '🎁', tipo, probabilidade || 20, ativo !== false ? 1 : 0]
        );
        res.json({ success: true, id: result.rows[0].id, nome });
    } catch (err) {
        console.error('❌ Erro ao cadastrar prêmio:', err);
        res.status(500).json({ erro: 'Erro ao cadastrar' });
    }
});

// Atualizar prêmio
app.put('/api/premios/:id', async (req, res) => {
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
    const { id } = req.params;
    const { nome, descricao, tipo, probabilidade, icone, ativo } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (nome !== undefined) { updates.push(`nome = $${paramIndex++}`); values.push(nome); }
    if (descricao !== undefined) { updates.push(`descricao = $${paramIndex++}`); values.push(descricao); }
    if (tipo !== undefined) { updates.push(`tipo = $${paramIndex++}`); values.push(tipo); }
    if (probabilidade !== undefined) { updates.push(`probabilidade = $${paramIndex++}`); values.push(probabilidade); }
    if (icone !== undefined) { updates.push(`icone = $${paramIndex++}`); values.push(icone); }
    if (ativo !== undefined) { updates.push(`ativo = $${paramIndex++}`); values.push(ativo ? 1 : 0); }
    
    values.push(id);
    
<<<<<<< HEAD
    db.run(`UPDATE premios SET ${updates.join(', ')} WHERE id = ?`, values, err => {
        if (err) return res.status(500).json({ error: 'Erro ao atualizar' });
=======
    try {
        await pool.query(`UPDATE premios SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Erro ao atualizar prêmio:', err);
        res.status(500).json({ error: 'Erro ao atualizar' });
    }
});

// Deletar prêmio
<<<<<<< HEAD
app.delete('/api/premios/:id', (req, res) => {
    db.run('DELETE FROM premios WHERE id = ?', [req.params.id], err => {
        if (err) return res.status(500).json({ error: 'Erro ao excluir' });
=======
app.delete('/api/premios/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM premios WHERE id = $1', [req.params.id]);
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Erro ao excluir prêmio:', err);
        res.status(500).json({ error: 'Erro ao excluir' });
    }
});

// Deletar participante
<<<<<<< HEAD
app.delete('/api/participantes/:id', (req, res) => {
    db.run('DELETE FROM participantes WHERE id = ?', [req.params.id], err => {
        if (err) return res.status(500).json({ error: 'Erro ao excluir' });
=======
app.delete('/api/participantes/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM participantes WHERE id = $1', [req.params.id]);
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Erro ao excluir participante:', err);
        res.status(500).json({ error: 'Erro ao excluir' });
    }
});

// Histórico de sorteios
<<<<<<< HEAD
app.get('/api/historico-sorteios', (req, res) => {
=======
app.get('/api/historico-sorteios', async (req, res) => {
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
    const { limit, premio_ganho } = req.query;
    
    let query = `SELECT * FROM historico_sorteios 
                 WHERE premio_nome NOT LIKE '%não foi dessa vez%' 
                 AND premio_nome NOT LIKE '%tente novamente%'`;
    const values = [];
    let paramIndex = 1;
    
<<<<<<< HEAD
    if (premio_ganho === 'true') query += ' AND premio_ganho = 1';
    query += ' ORDER BY data_sorteio DESC';
    if (limit) { query += ' LIMIT ?'; values.push(parseInt(limit)); }
    
    db.all(query, values, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar' });
        res.json((rows || []).map(r => ({ ...r, tipo_sorteio: r.tipo_sorteio || 'cadastro' })));
    });
=======
    if (premio_ganho === 'true') {
        query += ` AND premio_ganho = 1`;
    }
    
    query += ' ORDER BY data_sorteio DESC';
    
    if (limit) {
        query += ` LIMIT $${paramIndex++}`;
        values.push(parseInt(limit));
    }
    
    try {
        const result = await pool.query(query, values);
        res.json((result.rows || []).map(r => ({ ...r, tipo_sorteio: r.tipo_sorteio || 'cadastro' })));
    } catch (err) {
        console.error('❌ Erro ao buscar histórico:', err);
        res.status(500).json({ error: 'Erro ao buscar' });
    }
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
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
<<<<<<< HEAD
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

=======
        const result = await pool.query(
            'INSERT INTO historico_sorteios (nome, email, whatsapp, premio_id, premio_nome, premio_ganho, tipo_sorteio) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [participante.nome, participante.email, participante.whatsapp || '', premio.id || 0, premio.nome, 1, tipo]
        );
        
        const sorteioId = result.rows[0].id;
        
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
        const [participantes, premios, sorteios, ganhadores] = await Promise.all([
            pool.query('SELECT COUNT(*) as total FROM participantes'),
            pool.query('SELECT COUNT(*) as total FROM historico_sorteios WHERE premio_ganho = 1'),
            pool.query('SELECT COUNT(*) as total FROM historico_sorteios'),
            pool.query('SELECT nome, premio_nome, data_sorteio, tipo_sorteio FROM historico_sorteios ORDER BY data_sorteio DESC LIMIT 10')
        ]);
        
        const dashboard = {
            total_participantes: parseInt(participantes.rows[0].total) || 0,
            premios_distribuidos: parseInt(premios.rows[0].total) || 0,
            sorteios_realizados: parseInt(sorteios.rows[0].total) || 0,
            ultimos_ganhadores: ganhadores.rows || []
        };
        
        res.json(dashboard);
    } catch (error) {
        console.error('❌ Erro dashboard:', error);
        res.status(500).json({ erro: 'Erro ao carregar' });
    }
});

// Sorteios agendados
app.get('/api/sorteios-agendados', async (req, res) => {
    const { status } = req.query;
    let query = 'SELECT * FROM sorteios_agendados';
    const params = [];
    
    if (status && status !== 'todos') {
        query += ' WHERE status = $1';
        params.push(status);
    }
    query += ' ORDER BY data_sorteio DESC';
    
    try {
        const result = await pool.query(query, params);
        res.json(result.rows || []);
    } catch (err) {
        console.error('❌ Erro ao buscar sorteios agendados:', err);
        res.status(500).json({ erro: 'Erro ao buscar' });
    }
});

app.post('/api/sorteios-agendados', async (req, res) => {
    const { data_sorteio, hora_inicio_sorteio, hora_fim_sorteio, premios_distribuicao } = req.body;
    
    if (!data_sorteio || !hora_inicio_sorteio || !hora_fim_sorteio || !Array.isArray(premios_distribuicao) || premios_distribuicao.length === 0) {
        return res.status(400).json({ erro: 'Dados inválidos' });
    }
    
    try {
        const result = await pool.query(
            'INSERT INTO sorteios_agendados (data_sorteio, hora_inicio_sorteio, hora_fim_sorteio, premios_distribuicao, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [data_sorteio, hora_inicio_sorteio, hora_fim_sorteio, JSON.stringify(premios_distribuicao), 'pendente']
        );
        res.json({ success: true, sorteio_id: result.rows[0].id });
    } catch (err) {
        console.error('❌ Erro ao agendar sorteio:', err);
        res.status(500).json({ erro: 'Erro ao agendar' });
    }
});

app.put('/api/sorteios-agendados/:id', async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE sorteios_agendados SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Erro ao atualizar sorteio:', err);
        res.status(500).json({ erro: 'Erro ao atualizar' });
    }
});

// Sorteio ativo agora
app.get('/api/sorteio-ativo-agora', async (req, res) => {
    const agora = new Date();
    const dataHoje = agora.toISOString().split('T')[0];
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    try {
        const result = await pool.query(
            'SELECT * FROM sorteios_agendados WHERE data_sorteio = $1 AND hora_inicio_sorteio <= $2 AND hora_fim_sorteio >= $3 AND status = $4 LIMIT 1',
            [dataHoje, horaAtual, horaAtual, 'pendente']
        );
        
        if (result.rows.length === 0) {
            return res.json({ ativo: false, premios: [] });
        }
        
        const sorteio = result.rows[0];
        let premiosDistribuicao = [];
        try { 
            premiosDistribuicao = JSON.parse(sorteio.premios_distribuicao || '[]'); 
        } catch (e) {
            console.error('❌ Erro ao parsear prêmios:', e);
        }
        
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
    } catch (err) {
        console.error('❌ Erro ao verificar sorteio ativo:', err);
        res.status(500).json({ ativo: false, premios: [] });
    }
});

// Raspadinhas agendadas
app.get('/api/raspadinhas-agendadas', async (req, res) => {
    const { status } = req.query;
    let query = 'SELECT * FROM raspadinhas_agendadas';
    const params = [];
    
    if (status && status !== 'todos') {
        query += ' WHERE status = $1';
        params.push(status);
    }
    query += ' ORDER BY data_raspadinha DESC';
    
    try {
        const result = await pool.query(query, params);
        res.json(result.rows || []);
    } catch (err) {
        console.error('❌ Erro ao buscar raspadinhas:', err);
        res.status(500).json({ erro: 'Erro ao buscar' });
    }
});

app.post('/api/raspadinhas-agendadas', async (req, res) => {
    const { data_raspadinha, hora_inicio, hora_fim, premios_distribuicao } = req.body;
    
    if (!data_raspadinha || !hora_inicio || !hora_fim) {
        return res.status(400).json({ erro: 'Dados obrigatórios faltando' });
    }
    
    try {
        const result = await pool.query(
            'INSERT INTO raspadinhas_agendadas (data_raspadinha, hora_inicio, hora_fim, premios_distribuicao, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [data_raspadinha, hora_inicio, hora_fim, JSON.stringify(premios_distribuicao || []), 'pendente']
        );
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error('❌ Erro ao agendar raspadinha:', err);
        res.status(500).json({ erro: 'Erro ao agendar' });
    }
});

app.put('/api/raspadinhas-agendadas/:id', async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE raspadinhas_agendadas SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Erro ao atualizar raspadinha:', err);
        res.status(500).json({ erro: 'Erro ao atualizar' });
    }
});

app.delete('/api/raspadinhas-agendadas/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM raspadinhas_agendadas WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Erro ao excluir raspadinha:', err);
        res.status(500).json({ erro: 'Erro ao excluir' });
    }
});

// Raspadinha ativa agora
app.get('/api/raspadinha-ativa-agora', async (req, res) => {
    const agora = new Date();
    const dataHoje = agora.toISOString().split('T')[0];
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    try {
        const result = await pool.query(
            'SELECT * FROM raspadinhas_agendadas WHERE data_raspadinha = $1 AND hora_inicio <= $2 AND hora_fim >= $3 AND status IN ($4, $5) LIMIT 1',
            [dataHoje, horaAtual, horaAtual, 'pendente', 'ativo']
        );
        
        if (result.rows.length === 0) {
            return res.json({ ativo: false, premios: [] });
        }
        
        const raspadinha = result.rows[0];
        let premiosDistribuicao = [];
        try { 
            premiosDistribuicao = JSON.parse(raspadinha.premios_distribuicao || '[]'); 
        } catch (e) {
            console.error('❌ Erro ao parsear prêmios:', e);
        }
        
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
    } catch (err) {
        console.error('❌ Erro ao verificar raspadinha ativa:', err);
        res.status(500).json({ ativo: false, premios: [] });
    }
});

// Configurações
app.get('/api/configuracoes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM configuracoes');
        res.json(result.rows || []);
    } catch (err) {
        console.error('❌ Erro ao buscar configurações:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/configuracoes', async (req, res) => {
    const configs = req.body;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        for (const [chave, valor] of Object.entries(configs)) {
            await client.query(
                'INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor = $2, atualizado_em = CURRENT_TIMESTAMP',
                [chave, valor]
            );
        }
        
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao salvar configurações:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Registrar avaliação Google
app.post('/api/registrar-avaliacao', async (req, res) => {
    const { participante_id, participante_nome, participante_email } = req.body;
    
    if (!participante_id) {
        return res.status(400).json({ success: false, error: 'ID não fornecido' });
    }
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        await client.query(
            'INSERT INTO avaliacoes_google (participante_id, participante_nome, participante_email) VALUES ($1, $2, $3)',
            [participante_id, participante_nome, participante_email]
        );
        
        await client.query(
            'UPDATE participantes SET chances = chances + 2 WHERE id = $1',
            [participante_id]
        );
        
        await client.query('COMMIT');
        res.json({ success: true, message: '+2 chances!', chances_ganhas: 2 });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao registrar avaliação:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

// Indicações de um participante
app.get('/api/indicacoes/:participante_id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT p.* FROM participantes p WHERE p.indicado_por = $1 OR p.id = $2 ORDER BY p.data_cadastro DESC',
            [req.params.participante_id, req.params.participante_id]
        );
        res.json({ success: true, indicacoes: result.rows || [] });
    } catch (err) {
        console.error('❌ Erro ao buscar indicações:', err);
        res.status(500).json({ error: 'Erro ao buscar' });
    }
});

// Participantes com indicações
app.get('/api/participantes-com-indicacoes', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, indicador.nome as indicador_nome, indicador.email as indicador_email 
             FROM participantes p 
             LEFT JOIN participantes indicador ON p.indicado_por = indicador.id 
             ORDER BY p.data_cadastro DESC`
        );
        res.json({ success: true, total: result.rows.length, participantes: result.rows });
    } catch (err) {
        console.error('❌ Erro ao buscar participantes com indicações:', err);
        res.status(500).json({ error: 'Erro ao buscar' });
    }
});

>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
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
<<<<<<< HEAD
            const participantes = await new Promise((resolve, reject) => {
                db.all('SELECT * FROM participantes WHERE sorteado = 0 ORDER BY nome', (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
=======
            const result = await pool.query('SELECT * FROM participantes WHERE sorteado = 0 ORDER BY nome');
            const participantes = result.rows || [];
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
            
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
        
<<<<<<< HEAD
        const participantes = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM participantes WHERE sorteado = 0 ORDER BY nome', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
=======
        const result = await pool.query('SELECT * FROM participantes WHERE sorteado = 0 ORDER BY nome');
        const participantes = result.rows || [];
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
        
        if (participantes.length === 0 || indice_vencedor >= participantes.length) {
            return res.status(400).json({ success: false, message: 'Sem participantes' });
        }
        
        const vencedor = participantes[indice_vencedor];
        
<<<<<<< HEAD
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
=======
        const insertResult = await pool.query(
            'INSERT INTO sorteios_sincronizados (seed, indice_vencedor, total_participantes, premio_id, premio_nome, participante_id, participante_nome, participante_email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [seed, indice_vencedor, total_participantes, premio_id || 0, premio_nome || 'Prêmio', vencedor.id, vencedor.nome, vencedor.email]
        );
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
        
        res.json({
            success: true,
            sorteio: {
<<<<<<< HEAD
                id: sorteio_id,
=======
                id: insertResult.rows[0].id,
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
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

<<<<<<< HEAD
app.get('/api/sorteio-sincronizado/:seed', (req, res) => {
    db.get('SELECT * FROM sorteios_sincronizados WHERE seed = ? ORDER BY data_criacao DESC LIMIT 1', [req.params.seed], (err, row) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!row) return res.status(404).json({ success: false, message: 'Não encontrado' });
        res.json({ success: true, sorteio: row });
    });
=======
app.get('/api/sorteio-sincronizado/:seed', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM sorteios_sincronizados WHERE seed = $1 ORDER BY data_criacao DESC LIMIT 1',
            [req.params.seed]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Não encontrado' });
        }
        
        res.json({ success: true, sorteio: result.rows[0] });
    } catch (err) {
        console.error('❌ Erro ao buscar sorteio sincronizado:', err);
        res.status(500).json({ success: false, error: err.message });
    }
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
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
<<<<<<< HEAD
=======
});

// ============================================
// TRATAMENTO DE ERROS E SHUTDOWN
// ============================================

process.on('SIGINT', async () => {
    console.log('\n🛑 Encerrando servidor...');
    await pool.end();
    console.log('✅ Conexões do banco encerradas');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Encerrando servidor...');
    await pool.end();
    console.log('✅ Conexões do banco encerradas');
    process.exit(0);
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
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
<<<<<<< HEAD
    console.log('\n' + '='.repeat(50) + '\n');
});
=======
    console.log('\n🗄️  PostgreSQL conectado');
    console.log('\n' + '='.repeat(50) + '\n');
});
>>>>>>> 4eefa95 (Ajustes finais do sistema para deploy no Render)
