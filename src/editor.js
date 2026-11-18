const h = React.createElement;
const { useState, useRef, useLayoutEffect, useEffect } = React;

/* ==========================================================================
   ARMAZENAMENTO ISOLADO POR JOGO (NUNCA MISTURA PROJETOS)
   ========================================================================== */
const K_INDEX = "dtools-games-index-v2";
const K_GAME_PREFIX = "dtools-game-v2:";
const K_GOOD_PREFIX = "dtools-game-good-v2:";
const TURING_OFFICIAL_ID = "turing_test_oficial";

const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) {} };

/* ==========================================================================
   TEMAS VISUAIS INSPIRADORES
   ========================================================================== */
const THEMES = [
  { id: "turing_crt", label: "🖥️ Terminal RASEC (CRT)", desc: "Fósforo verde sobre preto, scanlines e estética retro-terminal." },
  { id: "quill_tree", label: "🪶 QuillTree (Manuscrito)", desc: "Pergaminho aquecido, tinta sépia e tipografia literária." },
  { id: "ink_bw", label: "✒️ Ink B&W (Nanquim P&B)", desc: "Alto contraste monocromático estilo quadrinho / graphic novel." },
  { id: "crimson_crime", label: "🩸 Crimson Crime (Noir)", desc: "Mural investigativo noturno com fios vermelhos e clima noir." },
  { id: "synthwave", label: "🌆 Synthwave (Outrun)", desc: "Horizonte neon anos 80 em magenta, violeta e ciano." },
  { id: "cyberpunk", label: "⚡ Cyberpunk (Night City)", desc: "Asfalto escuro, amarelo ácido e implantes ciano." },
  { id: "eerie", label: "🌫️ Eerie Atmosphere", desc: "Névoa fria, verde-espectro e tensão de terror psicológico." },
  { id: "dungeon", label: "🐉 Dungeon Crawler", desc: "Pedra de masmorra, bronze forjado e luz de tocha." },
  { id: "shoot_dash", label: "🚀 Shoot & Dash (Arcade)", desc: "Azul elétrico, laranja turbo e adrenalina de fliperama." },
  { id: "cozy_grove", label: "🍵 Cozy Matcha (Lo-Fi)", desc: "Paleta suave de chá-verde e pêssego para escritas longas." }
];
const THEME_IDS = THEMES.map(t => t.id);

/* ==========================================================================
   HELPERS GERAIS E CORES DE ESTADOS
   ========================================================================== */
const S = v => (typeof v === "string" ? v : v == null ? "" : String(v));
const A = v => (Array.isArray(v) ? v : []);
const oneOf = (v, l, d) => (l.includes(v) ? v : d);
const clone = o => JSON.parse(JSON.stringify(o));

const slug = t => S(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const stateKey = t => S(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "Estado";
const uid = prefix => (prefix || "jogo") + "_" + Math.random().toString(36).slice(2, 7);

const TONE_MAP = {
  g: { label: "Verde / Positivo", t: "text-emerald-400", b: "border-emerald-400", bg: "bg-emerald-950/40" },
  a: { label: "Âmbar / Neutro", t: "text-amber-400", b: "border-amber-400", bg: "bg-amber-950/40" },
  r: { label: "Vermelho / Tensão", t: "text-rose-500", b: "border-rose-500", bg: "bg-rose-950/40" },
  c: { label: "Ciano / Pista", t: "text-cyan-400", b: "border-cyan-400", bg: "bg-cyan-950/40" },
  p: { label: "Roxo / Especial", t: "text-purple-400", b: "border-purple-400", bg: "bg-zinc-900" }
};
const TONE_KEYS = Object.keys(TONE_MAP);

const LET = ["A", "B", "C", "D", "E", "F", "G", "H"];
const VERD = ["Humano", "Sintético", "Inconclusivo"];

const extractSpeech = raw => {
  const s = S(raw).replace(/\/Nome\//gi, "[nome]").trim();
  const m = s.match(/'([^']+)'/);
  if (m) return m[1].trim();
  return s.replace(/^['"“”]+|['"“”]+$/g, "").trim();
};

const isPlaceholderFala = raw => {
  const s = S(raw).trim().toLowerCase();
  return !s || s.startsWith("ler o apoio") || s.startsWith("ler apoio") || s.startsWith("(a fala de entrada");
};

/* ==========================================================================
   TEMPLATES DE JOGO (TURINGTEST + JOGO LIVRE + RPG + NOIR)
   ========================================================================== */
function makeTuringConfig(themeOverride) {
  return {
    template: "turing_test",
    theme: themeOverride || "turing_crt",
    modulos: {
      inventario: true,
      metrica_global: true,
      aberturas_dinamicas: true,
      matriz_transicao: true,
      veredito: true,
      experimental: true,
      export_turing_txt: true
    },
    termos: {
      npc_singular: "Suspeito",
      npc_plural: "Suspeitos",
      item_a: "Objeto",
      item_a_prefix: "EV",
      item_b: "Informação",
      item_b_prefix: "INF",
      metrica_nome: "Autodesconfiança Global",
      metrica_icone: "👁"
    },
    estados_folha: [
      { nome: "Confiança", cor: "g" },
      { nome: "Dúvida", cor: "a" },
      { nome: "Pressão", cor: "r" }
    ],
    cenas: [
      { id: "D1", rotulo: "S1·D1", grupo: "S1", aberturas: false, matriz: true, veredito: false },
      { id: "D2", rotulo: "S1·D2", grupo: "S1", aberturas: true, matriz: true, veredito: false },
      { id: "D3", rotulo: "S1·D3", grupo: "S1", aberturas: true, matriz: false, veredito: true },
      { id: "D4", rotulo: "S2·D4", grupo: "S2", aberturas: true, matriz: true, veredito: false },
      { id: "D5", rotulo: "S2·D5", grupo: "S2", aberturas: true, matriz: true, veredito: false },
      { id: "D6", rotulo: "S2·D6", grupo: "S2", aberturas: true, matriz: false, veredito: true }
    ],
    arvores_extras: [
      { id: "VIES", rotulo: "🧪 VIÉS", cor: "p", sub: "Árvore única · Custo: 3 tokens · Jogador escolhe na Raiz ➔ ramo alternativo até Folha (visão prioritária)" },
      { id: "INJECAO", rotulo: "⚡ INJEÇÃO", cor: "c", sub: "Árvore única · Custo: 4 tokens · Jogador escolhe na Raiz ➔ ramo alternativo até Folha (visão prioritária)" }
    ]
  };
}

function makeTemplateConfig(tpl, themeOverride) {
  if (tpl === "turing_test") return makeTuringConfig(themeOverride);
  if (tpl === "rpg") {
    return {
      template: "rpg",
      theme: themeOverride || "dungeon",
      modulos: {
        inventario: true,
        metrica_global: true,
        aberturas_dinamicas: false,
        matriz_transicao: false,
        veredito: false,
        experimental: false,
        export_turing_txt: false
      },
      termos: {
        npc_singular: "NPC",
        npc_plural: "NPCs",
        item_a: "Item / Chave",
        item_a_prefix: "ITEM",
        item_b: "Pista / Lore",
        item_b_prefix: "LORE",
        metrica_nome: "Reputação / Karma",
        metrica_icone: "⚜"
      },
      estados_folha: [
        { nome: "Aliado", cor: "g" },
        { nome: "Neutro", cor: "a" },
        { nome: "Hostil", cor: "r" },
        { nome: "Missão Aceita", cor: "c" }
      ],
      cenas: [
        { id: "ENC_1", rotulo: "1º Encontro", grupo: "Ato 1", aberturas: false, matriz: false, veredito: false },
        { id: "QUEST", rotulo: "Missão", grupo: "Ato 1", aberturas: false, matriz: false, veredito: false },
        { id: "EPILOGO", rotulo: "Desfecho", grupo: "Ato 2", aberturas: true, matriz: false, veredito: false }
      ],
      arvores_extras: [
        { id: "LOJA", rotulo: "🪙 MERCADOR", cor: "p", sub: "Diálogos opcionais de troca / rumores" }
      ]
    };
  }
  if (tpl === "crime") {
    return {
      template: "crime",
      theme: themeOverride || "crimson_crime",
      modulos: {
        inventario: true,
        metrica_global: true,
        aberturas_dinamicas: true,
        matriz_transicao: true,
        veredito: true,
        experimental: false,
        export_turing_txt: false
      },
      termos: {
        npc_singular: "Testemunha",
        npc_plural: "Testemunhas",
        item_a: "Prova Física",
        item_a_prefix: "PROVA",
        item_b: "Depoimento",
        item_b_prefix: "DEP",
        metrica_nome: "Tensão do Caso",
        metrica_icone: "🩸"
      },
      estados_folha: [
        { nome: "Cooperativo", cor: "g" },
        { nome: "Evasivo", cor: "a" },
        { nome: "Defensivo", cor: "r" }
      ],
      cenas: [
        { id: "ATO_1", rotulo: "Abordagem", grupo: "Caso", aberturas: false, matriz: true, veredito: false },
        { id: "ATO_2", rotulo: "Acareação", grupo: "Caso", aberturas: true, matriz: false, veredito: true }
      ],
      arvores_extras: []
    };
  }
  // Default: Jogo Livre / Narrativo Geral
  return {
    template: "livre",
    theme: themeOverride || "quill_tree",
    modulos: {
      inventario: true,
      metrica_global: false,
      aberturas_dinamicas: false,
      matriz_transicao: false,
      veredito: false,
      experimental: false,
      export_turing_txt: false
    },
    termos: {
      npc_singular: "Personagem",
      npc_plural: "Personagens",
      item_a: "Item",
      item_a_prefix: "IT",
      item_b: "Flag / Info",
      item_b_prefix: "FLAG",
      metrica_nome: "Variável Global",
      metrica_icone: "★"
    },
    estados_folha: [
      { nome: "Positivo", cor: "g" },
      { nome: "Neutro", cor: "a" },
      { nome: "Negativo", cor: "r" }
    ],
    cenas: [
      { id: "CENA_1", rotulo: "Cena 1", grupo: "", aberturas: false, matriz: false, veredito: false },
      { id: "CENA_2", rotulo: "Cena 2", grupo: "", aberturas: false, matriz: false, veredito: false }
    ],
    arvores_extras: []
  };
}

function normalizeConfig(rawCfg, isTuringHint) {
  const base = isTuringHint || rawCfg?.template === "turing_test" ? makeTuringConfig() : makeTemplateConfig(rawCfg?.template || "livre");
  if (!rawCfg || typeof rawCfg !== "object") return base;

  const estados = A(rawCfg.estados_folha)
    .filter(x => x && S(x.nome).trim())
    .map(x => ({ nome: S(x.nome).trim(), cor: oneOf(x.cor, TONE_KEYS, "a") }));

  const cenas = A(rawCfg.cenas)
    .filter(x => x && S(x.id).trim())
    .map(x => ({
      id: S(x.id).trim(),
      rotulo: S(x.rotulo).trim() || S(x.id).trim(),
      grupo: S(x.grupo).trim(),
      aberturas: !!x.aberturas,
      matriz: !!x.matriz,
      veredito: !!x.veredito
    }));

  const extras = A(rawCfg.arvores_extras !== undefined ? rawCfg.arvores_extras : base.arvores_extras)
    .filter(x => x && S(x.id).trim())
    .map(x => ({
      id: S(x.id).trim().toUpperCase(),
      rotulo: S(x.rotulo).trim() || S(x.id).trim(),
      cor: oneOf(x.cor, TONE_KEYS, "p"),
      sub: S(x.sub)
    }));

  return {
    template: S(rawCfg.template) || base.template,
    theme: oneOf(rawCfg.theme, THEME_IDS, base.theme),
    modulos: {
      inventario: rawCfg.modulos?.inventario !== undefined ? !!rawCfg.modulos.inventario : base.modulos.inventario,
      metrica_global: rawCfg.modulos?.metrica_global !== undefined ? !!rawCfg.modulos.metrica_global : base.modulos.metrica_global,
      aberturas_dinamicas: rawCfg.modulos?.aberturas_dinamicas !== undefined ? !!rawCfg.modulos.aberturas_dinamicas : base.modulos.aberturas_dinamicas,
      matriz_transicao: rawCfg.modulos?.matriz_transicao !== undefined ? !!rawCfg.modulos.matriz_transicao : base.modulos.matriz_transicao,
      veredito: rawCfg.modulos?.veredito !== undefined ? !!rawCfg.modulos.veredito : base.modulos.veredito,
      experimental: rawCfg.modulos?.experimental !== undefined ? !!rawCfg.modulos.experimental : base.modulos.experimental,
      export_turing_txt: rawCfg.modulos?.export_turing_txt !== undefined ? !!rawCfg.modulos.export_turing_txt : base.modulos.export_turing_txt
    },
    termos: { ...base.termos, ...(rawCfg.termos || {}) },
    estados_folha: estados.length ? estados : base.estados_folha,
    cenas: cenas.length ? cenas : base.cenas,
    arvores_extras: extras
  };
}

/* ==========================================================================
   NORMALIZAÇÃO DE NÓS, ÁRVORES E NPCS
   ========================================================================== */
const OP = (texto, proximo_no, efeito) => ({ texto: S(texto), proximo_no: S(proximo_no), efeito: S(efeito) });
const N = (id, rotulo, fala, opcoes, extra) => ({
  id: S(id),
  rotulo: S(rotulo),
  fala_npc: S(fala),
  folha: null,
  opcoes: opcoes || [],
  desbloqueios: [],
  confronto_evidencia: null,
  evidencia_desbloqueada: "",
  trava_rota_secreta: "",
  desconfianca: 0,
  ...(extra || {})
});
const L = (id, fala, visao, extra) => ({
  id: S(id),
  rotulo: "Final",
  fala_npc: S(fala),
  folha: { visao_jogador: S(visao) || "Neutro" },
  opcoes: [],
  desbloqueios: [],
  confronto_evidencia: null,
  evidencia_desbloqueada: "",
  trava_rota_secreta: "",
  desconfianca: 0,
  ...(extra || {})
});

function stateTone(cfg, visaoNome) {
  const found = A(cfg?.estados_folha).find(e => e.nome === visaoNome);
  return TONE_MAP[found?.cor || "a"] || TONE_MAP.a;
}

function defaultLeafName(cfg) {
  const est = A(cfg?.estados_folha);
  if (est.some(e => e.nome === "Dúvida")) return "Dúvida";
  if (est.some(e => e.nome === "Neutro")) return "Neutro";
  return est[0]?.nome || "Final";
}

function matrixKeysFor(cfg) {
  const base = A(cfg.estados_folha).map(e => e.nome);
  if (cfg.template === "turing_test" || cfg.modulos.experimental) {
    if (cfg.arvores_extras.some(x => x.id === "INJECAO") && !base.includes("Injeção usada")) base.push("Injeção usada");
    if (cfg.arvores_extras.some(x => x.id === "VIES") && !base.includes("Viés usado")) base.push("Viés usado");
  }
  return base;
}
const isExpMatrixKey = k => k === "Injeção usada" || k === "Viés usado";

function normTree(list, fb, isScene, hasAberturas, cfg) {
  const src = A(list).filter(n => n && typeof n === "object");
  const base = src.length ? src : A(fb);
  const rootNewId = isScene ? "Entrada" : "Raiz";
  const oldRootId = base[0] ? S(base[0].id).trim() : rootNewId;
  const mapId = nid => {
    if (!nid) return "";
    if (nid === oldRootId || (isScene && (nid === "Oi" || nid === "start"))) return rootNewId;
    return nid;
  };

  const validStates = A(cfg.estados_folha).map(e => e.nome);
  const defState = defaultLeafName(cfg);
  const used = new Set();

  const nos = base.map((n, i) => {
    let id = i === 0 ? rootNewId : S(n?.id).trim();
    if (!id || used.has(id)) {
      let k = i + 1;
      id = "no-" + k;
      while (used.has(id)) { k += 1; id = "no-" + k; }
    }
    used.add(id);

    const rawVis = S(n?.folha?.visao_jogador).trim();
    const folha = n?.folha && typeof n.folha === "object"
      ? { visao_jogador: rawVis && validStates.includes(rawVis) ? rawVis : (rawVis || defState) }
      : null;

    const fala = S(n?.fala_npc);
    const ev = S(n?.confronto_evidencia?.evidencia_id) || S(n?.confronto?.requer) || S(n?.ev);
    const perg = S(n?.confronto_evidencia?.pergunta_jogador ?? n?.confronto?.pergunta_jogador);

    const rawDesb = A(n?.desbloqueios ?? n?.confrontos);
    const desbloqueios = folha
      ? []
      : rawDesb
          .filter(x => x && S(x.ev || x.requer))
          .map(x => ({ ev: S(x.ev || x.requer).trim(), no: mapId(S(x.no).trim()) }));

    const out = {
      id,
      rotulo: S(n?.rotulo),
      fala_npc: fala,
      folha,
      opcoes: folha ? [] : A(n?.opcoes).slice(0, 8).map(o => ({
        texto: S(o?.texto),
        proximo_no: mapId(S(o?.proximo_no).trim()),
        efeito: S(o?.efeito)
      })),
      desbloqueios,
      confronto_evidencia: ev ? { evidencia_id: ev.trim(), pergunta_jogador: perg, resposta_npc: fala } : null,
      evidencia_desbloqueada: S(n?.evidencia_desbloqueada || n?.ganha_evidencia || n?.ganha_informacao).trim(),
      trava_rota_secreta: S(n?.trava_rota_secreta).trim(),
      desconfianca: Math.max(0, Math.floor(+n?.desconfianca || 0))
    };

    if (isScene && hasAberturas && i === 0) {
      const abIn = n?.aberturas && typeof n.aberturas === "object" ? n.aberturas : {};
      const abOut = {};
      A(cfg.estados_folha).forEach(est => {
        const sk = stateKey(est.nome);
        abOut[sk] = S(abIn[sk] ?? abIn[est.nome]);
      });
      const defSk = stateKey(defState);
      if (!abOut[defSk] && !isPlaceholderFala(fala)) abOut[defSk] = fala;
      out.aberturas = abOut;
      if (abOut[defSk]) out.fala_npc = abOut[defSk];
    }
    return out;
  });

  const ids = new Set(nos.map(n => n.id));
  nos.forEach(n => { n.desbloqueios = n.desbloqueios.filter(x => ids.has(x.no)); });
  return { nos };
}

const fxLegacyTree = (list, rotulo, fala, defState) => {
  const arr = A(list).filter(x => x && typeof x === "object");
  return [
    N("Raiz", rotulo, fala, arr.map(x => OP(S(x.gatilho), S(x.id), S(x.consequencia)))),
    ...arr.map(x => L(S(x.id), S(x.resposta), defState))
  ];
};

function normalizeNpc(d, cfg) {
  const mig = (d?.versao || 0) < 7 && !d?.cenas;
  const seen = new Set();
  const evs = [];
  [...A(d?.evidencias), ...A(d?.informacoes).map(e => ({ ...e, tipo: "informacao" }))].forEach(e => {
    const id = S(e?.id).trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      evs.push({
        id,
        nome: S(e?.nome),
        local: S(e?.local),
        tipo: oneOf(e?.tipo, ["evidencia", "informacao"], mig && /^(S\d+ ?D\d|\s*$)/.test(S(e?.local)) ? "informacao" : "evidencia")
      });
    }
  });

  const flatScenes = { ...(d?.dias || {}), ...(d?.cenas || {}) };
  A(d?.semanas).forEach(sm =>
    A(sm?.dias).forEach(x => {
      if (x && x.id) flatScenes[x.id] = { arvores: { principal: x.arvore || x.arvores?.principal }, matriz: x.matriz, veredito: x.veredito };
    })
  );

  const defState = defaultLeafName(cfg);
  const mKeys = matrixKeysFor(cfg);
  const cenasOut = {};

  cfg.cenas.forEach((sc, idx) => {
    const rawSc = flatScenes[sc.id];
    const prevSc = idx > 0 ? cfg.cenas[idx - 1] : null;
    const prevMz = prevSc && prevSc.matriz ? (cenasOut[prevSc.id]?.matriz ?? flatScenes[prevSc.id]?.matriz) : null;
    const rawNos = rawSc?.arvores?.principal?.nos ?? rawSc?.arvore?.nos ?? rawSc?.nos;
    const hasAb = !!(cfg.modulos.aberturas_dinamicas && sc.aberturas);
    const tree = normTree(rawNos, [N("Entrada", "Abertura", "", [])], true, hasAb, cfg);

    if (hasAb && tree.nos[0]) {
      const root = tree.nos[0];
      if (!root.aberturas) root.aberturas = {};
      A(cfg.estados_folha).forEach(est => {
        const sk = stateKey(est.nome);
        if (!root.aberturas[sk] && prevMz) {
          const mFound = A(prevMz).find(x => x?.k === est.nome);
          if (mFound) root.aberturas[sk] = extractSpeech(mFound.efeito);
        }
      });
      const defSk = stateKey(defState);
      if (root.aberturas[defSk]) root.fala_npc = root.aberturas[defSk];
    }

    const matriz = sc.matriz && cfg.modulos.matriz_transicao
      ? mKeys.map(k => {
          const f = A(rawSc?.matriz).find(x => x?.k === k);
          return { k, efeito: f && f.efeito !== undefined ? S(f.efeito) : "" };
        })
      : [];

    const veredito = sc.veredito && cfg.modulos.veredito
      ? {
          verdade: oneOf(rawSc?.veredito?.verdade, ["Humano", "Sintético"], "Humano"),
          opcoes: VERD.map(k => {
            const f = A(rawSc?.veredito?.opcoes).find(x => x?.k === k);
            return { k, consequencia: f && f.consequencia !== undefined ? S(f.consequencia) : "" };
          })
        }
      : null;

    cenasOut[sc.id] = { nos: tree.nos, matriz, veredito };
  });

  const extrasIn = d?.extras || {};
  const d1 = flatScenes.D1;
  const extrasOut = {};
  cfg.arvores_extras.forEach(ex => {
    let src = extrasIn[ex.id]?.nos;
    if (!src && ex.id === "VIES") {
      src = d?.arvore_vies?.nos ?? d1?.arvores?.vies?.nos ?? (Array.isArray(d1?.vieses) ? fxLegacyTree(d1.vieses, "🧪 Enviesamento", "(o jogador provoca o Enviesamento)", defState) : undefined);
    }
    if (!src && ex.id === "INJECAO") {
      src = d?.arvore_injecao?.nos ?? d1?.arvores?.injecao?.nos ?? (Array.isArray(d1?.injecoes) ? fxLegacyTree(d1.injecoes, "⚡ Injeção", "(o jogador aciona a Injeção)", defState) : undefined);
    }
    extrasOut[ex.id] = normTree(src, [N("Raiz", ex.rotulo, "(o jogador aciona " + ex.rotulo + ")", [])], false, false, cfg);
  });

  const nome = S(d?.npc?.nome).trim() || (cfg.termos.npc_singular + " 1");
  const falante = S(d?.npc?.falante).trim() || nome.split(" ")[0];
  const npcId = S(d?.npc?.id).trim() || slug(falante) || "npc_1";
  const allValidAbas = [...cfg.cenas.map(c => c.id), ...cfg.arvores_extras.map(e => e.id)];

  const out = {
    versao: 7,
    npc: { nome, tipo: S(d?.npc?.tipo), id: npcId, falante },
    aba: oneOf(d?.aba ?? d?.dia_ativo, allValidAbas, cfg.cenas[0]?.id || "D1"),
    evidencias: evs,
    cenas: cenasOut,
    extras: extrasOut
  };

  if (mig) {
    const dz = new Set(out.evidencias.filter(e => /desconfian/i.test(e.nome)).map(e => e.id));
    if (dz.size) {
      out.evidencias = out.evidencias.filter(e => !dz.has(e.id));
      allTreesOfNpc(out, cfg).forEach(([, nos]) =>
        nos.forEach(n => {
          if (dz.has(n.evidencia_desbloqueada)) {
            n.evidencia_desbloqueada = "";
            n.desconfianca = Math.max(1, n.desconfianca);
          }
          n.desbloqueios = n.desbloqueios.filter(x => !dz.has(x.ev));
          if (n.confronto_evidencia && dz.has(n.confronto_evidencia.evidencia_id)) n.confronto_evidencia = null;
        })
      );
    }
  }
  return out;
}

function blankNpcForConfig(cfg, num) {
  const idx = num || 1;
  const sing = cfg.termos.npc_singular || "Personagem";
  return normalizeNpc({
    versao: 7,
    npc: {
      id: slug(sing) + "_" + idx,
      nome: "Novo " + sing + " " + idx,
      falante: sing + " " + idx,
      tipo: cfg.template === "turing_test" ? "Humano" : ""
    }
  }, cfg);
}

function allTreesOfNpc(npc, cfg) {
  return [
    ...cfg.cenas.map(c => [c.id, npc.cenas?.[c.id]?.nos || []]),
    ...cfg.arvores_extras.map(e => [e.id, npc.extras?.[e.id]?.nos || []])
  ];
}

/* ==========================================================================
   CRIAÇÃO E CARREGAMENTO DE PROJETOS DE JOGO
   ========================================================================== */
function buildOfficialTuringGame() {
  const cfg = makeTuringConfig("turing_crt");
  const presets = A(window.TURING_PRESETS);
  const npcs = presets.length ? presets.map(p => normalizeNpc(clone(p), cfg)) : [blankNpcForConfig(cfg, 1)];
  const met = presets[0]?.metricas?.desconfianca || { limite: 3, consequencia: "" };
  return {
    game_id: TURING_OFFICIAL_ID,
    game_nome: "Turing Test (Master Oficial)",
    config: cfg,
    npc_ativo: 0,
    nome_jogador: "Inspetor",
    metricas: {
      desconfianca: {
        limite: Math.max(1, Math.floor(+met.limite || 3)),
        consequencia: S(met.consequencia) || "Ao acumular 3 pontos globais de autodesconfiança, dispara consequência narrativa do protagonista (também sintético)."
      }
    },
    npcs
  };
}

function createNewGame(nome, templateKey, themeKey) {
  const cfg = makeTemplateConfig(templateKey, themeKey);
  const gName = S(nome).trim() || "Novo Jogo";
  const gId = slug(gName) + "_" + Math.random().toString(36).slice(2, 6);
  return {
    game_id: gId,
    game_nome: gName,
    config: cfg,
    npc_ativo: 0,
    nome_jogador: templateKey === "turing_test" ? "Inspetor" : "Jogador",
    metricas: {
      desconfianca: {
        limite: 3,
        consequencia: ""
      }
    },
    npcs: [blankNpcForConfig(cfg, 1)]
  };
}

function normalizeGame(raw) {
  if (!raw || typeof raw !== "object") return buildOfficialTuringGame();
  const meta = raw.dtools_meta || {};
  const isTuringHint = !raw.config && (raw.versao_workspace === 2 || A(raw.npcs).some(n => n?.semanas || n?.arvore_vies));
  const cfg = normalizeConfig(raw.config, isTuringHint);
  const rawNpcs = A(raw.npcs);
  const npcs = rawNpcs.length ? rawNpcs.map(n => normalizeNpc(n, cfg)) : [blankNpcForConfig(cfg, 1)];
  const idx = Math.min(npcs.length - 1, Math.max(0, Math.floor(+raw.npc_ativo || 0)));
  return {
    game_id: S(raw.game_id || meta.game_id).trim() || uid("jogo"),
    game_nome: S(raw.game_nome || meta.game_name).trim() || (isTuringHint ? "Projeto Turing Test" : "Projeto de Diálogos"),
    config: cfg,
    npc_ativo: idx,
    nome_jogador: S(raw.nome_jogador).trim() || "Inspetor",
    metricas: {
      desconfianca: {
        limite: Math.max(1, Math.floor(+raw.metricas?.desconfianca?.limite || 3)),
        consequencia: S(raw.metricas?.desconfianca?.consequencia)
      }
    },
    npcs
  };
}

function loadRegistry() {
  try {
    const raw = lsGet(K_INDEX);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.list) && parsed.list.length) return parsed;
    }
  } catch (e) {}
  return {
    activeId: TURING_OFFICIAL_ID,
    list: [{ id: TURING_OFFICIAL_ID, nome: "Turing Test (Master Oficial)", template: "turing_test", theme: "turing_crt", npcCount: 3, updatedAt: "" }]
  };
}

