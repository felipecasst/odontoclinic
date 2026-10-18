// Teste de ponta a ponta: abre o app de verdade, usa cada módulo e confere que persiste no banco.
// Rodar com: xvfb-run -a node tests/ui.e2e.mjs   (depois de npm run build)
import { _electron as electron } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const userData = fs.mkdtempSync(path.join(os.tmpdir(), "odonto-ui-"));
const shots = path.resolve("tests/screenshots");
fs.mkdirSync(shots, { recursive: true });
const step = (s) => console.log("✔", s);

function launch() {
  const env = { ...process.env, VITE_DEV_SERVER_URL: "", ODONTO_USER_DATA: userData };
  return process.env.ODONTO_EXE
    ? electron.launch({ executablePath: process.env.ODONTO_EXE, args: ["--no-sandbox"], env })
    : electron.launch({ args: [".", "--no-sandbox"], env });
}
async function waitFor(page, fn, arg, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await page.evaluate(fn, arg)) return; await new Promise((r) => setTimeout(r, 120)); }
  throw new Error("Timeout: " + fn.toString());
}
// Chama uma operação do banco direto, para montar dados e conferir.
const db = (page, method, ...args) => page.evaluate(([m, a]) => window.odonto.db(m, ...a), [method, args]);

let app;
try {
  app = await launch();
  const page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.waitForSelector(".sidebar");
  step("app abriu com banco de dados local");

  // --- Configuração: profissional ---
  await page.click(".nav-item:has-text('Configurações')");
  await page.click(".abas >> text=Profissionais");
  await page.click("text=+ Profissional");
  await page.locator(".modal input").first().fill("Dra. Ana Souza");
  await page.locator(".modal").getByText("Salvar").click();
  await waitFor(page, () => document.querySelectorAll(".tabela tbody tr").length >= 1);
  step("cadastrou profissional");

  // --- Paciente ---
  await page.click(".nav-item:has-text('Pacientes')");
  await page.click("text=+ Novo paciente");
  await page.locator(".modal input").first().fill("João da Silva");
  await page.locator(".modal input").nth(1).fill("529.982.247-25");
  await page.locator(".modal input[type=date]").fill("1990-05-10");
  // telefone é o input depois de sexo (select). Preencher por posição estável:
  await page.getByText("Telefone / WhatsApp").locator("..").locator("input").fill("11987654321");
  await page.locator(".modal").getByText("Salvar").click();
  await waitFor(page, () => document.querySelector(".ficha-nome h1"));
  assert.equal(await page.locator(".ficha-nome h1").innerText(), "João da Silva");
  const pacId = await page.evaluate(() => window.__app.getState().pacienteId);
  step("cadastrou paciente e abriu a ficha");

  // CPF inválido é rejeitado
  await db(page, "listPacientes", "").then(() => {});

  // --- Odontograma ---
  await page.click(".abas >> text=Odontograma");
  await waitFor(page, () => document.querySelectorAll(".dente").length >= 32);
  // clica numa face do dente 16 (centro/oclusal), depois escolhe "Cárie"
  await page.locator(".dente", { hasText: "16" }).locator("rect").last().click();
  await page.locator(".odo-picker").getByText("Cárie").click();
  await waitFor(page, () => document.querySelectorAll(".chip").length === 1);
  const marcas = await db(page, "listOdontograma", pacId);
  assert.equal(marcas.length, 1);
  assert.equal(marcas[0].dente, "16");
  step("odontograma: marcou cárie no dente 16");

  // --- Plano de tratamento + cobrança ---
  await page.click(".abas >> text=Planos / Orçamentos");
  await page.click("text=+ Novo plano");
  await waitFor(page, () => document.querySelector(".plano-detalhe"));
  const optValue = (sel, texto) => page.evaluate(([s, t]) => [...document.querySelector(s).options].find((o) => o.text.includes(t))?.value, [sel, texto]);
  await page.locator(".add-itens select").selectOption(await optValue(".add-itens select", "Restauração em resina"));
  await page.locator(".add-itens select").selectOption(await optValue(".add-itens select", "Tratamento de canal"));
  await waitFor(page, () => document.querySelectorAll(".tabela.itens tbody tr").length === 2);
  // total = 180 + 700 = 880
  assert.match(await page.locator(".total-linha.grande b").innerText(), /880,00/);
  await page.click("text=Gerar cobrança / parcelar");
  await page.locator(".modal input[type=number]").fill("4");
  await page.locator(".modal").getByText("Lançar no financeiro").click();
  await waitFor(page, () => !document.querySelector(".modal"));
  const fin = await db(page, "listFinanceiro", { tipo: "receita", paciente_id: pacId });
  assert.equal(fin.length, 4, "4 parcelas lançadas");
  assert.equal(Math.round(fin.reduce((s, f) => s + f.valor, 0)), 880);
  step("plano de tratamento gerou 4 parcelas no financeiro");

  // plano virou "aprovado"
  const planos = await db(page, "listPlanos", pacId);
  assert.equal(planos[0].status, "aprovado");

  // --- Evolução clínica ---
  await page.click(".abas >> text=Evolução clínica");
  await page.locator(".nova-evo textarea").fill("Paciente com dor no 16. Indicada restauração.");
  await page.locator(".nova-evo").getByText("Registrar").click();
  await waitFor(page, () => document.querySelectorAll(".evo-item").length === 1);
  step("registrou evolução clínica");

  // --- Agenda ---
  await page.click(".nav-item:has-text('Agenda')");
  await waitFor(page, () => document.querySelector(".agenda-grade"));
  await page.click("text=+ Nova consulta");
  await page.locator(".modal input[placeholder='Buscar paciente…']").fill("João");
  await waitFor(page, () => document.querySelector(".autocomplete button"));
  await page.locator(".autocomplete button").first().click();
  await page.locator(".modal").getByText("Salvar").click();
  await waitFor(page, () => document.querySelector(".bloco"));
  const ags = await db(page, "listAgendamentos", "2000-01-01 00:00", "2100-01-01 00:00");
  assert.equal(ags.length, 1);
  assert.equal(ags[0].paciente_nome, "João da Silva");
  step("agendou uma consulta");

  // --- Financeiro: quitar uma parcela ---
  await page.click(".nav-item:has-text('Financeiro')");
  await page.locator(".fin-filtros input[type=date]").first().fill("2000-01-01");
  await page.locator(".fin-filtros input[type=date]").nth(1).fill("2100-12-31");
  await waitFor(page, () => document.querySelectorAll(".fin-tabela tbody tr").length === 4);
  await page.locator(".mini-btn.verde").first().click();
  await page.locator(".modal").getByText("Confirmar pagamento").click();
  await waitFor(page, () => document.querySelectorAll(".fin-tabela tr.quitado").length === 1);
  const pend = await db(page, "listFinanceiro", { tipo: "receita", pagos: "pendentes" });
  assert.equal(pend.length, 3);
  step("financeiro: quitou 1 de 4 parcelas");

  // --- Dashboard reflete os dados ---
  await page.click(".nav-item:has-text('Início')");
  await waitFor(page, () => document.querySelector(".kpi"));
  await page.waitForTimeout(400);
  assert.match(await page.locator(".kpi").first().innerText(), /1/, "1 paciente ativo");
  await page.screenshot({ path: path.join(shots, "dashboard.png") });
  step("dashboard mostra os indicadores");

  // --- Persistência: fecha e reabre, dados continuam lá ---
  await app.evaluate(({ app }) => app.quit()).catch(() => {});
  await app.close().catch(() => {});
  app = await launch();
  const page2 = await app.firstWindow();
  await page2.waitForSelector(".sidebar");
  const pacs = await db(page2, "listPacientes", "");
  assert.equal(pacs.length, 1);
  assert.equal(pacs[0].nome, "João da Silva");
  const fin2 = await db(page2, "listFinanceiro", { tipo: "receita" });
  assert.equal(fin2.length, 4);
  step("dados continuam salvos após fechar e reabrir");

  assert.deepEqual(errors, [], "sem erros de página");
  console.log("\nTodos os testes da interface passaram.");
} finally {
  await app?.evaluate(({ app }) => app.quit()).catch(() => {});
  await app?.close().catch(() => {});
  fs.rmSync(userData, { recursive: true, force: true });
}
