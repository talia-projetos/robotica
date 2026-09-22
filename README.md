# HUB Circuito — Torneio Interno de Robótica

Plataforma web do torneio interno de robótica da Escola SESI Reitor Miguel Calmon. Publicada via GitHub Pages em `docs/`.

## Perfis de acesso

| Perfil | Credencial | Acesso |
|---|---|---|
| Coordenação | Nome + PIN | Todas as telas |
| Juiz | Nome + PIN | Avaliação, Arena, Deliberação |
| Professor/Turma | ID da equipe + PIN | Minha Turma, Cronograma, Arena |

## Telas

| Arquivo | Descrição |
|---|---|
| `login.html` | Entrada pública |
| `index.html` | Home com resumo e acesso rápido |
| `juizes.html` | Painel do juiz: categorias, chat com coordenação |
| `avaliacao.html` | Rubrica de avaliação (Projeto, Design, Core Values) e ficha da Arena |
| `arena.html` | Cronômetro de round e classificação de arena ao vivo |
| `coordenacao.html` | Visão geral de todas as equipes e pontuações |
| `turma.html` | Painel da equipe: scores, metodologia, documentos, feedback |
| `ranking.html` | Ranking geral e por categoria |
| `deliberacao.html` | Deliberação final entre juízes |
| `cronograma.html` | Agenda do torneio |
| `documentos.html` | Materiais e downloads |
| `relatorio.html` | Relatório exportável |
| `rubricas.html` | Ficha impressa de rubrica |

## Stack

- HTML + CSS + JS puro (sem frameworks)
- Backend: Google Apps Script Web App (planilha Google Sheets)
- Hospedagem: GitHub Pages (`docs/`)

## Backend (Apps Script)

O script está em `apps-script/`. Ele lê e escreve nas seguintes abas da planilha:

| Aba | Conteúdo |
|---|---|
| `HUB_JUIZES` | Cadastro de juízes e coordenadores |
| `EQUIPES` | Cadastro das equipes |
| `FORM_ARENA` | Pontuações da arena por round |
| `FORM_PROJETO` | Rubricas de Projeto de Inovação |
| `FORM_DESIGN` | Rubricas de Design do Robô |
| `FORM_CORE` | Rubricas de Core Values |
| `BASE_RESULTADOS` | Pontuação consolidada por equipe |
| `HUB_DELIBERACAO_CHAT` | Mensagens do chat de deliberação |
| `CONFIG` | Configurações gerais |
| `TAMPINHAS` | Pesagens do desafio de tampinhas |

## Categorias avaliadas

| Área | Categoria | Peso |
|---|---|---|
| Ciência | Projeto de Inovação | 20% |
| Tecnologia | Desafio do Robô (Arena) | 20% |
| Engenharia | Design do Robô | 20% |
| Artes | Core Values | 20% |
| Matemática | Tampinhas & Latas | 20% |

## Atualizar o backend

1. Edite o script em `apps-script/`
2. Cole no Google Apps Script (editor do projeto)
3. **Deploy → Manage deployments → editar → New version**
4. Copie a URL `/exec` e atualize `window.API_URL` no `<head>` de cada HTML (ou use busca global)

## Desenvolvimento local

Abra qualquer arquivo `docs/*.html` diretamente no browser. O `window.API_URL` já aponta para o Apps Script em produção, então as chamadas de API funcionam normalmente.