function saveRegistry(reg) {
  lsSet(K_INDEX, JSON.stringify(reg));
}

function loadGameById(gameId) {
  const tryParse = k => {
    try {
      const raw = lsGet(k);
      return raw ? normalizeGame(JSON.parse(raw)) : null;
    } catch (e) { return null; }
  };
  const loaded = tryParse(K_GAME_PREFIX + gameId) || tryParse(K_GOOD_PREFIX + gameId);
  if (loaded) return loaded;
  if (gameId === TURING_OFFICIAL_ID) {
    // Migra automaticamente do storage anterior caso o usuário já tenha editado algo antes
    const legacyWs = tryParse("turing-master-ws-v2") || tryParse("turing-master-ws-good-v2");
    if (legacyWs) {
      legacyWs.game_id = TURING_OFFICIAL_ID;
      legacyWs.game_nome = "Turing Test (Master Oficial)";
      return legacyWs;
    }
    return buildOfficialTuringGame();
  }
  return null;
}

function bootInitialSystem() {
  const reg = loadRegistry();
  if (!reg.list.some(g => g.id === TURING_OFFICIAL_ID)) {
    reg.list.unshift({ id: TURING_OFFICIAL_ID, nome: "Turing Test (Master Oficial)", template: "turing_test", theme: "turing_crt", npcCount: 3, updatedAt: "" });
  }
  let game = loadGameById(reg.activeId);
  if (!game) {
    reg.activeId = TURING_OFFICIAL_ID;
    game = loadGameById(TURING_OFFICIAL_ID) || buildOfficialTuringGame();
  }
  return { reg, game };
}

/* ==========================================================================
   AUTO-DETECTOR INTELIGENTE DE ARQUIVOS SALVOS ANTERIORMENTE
   ========================================================================== */
function detectImportedFile(parsed) {
  if (!parsed || typeof parsed !== "object") throw new Error("Arquivo JSON vazio ou inválido.");
  const meta = parsed.dtools_meta || {};

  // 1) Árvore única exportada
  if (meta.scope === "single_tree" || (Array.isArray(parsed.nos) && !parsed.npc && !parsed.npcs)) {
    return {
      kind: "single_tree",
      badge: "🌿 ÁRVORE INDIVIDUAL",
      title: (meta.target_label || meta.target_id || "Árvore") + (meta.npc_name ? " · " + meta.npc_name : ""),
      gameId: meta.game_id || "",
      gameName: meta.game_name || "",
      targetId: meta.target_id || "",
      nodeCount: A(parsed.nos).length,
      payload: parsed
    };
  }

  // 2) Pacote de Capítulo / Semana (ex.: Semana 1 D1..D3)
  if (meta.scope === "chapter_pack" || (Array.isArray(parsed.cenas_pack) && !parsed.npcs)) {
    const list = A(parsed.cenas_pack || parsed.dias);
    return {
      kind: "chapter_pack",
      badge: "📅 PACOTE DE SEMANA / CAPÍTULOS",
      title: (meta.group_id || "Pacote") + " (" + list.map(x => x.id).join(", ") + ")" + (meta.npc_name ? " · " + meta.npc_name : ""),
      gameId: meta.game_id || "",
      gameName: meta.game_name || "",
      npcId: meta.npc_id || "",
      sceneIds: list.map(x => x.id),
      payload: parsed
    };
  }

  // 3) Jogo Completo
  if (meta.scope === "game" || Array.isArray(parsed.npcs)) {
    const isTuring = !parsed.config && (parsed.versao_workspace === 2 || A(parsed.npcs).some(n => n?.semanas));
    const gName = S(parsed.game_nome || meta.game_name || (isTuring ? "Projeto Turing Test" : "Jogo Importado"));
    const gId = S(parsed.game_id || meta.game_id || (isTuring ? TURING_OFFICIAL_ID : slug(gName)));
    return {
      kind: "game",
      badge: "🎮 PROJETO DE JOGO COMPLETO",
      title: gName + " (" + A(parsed.npcs).length + " personagens)",
      gameId: gId,
      gameName: gName,
      template: parsed.config?.template || meta.template || (isTuring ? "turing_test" : "livre"),
      npcCount: A(parsed.npcs).length,
      payload: parsed
    };
  }

  // 4) NPC / Personagem completo (TuringTest v4/v5/v6/v7 ou Jogo Geral)
  if (meta.scope === "npc" || (parsed.npc && (parsed.semanas || parsed.dias || parsed.cenas))) {
    const isTuringNpc = !!(parsed.semanas || parsed.arvore_vies || parsed.arvore_injecao || (parsed.dias?.D1 && !parsed.cenas));
    const npcName = S(parsed.npc?.nome || "Personagem");
    return {
      kind: "npc",
      badge: "👤 PERSONAGEM / SUSPEITO COMPLETO",
      title: npcName + (isTuringNpc ? " · Formato TuringTest" : " · Formato Jogo Geral"),
      isTuringNpc,
      gameId: meta.game_id || (isTuringNpc ? TURING_OFFICIAL_ID : ""),
      gameName: meta.game_name || (isTuringNpc ? "Turing Test" : ""),
      npcName,
      npcId: S(parsed.npc?.id) || slug(npcName.split(" ")[0]),
      payload: parsed
    };
  }

  throw new Error("Estrutura JSON não reconhecida como Jogo, NPC, Semana ou Árvore do DialogueTools.");
}

/* ==========================================================================
   EXPORTADORES (JOGO, NPC, SEMANA, ÁRVORE, ENGINE RUNTIME, TXT C, ROTEIRO)
   ========================================================================== */
function makeMeta(game, scope, extra) {
  return {
    app: "DialogueTools",
    format_version: 2,
    scope,
    game_id: game.game_id,
    game_name: game.game_nome,
    template: game.config.template,
    exported_at: new Date().toISOString(),
    ...(extra || {})
  };
}

function serializeNode(n, evs, keepAberturas) {
  const isInf = id => A(evs).some(e => e.id === id && e.tipo === "informacao");
  const { desbloqueios, confronto_evidencia: c, evidencia_desbloqueada: g, aberturas, ...r } = n;
  const o = { ...r, confrontos: A(desbloqueios).map(x => ({ requer: x.ev, no: x.no })) };
  if (keepAberturas && aberturas) o.aberturas = clone(aberturas);
  if (c) o.confronto = { requer: c.evidencia_id, pergunta_jogador: c.pergunta_jogador, resposta_npc: o.fala_npc };
  if (g) o[isInf(g) ? "ganha_informacao" : "ganha_evidencia"] = g;
  return o;
}

function toExportNpc(npc, game) {
  const cfg = game.config;
  const ev = A(npc.evidencias);
  const mk = e => ({ id: e.id, nome: e.nome, local: e.local });

  const cenasObj = {};
  cfg.cenas.forEach(sc => {
    const cData = npc.cenas?.[sc.id] || { nos: [], matriz: [], veredito: null };
    const hasAb = !!(cfg.modulos.aberturas_dinamicas && sc.aberturas);
    cenasObj[sc.id] = {
      id: sc.id,
      rotulo: sc.rotulo,
      grupo: sc.grupo,
      arvore: { nos: A(cData.nos).map((n, idx) => serializeNode(n, ev, hasAb && idx === 0)) },
      matriz: cData.matriz || [],
      veredito: cData.veredito || null
    };
  });

  const extrasObj = {};
  cfg.arvores_extras.forEach(ex => {
    extrasObj[ex.id] = {
      nos: A(npc.extras?.[ex.id]?.nos).map(n => serializeNode(n, ev, false))
    };
  });

  const baseOut = {
    dtools_meta: makeMeta(game, "npc", { npc_id: npc.npc.id, npc_name: npc.npc.nome }),
    versao: 7,
    npc: npc.npc,
    aba: npc.aba,
    metricas: game.metricas,
    evidencias: ev.filter(e => e.tipo !== "informacao").map(mk),
    informacoes: ev.filter(e => e.tipo === "informacao").map(mk)
  };

  // Preserva 100% do schema oficial v7 do TuringTest quando aplicável
  if (cfg.template === "turing_test") {
    const groups = [];
    cfg.cenas.forEach(sc => {
      const g = sc.grupo || "S1";
      let bucket = groups.find(x => x.id === g);
      if (!bucket) { bucket = { id: g, dias: [] }; groups.push(bucket); }
      const c = cenasObj[sc.id];
      bucket.dias.push({ id: sc.id, arvore: c.arvore, matriz: c.matriz, veredito: c.veredito });
    });
    baseOut.semanas = groups;
    if (extrasObj.VIES) baseOut.arvore_vies = extrasObj.VIES;
    if (extrasObj.INJECAO) baseOut.arvore_injecao = extrasObj.INJECAO;
    const otherExtras = Object.fromEntries(Object.entries(extrasObj).filter(([k]) => k !== "VIES" && k !== "INJECAO"));
    if (Object.keys(otherExtras).length) baseOut.extras = otherExtras;
    return baseOut;
  }

  baseOut.cenas = cenasObj;
  baseOut.extras = extrasObj;
  return baseOut;
}

function toExportGame(game) {
  return {
    dtools_meta: makeMeta(game, "game"),
    versao_workspace: 2,
    game_id: game.game_id,
    game_nome: game.game_nome,
    config: game.config,
    npc_ativo: game.npc_ativo,
    nome_jogador: game.nome_jogador,
    metricas: game.metricas,
    npcs: game.npcs.map(n => toExportNpc(n, game))
  };
}

function toExportChapterPack(npc, game, groupName) {
  const cfg = game.config;
  const ev = A(npc.evidencias);
  const matching = cfg.cenas.filter(sc => (groupName ? sc.grupo === groupName : true));
  return {
    dtools_meta: makeMeta(game, "chapter_pack", {
      npc_id: npc.npc.id,
      npc_name: npc.npc.nome,
      group_id: groupName || "TODAS_CENAS"
    }),
    cenas_pack: matching.map(sc => {
      const cData = npc.cenas?.[sc.id] || { nos: [], matriz: [], veredito: null };
      const hasAb = !!(cfg.modulos.aberturas_dinamicas && sc.aberturas);
      return {
        id: sc.id,
        rotulo: sc.rotulo,
        grupo: sc.grupo,
        arvore: { nos: A(cData.nos).map((n, idx) => serializeNode(n, ev, hasAb && idx === 0)) },
        matriz: cData.matriz || [],
        veredito: cData.veredito || null
      };
    })
  };
}

function toExportSingleTree(npc, game, abaId) {
  const cfg = game.config;
  const ev = A(npc.evidencias);
  const sc = cfg.cenas.find(c => c.id === abaId);
  const ex = cfg.arvores_extras.find(e => e.id === abaId);
  const nos = sc ? (npc.cenas?.[abaId]?.nos || []) : (npc.extras?.[abaId]?.nos || []);
  const hasAb = !!(sc && cfg.modulos.aberturas_dinamicas && sc.aberturas);
  return {
    dtools_meta: makeMeta(game, "single_tree", {
      npc_id: npc.npc.id,
      npc_name: npc.npc.nome,
      target_id: abaId,
      target_label: sc?.rotulo || ex?.rotulo || abaId
    }),
    nos: A(nos).map((n, idx) => serializeNode(n, ev, hasAb && idx === 0)),
    matriz: sc ? (npc.cenas?.[abaId]?.matriz || []) : [],
    veredito: sc ? (npc.cenas?.[abaId]?.veredito || null) : null
  };
}

function toExportRuntimeEngine(npc, game) {
  const cfg = game.config;
  const fal = npc.npc.falante || npc.npc.nome;
  const mapNos = (nos, hasAb) => {
    const by = {};
    A(nos).forEach(n => { by[n.id] = n; });
    return A(nos).map((n, idx) => ({
      id: n.id,
      speaker: fal,
      text: n.fala_npc,
      ...(hasAb && idx === 0 && n.aberturas ? { openings_by_state: n.aberturas } : {}),
      choices: [
        ...A(n.opcoes).map(o => ({ text: o.texto, next: o.proximo_no, req: null })),
        ...A(n.desbloqueios).map(x => ({
          text: S(by[x.no]?.confronto_evidencia?.pergunta_jogador),
          next: x.no,
          req: x.ev
        }))
      ],
      leaf_state: n.folha ? n.folha.visao_jogador : null,
      grant_item: n.evidencia_desbloqueada || null,
      metric_delta: n.desconfianca || 0
    }));
  };
  const trees = {};
  cfg.cenas.forEach(sc => {
    trees[sc.id] = mapNos(npc.cenas?.[sc.id]?.nos, !!(cfg.modulos.aberturas_dinamicas && sc.aberturas));
  });
  cfg.arvores_extras.forEach(ex => {
    trees[ex.id] = mapNos(npc.extras?.[ex.id]?.nos, false);
  });
  return {
    game_id: game.game_id,
    npc: npc.npc,
    items: npc.evidencias,
    trees
  };
}

