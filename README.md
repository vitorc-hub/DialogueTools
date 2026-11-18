# DialogueTools

Ferramenta visual (fluxograma em árvore) para criação, validação e exportação de diálogos do jogo **TuringTest** (D1–D6, Viés e Injeção).

## Estrutura do Projeto

```text
DialogueTools/
├── src/                        # Código-fonte desacoplado do editor
│   ├── index.html              # Versão de desenvolvimento (usa vendor/ e src/)
│   ├── editor.js               # Lógica e interface React do Editor Master
│   └── styles.css              # Tema visual CRT / 8-bit
├── vendor/                     # Dependências offline renomeadas
│   ├── tailwind-3.4.17.min.js
│   ├── react.production.min.js
│   ├── react-dom.production.min.js
│   └── vt323.css
├── dist/                       # Artefato compilado (HTML único autocontido offline)
│   └── Turing_Test_Editor_Master_D1-D6.html
├── data/                       # Arquivos de diálogos dos suspeitos
│   ├── json/                   # JSONs dos NPCs (Arthur, Maria, Ana Lúcia)
│   └── txt/                    # TXTs de diálogo (atuais e exportados p/ C)
├── reference/                  # Código de referência do jogo (se necessário)
│   └── c/                      # Headers/sources (.h/.c) do TuringTest
├── docs/                       # Documentação e relatórios
│   └── relatorio_bugs_pipeline.txt
└── scripts/                    # Automação e utilitários
    └── build.py                # Empacota src/ + vendor/ em dist/
```

## Como compilar o HTML único

```bash
python3 scripts/build.py
```

O artefato autocontido será gerado em `dist/Turing_Test_Editor_Master_D1-D6.html`.
