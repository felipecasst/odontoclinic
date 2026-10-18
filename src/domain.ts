// Regras e cálculos que não dependem do banco — testáveis sozinhos.

// --- CPF ---
export function onlyDigits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

export function formatCPF(s: string): string {
  const d = onlyDigits(s).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Valida CPF pelos dígitos verificadores. Vazio é considerado válido (opcional). */
export function isValidCPF(s: string): boolean {
  const cpf = onlyDigits(s);
  if (cpf === "") return true;
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
}

export function formatPhone(s: string): string {
  const d = onlyDigits(s).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// --- Datas (trabalhamos com texto "AAAA-MM-DD" e "AAAA-MM-DD HH:MM") ---
export function age(nascimento: string, ref = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(nascimento || "");
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let a = ref.getFullYear() - y;
  if (ref.getMonth() + 1 < mo || (ref.getMonth() + 1 === mo && ref.getDate() < d)) a--;
  return a >= 0 && a < 130 ? a : null;
}

export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function formatDateBR(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s || "";
}

export function parseDateTime(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s || "");
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
}

export function money(v: number): string {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Soma minutos a "AAAA-MM-DD HH:MM". */
export function addMinutes(dateTime: string, minutes: number): string {
  const d = parseDateTime(dateTime) ?? new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return `${ymd(d)} ${hm(d)}`;
}

/** Dois intervalos [aInicio,aFim) e [bInicio,bFim) se cruzam? (texto comparável). */
export function overlaps(aInicio: string, aFim: string, bInicio: string, bFim: string): boolean {
  return aInicio < bFim && bInicio < aFim;
}

// --- Odontograma: dentes na notação FDI ---
export const QUADRANTES_PERM = [
  [18, 17, 16, 15, 14, 13, 12, 11],
  [21, 22, 23, 24, 25, 26, 27, 28],
  [48, 47, 46, 45, 44, 43, 42, 41],
  [31, 32, 33, 34, 35, 36, 37, 38],
].map((q) => q.map(String));

export const QUADRANTES_DECIDUOS = [
  [55, 54, 53, 52, 51],
  [61, 62, 63, 64, 65],
  [85, 84, 83, 82, 81],
  [71, 72, 73, 74, 75],
].map((q) => q.map(String));

export interface CondicaoDef {
  id: string;
  nome: string;
  cor: string;
  /** Marca o dente inteiro em vez de uma face. */
  denteInteiro?: boolean;
}

export const CONDICOES: CondicaoDef[] = [
  { id: "carie", nome: "Cárie", cor: "#e53935" },
  { id: "restauracao", nome: "Restauração", cor: "#1e88e5" },
  { id: "coroa", nome: "Coroa", cor: "#8e24aa", denteInteiro: true },
  { id: "canal", nome: "Canal (endodontia)", cor: "#fb8c00", denteInteiro: true },
  { id: "extracao", nome: "Extração indicada", cor: "#d81b60", denteInteiro: true },
  { id: "ausente", nome: "Ausente", cor: "#9e9e9e", denteInteiro: true },
  { id: "implante", nome: "Implante", cor: "#00897b", denteInteiro: true },
  { id: "protese", nome: "Prótese", cor: "#5e35b1", denteInteiro: true },
  { id: "selante", nome: "Selante", cor: "#43a047" },
  { id: "fratura", nome: "Fratura", cor: "#f4511e", denteInteiro: true },
];

export const condicao = (id: string) => CONDICOES.find((c) => c.id === id);

export const FACES: { id: string; nome: string }[] = [
  { id: "V", nome: "Vestibular" },
  { id: "L", nome: "Lingual/Palatina" },
  { id: "M", nome: "Mesial" },
  { id: "D", nome: "Distal" },
  { id: "O", nome: "Oclusal/Incisal" },
];

// --- Financeiro ---
export interface ItemValor {
  quantidade: number;
  valor: number;
}
export function somaItens(itens: ItemValor[]): number {
  return itens.reduce((s, i) => s + (i.quantidade || 0) * (i.valor || 0), 0);
}
export function totalPlano(itens: ItemValor[], desconto = 0): number {
  return Math.max(0, somaItens(itens) - (desconto || 0));
}

export interface Parcela {
  parcela: number;
  parcelas: number;
  valor: number;
  vencimento: string;
}

/** Divide um total em N parcelas mensais; sobra de centavos vai na primeira. */
export function gerarParcelas(total: number, n: number, primeiraData: string): Parcela[] {
  const qtd = Math.max(1, Math.floor(n));
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / qtd);
  const resto = cents - base * qtd;
  const out: Parcela[] = [];
  const start = /^(\d{4})-(\d{2})-(\d{2})/.exec(primeiraData);
  const d0 = start ? new Date(Number(start[1]), Number(start[2]) - 1, Number(start[3])) : new Date();
  for (let i = 0; i < qtd; i++) {
    const d = new Date(d0.getFullYear(), d0.getMonth() + i, d0.getDate());
    out.push({
      parcela: i + 1,
      parcelas: qtd,
      valor: (base + (i === 0 ? resto : 0)) / 100,
      vencimento: ymd(d),
    });
  }
  return out;
}

export const STATUS_AGENDA: Record<string, { nome: string; cor: string }> = {
  agendado: { nome: "Agendado", cor: "#2a7de1" },
  confirmado: { nome: "Confirmado", cor: "#00897b" },
  atendido: { nome: "Atendido", cor: "#43a047" },
  faltou: { nome: "Faltou", cor: "#e53935" },
  cancelado: { nome: "Cancelado", cor: "#9e9e9e" },
};

export const STATUS_PLANO: Record<string, string> = {
  orcamento: "Orçamento",
  aprovado: "Aprovado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
