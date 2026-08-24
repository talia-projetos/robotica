# Integração com Google Forms

## Visão geral

O script lê as respostas diretamente das abas que o Google Forms cria na planilha. Você só precisa:
1. Vincular cada Form à planilha
2. Anotar o nome da aba criada
3. Inserir esse nome na aba **CONFIG**

---

## Passo a passo para cada formulário

### 1. Vincular o Form à planilha

1. Abra o Google Forms
2. Clique em **Respostas** (aba no topo)
3. Clique no ícone de planilha (🟢 "Vincular ao Sheets")
4. Selecione **"Selecionar planilha existente"**
5. Escolha a planilha do torneio
6. Clique em **Selecionar**

O Forms cria uma nova aba na planilha (ex: `Respostas ao formulário 1`).

### 2. Renomear a aba (recomendado)

Renomeie a aba para algo como `FORM_ARENA`, `FORM_PROJETO`, etc. — fica mais fácil de identificar.

### 3. Configurar o nome na aba CONFIG

Na planilha, abra a aba **CONFIG** e edite:

| Parâmetro        | Valor (nome exato da aba) |
|-----------------|---------------------------|
| Aba Form Arena  | `FORM_ARENA`              |
| Aba Form Projeto| `FORM_PROJETO`            |
| Aba Form Design | `FORM_DESIGN`             |
| Aba Form Core   | `FORM_CORE`               |

---

## Perguntas obrigatórias em cada formulário

O script detecta as colunas automaticamente pelo nome da pergunta. Use estes nomes (ou variações próximas):

### Todos os formulários

| Pergunta          | Como chamar no Form                              |
|-------------------|--------------------------------------------------|
| Equipe avaliada   | `ID da Equipe`, `Equipe`, `Turma`               |
| Juiz / avaliador  | `Nome do Juiz`, `Nome do Avaliador`, `Avaliador`|
| Validado?         | `Validado` (Sim/Não) — **opcional**             |

### Form da Arena

| Pergunta    | Como chamar                                  |
|-------------|----------------------------------------------|
| Equipe      | `ID da Equipe`                               |
| Round       | `Round`, `Rodada`                            |
| Árbitro     | `Árbitro`, `Juiz`                            |
| Penalidade  | `Penalidade` — **opcional**                  |
| Missões     | `M01`, `M02`, … (ou `Missão 01`, `Missão 02`) — uma pergunta por missão, tipo Numérico |

### Forms de Rubrica (Projeto / Design / Core Values)

| Pergunta    | Como chamar                                  |
|-------------|----------------------------------------------|
| Equipe      | `ID da Equipe`                               |
| Juiz        | `Nome do Juiz`                               |
| Critérios   | Uma pergunta por critério, tipo **Escala linear 1–4** ou **Múltipla escolha** com opções `1 Começa / 2 Em Desenvolvimento / 3 Realizado / 4 Exemplar` |

> O script detecta automaticamente colunas com valores no intervalo 1–4. Qualquer pergunta de escala funciona.

---

## Exemplo de formulário de Rubrica

Crie as perguntas nessa ordem:

```
1. ID da Equipe              → Resposta curta
2. Nome do Juiz              → Resposta curta
3. Identificação do Problema → Escala linear 1–4
4. Pesquisa e Dados          → Escala linear 1–4
5. Proposta de Solução       → Escala linear 1–4
6. Inovação                  → Escala linear 1–4
7. Validação                 → Escala linear 1–4
8. Implementação             → Escala linear 1–4
9. Impacto                   → Escala linear 1–4
10. Comunicação              → Escala linear 1–4
11. Especialistas            → Escala linear 1–4
12. Trabalho em Equipe       → Escala linear 1–4
```

---

## Exemplo de formulário de Arena

```
1. ID da Equipe              → Resposta curta
2. Round                     → Múltipla escolha: Round 1 / Round 2 / Round 3
3. Árbitro                   → Resposta curta
4. M01 - Nome da Missão      → Resposta curta (numérica)
5. M02 - Nome da Missão      → Resposta curta (numérica)
...
N. Penalidade                → Resposta curta (numérica) — opcional
```

---

## Validação (coluna opcional)

Se quiser controlar quais respostas são consideradas válidas, adicione uma pergunta:

```
Nome: Validado
Tipo: Múltipla escolha
Opções: Sim / Não
```

Respostas marcadas como **Não** são ignoradas no cálculo. Se a coluna não existir, todas as respostas são consideradas válidas.

---

## Após vincular

1. Execute **Torneio → Instalar / atualizar** na planilha
2. Verifique a aba **DIAGNÓSTICO** — linhas verdes = OK, linhas amarelas = aviso, linhas vermelhas = erro
3. Se a aba do Form não for encontrada, o diagnóstico indicará qual nome foi buscado

---

## Perguntas frequentes

**O Form já tem respostas — o script vai perder os dados?**
Não. O script apenas lê as respostas; nunca apaga nada.

**Posso ter mais de 10 critérios?**
Sim. Altere o campo **Critérios por Rubrica** na aba CONFIG.

**O script não encontrou as colunas de missão.**
Verifique se as perguntas do tipo missão estão com tipo **Numérico** ou **Resposta curta** (com valores numéricos). Perguntas de texto livre não são detectadas.
