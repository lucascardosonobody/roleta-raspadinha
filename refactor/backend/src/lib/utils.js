export function badRequest(res, error, status = 400) {
  return res.status(status).json({ success: false, error: error instanceof Error ? error.message : error });
}

export function ok(res, data = {}, status = 200) {
  return res.status(status).json(data);
}

export function nowIso() {
  return new Date().toISOString();
}

export function mapPrize(row) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    icone: row.icone,
    ativo: row.ativo,
    tipo: row.tipo,
    probabilidade: row.probabilidade,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
