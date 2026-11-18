# Dialogue Tool (`DialogueTools`)

Ferramenta visual modular (fluxograma em árvore) para criação, validação, simulação e exportação de diálogos ramificados para qualquer jogo, com **menu inicial estilo jogo**, **condicionais `IF / ELSE`** (desvio de ramo e troca condicional de fala/opção), **13 temas visuais refinados** (iniciando no **Cozy Lo-Fi**, incluindo **Terminal B&W**, **Crimson Crime**, **Spacehead** e **Static Dither (1-Bit)**) e detecção automática de arquivos `.JSON`.

## Arquitetura do Repositório

```text
DialogueTools/
├── src/                                    # Motor da ferramenta (independente de jogo)
│   ├── index.html                          # Versão de desenvolvimento
│   ├── themes.css                          # Design system semântico + 13 temas visuais
│   ├── styles.css                          # Layout utilitário e estilo do fluxograma
│   └── editor.js                           # Menu 'Dialogue Tool' + Editor + IF + Simulador + Ícones SVG
├── vendor/                                 # Dependências offline (Tailwind, React, ReactDOM, VT323)
├── dist/                                   # Artefatos HTML únicos autocontidos (100% offline)
│   ├── DialogueTools.html                  # App principal completo
│   └── Turing_Test_Editor_Master_D1-D6.html# Atalho sincronizado p/ compatibilidade direta
├── games/                                  # Dados isolados de cada jogo
│   ├── turing_test/                        # Arquivos exclusivos do jogo TuringTest
│   │   ├── turing_test_completo.json       # Árvore Global com Arthur, Maria e Ana Lúcia juntos
│   │   ├── json/                           # arthur.json, maria.json, ana_lucia.json (individuais)
│   │   ├── txt/                            # 24 arquivos .txt gerados p/ o motor em C
│   │   ├── legacy/                         # Arquivos originais históricos antes da migração
│   │   ├── reference_c/                    # Espaço p/ .c/.h de referência do TuringTest
│   │   └── docs/                           # Especificação .txt (incluindo IF) e relatórios
│   └── _exemplos/                          # Guia p/ criar subpastas p/ novos jogos
└── scripts/
    ├── migrate_turing.py                   # Atualiza games/turing_test/
    ├── build.py                            # Compila dist/DialogueTools.html
    └── serve.py                            # Servidor HTTP local (porta 8080 por padrão)
```

## Como Usar

- **Offline (dois cliques):** abra `dist/DialogueTools.html` direto no navegador.
  - **Novo Papo:** abre a configuração acessível para ajustar quantos dias/continuações terá o diálogo, abas especiais, finais de diálogo e módulos antes de começar.
  - **Carregar Papo:** anexe qualquer `.json` salvo (ex.: `games/turing_test/turing_test_completo.json` para abrir os 3 NPCs do TuringTest, ou `games/turing_test/json/arthur.json` para abrir apenas um).
- **Servidor local:**
  ```bash
  python3 scripts/serve.py 8080
  ```
- **Recompilar após editar `src/`:**
  ```bash
  python3 scripts/build.py
  ```