function toTuringTxt(npc, cfg, tk) {
  const sc = cfg.cenas.find(c => c.id === tk);
  const isDay = !!sc;
  const numMatch = S(tk).match(/\d+/);
  const num = isDay ? (numMatch ? +numMatch[0] : cfg.cenas.indexOf(sc) + 1) : 0;
  const keyLow = tk.toLowerCase();
  const nos = isDay ? (npc.cenas?.[tk]?.nos || []) : (npc.extras?.[tk.toUpperCase()]?.nos || []);

  const nome = S(npc.npc.nome);
  const fal = S(npc.npc.falante) || nome.split(" ")[0] || "NPC";
  const id = S(npc.npc.id) || slug(fal) || "npc";
  const root = nos[0] ? nos[0].id : "Entrada";
  const rn = x => (x === root ? "Entrada" : x);
  const by = {};
  nos.forEach(n => { by[n.id] = n; });
  const one = t => S(t).replace(/\s*\n\s*/g, " ").replace(/ -> /g, " → ").trim();

  const L = ["NPC: " + id];
  if (isDay) {
    const semMatch = S(sc.grupo).match(/\d+/);
    const semNum = semMatch ? +semMatch[0] : (num > 3 ? 2 : 1);
    L.push("SEMANA: " + semNum);
    L.push("DIA: " + num);
  } else {
    L.push("ARVORE: " + keyLow);
  }
  L.push("");

  nos.forEach((n, idx) => {
    L.push("[NODE: " + rn(n.id) + "]", "SPEAKER: " + fal);
    const ab = isDay && sc.aberturas && cfg.modulos.aberturas_dinamicas && idx === 0 ? n.aberturas : null;
    if (ab && (S(ab.Duvida) || S(ab.Confianca) || S(ab.Pressao))) {
      L.push("TEXT: " + one(ab.Duvida || n.fala_npc));
      if (S(ab.Confianca).trim()) L.push("TEXT_CONFIANCA: " + one(ab.Confianca));
      if (S(ab.Pressao).trim()) L.push("TEXT_PRESSAO: " + one(ab.Pressao));
    } else {
      L.push("TEXT: " + one(n.fala_npc));
    }
    A(n.opcoes).forEach(o => L.push("CHOICE: " + one(o.texto) + " -> " + rn(o.proximo_no)));
    A(n.desbloqueios).forEach(x => {
      L.push(
        "CHOICE: " + one(by[x.no]?.confronto_evidencia?.pergunta_jogador) + " -> " + rn(x.no),
        "REQ: " + x.ev
      );
    });
    if (n.folha) L.push("LEAF: " + n.folha.visao_jogador);
    if (n.evidencia_desbloqueada) {
      const isInf = A(npc.evidencias).some(e => e.id === n.evidencia_desbloqueada && e.tipo === "informacao");
      L.push((isInf ? "GANHA_INF: " : "GANHA_EV: ") + n.evidencia_desbloqueada);
    }
    if (n.desconfianca > 0) L.push("DESCONFIANCA: +" + n.desconfianca);
    L.push("");
  });
  return L.join("\n");
}

function toReadableScript(npc, game, abaId) {
  const cfg = game.config;
  const targets = abaId === "__ALL__"
    ? [...cfg.cenas.map(c => [c.id, c.rotulo, npc.cenas?.[c.id]?.nos || [], c.aberturas]), ...cfg.arvores_extras.map(e => [e.id, e.rotulo, npc.extras?.[e.id]?.nos || [], false])]
    : (() => {
        const sc = cfg.cenas.find(c => c.id === abaId);
        const ex = cfg.arvores_extras.find(e => e.id === abaId);
        return [[abaId, sc?.rotulo || ex?.rotulo || abaId, sc ? (npc.cenas?.[abaId]?.nos || []) : (npc.extras?.[abaId]?.nos || []), !!sc?.aberturas]];
      })();

  const out = [
    "================================================================",
    "JOGO: " + game.game_nome + " | PERSONAGEM: " + npc.npc.nome + " (" + (npc.npc.tipo || "sem subtítulo") + ")",
    "================================================================",
    ""
  ];
  targets.forEach(([id, rot, nos, hasAb]) => {
    out.push("### [" + id + "] " + rot);
    out.push("");
    const by = {};
    A(nos).forEach(n => { by[n.id] = n; });
    A(nos).forEach((n, idx) => {
      const tags = [];
      if (n.folha) tags.push("FIM: " + n.folha.visao_jogador);
      if (n.evidencia_desbloqueada) tags.push("GANHA: " + n.evidencia_desbloqueada);
      if (n.desconfianca > 0) tags.push(cfg.termos.metrica_icone + " +" + n.desconfianca);
      out.push("• (" + n.id + ") " + (n.rotulo ? "[" + n.rotulo + "] " : "") + (tags.length ? "{" + tags.join(" | ") + "}" : ""));
      if (hasAb && cfg.modulos.aberturas_dinamicas && idx === 0 && n.aberturas) {
        cfg.estados_folha.forEach(est => {
          const v = S(n.aberturas[stateKey(est.nome)]);
          if (v) out.push("    " + (npc.npc.falante || npc.npc.nome) + " (" + est.nome + "): \"" + v + "\"");
        });
      } else {
        out.push("    " + (npc.npc.falante || npc.npc.nome) + ": \"" + S(n.fala_npc) + "\"");
      }
      A(n.opcoes).forEach((o, j) => {
        out.push("      [" + (LET[j] || j + 1) + "] Jogador: \"" + o.texto + "\"  --> (" + (o.proximo_no || "?") + ")");
      });
      A(n.desbloqueios).forEach(x => {
        out.push("      [REQ " + x.ev + "] Jogador: \"" + S(by[x.no]?.confronto_evidencia?.pergunta_jogador) + "\"  --> (" + x.no + ")");
      });
      out.push("");
    });
  });
  return out.join("\n");
}

/* ==========================================================================
   VALIDAÇÃO ESTRUTURAL ADAPTADA À CONFIGURAÇÃO DO JOGO
   ========================================================================== */
function isUntouchedBlankScene(sc, idx, nos) {
  if (idx === 0 || nos.length !== 1) return false;
  const r = nos[0];
  const abVals = r.aberturas ? Object.values(r.aberturas) : [];
  const abEmpty = abVals.every(v => !S(v).trim());
  return !S(r.fala_npc).trim() && abEmpty && !A(r.opcoes).length && !A(r.desbloqueios).length;
}

function validarNpc(d, cfg) {
  const warns = [];
  const infos = [];
  const evIds = new Set(A(d.evidencias).map(e => e.id));
  const blankScenes = [];
  const isTuringC = !!cfg.modulos.export_turing_txt;

  const labelOf = aba => {
    const sc = cfg.cenas.find(c => c.id === aba);
    const ex = cfg.arvores_extras.find(e => e.id === aba);
    return sc ? sc.rotulo : (ex ? ex.rotulo : aba);
  };
  const pushW = (aba, nodeId, msg) => warns.push({
    sev: "warn",
    aba,
    nodeId,
    label: labelOf(aba) + (nodeId ? " · " + nodeId : ""),
    msg
  });

  allTreesOfNpc(d, cfg).forEach(([aba, nos]) => {
    const scIdx = cfg.cenas.findIndex(c => c.id === aba);
    const sc = scIdx >= 0 ? cfg.cenas[scIdx] : null;
    const isScene = !!sc;

    if (isScene && isUntouchedBlankScene(sc, scIdx, nos)) {
      blankScenes.push(sc);
      return;
    }

    const ids = new Set(nos.map(n => n.id));
    const P = plan(nos);
    P.roots.slice(1).forEach(r => pushW(aba, r, "nó solto / órfão (nenhuma opção ou confronto aponta para ele)"));

    if (cfg.template === "turing_test" && d.npc?.id === "maria" && aba === "D3" && !ids.has("B.2.1")) {
      pushW("D3", nos[0]?.id || "", "gameplay_scene.c referencia o ID hardcoded 'B.2.1' da Maria no Dia 3");
    }

    nos.forEach((n, idx) => {
      const isRoot = idx === 0;
      const usesAb = isScene && sc.aberturas && cfg.modulos.aberturas_dinamicas && isRoot;

      if (usesAb) {
        const ab = n.aberturas || {};
        cfg.estados_folha.forEach(est => {
          const val = S(ab[stateKey(est.nome)]);
          if (!val.trim()) pushW(aba, n.id, "fala de abertura (" + est.nome + ") vazia");
          if (isTuringC && val.length > 500) pushW(aba, n.id, "abertura (" + est.nome + ") > 500 caracteres");
        });
      } else if (isScene || !isRoot) {
        if (!S(n.fala_npc).trim()) pushW(aba, n.id, "fala vazia");
        if (isTuringC && S(n.fala_npc).length > 500) pushW(aba, n.id, "fala > 500 caracteres (limite do buffer C)");
      }

      if (isTuringC && n.id.length > 31) pushW(aba, n.id, "ID maior que 31 caracteres");

      if (n.confronto_evidencia) {
        const cid = S(n.confronto_evidencia.evidencia_id);
        const perg = S(n.confronto_evidencia.pergunta_jogador);
        if (!perg.trim()) pushW(aba, n.id, "confronto sem fala/pergunta do jogador");
        if (isTuringC && perg.length > 500) pushW(aba, n.id, "pergunta do confronto > 500 caracteres");
        if (cfg.modulos.inventario && cid && !evIds.has(cid)) pushW(aba, n.id, "confronto exige item não cadastrado (" + cid + ")");
      }

      if (cfg.modulos.inventario && n.evidencia_desbloqueada && !evIds.has(n.evidencia_desbloqueada)) {
        pushW(aba, n.id, "recompensa referencia item não cadastrado (" + n.evidencia_desbloqueada + ")");
      }

      n.opcoes.forEach((o, j) => {
        const letra = "opção " + (LET[j] || j + 1);
        if (!o.texto.trim()) pushW(aba, n.id, letra + " sem texto");
        if (isTuringC && o.texto.length > 500) pushW(aba, n.id, letra + " > 500 caracteres");
        if (/^A\s+"/.test(o.texto) && (o.texto.match(/"/g) || []).length === 1) pushW(aba, n.id, letra + " contém prefixo residual 'A \"'");
        if (isTuringC && o.texto.includes(" -> ")) pushW(aba, n.id, letra + " contém ' -> ' (será convertido em ' → ' no TXT)");
        if (!o.proximo_no) pushW(aba, n.id, letra + " sem destino");
        else if (!ids.has(o.proximo_no)) pushW(aba, n.id, letra + " aponta para nó inexistente (" + o.proximo_no + ")");
      });

      if (isTuringC && n.opcoes.length + n.desbloqueios.length > 4) {
        pushW(aba, n.id, "mais de 4 escolhas (" + (n.opcoes.length + n.desbloqueios.length) + "/4 · MAX_CHOICES em C corta o excesso)");
      }
      if (!n.folha && !n.opcoes.length && !n.desbloqueios.length) {
        pushW(aba, n.id, "beco sem saída (sem opções e não marcado como Folha)");
      }

      if (isTuringC) {
        const corpus = [
          usesAb ? Object.values(n.aberturas || {}).join(" ") : n.fala_npc,
          ...n.opcoes.map(o => o.texto),
          n.confronto_evidencia?.pergunta_jogador || ""
        ].join(" ");
        const brk = corpus.match(/\[[A-Za-zÀ-ÿ_]+\]/g) || [];
        [...new Set(brk)].filter(p => p !== "[nome]").forEach(p => pushW(aba, n.id, "placeholder sem definição no C: " + p + " (use [nome])"));
        if (/\/Nome\//i.test(corpus)) pushW(aba, n.id, "placeholder '/Nome/' legado (padronize para [nome])");
      }
    });
  });

  if (blankScenes.length) {
    infos.push({
      sev: "info",
      aba: blankScenes[0].id,
      nodeId: "Entrada",
      label: "CENAS EM BRANCO",
      msg: blankScenes.map(s => s.rotulo).join(", ") + " ainda não preenchida(s)"
    });
  }
  return { warns, infos };
}

/* ==========================================================================
   UI BASE
   ========================================================================== */
const BTN = "px-2 py-0.5 border-2 uppercase tracking-wide cursor-pointer select-none active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed ";
const btnCls = (tone, extra) => BTN + ({
  g: "border-emerald-500 text-emerald-400 bg-zinc-950 hover:bg-emerald-400 hover:text-zinc-950",
  a: "border-amber-500 text-amber-400 bg-zinc-950 hover:bg-amber-400 hover:text-zinc-950",
  c: "border-cyan-500 text-cyan-400 bg-zinc-950 hover:bg-cyan-400 hover:text-zinc-950",
  r: "border-rose-500 text-rose-500 bg-zinc-950 hover:bg-rose-500 hover:text-zinc-950",
  p: "border-purple-500 text-purple-400 bg-zinc-950 hover:bg-purple-400 hover:text-zinc-950",
  z: "border-zinc-600 text-zinc-400 bg-zinc-950 hover:bg-zinc-800"
}[tone] || "") + " " + (extra || "");

function Btn({ tone, onClick, children, disabled, title, extra, on }) {
  return h("button", {
    type: "button",
    title,
    disabled,
    onClick,
    className: btnCls(tone || "g", extra) + (on ? " !bg-emerald-400 !text-zinc-950 font-bold" : "")
  }, children);
}

function ConfirmBtn({ children, onConfirm, tone, ask, extra }) {
  const [a, setA] = useState(false);
  useEffect(() => {
    if (!a) return;
    const t = setTimeout(() => setA(false), 3500);
    return () => clearTimeout(t);
  }, [a]);
  return h(Btn, {
    tone: a ? "r" : tone || "z",
    extra: (a ? "!bg-rose-500 !text-zinc-950 " : "") + (extra || ""),
    onClick: () => { if (a) { setA(false); onConfirm && onConfirm(); } else setA(true); }
  }, a ? (ask || "CONFIRMAR?") : children);
}

function TA({ value, onChange, label, placeholder, tone, warn500 }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = (el.scrollHeight || 0) + 2 + "px";
  });
  const len = S(value).length;
  return h("div", null,
    h("textarea", {
      ref,
      rows: 1,
      value: S(value),
      placeholder,
      "aria-label": label,
      spellCheck: false,
      className: "w-full block bg-zinc-950 border-2 " + (warn500 && len > 500 ? "border-rose-500" : "border-zinc-700") + " p-1 resize-none overflow-hidden focus:border-cyan-400 " + (tone || "text-emerald-300"),
      onChange: e => onChange && onChange(e.target.value)
    }),
    warn500 && len > 420 && h("div", { className: "text-right text-sm " + (len > 500 ? "text-rose-500" : "text-amber-400") }, len + "/500 chars")
  );
}

const Lbl = ({ children, cls }) => h("div", { className: "text-zinc-500 uppercase text-sm mt-2 mb-0.5 " + (cls || "") }, children);
const ExpBadge = ({ text }) => h("span", { className: "inline-block px-1 border border-amber-400 text-amber-400 text-sm uppercase tracking-wide" }, "🧪 " + (text || "EXPERIMENTAL"));
const inpCls = "w-full bg-zinc-950 border-2 border-zinc-700 text-emerald-300 px-1 py-0 focus:border-cyan-400";

function Panel({ title, tone, right, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen !== false);
  const c = { g: "text-emerald-400", a: "text-amber-400", c: "text-cyan-400", p: "text-purple-400", r: "text-rose-400" }[tone || "g"];
  return h("section", { className: "border-2 border-zinc-700 bg-zinc-950 mb-4 dt-card-shadow" },
    h("button", {
      type: "button",
      "aria-expanded": open,
      onClick: () => setOpen(!open),
      className: "w-full flex justify-between items-center gap-3 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-left cursor-pointer"
    },
      h("span", { className: "glow text-xl uppercase " + c }, "▌" + title),
      h("span", { className: "flex gap-2 items-center text-zinc-500" }, right, open ? "[−]" : "[+]")
    ),
    open && h("div", { className: "p-3 border-t-2 border-zinc-700" }, children)
  );
}

/* ==========================================================================
   PAINÉIS DE INVENTÁRIO, MÉTRICA GLOBAL E VALIDAÇÃO
   ========================================================================== */
function Inventario({ data, cfg, updNpc }) {
  const evs = A(data?.evidencias);
  const ids = evs.map(e => e.id);
  const nObj = evs.filter(e => e.tipo !== "informacao").length;
  const nInf = evs.filter(e => e.tipo === "informacao").length;
  const termA = cfg.termos.item_a || "Objeto";
  const termB = cfg.termos.item_b || "Informação";
  const prefA = cfg.termos.item_a_prefix || "EV";
  const prefB = cfg.termos.item_b_prefix || "INF";

  return h(Panel, {
    title: "INVENTÁRIO E CONDIÇÕES (" + termA.toUpperCase() + "S & " + termB.toUpperCase() + "S)",
    tone: "c",
    defaultOpen: false,
    right: h("span", { className: "text-cyan-400" }, nObj + " " + termA.toLowerCase() + " · " + nInf + " " + termB.toLowerCase())
  },
    h("p", { className: "text-zinc-500 text-sm mb-2" }, "Cadastre itens/provas e flags/informações usados para desbloquear escolhas condicionais (REQ) ou concedidos em nós. Renomear um ID atualiza todas as árvores deste personagem."),
    evs.map((e, i) =>
      h("div", { key: i, className: "g5 mb-1" },
        h("input", {
          className: inpCls + (e.id && ids.indexOf(e.id) !== i ? " !border-rose-500" : ""),
          value: e.id,
          placeholder: prefA + "-01",
          onChange: ev => {
            const nv = ev.target.value;
            updNpc(d => {
              const velho = d.evidencias[i]?.id;
              if (!d.evidencias[i]) return;
              d.evidencias[i].id = nv;
              if (velho) {
                allTreesOfNpc(d, cfg).forEach(([, nos]) =>
                  nos.forEach(n => {
                    if (n.confronto_evidencia && n.confronto_evidencia.evidencia_id === velho) n.confronto_evidencia.evidencia_id = nv;
                    if (n.evidencia_desbloqueada === velho) n.evidencia_desbloqueada = nv;
                    n.desbloqueios.forEach(x => { if (x.ev === velho) x.ev = nv; });
                  })
                );
              }
            });
          }
        }),
        h("select", {
          className: inpCls + (e.tipo === "informacao" ? " !text-purple-300" : " !text-cyan-300"),
          value: e.tipo,
          onChange: ev => updNpc(d => { if (d.evidencias[i]) d.evidencias[i].tipo = ev.target.value; })
        },
          h("option", { value: "evidencia" }, "📦 " + termA),
          h("option", { value: "informacao" }, "💬 " + termB)
        ),
        h("input", {
          className: inpCls,
          value: e.nome,
          placeholder: "Nome / descrição",
          onChange: ev => updNpc(d => { if (d.evidencias[i]) d.evidencias[i].nome = ev.target.value; })
        }),
        h("input", {
          className: inpCls,
          value: e.local,
          placeholder: "Origem / anotação",
          onChange: ev => updNpc(d => { if (d.evidencias[i]) d.evidencias[i].local = ev.target.value; })
        }),
        h("button", {
          type: "button",
          className: btnCls("r", "!px-0"),
          onClick: () => updNpc(d => { d.evidencias.splice(i, 1); })
        }, "X")
      )
    ),
    h("div", { className: "mt-2 flex gap-2 flex-wrap" },
      h(Btn, {
        tone: "c",
        onClick: () => updNpc(d => {
          let k = 1;
          const u = new Set(d.evidencias.map(x => x.id));
          while (u.has(prefA + "-" + String(k).padStart(2, "0"))) k += 1;
          d.evidencias.push({ id: prefA + "-" + String(k).padStart(2, "0"), nome: "", local: "", tipo: "evidencia" });
        })
      }, "+ " + termA.toUpperCase()),
      h(Btn, {
        tone: "p",
        onClick: () => updNpc(d => {
          let k = 1;
          const u = new Set(d.evidencias.map(x => x.id));
          while (u.has(prefB + "-" + String(k).padStart(2, "0"))) k += 1;
          d.evidencias.push({ id: prefB + "-" + String(k).padStart(2, "0"), nome: "", local: "", tipo: "informacao" });
        })
      }, "+ " + termB.toUpperCase())
    )
  );
}

