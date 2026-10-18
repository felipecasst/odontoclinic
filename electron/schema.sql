-- Banco de dados local do OdontoClinic. Tudo fica num único arquivo .db no computador.
PRAGMA foreign_keys = ON;

-- Configuração da clínica (uma linha).
CREATE TABLE IF NOT EXISTS clinica (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nome TEXT NOT NULL DEFAULT 'Minha Clínica',
  cnpj TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  responsavel TEXT DEFAULT '',
  cro TEXT DEFAULT ''
);
INSERT OR IGNORE INTO clinica (id) VALUES (1);

-- Profissionais (dentistas e equipe).
CREATE TABLE IF NOT EXISTS profissionais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cro TEXT DEFAULT '',
  especialidade TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  cor TEXT NOT NULL DEFAULT '#2a7de1',   -- cor na agenda
  comissao REAL NOT NULL DEFAULT 0,       -- % de comissão
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Pacientes.
CREATE TABLE IF NOT EXISTS pacientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cpf TEXT DEFAULT '',
  nascimento TEXT DEFAULT '',             -- AAAA-MM-DD
  sexo TEXT DEFAULT '',                    -- M / F / O
  telefone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  cep TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  numero TEXT DEFAULT '',
  bairro TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  uf TEXT DEFAULT '',
  convenio TEXT DEFAULT '',
  indicacao TEXT DEFAULT '',              -- como conheceu a clínica
  observacoes TEXT DEFAULT '',
  anamnese TEXT DEFAULT '{}',             -- JSON de respostas de saúde
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_pac_nome ON pacientes (nome);
CREATE INDEX IF NOT EXISTS idx_pac_cpf ON pacientes (cpf);

-- Procedimentos / tabela de preços.
CREATE TABLE IF NOT EXISTS procedimentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT DEFAULT '',
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT '',
  preco REAL NOT NULL DEFAULT 0,
  duracao INTEGER NOT NULL DEFAULT 30,    -- minutos (sugestão de agenda)
  ativo INTEGER NOT NULL DEFAULT 1
);

-- Agendamentos.
CREATE TABLE IF NOT EXISTS agendamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE SET NULL,
  profissional_id INTEGER REFERENCES profissionais(id) ON DELETE SET NULL,
  inicio TEXT NOT NULL,                   -- AAAA-MM-DD HH:MM
  fim TEXT NOT NULL,
  procedimento TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'agendado',-- agendado, confirmado, atendido, faltou, cancelado
  observacoes TEXT DEFAULT '',
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_ag_inicio ON agendamentos (inicio);
CREATE INDEX IF NOT EXISTS idx_ag_prof ON agendamentos (profissional_id);

-- Odontograma: uma condição/procedimento por dente (e opcionalmente face).
CREATE TABLE IF NOT EXISTS odontograma (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  dente TEXT NOT NULL,                    -- notação FDI: 11..48, 51..85
  face TEXT DEFAULT '',                   -- O,M,D,V,L,I ou vazio (dente todo)
  tipo TEXT NOT NULL,                     -- id da condição (carie, restauracao, ...)
  estado TEXT NOT NULL DEFAULT 'existente',-- existente, planejado, concluido
  cor TEXT DEFAULT '',
  observacao TEXT DEFAULT '',
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_odo_pac ON odontograma (paciente_id);

-- Planos de tratamento / orçamentos.
CREATE TABLE IF NOT EXISTS planos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profissional_id INTEGER REFERENCES profissionais(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL DEFAULT 'Plano de tratamento',
  status TEXT NOT NULL DEFAULT 'orcamento', -- orcamento, aprovado, em_andamento, concluido, cancelado
  desconto REAL NOT NULL DEFAULT 0,       -- valor em R$
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_plano_pac ON planos (paciente_id);

-- Itens de um plano (procedimentos planejados).
CREATE TABLE IF NOT EXISTS plano_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plano_id INTEGER NOT NULL REFERENCES planos(id) ON DELETE CASCADE,
  procedimento_id INTEGER REFERENCES procedimentos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  dente TEXT DEFAULT '',
  face TEXT DEFAULT '',
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor REAL NOT NULL DEFAULT 0,          -- valor unitário
  status TEXT NOT NULL DEFAULT 'pendente',-- pendente, concluido
  concluido_em TEXT DEFAULT '',
  profissional_id INTEGER REFERENCES profissionais(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_item_plano ON plano_itens (plano_id);

-- Lançamentos financeiros (a receber do paciente e a pagar da clínica).
CREATE TABLE IF NOT EXISTS financeiro (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,                     -- receita, despesa
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE SET NULL,
  plano_id INTEGER REFERENCES planos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  categoria TEXT DEFAULT '',
  valor REAL NOT NULL,
  vencimento TEXT NOT NULL,               -- AAAA-MM-DD
  pago_em TEXT DEFAULT '',                -- AAAA-MM-DD quando quitado
  forma TEXT DEFAULT '',                  -- dinheiro, pix, cartao, boleto...
  parcela INTEGER NOT NULL DEFAULT 1,
  parcelas INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_fin_venc ON financeiro (vencimento);
CREATE INDEX IF NOT EXISTS idx_fin_pac ON financeiro (paciente_id);

-- Evolução clínica (histórico de atendimentos por paciente).
CREATE TABLE IF NOT EXISTS evolucoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profissional_id INTEGER REFERENCES profissionais(id) ON DELETE SET NULL,
  data TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  texto TEXT NOT NULL DEFAULT '',
  dente TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_evo_pac ON evolucoes (paciente_id);
