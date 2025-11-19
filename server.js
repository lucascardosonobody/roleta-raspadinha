const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

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

// ============================================
// INICIALIZAÇÃO DO BANCO DE DADOS
// ============================================
db.serialize(() => {
    console.log('\n🔧 Criando estrutura do banco de dados...\n');
    
    // TABELA PARTICIPANTES
    db.run(`
        CREATE TABLE IF NOT EXISTS participantes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            whatsapp TEXT NOT NULL,
            chances INTEGER DEFAULT 5,
            sorteado INTEGER DEFAULT 0,
            indicado_por INTEGER,
            data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (indicado_por) REFERENCES participantes(id)
        )
    `, (err) => {
        if (err) console.error('❌ Erro tabela participantes:', err);
        else console.log('✅ Tabela participantes criada');
    });
    
    // TABELA PREMIOS
    db.run(`
        CREATE TABLE IF NOT EXISTS premios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            nome TEXT NOT NULL,
            descricao TEXT,
            valor REAL,
            imagem TEXT,
            quantidade_disponivel INTEGER DEFAULT 1,
            ativo INTEGER DEFAULT 1,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ Erro tabela premios:', err);
        else console.log('✅ Tabela premios criada');
    });
    
    // TABELA SORTEIOS
    db.run(`
        CREATE TABLE IF NOT EXISTS sorteios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            premio_id INTEGER NOT NULL,
            vencedor_id INTEGER,
            participantes_necessarios INTEGER DEFAULT 100,
            data_sorteio DATETIME,
            ativo INTEGER DEFAULT 1,
            concluido INTEGER DEFAULT 0,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (premio_id) REFERENCES premios(id),
            FOREIGN KEY (vencedor_id) REFERENCES participantes(id)
        )
    `, (err) => {
        if (err) console.error('❌ Erro tabela sorteios:', err);
        else console.log('✅ Tabela sorteios criada');
    });
    
    // TABELA RASPADINHAS
    db.run(`
        CREATE TABLE IF NOT EXISTS raspadinhas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            participante_id INTEGER NOT NULL,
            premio_id INTEGER,
            ganhou INTEGER DEFAULT 0,
            data_raspada DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (participante_id) REFERENCES participantes(id),
            FOREIGN KEY (premio_id) REFERENCES premios(id)
        )
    `, (err) => {
        if (err) console.error('❌ Erro tabela raspadinhas:', err);
        else console.log('✅ Tabela raspadinhas criada');
    });
    
    // TABELA RASPADINHAS_AGENDADAS
    db.run(`
        CREATE TABLE IF NOT EXISTS raspadinhas_agendadas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            premio_id INTEGER NOT NULL,
            quantidade INTEGER DEFAULT 10,
            ativo INTEGER DEFAULT 1,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (premio_id) REFERENCES premios(id)
        )
    `, (err) => {
        if (err) console.error('❌ Erro tabela raspadinhas_agendadas:', err);
        else console.log('✅ Tabela raspadinhas_agendadas criada');
    });
    
    // Inserir prêmios de exemplo
    setTimeout(() => {
        db.get('SELECT COUNT(*) as total FROM premios', (err, row) => {
            if (!err && row.total === 0) {
                console.log('\n📝 Inserindo prêmios de exemplo...\n');
                
                const premios = [
                    ['roleta', 'iPhone 15 Pro', '128GB', 7999.99],
                    ['roleta', 'Notebook Gamer', 'RTX 4060', 5999.99],
                    ['raspadinha', 'Vale-Compras R$ 100', 'Qualquer loja', 100.00],
                    ['raspadinha', 'Fone Bluetooth', 'Premium', 299.99],
                    ['raspadinha', 'Tente Novamente', 'Não ganhou', 0]
                ];
                
                premios.forEach(([tipo, nome, desc, valor]) => {
                    db.run(
                        'INSERT INTO premios (tipo, nome, descricao, valor, ativo) VALUES (?, ?, ?, ?, 1)',
                        [tipo, nome, desc, valor],
                        (err) => {
                            if (!err) console.log(`✅ Prêmio: ${nome}`);
                        }
                    );
                });
            }
            console.log('\n✅ Banco de dados pronto!\n');
        });
    }, 500);
});

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA DO BANCO DE DADOS
// ============================================
db.serialize(() => {
    console.log('🔧 Verificando estrutura do banco de dados...');
    
    // Criar tabela participantes com todas as colunas necessárias
    db.run(`
        CREATE TABLE IF NOT EXISTS participantes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            whatsapp TEXT NOT NULL,
            chances INTEGER DEFAULT 5,
            sorteado INTEGER DEFAULT 0,
            indicado_por INTEGER,
            data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (indicado_por) REFERENCES participantes(id)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela participantes:', err);
        } else {
            console.log('✅ Tabela "participantes" verificada');
            
            // Verificar se a coluna chances existe
            db.get("PRAGMA table_info(participantes)", (err, row) => {
                if (err) {
                    console.error('❌ Erro ao verificar colunas:', err);
                    return;
                }
                
                // Adicionar coluna chances se não existir
                db.run(`ALTER TABLE participantes ADD COLUMN chances INTEGER DEFAULT 5`, (err) => {
                    if (err && !err.message.includes('duplicate column')) {
                        console.error('⚠️ Aviso ao adicionar coluna chances:', err.message);
                    } else if (!err) {
                        console.log('✅ Coluna "chances" adicionada!');
                        
                        // Atualizar participantes existentes
                        db.run(`UPDATE participantes SET chances = 5 WHERE chances IS NULL`, (err) => {
                            if (!err) {
                                console.log('✅ Chances inicializadas para participantes existentes');
                            }
                        });
                    }
                });
            });
        }
    });
    
    // Criar tabela premios
    db.run(`
        CREATE TABLE IF NOT EXISTS premios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            nome TEXT NOT NULL,
            descricao TEXT,
            valor REAL,
            imagem TEXT,
            quantidade_disponivel INTEGER DEFAULT 1,
            ativo INTEGER DEFAULT 1,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela premios:', err);
        } else {
            console.log('✅ Tabela "premios" verificada');
        }
    });
    
    // Criar tabela sorteios
    db.run(`
        CREATE TABLE IF NOT EXISTS sorteios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            premio_id INTEGER NOT NULL,
            vencedor_id INTEGER,
            participantes_necessarios INTEGER DEFAULT 100,
            data_sorteio DATETIME,
            ativo INTEGER DEFAULT 1,
            concluido INTEGER DEFAULT 0,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (premio_id) REFERENCES premios(id),
            FOREIGN KEY (vencedor_id) REFERENCES participantes(id)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela sorteios:', err);
        } else {
            console.log('✅ Tabela "sorteios" verificada');
        }
    });
    
    // Criar tabela raspadinhas
    db.run(`
        CREATE TABLE IF NOT EXISTS raspadinhas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            participante_id INTEGER NOT NULL,
            premio_id INTEGER,
            ganhou INTEGER DEFAULT 0,
            data_raspada DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (participante_id) REFERENCES participantes(id),
            FOREIGN KEY (premio_id) REFERENCES premios(id)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela raspadinhas:', err);
        } else {
            console.log('✅ Tabela "raspadinhas" verificada');
        }
    });
    
    // Criar tabela raspadinhas_agendadas
    db.run(`
        CREATE TABLE IF NOT EXISTS raspadinhas_agendadas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            premio_id INTEGER NOT NULL,
            quantidade INTEGER DEFAULT 10,
            ativo INTEGER DEFAULT 1,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (premio_id) REFERENCES premios(id)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela raspadinhas_agendadas:', err);
        } else {
            console.log('✅ Tabela "raspadinhas_agendadas" verificada');
        }
    });
    
    // Inserir prêmios de exemplo se não existirem
    db.get('SELECT COUNT(*) as total FROM premios', (err, row) => {
        if (!err && row.total === 0) {
            console.log('📝 Inserindo prêmios de exemplo...');
            
            const premios = [
                { tipo: 'roleta', nome: 'iPhone 15 Pro', descricao: '128GB', valor: 7999.99 },
                { tipo: 'roleta', nome: 'Notebook Gamer', descricao: 'RTX 4060', valor: 5999.99 },
                { tipo: 'raspadinha', nome: 'Vale-Compras R$ 100', descricao: 'Qualquer loja', valor: 100.00 },
                { tipo: 'raspadinha', nome: 'Fone Bluetooth', descricao: 'Premium', valor: 299.99 },
                { tipo: 'raspadinha', nome: 'Tente Novamente', descricao: 'Não ganhou desta vez', valor: 0 }
            ];
            
            premios.forEach(premio => {
                db.run(
                    `INSERT INTO premios (tipo, nome, descricao, valor, ativo) VALUES (?, ?, ?, ?, 1)`,
                    [premio.tipo, premio.nome, premio.descricao, premio.valor],
                    (err) => {
                        if (!err) {
                            console.log(`✅ Prêmio "${premio.nome}" inserido`);
                        }
                    }
                );
            });
        }
    });
    
    console.log('✅ Inicialização do banco de dados concluída!\n');
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
                sorteado INTEGER DEFAULT 0
            )
        `, (err) => {
            if (err) console.error('Erro ao criar tabela participantes:', err);
            else console.log('✅ Tabela participantes OK');
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
                data_sorteio DATETIME DEFAULT CURRENT_TIMESTAMP,
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

// ============================================
// ROTA: SALVAR INDICAÇÕES
// ============================================
app.post('/api/indicacoes', async (req, res) => {
    console.log('📥 Recebendo indicações:', req.body);
    
    const { indicante_id, indicante_nome, indicante_email, indicante_whatsapp, indicacoes } = req.body;
    
    // Validação básica
    if (!indicante_id || !indicacoes || !Array.isArray(indicacoes) || indicacoes.length === 0) {
        console.error('❌ Dados inválidos:', req.body);
        return res.status(400).json({ 
            success: false, 
            error: 'Dados inválidos. Verifique se todas as informações foram enviadas.' 
        });
    }
    
    let indicacoesSalvas = 0;
    let erros = [];
    
    try {
        // Processar cada indicação sequencialmente
        for (let i = 0; i < indicacoes.length; i++) {
            const { nome, whatsapp, email } = indicacoes[i];
            
            console.log(`  📝 Processando indicação ${i + 1}/${indicacoes.length}:`, { nome, whatsapp, email });
            
            // Verificar se já existe (promise)
            const existente = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT id FROM participantes WHERE email = ? OR whatsapp = ?',
                    [email, whatsapp],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            
            if (existente) {
                console.log(`  ⚠️ ${nome} já está cadastrado`);
                erros.push(`${nome} já está cadastrado`);
                continue;
            }
            
            // Inserir novo participante (promise)
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
                            console.log(`  ✅ ${nome} cadastrado com sucesso! ID: ${this.lastID}`);
                            indicacoesSalvas++;
                            resolve();
                        }
                    }
                );
            });
            
            // Adicionar +1 chance para quem indicou
            await new Promise((resolve, reject) => {
                db.run(
                    'UPDATE participantes SET chances = chances + 1 WHERE id = ?',
                    [indicante_id],
                    (err) => {
                        if (err) {
                            console.error('  ❌ Erro ao adicionar chance:', err);
                            reject(err);
                        } else {
                            console.log(`  🎁 +1 chance adicionada para ${indicante_nome}`);
                            resolve();
                        }
                    }
                );
            });
        }
        
        // Resposta final
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
// GET /api/historico-sorteios - VERSÃO CORRIGIDA COM LOGS
app.get('/api/historico-sorteios', (req, res) => {
    console.log('🔍 GET /api/historico-sorteios - Iniciando busca...');
    
    const { limit, premio_ganho } = req.query;
    let query = 'SELECT * FROM historico_sorteios';
    const conditions = [];
    const values = [];
    
    if (premio_ganho === 'true') {
        conditions.push('premio_ganho = 1');
        console.log('  ↳ Filtrando apenas ganhadores');
    }
    
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY data_sorteio DESC';
    
    if (limit) {
        query += ' LIMIT ?';
        values.push(parseInt(limit));
        console.log(`  ↳ Limitando a ${limit} registros`);
    }
    
    console.log('  ↳ Query SQL:', query);
    console.log('  ↳ Valores:', values);
    
    db.all(query, values, (err, rows) => {
        if (err) {
            console.error('❌ ERRO ao buscar histórico:', err);
            return res.status(500).json({ error: 'Erro ao buscar histórico', details: err.message });
        }
        
        // Garantir que rows nunca seja null/undefined
        const historico = rows || [];
        
        // Processar cada registro para garantir tipo_sorteio
        const historicoProcessado = historico.map(row => ({
            ...row,
            // Se tipo_sorteio for null/undefined, assume 'cadastro' ou 'roleta'
            tipo_sorteio: row.tipo_sorteio || 'cadastro'
        }));
        
        console.log(`✅ Histórico retornado: ${historicoProcessado.length} registros`);
        
        // Log dos primeiros 3 registros para debug
        if (historicoProcessado.length > 0) {
            console.log('📋 Primeiros registros:');
            historicoProcessado.slice(0, 3).forEach((row, idx) => {
                console.log(`  ${idx + 1}. ${row.nome} - ${row.premio_nome} - ${row.tipo_sorteio}`);
            });
        } else {
            console.log('⚠️  Nenhum registro encontrado na tabela historico_sorteios');
        }
        
        res.json(historicoProcessado);
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

// 4️⃣ ROTA: Verificar se deve sortear automaticamente
app.get('/api/verificar-sorteio', (req, res) => {
    console.log('🔍 Verificando condições para sorteio automático...');
    
    db.get(
        'SELECT valor FROM configuracoes WHERE chave = ?',
        ['sorteio_automatico_ativo'],
        (err, configAtivo) => {
            if (err || !configAtivo || configAtivo.valor !== 'true') {
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
                (err, configQtd) => {
                    const necessarios = parseInt(configQtd?.valor || 10);
                    
                    db.get(
                        'SELECT COUNT(*) as total FROM participantes WHERE sorteado = 0',
                        (err, result) => {
                            const atuais = result?.total || 0;
                            
                            const agora = new Date();
                            const dataHoje = agora.toISOString().split('T')[0];
                            const horaAtual = agora.toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: false 
                            });
                            
                            db.get(`
                                SELECT id FROM sorteios_agendados 
                                WHERE data_sorteio = ? 
                                AND hora_inicio_sorteio <= ? 
                                AND hora_fim_sorteio >= ?
                                AND status = 'pendente'
                                LIMIT 1
                            `, [dataHoje, horaAtual, horaAtual], (err, sorteio) => {
                                
                                const deveSortear = atuais >= necessarios && sorteio;
                                
                                res.json({
                                    deve_sortear: deveSortear,
                                    motivo: deveSortear 
                                        ? 'Condições atendidas' 
                                        : !sorteio 
                                            ? 'Nenhum sorteio ativo no momento'
                                            : `Faltam ${necessarios - atuais} participantes`,
                                    participantes_atuais: atuais,
                                    participantes_necessarios: necessarios,
                                    sorteio_id: sorteio?.id || null
                                });
                            });
                        }
                    );
                }
            );
        }
    );
});

// POST /api/registrar-sorteio
app.post('/api/registrar-sorteio', (req, res) => {
    const { participante, premio, tipo_sorteio } = req.body;
    
    if (!participante || !premio) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    const tipo = tipo_sorteio || 'cadastro';
    
    db.run(
        'INSERT INTO historico_sorteios (nome, email, whatsapp, premio_id, premio_nome, premio_ganho, tipo_sorteio) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [participante.nome, participante.email, participante.whatsapp || '', premio.id || 0, premio.nome, 1, tipo],
        function(err) {
            if (err) return res.status(500).json({ error: 'Erro ao registrar sorteio' });
            res.json({ success: true, sorteio_id: this.lastID, tipo });
        }
    );
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
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/admin/dashboard.html`);
    console.log(`🎯 Painel Admin: http://localhost:${PORT}/admin`);
    console.log(`\n✅ Todas as rotas configuradas!`);
});