function MetricaGlobal({ game, updGame, onJumpNpc }) {
  const cfg = game.config;
  const m = game.metricas.desconfianca;
  const ico = cfg.termos.metrica_icone || "👁";
  const mNome = cfg.termos.metrica_nome || "Métrica Global";

  let totalGlobal = 0;
  const fontes = [];
  game.npcs.forEach((npc, npcIdx) => {
    allTreesOfNpc(npc, cfg).forEach(([aba, nos]) => {
      nos.forEach(n => {
        if (n.desconfianca > 0) {
          totalGlobal += n.desconfianca;
          fontes.push({ npcIdx, npcNome: npc.npc.falante || npc.npc.nome, aba, nodeId: n.id, val: n.desconfianca });
        }
      });
    });
  });

  return h(Panel, {
    title: ico + " MÉTRICA GLOBAL · " + mNome.toUpperCase(),
    tone: "r",
    defaultOpen: false,
    right: h("span", { className: totalGlobal >= m.limite ? "text-emerald-400" : "text-amber-400" }, "Soma no jogo: " + totalGlobal + " / Limite: " + m.limite)
  },
    h("div", { className: "flex gap-2 items-center mb-2" },
      h("span", { className: "text-zinc-400" }, "Limite para consequência:"),
      h("input", {
        type: "number",
        min: 1,
        className: inpCls + " !w-20",
        value: m.limite,
        onChange: e => updGame(g => { g.metricas.desconfianca.limite = Math.max(1, +e.target.value || 3); })
      })
    ),
    h(Lbl, null, "Consequência ao atingir o limite"),
    h(TA, {
      value: m.consequencia,
      label: "Consequência global",
      tone: "text-amber-300",
      placeholder: "Descreva o efeito narrativo ou sistêmico ao atingir o limite…",
      onChange: t => updGame(g => { g.metricas.desconfianca.consequencia = t; })
    }),
    h("div", { className: "mt-2 flex flex-wrap gap-1.5 items-center" },
      h("span", { className: "text-zinc-400 text-sm" }, "Nós que somam " + ico + ":"),
      fontes.length
        ? fontes.map((f, i) =>
            h("button", {
              key: i,
              type: "button",
              onClick: () => onJumpNpc(f.npcIdx, f.aba, f.nodeId),
              className: "px-2 py-0.5 border border-rose-500 bg-rose-950/40 text-rose-300 hover:bg-rose-500 hover:text-zinc-950 text-sm cursor-pointer"
            }, f.npcNome + " · " + f.aba + " · " + f.nodeId + " (+" + f.val + ")")
          )
        : h("span", { className: "text-zinc-500 text-sm" }, "Nenhum nó marcado ainda.")
    )
  );
}

function Validacao({ data, cfg, onJump }) {
  const { warns, infos } = validarNpc(data, cfg);
  return h(Panel, {
    title: "VALIDAÇÃO · " + (warns.length ? warns.length + " AVISOS" : "ZERO AVISOS"),
    tone: warns.length ? "a" : "g",
    defaultOpen: warns.length > 0
  },
    warns.length === 0 && h("div", { className: "text-emerald-400 mb-1" }, "✔ Nenhum problema estrutural encontrado nas árvores preenchidas."),
    warns.slice(0, 100).map((w, i) =>
      h("div", { key: i, className: "flex items-center justify-between gap-2 py-0.5 border-b border-zinc-800/80 hover:bg-zinc-900 px-1" },
        h("span", { className: "text-amber-300" }, "⚠ [" + w.label + "] " + w.msg),
        w.aba && h("button", {
          type: "button",
          onClick: () => onJump(w.aba, w.nodeId),
          className: "shrink-0 px-1.5 py-0 border border-cyan-500 text-cyan-400 hover:bg-cyan-400 hover:text-zinc-950 text-sm uppercase cursor-pointer"
        }, "IR ➔")
      )
    ),
    infos.map((inf, i) =>
      h("div", { key: "i" + i, className: "flex items-center justify-between gap-2 py-0.5 mt-1 text-zinc-400 px-1" },
        h("span", null, "ℹ [" + inf.label + "] " + inf.msg),
        h("button", {
          type: "button",
          onClick: () => onJump(inf.aba, inf.nodeId),
          className: "shrink-0 px-1.5 py-0 border border-zinc-600 text-zinc-400 hover:bg-zinc-800 text-sm uppercase cursor-pointer"
        }, "ABRIR")
      )
    )
  );
}

/* ==========================================================================
   CARTÃO DE NÓ E ÁRVORE VISUAL
   ========================================================================== */
const novoId = (nos, pai) => {
  const base = pai === "Entrada" || pai === "Raiz" ? "A" : pai;
  const u = new Set(A(nos).map(n => n.id));
  if ((pai === "Entrada" || pai === "Raiz") && !u.has("A")) return "A";
  if ((pai === "Entrada" || pai === "Raiz") && !u.has("B")) return "B";
  let k = 1;
  while (u.has(base + "." + k)) k += 1;
  return base + "." + k;
};

const PRESETS_ROTA = [
  ["Confianca_D1_D2", "Confiança acumulada D1+D2"],
  ["Pressao_D1_D2", "Caminho de Pressão (D1+D2)"],
  ["Duvida_D1_D2", "Caminho de Dúvida (D1+D2)"]
];
const rotaNome = k => { const f = PRESETS_ROTA.find(x => x[0] === k); return f ? f[1] : k; };

function NodeCard({ n, nos, evs, cfg, isRoot, aba, npcId, updNode, updDia, selected, onSel, onJumpNode }) {
  const isLeaf = !!n?.folha;
  const sc = cfg.cenas.find(c => c.id === aba);
  const isScene = !!sc;
  const usesAberturas = !!(isScene && sc.aberturas && cfg.modulos.aberturas_dinamicas && isRoot);
  const isToolRoot = !isScene && isRoot;
  const warn500 = !!cfg.modulos.export_turing_txt;

  const v = isLeaf ? n.folha.visao_jogador : null;
  const vTone = isLeaf ? stateTone(cfg, v) : TONE_MAP.a;
  const conf = n?.confronto_evidencia || null;
  const secreta = S(n?.trava_rota_secreta);
  const recompensa = S(n?.evidencia_desbloqueada);
  const outros = nos.filter(x => x.id !== n.id);
  const usados = A(n.desbloqueios).map(x => x.ev);
  const livres = evs.filter(e => e.id && !usados.includes(e.id));

  const [draft, setDraft] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [idDraft, setIdDraft] = useState(n.id);

  const totalChoices = A(n.opcoes).length + A(n.desbloqueios).length;
  const defState = defaultLeafName(cfg);
  const stateNames = A(cfg.estados_folha).map(e => e.nome);
  if (v && !stateNames.includes(v)) stateNames.push(v);

  const destOpts = (val, vazio) => [
    h("option", { key: "_", value: "" }, vazio),
    ...(val && !outros.some(z => z.id === val) ? [h("option", { key: "_x", value: val }, val + " (inexistente!)")] : []),
    ...outros.map(z => h("option", { key: z.id, value: z.id }, "-> " + z.id))
  ];

  const evOpts = (val, vazio) => [
    h("option", { key: "_", value: "" }, vazio),
    ...(val && !evs.some(e => e.id === val) ? [h("option", { key: "_x", value: val }, val + " (não cadastrado!)")] : []),
    ...evs.filter(e => e.id).map(e => h("option", { key: e.id, value: e.id }, (e.tipo === "informacao" ? "💬 " : "📦 ") + e.id + " · " + S(e.nome).slice(0, 24)))
  ];

  const criarFilho = (i, comoFolha) => updDia(d => {
    const pai = d.nos.find(z => z.id === n.id);
    if (!pai || !pai.opcoes[i]) return;
    const id = novoId(d.nos, pai.id);
    d.nos.push(comoFolha ? L(id, "", defState) : N(id, "Ramo", "", []));
    pai.opcoes[i].proximo_no = id;
  });

  const salvarNovoId = () => {
    const nv = S(idDraft).trim();
    setRenaming(false);
    if (!nv || nv === n.id) return;
    updDia(d => {
      if (d.nos.some(z => z.id === nv)) return;
      const old = n.id;
      const me = d.nos.find(z => z.id === old);
      if (!me) return;
      me.id = nv;
      d.nos.forEach(z => {
        z.opcoes.forEach(o => { if (o.proximo_no === old) o.proximo_no = nv; });
        z.desbloqueios.forEach(x => { if (x.no === old) x.no = nv; });
      });
    });
  };

  const abrirConfronto = () => setDraft(draft ? null : { ev: livres[0]?.id || "", pergunta: "", reacao: "" });
  const gerarConfronto = () => {
    if (!draft) return;
    const ev = draft.ev || livres[0]?.id;
    if (!ev) return;
    const pergunta = draft.pergunta, reacao = draft.reacao;
    updDia(d => {
      const pai = d.nos.find(z => z.id === n.id);
      if (!pai) return;
      const id = pai.id + "#" + ev;
      if (d.nos.some(z => z.id === id)) return;
      const a = id + ".1", b = id + ".2";
      const s2 = cfg.estados_folha[2]?.nome || defState;
      d.nos.push(N(id, "Reação · " + ev, reacao, [OP("", a, ""), OP("", b, "")], {
        confronto_evidencia: { evidencia_id: ev, pergunta_jogador: pergunta, resposta_npc: reacao }
      }));
      d.nos.push(L(a, "", defState));
      d.nos.push(L(b, "", s2));
      pai.desbloqueios.push({ ev, no: id });
    });
    setDraft(null);
  };

  const removerConfronto = i => updDia(d => {
    const pai = d.nos.find(z => z.id === n.id);
    if (!pai) return;
    const x = pai.desbloqueios[i];
    if (!x) return;
    const rid = x.no;
    pai.desbloqueios.splice(i, 1);
    const rm = new Set();
    d.nos.forEach(z => { if (z.id === rid || z.id.startsWith(rid + ".") || z.id.startsWith(rid + "#")) rm.add(z.id); });
    d.nos = d.nos.filter(z => !rm.has(z.id));
    d.nos.forEach(z => {
      z.opcoes.forEach(o => { if (rm.has(o.proximo_no)) o.proximo_no = ""; });
      z.desbloqueios = z.desbloqueios.filter(y => !rm.has(y.no));
    });
  });

  const trocarEvidenciaConfronto = novo => updDia(d => {
    const me = d.nos.find(z => z.id === n.id);
    if (!me || !me.confronto_evidencia) return;
    me.confronto_evidencia.evidencia_id = novo;
    d.nos.forEach(z => z.desbloqueios.forEach(x => { if (x.no === n.id) x.ev = novo; }));
  });

  const excluir = () => updDia(d => {
    const rm = new Set([n.id, ...A(n.desbloqueios).map(x => x.no)]);
    if (n.confronto_evidencia) d.nos.forEach(z => { if (z.id.startsWith(n.id + ".") || z.id.startsWith(n.id + "#")) rm.add(z.id); });
    d.nos = d.nos.filter(z => !rm.has(z.id));
    d.nos.forEach(z => {
      z.opcoes.forEach(o => { if (rm.has(o.proximo_no)) o.proximo_no = ""; });
      z.desbloqueios = z.desbloqueios.filter(x => !rm.has(x.no));
    });
  });

  const border = secreta ? "border-amber-400" : conf ? "border-cyan-400" : isLeaf ? vTone.b : selected ? "border-cyan-400" : "border-zinc-600";
  const sombra = selected ? " dt-sel-shadow" : " dt-card-shadow";
  const presetVal = !secreta ? "" : PRESETS_ROTA.some(x => x[0] === secreta) ? secreta : "__custom";
  const recompensaIsInf = recompensa && evs.some(e => e.id === recompensa && e.tipo === "informacao");
  const isHardcodedMaria = cfg.template === "turing_test" && npcId === "maria" && aba === "D3" && n.id === "B.2.1";
  const metIcon = cfg.termos.metrica_icone || "👁";

  return h("div", {
    "data-node": n.id,
    style: { minWidth: 336, width: 336 },
    onClick: e => { e.stopPropagation(); onSel(); },
    className: "relative z-10 border-2 p-2 " + border + " " + (isLeaf ? vTone.bg : "bg-zinc-900") + sombra
  },
    secreta && h("div", { className: "-mx-2 -mt-2 mb-2 px-2 py-0.5 bg-amber-400 text-zinc-950 uppercase text-sm font-bold", title: secreta }, "🧪🔑 ROTA SECRETA · " + rotaNome(secreta)),
    isHardcodedMaria && h("div", { className: "-mx-2 -mt-2 mb-2 px-2 py-0.5 bg-cyan-950 border-b border-cyan-500 text-cyan-300 text-sm" }, "⚙ ID 'B.2.1' referenciado em gameplay_scene.c"),

    /* Cabeçalho */
    h("div", { className: "flex gap-1.5 items-center mb-1 flex-wrap" },
      renaming
        ? h("div", { className: "flex gap-1 items-center" },
            h("input", {
              className: inpCls + " !w-24",
              value: idDraft,
              autoFocus: true,
              onKeyDown: e => { if (e.key === "Enter") salvarNovoId(); if (e.key === "Escape") setRenaming(false); },
              onChange: e => setIdDraft(e.target.value)
            }),
            h(Btn, { tone: "g", extra: "!px-1", onClick: salvarNovoId }, "OK")
          )
        : h("span", {
            className: "border-2 border-zinc-600 px-1 text-zinc-200 bg-zinc-950 " + (!isRoot ? "cursor-pointer hover:border-cyan-400" : ""),
            title: isRoot ? "Nó raiz fixo" : "Clique para renomear o ID do nó",
            onClick: () => { if (!isRoot) { setIdDraft(n.id); setRenaming(true); } }
          }, n.id + (!isRoot ? " ✎" : "")),
      h("input", {
        className: "flex-1 min-w-0 bg-transparent border-0 border-b-2 border-dashed border-zinc-700 text-emerald-300 uppercase",
        value: n.rotulo,
        placeholder: "Rótulo",
        onChange: e => updNode(n.id, x => { x.rotulo = e.target.value; })
      }),
      conf && h("span", { className: "text-cyan-400 text-sm" }, "🔍" + S(conf.evidencia_id)),
      recompensa && h("span", { className: (recompensaIsInf ? "text-purple-300" : "text-amber-300") + " text-sm", title: "Concede " + recompensa }, (recompensaIsInf ? "💬+" : "📦+") + recompensa),
      n.desconfianca > 0 && h("span", { className: "text-rose-400 text-sm font-bold" }, metIcon + "+" + n.desconfianca)
    ),

    /* Confronto recebido */
    conf && h("div", { className: "mb-2 border-2 border-cyan-900 p-1.5 bg-zinc-950" },
      h("div", { className: "text-cyan-400 uppercase text-sm" }, "🔍 Escolha condicional (REQ)"),
      h(Lbl, { cls: "!mt-1" }, "Item / Flag exigido"),
      h("select", {
        className: inpCls,
        value: S(conf.evidencia_id),
        onChange: e => trocarEvidenciaConfronto(e.target.value)
      }, evOpts(S(conf.evidencia_id), "Escolha…")),
      h(Lbl, null, "Fala / pergunta do jogador"),
      h(TA, {
        value: conf.pergunta_jogador,
        label: "Pergunta " + n.id,
        warn500,
        tone: !S(conf.pergunta_jogador).trim() ? "text-rose-400 !border-rose-500" : "text-cyan-300",
        placeholder: "O que o jogador diz nesta escolha condicional…",
        onChange: t => updNode(n.id, x => { if (x.confronto_evidencia) x.confronto_evidencia.pergunta_jogador = t; })
      })
    ),

    /* Fala(s) do NPC */
    usesAberturas
      ? h("div", { className: "border-2 border-amber-500 p-1.5 mb-1 bg-zinc-950" },
          h("div", { className: "text-amber-400 uppercase text-sm mb-1" }, "🗣 Falas de abertura · por estado anterior"),
          cfg.estados_folha.map(est => {
            const sk = stateKey(est.nome);
            const tn = TONE_MAP[est.cor] || TONE_MAP.a;
            const isDef = est.nome === defState;
            return h("div", { key: sk, className: "mb-1.5 last:mb-0" },
              h("div", { className: "text-sm " + tn.t }, "■ " + est.nome + (isDef ? " (padrão)" : "")),
              h(TA, {
                value: n.aberturas?.[sk] || "",
                label: "Abertura " + est.nome,
                warn500,
                tone: tn.t,
                placeholder: "Fala inicial se veio de " + est.nome + "…",
                onChange: t => updNode(n.id, x => {
                  if (!x.aberturas) x.aberturas = {};
                  x.aberturas[sk] = t;
                  if (isDef) x.fala_npc = t;
                })
              })
            );
          })
        )
      : h("div", null,
          h(Lbl, { cls: "!mt-0" }, isToolRoot ? "Nota de contexto (jogador inicia escolhendo abaixo)" : conf ? "Fala de reação" : "Fala do personagem"),
          h(TA, {
            value: n.fala_npc,
            label: "Fala " + n.id,
            warn500,
            tone: isToolRoot ? "text-zinc-400" : undefined,
            placeholder: isToolRoot ? "(Contexto da árvore especial)" : "O que o personagem diz…",
            onChange: t => updNode(n.id, x => {
              x.fala_npc = t;
              if (x.confronto_evidencia) x.confronto_evidencia.resposta_npc = t;
            })
          })
        ),

    /* Folha vs Opções */
    isLeaf
      ? h("div", { className: "mt-2" },
          h(Lbl, null, !isScene ? "Estado final (prioritário)" : "Estado / Resultado da folha"),
          h("select", {
            className: inpCls + " " + vTone.t,
            value: v,
            onChange: e => updNode(n.id, x => { if (x.folha) x.folha.visao_jogador = e.target.value; })
          }, stateNames.map(k => h("option", { key: k, value: k }, k)))
        )
      : h("div", null,
          warn500 && totalChoices > 4 && h("div", { className: "mt-1.5 px-1.5 py-0.5 border border-rose-500 bg-rose-950/50 text-rose-300 text-sm" }, "⚠ " + totalChoices + "/4 escolhas (MAX_CHOICES=4 no C)"),
          A(n.opcoes).map((o, i) =>
            h("div", { key: i, "data-opt": n.id + "|" + i, className: "border-t-2 border-dashed border-zinc-700 mt-2 pt-1" },
              h("div", { className: "grid grid-cols-[24px_1fr_26px] gap-1 items-start" },
                h("span", { className: "bg-emerald-500 text-zinc-950 text-center font-bold" }, LET[i] || "?"),
                h(TA, {
                  value: o.texto,
                  label: "Opção " + (LET[i] || i),
                  warn500,
                  placeholder: "Escolha do jogador…",
                  onChange: t => updNode(n.id, x => { if (x.opcoes[i]) x.opcoes[i].texto = t; })
                }),
                h("button", {
                  type: "button",
                  className: btnCls("r", "!px-0"),
                  onClick: () => updNode(n.id, x => { x.opcoes.splice(i, 1); })
                }, "X")
              ),
              h("div", { className: "grid grid-cols-[112px_1fr] gap-1 mt-1 ml-6" },
                h("select", {
                  className: inpCls + (!o.proximo_no ? " !border-amber-500" : ""),
                  value: o.proximo_no || "",
                  onChange: e => updNode(n.id, x => { if (x.opcoes[i]) x.opcoes[i].proximo_no = e.target.value; })
                }, destOpts(o.proximo_no, "-> destino")),
                h("input", {
                  className: inpCls,
                  value: o.efeito,
                  placeholder: "nota / tag (opcional)",
                  onChange: e => updNode(n.id, x => { if (x.opcoes[i]) x.opcoes[i].efeito = e.target.value; })
                })
              ),
              h("div", { className: "ml-6 mt-1 flex flex-wrap gap-1" },
                h(Btn, { tone: "z", extra: "text-sm !px-1.5", onClick: () => criarFilho(i, false) }, "+ SUB-NÓ"),
                h(Btn, { tone: "g", extra: "text-sm !px-1.5", onClick: () => criarFilho(i, true) }, "+ FOLHA"),
                o.proximo_no && outros.some(z => z.id === o.proximo_no) && h(Btn, {
                  tone: "c",
                  extra: "text-sm !px-1.5",
                  onClick: () => onJumpNode(o.proximo_no)
                }, "↳ " + o.proximo_no)
              )
            )
          ),
          h("div", { className: "mt-2 flex gap-2 flex-wrap items-center" },
            A(n.opcoes).length < 8 && h(Btn, {
              tone: "g",
              onClick: () => updNode(n.id, x => { x.opcoes.push(OP("", "", "")); })
            }, "+ OPÇÃO")
          ),
          A(n.opcoes).length === 0 && A(n.desbloqueios).length === 0 && h("div", { className: "mt-1.5 flex items-center justify-between gap-2 border border-rose-500 bg-rose-950/30 px-1.5 py-1" },
            h("span", { className: "text-rose-400 text-sm" }, "⚠ Beco sem saída"),
            !isRoot && h(Btn, {
              tone: "a",
              extra: "text-sm !px-1.5",
              onClick: () => updNode(n.id, x => { x.folha = { visao_jogador: defState }; if (!x.rotulo || x.rotulo === "Ramo") x.rotulo = "Final"; })
            }, "VIRAR FOLHA")
          )
        ),

    /* Confrontos condicionais (se módulo inventário ativo) */
    cfg.modulos.inventario && !isLeaf && h("div", { className: "mt-2 border-2 border-cyan-900 p-1.5 bg-zinc-950" },
      A(n.desbloqueios).map((x, i) =>
        h("div", { key: i, className: "flex items-center gap-1 mb-1 text-cyan-300 text-sm" },
          h("button", {
            type: "button",
            onClick: () => onJumpNode(x.no),
            className: "flex-1 text-left hover:underline cursor-pointer"
          }, "🔍 REQ " + x.ev + " → " + x.no),
          h("button", { type: "button", className: btnCls("r", "!px-1"), onClick: () => removerConfronto(i) }, "X")
        )
      ),
      h(Btn, {
        tone: "c",
        extra: "w-full text-sm",
        onClick: abrirConfronto,
        disabled: !draft && !livres.length,
        title: !livres.length ? "Cadastre itens no inventário abaixo primeiro" : ""
      }, draft ? "[ CANCELAR ]" : "[ 🔍+ ESCOLHA CONDICIONAL / CONFRONTO ]"),
      draft && h("div", { className: "mt-1" },
        h(Lbl, { cls: "!mt-1" }, "Item / Flag exigido"),
        h("select", {
          className: inpCls,
          value: draft.ev || livres[0]?.id || "",
          onChange: e => setDraft({ ...draft, ev: e.target.value })
        }, livres.map(e => h("option", { key: e.id, value: e.id }, (e.tipo === "informacao" ? "💬 " : "📦 ") + e.id + " · " + S(e.nome).slice(0, 26)))),
        h(Lbl, null, "Fala / pergunta do jogador"),
        h(TA, { value: draft.pergunta, label: "Pergunta", warn500, tone: "text-cyan-300", onChange: t => setDraft({ ...draft, pergunta: t }) }),
        h(Lbl, null, "Fala de reação"),
        h(TA, { value: draft.reacao, label: "Reação", warn500, onChange: t => setDraft({ ...draft, reacao: t }) }),
        h("div", { className: "mt-2" }, h(Btn, { tone: "c", onClick: gerarConfronto }, "GERAR GALHO"))
      )
    ),

    /* Recompensa de nó (se inventário ativo) */
    cfg.modulos.inventario && !isToolRoot && h("div", { className: "mt-2" },
      recompensa
        ? h("div", { className: "flex gap-1 items-center" },
            h("span", { className: "text-amber-300 whitespace-nowrap text-sm" }, recompensaIsInf ? "💬+" : "📦+"),
            h("select", {
              className: inpCls,
              value: recompensa,
              onChange: e => updNode(n.id, x => { x.evidencia_desbloqueada = e.target.value; })
            }, evOpts(recompensa, "Escolha…").slice(1)),
            h("button", { type: "button", className: btnCls("r", "!px-1"), onClick: () => updNode(n.id, x => { x.evidencia_desbloqueada = ""; }) }, "X")
          )
        : h(Btn, {
            tone: "a",
            extra: "w-full text-sm",
            disabled: !evs.some(e => e.id),
            onClick: () => updNode(n.id, x => { x.evidencia_desbloqueada = (evs.find(e => e.id) || {}).id || ""; })
          }, "[ + CONCEDE " + (cfg.termos.item_a || "ITEM").toUpperCase() + " / " + (cfg.termos.item_b || "INFO").toUpperCase() + " ]")
    ),

    /* Métrica Global (se módulo ativo) */
    cfg.modulos.metrica_global && !isToolRoot && h("div", { className: "mt-2 flex gap-1.5 items-center justify-between border border-zinc-800 bg-zinc-950 px-2 py-1" },
      h("span", { className: "text-rose-400 text-sm" }, metIcon + " " + (cfg.termos.metrica_nome || "Métrica") + " +"),
      h("input", {
        type: "number",
        min: 0,
        max: 99,
        className: inpCls + " !w-14 text-center",
        value: n.desconfianca || 0,
        onChange: e => updNode(n.id, x => { x.desconfianca = Math.max(0, Math.floor(+e.target.value || 0)); })
      })
    ),

    /* Trava Experimental (se módulo experimental ativo) */
    cfg.modulos.experimental && isScene && h("div", { className: "mt-2 border border-dashed border-zinc-700 p-1.5 bg-zinc-950" },
      h("div", { className: "flex items-center justify-between gap-1 mb-1" },
        h("span", { className: "text-zinc-400 uppercase text-sm" }, "Trava de rota"),
        h(ExpBadge, { text: "EXP" })
      ),
      h("select", {
        className: inpCls + (secreta ? " !text-amber-300 !border-amber-400" : ""),
        value: presetVal,
        onChange: e => {
          const val = e.target.value;
          updNode(n.id, x => {
            x.trava_rota_secreta = val === "__custom"
              ? (PRESETS_ROTA.some(p2 => p2[0] === x.trava_rota_secreta) || !x.trava_rota_secreta ? "Rota_Personalizada" : x.trava_rota_secreta)
              : val;
          });
        }
      },
        h("option", { value: "" }, "Livre (padrão)"),
        PRESETS_ROTA.map(([k, nome]) => h("option", { key: k, value: k }, "🔑 " + nome)),
        h("option", { value: "__custom" }, "🔑 Personalizada…")
      ),
      presetVal === "__custom" && h("input", {
        className: inpCls + " mt-1",
        value: secreta,
        placeholder: "Chave da rota…",
        onChange: e => updNode(n.id, x => { x.trava_rota_secreta = e.target.value.trim() ? e.target.value : "Rota_Personalizada"; })
      })
    ),

    /* Rodapé */
    !isRoot && h("div", { className: "flex justify-between gap-2 mt-2 pt-1 border-t border-zinc-800" },
      isLeaf
        ? h(Btn, { tone: "z", extra: "text-sm", onClick: () => updNode(n.id, x => { x.folha = null; }) }, "VIRAR INTERMEDIÁRIO")
        : h(ConfirmBtn, {
            ask: "APAGAR OPÇÕES?",
            extra: "text-sm",
            onConfirm: () => updNode(n.id, x => { x.folha = { visao_jogador: defState }; x.opcoes = []; x.desbloqueios = []; })
          }, "VIRAR FOLHA"),
      h(ConfirmBtn, { tone: "r", extra: "text-sm", ask: "EXCLUIR NÓ?", onConfirm: excluir }, "EXCLUIR")
    )
  );
}

