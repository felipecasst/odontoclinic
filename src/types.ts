export interface Clinica {
  id: number; nome: string; cnpj: string; telefone: string; endereco: string; responsavel: string; cro: string;
}

export interface Profissional {
  id: number; nome: string; cro: string; especialidade: string; telefone: string; email: string;
  cor: string; comissao: number; ativo: number; criado_em?: string;
}

export interface Procedimento {
  id: number; codigo: string; nome: string; categoria: string; preco: number; duracao: number; ativo: number;
}

export interface Paciente {
  id: number; nome: string; cpf: string; nascimento: string; sexo: string; telefone: string; email: string;
  cep: string; endereco: string; numero: string; bairro: string; cidade: string; uf: string;
  convenio: string; indicacao: string; observacoes: string; anamnese: string; ativo: number; criado_em?: string;
}

export interface Agendamento {
  id: number; paciente_id: number | null; profissional_id: number | null; inicio: string; fim: string;
  procedimento: string; status: string; observacoes: string;
  paciente_nome?: string; profissional_nome?: string; profissional_cor?: string;
}

export interface OdontoMarca {
  id: number; paciente_id: number; dente: string; face: string; tipo: string; estado: string;
  cor: string; observacao: string; atualizado_em?: string;
}

export interface Evolucao {
  id: number; paciente_id: number; profissional_id: number | null; data: string; texto: string; dente: string;
  profissional_nome?: string;
}

export interface PlanoItem {
  id: number; plano_id: number; procedimento_id: number | null; descricao: string; dente: string; face: string;
  quantidade: number; valor: number; status: string; concluido_em: string; profissional_id: number | null;
}

export interface Plano {
  id: number; paciente_id: number; profissional_id: number | null; titulo: string; status: string;
  desconto: number; criado_em?: string; itens?: PlanoItem[];
}

export interface Lancamento {
  id: number; tipo: "receita" | "despesa"; paciente_id: number | null; plano_id: number | null;
  descricao: string; categoria: string; valor: number; vencimento: string; pago_em: string; forma: string;
  parcela: number; parcelas: number; paciente_nome?: string;
}

export interface DashboardData {
  pacientes: number;
  agendaHoje: Agendamento[];
  aReceberMes: number;
  recebidoMes: number;
  despesasMes: number;
  vencidos: { c: number; v: number };
  aniversariantes: { id: number; nome: string; nascimento: string; telefone: string }[];
}

declare global {
  interface Window {
    odonto: {
      db<T = unknown>(method: string, ...args: unknown[]): Promise<T>;
      backupSave(): Promise<string | null>;
      backupRestore(): Promise<boolean>;
      appInfo(): Promise<{ versao: string; dados: string }>;
      openDataFolder(): Promise<void>;
    };
  }
}
