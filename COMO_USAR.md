# Torneio de Robótica — Hub

## Estrutura

```
torneio-robotica/
  apps-script/
    api.gs          ← cole no mesmo projeto Apps Script do sistema principal
  hub/
    index.html      ← página inicial (hub)
    ranking.html    ← ranking geral e por categoria
    juiz.html       ← formulário de avaliação (rubricas + arena)
    deliberacao.html← sala de deliberação (chat + votação + comparação)
    css/styles.css
    js/api.js
```

---

## Passo a passo de instalação

### 1. Apps Script

1. Abra a planilha do torneio no Google Sheets.
2. Menu **Extensões → Apps Script**.
3. Cole o conteúdo de `apps-script/api.gs` como um **novo arquivo** no projeto.
   - O arquivo `api.gs` usa funções do script principal (`carregarConfig_`, `lerEquipes_`, etc.) — ambos precisam estar no mesmo projeto.
4. **Publicar como Web App:**
   - Clique em **Implantar → Nova implantação**.
   - Tipo: **Aplicativo da Web**.
   - Executar como: **Eu mesmo**.
   - Acesso: **Qualquer pessoa** (ou "Qualquer pessoa da organização").
   - Clique em **Implantar** e copie a URL gerada.

### 2. Configure a URL nos HTMLs

Em cada arquivo HTML (`index.html`, `ranking.html`, `juiz.html`, `deliberacao.html`), localize:

```js
window.API_URL = 'https://script.google.com/macros/s/SEU_SCRIPT_ID/exec';
```

Substitua `SEU_SCRIPT_ID` pelo ID real da sua implantação.

### 3. Cadastre os juízes

Na planilha, crie uma aba chamada **`HUB_JUIZES`** com as colunas:

| Nome         | PIN  | Categoria              | Ativo |
|-------------|------|------------------------|-------|
| Maria Silva  | 1234 | Projeto de Inovação    | Sim   |
| João Costa   | 5678 | Design do Robô         | Sim   |
| Ana Lima     | 9012 |                        | Sim   |

- **PIN** pode ser deixado em branco para acesso sem senha (modo evento).
- **Categoria** é informativa; não restringe o que o juiz pode avaliar.
- **Ativo = Não** bloqueia o login.

> O script cria a aba `HUB_JUIZES` automaticamente na primeira chamada se ela não existir.

### 4. Hospede os arquivos HTML

Opções simples:
- **GitHub Pages** — suba a pasta `hub/` para um repositório e ative Pages.
- **Google Drive** — carregue os arquivos e compartilhe como página da web.
- **Qualquer servidor estático** (Netlify, Vercel, etc.).

Os arquivos não precisam de servidor back-end próprio — toda a lógica fica no Apps Script.

---

## Missões personalizadas (Arena)

O arquivo `juiz.html` tem a lista `MISSOES_PADRAO` com 15 missões de exemplo. Edite esse array com os nomes reais das missões do torneio antes de usar.

## Critérios das rubricas

Os critérios exibidos no formulário de rubrica (`CRITERIOS` em `juiz.html`) seguem o padrão FLL. Ajuste os textos conforme o regulamento do seu torneio.

---

## Fluxo de uso no dia do evento

1. **Juízes** acessam `juiz.html` em seus celulares/tablets, entram com nome + PIN e preenchem avaliações.
2. **Ranking** (`ranking.html`) é exibido no telão — atualiza automaticamente a cada 10s.
3. **Deliberação** (`deliberacao.html`) é aberta pelos juízes para comparar equipes, trocar mensagens e votar antes do anúncio oficial.
4. Todo dado vai direto para o Google Sheets e o script principal recalcula os resultados automaticamente.