function plan(nos) {
  const by = {};
  A(nos).forEach(n => { by[n.id] = n; });
  const owned = new Set();
  const placed = new Set();
  const roots = [];
  const kidsOf = n => [
    ...A(n.opcoes).map((o, i) => ({ key: "o" + i, to: o.proximo_no })),
    ...A(n.desbloqueios).map((x, i) => ({ key: "e" + i, to: x.no }))
  ];
  const visit = id => {
    placed.add(id);
    kidsOf(by[id]).forEach(k => {
      if (k.to && by[k.to] && !placed.has(k.to)) {
        owned.add(id + "|" + k.key);
        visit(k.to);
      }
    });
  };
  A(nos).forEach(n => { if (!placed.has(n.id)) { roots.push(n.id); visit(n.id); } });
  return { owned, roots, by, kidsOf };
}

function Branch({ id, T, P, sel, setSel, onJumpNode }) {
  const n = P.by[id];
  if (!n) return null;
  const kids = P.kidsOf(n);
  const sk = T.aba + "|" + n.id;
  const baseLine = T.lineTone === "p" ? "border-purple-500/40" : T.lineTone === "c" ? "border-cyan-500/40" : "border-emerald-500/40";

  return h("div", { className: "flex flex-row items-center" },
    h(NodeCard, {
      n,
      nos: T.nos,
      evs: T.evs,
      cfg: T.cfg,
      isRoot: T.nos[0]?.id === n.id,
      aba: T.aba,
      npcId: T.npcId,
      updNode: T.updNode,
      updDia: T.updTree,
      selected: sel === sk,
      onSel: () => setSel(sk),
      onJumpNode
    }),
    kids.length > 0 && h("div", { className: "flex flex-row items-center" },
      h("span", { "aria-hidden": "true", className: "block w-10 border-t-2 " + baseLine }),
      h("div", { className: "flex flex-col" },
        kids.map((k, idx) => {
          const isEv = k.key[0] === "e";
          const ix = +k.key.slice(1);
          const o = isEv ? null : n.opcoes[ix];
          const line = isEv ? "border-cyan-400/70" : baseLine;
          const pos = kids.length === 1 ? "one" : idx === 0 ? "first" : idx === kids.length - 1 ? "last" : "mid";
          const tag = isEv ? "🔍" : (LET[ix] || "?");
          const tip = isEv ? "🔍 " + S(n.desbloqueios[ix]?.ev) + ": " + S(P.by[k.to]?.confronto_evidencia?.pergunta_jogador) : S(o?.texto);
          const exists = k.to && P.by[k.to];

          return h("div", { key: k.key, className: "relative flex flex-row items-center pl-10 py-4" },
            pos !== "one" && h("span", {
              "aria-hidden": "true",
              className: "absolute left-0 w-0 border-l-2 " + line + " " + (pos === "first" ? "top-1/2 bottom-0" : pos === "last" ? "top-0 bottom-1/2" : "top-0 bottom-0")
            }),
            h("span", { "aria-hidden": "true", className: "absolute left-0 top-1/2 w-10 border-t-2 " + line }),
            h("span", { title: tip, className: "absolute left-2 top-1/2 -translate-y-full text-sm leading-none pb-0.5 " + (isEv ? "text-cyan-400" : "text-zinc-300") }, tag),
            P.owned.has(n.id + "|" + k.key)
              ? h(Branch, { id: k.to, T, P, sel, setSel, onJumpNode })
              : exists
                ? h("button", {
                    type: "button",
                    className: "w-[250px] shrink-0 text-left border-2 border-dashed border-zinc-600 bg-zinc-900 text-zinc-300 px-2 py-1 hover:text-cyan-300 hover:border-cyan-400 cursor-pointer",
                    onClick: e => { e.stopPropagation(); onJumpNode(k.to); }
                  }, "↪ Salto / retorno p/ " + k.to)
                : h("div", { className: "w-[230px] shrink-0 border-2 border-dashed border-rose-500 bg-rose-950/30 text-rose-400 px-2 py-1" }, "⚠ escolha sem destino")
          );
        })
      )
    )
  );
}

function TreeArea({ aba, lineTone, npcId, titulo, sub, nos: nosIn, evs, cfg, zoom, sel, setSel, updNodeIn, updTreeIn, onJumpNode }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const t = ref.current;
    if (!t) return;
    const f = () => {
      const s = { w: Math.round(t.offsetWidth), h: Math.round(t.offsetHeight) };
      setSize(p => (p.w === s.w && p.h === s.h ? p : s));
    };
    f();
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(f); ro.observe(t); }
    window.addEventListener("resize", f);
    return () => { if (ro) ro.disconnect(); window.removeEventListener("resize", f); };
  }, [nosIn]);

  const headTone = lineTone === "p" ? ["border-purple-500", "text-purple-400"] : lineTone === "c" ? ["border-cyan-500", "text-cyan-400"] : ["border-emerald-500", "text-emerald-400"];
  const nos = A(nosIn);
  const T = { aba, lineTone, npcId, nos, evs, cfg, updNode: updNodeIn, updTree: updTreeIn };
  const P = plan(nos);

  return h("main", { className: "w-full overflow-auto grid-bg", style: { height: "calc(100vh - 108px)" }, "aria-label": titulo },
    h("div", { style: { width: size.w ? size.w * zoom : "auto", height: size.h ? size.h * zoom : "auto" } },
      h("div", {
        ref,
        className: "scale-t min-w-max p-10",
        style: { width: "max-content", transform: "scale(" + zoom + ")", transformOrigin: "0 0" },
        onClick: () => setSel(null)
      },
        h("div", { className: "mb-8 pb-2 border-b-2 " + headTone[0], style: { maxWidth: 720 } },
          h("div", { className: "glow text-2xl " + headTone[1] }, titulo),
          h("div", { className: "text-zinc-400 text-sm" }, sub)
        ),
        P.roots.map((r, i) =>
          h("div", { key: r, className: i ? "mt-14 pt-6 border-t-2 border-dashed border-rose-500" : "" },
            i > 0 && h("div", { className: "text-rose-400 text-sm mb-2 uppercase" }, "⚠ Nó órfão / solto (inalcançável a partir da raiz):"),
            h(Branch, { id: r, T, P, sel, setSel, onJumpNode })
          )
        )
      )
    )
  );
}

/* ==========================================================================
   MATRIZ DE TRANSIÇÃO & VEREDITO
   ========================================================================== */
function Matriz({ cenaData, cfg, proxCena, updCena, onJumpNext }) {
  return h(Panel, {
    title: "MATRIZ DE TRANSIÇÃO" + (proxCena ? " → " + proxCena.rotulo.toUpperCase() : ""),
    tone: "a",
    defaultOpen: false,
    right: proxCena && proxCena.aberturas && cfg.modulos.aberturas_dinamicas && h(Btn, {
      tone: "c",
      extra: "text-sm !py-0",
      onClick: e => { e.stopPropagation(); onJumpNext(proxCena.id); }
    }, "↳ EDITAR ENTRADA DE " + proxCena.rotulo)
  },
    h("p", { className: "text-zinc-400 text-sm mb-3" }, "Anotações de design sobre como o estado final desta cena afeta a próxima."),
    A(cenaData?.matriz).map((m, i) => {
      const exp = isExpMatrixKey(m.k);
      const stTone = stateTone(cfg, m.k);
      return h("div", { key: m.k, className: "grid gap-2 mb-2 md:grid-cols-[230px_1fr]" },
        h("div", {
          className: "border-2 px-2 py-1 uppercase flex items-center justify-between gap-1 " + (exp ? "border-purple-500 text-purple-400" : stTone.b + " " + stTone.t)
        },
          h("span", null, m.k),
          exp && h(ExpBadge, { text: "EXP" })
        ),
        h(TA, {
          value: m.efeito,
          label: "Nota " + m.k,
          tone: "text-amber-300",
          onChange: t => updCena(c => { if (c.matriz[i]) c.matriz[i].efeito = t; })
        })
      );
    })
  );
}

function Veredito({ cenaData, scRotulo, updCena }) {
  const v = cenaData?.veredito;
  if (!v) return null;
  return h(Panel, { title: "⚖ VEREDITO FINAL · " + scRotulo.toUpperCase(), tone: "a", defaultOpen: false },
    h("div", { className: "max-w-xs mb-2" },
      h(Lbl, { cls: "!mt-0" }, "Natureza / Verdade Real"),
      h("select", {
        className: inpCls,
        value: v.verdade,
        onChange: e => updCena(c => { if (c.veredito) c.veredito.verdade = e.target.value; })
      }, ["Humano", "Sintético"].map(k => h("option", { key: k, value: k }, k)))
    ),
    A(v.opcoes).map((o, i) => {
      const acerto = o.k === "Inconclusivo" ? "SEM DECISÃO" : o.k === v.verdade ? "ACERTO" : "ERRO";
      const cls = acerto === "ACERTO" ? "border-emerald-500 text-emerald-400" : acerto === "ERRO" ? "border-rose-500 text-rose-500" : "border-amber-500 text-amber-400";
      return h("div", { key: o.k, className: "grid gap-2 mt-2 md:grid-cols-[210px_1fr]" },
        h("div", { className: "border-2 px-2 py-1 uppercase " + cls }, o.k + " · " + acerto),
        h(TA, {
          value: o.consequencia,
          label: "Consequência " + o.k,
          tone: "text-amber-300",
          onChange: t => updCena(c => { if (c.veredito && c.veredito.opcoes[i]) c.veredito.opcoes[i].consequencia = t; })
        })
      );
    })
  );
}

/* ==========================================================================
   MODAL 1: GERENCIADOR DE JOGOS + DETECTOR AUTOMÁTICO ("ABRIR ARQUIVO DE JOGO...")
   ========================================================================== */
