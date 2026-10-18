import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidCPF, formatCPF, formatPhone, age, money, addMinutes, overlaps, gerarParcelas, totalPlano, somaItens,
} from "../src/domain.ts";

test("CPF: validação pelos dígitos", () => {
  assert.equal(isValidCPF("529.982.247-25"), true);
  assert.equal(isValidCPF("52998224725"), true);
  assert.equal(isValidCPF("111.111.111-11"), false);
  assert.equal(isValidCPF("529.982.247-24"), false);
  assert.equal(isValidCPF("123"), false);
  assert.equal(isValidCPF(""), true); // opcional
});

test("máscaras", () => {
  assert.equal(formatCPF("52998224725"), "529.982.247-25");
  assert.equal(formatPhone("11987654321"), "(11) 98765-4321");
  assert.equal(formatPhone("1133224455"), "(11) 3322-4455");
});

test("idade", () => {
  assert.equal(age("2000-06-15", new Date(2026, 5, 14)), 25);
  assert.equal(age("2000-06-15", new Date(2026, 5, 15)), 26);
  assert.equal(age(""), null);
});

test("dinheiro em reais", () => {
  assert.match(money(1234.5), /1\.234,50/);
  assert.match(money(0), /0,00/);
});

test("agenda: somar minutos e detectar conflito", () => {
  assert.equal(addMinutes("2026-03-10 09:00", 45), "2026-03-10 09:45");
  assert.equal(addMinutes("2026-03-10 23:30", 45), "2026-03-11 00:15");
  assert.equal(overlaps("2026-03-10 09:00", "2026-03-10 10:00", "2026-03-10 09:30", "2026-03-10 10:30"), true);
  assert.equal(overlaps("2026-03-10 09:00", "2026-03-10 10:00", "2026-03-10 10:00", "2026-03-10 11:00"), false);
});

test("plano: total com desconto", () => {
  const itens = [{ quantidade: 2, valor: 150 }, { quantidade: 1, valor: 300 }];
  assert.equal(somaItens(itens), 600);
  assert.equal(totalPlano(itens, 100), 500);
  assert.equal(totalPlano(itens, 10000), 0); // não fica negativo
});

test("parcelamento: soma bate e centavos sobram na 1ª", () => {
  const p = gerarParcelas(1000, 3, "2026-01-31");
  assert.equal(p.length, 3);
  assert.equal(Math.round(p.reduce((s, x) => s + x.valor, 0) * 100), 100000);
  assert.equal(p[0].valor, 333.34);
  assert.equal(p[1].valor, 333.33);
  // meses sucessivos
  assert.equal(p[0].vencimento, "2026-01-31");
  assert.equal(p[1].vencimento.slice(0, 7), "2026-03"); // 31 de fev -> rola para março
});
