# Especificação do Formato `.txt` para o Jogo em C (`TuringTest`)

Este documento define a estrutura gerada pelo botão **TXT · JOGO EM C** do Editor Master (e pelo script `scripts/migrate_data.py`), compatível com `LoadDialogTree` e com os novos metadados da Semana 1 e Semana 2.

## Nomenclatura dos Arquivos

- Dias normais (`D1` a `D6`): `<npc_id>_dia<1..6>.txt` (ex.: `arthur_dia1.txt`, `maria_dia3.txt`, `ana_lucia_dia2.txt`)
- Árvore de Enviesamento de Dados: `<npc_id>_vies.txt`
- Árvore de Injeção de Prompt: `<npc_id>_injecao.txt`

## Cabeçalho do Arquivo

Para dias normais (`D1`–`D6`):
```txt
NPC: arthur
SEMANA: 1
DIA: 2
```

Para ferramentas (`vies` / `injecao`):
```txt
NPC: arthur
ARVORE: vies
```

## Bloco de Nó

- O nó inicial (raiz) de **todos** os arquivos é sempre `[NODE: Entrada]` (padronizado para evitar perda de token ao retornar à raiz).
- Placeholders no texto: `[nome]` deve ser substituído em tempo de execução por `GameStateGetPlayerName()`.
- Sequências `" -> "` literais dentro de falas são sanitizadas para `" → "` para não conflitar com o separador de `CHOICE:`.
- Campos marcados como `🧪 EXPERIMENTAL` no editor (`trava_rota_secreta` e notas de Viés/Injeção na Matriz) **não** são exportados para o `.txt`.

### Exemplo completo de nó

```txt
[NODE: Entrada]
SPEAKER: Arthur
TEXT: Oi, tudo bom?
TEXT_CONFIANCA: Eai [nome]! Tudo em cima?
TEXT_PRESSAO: Bom dia.
CHOICE: Oi! Tudo certo administrativo? -> A
CHOICE: Bom dia. A supervisora Ana Lúcia é bem exigente, não é? -> B

[NODE: A]
SPEAKER: Arthur
TEXT: Tudo, a supervisora é exigente, mas tudo ok. Se adaptou bem ontem?
CHOICE: Sim, falei com todos. -> A.1
CHOICE: Consegui falar com galera. Vem cá, você disse que gosta dos Metal Wyrms, você conhece os Psicóticos? -> A#EV-05
REQ: EV-05

[NODE: B.1]
SPEAKER: Arthur
TEXT: Isso é verdade, mas sabemos que não é assim, cê tá sendo extremamente lógico.
CHOICE: Eu... acho que você está certo -> B.1.1
CHOICE: Acho que sim... Maria é bem profissional, mesmo ela está tendo dificuldades. -> B.1.2
DESCONFIANCA: +1

[NODE: A.2.1]
SPEAKER: Arthur
TEXT: Olha, eu deixei um energético na geladeira do refeitório, pode pegar se fizer te sentir melhor.
LEAF: Confiança
GANHA_EV: EV-04

[NODE: B.1.1]
SPEAKER: Arthur
TEXT: Eu vou tentar conversar com ela, não esquenta.
LEAF: Confiança
GANHA_INF: EV-06
```

## Diretivas por Nó

| Diretiva | Onde aparece | Semântica no C |
|---|---|---|
| `[NODE: <id>]` | Início do nó | Identificador único do nó (máx. 31 chars; raiz sempre `Entrada`). |
| `SPEAKER: <nome>` | Todo nó | Nome exibido no cabeçalho do chat. |
| `TEXT: <fala>` | Todo nó | Fala padrão do NPC (em `Entrada` de D2–D6 equivale à visão `Dúvida`). |
| `TEXT_CONFIANCA: <fala>` | `Entrada` (D2–D6) | Fala de abertura se a visão herdada do dia anterior for `Confiança`. |
| `TEXT_PRESSAO: <fala>` | `Entrada` (D2–D6) | Fala de abertura se a visão herdada do dia anterior for `Pressão`. |
| `CHOICE: <fala> -> <id>` | Opções | Opção de escolha do jogador apontando para `<id>`. |
| `REQ: <item_id>` | Logo após `CHOICE:` | Condiciona a última `CHOICE:` lida à posse da evidência ou informação `<item_id>`. |
| `LEAF: <visao>` | Nós finais | Marca nó folha e registra `Confiança`, `Dúvida` ou `Pressão` (em `vies`/`injecao`, tem prioridade sobre a visão normal do dia). |
| `GANHA_EV: <EV-xx>` | Qualquer nó | Concede evidência (objeto) ao visitar o nó. |
| `GANHA_INF: <id>` | Qualquer nó | Concede informação adquirida em conversa ao visitar o nó. |
| `DESCONFIANCA: +<N>` | Qualquer nó | Soma `N` à variável global oculta de autodesconfiança do protagonista. |
| `TYPE: IF` | Nó Desviador IF | Declara que este nó não tem fala própria e avalia `IF:` / `ELSE:` automaticamente. |
| `IF: <expr> -> <id>` | Nó Desviador IF | Se `<expr>` (ex.: `NPC_NATUREZA == Sintético`, `VISAO == Confiança`, `HAS_ITEM EV-01`, `DESCONFIANCA >= 3`) for verdadeira, desvia para `<id>`. |
| `ELSE: -> <id>` | Nó Desviador IF | Caso `IF:` seja falso, desvia para `<id>`. |
| `TEXT_IF: [<expr>] <fala>` | Nó de fala | Substitui `TEXT:` caso `<expr>` seja verdadeira ao entrar no nó. |
| `CHOICE_IF: <expr>` | Logo após `CHOICE:` | Exibe a última `CHOICE:` somente se `<expr>` for verdadeira. |