function GamesHubModal({ reg, activeGame, onSwitchGame, onCreateGame, onDeleteGame, onApplyDetected, onResetOfficialTuring, onClose, flash }) {
  const [tab, setTab] = useState("jogos"); // jogos | novo | abrir
  const [newName, setNewName] = useState("");
  const [newTpl, setNewTpl] = useState("livre");
  const [newTheme, setNewTheme] = useState("quill_tree");

  const [detected, setDetected] = useState(null);
  const [detErr, setDetErr] = useState("");
  const [targetNpcIdx, setTargetNpcIdx] = useState(activeGame.npc_ativo || 0);
  const fileRef = useRef(null);

  useEffect(() => {
    const f = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  const handleRawFile = text => {
    setDetErr("");
    setDetected(null);
    try {
      const parsed = JSON.parse(text);
      const info = detectImportedFile(parsed);
      setDetected(info);
    } catch (e) {
      setDetErr(e && e.message ? e.message : "Falha ao analisar arquivo JSON.");
    }
  };

  const onPickFile = ev => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => handleRawFile(String(r.result || ""));
    r.readAsText(f, "utf-8");
  };

  const TPL_CARDS = [
    { id: "turing_test", icon: "🖥️", title: "Template TuringTest", defTheme: "turing_crt", desc: "Estrutura completa D1–D6 (Semanas 1 e 2), árvores de Viés e Injeção, Objeto/Informação, Autodesconfiança, Matriz, Veredito e export TXT para C." },
    { id: "livre", icon: "🪶", title: "Jogo Livre / Geral", defTheme: "quill_tree", desc: "Cenas livres renomeáveis, estados finais customizáveis, itens/flags condicionais e export JSON limpo para qualquer engine." },
    { id: "rpg", icon: "🐉", title: "RPG / Dungeon Crawler", defTheme: "dungeon", desc: "Encontros, Quests e Mercador, estados Aliado/Neutro/Hostil/Missão Aceita e métrica global de Reputação/Karma." },
    { id: "crime", icon: "🩸", title: "Investigação / Noir", defTheme: "crimson_crime", desc: "Abordagem e Acareação com aberturas dinâmicas, Provas/Depoimentos, Tensão do Caso e Veredito." }
  ];

  return h("div", { className: "fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4", role: "dialog", "aria-modal": "true", onClick: onClose },
    h("div", { className: "w-full max-w-4xl border-2 border-emerald-500 bg-zinc-950 p-4 dt-card-shadow max-h-[92vh] overflow-auto", onClick: e => e.stopPropagation() },
      h("div", { className: "flex justify-between items-center pb-2 mb-3 border-b-2 border-zinc-700" },
        h("span", { className: "glow text-2xl text-emerald-400" }, "📂 PROJETOS DE JOGO & DETECTOR DE ARQUIVOS"),
        h(Btn, { tone: "r", onClick: onClose }, "FECHAR [ESC]")
      ),
      h("div", { className: "flex flex-wrap gap-2 mb-4" },
        h(Btn, { tone: "g", on: tab === "jogos", onClick: () => setTab("jogos") }, "🗂 MEUS JOGOS (" + reg.list.length + ")"),
        h(Btn, { tone: "c", on: tab === "abrir", onClick: () => setTab("abrir") }, "📂 ABRIR ARQUIVO DE JOGO / ÁRVORE..."),
        h(Btn, { tone: "a", on: tab === "novo", onClick: () => setTab("novo") }, "➕ CRIAR NOVO JOGO")
      ),

      /* ABA 1: LISTA DE JOGOS ISOLADOS */
      tab === "jogos" && h("div", { className: "space-y-2" },
        h("p", { className: "text-zinc-400 text-sm mb-2" }, "Cada jogo abaixo fica salvo em um espaço isolado do navegador (e em pastas separadas em games/<nome_do_jogo>/ ao exportar), sem nunca misturar personagens ou árvores com o TuringTest."),
        reg.list.map(g => {
          const isCur = g.id === activeGame.game_id;
          const isOfficial = g.id === TURING_OFFICIAL_ID;
          return h("div", {
            key: g.id,
            className: "border-2 p-3 flex flex-wrap items-center justify-between gap-2 " + (isCur ? "border-emerald-400 bg-emerald-950/30" : "border-zinc-700 bg-zinc-900")
          },
            h("div", null,
              h("div", { className: "text-xl " + (isCur ? "text-emerald-400 font-bold" : "text-zinc-200") },
                (isOfficial ? "🔒 " : "🎮 ") + g.nome + (isCur ? " [ATIVO]" : "")
              ),
              h("div", { className: "text-zinc-400 text-sm" },
                "ID: " + g.id + " · Perfil: " + (g.template || "livre") + " · Tema: " + (g.theme || "turing_crt") + (g.updatedAt ? " · Salvo às " + g.updatedAt : "")
              )
            ),
            h("div", { className: "flex gap-2 items-center" },
              !isCur && h(Btn, { tone: "g", onClick: () => { onSwitchGame(g.id); onClose(); } }, "ABRIR JOGO"),
              isOfficial && isCur && h(ConfirmBtn, {
                tone: "a",
                ask: "RESTAURAR ARTHUR, MARIA E ANA LÚCIA?",
                onConfirm: () => { onResetOfficialTuring(); onClose(); }
              }, "RESTAURAR PRESETS"),
              !isOfficial && h(ConfirmBtn, {
                tone: "r",
                ask: "APAGAR JOGO DO NAVEGADOR?",
                onConfirm: () => onDeleteGame(g.id)
              }, "EXCLUIR")
            )
          );
        })
      ),

      /* ABA 2: ABRIR ARQUIVO COM AUTO-DETECÇÃO */
      tab === "abrir" && h("div", null,
        h("div", { className: "border-2 border-dashed border-cyan-500 bg-zinc-900 p-6 text-center mb-3" },
          h("div", { className: "text-xl text-cyan-400 mb-1" }, "Selecione qualquer arquivo .JSON salvo anteriormente"),
          h("p", { className: "text-zinc-400 text-sm mb-3" }, "O DialogueTools identifica sozinho se o arquivo é um Jogo Completo, um Personagem/Suspeito (TuringTest v4–v7 ou Geral), um Pacote de Semana/Capítulos ou uma Árvore individual — e evita misturar jogos diferentes por engano."),
          h("input", { ref: fileRef, type: "file", accept: ".json,application/json", className: "hidden", onChange: onPickFile }),
          h(Btn, { tone: "c", extra: "text-lg !px-4 !py-1", onClick: () => fileRef.current && fileRef.current.click() }, "📂 ESCOLHER ARQUIVO .JSON NO PC")
        ),
        detErr && h("div", { className: "border-2 border-rose-500 bg-rose-950/40 text-rose-300 p-2 mb-2" }, "⚠ " + detErr),
        detected && h("div", { className: "border-2 border-emerald-400 bg-zinc-900 p-3 space-y-2" },
          h("div", { className: "text-sm text-cyan-400 uppercase font-bold" }, "✔ ARQUIVO IDENTIFICADO AUTOMATICAMENTE: " + detected.badge),
          h("div", { className: "text-xl text-emerald-300" }, detected.title),
          detected.gameName && h("div", { className: "text-sm text-zinc-400" }, "Origem detectada: " + detected.gameName + (detected.gameId ? " (" + detected.gameId + ")" : "")),

          /* Opções inteligentes conforme o tipo detectado */
          detected.kind === "game" && h("div", { className: "flex flex-wrap gap-2 pt-2" },
            h(Btn, {
              tone: "g",
              onClick: () => { onApplyDetected(detected, "open_game"); onClose(); }
            }, reg.list.some(x => x.id === detected.gameId) ? "ABRIR E ATUALIZAR JOGO '" + detected.gameName.toUpperCase() + "'" : "ABRIR EM SLOT ISOLADO DE JOGO"),
            h(Btn, {
              tone: "p",
              onClick: () => { onApplyDetected(detected, "clone_game"); onClose(); }
            }, "CRIAR COMO CÓPIA SEPARADA")
          ),

          detected.kind === "npc" && h("div", { className: "space-y-2 pt-2" },
            detected.gameId && detected.gameId !== activeGame.game_id && h("div", { className: "border border-amber-400 bg-amber-950/40 text-amber-300 p-2 text-sm" },
              "⚠ Atenção: este personagem pertence ao jogo/formato '" + (detected.gameName || detected.gameId) + "', mas você está com '" + activeGame.game_nome + "' aberto!"
            ),
            h("div", { className: "flex flex-wrap gap-2" },
              detected.isTuringNpc && activeGame.game_id !== TURING_OFFICIAL_ID && h(Btn, {
                tone: "g",
                onClick: () => { onApplyDetected(detected, "npc_into_turing"); onClose(); }
              }, "ABRIR NO TURING TEST (SEM MISTURAR AQUI)"),
              h(Btn, {
                tone: detected.gameId && detected.gameId !== activeGame.game_id ? "a" : "g",
                onClick: () => { onApplyDetected(detected, "npc_into_current"); onClose(); }
              }, "IMPORTAR EM '" + activeGame.game_nome.toUpperCase() + "'"),
              h(Btn, {
                tone: "p",
                onClick: () => { onApplyDetected(detected, "npc_as_new_game"); onClose(); }
              }, "CRIAR NOVO JOGO COM ESTE PERSONAGEM")
            )
          ),

          detected.kind === "chapter_pack" && h("div", { className: "space-y-2 pt-2" },
            h("div", { className: "flex items-center gap-2" },
              h("span", { className: "text-sm text-zinc-400" }, "Aplicar capítulos em qual personagem de '" + activeGame.game_nome + "'?"),
              h("select", { className: inpCls + " !w-56", value: targetNpcIdx, onChange: e => setTargetNpcIdx(+e.target.value) },
                activeGame.npcs.map((np, i) => h("option", { key: i, value: i }, np.npc.nome))
              )
            ),
            h(Btn, { tone: "g", onClick: () => { onApplyDetected(detected, "pack_into_npc", targetNpcIdx); onClose(); } }, "IMPORTAR PACOTE DE CAPÍTULOS / SEMANA")
          ),

          detected.kind === "single_tree" && h("div", { className: "flex flex-wrap gap-2 pt-2" },
            detected.targetId && h(Btn, {
              tone: "g",
              onClick: () => { onApplyDetected(detected, "tree_into_matching"); onClose(); }
            }, "APLICAR NA ABA '" + detected.targetId + "'"),
            h(Btn, {
              tone: "c",
              onClick: () => { onApplyDetected(detected, "tree_into_active"); onClose(); }
            }, "APLICAR NA ABA ATUAL ABERTA")
          )
        )
      ),

      /* ABA 3: CRIAR NOVO JOGO */
      tab === "novo" && h("div", { className: "space-y-3" },
        h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" },
          h("div", null,
            h(Lbl, { cls: "!mt-0" }, "Nome do Novo Jogo"),
            h("input", {
              className: inpCls,
              value: newName,
              placeholder: "Ex.: Crônicas de Cinza / Setor B...",
              onChange: e => setNewName(e.target.value)
            })
          ),
          h("div", null,
            h(Lbl, { cls: "!mt-0" }, "Tema Visual Inicial"),
            h("select", { className: inpCls, value: newTheme, onChange: e => setNewTheme(e.target.value) },
              THEMES.map(t => h("option", { key: t.id, value: t.id }, t.label))
            )
          )
        ),
        h(Lbl, null, "Escolha o Template Base (você poderá ligar/desligar qualquer módulo depois em ⚙ Configurar Jogo)"),
        h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2" },
          TPL_CARDS.map(c =>
            h("button", {
              key: c.id,
              type: "button",
              onClick: () => { setNewTpl(c.id); setNewTheme(c.defTheme); },
              className: "text-left p-3 border-2 cursor-pointer " + (newTpl === c.id ? "border-emerald-400 bg-emerald-950/30" : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800")
            },
              h("div", { className: "text-lg text-emerald-400 font-bold" }, c.icon + " " + c.title),
              h("div", { className: "text-sm text-zinc-400 mt-1" }, c.desc)
            )
          )
        ),
        h("div", { className: "pt-2" },
          h(Btn, {
            tone: "g",
            extra: "text-lg !px-4 !py-1",
            onClick: () => {
              onCreateGame(newName || "Novo Jogo", newTpl, newTheme);
              flash("Novo projeto criado em slot isolado!");
              onClose();
            }
          }, "✨ CRIAR E ABRIR PROJETO")
        )
      )
    )
  );
}

/* ==========================================================================
   MODAL 2: CONFIGURAR MÓDULOS, CENAS, ÁRVORES EXTRAS E ESTADOS DO JOGO
   ========================================================================== */
function ConfigModal({ game, updGame, onClose }) {
  const cfg = game.config;
  useEffect(() => {
    const f = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  const toggleMod = k => updGame(g => { g.config.modulos[k] = !g.config.modulos[k]; });

  return h("div", { className: "fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4", role: "dialog", "aria-modal": "true", onClick: onClose },
    h("div", { className: "w-full max-w-4xl border-2 border-amber-400 bg-zinc-950 p-4 dt-card-shadow max-h-[92vh] overflow-auto", onClick: e => e.stopPropagation() },
      h("div", { className: "flex justify-between items-center pb-2 mb-3 border-b-2 border-zinc-700" },
        h("span", { className: "glow text-2xl text-amber-400" }, "⚙ CONFIGURAR ESTRUTURA & MÓDULOS DO JOGO"),
        h(Btn, { tone: "r", onClick: onClose }, "CONCLUIR [ESC]")
      ),

      /* Nome e Termos */
      h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-2 mb-4" },
        h("div", null,
          h(Lbl, { cls: "!mt-0" }, "Título do Jogo"),
          h("input", { className: inpCls, value: game.game_nome, onChange: e => updGame(g => { g.game_nome = e.target.value; }) })
        ),
        h("div", null,
          h(Lbl, { cls: "!mt-0" }, "Termo p/ Personagens (plural)"),
          h("input", { className: inpCls, value: cfg.termos.npc_plural, onChange: e => updGame(g => { g.config.termos.npc_plural = e.target.value; }) })
        ),
        h("div", null,
          h(Lbl, { cls: "!mt-0" }, "Nome da Métrica Global"),
          h("input", { className: inpCls, value: cfg.termos.metrica_nome, onChange: e => updGame(g => { g.config.termos.metrica_nome = e.target.value; }) })
        )
      ),

      /* Switches de Módulos (Opção 3!) */
      h(Lbl, null, "Módulos Ativos neste Jogo (ligue ou desligue livremente)"),
      h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2 mb-4" },
        [
          ["inventario", "📦 Inventário, Escolhas Condicionais (REQ) & Recompensas"],
          ["metrica_global", "👁 Variável / Métrica Oculta Global entre Personagens"],
          ["aberturas_dinamicas", "🗣 Falas de Abertura Variantes por Estado Anterior"],
          ["matriz_transicao", "🔀 Painel Matriz de Consequências / Transição"],
          ["veredito", "⚖ Painel de Veredito Final nos Fechamentos"],
          ["experimental", "🧪 Campos Experimentais (Trava de Rota Secreta)"],
          ["export_turing_txt", "📄 Regras & Exportador TXT do Motor C (TuringTest)"]
        ].map(([k, label]) =>
          h("button", {
            key: k,
            type: "button",
            onClick: () => toggleMod(k),
            className: "text-left px-2.5 py-1.5 border-2 flex justify-between items-center cursor-pointer " + (cfg.modulos[k] ? "border-emerald-400 bg-emerald-950/30 text-emerald-300" : "border-zinc-700 bg-zinc-900 text-zinc-500")
          },
            h("span", null, label),
            h("span", { className: "font-bold" }, cfg.modulos[k] ? "[ON]" : "[OFF]")
          )
        )
      ),

      /* Cenas / Capítulos / Dias */
      h(Lbl, null, "Cenas / Capítulos / Dias por Personagem"),
      h("div", { className: "space-y-1 mb-2" },
        cfg.cenas.map((sc, i) =>
          h("div", { key: i, className: "grid grid-cols-[90px_1fr_90px_auto_auto_auto_28px] gap-1.5 items-center" },
            h("input", { className: inpCls, value: sc.id, title: "ID da Cena", onChange: e => updGame(g => {
              const old = g.config.cenas[i].id;
              const nv = e.target.value.trim() || old;
              g.config.cenas[i].id = nv;
              if (old !== nv) g.npcs.forEach(np => { if (np.cenas[old]) { np.cenas[nv] = np.cenas[old]; delete np.cenas[old]; } if (np.aba === old) np.aba = nv; });
            }) }),
            h("input", { className: inpCls, value: sc.rotulo, placeholder: "Nome na aba", onChange: e => updGame(g => { g.config.cenas[i].rotulo = e.target.value; }) }),
            h("input", { className: inpCls, value: sc.grupo, placeholder: "Grupo (S1)", onChange: e => updGame(g => { g.config.cenas[i].grupo = e.target.value; }) }),
            h(Btn, { tone: sc.aberturas ? "a" : "z", extra: "text-sm", onClick: () => updGame(g => { g.config.cenas[i].aberturas = !g.config.cenas[i].aberturas; }) }, "3 Aberturas"),
            h(Btn, { tone: sc.matriz ? "a" : "z", extra: "text-sm", onClick: () => updGame(g => { g.config.cenas[i].matriz = !g.config.cenas[i].matriz; }) }, "Matriz"),
            h(Btn, { tone: sc.veredito ? "a" : "z", extra: "text-sm", onClick: () => updGame(g => { g.config.cenas[i].veredito = !g.config.cenas[i].veredito; }) }, "Veredito"),
            cfg.cenas.length > 1 && h("button", { type: "button", className: btnCls("r", "!px-0"), onClick: () => updGame(g => { g.config.cenas.splice(i, 1); }) }, "X")
          )
        )
      ),
      h(Btn, {
        tone: "g",
        extra: "mb-4 text-sm",
        onClick: () => updGame(g => {
          let k = g.config.cenas.length + 1;
          const ids = new Set(g.config.cenas.map(c => c.id));
          while (ids.has("CENA_" + k)) k += 1;
          g.config.cenas.push({ id: "CENA_" + k, rotulo: "Cena " + k, grupo: "", aberturas: false, matriz: false, veredito: false });
        })
      }, "+ ADICIONAR CENA / DIA"),

      /* Árvores Extras */
      h(Lbl, null, "Árvores Especiais por Personagem (ex.: Viés, Injeção, Loja, Segredo)"),
      h("div", { className: "space-y-1 mb-2" },
        cfg.arvores_extras.map((ex, i) =>
          h("div", { key: i, className: "grid grid-cols-[100px_160px_1fr_28px] gap-1.5 items-center" },
            h("input", { className: inpCls, value: ex.id, onChange: e => updGame(g => { g.config.arvores_extras[i].id = e.target.value.toUpperCase().trim() || ex.id; }) }),
            h("input", { className: inpCls, value: ex.rotulo, placeholder: "Rótulo da aba", onChange: e => updGame(g => { g.config.arvores_extras[i].rotulo = e.target.value; }) }),
            h("input", { className: inpCls, value: ex.sub, placeholder: "Subtítulo explicativo", onChange: e => updGame(g => { g.config.arvores_extras[i].sub = e.target.value; }) }),
            h("button", { type: "button", className: btnCls("r", "!px-0"), onClick: () => updGame(g => { g.config.arvores_extras.splice(i, 1); }) }, "X")
          )
        )
      ),
      h(Btn, {
        tone: "p",
        extra: "mb-4 text-sm",
        onClick: () => updGame(g => {
          let k = g.config.arvores_extras.length + 1;
          g.config.arvores_extras.push({ id: "EXTRA_" + k, rotulo: "✨ EXTRA " + k, cor: "p", sub: "Árvore especial do personagem" });
        })
      }, "+ ADICIONAR ÁRVORE ESPECIAL"),

      /* Estados de Folha */
      h(Lbl, null, "Estados / Resultados Finais das Folhas"),
      h("div", { className: "space-y-1 mb-2" },
        cfg.estados_folha.map((est, i) =>
          h("div", { key: i, className: "grid grid-cols-[1fr_180px_28px] gap-1.5 items-center max-w-lg" },
            h("input", { className: inpCls, value: est.nome, onChange: e => updGame(g => { g.config.estados_folha[i].nome = e.target.value; }) }),
            h("select", { className: inpCls, value: est.cor, onChange: e => updGame(g => { g.config.estados_folha[i].cor = e.target.value; }) },
              TONE_KEYS.map(tk => h("option", { key: tk, value: tk }, TONE_MAP[tk].label))
            ),
            cfg.estados_folha.length > 1 && h("button", { type: "button", className: btnCls("r", "!px-0"), onClick: () => updGame(g => { g.config.estados_folha.splice(i, 1); }) }, "X")
          )
        )
      ),
      h(Btn, {
        tone: "a",
        extra: "text-sm",
        onClick: () => updGame(g => { g.config.estados_folha.push({ nome: "Estado " + (g.config.estados_folha.length + 1), cor: "c" }); })
      }, "+ ADICIONAR ESTADO DE FOLHA")
    )
  );
}

/* ==========================================================================
   MODAL 3: SIMULADOR INTERATIVO DE DIÁLOGO
   ========================================================================== */
