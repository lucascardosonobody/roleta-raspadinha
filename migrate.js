// ============================================
// SCRIPT DE MIGRAÇÃO: SQLite → PostgreSQL
// Execute: node migrate.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const path = require('path');

// ============================================
// CONFIGURAÇÕES - AJUSTE AQUI
// ============================================

const SQLITE_DB_PATH = path.join(__dirname, 'sorteios.db');

const PG_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'sorteios.db',        // Nome do banco que você criou
    user: 'meu_usuario',          // Usuário que você criou
    password: '12345678' // Senha que você definiu
};

// ============================================
// CONEXÕES
// ============================================

const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH);
const pgClient = new Client(PG_CONFIG);

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function query(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function pgQuery(sql, params = []) {
    try {
        const result = await pgClient.query(sql, params);
        return result.rows;
    } catch (error) {
        console.error('❌ Erro no PostgreSQL:', error.message);
        throw error;
    }
}

// ============================================
// CRIAR TABELAS NO POSTGRESQL
// ============================================

async function criarTabelasPostgres() {
    console.log('\n📋 Criando tabelas no PostgreSQL...\n');

    const queries = [
        // Tabela participantes
        `CREATE TABLE IF NOT EXISTS participantes (
            id SERIAL PRIMARY KEY,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            whatsapp TEXT NOT NULL,
            data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sorteado INTEGER DEFAULT 0,
            chances INTEGER DEFAULT 5,
            indicado_por INTEGER,
            data_sorteio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // Tabela avaliacoes_google
        `CREATE TABLE IF NOT EXISTS avaliacoes_google (
            id SERIAL PRIMARY KEY,
            participante_id INTEGER NOT NULL,
            participante_nome TEXT NOT NULL,
            participante_email TEXT NOT NULL,
            data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (participante_id) REFERENCES participantes(id)
        )`,

        // Tabela premios
        `CREATE TABLE IF NOT EXISTS premios (
            id SERIAL PRIMARY KEY,
            nome TEXT NOT NULL,
            descricao TEXT,
            tipo TEXT DEFAULT 'ambos',
            probabilidade INTEGER DEFAULT 20,
            icone TEXT DEFAULT '🎁',
            ativo INTEGER DEFAULT 1
        )`,

        // Tabela historico_sorteios
        `CREATE TABLE IF NOT EXISTS historico_sorteios (
            id SERIAL PRIMARY KEY,
            nome TEXT NOT NULL,
            email TEXT NOT NULL,
            whatsapp TEXT NOT NULL,
            premio_id INTEGER,
            premio_nome TEXT NOT NULL,
            premio_ganho INTEGER DEFAULT 1,
            data_sorteio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            tipo_sorteio TEXT DEFAULT 'cadastro'
        )`,

        // Tabela sorteios_agendados
        `CREATE TABLE IF NOT EXISTS sorteios_agendados (
            id SERIAL PRIMARY KEY,
            data_sorteio TEXT NOT NULL,
            hora_inicio_sorteio TEXT DEFAULT '00:00',
            hora_fim_sorteio TEXT DEFAULT '23:59',
            premios_distribuicao TEXT,
            status TEXT DEFAULT 'pendente',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // Tabela raspadinhas_agendadas
        `CREATE TABLE IF NOT EXISTS raspadinhas_agendadas (
            id SERIAL PRIMARY KEY,
            data_raspadinha DATE NOT NULL,
            hora_inicio TIME NOT NULL,
            hora_fim TIME NOT NULL,
            premios_distribuicao TEXT NOT NULL,
            status TEXT DEFAULT 'pendente',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // Tabela configuracoes
        `CREATE TABLE IF NOT EXISTS configuracoes (
            id SERIAL PRIMARY KEY,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // Tabela sorteios_sincronizados
        `CREATE TABLE IF NOT EXISTS sorteios_sincronizados (
            id SERIAL PRIMARY KEY,
            seed TEXT NOT NULL,
            indice_vencedor INTEGER NOT NULL,
            total_participantes INTEGER NOT NULL,
            premio_id INTEGER,
            premio_nome TEXT,
            participante_id INTEGER,
            participante_nome TEXT,
            participante_email TEXT,
            data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const sql of queries) {
        try {
            await pgQuery(sql);
            const tableName = sql.match(/CREATE TABLE.*?(\w+)\s*\(/)[1];
            console.log(`✅ Tabela ${tableName} criada`);
        } catch (error) {
            console.error(`❌ Erro ao criar tabela:`, error.message);
        }
    }
}

// ============================================
// MIGRAR DADOS
// ============================================

async function migrarTabela(nomeTabela, transformacao = null) {
    console.log(`\n📦 Migrando tabela: ${nomeTabela}`);

    try {
        // Buscar dados do SQLite
        const rows = await query(sqliteDb, `SELECT * FROM ${nomeTabela}`);
        
        if (rows.length === 0) {
            console.log(`⚠️  Tabela ${nomeTabela} está vazia`);
            return;
        }

        console.log(`   Encontrados ${rows.length} registros`);

        // Obter colunas
        const colunas = Object.keys(rows[0]).filter(col => col !== 'id');
        const placeholders = colunas.map((_, i) => `$${i + 1}`).join(', ');
        const colunasStr = colunas.join(', ');

        // Inserir no PostgreSQL
        let sucessos = 0;
        let erros = 0;

        for (const row of rows) {
            try {
                // Aplicar transformação se fornecida
                const dadosProcessados = transformacao ? transformacao(row) : row;
                
                const valores = colunas.map(col => dadosProcessados[col]);
                
                await pgQuery(
                    `INSERT INTO ${nomeTabela} (${colunasStr}) VALUES (${placeholders})`,
                    valores
                );
                
                sucessos++;
            } catch (error) {
                erros++;
                console.error(`   ❌ Erro ao inserir registro:`, error.message);
            }
        }

        console.log(`   ✅ ${sucessos} registros migrados com sucesso`);
        if (erros > 0) {
            console.log(`   ⚠️  ${erros} registros falharam`);
        }

        // Resetar sequence do ID (importante no PostgreSQL)
        await pgQuery(`SELECT setval('${nomeTabela}_id_seq', (SELECT MAX(id) FROM ${nomeTabela}), true)`);
        
    } catch (error) {
        console.error(`❌ Erro ao migrar ${nomeTabela}:`, error.message);
    }
}

// ============================================
// TRANSFORMAÇÕES ESPECÍFICAS
// ============================================

function transformarDataSQLite(row) {
    // Converter datas do formato SQLite para PostgreSQL
    const novoRow = { ...row };
    
    // Campos de data que precisam ser convertidos
    const camposData = ['data_cadastro', 'data_sorteio', 'data_avaliacao', 'created_at', 'atualizado_em', 'data_criacao'];
    
    camposData.forEach(campo => {
        if (novoRow[campo]) {
            // Garantir formato ISO
            const data = new Date(novoRow[campo]);
            if (!isNaN(data.getTime())) {
                novoRow[campo] = data.toISOString();
            }
        }
    });
    
    return novoRow;
}

// ============================================
// PROCESSO PRINCIPAL
// ============================================

async function migrar() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 INICIANDO MIGRAÇÃO: SQLite → PostgreSQL');
    console.log('='.repeat(60));

    try {
        // Conectar ao PostgreSQL
        console.log('\n🔌 Conectando ao PostgreSQL...');
        await pgClient.connect();
        console.log('✅ Conectado ao PostgreSQL!');

        // Criar tabelas
        await criarTabelasPostgres();

        // Migrar dados
        console.log('\n📊 Iniciando migração de dados...\n');
        
        await migrarTabela('participantes', transformarDataSQLite);
        await migrarTabela('avaliacoes_google', transformarDataSQLite);
        await migrarTabela('premios');
        await migrarTabela('historico_sorteios', transformarDataSQLite);
        await migrarTabela('sorteios_agendados', transformarDataSQLite);
        await migrarTabela('raspadinhas_agendadas', transformarDataSQLite);
        await migrarTabela('configuracoes', transformarDataSQLite);
        await migrarTabela('sorteios_sincronizados', transformarDataSQLite);

        console.log('\n' + '='.repeat(60));
        console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
        console.log('='.repeat(60));
        console.log('\n📝 Próximos passos:');
        console.log('   1. Verificar os dados no PostgreSQL');
        console.log('   2. Atualizar o arquivo server.js');
        console.log('   3. Testar a aplicação');
        console.log('   4. Fazer backup do banco SQLite antigo\n');

    } catch (error) {
        console.error('\n❌ ERRO NA MIGRAÇÃO:', error.message);
        console.error(error);
    } finally {
        // Fechar conexões
        sqliteDb.close();
        await pgClient.end();
        console.log('\n🔌 Conexões fechadas.\n');
    }
}

// Executar migração
migrar();