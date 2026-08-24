# Torneio de Robótica — Hub

## Estrutura do projeto

```
torneio-robotica/
  apps-script/
    torneio.gs          ← arquivo ÚNICO para o Apps Script (script + API)
  hub/
    index.html          ← hub principal
    ranking.html        ← ranking ao vivo (geral + por categoria)
    juiz.html           ← formulário de avaliação para juízes
    deliberacao.html    ← sala de deliberação (chat + votação + comparação)
    css/styles.css
    js/api.js
  COMO_USAR.md          ← este arquivo
  INTEGRACAO_FORMS.md   ← como conectar os Google Forms
```

---

## Instalação do Apps Script

1. Abra a planilha do torneio no Google Sheets
2. **Extensões → Apps Script**
3. Apague qualquer conteúdo existente no editor
4. Cole o conteúdo de [apps-script/torneio.gs](apps-script/torneio.gs)
5. Salve (Ctrl+S)
6. Execute **`TORNEIO_instalar`** → autorize as permissões
7. A planilha terá as abas criadas automaticamente

### Publicar a API (para o Hub)

1. **Implantar → Nova implantação**
2. Tipo: **Aplicativo da Web**
3. Executar como: **Eu mesmo**
4. Acesso: **Qualquer pessoa**
5. Copie a URL gerada

A URL já está configurada nos arquivos HTML. Se precisar trocar, edite a linha:
```js
window.API_URL = 'https://script.google.com/macros/s/.../exec';
```
nos 4 arquivos HTML.

---

## Configuração (aba CONFIG)

Após instalar, edite a aba **CONFIG** na planilha:

| Parâmetro                   | Padrão            | O que mudar                          |
|-----------------------------|-------------------|--------------------------------------|
| Título do Painel            | TORNEIO DE ROBÓTICA | Nome exibido no painel e no hub    |
| Aba Form Arena              | FORM_ARENA        | Nome da aba de respostas do Form     |
| Aba Form Projeto            | FORM_PROJETO      | Idem                                 |
| Aba Form Design             | FORM_DESIGN       | Idem                                 |
| Aba Form Core               | FORM_CORE         | Idem                                 |
| Meta Tampinhas kg/aluno     | 0.5               | Meta antes do início da campanha     |
| Juízes Esperados por Rubrica| 3                 | Avaliações esperadas por equipe      |

---

## Cadastro de equipes (aba EQUIPES)

Preencha a aba **EQUIPES** com:

| ID_Equipe | Nome_Equipe    | Turno     | Tutor     | Qtde_Alunos |
|-----------|---------------|-----------|-----------|-------------|
| T01       | Turma Alpha   | Manhã     | Prof. Ana | 5           |
| T02       | Turma Beta    | Tarde     | Prof. João| 6           |

O **ID_Equipe** deve coincidir com o que os juízes digitam nos Forms.

---

## Integração com Google Forms

Veja o guia completo em [INTEGRACAO_FORMS.md](INTEGRACAO_FORMS.md).

Resumo:
1. Em cada Form → **Respostas → Vincular ao Sheets** → selecione esta planilha
2. Renomeie a aba criada (ex: `FORM_ARENA`)
3. Coloque esse nome na aba CONFIG

---

## Juízes do Hub (aba HUB_JUIZES)

Criada automaticamente na primeira chamada. Preencha com:

| Nome         | PIN  | Categoria           | Ativo |
|-------------|------|---------------------|-------|
| Maria Silva  | 1234 | Projeto             | Sim   |
| João Costa   | 5678 | Design              | Sim   |

- Sem PIN cadastrado → qualquer PIN é aceito (modo aberto)
- Ativo = Não → bloqueia o acesso do juiz

---

## Hospedagem do Hub (arquivos HTML)

Qualquer hospedagem estática funciona:

**GitHub Pages (mais simples):**
1. Repositório → Settings → Pages
2. Branch: `main` / pasta: `/hub`
3. URL: `https://talia-projetos.github.io/robotica/`

**Vercel / Netlify:** arraste a pasta `hub/` para o dashboard.

---

## Fluxo no dia do evento

1. **Juízes** acessam `juiz.html` no celular → entram com nome + PIN → preenchem avaliações
2. **Telão** exibe `ranking.html` (atualiza a cada 10s automaticamente)
3. **Deliberação** (`deliberacao.html`) → juízes comparam equipes, trocam mensagens e votam
4. Todos os dados vão para o Sheets → o script recalcula tudo automaticamente