function SimModal({ game, npc, aba, onClose, setPlayerName }) {
  const cfg = game.config;
  const sc = cfg.cenas.find(c => c.id === aba);
  const isScene = !!sc;
  const nos = isScene ? (npc.cenas?.[aba]?.nos || []) : (npc.extras?.[aba]?.nos || []);
  const by = {};
  A(nos).forEach(n => { by[n.id] = n; });
  const rootId = nos[0]?.id || "Entrada";
  const defState = defaultLeafName(cfg);

  const [visHerdada, setVisHerdada] = useState(defState);
  const [ownedEvs, setOwnedEvs] = useState(() => new Set(A(npc.evidencias).map(e => e.id)));
  const [tokens, setTokens] = useState(10);
  const [curId, setCurId] = useState(rootId);
  const [visited, setVisited] = useState(() => new Set([rootId]));
  const [log, setLog] = useState([]);
  const [ganhos, setGanhos] = useState([]);
  const [desconf, setDesconf] = useState(0);

  const playerName = game.nome_jogador || "Inspetor";
  const fmt = txt => S(txt).replace(/\[nome\]/g, playerName);

  const getFalaNo = (n, vh) => {
    if (!n) return "";
    if (isScene && sc.aberturas && cfg.modulos.aberturas_dinamicas && n.id === rootId && n.aberturas) {
      const sk = stateKey(vh || visHerdada);
      const defSk = stateKey(defState);
      return fmt(n.aberturas[sk] || n.aberturas[defSk] || n.fala_npc);
    }
    return fmt(n.fala_npc);
  };

  const reiniciar = novaVis => {
    const vh = novaVis || visHerdada;
    const r = by[rootId];
    setCurId(rootId);
    setVisited(new Set([rootId]));
    setTokens(aba === "VIES" ? 7 : aba === "INJECAO" ? 6 : 10);
    setGanhos([]);
    setDesconf(r?.desconfianca || 0);
    setLog(r ? [{ role: "npc", speaker: npc.npc.falante || npc.npc.nome, text: getFalaNo(r, vh), nodeId: rootId }] : []);
  };

  useEffect(() => { reiniciar(visHerdada); }, []);
  useEffect(() => {
    const f = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  const cur = by[curId];
  const escolhas = [];
  if (cur && !cur.folha) {
    A(cur.opcoes).forEach((o, i) => {
      if (!o.proximo_no || !by[o.proximo_no]) return;
      const isReturn = o.proximo_no === rootId;
      if (!isReturn && visited.has(o.proximo_no)) return;
      escolhas.push({ texto: fmt(o.texto), dest: o.proximo_no, req: null, cost: isReturn ? 0 : 1, key: "o" + i });
    });
    A(cur.desbloqueios).forEach((x, i) => {
      const destNode = by[x.no];
      if (!destNode || !ownedEvs.has(x.ev)) return;
      if (x.no !== rootId && visited.has(x.no)) return;
      escolhas.push({
        texto: fmt(destNode.confronto_evidencia?.pergunta_jogador || "(usar " + x.ev + ")"),
        dest: x.no,
        req: x.ev,
        cost: x.no === rootId ? 0 : 1,
        key: "e" + i
      });
    });
  }
  const visiveis = cfg.modulos.export_turing_txt ? escolhas.slice(0, 4) : escolhas;

  const escolher = c => {
    if (tokens < c.cost) return;
    const nxt = by[c.dest];
    if (!nxt) return;
    setTokens(t => t - c.cost);
    setCurId(nxt.id);
    setVisited(prev => new Set([...prev, nxt.id]));
    if (nxt.evidencia_desbloqueada && !ganhos.includes(nxt.evidencia_desbloqueada)) {
      setGanhos(g => [...g, nxt.evidencia_desbloqueada]);
      setOwnedEvs(prev => new Set([...prev, nxt.evidencia_desbloqueada]));
    }
    if (nxt.desconfianca > 0) setDesconf(d => d + nxt.desconfianca);
    setLog(l => [
      ...l,
      { role: "player", speaker: playerName, text: c.texto, req: c.req, cost: c.cost },
      { role: "npc", speaker: npc.npc.falante || npc.npc.nome, text: getFalaNo(nxt), nodeId: nxt.id }
    ]);
  };

  return h("div", { className: "fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4", role: "dialog", "aria-modal": "true", onClick: onClose },
    h("div", { className: "w-full max-w-3xl border-2 border-cyan-400 bg-zinc-950 p-3 dt-card-shadow max-h-[92vh] flex flex-col", onClick: e => e.stopPropagation() },
      h("div", { className: "flex justify-between items-center pb-2 border-b-2 border-zinc-700" },
        h("span", { className: "glow text-2xl text-cyan-400" }, "▶ SIMULADOR · " + (npc.npc.nome || "NPC") + " · " + aba),
        h("div", { className: "flex gap-2" },
          h(Btn, { tone: "a", onClick: () => reiniciar(visHerdada) }, "↻ REINICIAR"),
          h(Btn, { tone: "r", onClick: onClose }, "FECHAR [ESC]")
        )
      ),
      h("div", { className: "flex flex-wrap gap-3 items-center py-2 border-b border-zinc-800 text-sm" },
        h("div", { className: "flex items-center gap-1" },
          h("span", { className: "text-zinc-400" }, "[nome]:"),
          h("input", { className: inpCls + " !w-28", value: playerName, onChange: e => setPlayerName(e.target.value) })
        ),
        isScene && sc.aberturas && cfg.modulos.aberturas_dinamicas && h("div", { className: "flex items-center gap-1 flex-wrap" },
          h("span", { className: "text-zinc-400" }, "Estado herdado:"),
          cfg.estados_folha.map(est => {
            const tn = TONE_MAP[est.cor] || TONE_MAP.a;
            return h("button", {
              key: est.nome,
              type: "button",
              onClick: () => { setVisHerdada(est.nome); reiniciar(est.nome); },
              className: "px-1.5 py-0 border cursor-pointer " + (visHerdada === est.nome ? tn.b + " " + tn.t + " bg-zinc-900" : "border-zinc-700 text-zinc-500")
            }, est.nome);
          })
        ),
        h("span", { className: "ml-auto text-emerald-400 font-bold" }, "🪙 TOKENS: " + tokens),
        desconf > 0 && h("span", { className: "text-rose-400 font-bold" }, (cfg.termos.metrica_icone || "👁") + " +" + desconf),
        ganhos.map(g => h("span", { key: g, className: "text-amber-300" }, "🔓 " + g))
      ),
      cfg.modulos.inventario && A(npc.evidencias).length > 0 && h("div", { className: "flex flex-wrap gap-1.5 py-1.5 border-b border-zinc-800 text-sm items-center" },
        h("span", { className: "text-zinc-500" }, "Itens ativos:"),
        A(npc.evidencias).map(e => {
          const on = ownedEvs.has(e.id);
          return h("button", {
            key: e.id,
            type: "button",
            onClick: () => setOwnedEvs(prev => { const n = new Set(prev); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n; }),
            title: e.nome,
            className: "px-1.5 py-0 border cursor-pointer " + (on ? "border-cyan-400 text-cyan-300 bg-cyan-950/40" : "border-zinc-700 text-zinc-500 line-through")
          }, e.id);
        })
      ),
      h("div", { className: "flex-1 overflow-auto py-3 space-y-2 min-h-[220px]" },
        log.map((m, idx) =>
          h("div", { key: idx, className: "flex " + (m.role === "player" ? "justify-end" : "justify-start") },
            h("div", {
              className: "max-w-[82%] border-2 px-2.5 py-1.5 " + (m.role === "player" ? "border-emerald-500 bg-emerald-950/30 text-emerald-200" : "border-zinc-600 bg-zinc-900 text-zinc-200")
            },
              h("div", { className: "text-sm flex justify-between gap-3 " + (m.role === "player" ? "text-emerald-400" : "text-amber-400") },
                h("span", null, m.speaker + (m.req ? " [🔍 " + m.req + "]" : "")),
                h("span", { className: "text-zinc-500" }, m.nodeId ? "[" + m.nodeId + "]" : m.cost === 0 ? "0 tok" : "-" + m.cost + " tok")
              ),
              h("div", null, m.text || h("span", { className: "text-rose-400 italic" }, "(fala vazia)"))
            )
          )
        ),
        cur?.folha && (() => {
          const tn = stateTone(cfg, cur.folha.visao_jogador);
          return h("div", { className: "border-2 p-2 text-center uppercase " + tn.b + " " + tn.bg + " " + tn.t },
            "■ FIM DA CONVERSA · RESULTADO: " + cur.folha.visao_jogador
          );
        })()
      ),
      !cur?.folha && h("div", { className: "pt-2 border-t-2 border-zinc-800 space-y-1" },
        visiveis.length === 0 && h("div", { className: "text-rose-400 text-sm" }, "Sem escolhas disponíveis a partir deste nó."),
        visiveis.map((c, idx) =>
          h("button", {
            key: c.key,
            type: "button",
            disabled: tokens < c.cost,
            onClick: () => escolher(c),
            className: "w-full text-left px-2.5 py-1 border-2 flex justify-between items-center gap-2 cursor-pointer disabled:opacity-40 " + (c.req ? "border-cyan-400 bg-cyan-950/30 text-cyan-200 hover:bg-cyan-400 hover:text-zinc-950" : "border-zinc-600 bg-zinc-900 text-emerald-300 hover:border-emerald-400")
          },
            h("span", null, (c.req ? "🔍 [" + c.req + "] " : (LET[idx] + ") ")) + (c.texto || "(opção vazia)")),
            h("span", { className: "text-sm shrink-0 opacity-80" }, "-> " + c.dest + " (" + c.cost + " tok)")
          )
        )
      )
    )
  );
}

/* ==========================================================================
   MODAL 4: EXPORTAÇÃO / IMPORTAÇÃO MULTIESCOPO (JOGO, NPC, SEMANA, ÁRVORE, TXT)
   ========================================================================== */
function DataModal({ game, activeNpc, aba, onClose, onOpenSmartFile, flash }) {
  const cfg = game.config;
  const groups = [...new Set(cfg.cenas.map(c => c.grupo).filter(Boolean))];
  const txtTargets = [...cfg.cenas.map(c => c.id), ...cfg.arvores_extras.map(e => e.id.toLowerCase())];

  const [modo, setModo] = useState("npc_json");
  // npc_json | game_json | pack_json | tree_json | runtime_json | turing_txt | script_txt
  const [packGroup, setPackGroup] = useState(groups[0] || "");
  const [txtAlvo, setTxtAlvo] = useState(cfg.cenas.some(c => c.id === aba) ? aba : txtTargets[0] || "D1");
  const [msg, setMsg] = useState("");
  const ref = useRef(null);
  const fileRef = useRef(null);

  const gerar = (m, pg, ta) => {
    if (m === "npc_json") return JSON.stringify(toExportNpc(activeNpc, game), null, 2);
    if (m === "game_json") return JSON.stringify(toExportGame(game), null, 2);
    if (m === "pack_json") return JSON.stringify(toExportChapterPack(activeNpc, game, pg), null, 2);
    if (m === "tree_json") return JSON.stringify(toExportSingleTree(activeNpc, game, aba), null, 2);
    if (m === "runtime_json") return JSON.stringify(toExportRuntimeEngine(activeNpc, game), null, 2);
    if (m === "turing_txt") return toTuringTxt(activeNpc, cfg, ta);
    return toReadableScript(activeNpc, game, "__ALL__");
  };

  const [txt, setTxt] = useState(() => gerar("npc_json", packGroup, txtAlvo));

  useEffect(() => {
    const f = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  const trocar = (m, pg, ta) => {
    setModo(m);
    setPackGroup(pg);
    setTxtAlvo(ta);
    setTxt(gerar(m, pg, ta));
    setMsg("");
  };

  const baseOf = npc => slug(npc.npc?.id || npc.npc?.falante || S(npc.npc?.nome).split(" ")[0]) || "npc";
  const nomeTxtOf = (npc, k) => {
    const isSc = cfg.cenas.some(c => c.id === k);
    const numM = S(k).match(/\d+/);
    const suf = isSc && cfg.template === "turing_test" && numM ? "dia" + numM[0] : slug(k);
    return baseOf(npc) + "_" + suf + ".txt";
  };

  const salvarArquivo = (nome, conteudo, tipo) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo + ";charset=utf-8" }));
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 600);
  };

  const baixar = () => {
    const gSlug = slug(game.game_id) || "jogo";
    const nSlug = baseOf(activeNpc);
    if (modo === "npc_json") {
      const fn = (cfg.template === "turing_test" ? "turing_master_" : gSlug + "_npc_") + nSlug + ".json";
      salvarArquivo(fn, txt, "application/json");
      setMsg("BAIXADO: " + fn);
    } else if (modo === "game_json") {
      const fn = gSlug + "_jogo_completo.json";
      salvarArquivo(fn, txt, "application/json");
      setMsg("BAIXADO: " + fn);
    } else if (modo === "pack_json") {
      const fn = gSlug + "_" + nSlug + "_" + slug(packGroup || "cenas") + ".json";
      salvarArquivo(fn, txt, "application/json");
      setMsg("BAIXADO: " + fn);
    } else if (modo === "tree_json") {
      const fn = gSlug + "_" + nSlug + "_arvore_" + slug(aba) + ".json";
      salvarArquivo(fn, txt, "application/json");
      setMsg("BAIXADO: " + fn);
    } else if (modo === "runtime_json") {
      const fn = gSlug + "_" + nSlug + "_runtime.json";
      salvarArquivo(fn, txt, "application/json");
      setMsg("BAIXADO: " + fn);
    } else if (modo === "turing_txt") {
      const fn = nomeTxtOf(activeNpc, txtAlvo);
      salvarArquivo(fn, txt, "text/plain");
      setMsg("BAIXADO: " + fn);
    } else {
      const fn = gSlug + "_" + nSlug + "_roteiro.txt";
      salvarArquivo(fn, txt, "text/plain");
      setMsg("BAIXADO: " + fn);
    }
  };

  const baixarTxtsNpc = () => {
    txtTargets.forEach((k, i) => setTimeout(() => salvarArquivo(nomeTxtOf(activeNpc, k), toTuringTxt(activeNpc, cfg, k), "text/plain"), i * 240));
    setMsg("BAIXANDO " + txtTargets.length + " ARQUIVOS .TXT DE " + activeNpc.npc.nome.toUpperCase());
  };

  const baixarTxtsTodos = () => {
    let delay = 0;
    game.npcs.forEach(np => {
      txtTargets.forEach(k => {
        setTimeout(() => salvarArquivo(nomeTxtOf(np, k), toTuringTxt(np, cfg, k), "text/plain"), delay);
        delay += 210;
      });
    });
    setMsg("BAIXANDO " + (game.npcs.length * txtTargets.length) + " ARQUIVOS .TXT DE TODOS OS PERSONAGENS");
  };

  const copiar = async () => {
    try { await navigator.clipboard.writeText(txt); setMsg("COPIADO COM SUCESSO!"); }
    catch (e) { setMsg("CÓPIA BLOQUEADA: pressione Ctrl+C."); try { ref.current && ref.current.select(); } catch (_) {} }
  };

  const importarTexto = rawStr => {
    try {
      const parsed = JSON.parse(rawStr);
      const det = detectImportedFile(parsed);
      onOpenSmartFile(det);
      onClose();
    } catch (e) {
      setMsg("JSON INVÁLIDO: " + (e && e.message ? e.message : "verifique o conteúdo"));
    }
  };

  return h("div", { className: "fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4", role: "dialog", "aria-modal": "true", onClick: onClose },
    h("div", { className: "w-full max-w-4xl border-2 border-emerald-500 bg-zinc-950 p-3 dt-card-shadow max-h-[92vh] overflow-auto", onClick: e => e.stopPropagation() },
      h("div", { className: "flex justify-between items-center mb-2" },
        h("span", { className: "glow text-2xl text-emerald-400" }, "💾 EXPORTAR / IMPORTAR · " + game.game_nome.toUpperCase()),
        h(Btn, { tone: "r", onClick: onClose }, "FECHAR [ESC]")
      ),
      h("div", { className: "flex flex-wrap gap-1.5 mb-2 items-center" },
        h(Btn, { tone: "g", on: modo === "npc_json", onClick: () => trocar("npc_json", packGroup, txtAlvo) }, "👤 NPC ATUAL (.JSON)"),
        h(Btn, { tone: "p", on: modo === "game_json", onClick: () => trocar("game_json", packGroup, txtAlvo) }, "🎮 JOGO INTEIRO (.JSON)"),
        h(Btn, { tone: "a", on: modo === "pack_json", onClick: () => trocar("pack_json", packGroup, txtAlvo) }, "📅 SEMANA / PACOTE (.JSON)"),
        h(Btn, { tone: "a", on: modo === "tree_json", onClick: () => trocar("tree_json", packGroup, txtAlvo) }, "🌿 ÁRVORE '" + aba + "' (.JSON)"),
        h(Btn, { tone: "c", on: modo === "runtime_json", onClick: () => trocar("runtime_json", packGroup, txtAlvo) }, "⚙️ ENGINE RUNTIME (.JSON)"),
        cfg.modulos.export_turing_txt && h(Btn, { tone: "c", on: modo === "turing_txt", onClick: () => trocar("turing_txt", packGroup, txtAlvo) }, "📄 TXT JOGO C"),
        h(Btn, { tone: "z", on: modo === "script_txt", onClick: () => trocar("script_txt", packGroup, txtAlvo) }, "📜 ROTEIRO (.TXT)")
      ),
      modo === "pack_json" && groups.length > 0 && h("div", { className: "flex items-center gap-2 mb-2 text-sm" },
        h("span", { className: "text-zinc-400" }, "Grupo / Semana:"),
        h("select", { className: inpCls + " !w-48", value: packGroup, onChange: e => trocar("pack_json", e.target.value, txtAlvo) },
          groups.map(g => h("option", { key: g, value: g }, g)),
          h("option", { value: "" }, "Todas as cenas")
        )
      ),
      modo === "turing_txt" && h("div", { className: "flex items-center gap-2 mb-2 text-sm" },
        h("span", { className: "text-zinc-400" }, "Arquivo TXT:"),
        h("select", { className: inpCls + " !w-56", value: txtAlvo, onChange: e => trocar("turing_txt", packGroup, e.target.value) },
          txtTargets.map(k => h("option", { key: k, value: k }, nomeTxtOf(activeNpc, k)))
        )
      ),
      h("textarea", {
        ref,
        value: txt,
        spellCheck: false,
        onChange: e => setTxt(e.target.value),
        className: "w-full h-72 bg-zinc-950 border-2 border-zinc-700 text-emerald-300 p-2 text-base focus:border-cyan-400 font-mono"
      }),
      h("div", { className: "flex flex-wrap gap-2 mt-2 items-center" },
        h(Btn, { tone: "g", onClick: copiar }, "COPIAR"),
        h(Btn, { tone: "c", onClick: baixar }, "⬇ BAIXAR ARQUIVO"),
        modo === "turing_txt" && h(Btn, { tone: "c", onClick: baixarTxtsNpc }, "BAIXAR TXTs DE " + (activeNpc.npc.falante || "NPC").toUpperCase()),
        modo === "turing_txt" && game.npcs.length > 1 && h(Btn, { tone: "p", onClick: baixarTxtsTodos }, "BAIXAR TODOS OS TXTs (" + (game.npcs.length * txtTargets.length) + ")"),
        modo.endsWith("_json") && modo !== "runtime_json" && h(Btn, { tone: "a", onClick: () => importarTexto(txt) }, "IMPORTAR TEXTO ACIMA (AUTO-DETECTAR)"),
        h("input", {
          ref: fileRef,
          type: "file",
          accept: ".json,application/json",
          className: "hidden",
          onChange: ev => {
            const f = ev.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => importarTexto(String(r.result || ""));
            r.readAsText(f, "utf-8");
          }
        }),
        h(Btn, { tone: "a", extra: "ml-auto", onClick: () => fileRef.current && fileRef.current.click() }, "📂 ABRIR .JSON DO DISCO")
      ),
      msg && h("div", { className: "mt-2 text-amber-400", role: "status" }, "> " + msg)
    )
  );
}

/* ==========================================================================
   APP PRINCIPAL
   ========================================================================== */
