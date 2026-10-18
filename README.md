# OdontoClinic — gestão para consultório odontológico

Sistema de gestão para consultório de odontologia, com as funções do tipo Clinicorp:
pacientes, agenda, odontograma, planos de tratamento e financeiro. Roda no computador,
guarda tudo localmente (sem internet, sem mensalidade) e usa um banco de dados SQLite.

Feito com Electron + React. O banco roda em WebAssembly (node-sqlite3-wasm), então funciona
igual em qualquer Windows sem precisar instalar nada.

## Instalar (Windows 10 ou 11, 64 bits)

**Instalador (recomendado):** abra `OdontoClinic Setup 1.0.0.exe`, que cria atalhos na área de
trabalho e no menu Iniciar.

**Portátil:** extraia `OdontoClinic-1.0.0-win.zip` numa pasta e abra `OdontoClinic.exe`.

Na primeira vez o Windows pode mostrar "O Windows protegeu o seu PC", porque o app não tem
assinatura digital (um certificado pago): clique em **Mais informações → Executar assim mesmo**.

## Funções

**Início (painel):** pacientes ativos, recebido e a receber no mês, saldo, agenda do dia,
aniversariantes e aviso de cobranças vencidas.

**Pacientes:** cadastro completo (dados, contato, endereço, convênio) com validação de CPF e
máscaras; busca por nome, CPF ou telefone. A ficha do paciente reúne:
- **Odontograma:** mapa dos dentes (permanentes e decíduos), marcação por face ou dente inteiro
  (cárie, restauração, coroa, canal, extração, implante, prótese, ausente e outros).
- **Planos de tratamento / orçamentos:** procedimentos com dente, quantidade e valor; desconto;
  total; marcar itens como concluídos; gerar a cobrança parcelada no financeiro.
- **Evolução clínica:** histórico de atendimentos por data e profissional.
- **Histórico de consultas.**

**Agenda:** visão por dia e por semana, por profissional (cada um com sua cor), marcar/editar/
cancelar consultas, status (agendado, confirmado, atendido, faltou, cancelado) e aviso de conflito
de horário.

**Financeiro:** contas a receber e a pagar, filtros por período e situação, totais, baixa de
pagamento com forma e data, parcelamento. As cobranças dos planos entram aqui automaticamente.

**Configurações:** dados da clínica, profissionais (com comissão e cor), tabela de preços de
procedimentos e backup.

## Segurança dos dados (importante)

- Todos os dados ficam **neste computador**, no arquivo `clinica.db` dentro da pasta de dados do
  programa (veja o caminho em Configurações → Backup).
- O programa faz **um backup automático por dia** (guarda os últimos 14) na pasta de dados.
- Faça também **backups manuais** com frequência (Configurações → Backup → Fazer backup agora) e
  guarde uma cópia em pen drive ou na nuvem. Computador pode quebrar ou ser roubado.
- Como são dados de saúde de pacientes, mantenha o computador protegido por senha e respeite a
  LGPD (acesso só de quem precisa).

## Desenvolvimento

Requer Node.js 20+.

```bash
npm install
npm run dev                         # app com recarregamento automático
npm test                            # testes do domínio e do banco de dados
npm run build && xvfb-run -a node tests/ui.e2e.mjs   # teste completo da interface (Linux)
npm run dist:win                    # gera o instalador e o zip do Windows (no Linux precisa do Wine)
```

Estrutura:

- `electron/schema.sql` — estrutura do banco (pacientes, agenda, odontograma, planos, financeiro…).
- `electron/db.cjs` — todas as operações de dados (uma função por ação da interface) + backup.
- `electron/main.cjs` — janela, ponte com o banco, backup automático e restauração.
- `src/domain.ts` — regras e cálculos puros (CPF, datas, dinheiro, parcelamento, dentes).
- `src/pages/` — Início, Pacientes/Ficha, Odontograma, Planos, Agenda, Financeiro, Configurações.

## Aviso

Este é um sistema próprio, feito do zero, com funções comuns a softwares odontológicos. Não contém
código, marca ou identidade visual de nenhum produto de terceiros.
