# DialogueTools

Ferramenta visual modular (fluxograma em árvore) para criação, validação, simulação e exportação de diálogos para **múltiplos jogos**, com **10 temas visuais inspiradores**, detecção automática de arquivos salvos e o projeto **TuringTest Master (D1–D6 + Viés + Injeção)** já integrado e isolado.

## Arquitetura do Repositório

```text
DialogueTools/
├── src/                                    # Motor da ferramenta (independente de jogo)
│   ├── index.html                          # Versão de desenvolvimento
│   ├── themes.css                          # 10 temas visuais (QuillTree, Ink B&W, Crimson Crime, etc.)
│   ├── styles.css                          # Layout utilitário e animações
│   ├── presets.js                          # Presets compilados do TuringTest
│   └── editor.js                           # Aplicação Multi-Jogo + Módulos Customizáveis
├── vendor/                                 # Dependências offline (Tailwind, React, ReactDOM, VT323)
├── dist/                                   # Artefatos HTML únicos autocontidos (abrem 100% offline)
│   ├── DialogueTools.html                  # App principal completo
│   └── Turing_Test_Editor_Master_D1-D6.html# Atalho sincronizado p/ compatibilidade direta
├── games/                                  # Dados isolados de cada jogo (nunca se misturam!)
│   ├── turing_test/                        # Arquivos exclusivos do jogo TuringTest
│   │   ├── json/                           # arthur.json, maria.json, ana_lucia.json (v7)
│   │   ├── txt/                            # 24 arquivos .txt gerados p/ o motor em C
│   │   ├── legacy/                         # Arquivos originais históricos antes da migração
│   │   ├── reference_c/                    # Espaço p/ .c/.h de referência do TuringTest
│   │   └── docs/                           # Especificação .txt e relatório de pipeline
│   └── _exemplos/                          # Guia p/ criar subpastas p/ novos jogos
└── scripts/
    ├── migrate_turing.py                   # Atualiza games/turing_test/{json,txt} e src/presets.js
    ├── build.py                            # Compila dist/DialogueTools.html
    └── serve.py                            # Servidor HTTP local (porta 8080 por padrão)
```

## Temas Visuais Inclusos
1. 🖥️ **Terminal RASEC (CRT)** · Fósforo verde clássico
2. 🪶 **QuillTree (Manuscrito)** · Pergaminho, tinta sépia e tipografia literária
3. ✒️ **Ink B&W (Nanquim P&B)** · Alto contraste estilo quadrinho / graphic novel
4. 🩸 **Crimson Crime (Noir)** · Mural investigativo noturno em paleta vermelha
5. 🌆 **Synthwave (Outrun)** · Horizonte neon anos 80 (magenta, violeta e ciano)
6. ⚡ **Cyberpunk (Night City)** · Asfalto escuro, amarelo ácido e implantes ciano
7. 🌫️ **Eerie Atmosphere** · Névoa fria e terror psicológico
8. 🐉 **Dungeon Crawler** · Pedra de masmorra, bronze e luz de tocha
9. 🚀 **Shoot & Dash (Arcade)** · Azul elétrico, laranja turbo e ação rápida
10. 🍵 **Cozy Matcha (Lo-Fi)** · Paleta calma p/ sessões longas de escrita

## Como Usar

- **Offline (dois cliques):** abra `dist/DialogueTools.html` direto no navegador.
- **Servidor local:**
  ```bash
  python3 scripts/serve.py 8080
  ```
- **Recompilar após editar `src/`:**
  ```bash
  python3 scripts/build.py
  ```