function App({ initialBoot }) {
  const [reg, setReg] = useState(() => initialBoot.reg);
  const [game, setGame] = useState(() => initialBoot.game);
  const [sel, setSel] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [hubOpen, setHubOpen] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState({ ok: true, at: "" });

  const cfg = game.config;
  const npcIdx = Math.min(game.npcs.length - 1, Math.max(0, game.npc_ativo || 0));
  const data = game.npcs[npcIdx] || game.npcs[0];

  const allAbas = [...cfg.cenas.map(c => c.id), ...cfg.arvores_extras.map(e => e.id)];
  const aba = allAbas.includes(data.aba) ? data.aba : (cfg.cenas[0]?.id || "D1");
  const curScIdx = cfg.cenas.findIndex(c => c.id === aba);
  const curSc = curScIdx >= 0 ? cfg.cenas[curScIdx] : null;
  const curEx = !curSc ? cfg.arvores_extras.find(e => e.id === aba) : null;
  const evs = A(data.evidencias);

  const flash = m => { setToast(m); setTimeout(() => setToast(""), 2800); };

  // Aplica tema ativo no <html>
  useEffect(() => {
    const th = oneOf(cfg.theme, THEME_IDS, "turing_crt");
    document.documentElement.setAttribute("data-theme", th);
  }, [cfg.theme]);

  // Salva o jogo ativo de forma isolada em dtools-game-v2:<game_id>
  useEffect(() => {
    window.__turingState = game;
    const s = JSON.stringify(game);
    const ok = lsSet(K_GAME_PREFIX + game.game_id, s);
    const at = new Date().toLocaleTimeString("pt-BR");
    setSaved(p => (p.ok === ok && p.at === at ? p : { ok, at }));

    setReg(prev => {
      const nextList = [...prev.list];
      const entry = {
        id: game.game_id,
        nome: game.game_nome,
        template: game.config.template,
        theme: game.config.theme,
        npcCount: game.npcs.length,
        updatedAt: at
      };
      const ix = nextList.findIndex(x => x.id === game.game_id);
      if (ix >= 0) nextList[ix] = entry; else nextList.push(entry);
      const nextReg = { activeId: game.game_id, list: nextList };
      saveRegistry(nextReg);
      return nextReg;
    });

    const t = setTimeout(() => lsSet(K_GOOD_PREFIX + game.game_id, s), 2000);
    return () => clearTimeout(t);
  }, [game]);

  const updGame = fn => setGame(prev => {
    try {
      const c = clone(prev);
      fn(c);
      const next = normalizeGame(c);
      window.__turingPending = next;
      return next;
    } catch (e) {
      try { console.error(e); } catch (_) {}
      return prev;
    }
  });

  const updNpc = fn => updGame(g => {
    const target = g.npcs[npcIdx];
    if (target) fn(target);
  });

  const updCena = fn => updNpc(d => {
    if (curSc && d.cenas?.[curSc.id]) fn(d.cenas[curSc.id]);
  });

  const activeTreeObj = d => curSc ? d.cenas?.[curSc.id] : d.extras?.[aba];
  const updTreeIn = fn => updNpc(d => { const t = activeTreeObj(d); if (t) fn(t); });
  const updNodeIn = (id, fn) => updTreeIn(t => { const n = A(t.nos).find(z => z.id === id); if (n) fn(n); });

  const focusNodeDom = (targetAba, nodeId) => {
    setTimeout(() => {
      if (!nodeId) return;
      setSel(targetAba + "|" + nodeId);
      const esc = window.CSS && CSS.escape ? CSS.escape(nodeId) : nodeId.replace(/"/g, '\\"');
      const el = document.querySelector('[data-node="' + esc + '"]');
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        el.classList.remove("jump-flash");
        void el.offsetWidth;
        el.classList.add("jump-flash");
      }
    }, 60);
  };

  const jumpTo = (targetAba, nodeId) => {
    if (targetAba && targetAba !== aba) updNpc(d => { d.aba = targetAba; });
    focusNodeDom(targetAba || aba, nodeId);
  };

  const jumpNpcNode = (targetNpcIdx, targetAba, nodeId) => {
    updGame(g => {
      g.npc_ativo = targetNpcIdx;
      if (g.npcs[targetNpcIdx] && targetAba) g.npcs[targetNpcIdx].aba = targetAba;
    });
    focusNodeDom(targetAba || cfg.cenas[0]?.id, nodeId);
  };

  /* Gerenciamento Multi-Jogo e Aplicação do Auto-Detector */
  const switchGame = targetId => {
    if (targetId === game.game_id) return;
    const loaded = loadGameById(targetId);
    if (loaded) {
      setSel(null);
      setGame(loaded);
      flash("Jogo aberto: " + loaded.game_nome);
    }
  };

  const createGame = (nome, tpl, th) => {
    const ng = createNewGame(nome, tpl, th);
    setSel(null);
    setGame(ng);
  };

  const deleteGame = targetId => {
    if (targetId === TURING_OFFICIAL_ID) return;
    lsDel(K_GAME_PREFIX + targetId);
    lsDel(K_GOOD_PREFIX + targetId);
    const nextList = reg.list.filter(x => x.id !== targetId);
    const nextActive = game.game_id === targetId ? TURING_OFFICIAL_ID : game.game_id;
    const nextReg = { activeId: nextActive, list: nextList };
    saveRegistry(nextReg);
    setReg(nextReg);
    if (game.game_id === targetId) {
      setSel(null);
      setGame(loadGameById(TURING_OFFICIAL_ID) || buildOfficialTuringGame());
    }
    flash("Jogo removido do navegador.");
  };

  const applyDetectedFile = (det, mode, optNpcIdx) => {
    setSel(null);
    if (det.kind === "game") {
      const norm = normalizeGame(det.payload);
      if (mode === "clone_game") {
        norm.game_id = slug(norm.game_nome) + "_" + Math.random().toString(36).slice(2, 6);
        norm.game_nome = norm.game_nome + " (Cópia)";
      }
      setGame(norm);
      flash("Jogo carregado: " + norm.game_nome);
      return;
    }

    if (det.kind === "npc") {
      if (mode === "npc_into_turing") {
        const turingGame = loadGameById(TURING_OFFICIAL_ID) || buildOfficialTuringGame();
        const imp = normalizeNpc(det.payload, turingGame.config);
        const ix = turingGame.npcs.findIndex(x => x.npc.id === imp.npc.id || slug(x.npc.nome) === slug(imp.npc.nome));
        if (ix >= 0) { turingGame.npcs[ix] = imp; turingGame.npc_ativo = ix; }
        else { turingGame.npcs.push(imp); turingGame.npc_ativo = turingGame.npcs.length - 1; }
        setGame(normalizeGame(turingGame));
        flash("Importado no Turing Test: " + imp.npc.nome);
        return;
      }
      if (mode === "npc_as_new_game") {
        const tpl = det.isTuringNpc ? "turing_test" : "livre";
        const ng = createNewGame(det.gameName || ("Projeto " + det.npcName), tpl, det.isTuringNpc ? "turing_crt" : "quill_tree");
        ng.npcs = [normalizeNpc(det.payload, ng.config)];
        ng.npc_ativo = 0;
        setGame(normalizeGame(ng));
        flash("Novo jogo criado com " + det.npcName);
        return;
      }
      // npc_into_current
      updGame(g => {
        const imp = normalizeNpc(det.payload, g.config);
        const ix = g.npcs.findIndex(x => x.npc.id === imp.npc.id || slug(x.npc.nome) === slug(imp.npc.nome));
        if (ix >= 0) { g.npcs[ix] = imp; g.npc_ativo = ix; }
        else { g.npcs.push(imp); g.npc_ativo = g.npcs.length - 1; }
      });
      flash("Personagem importado: " + det.npcName);
      return;
    }

    if (det.kind === "chapter_pack") {
      const idx = optNpcIdx !== undefined ? optNpcIdx : npcIdx;
      const list = A(det.payload.cenas_pack || det.payload.dias);
      updGame(g => {
        const targetNpc = g.npcs[idx];
        if (!targetNpc) return;
        list.forEach(item => {
          if (!item?.id) return;
          if (!g.config.cenas.some(c => c.id === item.id)) {
            g.config.cenas.push({ id: item.id, rotulo: item.rotulo || item.id, grupo: item.grupo || "", aberturas: false, matriz: false, veredito: false });
          }
          const scCfg = g.config.cenas.find(c => c.id === item.id);
          const normT = normTree(item.arvore?.nos || item.nos, [N("Entrada", "Abertura", "", [])], true, !!(g.config.modulos.aberturas_dinamicas && scCfg?.aberturas), g.config);
          targetNpc.cenas[item.id] = { nos: normT.nos, matriz: A(item.matriz), veredito: item.veredito || null };
        });
        g.npc_ativo = idx;
        if (list[0]?.id) targetNpc.aba = list[0].id;
      });
      flash("Pacote de capítulos importado!");
      return;
    }

    if (det.kind === "single_tree") {
      const destAba = mode === "tree_into_matching" && det.targetId ? det.targetId : aba;
      updGame(g => {
        const np = g.npcs[npcIdx];
        if (!np) return;
        const scCfg = g.config.cenas.find(c => c.id === destAba);
        const exCfg = g.config.arvores_extras.find(e => e.id === destAba);
        if (!scCfg && !exCfg) {
          g.config.cenas.push({ id: destAba, rotulo: destAba, grupo: "", aberturas: false, matriz: false, veredito: false });
        }
        const isSc = !exCfg;
        const hasAb = !!(isSc && g.config.modulos.aberturas_dinamicas && scCfg?.aberturas);
        const normT = normTree(det.payload.nos, [N(isSc ? "Entrada" : "Raiz", "Abertura", "", [])], isSc, hasAb, g.config);
        if (isSc) {
          np.cenas[destAba] = { nos: normT.nos, matriz: A(det.payload.matriz), veredito: det.payload.veredito || null };
        } else {
          np.extras[destAba] = { nos: normT.nos };
        }
        np.aba = destAba;
      });
      flash("Árvore aplicada em " + destAba + "!");
    }
  };

  const setZ = z => setZoom(Math.min(1.5, Math.max(0.4, Math.round(z * 100) / 100)));
  const TABS = [
    ...cfg.cenas.map(c => [c.id, "📅 " + c.rotulo, "a"]),
    ...cfg.arvores_extras.map(e => [e.id, e.rotulo, e.cor || "p"])
  ];
  const onCls = {
    a: "border-amber-400 bg-amber-400 text-zinc-950 font-bold",
    p: "border-purple-400 bg-purple-400 text-zinc-950 font-bold",
    c: "border-cyan-400 bg-cyan-400 text-zinc-950 font-bold",
    g: "border-emerald-400 bg-emerald-400 text-zinc-950 font-bold",
    r: "border-rose-500 bg-rose-500 text-zinc-950 font-bold"
  };
  const offCls = {
    a: "border-zinc-600 text-amber-400 bg-zinc-950 hover:bg-zinc-800",
    p: "border-zinc-600 text-purple-400 bg-zinc-950 hover:bg-zinc-800",
    c: "border-zinc-600 text-cyan-400 bg-zinc-950 hover:bg-zinc-800",
    g: "border-zinc-600 text-emerald-400 bg-zinc-950 hover:bg-zinc-800",
    r: "border-zinc-600 text-rose-400 bg-zinc-950 hover:bg-zinc-800"
  };

  const activeNos = curSc ? data.cenas?.[curSc.id]?.nos : data.extras?.[aba]?.nos;
  const activeTitulo = curSc
    ? "🌳 [ " + (data.npc.nome || "PERSONAGEM").toUpperCase() + " · " + (curSc.grupo ? curSc.grupo + " · " : "") + curSc.rotulo.toUpperCase() + " ]"
    : (curEx?.rotulo || aba) + " · " + (data.npc.nome || "PERSONAGEM").toUpperCase();
  const activeSub = curSc
    ? ((curSc.aberturas && cfg.modulos.aberturas_dinamicas) ? "Entrada com falas por estado anterior ➔ " : "Abertura ➔ ") + "Ramos ➔ Folhas"
    : (curEx?.sub || "Árvore especial do personagem");

  return h("div", { className: "min-h-screen w-full" },
    /* HEADER DUPLO: BARRA DE JOGO/PERSONAGENS/TEMAS + BARRA DE CENAS */
    h("header", { className: "sticky top-0 z-50 bg-zinc-950 border-b-2 border-zinc-700" },
      h("div", { className: "h-13 py-1 px-3 flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap border-b border-zinc-800" },
        h("button", {
          type: "button",
          onClick: () => setHubOpen(true),
          title: "Trocar de jogo, criar novo jogo ou abrir arquivo salvo anteriormente",
          className: BTN + "border-emerald-500 text-emerald-400 bg-zinc-900 hover:bg-emerald-400 hover:text-zinc-950 font-bold shrink-0"
        }, "📂 JOGO: " + game.game_nome),

        h(Btn, { tone: "a", extra: "shrink-0", onClick: () => setCfgOpen(true), title: "Configurar cenas, módulos e regras deste jogo" }, "⚙ MÓDULOS"),

        h("span", { className: "text-zinc-500 text-sm uppercase shrink-0 ml-1" }, (cfg.termos.npc_plural || "NPCs") + ":"),
        h("div", { className: "flex gap-1 flex-nowrap", role: "tablist" },
          game.npcs.map((item, idx) => {
            const active = idx === npcIdx;
            const wCount = validarNpc(item, cfg).warns.length;
            return h("button", {
              key: idx,
              type: "button",
              role: "tab",
              "aria-selected": active,
              onClick: () => { setSel(null); updGame(g => { g.npc_ativo = idx; }); },
              className: BTN + (active ? "border-emerald-400 bg-emerald-400 text-zinc-950 font-bold" : "border-zinc-700 text-emerald-300 bg-zinc-900 hover:bg-zinc-800")
            }, "👤 " + (item.npc.falante || item.npc.nome || ("#" + (idx + 1))) + (wCount > 0 ? " [⚠" + wCount + "]" : ""));
          }),
          h(Btn, {
            tone: "z",
            title: "Adicionar novo personagem a este jogo",
            onClick: () => {
              setSel(null);
              updGame(g => {
                g.npcs.push(blankNpcForConfig(g.config, g.npcs.length + 1));
                g.npc_ativo = g.npcs.length - 1;
              });
            }
          }, "+ " + (cfg.termos.npc_singular || "NPC").toUpperCase())
        ),

        /* Seletor de Tema + Simulador + Exportar */
        h("div", { className: "flex items-center gap-1.5 ml-auto flex-nowrap shrink-0" },
          h("select", {
            className: inpCls + " !w-48 text-sm !py-0.5",
            value: cfg.theme || "turing_crt",
            "aria-label": "Tema visual",
            title: "Escolher tema visual inspirador",
            onChange: e => updGame(g => { g.config.theme = e.target.value; })
          }, THEMES.map(t => h("option", { key: t.id, value: t.id }, t.label))),
          h(Btn, { tone: "c", onClick: () => setSimOpen(true), title: "Simular conversa desta árvore" }, "▶ SIMULAR"),
          h("span", { role: "status", className: "mx-1 text-sm " + (saved.ok ? "text-emerald-400" : "text-rose-500") }, saved.ok ? "● " + saved.at : "● SEM STORAGE"),
          h(Btn, { tone: "g", onClick: () => setDataOpen(true) }, "💾 SALVAR / ABRIR")
        )
      ),

      /* Barra 2: Cenas / Dias + Árvores Especiais + Zoom */
      h("div", { className: "h-12 px-3 flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap" },
        h("nav", { className: "flex gap-1 flex-nowrap", role: "tablist" },
          TABS.map(([k, nome, t]) =>
            h("button", {
              key: k,
              type: "button",
              role: "tab",
              "aria-selected": aba === k,
              onClick: () => { setSel(null); updNpc(d => { d.aba = k; }); },
              className: BTN + (aba === k ? (onCls[t] || onCls.a) : (offCls[t] || offCls.a))
            }, "[ " + nome + " ]")
          )
        ),
        h("div", { className: "flex items-center gap-1 ml-auto flex-nowrap shrink-0" },
          h(Btn, { tone: "z", onClick: () => setZ(zoom - 0.1), title: "Diminuir zoom" }, "[ − ]"),
          h("button", { type: "button", className: btnCls("z"), onClick: () => setZ(1) }, "[ " + Math.round(zoom * 100) + "% ]"),
          h(Btn, { tone: "z", onClick: () => setZ(zoom + 0.1), title: "Aumentar zoom" }, "[ + ]")
        )
      )
    ),

    /* FLUXOGRAMA */
    h(TreeArea, {
      key: game.game_id + "|" + npcIdx + "|" + aba,
      aba,
      lineTone: curEx ? (curEx.cor || "p") : "g",
      npcId: data.npc.id,
      titulo: activeTitulo,
      sub: activeSub,
      nos: activeNos,
      evs,
      cfg,
      zoom,
      sel,
      setSel,
      updNodeIn,
      updTreeIn,
      onJumpNode: nid => focusNodeDom(aba, nid)
    }),

    /* PAINEL INFERIOR DO PERSONAGEM E DO JOGO */
    h("section", { className: "p-4 border-t-2 border-zinc-700 bg-zinc-950", "aria-label": "Painel de apoio" },
      h("div", { className: "flex flex-wrap justify-between items-center gap-2 mb-3" },
        h("div", { className: "glow text-xl text-zinc-300" }, "▌ FICHA DE " + (cfg.termos.npc_singular || "PERSONAGEM").toUpperCase() + " · " + (data.npc?.nome || "").toUpperCase()),
        h("div", { className: "flex gap-2" },
          h(Btn, {
            tone: "c",
            extra: "text-sm",
            onClick: () => {
              updGame(g => {
                const copy = clone(g.npcs[npcIdx]);
                copy.npc.nome = copy.npc.nome + " (Cópia)";
                copy.npc.id = slug(copy.npc.id || "npc") + "_copia";
                g.npcs.push(copy);
                g.npc_ativo = g.npcs.length - 1;
              });
              flash("Personagem duplicado!");
            }
          }, "DUPLICAR " + (cfg.termos.npc_singular || "NPC").toUpperCase()),
          game.npcs.length > 1 && h(ConfirmBtn, {
            tone: "r",
            extra: "text-sm",
            ask: "REMOVER DESTE JOGO?",
            onConfirm: () => {
              setSel(null);
              updGame(g => {
                g.npcs.splice(npcIdx, 1);
                g.npc_ativo = Math.max(0, npcIdx - 1);
              });
            }
          }, "REMOVER " + (cfg.termos.npc_singular || "NPC").toUpperCase())
        )
      ),
      h("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-2 mb-4" },
        h("div", null,
          h(Lbl, { cls: "!mt-0" }, "Nome Completo (editável)"),
          h("input", { className: inpCls, value: data.npc?.nome || "", onChange: e => updNpc(d => { d.npc.nome = e.target.value; }) })
        ),
        h("div", null,
          h(Lbl, { cls: "!mt-0" }, "Papel / Subtítulo"),
          h("input", { className: inpCls, value: data.npc?.tipo || "", onChange: e => updNpc(d => { d.npc.tipo = e.target.value; }) })
        ),
        h("div", null,
          h(Lbl, { cls: "!mt-0" }, "ID Interno / Arquivo"),
          h("input", { className: inpCls, value: data.npc?.id || "", onChange: e => updNpc(d => { d.npc.id = slug(e.target.value) || e.target.value; }) })
        ),
        h("div", null,
          h(Lbl, { cls: "!mt-0" }, "Nome exibido nas falas"),
          h("input", { className: inpCls, value: data.npc?.falante || "", onChange: e => updNpc(d => { d.npc.falante = e.target.value; }) })
        )
      ),

      h(Validacao, { data, cfg, onJump: jumpTo }),
      cfg.modulos.inventario && h(Inventario, { data, cfg, updNpc }),
      cfg.modulos.metrica_global && h(MetricaGlobal, { game, updGame, onJumpNpc: jumpNpcNode }),

      curSc && curSc.matriz && cfg.modulos.matriz_transicao && h(Matriz, {
        cenaData: data.cenas?.[curSc.id],
        cfg,
        proxCena: cfg.cenas[curScIdx + 1] || null,
        updCena,
        onJumpNext: nextId => jumpTo(nextId, "Entrada")
      }),
      curSc && curSc.veredito && cfg.modulos.veredito && h(Veredito, {
        cenaData: data.cenas?.[curSc.id],
        scRotulo: curSc.rotulo,
        updCena
      }),

      /* Legenda dinâmica */
      h("div", { className: "flex flex-wrap gap-4 mt-2 text-sm text-zinc-400" },
        cfg.estados_folha.map(est => {
          const tn = TONE_MAP[est.cor] || TONE_MAP.a;
          return h("span", { key: est.nome, className: tn.t }, "■ Folha: " + est.nome);
        }),
        cfg.modulos.inventario && h("span", { className: "text-cyan-400" }, "┄ 🔍 Condicional (REQ)"),
        cfg.modulos.experimental && h("span", { className: "text-amber-300" }, "🧪 Experimental")
      )
    ),

    hubOpen && h(GamesHubModal, {
      reg,
      activeGame: game,
      onSwitchGame: switchGame,
      onCreateGame: createGame,
      onDeleteGame: deleteGame,
      onApplyDetected: applyDetectedFile,
      onResetOfficialTuring: () => {
        lsDel(K_GAME_PREFIX + TURING_OFFICIAL_ID);
        lsDel(K_GOOD_PREFIX + TURING_OFFICIAL_ID);
        setSel(null);
        setGame(buildOfficialTuringGame());
        flash("Turing Test restaurado aos presets originais!");
      },
      onClose: () => setHubOpen(false),
      flash
    }),

    cfgOpen && h(ConfigModal, {
      game,
      updGame,
      onClose: () => setCfgOpen(false)
    }),

    dataOpen && h(DataModal, {
      game,
      activeNpc: data,
      aba,
      onClose: () => setDataOpen(false),
      onOpenSmartFile: det => {
        // Se for de outro jogo ou precisar de decisão, abre o Hub já com o arquivo inspecionado; se for direto compatível, aplica!
        if (det.kind === "game") applyDetectedFile(det, "open_game");
        else if (det.kind === "single_tree") applyDetectedFile(det, "tree_into_matching");
        else if (det.kind === "chapter_pack") applyDetectedFile(det, "pack_into_npc", npcIdx);
        else if (det.kind === "npc") {
          if (det.isTuringNpc && game.game_id !== TURING_OFFICIAL_ID && cfg.template !== "turing_test") {
            applyDetectedFile(det, "npc_into_turing");
          } else {
            applyDetectedFile(det, "npc_into_current");
          }
        }
      },
      flash
    }),

    simOpen && h(SimModal, {
      game,
      npc: data,
      aba,
      setPlayerName: nv => updGame(g => { g.nome_jogador = nv; }),
      onClose: () => setSimOpen(false)
    }),

    toast && h("div", { className: "fixed right-4 bottom-4 z-50 bg-emerald-400 text-zinc-950 border-2 border-emerald-500 px-3 py-1 font-bold dt-card-shadow", role: "status" }, toast)
  );
}

/* ==========================================================================
   ERROR BOUNDARY & BOOT
   ========================================================================== */
class ErrorBoundary extends React.Component {
  constructor(p) {
    super(p);
    this.state = { err: null, info: "", json: "", msg: "" };
  }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    try { console.error(err, info); } catch (e) {}
    this.setState({ info: S(info && info.componentStack).split("\n").slice(0, 8).join("\n") });
  }
  currentJson() {
    try {
      const st = window.__turingPending || window.__turingState;
      if (st) return JSON.stringify(st, null, 2);
    } catch (e) {}
    return "";
  }
  render() {
    if (!this.state.err) return this.props.children;
    const e = this.state.err;
    const copy = async () => {
      const j = this.currentJson();
      try { await navigator.clipboard.writeText(j); this.setState({ msg: "BACKUP COPIADO.", json: "" }); }
      catch (x) { this.setState({ msg: "Copie manualmente o JSON abaixo:", json: j }); }
    };
    return h("div", { className: "max-w-3xl mx-auto mt-10 p-4 border-2 border-rose-500 bg-zinc-950" },
      h("h1", { className: "text-3xl text-rose-500 glow" }, "!! ERRO DE RENDERIZAÇÃO !!"),
      h("pre", { className: "border-2 border-zinc-700 p-2 my-2 overflow-auto max-h-48 whitespace-pre-wrap text-amber-300" }, S(e && e.message ? e.message : e) + (this.state.info ? "\n" + this.state.info : "")),
      h("div", { className: "flex flex-wrap gap-2 my-3" },
        h(Btn, { tone: "g", onClick: copy }, "COPIAR BACKUP JSON ATUAL"),
        h(Btn, { tone: "c", onClick: () => this.props.onRestore(bootInitialSystem()) }, "RECARREGAR PROJETO")
      ),
      this.state.msg && h("p", { className: "text-amber-400" }, "> " + this.state.msg),
      this.state.json && h("textarea", { readOnly: true, value: this.state.json, className: "w-full h-40 bg-zinc-950 border-2 border-zinc-700 text-emerald-300 p-2" })
    );
  }
}

function Root() {
  const [boot, setBoot] = useState(() => ({ sys: bootInitialSystem(), epoch: 0 }));
  return h(
    ErrorBoundary,
    { key: boot.epoch, onRestore: sys => setBoot(b => ({ sys, epoch: b.epoch + 1 })) },
    h(App, { initialBoot: boot.sys })
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(Root));
