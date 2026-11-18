const h = React.createElement;
const { useState, useRef, useLayoutEffect, useEffect } = React;

/* ==========================================================================
   ARMAZENAMENTO ISOLADO POR PAPO / PROJETO
   ========================================================================== */
const K_INDEX = "dtools-games-index-v3";
const K_THEME_PREF = "dtools-theme-pref-v2";
const K_GAME_PREFIX = "dtools-game-v3:";
const K_GOOD_PREFIX = "dtools-game-good-v3:";
const DEFAULT_THEME = "cozy_grove";

const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) {} };

/* ==========================================================================
   TEMAS VISUAIS (SEM EMOJIS POLUINDO, NOMES LIMPOS)
   ========================================================================== */
const THEMES = [
  { id: "cozy_grove", label: "Cozy Lo-Fi (Padrão)" },
  { id: "bw_terminal", label: "Terminal B&W (Preto & Branco)" },
  { id: "crimson_crime", label: "Crimson Crime" },
  { id: "spacehead", label: "Spacehead" },
  { id: "static_dither", label: "Static Dither (1-Bit)" },
  { id: "turing_crt", label: "Terminal RASEC (CRT)" },
  { id: "quill_tree", label: "QuillTree (Manuscrito)" },
  { id: "ink_bw", label: "Ink Paper (Claro P&B)" },
  { id: "synthwave", label: "Synthwave" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "eerie", label: "Eerie Atmosphere" },
  { id: "dungeon", label: "Dungeon Crawler" },
  { id: "shoot_dash", label: "Shoot & Dash" }
];
const THEME_IDS = THEMES.map(t => t.id);

/* ==========================================================================
   ÍCONES VETORIAIS EXCLUSIVOS DO SITE (SVG MINIMALISTA, HERDA COR DO TEMA)
   ========================================================================== */
const SVG_PATHS = {
  logo: [
    ["circle", { cx: 4, cy: 12, r: 2.2 }],
    ["circle", { cx: 19, cy: 6, r: 2.2 }],
    ["circle", { cx: 19, cy: 18, r: 2.2 }],
    ["path", { d: "M6.4 12h4.6c2 0 2.5-6 5.6-6M11 12c2 0 2.5 6 5.6 6" }]
  ],
  play: [["polygon", { points: "6,4 20,12 6,20", fill: "currentColor", stroke: "none" }]],
  plus: [["path", { d: "M12 5v14M5 12h14" }]],
  minus: [["path", { d: "M5 12h14" }]],
  folder: [["path", { d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" }]],
  download: [["path", { d: "M12 4v11m0 0l-4-4m4 4l4-4M4 19h16" }]],
  edit: [["path", { d: "M15.5 4.5l4 4L8 20H4v-4L15.5 4.5z" }]],
  trash: [["path", { d: "M4 7h16M9 7V4h6v3m-7 3v7m4-7v7m4-7v7M6 7l1 13h10l1-13" }]],
  close: [["path", { d: "M6 6l12 12M18 6L6 18" }]],
  branch: [["path", { d: "M5 12h6l4-5h4M11 12l4 5h4M17 5l2 2-2 2M17 15l2 2-2 2" }]],
  sliders: [["path", { d: "M4 7h9m4 0h3M13 5v4M4 17h3m4 0h9M7 15v4" }]],
  back: [["path", { d: "M19 12H5m0 0l5-5m-5 5l5 5" }]],
  arrow: [["path", { d: "M5 12h14m-5-5l5 5-5 5" }]],
  check: [["path", { d: "M5 12.5l4.5 4.5L19 7.5" }]],
  alert: [["path", { d: "M12 3L2.5 20h19L12 3zm0 6v5m0 3.5h.01" }]]
};

function Icon({ name, size }) {
  const s = size || 15;
  const shapes = SVG_PATHS[name] || [];
  return h("svg", {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    style: { flexShrink: 0 }
  }, shapes.map(([tag, attrs], i) => h(tag, { key: i, ...attrs })));
}

/* ==========================================================================
   HELPERS GERAIS E MAPEAMENTO DE TONS
   ========================================================================== */
const S = v => (typeof v === "string" ? v : v == null ? "" : String(v));
const A = v => (Array.isArray(v) ? v : []);
const oneOf = (v, l, d) => (l.includes(v) ? v : d);
const clone = o => JSON.parse(JSON.stringify(o));

const slug = t => S(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const stateKey = t => S(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "Estado";
const uid = prefix => (prefix || "papo") + "_" + Math.random().toString(36).slice(2, 7);
const stripLeadingEmoji = s => S(s).replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\s]+/u, "").trim() || S(s).trim();

const TONE_MAP = {
  g: { label: "Primária (Destaque)", textCls: "fg-pri", boxCls: "tone-box-g", btnKind: "pri" },
  a: { label: "Secundária (Âmbar)", textCls: "fg-sec", boxCls: "tone-box-a", btnKind: "sec" },
  r: { label: "Alerta / Tensão", textCls: "fg-danger", boxCls: "tone-box-r", btnKind: "danger" },
  c: { label: "Informação / Ciano", textCls: "fg-info", boxCls: "tone-box-c", btnKind: "info" },
  p: { label: "Especial / Condicional", textCls: "fg-spec", boxCls: "tone-box-p", btnKind: "spec" }
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
   SISTEMA CONDICIONAL "IF"
   ========================================================================== */
const COND_TYPES = [
  ["npc_natureza", "Natureza do NPC (IA / Humano)"],
  ["visao_atual", "Final / Estado Atual"],
  ["possui_item", "Possui Item / Evidência"],
  ["ferramenta_usada", "Aba Especial Usada"],
  ["desconfianca", "Métrica Global (> / ==)"],
  ["custom", "Condição Livre (Expressão)"]
];
const COND_TYPE_KEYS = COND_TYPES.map(x => x[0]);
const NUM_OPS = [">=", "<=", "==", "!=", ">", "<"];

function defaultCond() {
  return { tipo: "npc_natureza", op: "==", valor: "Sintético" };
}

function normCond(c) {
  if (!c || typeof c !== "object") return defaultCond();
  const tipo = oneOf(c.tipo, COND_TYPE_KEYS, "npc_natureza");
  let op = S(c.op).trim() || "==";
  let valor = S(c.valor).trim();
  if (tipo === "npc_natureza") {
    op = oneOf(op, ["==", "!="], "==");
    valor = oneOf(valor, ["Sintético", "Humano"], "Sintético");
  } else if (tipo === "visao_atual") {
    op = oneOf(op, ["==", "!="], "==");
  } else if (tipo === "possui_item") {
    op = oneOf(op, ["==", "!="], "==");
  } else if (tipo === "ferramenta_usada") {
    op = oneOf(op, ["==", "!="], "==");
    if (!valor) valor = "vies";
  } else if (tipo === "desconfianca") {
    op = oneOf(op, NUM_OPS, ">=");
    valor = String(Math.max(0, Math.floor(+valor || 1)));
  }
  return { tipo, op, valor };
}

function condHumanLabel(c) {
  const nc = normCond(c);
  if (nc.tipo === "npc_natureza") return "NPC " + nc.op + " " + (nc.valor === "Sintético" ? "IA / Sintético" : "Humano");
  if (nc.tipo === "visao_atual") return "Estado " + nc.op + " " + (nc.valor || "(estado)");
  if (nc.tipo === "possui_item") return (nc.op === "!=" ? "Sem " : "Tem ") + (nc.valor || "(item)");
  if (nc.tipo === "ferramenta_usada") return "Aba Especial " + nc.op + " " + nc.valor;
  if (nc.tipo === "desconfianca") return "Métrica " + nc.op + " " + nc.valor;
  return nc.valor || "(condição livre)";
}

function condTxtExpr(c) {
  const nc = normCond(c);
  if (nc.tipo === "npc_natureza") return "NPC_NATUREZA " + nc.op + " " + nc.valor;
  if (nc.tipo === "visao_atual") return "VISAO " + nc.op + " " + (nc.valor || "NONE");
  if (nc.tipo === "possui_item") return (nc.op === "!=" ? "!HAS_ITEM " : "HAS_ITEM ") + (nc.valor || "NONE");
  if (nc.tipo === "ferramenta_usada") return "FERRAMENTA " + nc.op + " " + nc.valor;
  if (nc.tipo === "desconfianca") return "DESCONFIANCA " + nc.op + " " + nc.valor;
  return (nc.valor || "TRUE").replace(/\s*\n\s*/g, " ").trim();
}

function evalCondInSim(c, ctx) {
  const nc = normCond(c);
  if (nc.tipo === "npc_natureza") {
    const eq = ctx.npcNatureza === nc.valor;
    return nc.op === "!=" ? !eq : eq;
  }
  if (nc.tipo === "visao_atual") {
    const eq = ctx.visao === nc.valor;
    return nc.op === "!=" ? !eq : eq;
  }
  if (nc.tipo === "possui_item") {
    const has = ctx.ownedEvs.has(nc.valor);
    return nc.op === "!=" ? !has : has;
  }
  if (nc.tipo === "ferramenta_usada") {
    let eq = false;
    if (nc.valor === "qualquer") eq = ctx.ferramenta !== "nenhuma";
    else eq = ctx.ferramenta.toLowerCase() === nc.valor.toLowerCase();
    return nc.op === "!=" ? !eq : eq;
  }
  if (nc.tipo === "desconfianca") {
    const a = ctx.desconf, b = +nc.valor || 0;
    if (nc.op === ">=") return a >= b;
    if (nc.op === "<=") return a <= b;
    if (nc.op === "==") return a === b;
    if (nc.op === "!=") return a !== b;
    if (nc.op === ">") return a > b;
    if (nc.op === "<") return a < b;
  }
  return !!ctx.customTrue;
}

/* ==========================================================================
   CONFIGURAÇÃO FLEXÍVEL DE JOGO / PAPO
   ========================================================================== */
function buildScenesList(count, namingMode, aberturasDinamicas, usarVereditoMatriz) {
  const n = Math.max(1, Math.min(24, Math.floor(+count || 1)));
  const out = [];
  for (let i = 1; i <= n; i++) {
    let id = "D" + i;
    let rotulo = "Dia " + i;
    let grupo = "";
    if (namingMode === "semanas") {
      const sem = Math.ceil(i / 3);
      grupo = "S" + sem;
      rotulo = grupo + " · D" + i;
    } else if (namingMode === "papo") {
      id = "PAPO_" + i;
      rotulo = "Papo " + i;
    } else if (namingMode === "cena") {
      id = "CENA_" + i;
      rotulo = "Cena " + i;
    }
    const isEndOfCycle = namingMode === "semanas" ? (i % 3 === 0 || i === n) : (i === n);
    out.push({
      id,
      rotulo,
      grupo,
      aberturas: !!(aberturasDinamicas && i > 1),
      matriz: !!(usarVereditoMatriz && !isEndOfCycle && n > 1),
      veredito: !!(usarVereditoMatriz && isEndOfCycle)
    });
  }
  return out;
}

function makeTuringConfig(themeOverride) {
  return {
    template: "turing_test",
    theme: themeOverride || DEFAULT_THEME,
    modulos: {
      inventario: true,
      metrica_global: true,
      aberturas_dinamicas: true,
      matriz_transicao: true,
      veredito: true,
      experimental: false,
      export_turing_txt: true
    },
    termos: {
      npc_singular: "NPC",
      npc_plural: "NPCs",
      item_a: "Objeto",
      item_a_prefix: "EV",
      item_b: "Informação",
      item_b_prefix: "INF",
      metrica_nome: "Autodesconfiança Global"
    },
    estados_folha: [
      { nome: "Confiança", cor: "g" },
      { nome: "Dúvida", cor: "a" },
      { nome: "Pressão", cor: "r" }
    ],
    cenas: buildScenesList(6, "semanas", true, true),
    arvores_extras: [
      { id: "VIES", rotulo: "Viés", cor: "p", modo_raiz: "escolhas", sub: "Custo: 3 tokens · Jogador escolhe na Raiz e segue ramo alternativo até o Fim" },
      { id: "INJECAO", rotulo: "Injeção", cor: "c", modo_raiz: "escolhas", sub: "Custo: 4 tokens · Jogador escolhe na Raiz e segue ramo alternativo até o Fim" }
    ]
  };
}

function makeSimpleCleanConfig(themeOverride) {
  return {
    template: "livre",
    theme: themeOverride || DEFAULT_THEME,
    modulos: {
      inventario: false,
      metrica_global: false,
      aberturas_dinamicas: false,
      matriz_transicao: false,
      veredito: false,
      experimental: false,
      export_turing_txt: false
    },
    termos: {
      npc_singular: "NPC",
      npc_plural: "NPCs",
      item_a: "Item",
      item_a_prefix: "IT",
      item_b: "Informação",
      item_b_prefix: "INF",
      metrica_nome: "Variável Global"
    },
    estados_folha: [],
    cenas: buildScenesList(1, "papo", false, false),
    arvores_extras: []
  };
}

function normalizeConfig(rawCfg, isTuringHint) {
  const base = isTuringHint || !rawCfg || rawCfg?.template === "turing_test"
    ? makeTuringConfig(rawCfg?.theme)
    : makeSimpleCleanConfig(rawCfg?.theme);
  if (!rawCfg || typeof rawCfg !== "object") return base;

  const hasExplicitEstados = Array.isArray(rawCfg.estados_folha);
  const estados = hasExplicitEstados
    ? rawCfg.estados_folha.filter(x => x && S(x.nome).trim()).map(x => ({ nome: S(x.nome).trim(), cor: oneOf(x.cor, TONE_KEYS, "a") }))
    : base.estados_folha;

  const cenas = A(rawCfg.cenas)
    .filter(x => x && S(x.id).trim())
    .map(x => ({
      id: S(x.id).trim(),
      rotulo: stripLeadingEmoji(x.rotulo) || S(x.id).trim(),
      grupo: S(x.grupo).trim(),
      aberturas: !!x.aberturas,
      matriz: !!x.matriz,
      veredito: !!x.veredito
    }));

  const extras = A(rawCfg.arvores_extras !== undefined ? rawCfg.arvores_extras : base.arvores_extras)
    .filter(x => x && S(x.id).trim())
    .map(x => ({
      id: S(x.id).trim().toUpperCase(),
      rotulo: stripLeadingEmoji(x.rotulo) || S(x.id).trim(),
      cor: oneOf(x.cor, TONE_KEYS, "p"),
      modo_raiz: oneOf(x.modo_raiz, ["escolhas", "fala"], "escolhas"),
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
    termos: {
      ...base.termos,
      ...(rawCfg.termos || {}),
      npc_singular: "NPC",
      npc_plural: "NPCs"
    },
    estados_folha: estados,
    cenas: cenas.length ? cenas : base.cenas,
    arvores_extras: extras
  };
}

/* ==========================================================================
   CONSTRUTORES E NORMALIZAÇÃO DE NÓS E NPCS
   ========================================================================== */
const OP = (texto, proximo_no, efeito, cond) => ({
  texto: S(texto),
  proximo_no: S(proximo_no),
  efeito: S(efeito),
  cond: cond ? normCond(cond) : null
});

const N = (id, rotulo, fala, opcoes, extra) => ({
  id: S(id),
  rotulo: S(rotulo),
  fala_npc: S(fala),
  fala_condicional: [],
  condicional: null,
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
  fala_condicional: [],
  condicional: null,
  folha: { visao_jogador: S(visao) },
  opcoes: [],
  desbloqueios: [],
  confronto_evidencia: null,
  evidencia_desbloqueada: "",
  trava_rota_secreta: "",
  desconfianca: 0,
  ...(extra || {})
});

const IFN = (id, cond, seVerdadeiro, seFalso, rotulo) => ({
  id: S(id),
  rotulo: S(rotulo) || "Desvio IF",
  fala_npc: "",
  fala_condicional: [],
  condicional: {
    cond: normCond(cond),
    se_verdadeiro: S(seVerdadeiro),
    se_falso: S(seFalso)
  },
  folha: null,
  opcoes: [],
  desbloqueios: [],
  confronto_evidencia: null,
  evidencia_desbloqueada: "",
  trava_rota_secreta: "",
  desconfianca: 0
});

function stateTone(cfg, visaoNome) {
  if (!A(cfg?.estados_folha).length) return TONE_MAP.g;
  const found = A(cfg?.estados_folha).find(e => e.nome === visaoNome);
  return TONE_MAP[found?.cor || "a"] || TONE_MAP.a;
}

function defaultLeafName(cfg) {
  const est = A(cfg?.estados_folha);
  if (!est.length) return "";
  if (est.some(e => e.nome === "Dúvida")) return "Dúvida";
  if (est.some(e => e.nome === "Neutro")) return "Neutro";
  return est[0].nome;
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
  const canUseAb = !!(isScene && hasAberturas && validStates.length > 0);
  const used = new Set();

  const nos = base.map((n, i) => {
    let id = i === 0 ? rootNewId : S(n?.id).trim();
    if (!id || used.has(id)) {
      let k = i + 1;
      id = "no-" + k;
      while (used.has(id)) { k += 1; id = "no-" + k; }
    }
    used.add(id);

    const condicional = i > 0 && n?.condicional && typeof n.condicional === "object"
      ? {
          cond: normCond(n.condicional.cond),
          se_verdadeiro: mapId(S(n.condicional.se_verdadeiro).trim()),
          se_falso: mapId(S(n.condicional.se_falso).trim())
        }
      : null;

    const rawVis = S(n?.folha?.visao_jogador).trim();
    const folha = !condicional && n?.folha && typeof n.folha === "object"
      ? { visao_jogador: !validStates.length ? "" : (validStates.includes(rawVis) ? rawVis : (rawVis || defState)) }
      : null;

    const fala = S(n?.fala_npc);
    const falaCond = A(n?.fala_condicional)
      .filter(fc => fc && typeof fc === "object")
      .map(fc => ({ cond: normCond(fc.cond), fala: S(fc.fala) }));

    const ev = S(n?.confronto_evidencia?.evidencia_id) || S(n?.confronto?.requer) || S(n?.ev);
    const perg = S(n?.confronto_evidencia?.pergunta_jogador ?? n?.confronto?.pergunta_jogador);

    const rawDesb = A(n?.desbloqueios ?? n?.confrontos);
    const desbloqueios = folha || condicional
      ? []
      : rawDesb
          .filter(x => x && S(x.ev || x.requer))
          .map(x => ({ ev: S(x.ev || x.requer).trim(), no: mapId(S(x.no).trim()) }));

    const out = {
      id,
      rotulo: stripLeadingEmoji(n?.rotulo),
      fala_npc: fala,
      fala_condicional: condicional ? [] : falaCond,
      condicional,
      folha,
      opcoes: folha || condicional ? [] : A(n?.opcoes).slice(0, 8).map(o => ({
        texto: S(o?.texto),
        proximo_no: mapId(S(o?.proximo_no).trim()),
        efeito: S(o?.efeito),
        cond: o?.cond ? normCond(o.cond) : null
      })),
      desbloqueios,
      confronto_evidencia: ev && !condicional ? { evidencia_id: ev.trim(), pergunta_jogador: perg, resposta_npc: fala } : null,
      evidencia_desbloqueada: S(n?.evidencia_desbloqueada || n?.ganha_evidencia || n?.ganha_informacao).trim(),
      trava_rota_secreta: S(n?.trava_rota_secreta).trim(),
      desconfianca: Math.max(0, Math.floor(+n?.desconfianca || 0))
    };

    if (canUseAb && i === 0) {
      const abIn = n?.aberturas && typeof n.aberturas === "object" ? n.aberturas : {};
      const abOut = {};
      A(cfg.estados_folha).forEach(est => {
        const sk = stateKey(est.nome);
        abOut[sk] = S(abIn[sk] ?? abIn[est.nome]);
      });
      const defSk = stateKey(defState);
      if (defSk && !abOut[defSk] && !isPlaceholderFala(fala)) abOut[defSk] = fala;
      out.aberturas = abOut;
      if (defSk && abOut[defSk]) out.fala_npc = abOut[defSk];
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
    const hasAb = !!(cfg.modulos.aberturas_dinamicas && sc.aberturas && cfg.estados_folha.length > 0);
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
      if (defSk && root.aberturas[defSk]) root.fala_npc = root.aberturas[defSk];
    }

    const matriz = sc.matriz && cfg.modulos.matriz_transicao && mKeys.length > 0
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
      src = d?.arvore_vies?.nos ?? d1?.arvores?.vies?.nos ?? (Array.isArray(d1?.vieses) ? fxLegacyTree(d1.vieses, "Enviesamento", "", defState) : undefined);
    }
    if (!src && ex.id === "INJECAO") {
      src = d?.arvore_injecao?.nos ?? d1?.arvores?.injecao?.nos ?? (Array.isArray(d1?.injecoes) ? fxLegacyTree(d1.injecoes, "Injeção", "", defState) : undefined);
    }
    extrasOut[ex.id] = normTree(src, [N("Raiz", ex.rotulo, "", [])], false, false, cfg);
  });

  const nome = S(d?.npc?.nome).trim() || "NPC 1";
  const falante = S(d?.npc?.falante).trim() || nome.split(" ")[0] || "NPC";
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
  return normalizeNpc({
    versao: 7,
    npc: { id: "npc_" + idx, nome: "NPC " + idx, falante: "NPC " + idx, tipo: "" }
  }, cfg);
}

function allTreesOfNpc(npc, cfg) {
  return [
    ...cfg.cenas.map(c => [c.id, npc.cenas?.[c.id]?.nos || []]),
    ...cfg.arvores_extras.map(e => [e.id, npc.extras?.[e.id]?.nos || []])
  ];
}

/* ==========================================================================
   CRIAÇÃO E PERSISTÊNCIA DE PROJETOS
   ========================================================================== */
function createGameFromCustomConfig(nome, cfg, metricaLimite) {
  const normCfg = normalizeConfig(cfg, cfg?.template === "turing_test");
  return {
    game_id: uid("papo"),
    game_nome: S(nome).trim() || "Novo Papo",
    config: normCfg,
    npc_ativo: 0,
    nome_jogador: "Jogador",
    metricas: {
      desconfianca: {
        limite: Math.max(1, Math.floor(+metricaLimite || 3)),
        consequencia: ""
      }
    },
    npcs: [blankNpcForConfig(normCfg, 1)]
  };
}

function normalizeGame(raw, fallbackTheme) {
  if (!raw || typeof raw !== "object") return createGameFromCustomConfig("Novo Papo", makeTuringConfig(fallbackTheme), 3);
  const meta = raw.dtools_meta || {};
  const isTuringHint = !raw.config && (raw.versao_workspace === 2 || A(raw.npcs).some(n => n?.semanas || n?.arvore_vies));
  const cfg = normalizeConfig(raw.config || { template: isTuringHint ? "turing_test" : "livre", theme: fallbackTheme || DEFAULT_THEME }, isTuringHint);
  const rawNpcs = A(raw.npcs);
  const npcs = rawNpcs.length ? rawNpcs.map(n => normalizeNpc(n, cfg)) : [blankNpcForConfig(cfg, 1)];
  const idx = Math.min(npcs.length - 1, Math.max(0, Math.floor(+raw.npc_ativo || 0)));
  return {
    game_id: S(raw.game_id || meta.game_id).trim() || uid("papo"),
    game_nome: S(raw.game_nome || meta.game_name).trim() || "Papo Carregado",
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
      if (parsed && Array.isArray(parsed.list)) return parsed;
    }
  } catch (e) {}
  return { activeId: "", list: [] };
}

function saveRegistry(reg) {
  lsSet(K_INDEX, JSON.stringify(reg));
}

function loadGameById(gameId) {
  if (!gameId) return null;
  const tryParse = k => {
    try {
      const raw = lsGet(k);
      return raw ? normalizeGame(JSON.parse(raw)) : null;
    } catch (e) { return null; }
  };
  return tryParse(K_GAME_PREFIX + gameId) || tryParse(K_GOOD_PREFIX + gameId);
}

function detectImportedFile(parsed) {
  if (!parsed || typeof parsed !== "object") throw new Error("Arquivo JSON vazio ou inválido.");
  const meta = parsed.dtools_meta || {};

  if (meta.scope === "single_tree" || (Array.isArray(parsed.nos) && !parsed.npc && !parsed.npcs)) {
    return { kind: "single_tree", gameName: meta.game_name || "", targetId: meta.target_id || "", payload: parsed };
  }
  if (meta.scope === "chapter_pack" || (Array.isArray(parsed.cenas_pack) && !parsed.npcs)) {
    return { kind: "chapter_pack", gameName: meta.game_name || "", payload: parsed };
  }
  if (meta.scope === "game" || Array.isArray(parsed.npcs)) {
    return { kind: "game", gameName: S(parsed.game_nome || meta.game_name || "Papo Global"), payload: parsed };
  }
  if (meta.scope === "npc" || (parsed.npc && (parsed.semanas || parsed.dias || parsed.cenas))) {
    const isTuringNpc = !!(parsed.semanas || parsed.arvore_vies || parsed.arvore_injecao || (parsed.dias?.D1 && !parsed.cenas));
    return { kind: "npc", isTuringNpc, gameName: meta.game_name || "", npcName: S(parsed.npc?.nome || "NPC"), payload: parsed };
  }
  throw new Error("Formato JSON não reconhecido pelo Dialogue Tool.");
}

/* ==========================================================================
   EXPORTADORES (JSON ESCOPOS + TXT JOGO C + RUNTIME + ROTEIRO)
   ========================================================================== */
function makeMeta(game, scope, extra) {
  return {
    app: "DialogueTools",
    format_version: 3,
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
  const { desbloqueios, confronto_evidencia: c, evidencia_desbloqueada: g, aberturas, opcoes, fala_condicional, condicional, ...r } = n;
  const opsOut = A(opcoes).map(o => {
    const baseOp = { texto: o.texto, proximo_no: o.proximo_no, efeito: o.efeito };
    if (o.cond) baseOp.cond = o.cond;
    return baseOp;
  });
  const o = {
    ...r,
    opcoes: opsOut,
    confrontos: A(desbloqueios).map(x => ({ requer: x.ev, no: x.no }))
  };
  if (condicional) o.condicional = clone(condicional);
  if (A(fala_condicional).length) o.fala_condicional = clone(fala_condicional);
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
    const hasAb = !!(cfg.modulos.aberturas_dinamicas && sc.aberturas && cfg.estados_folha.length > 0);
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
    dtools_meta: makeMeta(game, "chapter_pack", { npc_id: npc.npc.id, npc_name: npc.npc.nome, group_id: groupName || "TODAS" }),
    cenas_pack: matching.map(sc => {
      const cData = npc.cenas?.[sc.id] || { nos: [], matriz: [], veredito: null };
      const hasAb = !!(cfg.modulos.aberturas_dinamicas && sc.aberturas && cfg.estados_folha.length > 0);
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
  const hasAb = !!(sc && cfg.modulos.aberturas_dinamicas && sc.aberturas && cfg.estados_folha.length > 0);
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
      type: n.condicional ? "if_branch" : (n.folha ? "leaf" : "speech"),
      speaker: n.condicional ? null : fal,
      text: n.condicional ? null : n.fala_npc,
      ...(A(n.fala_condicional).length ? { conditional_texts: n.fala_condicional } : {}),
      ...(n.condicional ? { branch_if: n.condicional } : {}),
      ...(hasAb && idx === 0 && n.aberturas ? { openings_by_state: n.aberturas } : {}),
      choices: n.condicional ? [] : [
        ...A(n.opcoes).map(o => ({ text: o.texto, next: o.proximo_no, req: null, if_cond: o.cond || null })),
        ...A(n.desbloqueios).map(x => ({
          text: S(by[x.no]?.confronto_evidencia?.pergunta_jogador),
          next: x.no,
          req: x.ev,
          if_cond: null
        }))
      ],
      leaf_state: n.folha ? (n.folha.visao_jogador || "END") : null,
      grant_item: n.evidencia_desbloqueada || null,
      metric_delta: n.desconfianca || 0
    }));
  };
  const trees = {};
  cfg.cenas.forEach(sc => { trees[sc.id] = mapNos(npc.cenas?.[sc.id]?.nos, !!(cfg.modulos.aberturas_dinamicas && sc.aberturas && cfg.estados_folha.length > 0)); });
  cfg.arvores_extras.forEach(ex => { trees[ex.id] = mapNos(npc.extras?.[ex.id]?.nos, false); });
  return { game_id: game.game_id, npc: npc.npc, items: npc.evidencias, trees };
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
    L.push("[NODE: " + rn(n.id) + "]");
    if (n.condicional) {
      L.push("TYPE: IF");
      L.push("IF: " + condTxtExpr(n.condicional.cond) + " -> " + rn(n.condicional.se_verdadeiro));
      L.push("ELSE: -> " + rn(n.condicional.se_falso));
      if (n.evidencia_desbloqueada) {
        const isInf = A(npc.evidencias).some(e => e.id === n.evidencia_desbloqueada && e.tipo === "informacao");
        L.push((isInf ? "GANHA_INF: " : "GANHA_EV: ") + n.evidencia_desbloqueada);
      }
      if (n.desconfianca > 0) L.push("DESCONFIANCA: +" + n.desconfianca);
      L.push("");
      return;
    }

    L.push("SPEAKER: " + fal);
    const ab = isDay && sc.aberturas && cfg.modulos.aberturas_dinamicas && cfg.estados_folha.length > 0 && idx === 0 ? n.aberturas : null;
    if (ab && (S(ab.Duvida) || S(ab.Confianca) || S(ab.Pressao))) {
      L.push("TEXT: " + one(ab.Duvida || n.fala_npc));
      if (S(ab.Confianca).trim()) L.push("TEXT_CONFIANCA: " + one(ab.Confianca));
      if (S(ab.Pressao).trim()) L.push("TEXT_PRESSAO: " + one(ab.Pressao));
    } else {
      L.push("TEXT: " + one(n.fala_npc));
    }
    A(n.fala_condicional).forEach(fc => {
      if (S(fc.fala).trim()) L.push("TEXT_IF: [" + condTxtExpr(fc.cond) + "] " + one(fc.fala));
    });

    A(n.opcoes).forEach(o => {
      L.push("CHOICE: " + one(o.texto) + " -> " + rn(o.proximo_no));
      if (o.cond) L.push("CHOICE_IF: " + condTxtExpr(o.cond));
    });
    A(n.desbloqueios).forEach(x => {
      L.push(
        "CHOICE: " + one(by[x.no]?.confronto_evidencia?.pergunta_jogador) + " -> " + rn(x.no),
        "REQ: " + x.ev
      );
    });
    if (n.folha) L.push("LEAF: " + (n.folha.visao_jogador || "FIM"));
    if (n.evidencia_desbloqueada) {
      const isInf = A(npc.evidencias).some(e => e.id === n.evidencia_desbloqueada && e.tipo === "informacao");
      L.push((isInf ? "GANHA_INF: " : "GANHA_EV: ") + n.evidencia_desbloqueada);
    }
    if (n.desconfianca > 0) L.push("DESCONFIANCA: +" + n.desconfianca);
    L.push("");
  });
  return L.join("\n");
}

function toReadableScript(npc, game) {
  const cfg = game.config;
  const targets = [
    ...cfg.cenas.map(c => [c.id, c.rotulo, npc.cenas?.[c.id]?.nos || [], c.aberturas]),
    ...cfg.arvores_extras.map(e => [e.id, e.rotulo, npc.extras?.[e.id]?.nos || [], false])
  ];
  const out = [
    "================================================================",
    "PROJETO: " + game.game_nome + " | NPC: " + npc.npc.nome,
    "================================================================",
    ""
  ];
  targets.forEach(([id, rot, nos, hasAb]) => {
    out.push("### [" + id + "] " + rot);
    out.push("");
    const by = {};
    A(nos).forEach(n => { by[n.id] = n; });
    A(nos).forEach((n, idx) => {
      if (n.condicional) {
        out.push("* (" + n.id + ") [IF: " + condHumanLabel(n.condicional.cond) + "]");
        out.push("    ENTÃO --> (" + (n.condicional.se_verdadeiro || "?") + ")");
        out.push("    SENÃO --> (" + (n.condicional.se_falso || "?") + ")");
        out.push("");
        return;
      }
      const tags = [];
      if (n.folha) tags.push("FIM" + (n.folha.visao_jogador ? ": " + n.folha.visao_jogador : ""));
      if (n.evidencia_desbloqueada) tags.push("GANHA: " + n.evidencia_desbloqueada);
      if (n.desconfianca > 0) tags.push("MÉTRICA +" + n.desconfianca);
      out.push("* (" + n.id + ") " + (n.rotulo ? "[" + n.rotulo + "] " : "") + (tags.length ? "{" + tags.join(" | ") + "}" : ""));
      if (hasAb && cfg.modulos.aberturas_dinamicas && cfg.estados_folha.length > 0 && idx === 0 && n.aberturas) {
        cfg.estados_folha.forEach(est => {
          const v = S(n.aberturas[stateKey(est.nome)]);
          if (v) out.push("    " + (npc.npc.falante || npc.npc.nome) + " (" + est.nome + "): \"" + v + "\"");
        });
      } else {
        out.push("    " + (npc.npc.falante || npc.npc.nome) + ": \"" + S(n.fala_npc) + "\"");
      }
      A(n.fala_condicional).forEach(fc => {
        out.push("    [SE " + condHumanLabel(fc.cond) + "] " + (npc.npc.falante || npc.npc.nome) + ": \"" + S(fc.fala) + "\"");
      });
      A(n.opcoes).forEach((o, j) => {
        const cTag = o.cond ? " [SE " + condHumanLabel(o.cond) + "]" : "";
        out.push("      [" + (LET[j] || j + 1) + "]" + cTag + " Jogador: \"" + o.texto + "\"  --> (" + (o.proximo_no || "?") + ")");
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
   VALIDAÇÃO ESTRUTURAL
   ========================================================================== */
function isUntouchedBlankScene(sc, idx, nos) {
  if (idx === 0 || nos.length !== 1) return false;
  const r = nos[0];
  const abVals = r.aberturas ? Object.values(r.aberturas) : [];
  const abEmpty = abVals.every(v => !S(v).trim());
  return !S(r.fala_npc).trim() && abEmpty && !A(r.opcoes).length && !A(r.desbloqueios).length && !A(r.fala_condicional).length;
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
    const ex = !sc ? cfg.arvores_extras.find(e => e.id === aba) : null;
    const isScene = !!sc;

    if (isScene && isUntouchedBlankScene(sc, scIdx, nos)) {
      blankScenes.push(sc);
      return;
    }

    const ids = new Set(nos.map(n => n.id));
    const P = plan(nos);
    P.roots.slice(1).forEach(r => pushW(aba, r, "nó solto / órfão (nenhum caminho leva até ele)"));

    nos.forEach((n, idx) => {
      const isRoot = idx === 0;
      const usesAb = isScene && sc.aberturas && cfg.modulos.aberturas_dinamicas && cfg.estados_folha.length > 0 && isRoot;
      const rootSkipsSpeech = !isScene && isRoot && ex?.modo_raiz !== "fala";

      if (isTuringC && n.id.length > 31) pushW(aba, n.id, "ID maior que 31 caracteres");

      if (n.condicional) {
        const c = n.condicional;
        if (c.cond?.tipo === "custom" && !S(c.cond.valor).trim()) pushW(aba, n.id, "condição livre do IF vazia");
        if (!c.se_verdadeiro) pushW(aba, n.id, "IF sem destino para ENTÃO (Verdadeiro)");
        else if (!ids.has(c.se_verdadeiro)) pushW(aba, n.id, "IF ENTÃO aponta para nó inexistente (" + c.se_verdadeiro + ")");
        if (!c.se_falso) pushW(aba, n.id, "IF sem destino para SENÃO (Falso)");
        else if (!ids.has(c.se_falso)) pushW(aba, n.id, "IF SENÃO aponta para nó inexistente (" + c.se_falso + ")");
        return;
      }

      if (usesAb) {
        const ab = n.aberturas || {};
        cfg.estados_folha.forEach(est => {
          const val = S(ab[stateKey(est.nome)]);
          if (!val.trim()) pushW(aba, n.id, "fala inicial para '" + est.nome + "' está vazia");
          if (isTuringC && val.length > 500) pushW(aba, n.id, "abertura '" + est.nome + "' excede 500 caracteres");
        });
      } else if (!rootSkipsSpeech) {
        if (!S(n.fala_npc).trim()) pushW(aba, n.id, "fala do NPC vazia");
        if (isTuringC && S(n.fala_npc).length > 500) pushW(aba, n.id, "fala excede 500 caracteres");
      }

      A(n.fala_condicional).forEach((fc, fi) => {
        if (!S(fc.fala).trim()) pushW(aba, n.id, "fala condicional IF #" + (fi + 1) + " vazia");
      });

      if (n.confronto_evidencia) {
        const perg = S(n.confronto_evidencia.pergunta_jogador);
        const cid = S(n.confronto_evidencia.evidencia_id);
        if (!perg.trim()) pushW(aba, n.id, "confronto sem fala do jogador");
        if (cfg.modulos.inventario && cid && !evIds.has(cid)) pushW(aba, n.id, "confronto pede item não cadastrado (" + cid + ")");
      }

      n.opcoes.forEach((o, j) => {
        const letra = "opção " + (LET[j] || j + 1);
        if (!o.texto.trim()) pushW(aba, n.id, letra + " sem texto");
        if (!o.proximo_no) pushW(aba, n.id, letra + " sem destino");
        else if (!ids.has(o.proximo_no)) pushW(aba, n.id, letra + " aponta para nó inexistente (" + o.proximo_no + ")");
      });

      if (isTuringC && n.opcoes.length + n.desbloqueios.length > 4) {
        pushW(aba, n.id, "mais de 4 escolhas (" + (n.opcoes.length + n.desbloqueios.length) + "/4 · MAX_CHOICES em C)");
      }
      if (!n.folha && !n.opcoes.length && !n.desbloqueios.length) {
        pushW(aba, n.id, "beco sem saída (adicione uma opção ou marque como Fim)");
      }
    });
  });

  if (blankScenes.length) {
    infos.push({
      sev: "info",
      aba: blankScenes[0].id,
      nodeId: "Entrada",
      label: "ETAPAS VAZIAS",
      msg: blankScenes.map(s => s.rotulo).join(", ") + " ainda em branco"
    });
  }
  return { warns, infos };
}

/* ==========================================================================
   COMPONENTES SEMÂNTICOS DE UI (ZERO CONFLITOS DE HOVER)
   ========================================================================== */
const TONE_TO_BTN = {
  g: "dt-btn-pri",
  pri: "dt-btn-pri",
  a: "dt-btn-sec",
  sec: "dt-btn-sec",
  c: "dt-btn-info",
  info: "dt-btn-info",
  p: "dt-btn-spec",
  spec: "dt-btn-spec",
  r: "dt-btn-danger",
  danger: "dt-btn-danger",
  z: ""
};

function Btn({ tone, size, onClick, children, disabled, title, extra, on }) {
  const kindCls = TONE_TO_BTN[tone || "z"] || "";
  const szCls = size === "sm" ? "dt-btn-sm" : size === "lg" ? "dt-btn-lg" : "";
  return h("button", {
    type: "button",
    title,
    disabled,
    onClick,
    className: ["dt-btn", kindCls, szCls, on ? "dt-active" : "", extra || ""].filter(Boolean).join(" ")
  }, children);
}

function ConfirmBtn({ children, onConfirm, tone, size, ask, extra, title }) {
  const [a, setA] = useState(false);
  useEffect(() => {
    if (!a) return;
    const t = setTimeout(() => setA(false), 3500);
    return () => clearTimeout(t);
  }, [a]);
  return h(Btn, {
    tone: a ? "r" : (tone || "z"),
    size,
    title,
    on: a,
    extra,
    onClick: () => { if (a) { setA(false); onConfirm && onConfirm(); } else setA(true); }
  }, a ? (ask || "Confirmar?") : children);
}

function TA({ value, onChange, label, placeholder, warn500 }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(38, (el.scrollHeight || 0) + 2) + "px";
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
      className: "dt-input resize-none overflow-hidden block" + (warn500 && len > 500 ? " line-danger-solid" : ""),
      onChange: e => onChange && onChange(e.target.value)
    }),
    warn500 && len > 420 && h("div", { className: "text-right text-xs mt-0.5 " + (len > 500 ? "fg-danger" : "fg-sec") }, len + "/500 chars")
  );
}

const Lbl = ({ children, cls }) => h("label", { className: "block fg-2 font-semibold text-sm mb-1 " + (cls || "") }, children);

function CondPicker({ cond, cfg, evs, onChange }) {
  const c = normCond(cond);
  const states = A(cfg?.estados_folha).map(e => e.nome);
  const extras = A(cfg?.arvores_extras);

  const setTipo = novoTipo => {
    if (novoTipo === "npc_natureza") onChange({ tipo: novoTipo, op: "==", valor: "Sintético" });
    else if (novoTipo === "visao_atual") onChange({ tipo: novoTipo, op: "==", valor: states[0] || "" });
    else if (novoTipo === "possui_item") onChange({ tipo: novoTipo, op: "==", valor: evs[0]?.id || "EV-01" });
    else if (novoTipo === "ferramenta_usada") onChange({ tipo: novoTipo, op: "==", valor: (extras[0]?.id || "vies").toLowerCase() });
    else if (novoTipo === "desconfianca") onChange({ tipo: novoTipo, op: ">=", valor: "3" });
    else onChange({ tipo: "custom", op: "==", valor: "" });
  };

  return h("div", { className: "space-y-1.5" },
    h("select", {
      className: "dt-input",
      value: c.tipo,
      onChange: e => setTipo(e.target.value)
    }, COND_TYPES.map(([k, lbl]) => h("option", { key: k, value: k }, lbl))),

    c.tipo === "npc_natureza" && h("div", { className: "grid grid-cols-[90px_1fr] gap-1.5" },
      h("select", { className: "dt-input", value: c.op, onChange: e => onChange({ ...c, op: e.target.value }) },
        h("option", { value: "==" }, "É (==)"),
        h("option", { value: "!=" }, "Não é")
      ),
      h("select", { className: "dt-input", value: c.valor, onChange: e => onChange({ ...c, valor: e.target.value }) },
        h("option", { value: "Sintético" }, "Sintético / IA"),
        h("option", { value: "Humano" }, "Humano")
      )
    ),

    c.tipo === "visao_atual" && h("div", { className: "grid grid-cols-[90px_1fr] gap-1.5" },
      h("select", { className: "dt-input", value: c.op, onChange: e => onChange({ ...c, op: e.target.value }) },
        h("option", { value: "==" }, "=="),
        h("option", { value: "!=" }, "!=")
      ),
      states.length > 0
        ? h("select", { className: "dt-input", value: c.valor, onChange: e => onChange({ ...c, valor: e.target.value }) },
            states.map(s => h("option", { key: s, value: s }, s))
          )
        : h("input", { className: "dt-input", value: c.valor, placeholder: "Nome do estado…", onChange: e => onChange({ ...c, valor: e.target.value }) })
    ),

    c.tipo === "possui_item" && h("div", { className: "grid grid-cols-[105px_1fr] gap-1.5" },
      h("select", { className: "dt-input", value: c.op, onChange: e => onChange({ ...c, op: e.target.value }) },
        h("option", { value: "==" }, "Possui"),
        h("option", { value: "!=" }, "Não tem")
      ),
      evs.length > 0
        ? h("select", { className: "dt-input", value: c.valor, onChange: e => onChange({ ...c, valor: e.target.value }) },
            ...(c.valor && !evs.some(x => x.id === c.valor) ? [h("option", { key: "_c", value: c.valor }, c.valor)] : []),
            ...evs.map(e => h("option", { key: e.id, value: e.id }, e.id + (e.nome ? " · " + S(e.nome).slice(0, 20) : "")))
          )
        : h("input", { className: "dt-input", value: c.valor, placeholder: "Ex.: EV-01", onChange: e => onChange({ ...c, valor: e.target.value }) })
    ),

    c.tipo === "ferramenta_usada" && h("div", { className: "grid grid-cols-[90px_1fr] gap-1.5" },
      h("select", { className: "dt-input", value: c.op, onChange: e => onChange({ ...c, op: e.target.value }) },
        h("option", { value: "==" }, "=="),
        h("option", { value: "!=" }, "!=")
      ),
      h("select", { className: "dt-input", value: c.valor, onChange: e => onChange({ ...c, valor: e.target.value }) },
        ...extras.map(ex => h("option", { key: ex.id, value: ex.id.toLowerCase() }, ex.rotulo)),
        ...(extras.length === 0 ? [h("option", { key: "v", value: "vies" }, "Viés"), h("option", { key: "i", value: "injecao" }, "Injeção")] : []),
        h("option", { value: "qualquer" }, "Qualquer aba especial"),
        h("option", { value: "nenhuma" }, "Nenhuma")
      )
    ),

    c.tipo === "desconfianca" && h("div", { className: "grid grid-cols-[90px_1fr] gap-1.5" },
      h("select", { className: "dt-input", value: c.op, onChange: e => onChange({ ...c, op: e.target.value }) },
        NUM_OPS.map(op => h("option", { key: op, value: op }, op))
      ),
      h("input", { type: "number", min: 0, className: "dt-input", value: c.valor, onChange: e => onChange({ ...c, valor: e.target.value }) })
    ),

    c.tipo === "custom" && h("input", {
      className: "dt-input",
      value: c.valor,
      placeholder: "Ex.: faccao == 'Rebeldes' && nivel >= 5",
      onChange: e => onChange({ ...c, valor: e.target.value })
    })
  );
}

function Panel({ title, tone, right, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen !== false);
  const c = { g: "fg-pri", a: "fg-sec", c: "fg-info", p: "fg-spec", r: "fg-danger" }[tone || "g"];
  return h("section", { className: "dt-panel mb-4" },
    h("button", {
      type: "button",
      "aria-expanded": open,
      onClick: () => setOpen(!open),
      className: "w-full flex justify-between items-center gap-3 px-4 py-2.5 text-left cursor-pointer",
      style: { backgroundColor: "var(--bg-elevated)", border: "none", color: "var(--fg-1)" }
    },
      h("span", { className: "font-bold tracking-wide uppercase " + c }, title),
      h("span", { className: "flex gap-3 items-center fg-2 text-sm" }, right, open ? "Ocultar" : "Expandir")
    ),
    open && h("div", { className: "p-4", style: { borderTop: "1px solid var(--border-1)" } }, children)
  );
}

/* ==========================================================================
   TELA 1: MENU PRINCIPAL ("DIALOGUE TOOL")
   ========================================================================== */
function TitleScreen({ reg, currentTheme, onThemeChange, onGoNewPapo, onContinuePapo, onSelectSavedPapo, onDeleteSavedPapo, onLoadFileText }) {
  const fileRef = useRef(null);
  const [showSaved, setShowSaved] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const lastSaved = reg.list.find(x => x.id === reg.activeId) || reg.list[0] || null;

  const onPick = ev => {
    const f = ev.target.files?.[0];
    if (!f) return;
    setErrMsg("");
    const r = new FileReader();
    r.onload = () => {
      try { onLoadFileText(String(r.result || "")); }
      catch (e) { setErrMsg(e && e.message ? e.message : "Não foi possível abrir este JSON."); }
    };
    r.readAsText(f, "utf-8");
    ev.target.value = "";
  };

  return h("div", { className: "min-h-screen w-full dt-canvas flex flex-col items-center justify-center p-6" },
    h("div", { className: "w-full max-w-xl dt-card p-8 md:p-10" },
      /* Marca minimalista sem emojis */
      h("div", { className: "flex items-center gap-3 mb-2 fg-pri" },
        h(Icon, { name: "logo", size: 28 }),
        h("span", { className: "text-xs font-bold uppercase tracking-widest fg-2" }, "Interactive Narrative Studio")
      ),
      h("div", { className: "pb-6 mb-6", style: { borderBottom: "1px solid var(--border-1)" } },
        h("h1", { className: "text-4xl md:text-5xl font-bold tracking-tight fg-1 m-0" }, "Dialogue Tool"),
        h("p", { className: "fg-2 mt-2 text-base m-0" }, "Crie, ramifique, teste condicionais e exporte árvores de diálogo.")
      ),

      /* Botões estilo Menu de Jogo (com contraste 100% preservado no hover) */
      h("div", { className: "space-y-3" },
        lastSaved && h("button", {
          type: "button",
          onClick: () => onContinuePapo(lastSaved.id),
          className: "dt-menu-action"
        },
          h("div", null,
            h("div", { className: "text-lg font-bold fg-1 flex items-center gap-2" },
              h(Icon, { name: "play", size: 15 }),
              "Continuar Último Papo"
            ),
            h("div", { className: "text-sm fg-2 mt-0.5" }, lastSaved.nome + (lastSaved.updatedAt ? " · salvo às " + lastSaved.updatedAt : ""))
          ),
          h(Icon, { name: "arrow", size: 18 })
        ),

        h("button", {
          type: "button",
          onClick: onGoNewPapo,
          className: "dt-menu-action sec"
        },
          h("div", null,
            h("div", { className: "text-lg font-bold fg-1 flex items-center gap-2" },
              h(Icon, { name: "plus", size: 16 }),
              "Novo Papo"
            ),
            h("div", { className: "text-sm fg-2 mt-0.5" }, "Definir continuações, abas especiais, finais e iniciar projeto")
          ),
          h(Icon, { name: "arrow", size: 18 })
        ),

        h("input", { ref: fileRef, type: "file", accept: ".json,application/json", className: "hidden", onChange: onPick }),
        h("button", {
          type: "button",
          onClick: () => fileRef.current && fileRef.current.click(),
          className: "dt-menu-action info"
        },
          h("div", null,
            h("div", { className: "text-lg font-bold fg-1 flex items-center gap-2" },
              h(Icon, { name: "folder", size: 16 }),
              "Carregar Papo"
            ),
            h("div", { className: "text-sm fg-2 mt-0.5" }, "Abrir arquivo .JSON salvo no computador")
          ),
          h(Icon, { name: "arrow", size: 18 })
        ),

        reg.list.length > 1 && h("div", { className: "pt-1" },
          h(Btn, { tone: "z", extra: "w-full justify-between", onClick: () => setShowSaved(!showSaved) },
            h("span", null, "Projetos salvos neste navegador (" + reg.list.length + ")"),
            h("span", { className: "fg-3" }, showSaved ? "Ocultar" : "Mostrar")
          )
        )
      ),

      showSaved && reg.list.length > 0 && h("div", { className: "mt-3 p-2.5 space-y-1.5 max-h-48 overflow-auto rounded", style: { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-1)" } },
        reg.list.map(item =>
          h("div", { key: item.id, className: "flex items-center justify-between gap-2 px-3 py-1.5 rounded", style: { backgroundColor: "var(--bg-elevated)" } },
            h("button", {
              type: "button",
              onClick: () => onSelectSavedPapo(item.id),
              className: "flex-1 text-left fg-1 font-medium hover:underline cursor-pointer bg-transparent border-0"
            }, item.nome + " (" + (item.npcCount || 1) + " NPCs)"),
            h(ConfirmBtn, { tone: "r", size: "sm", ask: "Apagar?", onConfirm: () => onDeleteSavedPapo(item.id) }, h(Icon, { name: "trash", size: 14 }))
          )
        )
      ),

      errMsg && h("div", { className: "mt-4 p-3 rounded tone-box-r fg-danger text-sm font-medium" }, errMsg),

      h("div", { className: "mt-7 pt-5 flex flex-wrap items-center justify-between gap-3", style: { borderTop: "1px solid var(--border-1)" } },
        h("span", { className: "fg-2 text-sm font-semibold" }, "Tema Visual"),
        h("select", {
          className: "dt-input !w-64",
          value: currentTheme,
          onChange: e => onThemeChange(e.target.value)
        }, THEMES.map(t => h("option", { key: t.id, value: t.id }, t.label)))
      )
    )
  );
}

/* ==========================================================================
   TELA 2: CONFIGURAR NOVO PAPO (AMPLA, ACESSÍVEL, TEXTOS GRANDES E LEGÍVEIS)
   ========================================================================== */
function NewPapoScreen({ currentTheme, onThemeChange, onCancel, onConfirmCreate }) {
  const [nome, setNome] = useState("Novo Papo");
  const [numDias, setNumDias] = useState(6);
  const [namingMode, setNamingMode] = useState("semanas");
  const [falaMudaPorFinal, setFalaMudaPorFinal] = useState(true);

  const [extras, setExtras] = useState(() => clone(makeTuringConfig().arvores_extras));
  const [finais, setFinais] = useState(() => clone(makeTuringConfig().estados_folha));

  const [usarMetrica, setUsarMetrica] = useState(true);
  const [metricaNome, setMetricaNome] = useState("Autodesconfiança Global");
  const [usarInventario, setUsarInventario] = useState(true);
  const [usarVereditoMatriz, setUsarVereditoMatriz] = useState(true);
  const [usarExportTxtC, setUsarExportTxtC] = useState(true);

  const aplicarPresetTuring = () => {
    const t = makeTuringConfig(currentTheme);
    setNumDias(6);
    setNamingMode("semanas");
    setFalaMudaPorFinal(true);
    setExtras(clone(t.arvores_extras));
    setFinais(clone(t.estados_folha));
    setUsarMetrica(true);
    setMetricaNome("Autodesconfiança Global");
    setUsarInventario(true);
    setUsarVereditoMatriz(true);
    setUsarExportTxtC(true);
  };

  const aplicarPresetSimples = () => {
    setNumDias(1);
    setNamingMode("papo");
    setFalaMudaPorFinal(false);
    setExtras([]);
    setFinais([]);
    setUsarMetrica(false);
    setUsarInventario(false);
    setUsarVereditoMatriz(false);
    setUsarExportTxtC(false);
  };

  const setDiasSafe = v => setNumDias(Math.max(1, Math.min(20, Math.floor(+v || 1))));

  const finalizar = () => {
    const temFinais = finais.filter(f => S(f.nome).trim()).length > 0;
    const abDin = !!(falaMudaPorFinal && numDias > 1 && temFinais);
    const cfg = {
      template: usarExportTxtC ? "turing_test" : "livre",
      theme: currentTheme,
      modulos: {
        inventario: usarInventario,
        metrica_global: usarMetrica,
        aberturas_dinamicas: abDin,
        matriz_transicao: usarVereditoMatriz && numDias > 1,
        veredito: usarVereditoMatriz,
        experimental: false,
        export_turing_txt: usarExportTxtC
      },
      termos: {
        npc_singular: "NPC",
        npc_plural: "NPCs",
        item_a: usarExportTxtC ? "Objeto" : "Item",
        item_a_prefix: usarExportTxtC ? "EV" : "IT",
        item_b: "Informação",
        item_b_prefix: "INF",
        metrica_nome: S(metricaNome).trim() || "Métrica Global"
      },
      estados_folha: finais.filter(f => S(f.nome).trim()),
      cenas: buildScenesList(numDias, namingMode, abDin, usarVereditoMatriz),
      arvores_extras: extras.filter(ex => S(ex.rotulo).trim()).map((ex, idx) => ({
        id: S(ex.id).trim().toUpperCase() || ("EXTRA_" + (idx + 1)),
        rotulo: S(ex.rotulo).trim(),
        cor: oneOf(ex.cor, TONE_KEYS, "p"),
        modo_raiz: ex.modo_raiz || "escolhas",
        sub: S(ex.sub)
      }))
    };
    onConfirmCreate(nome, cfg);
  };

  const previewCenas = buildScenesList(numDias, namingMode, false, false);

  return h("div", { className: "min-h-screen w-full dt-canvas flex flex-col items-center py-10 px-4 md:px-8" },
    h("div", { className: "w-full max-w-4xl dt-card p-6 md:p-10 space-y-7" },
      /* Cabeçalho amplo */
      h("div", { className: "flex flex-wrap items-start justify-between gap-4 pb-5", style: { borderBottom: "1px solid var(--border-1)" } },
        h("div", null,
          h("h2", { className: "text-3xl font-bold fg-1 m-0" }, "Configurar Novo Papo"),
          h("p", { className: "fg-2 text-base mt-1.5 m-0" }, "Defina a estrutura inicial do seu projeto. Tudo pode ser alterado depois diretamente pelas abas.")
        ),
        h("div", { className: "flex flex-wrap gap-2" },
          h(Btn, { tone: "a", onClick: aplicarPresetTuring }, "Preencher Padrão TuringTest"),
          h(Btn, { tone: "info", onClick: aplicarPresetSimples }, "Preencher Jogo Simples")
        )
      ),

      /* 1. Identidade e Tema */
      h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-5" },
        h("div", null,
          h(Lbl, null, "Nome do Jogo / Projeto"),
          h("input", { className: "dt-input dt-input-lg", value: nome, placeholder: "Ex.: Investigação Setor B / Crônicas...", onChange: e => setNome(e.target.value) })
        ),
        h("div", null,
          h(Lbl, null, "Tema Visual"),
          h("select", { className: "dt-input dt-input-lg", value: currentTheme, onChange: e => onThemeChange(e.target.value) },
            THEMES.map(t => h("option", { key: t.id, value: t.id }, t.label))
          )
        )
      ),

      /* 2. Quantos dias / continuações de papo */
      h("div", { className: "dt-panel p-5 space-y-4" },
        h("div", { className: "flex flex-wrap items-center justify-between gap-4" },
          h("div", null,
            h("h3", { className: "text-xl font-bold fg-1 m-0" }, "Quantos dias ou continuações de papo?"),
            h("p", { className: "text-base fg-2 mt-1 m-0" }, "Define quantas etapas de conversa cada NPC terá inicialmente.")
          ),
          h("div", { className: "flex items-center gap-2" },
            h(Btn, { tone: "z", size: "lg", onClick: () => setDiasSafe(numDias - 1) }, h(Icon, { name: "minus", size: 16 })),
            h("input", { type: "number", min: 1, max: 20, className: "dt-input dt-input-lg !w-20 text-center font-bold", value: numDias, onChange: e => setDiasSafe(e.target.value) }),
            h(Btn, { tone: "z", size: "lg", onClick: () => setDiasSafe(numDias + 1) }, h(Icon, { name: "plus", size: 16 }))
          )
        ),

        h("div", { className: "flex flex-wrap items-center gap-2 pt-1" },
          h("span", { className: "fg-2 text-base mr-1" }, "Nomenclatura:"),
          [
            ["semanas", "Semanas (S1 · D1 ... S2 · D6)"],
            ["dia", "Dias (Dia 1, Dia 2...)"],
            ["papo", "Papos (Papo 1, Papo 2...)"],
            ["cena", "Cenas (Cena 1, Cena 2...)"]
          ].map(([k, lbl]) =>
            h(Btn, { key: k, tone: "a", on: namingMode === k, onClick: () => setNamingMode(k) }, lbl)
          )
        ),

        h("div", { className: "flex flex-wrap gap-2 pt-1" },
          previewCenas.map(c =>
            h("span", {
              key: c.id,
              className: "px-3 py-1 text-sm font-medium rounded",
              style: { backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-2)" }
            }, c.rotulo)
          )
        ),

        numDias > 1 && finais.length > 0 && h("div", { className: "pt-4 flex flex-wrap items-center justify-between gap-3", style: { borderTop: "1px solid var(--border-1)" } },
          h("span", { className: "text-base fg-1 font-medium" }, "A fala inicial do NPC muda conforme o final da conversa anterior?"),
          h("div", { className: "flex gap-2" },
            h(Btn, { tone: "g", on: falaMudaPorFinal, onClick: () => setFalaMudaPorFinal(true) }, "Sim (múltiplas aberturas)"),
            h(Btn, { tone: "z", on: !falaMudaPorFinal, onClick: () => setFalaMudaPorFinal(false) }, "Não (fala inicial única)")
          )
        )
      ),

      /* 3. Abas Especiais */
      h("div", { className: "dt-panel p-5 space-y-4" },
        h("div", { className: "flex flex-wrap items-center justify-between gap-3" },
          h("div", null,
            h("h3", { className: "text-xl font-bold fg-1 m-0" }, "Abas Especiais por NPC"),
            h("p", { className: "text-base fg-2 mt-1 m-0" }, "Árvores paralelas como Viés, Injeção, Loja ou Segredo. Remova as que não precisar.")
          ),
          extras.length > 0 && h(Btn, { tone: "r", size: "sm", onClick: () => setExtras([]) }, "Remover Todas")
        ),

        extras.length === 0 && h("div", { className: "p-3 rounded text-base fg-2", style: { backgroundColor: "var(--bg-elevated)", border: "1px dashed var(--border-2)" } },
          "Nenhuma aba especial ativa — o projeto terá apenas as abas normais de conversa."
        ),

        h("div", { className: "space-y-2.5" },
          extras.map((ex, i) =>
            h("div", {
              key: i,
              className: "grid grid-cols-1 md:grid-cols-[200px_170px_1fr_auto] gap-2.5 items-center p-3 rounded",
              style: { backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-1)" }
            },
              h("input", {
                className: "dt-input",
                value: ex.rotulo,
                placeholder: "Nome da aba (ex.: Viés)",
                onChange: e => setExtras(prev => { const c = clone(prev); c[i].rotulo = e.target.value; c[i].id = slug(e.target.value).toUpperCase() || ("EXTRA_" + (i + 1)); return c; })
              }),
              h("select", {
                className: "dt-input",
                value: ex.cor || "p",
                onChange: e => setExtras(prev => { const c = clone(prev); c[i].cor = e.target.value; return c; })
              }, TONE_KEYS.map(tk => h("option", { key: tk, value: tk }, TONE_MAP[tk].label))),
              h("input", {
                className: "dt-input",
                value: ex.sub || "",
                placeholder: "Regra ou observação opcional…",
                onChange: e => setExtras(prev => { const c = clone(prev); c[i].sub = e.target.value; return c; })
              }),
              h(Btn, { tone: "r", onClick: () => setExtras(prev => prev.filter((_, ix) => ix !== i)) }, h(Icon, { name: "trash", size: 15 }), "Remover")
            )
          )
        ),

        h(Btn, {
          tone: "p",
          onClick: () => setExtras(prev => [...prev, { id: "ESPECIAL_" + (prev.length + 1), rotulo: "Especial " + (prev.length + 1), cor: "p", modo_raiz: "escolhas", sub: "" }])
        }, h(Icon, { name: "plus", size: 15 }), "Adicionar Aba Especial")
      ),

      /* 4. Finais de Diálogo */
      h("div", { className: "dt-panel p-5 space-y-4" },
        h("div", { className: "flex flex-wrap items-center justify-between gap-3" },
          h("div", null,
            h("h3", { className: "text-xl font-bold fg-1 m-0" }, "Finais de Diálogo"),
            h("p", { className: "text-base fg-2 mt-1 m-0" }, "Renomeie os tipos de final ou remova todos para encerrar diálogos sem categoria.")
          ),
          finais.length > 0 && h(Btn, { tone: "r", size: "sm", onClick: () => setFinais([]) }, "Remover Todos (Fim Simples)")
        ),

        finais.length === 0 && h("div", { className: "p-3 rounded text-base fg-pri", style: { backgroundColor: "var(--pri-soft)", border: "1px solid var(--pri)" } },
          "Modo Fim Simples ativo: os nós finais encerram a conversa sem exigir classificação."
        ),

        h("div", { className: "space-y-2.5" },
          finais.map((est, i) =>
            h("div", { key: i, className: "grid grid-cols-1 md:grid-cols-[1fr_210px_auto] gap-2.5 items-center max-w-2xl" },
              h("input", {
                className: "dt-input",
                value: est.nome,
                placeholder: "Nome do final…",
                onChange: e => setFinais(prev => { const c = clone(prev); c[i].nome = e.target.value; return c; })
              }),
              h("select", {
                className: "dt-input",
                value: est.cor,
                onChange: e => setFinais(prev => { const c = clone(prev); c[i].cor = e.target.value; return c; })
              }, TONE_KEYS.map(tk => h("option", { key: tk, value: tk }, TONE_MAP[tk].label))),
              h(Btn, { tone: "r", onClick: () => setFinais(prev => prev.filter((_, ix) => ix !== i)) }, h(Icon, { name: "trash", size: 15 }), "Remover")
            )
          )
        ),

        h(Btn, {
          tone: "g",
          onClick: () => setFinais(prev => [...prev, { nome: "Final " + (prev.length + 1), cor: "c" }])
        }, h(Icon, { name: "plus", size: 15 }), "Adicionar Tipo de Final")
      ),

      /* 5. Módulos Opcionais */
      h("div", { className: "dt-panel p-5 space-y-4" },
        h("div", null,
          h("h3", { className: "text-xl font-bold fg-1 m-0" }, "Módulos Opcionais"),
          h("p", { className: "text-base fg-2 mt-1 m-0" }, "Ative apenas os sistemas que fazem sentido para o seu jogo.")
        ),
        h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" },
          [
            [usarMetrica, () => setUsarMetrica(!usarMetrica), "Métrica Global entre NPCs", "Contador acumulativo compartilhado (ex.: Desconfiança, Karma)"],
            [usarInventario, () => setUsarInventario(!usarInventario), "Inventário de Itens e Informações", "Permite escolhas bloqueadas por item e recompensas em nós"],
            [usarVereditoMatriz, () => setUsarVereditoMatriz(!usarVereditoMatriz), "Veredito & Matriz de Transição", "Painéis de anotações de transição e julgamento final"],
            [usarExportTxtC, () => setUsarExportTxtC(!usarExportTxtC), "Exportador TXT Motor C (TuringTest)", "Habilita validações de limite do C e exportação .txt específica"]
          ].map(([val, fn, title, sub], idx) =>
            h("button", {
              key: idx,
              type: "button",
              onClick: fn,
              className: "text-left p-3.5 rounded cursor-pointer flex items-start justify-between gap-3 transition-colors",
              style: {
                backgroundColor: val ? "var(--pri-soft)" : "var(--bg-elevated)",
                border: "1px solid " + (val ? "var(--pri)" : "var(--border-2)"),
                color: "var(--fg-1)"
              }
            },
              h("div", null,
                h("div", { className: "text-base font-bold fg-1" }, title),
                h("div", { className: "text-sm fg-2 mt-0.5" }, sub)
              ),
              h("span", { className: "text-xs font-bold uppercase px-2 py-1 rounded shrink-0 " + (val ? "fg-pri" : "fg-3"), style: { border: "1px solid currentColor" } }, val ? "Ativo" : "Off")
            )
          )
        ),
        usarMetrica && h("div", { className: "pt-2 max-w-md" },
          h(Lbl, null, "Nome da Métrica Global"),
          h("input", { className: "dt-input", value: metricaNome, placeholder: "Ex.: Autodesconfiança Global / Karma...", onChange: e => setMetricaNome(e.target.value) })
        )
      ),

      /* Rodapé */
      h("div", { className: "flex flex-wrap justify-between items-center gap-4 pt-4", style: { borderTop: "1px solid var(--border-1)" } },
        h(Btn, { tone: "z", size: "lg", onClick: onCancel }, h(Icon, { name: "back", size: 16 }), "Voltar ao Menu"),
        h(Btn, { tone: "g", size: "lg", onClick: finalizar }, "Criar Papo e Abrir Editor", h(Icon, { name: "arrow", size: 17 }))
      )
    )
  );
}

/* ==========================================================================
   GAVETA INLINE DO ÍCONE DE LÁPIS NAS ABAS
   ========================================================================== */
function TabInlineEditor({ game, aba, updGame, onClose, onSelectAba, flash }) {
  const cfg = game.config;
  const scIdx = cfg.cenas.findIndex(c => c.id === aba);
  const sc = scIdx >= 0 ? cfg.cenas[scIdx] : null;
  const exIdx = !sc ? cfg.arvores_extras.findIndex(e => e.id === aba) : -1;
  const ex = exIdx >= 0 ? cfg.arvores_extras[exIdx] : null;

  if (!sc && !ex) return null;

  if (ex) {
    return h("div", { className: "px-4 py-3 flex flex-wrap items-center gap-2.5 text-sm", style: { backgroundColor: "var(--bg-elevated)", borderTop: "1px solid var(--border-1)" } },
      h("span", { className: "fg-spec font-bold uppercase text-xs tracking-wide" }, "Editar Aba Especial:"),
      h("input", {
        className: "dt-input !w-44",
        value: ex.rotulo,
        placeholder: "Nome da aba",
        onChange: e => updGame(g => { if (g.config.arvores_extras[exIdx]) g.config.arvores_extras[exIdx].rotulo = e.target.value; })
      }),
      h("select", {
        className: "dt-input !w-44",
        value: ex.cor || "p",
        onChange: e => updGame(g => { if (g.config.arvores_extras[exIdx]) g.config.arvores_extras[exIdx].cor = e.target.value; })
      }, TONE_KEYS.map(tk => h("option", { key: tk, value: tk }, TONE_MAP[tk].label))),
      h("select", {
        className: "dt-input !w-56",
        value: ex.modo_raiz || "escolhas",
        onChange: e => updGame(g => { if (g.config.arvores_extras[exIdx]) g.config.arvores_extras[exIdx].modo_raiz = e.target.value; })
      },
        h("option", { value: "escolhas" }, "Início: Direto nas escolhas"),
        h("option", { value: "fala" }, "Início: Fala normal do NPC")
      ),
      h("input", {
        className: "dt-input flex-1 min-w-[180px]",
        value: ex.sub || "",
        placeholder: "Descrição ou regra desta aba…",
        onChange: e => updGame(g => { if (g.config.arvores_extras[exIdx]) g.config.arvores_extras[exIdx].sub = e.target.value; })
      }),
      h(Btn, {
        tone: "c",
        size: "sm",
        onClick: () => {
          let newId = "";
          updGame(g => {
            const orig = g.config.arvores_extras[exIdx];
            if (!orig) return;
            let k = 2;
            newId = orig.id + "_" + k;
            while (g.config.arvores_extras.some(z => z.id === newId)) { k += 1; newId = orig.id + "_" + k; }
            g.config.arvores_extras.push({ ...clone(orig), id: newId, rotulo: orig.rotulo + " " + k });
            g.npcs.forEach(np => {
              np.extras[newId] = clone(np.extras[orig.id] || { nos: [N("Raiz", orig.rotulo, "", [])] });
            });
          });
          if (newId) onSelectAba(newId);
          flash("Aba especial duplicada.");
        }
      }, "Duplicar"),
      h(ConfirmBtn, {
        tone: "r",
        size: "sm",
        ask: "Deletar '" + ex.rotulo + "'?",
        onConfirm: () => {
          const fallbackAba = cfg.cenas[0]?.id || "D1";
          updGame(g => {
            g.config.arvores_extras.splice(exIdx, 1);
            g.npcs.forEach(np => { if (np.aba === ex.id) np.aba = fallbackAba; });
          });
          onClose();
          flash("Aba especial removida.");
        }
      }, h(Icon, { name: "trash", size: 13 }), "Deletar Aba"),
      h(Btn, { tone: "z", size: "sm", onClick: onClose }, h(Icon, { name: "close", size: 13 }))
    );
  }

  return h("div", { className: "px-4 py-3 flex flex-wrap items-center gap-2.5 text-sm", style: { backgroundColor: "var(--bg-elevated)", borderTop: "1px solid var(--border-1)" } },
    h("span", { className: "fg-sec font-bold uppercase text-xs tracking-wide" }, "Editar Etapa:"),
    h("input", {
      className: "dt-input !w-44",
      value: sc.rotulo,
      placeholder: "Nome da etapa",
      onChange: e => updGame(g => { if (g.config.cenas[scIdx]) g.config.cenas[scIdx].rotulo = e.target.value; })
    }),
    h("input", {
      className: "dt-input !w-32",
      value: sc.grupo || "",
      placeholder: "Grupo (S1)",
      onChange: e => updGame(g => { if (g.config.cenas[scIdx]) g.config.cenas[scIdx].grupo = e.target.value; })
    }),
    cfg.estados_folha.length > 0 && h(Btn, {
      tone: "a",
      size: "sm",
      on: sc.aberturas && cfg.modulos.aberturas_dinamicas,
      onClick: () => updGame(g => {
        const next = !(g.config.cenas[scIdx].aberturas && g.config.modulos.aberturas_dinamicas);
        g.config.cenas[scIdx].aberturas = next;
        if (next) g.config.modulos.aberturas_dinamicas = true;
      })
    }, sc.aberturas && cfg.modulos.aberturas_dinamicas ? "Abertura por final anterior: Sim" : "Abertura por final anterior: Não"),
    h(Btn, {
      tone: "c",
      size: "sm",
      extra: "ml-auto",
      onClick: () => {
        let newId = "";
        updGame(g => {
          const orig = g.config.cenas[scIdx];
          if (!orig) return;
          let k = g.config.cenas.length + 1;
          newId = "PAPO_" + k;
          while (g.config.cenas.some(z => z.id === newId)) { k += 1; newId = "PAPO_" + k; }
          g.config.cenas.push({ ...clone(orig), id: newId, rotulo: orig.rotulo + " (Cópia)" });
          g.npcs.forEach(np => {
            np.cenas[newId] = clone(np.cenas[orig.id] || { nos: [N("Entrada", "Abertura", "", [])], matriz: [], veredito: null });
          });
        });
        if (newId) onSelectAba(newId);
        flash("Etapa duplicada.");
      }
    }, "Duplicar Etapa"),
    cfg.cenas.length > 1 && h(ConfirmBtn, {
      tone: "r",
      size: "sm",
      ask: "Deletar '" + sc.rotulo + "'?",
      onConfirm: () => {
        const fallback = cfg.cenas.find((_, ix) => ix !== scIdx)?.id || "D1";
        updGame(g => {
          g.config.cenas.splice(scIdx, 1);
          g.npcs.forEach(np => { if (np.aba === sc.id) np.aba = fallback; });
        });
        onClose();
        flash("Etapa removida.");
      }
    }, h(Icon, { name: "trash", size: 13 }), "Deletar Etapa"),
    h(Btn, { tone: "z", size: "sm", onClick: onClose }, h(Icon, { name: "close", size: 13 }))
  );
}

/* ==========================================================================
   MODAL PARA EDITAR / REMOVER FINAIS DE DIÁLOGO
   ========================================================================== */
function EndingsEditModal({ game, updGame, onClose }) {
  const finais = game.config.estados_folha;
  useEffect(() => {
    const f = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  const renomearFinal = (idx, novoNome) => updGame(g => {
    const velho = g.config.estados_folha[idx]?.nome;
    if (!g.config.estados_folha[idx]) return;
    g.config.estados_folha[idx].nome = novoNome;
    if (velho && novoNome) {
      g.npcs.forEach(np => allTreesOfNpc(np, g.config).forEach(([, nos]) =>
        nos.forEach(n => { if (n.folha && n.folha.visao_jogador === velho) n.folha.visao_jogador = novoNome; })
      ));
    }
  });

  return h("div", { className: "fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4", role: "dialog", "aria-modal": "true", onClick: onClose },
    h("div", { className: "w-full max-w-xl dt-card p-6 space-y-4", onClick: e => e.stopPropagation() },
      h("div", { className: "flex justify-between items-center pb-3", style: { borderBottom: "1px solid var(--border-1)" } },
        h("h3", { className: "text-xl font-bold fg-1 m-0" }, "Editar Finais de Diálogo"),
        h(Btn, { tone: "z", size: "sm", onClick: onClose }, h(Icon, { name: "close", size: 15 }))
      ),
      h("p", { className: "text-sm fg-2 m-0" }, "Renomeie os tipos de final ou remova todos para usar um fim de diálogo simples."),
      finais.length === 0 && h("div", { className: "p-3 rounded text-sm fg-pri tone-box-g", style: { border: "1px solid var(--pri)" } },
        "Modo Fim Simples ativo (sem categorias)."
      ),
      h("div", { className: "space-y-2" },
        finais.map((est, i) =>
          h("div", { key: i, className: "grid grid-cols-[1fr_180px_38px] gap-2 items-center" },
            h("input", { className: "dt-input", value: est.nome, onChange: e => renomearFinal(i, e.target.value) }),
            h("select", { className: "dt-input", value: est.cor, onChange: e => updGame(g => { g.config.estados_folha[i].cor = e.target.value; }) },
              TONE_KEYS.map(tk => h("option", { key: tk, value: tk }, TONE_MAP[tk].label))
            ),
            h(Btn, { tone: "r", size: "sm", onClick: () => updGame(g => { g.config.estados_folha.splice(i, 1); }) }, h(Icon, { name: "trash", size: 14 }))
          )
        )
      ),
      h("div", { className: "flex flex-wrap gap-2 pt-2" },
        h(Btn, { tone: "g", onClick: () => updGame(g => { g.config.estados_folha.push({ nome: "Final " + (g.config.estados_folha.length + 1), cor: "c" }); }) },
          h(Icon, { name: "plus", size: 14 }), "Adicionar Final"
        ),
        finais.length > 0 && h(ConfirmBtn, {
          tone: "r",
          ask: "Remover todas as categorias?",
          onConfirm: () => updGame(g => { g.config.estados_folha = []; g.config.modulos.aberturas_dinamicas = false; })
        }, "Usar Fim Simples (Remover Todos)")
      )
    )
  );
}

/* ==========================================================================
   PAINÉIS INFERIORES DE APOIO
   ========================================================================== */
function Inventario({ data, cfg, updNpc, onDisableModule }) {
  const evs = A(data?.evidencias);
  const termA = cfg.termos.item_a || "Item";
  const termB = cfg.termos.item_b || "Informação";
  const prefA = cfg.termos.item_a_prefix || "EV";
  const prefB = cfg.termos.item_b_prefix || "INF";

  return h(Panel, {
    title: "Inventário (" + termA + "s & " + termB + "s)",
    tone: "c",
    defaultOpen: false,
    right: h("span", { className: "fg-info font-semibold" }, evs.length + " itens")
  },
    evs.map((e, i) =>
      h("div", { key: i, className: "g5 mb-2 items-center" },
        h("input", {
          className: "dt-input",
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
          className: "dt-input",
          value: e.tipo,
          onChange: ev => updNpc(d => { if (d.evidencias[i]) d.evidencias[i].tipo = ev.target.value; })
        },
          h("option", { value: "evidencia" }, termA),
          h("option", { value: "informacao" }, termB)
        ),
        h("input", {
          className: "dt-input",
          value: e.nome,
          placeholder: "Nome / descrição",
          onChange: ev => updNpc(d => { if (d.evidencias[i]) d.evidencias[i].nome = ev.target.value; })
        }),
        h("input", {
          className: "dt-input",
          value: e.local,
          placeholder: "Origem / observação",
          onChange: ev => updNpc(d => { if (d.evidencias[i]) d.evidencias[i].local = ev.target.value; })
        }),
        h(Btn, { tone: "r", size: "sm", onClick: () => updNpc(d => { d.evidencias.splice(i, 1); }) }, h(Icon, { name: "close", size: 13 }))
      )
    ),
    h("div", { className: "mt-3 flex justify-between gap-2 flex-wrap" },
      h("div", { className: "flex gap-2 flex-wrap" },
        h(Btn, {
          tone: "c",
          onClick: () => updNpc(d => {
            let k = 1;
            const u = new Set(d.evidencias.map(x => x.id));
            while (u.has(prefA + "-" + String(k).padStart(2, "0"))) k += 1;
            d.evidencias.push({ id: prefA + "-" + String(k).padStart(2, "0"), nome: "", local: "", tipo: "evidencia" });
          })
        }, h(Icon, { name: "plus", size: 14 }), "Adicionar " + termA),
        h(Btn, {
          tone: "p",
          onClick: () => updNpc(d => {
            let k = 1;
            const u = new Set(d.evidencias.map(x => x.id));
            while (u.has(prefB + "-" + String(k).padStart(2, "0"))) k += 1;
            d.evidencias.push({ id: prefB + "-" + String(k).padStart(2, "0"), nome: "", local: "", tipo: "informacao" });
          })
        }, h(Icon, { name: "plus", size: 14 }), "Adicionar " + termB)
      ),
      h(ConfirmBtn, { tone: "z", size: "sm", ask: "Ocultar Inventário?", onConfirm: onDisableModule }, "Ocultar Inventário")
    )
  );
}

function MetricaGlobal({ game, updGame, onJumpNpc }) {
  const cfg = game.config;
  const m = game.metricas.desconfianca;
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
    title: "Métrica Global · " + mNome,
    tone: "r",
    defaultOpen: false,
    right: h("span", { className: "font-semibold " + (totalGlobal >= m.limite ? "fg-pri" : "fg-sec") }, totalGlobal + " / " + m.limite)
  },
    h("div", { className: "flex flex-wrap gap-3 items-center mb-3 justify-between" },
      h("div", { className: "flex flex-wrap gap-2 items-center" },
        h("input", { className: "dt-input !w-60", value: mNome, placeholder: "Nome da métrica", onChange: e => updGame(g => { g.config.termos.metrica_nome = e.target.value; }) }),
        h("span", { className: "fg-2 text-sm ml-1" }, "Limite:"),
        h("input", {
          type: "number",
          min: 1,
          className: "dt-input !w-20",
          value: m.limite,
          onChange: e => updGame(g => { g.metricas.desconfianca.limite = Math.max(1, +e.target.value || 3); })
        })
      ),
      h(ConfirmBtn, {
        tone: "r",
        size: "sm",
        ask: "Remover Métrica Global?",
        onConfirm: () => updGame(g => { g.config.modulos.metrica_global = false; })
      }, h(Icon, { name: "trash", size: 13 }), "Remover Métrica Global")
    ),
    h(TA, {
      value: m.consequencia,
      label: "Consequência global",
      placeholder: "Descreva o que acontece no jogo ao atingir o limite…",
      onChange: t => updGame(g => { g.metricas.desconfianca.consequencia = t; })
    }),
    fontes.length > 0 && h("div", { className: "mt-3 flex flex-wrap gap-2 items-center" },
      fontes.map((f, i) =>
        h(Btn, {
          key: i,
          tone: "r",
          size: "sm",
          onClick: () => onJumpNpc(f.npcIdx, f.aba, f.nodeId)
        }, f.npcNome + " · " + f.aba + " · " + f.nodeId + " (+" + f.val + ")")
      )
    )
  );
}

function Validacao({ data, cfg, onJump }) {
  const { warns, infos } = validarNpc(data, cfg);
  return h(Panel, {
    title: "Validação · " + (warns.length ? warns.length + " pendência(s)" : "Sem pendências"),
    tone: warns.length ? "a" : "g",
    defaultOpen: warns.length > 0
  },
    warns.length === 0 && h("div", { className: "fg-pri flex items-center gap-2 font-medium" }, h(Icon, { name: "check", size: 16 }), "Nenhuma inconsistência estrutural encontrada."),
    h("div", { className: "space-y-1.5" },
      warns.slice(0, 100).map((w, i) =>
        h("div", { key: i, className: "flex items-center justify-between gap-3 py-1.5 px-2.5 rounded", style: { backgroundColor: "var(--bg-elevated)" } },
          h("span", { className: "fg-sec text-sm flex items-center gap-2" }, h(Icon, { name: "alert", size: 14 }), "[" + w.label + "] " + w.msg),
          w.aba && h(Btn, { tone: "c", size: "sm", onClick: () => onJump(w.aba, w.nodeId) }, "Focar nó")
        )
      )
    ),
    infos.map((inf, i) =>
      h("div", { key: "i" + i, className: "flex items-center justify-between gap-2 pt-2 mt-2 fg-2 text-sm" },
        h("span", null, "[" + inf.label + "] " + inf.msg),
        h(Btn, { tone: "z", size: "sm", onClick: () => onJump(inf.aba, inf.nodeId) }, "Abrir")
      )
    )
  );
}

/* ==========================================================================
   CARTÃO DE NÓ REFINADO E LIMPO
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

const novoIfId = (nos, pai) => {
  const base = pai === "Entrada" || pai === "Raiz" ? "IF" : pai + ".IF";
  const u = new Set(A(nos).map(n => n.id));
  let k = 1;
  while (u.has(base + k)) k += 1;
  return base + k;
};

function NodeCard({ n, nos, evs, cfg, isRoot, aba, updNode, updDia, selected, onSel, onJumpNode, onOpenEndingsModal }) {
  const isIfNode = !!n?.condicional;
  const isLeaf = !isIfNode && !!n?.folha;
  const sc = cfg.cenas.find(c => c.id === aba);
  const ex = !sc ? cfg.arvores_extras.find(e => e.id === aba) : null;
  const isScene = !!sc;
  const usesAberturas = !!(isScene && sc.aberturas && cfg.modulos.aberturas_dinamicas && cfg.estados_folha.length > 0 && isRoot && !isIfNode);
  const rootChoicesOnly = !isScene && isRoot && ex?.modo_raiz !== "fala";
  const warn500 = !!cfg.modulos.export_turing_txt;

  const v = isLeaf ? n.folha.visao_jogador : null;
  const vTone = isLeaf ? stateTone(cfg, v) : TONE_MAP.a;
  const conf = n?.confronto_evidencia || null;
  const recompensa = S(n?.evidencia_desbloqueada);
  const outros = nos.filter(x => x.id !== n.id);
  const usados = A(n.desbloqueios).map(x => x.ev);
  const livres = evs.filter(e => e.id && !usados.includes(e.id));

  const [draft, setDraft] = useState(null);
  const [showMet, setShowMet] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [idDraft, setIdDraft] = useState(n.id);

  const totalChoices = A(n.opcoes).length + A(n.desbloqueios).length;
  const defState = defaultLeafName(cfg);
  const stateNames = A(cfg.estados_folha).map(e => e.nome);
  if (v && !stateNames.includes(v)) stateNames.push(v);

  const destOpts = (val, vazio) => [
    h("option", { key: "_", value: "" }, vazio),
    ...(val && !outros.some(z => z.id === val) ? [h("option", { key: "_x", value: val }, val + " (inexistente)")] : []),
    ...outros.map(z => h("option", { key: z.id, value: z.id }, "-> " + z.id))
  ];

  const evOpts = (val, vazio) => [
    h("option", { key: "_", value: "" }, vazio),
    ...(val && !evs.some(e => e.id === val) ? [h("option", { key: "_x", value: val }, val + " (não cadastrado)")] : []),
    ...evs.filter(e => e.id).map(e => h("option", { key: e.id, value: e.id }, e.id + (e.nome ? " · " + S(e.nome).slice(0, 22) : "")))
  ];

  const criarFilhoOpcao = (i, modo) => updDia(d => {
    const pai = d.nos.find(z => z.id === n.id);
    if (!pai || !pai.opcoes[i]) return;
    if (modo === "if") {
      const ifId = novoIfId(d.nos, pai.id);
      const vId = ifId + ".V", fId = ifId + ".F";
      d.nos.push(IFN(ifId, defaultCond(), vId, fId, "Desvio IF"));
      d.nos.push(N(vId, "Ramo Verdadeiro", "", []));
      d.nos.push(N(fId, "Ramo Falso", "", []));
      pai.opcoes[i].proximo_no = ifId;
      return;
    }
    const id = novoId(d.nos, pai.id);
    d.nos.push(modo === "folha" ? L(id, "", defState) : N(id, "", "", []));
    pai.opcoes[i].proximo_no = id;
  });

  const criarFilhoIfBranch = (ramo, comoFolha) => updDia(d => {
    const me = d.nos.find(z => z.id === n.id);
    if (!me || !me.condicional) return;
    const suf = ramo === "se_verdadeiro" ? ".V" : ".F";
    const u = new Set(d.nos.map(z => z.id));
    let id = me.id + suf;
    let k = 2;
    while (u.has(id)) { id = me.id + suf + k; k += 1; }
    d.nos.push(comoFolha ? L(id, "", defState) : N(id, ramo === "se_verdadeiro" ? "Ramo Verdadeiro" : "Ramo Falso", "", []));
    me.condicional[ramo] = id;
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
        if (z.condicional) {
          if (z.condicional.se_verdadeiro === old) z.condicional.se_verdadeiro = nv;
          if (z.condicional.se_falso === old) z.condicional.se_falso = nv;
        }
      });
    });
  };

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
      d.nos.push(N(id, "Reação " + ev, reacao, [OP("", a, ""), OP("", b, "")], {
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
      if (z.condicional) {
        if (rm.has(z.condicional.se_verdadeiro)) z.condicional.se_verdadeiro = "";
        if (rm.has(z.condicional.se_falso)) z.condicional.se_falso = "";
      }
    });
  });

  const excluir = () => updDia(d => {
    const rm = new Set([n.id, ...A(n.desbloqueios).map(x => x.no)]);
    if (n.confronto_evidencia) d.nos.forEach(z => { if (z.id.startsWith(n.id + ".") || z.id.startsWith(n.id + "#")) rm.add(z.id); });
    d.nos = d.nos.filter(z => !rm.has(z.id));
    d.nos.forEach(z => {
      z.opcoes.forEach(o => { if (rm.has(o.proximo_no)) o.proximo_no = ""; });
      z.desbloqueios = z.desbloqueios.filter(x => !rm.has(x.no));
      if (z.condicional) {
        if (rm.has(z.condicional.se_verdadeiro)) z.condicional.se_verdadeiro = "";
        if (rm.has(z.condicional.se_falso)) z.condicional.se_falso = "";
      }
    });
  });

  const cardToneCls = isIfNode ? "tone-box-p" : isLeaf ? vTone.boxCls : "";
  const metVisible = cfg.modulos.metrica_global && !rootChoicesOnly && (n.desconfianca > 0 || showMet);

  return h("div", {
    "data-node": n.id,
    style: { minWidth: 356, width: 356 },
    onClick: e => { e.stopPropagation(); onSel(); },
    className: "relative z-10 dt-card p-3.5 " + cardToneCls + (selected ? " dt-card-selected" : "")
  },
    isIfNode && h("div", { className: "flex items-center justify-between mb-2 pb-1.5 fg-spec text-xs font-bold uppercase tracking-wider", style: { borderBottom: "1px solid var(--border-1)" } },
      h("span", { className: "flex items-center gap-1.5" }, h(Icon, { name: "branch", size: 14 }), "Desvio Condicional [IF]"),
      h("span", { className: "fg-3" }, "Auto")
    ),

    /* Cabeçalho do Cartão */
    h("div", { className: "flex gap-2 items-center mb-2.5" },
      renaming
        ? h("div", { className: "flex gap-1 items-center" },
            h("input", {
              className: "dt-input !w-24 !py-0.5 text-sm",
              value: idDraft,
              autoFocus: true,
              onKeyDown: e => { if (e.key === "Enter") salvarNovoId(); if (e.key === "Escape") setRenaming(false); },
              onChange: e => setIdDraft(e.target.value)
            }),
            h(Btn, { tone: "g", size: "sm", onClick: salvarNovoId }, "OK")
          )
        : h("button", {
            type: "button",
            disabled: isRoot,
            title: isRoot ? "Nó inicial fixo" : "Clique para renomear ID",
            onClick: () => { if (!isRoot) { setIdDraft(n.id); setRenaming(true); } },
            className: "px-2 py-0.5 text-xs font-bold rounded flex items-center gap-1 " + (!isRoot ? "cursor-pointer" : "cursor-default"),
            style: { backgroundColor: "var(--bg-input)", border: "1px solid var(--border-2)", color: "var(--fg-1)" }
          }, n.id, !isRoot && h(Icon, { name: "edit", size: 11 })),
      h("input", {
        className: "flex-1 min-w-0 bg-transparent border-0 text-sm fg-2 focus:outline-none",
        style: { borderBottom: "1px dashed var(--border-2)" },
        value: n.rotulo,
        placeholder: "nota / rótulo…",
        onChange: e => updNode(n.id, x => { x.rotulo = e.target.value; })
      }),
      !isRoot && h(ConfirmBtn, { tone: "r", size: "sm", ask: "Excluir?", onConfirm: excluir, title: "Excluir este nó" }, h(Icon, { name: "trash", size: 13 }))
    ),

    /* MODO 1: NÓ DESVIADOR IF */
    isIfNode
      ? h("div", { className: "space-y-2.5" },
          h("div", { className: "p-2.5 rounded", style: { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-2)" } },
            h("div", { className: "fg-spec text-xs uppercase font-bold mb-1.5" }, "Se a condição for:"),
            h(CondPicker, {
              cond: n.condicional.cond,
              cfg,
              evs,
              onChange: nv => updNode(n.id, x => { if (x.condicional) x.condicional.cond = nv; })
            })
          ),
          h("div", { className: "p-2.5 rounded tone-box-g", style: { border: "1px solid var(--pri)" } },
            h("div", { className: "fg-pri text-xs font-bold uppercase mb-1.5" }, "Então (Verdadeiro):"),
            h("select", {
              className: "dt-input",
              value: n.condicional.se_verdadeiro || "",
              onChange: e => updNode(n.id, x => { if (x.condicional) x.condicional.se_verdadeiro = e.target.value; })
            }, destOpts(n.condicional.se_verdadeiro, "-> escolha destino")),
            h("div", { className: "mt-1.5 flex flex-wrap gap-1.5" },
              h(Btn, { tone: "z", size: "sm", onClick: () => criarFilhoIfBranch("se_verdadeiro", false) }, "+ Sub-nó"),
              h(Btn, { tone: "g", size: "sm", onClick: () => criarFilhoIfBranch("se_verdadeiro", true) }, "+ Fim"),
              n.condicional.se_verdadeiro && outros.some(z => z.id === n.condicional.se_verdadeiro) && h(Btn, { tone: "c", size: "sm", onClick: () => onJumpNode(n.condicional.se_verdadeiro) }, "Focar")
            )
          ),
          h("div", { className: "p-2.5 rounded tone-box-r", style: { border: "1px solid var(--danger)" } },
            h("div", { className: "fg-danger text-xs font-bold uppercase mb-1.5" }, "Senão (Falso):"),
            h("select", {
              className: "dt-input",
              value: n.condicional.se_falso || "",
              onChange: e => updNode(n.id, x => { if (x.condicional) x.condicional.se_falso = e.target.value; })
            }, destOpts(n.condicional.se_falso, "-> escolha destino")),
            h("div", { className: "mt-1.5 flex flex-wrap gap-1.5" },
              h(Btn, { tone: "z", size: "sm", onClick: () => criarFilhoIfBranch("se_falso", false) }, "+ Sub-nó"),
              h(Btn, { tone: "g", size: "sm", onClick: () => criarFilhoIfBranch("se_falso", true) }, "+ Fim"),
              n.condicional.se_falso && outros.some(z => z.id === n.condicional.se_falso) && h(Btn, { tone: "c", size: "sm", onClick: () => onJumpNode(n.condicional.se_falso) }, "Focar")
            )
          ),
          h(Btn, { tone: "z", size: "sm", extra: "w-full", onClick: () => updNode(n.id, x => { x.condicional = null; }) }, "Voltar para Nó de Fala")
        )

      /* MODO 2: NÓ DE FALA / OPÇÕES / FIM */
      : h("div", null,
          conf && h("div", { className: "mb-2.5 p-2.5 rounded tone-box-c", style: { border: "1px solid var(--info)" } },
            h("div", { className: "fg-info uppercase text-xs font-bold mb-1.5" }, "Escolha com Item (" + S(conf.evidencia_id) + ")"),
            h("select", {
              className: "dt-input mb-1.5",
              value: S(conf.evidencia_id),
              onChange: e => {
                const novo = e.target.value;
                updDia(d => {
                  const me = d.nos.find(z => z.id === n.id);
                  if (!me || !me.confronto_evidencia) return;
                  me.confronto_evidencia.evidencia_id = novo;
                  d.nos.forEach(z => z.desbloqueios.forEach(x => { if (x.no === n.id) x.ev = novo; }));
                });
              }
            }, evOpts(S(conf.evidencia_id), "Selecione item…")),
            h(TA, {
              value: conf.pergunta_jogador,
              label: "Pergunta " + n.id,
              warn500,
              placeholder: "Fala do jogador ao usar o item…",
              onChange: t => updNode(n.id, x => { if (x.confronto_evidencia) x.confronto_evidencia.pergunta_jogador = t; })
            })
          ),

          usesAberturas
            ? h("div", { className: "p-2.5 rounded mb-2.5", style: { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-2)" } },
                h("div", { className: "fg-sec uppercase text-xs font-bold mb-2" }, "Falas iniciais por final anterior"),
                cfg.estados_folha.map(est => {
                  const sk = stateKey(est.nome);
                  const tn = TONE_MAP[est.cor] || TONE_MAP.a;
                  const isDef = est.nome === defState;
                  return h("div", { key: sk, className: "mb-2 last:mb-0" },
                    h("div", { className: "text-xs font-semibold mb-0.5 " + tn.textCls }, est.nome + (isDef ? " (padrão)" : "")),
                    h(TA, {
                      value: n.aberturas?.[sk] || "",
                      label: "Abertura " + est.nome,
                      warn500,
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
            : rootChoicesOnly
              ? h("div", { className: "text-xs fg-2 mb-2 px-2.5 py-2 rounded", style: { backgroundColor: "var(--bg-surface)", border: "1px dashed var(--border-2)" } },
                  "Inicia direto nas escolhas do jogador abaixo (altere no ícone de lápis da aba se preferir fala inicial)."
                )
              : h("div", null,
                  h("div", { className: "text-xs font-semibold fg-2 uppercase mb-1" }, A(n.fala_condicional).length ? "Fala padrão do NPC (Senão)" : "Fala do NPC"),
                  h(TA, {
                    value: n.fala_npc,
                    label: "Fala " + n.id,
                    warn500,
                    placeholder: "Escreva a fala do NPC…",
                    onChange: t => updNode(n.id, x => {
                      x.fala_npc = t;
                      if (x.confronto_evidencia) x.confronto_evidencia.resposta_npc = t;
                    })
                  })
                ),

          /* Variantes de fala IF */
          A(n.fala_condicional).map((fc, fi) =>
            h("div", { key: fi, className: "mt-2 p-2.5 rounded tone-box-p", style: { border: "1px solid var(--spec)" } },
              h("div", { className: "flex justify-between items-center mb-1.5" },
                h("span", { className: "fg-spec text-xs uppercase font-bold" }, "Mudar fala SE:"),
                h(Btn, { tone: "r", size: "sm", onClick: () => updNode(n.id, x => { x.fala_condicional.splice(fi, 1); }) }, h(Icon, { name: "close", size: 12 }))
              ),
              h(CondPicker, {
                cond: fc.cond,
                cfg,
                evs,
                onChange: nv => updNode(n.id, x => { if (x.fala_condicional[fi]) x.fala_condicional[fi].cond = nv; })
              }),
              h("div", { className: "mt-1.5" },
                h(TA, {
                  value: fc.fala,
                  label: "Fala condicional",
                  warn500,
                  placeholder: "Fala alternativa do NPC…",
                  onChange: t => updNode(n.id, x => { if (x.fala_condicional[fi]) x.fala_condicional[fi].fala = t; })
                })
              )
            )
          ),

          /* FIM DE DIÁLOGO vs OPÇÕES */
          isLeaf
            ? h("div", { className: "mt-3 pt-2.5", style: { borderTop: "1px solid var(--border-1)" } },
                cfg.estados_folha.length > 0
                  ? h("div", { className: "flex items-center gap-2" },
                      h("span", { className: "text-xs font-bold fg-2 uppercase shrink-0" }, "Final:"),
                      h("select", {
                        className: "dt-input flex-1 font-semibold",
                        value: v || defState,
                        onChange: e => updNode(n.id, x => { if (x.folha) x.folha.visao_jogador = e.target.value; })
                      }, stateNames.map(k => h("option", { key: k, value: k }, k))),
                      h(Btn, { tone: "z", size: "sm", onClick: onOpenEndingsModal, title: "Editar tipos de final" }, h(Icon, { name: "edit", size: 13 }))
                    )
                  : h("div", { className: "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded", style: { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-2)" } },
                      h("span", { className: "fg-pri text-xs font-bold uppercase tracking-wide" }, "Fim do Diálogo"),
                      h(Btn, { tone: "z", size: "sm", onClick: onOpenEndingsModal }, h(Icon, { name: "edit", size: 12 }), "Finais")
                    )
              )
            : h("div", null,
                warn500 && totalChoices > 4 && h("div", { className: "mt-2 px-2.5 py-1 rounded tone-box-r fg-danger text-xs font-medium" }, totalChoices + "/4 escolhas (limite MAX_CHOICES=4 no C)"),
                A(n.opcoes).map((o, i) =>
                  h("div", { key: i, "data-opt": n.id + "|" + i, className: "mt-2.5 pt-2.5", style: { borderTop: "1px dashed var(--border-2)" } },
                    h("div", { className: "grid grid-cols-[26px_1fr_28px] gap-1.5 items-start" },
                      h("span", {
                        className: "h-7 flex items-center justify-center rounded text-xs font-bold",
                        style: { backgroundColor: "var(--pri-soft)", color: "var(--pri)", border: "1px solid var(--pri)" }
                      }, LET[i] || "?"),
                      h(TA, {
                        value: o.texto,
                        label: "Opção " + (LET[i] || i),
                        warn500,
                        placeholder: "Escolha do jogador…",
                        onChange: t => updNode(n.id, x => { if (x.opcoes[i]) x.opcoes[i].texto = t; })
                      }),
                      h(Btn, { tone: "r", size: "sm", extra: "!px-1.5 h-7", onClick: () => updNode(n.id, x => { x.opcoes.splice(i, 1); }) }, h(Icon, { name: "close", size: 13 }))
                    ),
                    o.cond && h("div", { className: "ml-8 mt-1.5 p-2 rounded tone-box-p", style: { border: "1px solid var(--spec)" } },
                      h("div", { className: "flex justify-between items-center mb-1" },
                        h("span", { className: "fg-spec text-xs uppercase font-bold" }, "Exibir opção somente SE:"),
                        h(Btn, { tone: "r", size: "sm", onClick: () => updNode(n.id, x => { if (x.opcoes[i]) x.opcoes[i].cond = null; }) }, h(Icon, { name: "close", size: 12 }))
                      ),
                      h(CondPicker, {
                        cond: o.cond,
                        cfg,
                        evs,
                        onChange: nv => updNode(n.id, x => { if (x.opcoes[i]) x.opcoes[i].cond = nv; })
                      })
                    ),
                    h("div", { className: "ml-8 mt-1.5 flex flex-wrap items-center gap-1.5" },
                      h("select", {
                        className: "dt-input !w-36 !py-1 text-sm",
                        value: o.proximo_no || "",
                        onChange: e => updNode(n.id, x => { if (x.opcoes[i]) x.opcoes[i].proximo_no = e.target.value; })
                      }, destOpts(o.proximo_no, "-> destino")),
                      !o.proximo_no && h(Btn, { tone: "z", size: "sm", onClick: () => criarFilhoOpcao(i, "sub") }, "+ Sub-nó"),
                      !o.proximo_no && h(Btn, { tone: "g", size: "sm", onClick: () => criarFilhoOpcao(i, "folha") }, "+ Fim"),
                      !o.proximo_no && h(Btn, { tone: "p", size: "sm", onClick: () => criarFilhoOpcao(i, "if") }, h(Icon, { name: "branch", size: 12 }), "+IF"),
                      o.proximo_no && outros.some(z => z.id === o.proximo_no) && h(Btn, { tone: "c", size: "sm", onClick: () => onJumpNode(o.proximo_no) }, "Focar"),
                      !o.cond && h(Btn, { tone: "p", size: "sm", onClick: () => updNode(n.id, x => { if (x.opcoes[i]) x.opcoes[i].cond = defaultCond(); }), title: "Exibir esta escolha somente sob uma condição IF" }, "IF?")
                    )
                  )
                ),

                A(n.desbloqueios).map((x, i) =>
                  h("div", { key: "db" + i, className: "mt-2 flex items-center gap-2 rounded px-2.5 py-1.5 tone-box-c text-xs", style: { border: "1px solid var(--info)" } },
                    h("button", { type: "button", onClick: () => onJumpNode(x.no), className: "flex-1 text-left fg-info font-semibold hover:underline cursor-pointer bg-transparent border-0" }, "REQ " + x.ev + " -> " + x.no),
                    h(Btn, { tone: "r", size: "sm", onClick: () => removerConfronto(i) }, h(Icon, { name: "close", size: 12 }))
                  )
                ),

                draft && h("div", { className: "mt-2.5 p-2.5 rounded tone-box-c space-y-1.5", style: { border: "1px solid var(--info)" } },
                  h("div", { className: "flex justify-between items-center" },
                    h("span", { className: "fg-info text-xs font-bold uppercase" }, "Nova escolha com Item"),
                    h(Btn, { tone: "z", size: "sm", onClick: () => setDraft(null) }, h(Icon, { name: "close", size: 12 }))
                  ),
                  livres.length > 0
                    ? h("div", { className: "space-y-1.5" },
                        h("select", { className: "dt-input", value: draft.ev || livres[0]?.id || "", onChange: e => setDraft({ ...draft, ev: e.target.value }) },
                          livres.map(e => h("option", { key: e.id, value: e.id }, e.id + (e.nome ? " · " + S(e.nome).slice(0, 22) : "")))
                        ),
                        h(TA, { value: draft.pergunta, label: "Pergunta", warn500, placeholder: "Fala do jogador…", onChange: t => setDraft({ ...draft, pergunta: t }) }),
                        h(TA, { value: draft.reacao, label: "Reação", warn500, placeholder: "Resposta do NPC…", onChange: t => setDraft({ ...draft, reacao: t }) }),
                        h(Btn, { tone: "c", size: "sm", extra: "w-full", onClick: gerarConfronto }, "Criar Galho")
                      )
                    : h("div", { className: "text-xs fg-2" }, "Cadastre um item no painel Inventário abaixo primeiro.")
                )
              ),

          /* Recompensa ativa */
          cfg.modulos.inventario && recompensa && h("div", { className: "mt-2.5 flex gap-2 items-center rounded px-2.5 py-1.5 tone-box-a", style: { border: "1px solid var(--sec)" } },
            h("span", { className: "fg-sec text-xs font-bold shrink-0" }, "Ganha:"),
            h("select", {
              className: "dt-input !py-1 text-xs",
              value: recompensa,
              onChange: e => updNode(n.id, x => { x.evidencia_desbloqueada = e.target.value; })
            }, evOpts(recompensa, "Item…").slice(1)),
            h(Btn, { tone: "r", size: "sm", onClick: () => updNode(n.id, x => { x.evidencia_desbloqueada = ""; }) }, h(Icon, { name: "close", size: 12 }))
          ),

          /* Métrica ativa */
          metVisible && h("div", { className: "mt-2.5 flex gap-2 items-center justify-between rounded px-2.5 py-1.5 tone-box-r", style: { border: "1px solid var(--danger)" } },
            h("span", { className: "fg-danger text-xs font-bold" }, (cfg.termos.metrica_nome || "Métrica") + " +"),
            h("div", { className: "flex items-center gap-1.5" },
              h("input", {
                type: "number",
                min: 0,
                max: 99,
                className: "dt-input !w-16 !py-0.5 text-center text-sm",
                value: n.desconfianca || 0,
                onChange: e => updNode(n.id, x => { x.desconfianca = Math.max(0, Math.floor(+e.target.value || 0)); })
              }),
              h(Btn, { tone: "r", size: "sm", onClick: () => { setShowMet(false); updNode(n.id, x => { x.desconfianca = 0; }); } }, h(Icon, { name: "close", size: 12 }))
            )
          ),

          /* Barra Compacta de Ações do Nó */
          h("div", { className: "mt-3 pt-2.5 flex flex-wrap gap-1.5 items-center", style: { borderTop: "1px solid var(--border-1)" } },
            !isLeaf && A(n.opcoes).length < 8 && h(Btn, {
              tone: "g",
              size: "sm",
              onClick: () => updNode(n.id, x => { x.opcoes.push(OP("", "", "")); })
            }, h(Icon, { name: "plus", size: 12 }), "Opção"),

            !rootChoicesOnly && h(Btn, {
              tone: "p",
              size: "sm",
              title: "Adicionar fala alternativa condicional (IF)",
              onClick: () => updNode(n.id, x => {
                if (!Array.isArray(x.fala_condicional)) x.fala_condicional = [];
                x.fala_condicional.push({ cond: defaultCond(), fala: "" });
              })
            }, h(Icon, { name: "branch", size: 12 }), "IF Fala"),

            !isRoot && !isLeaf && h(Btn, {
              tone: "p",
              size: "sm",
              title: "Transformar este nó em desviador condicional IF / ELSE",
              onClick: () => updNode(n.id, x => {
                x.condicional = { cond: defaultCond(), se_verdadeiro: x.opcoes[0]?.proximo_no || "", se_falso: x.opcoes[1]?.proximo_no || "" };
                x.opcoes = [];
                x.desbloqueios = [];
                x.folha = null;
              })
            }, "Virar IF"),

            cfg.modulos.inventario && !isLeaf && !draft && h(Btn, {
              tone: "c",
              size: "sm",
              onClick: () => setDraft({ ev: livres[0]?.id || "", pergunta: "", reacao: "" })
            }, "+ Item REQ"),

            cfg.modulos.inventario && !rootChoicesOnly && !recompensa && evs.some(e => e.id) && h(Btn, {
              tone: "a",
              size: "sm",
              onClick: () => updNode(n.id, x => { x.evidencia_desbloqueada = (evs.find(e => e.id) || {}).id || ""; })
            }, "+ Ganha"),

            cfg.modulos.metrica_global && !rootChoicesOnly && !metVisible && h(Btn, {
              tone: "r",
              size: "sm",
              onClick: () => { setShowMet(true); updNode(n.id, x => { x.desconfianca = Math.max(1, x.desconfianca || 0); }); }
            }, "+ Métrica"),

            !isRoot && (isLeaf
              ? h(Btn, { tone: "z", size: "sm", extra: "ml-auto", onClick: () => updNode(n.id, x => { x.folha = null; }) }, "Reabrir Nó")
              : A(n.opcoes).length === 0 && A(n.desbloqueios).length === 0
                ? h(Btn, { tone: "a", size: "sm", extra: "ml-auto", onClick: () => updNode(n.id, x => { x.folha = { visao_jogador: defState }; }) }, "Marcar Fim")
                : h(ConfirmBtn, { tone: "z", size: "sm", extra: "ml-auto", ask: "Apagar opções?", onConfirm: () => updNode(n.id, x => { x.folha = { visao_jogador: defState }; x.opcoes = []; x.desbloqueios = []; }) }, "Marcar Fim")
            )
          )
        )
  );
}

/* ==========================================================================
   ÁRVORE VISUAL + DRAG-TO-PAN + ZOOM CTRL+SCROLL
   ========================================================================== */
function plan(nos) {
  const by = {};
  A(nos).forEach(n => { by[n.id] = n; });
  const owned = new Set();
  const placed = new Set();
  const roots = [];
  const kidsOf = n => {
    if (!n) return [];
    if (n.condicional) {
      return [
        { key: "t0", to: n.condicional.se_verdadeiro },
        { key: "f0", to: n.condicional.se_falso }
      ];
    }
    return [
      ...A(n.opcoes).map((o, i) => ({ key: "o" + i, to: o.proximo_no })),
      ...A(n.desbloqueios).map((x, i) => ({ key: "e" + i, to: x.no }))
    ];
  };
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

function Branch({ id, T, P, sel, setSel, onJumpNode, onOpenEndingsModal }) {
  const n = P.by[id];
  if (!n) return null;
  const kids = P.kidsOf(n);
  const sk = T.aba + "|" + n.id;
  const baseLine = T.lineTone === "p" ? "line-spec" : T.lineTone === "c" ? "line-info" : "line-main";

  return h("div", { className: "flex flex-row items-center" },
    h(NodeCard, {
      n,
      nos: T.nos,
      evs: T.evs,
      cfg: T.cfg,
      isRoot: T.nos[0]?.id === n.id,
      aba: T.aba,
      updNode: T.updNode,
      updDia: T.updTree,
      selected: sel === sk,
      onSel: () => setSel(sk),
      onJumpNode,
      onOpenEndingsModal
    }),
    kids.length > 0 && h("div", { className: "flex flex-row items-center" },
      h("span", { "aria-hidden": "true", className: "block w-10 border-t-2 " + (n.condicional ? "line-spec" : baseLine) }),
      h("div", { className: "flex flex-col" },
        kids.map((k, idx) => {
          const kind = k.key[0];
          const ix = +k.key.slice(1);
          const o = kind === "o" ? n.opcoes[ix] : null;
          const line = kind === "e" ? "line-info" : kind === "t" ? "line-pri-solid" : kind === "f" ? "line-danger-solid" : baseLine;
          const pos = kids.length === 1 ? "one" : idx === 0 ? "first" : idx === kids.length - 1 ? "last" : "mid";
          const tag = kind === "e" ? "REQ" : kind === "t" ? "IF" : kind === "f" ? "ELSE" : ((o?.cond ? "IF·" : "") + (LET[ix] || "?"));
          const tagCls = kind === "e" ? "fg-info font-bold" : kind === "t" ? "fg-pri font-bold" : kind === "f" ? "fg-danger font-bold" : (o?.cond ? "fg-spec font-bold" : "fg-2 font-semibold");
          const exists = k.to && P.by[k.to];

          return h("div", { key: k.key, className: "relative flex flex-row items-center pl-14 py-4" },
            pos !== "one" && h("span", {
              "aria-hidden": "true",
              className: "absolute left-0 w-0 border-l-2 " + line + " " + (pos === "first" ? "top-1/2 bottom-0" : pos === "last" ? "top-0 bottom-1/2" : "top-0 bottom-0")
            }),
            h("span", { "aria-hidden": "true", className: "absolute left-0 top-1/2 w-14 border-t-2 " + line }),
            h("span", { className: "absolute left-2 top-1/2 -translate-y-full text-xs leading-none pb-1 " + tagCls }, tag),
            P.owned.has(n.id + "|" + k.key)
              ? h(Branch, { id: k.to, T, P, sel, setSel, onJumpNode, onOpenEndingsModal })
              : exists
                ? h(Btn, {
                    tone: "z",
                    size: "sm",
                    onClick: e => { e.stopPropagation(); onJumpNode(k.to); }
                  }, "Ir para " + k.to)
                : h("div", { className: "px-3 py-1.5 rounded tone-box-r fg-danger text-xs font-semibold", style: { border: "1px dashed var(--danger)" } }, "Sem destino")
          );
        })
      )
    )
  );
}

function TreeArea({ aba, lineTone, titulo, sub, nos: nosIn, evs, cfg, zoom, setZ, sel, setSel, updNodeIn, updTreeIn, onJumpNode, onOpenEndingsModal }) {
  const mainRef = useRef(null);
  const innerRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [panning, setPanning] = useState(false);
  const panStart = useRef(null);

  useEffect(() => {
    const t = innerRef.current;
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

  const onMouseDown = e => {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.target.closest("[data-node], button, input, textarea, select")) return;
    const m = mainRef.current;
    if (!m) return;
    panStart.current = { x: e.clientX, y: e.clientY, sl: m.scrollLeft, st: m.scrollTop };
    setPanning(true);
  };

  const onMouseMove = e => {
    if (!panStart.current || !mainRef.current) return;
    mainRef.current.scrollLeft = panStart.current.sl - (e.clientX - panStart.current.x);
    mainRef.current.scrollTop = panStart.current.st - (e.clientY - panStart.current.y);
  };

  const endPan = () => {
    panStart.current = null;
    if (panning) setPanning(false);
  };

  const onWheel = e => {
    if (e.ctrlKey) {
      e.preventDefault();
      setZ(zoom + (e.deltaY < 0 ? 0.08 : -0.08));
    }
  };

  const nos = A(nosIn);
  const T = { aba, lineTone, nos, evs, cfg, updNode: updNodeIn, updTree: updTreeIn };
  const P = plan(nos);

  return h("main", {
    ref: mainRef,
    onMouseDown,
    onMouseMove,
    onMouseUp: endPan,
    onMouseLeave: endPan,
    onWheel,
    className: "w-full overflow-auto dt-canvas canvas-pan" + (panning ? " panning" : ""),
    style: { height: "calc(100vh - 108px)" },
    "aria-label": titulo
  },
    h("div", { style: { width: size.w ? size.w * zoom : "auto", height: size.h ? size.h * zoom : "auto" } },
      h("div", {
        ref: innerRef,
        className: "scale-t min-w-max p-10",
        style: { width: "max-content", transform: "scale(" + zoom + ")", transformOrigin: "0 0" },
        onClick: () => { if (!panning) setSel(null); }
      },
        h("div", { className: "mb-8 pb-3", style: { maxWidth: 740, borderBottom: "1px solid var(--border-2)" } },
          h("div", { className: "text-2xl font-bold fg-1" }, titulo),
          h("div", { className: "fg-2 text-sm mt-0.5" }, sub || "Arraste o fundo vazio para navegar · Ctrl + Roda do mouse para zoom")
        ),
        P.roots.map((r, i) =>
          h("div", { key: r, className: i ? "mt-14 pt-6" : "", style: i ? { borderTop: "1px dashed var(--danger)" } : undefined },
            i > 0 && h("div", { className: "fg-danger text-xs font-bold mb-2 uppercase" }, "Nó órfão (sem conexão com a raiz):"),
            h(Branch, { id: r, T, P, sel, setSel, onJumpNode, onOpenEndingsModal })
          )
        )
      )
    )
  );
}

/* ==========================================================================
   MATRIZ, VEREDITO, OPÇÕES, SALVAR E SIMULADOR
   ========================================================================== */
function Matriz({ cenaData, cfg, proxCena, updCena, onJumpNext }) {
  if (!A(cenaData?.matriz).length) return null;
  return h(Panel, {
    title: "Matriz de Transição" + (proxCena ? " -> " + proxCena.rotulo : ""),
    tone: "a",
    defaultOpen: false,
    right: proxCena && proxCena.aberturas && cfg.modulos.aberturas_dinamicas && h(Btn, {
      tone: "c",
      size: "sm",
      onClick: e => { e.stopPropagation(); onJumpNext(proxCena.id); }
    }, "Ir para Entrada de " + proxCena.rotulo)
  },
    A(cenaData?.matriz).map((m, i) => {
      const exp = isExpMatrixKey(m.k);
      const stTone = stateTone(cfg, m.k);
      return h("div", { key: m.k, className: "grid gap-2.5 mb-2.5 md:grid-cols-[220px_1fr] items-start" },
        h("div", {
          className: "px-3 py-2 rounded text-sm font-bold flex items-center justify-between " + (exp ? "tone-box-p fg-spec" : stTone.boxCls + " " + stTone.textCls),
          style: { border: "1px solid var(--border-2)" }
        },
          h("span", null, m.k),
          exp && h("span", { className: "text-xs uppercase" }, "Exp")
        ),
        h(TA, {
          value: m.efeito,
          label: "Nota " + m.k,
          onChange: t => updCena(c => { if (c.matriz[i]) c.matriz[i].efeito = t; })
        })
      );
    })
  );
}

function Veredito({ cenaData, scRotulo, updCena }) {
  const v = cenaData?.veredito;
  if (!v) return null;
  return h(Panel, { title: "Veredito · " + scRotulo, tone: "a", defaultOpen: false },
    h("div", { className: "max-w-xs mb-3" },
      h(Lbl, null, "Natureza Real do NPC"),
      h("select", {
        className: "dt-input",
        value: v.verdade,
        onChange: e => updCena(c => { if (c.veredito) c.veredito.verdade = e.target.value; })
      }, ["Humano", "Sintético"].map(k => h("option", { key: k, value: k }, k)))
    ),
    A(v.opcoes).map((o, i) => {
      const acerto = o.k === "Inconclusivo" ? "SEM DECISÃO" : o.k === v.verdade ? "ACERTO" : "ERRO";
      const cls = acerto === "ACERTO" ? "tone-box-g fg-pri" : acerto === "ERRO" ? "tone-box-r fg-danger" : "tone-box-a fg-sec";
      return h("div", { key: o.k, className: "grid gap-2.5 mt-2.5 md:grid-cols-[210px_1fr] items-start" },
        h("div", { className: "px-3 py-2 rounded text-sm font-bold " + cls, style: { border: "1px solid var(--border-2)" } }, o.k + " · " + acerto),
        h(TA, {
          value: o.consequencia,
          label: "Consequência " + o.k,
          onChange: t => updCena(c => { if (c.veredito && c.veredito.opcoes[i]) c.veredito.opcoes[i].consequencia = t; })
        })
      );
    })
  );
}

function ConfigModal({ game, updGame, onOpenEndings, onClose }) {
  const cfg = game.config;
  useEffect(() => {
    const f = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  const toggleMod = k => updGame(g => { g.config.modulos[k] = !g.config.modulos[k]; });

  return h("div", { className: "fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4", role: "dialog", "aria-modal": "true", onClick: onClose },
    h("div", { className: "w-full max-w-xl dt-card p-6 space-y-4", onClick: e => e.stopPropagation() },
      h("div", { className: "flex justify-between items-center pb-3", style: { borderBottom: "1px solid var(--border-1)" } },
        h("h3", { className: "text-xl font-bold fg-1 m-0" }, "Opções e Módulos do Projeto"),
        h(Btn, { tone: "z", size: "sm", onClick: onClose }, h(Icon, { name: "close", size: 15 }))
      ),
      h("div", { className: "space-y-2" },
        [
          ["metrica_global", "Métrica Global entre NPCs"],
          ["inventario", "Inventário de Itens, Informações & Confrontos"],
          ["aberturas_dinamicas", "Falas iniciais variantes por final anterior"],
          ["matriz_transicao", "Painel Matriz de Transição"],
          ["veredito", "Painel de Veredito Final"],
          ["export_turing_txt", "Exportador TXT para Motor C (TuringTest)"]
        ].map(([k, label]) =>
          h("button", {
            key: k,
            type: "button",
            onClick: () => toggleMod(k),
            className: "w-full text-left px-3.5 py-2.5 rounded flex justify-between items-center cursor-pointer",
            style: {
              backgroundColor: cfg.modulos[k] ? "var(--pri-soft)" : "var(--bg-surface)",
              border: "1px solid " + (cfg.modulos[k] ? "var(--pri)" : "var(--border-2)"),
              color: "var(--fg-1)"
            }
          }, h("span", { className: "font-medium" }, label), h("span", { className: "text-xs font-bold uppercase " + (cfg.modulos[k] ? "fg-pri" : "fg-3") }, cfg.modulos[k] ? "Ativo" : "Off"))
        )
      ),
      h("div", { className: "pt-3 flex justify-between items-center", style: { borderTop: "1px solid var(--border-1)" } },
        h("span", { className: "text-sm fg-2" }, "Finais: " + (cfg.estados_folha.length ? cfg.estados_folha.map(e => e.nome).join(", ") : "Fim Simples")),
        h(Btn, { tone: "g", size: "sm", onClick: () => { onClose(); onOpenEndings(); } }, h(Icon, { name: "edit", size: 13 }), "Editar Finais")
      )
    )
  );
}

function SaveExportModal({ game, activeNpc, aba, onClose, flash }) {
  const cfg = game.config;
  const groups = [...new Set(cfg.cenas.map(c => c.grupo).filter(Boolean))];
  const txtTargets = [...cfg.cenas.map(c => c.id), ...cfg.arvores_extras.map(e => e.id.toLowerCase())];

  const [showAdv, setShowAdv] = useState(false);
  const [advModo, setAdvModo] = useState(cfg.modulos.export_turing_txt ? "turing_txt" : "runtime_json");
  const [packGroup, setPackGroup] = useState(groups[0] || "");
  const [txtAlvo, setTxtAlvo] = useState(cfg.cenas.some(c => c.id === aba) ? aba : txtTargets[0] || "D1");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const f = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

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

  const gSlug = slug(game.game_nome || game.game_id) || "papo";
  const nSlug = baseOf(activeNpc);

  const salvarDialogoAtual = () => {
    const fn = gSlug + "_" + nSlug + "_dialogo_" + slug(aba) + ".json";
    salvarArquivo(fn, JSON.stringify(toExportSingleTree(activeNpc, game, aba), null, 2), "application/json");
    flash("Salvo Diálogo Atual: " + fn);
    setMsg("Baixado: " + fn);
  };

  const salvarPersonagemAtual = () => {
    const fn = gSlug + "_npc_" + nSlug + ".json";
    salvarArquivo(fn, JSON.stringify(toExportNpc(activeNpc, game), null, 2), "application/json");
    flash("Salvo NPC: " + fn);
    setMsg("Baixado: " + fn);
  };

  const salvarArvoreGlobal = () => {
    const fn = gSlug + "_arvore_global.json";
    salvarArquivo(fn, JSON.stringify(toExportGame(game), null, 2), "application/json");
    flash("Salva Árvore Global: " + fn);
    setMsg("Baixado: " + fn);
  };

  const gerarAdv = () => {
    if (advModo === "turing_txt") return toTuringTxt(activeNpc, cfg, txtAlvo);
    if (advModo === "pack_json") return JSON.stringify(toExportChapterPack(activeNpc, game, packGroup), null, 2);
    if (advModo === "runtime_json") return JSON.stringify(toExportRuntimeEngine(activeNpc, game), null, 2);
    if (advModo === "script_txt") return toReadableScript(activeNpc, game);
    return JSON.stringify(toExportGame(game), null, 2);
  };

  const advText = showAdv ? gerarAdv() : "";

  const baixarAdv = () => {
    if (advModo === "turing_txt") salvarArquivo(nomeTxtOf(activeNpc, txtAlvo), advText, "text/plain");
    else if (advModo === "pack_json") salvarArquivo(gSlug + "_" + nSlug + "_" + slug(packGroup || "pacote") + ".json", advText, "application/json");
    else if (advModo === "runtime_json") salvarArquivo(gSlug + "_" + nSlug + "_runtime.json", advText, "application/json");
    else if (advModo === "script_txt") salvarArquivo(gSlug + "_" + nSlug + "_roteiro.txt", advText, "text/plain");
    else salvarArvoreGlobal();
  };

  return h("div", { className: "fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4", role: "dialog", "aria-modal": "true", onClick: onClose },
    h("div", { className: "w-full max-w-4xl dt-card p-6 max-h-[92vh] overflow-auto space-y-5", onClick: e => e.stopPropagation() },
      h("div", { className: "flex justify-between items-center pb-3", style: { borderBottom: "1px solid var(--border-1)" } },
        h("h3", { className: "text-2xl font-bold fg-1 m-0" }, "O que você deseja salvar?"),
        h(Btn, { tone: "z", size: "sm", onClick: onClose }, h(Icon, { name: "close", size: 15 }))
      ),
      h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" },
        h("div", { className: "dt-panel p-4 flex flex-col justify-between" },
          h("div", null,
            h("div", { className: "text-lg font-bold fg-info mb-1" }, "1. Diálogo Atual"),
            h("p", { className: "text-sm fg-2 mb-4" }, "Salva somente a árvore aberta agora (" + aba + " de " + activeNpc.npc.nome + ").")
          ),
          h(Btn, { tone: "c", extra: "w-full", onClick: salvarDialogoAtual }, h(Icon, { name: "download", size: 15 }), "Salvar Diálogo Atual")
        ),
        h("div", { className: "dt-panel p-4 flex flex-col justify-between" },
          h("div", null,
            h("div", { className: "text-lg font-bold fg-sec mb-1" }, "2. Este NPC Inteiro"),
            h("p", { className: "text-sm fg-2 mb-4" }, "Salva todas as etapas, abas especiais e itens de " + activeNpc.npc.nome + ".")
          ),
          h(Btn, { tone: "a", extra: "w-full", onClick: salvarPersonagemAtual }, h(Icon, { name: "download", size: 15 }), "Salvar Este NPC")
        ),
        h("div", { className: "dt-panel p-4 flex flex-col justify-between tone-box-g", style: { border: "1px solid var(--pri)" } },
          h("div", null,
            h("div", { className: "text-lg font-bold fg-pri mb-1" }, "3. Árvore Global"),
            h("p", { className: "text-sm fg-2 mb-4" }, "Salva todos os diálogos de todos os " + game.npcs.length + " NPC(s) em um único arquivo .JSON.")
          ),
          h(Btn, { tone: "g", extra: "w-full", onClick: salvarArvoreGlobal }, h(Icon, { name: "download", size: 15 }), "Salvar Árvore Global")
        )
      ),
      h("div", { className: "pt-2", style: { borderTop: "1px solid var(--border-1)" } },
        h(Btn, { tone: "z", extra: "w-full justify-between", onClick: () => setShowAdv(!showAdv) },
          h("span", null, "Exportação Avançada (TXT Jogo C · Engine Runtime · Roteiro · Código Bruto)"),
          h("span", { className: "fg-3" }, showAdv ? "Ocultar" : "Abrir")
        ),
        showAdv && h("div", { className: "mt-4 space-y-3" },
          h("div", { className: "flex flex-wrap gap-2 items-center" },
            cfg.modulos.export_turing_txt && h(Btn, { tone: "c", on: advModo === "turing_txt", onClick: () => setAdvModo("turing_txt") }, "TXT Jogo em C"),
            groups.length > 0 && h(Btn, { tone: "a", on: advModo === "pack_json", onClick: () => setAdvModo("pack_json") }, "Pacote de Semana"),
            h(Btn, { tone: "p", on: advModo === "runtime_json", onClick: () => setAdvModo("runtime_json") }, "Engine Runtime (.JSON)"),
            h(Btn, { tone: "z", on: advModo === "script_txt", onClick: () => setAdvModo("script_txt") }, "Roteiro Legível (.TXT)"),
            h(Btn, { tone: "g", on: advModo === "raw_global", onClick: () => setAdvModo("raw_global") }, "Ver JSON Global")
          ),
          advModo === "turing_txt" && h("div", { className: "flex flex-wrap items-center gap-2" },
            h("select", { className: "dt-input !w-56", value: txtAlvo, onChange: e => setTxtAlvo(e.target.value) },
              txtTargets.map(k => h("option", { key: k, value: k }, nomeTxtOf(activeNpc, k)))
            ),
            h(Btn, {
              tone: "c",
              onClick: () => txtTargets.forEach((k, i) => setTimeout(() => salvarArquivo(nomeTxtOf(activeNpc, k), toTuringTxt(activeNpc, cfg, k), "text/plain"), i * 240))
            }, "Baixar Todos os TXTs deste NPC")
          ),
          h("textarea", { readOnly: true, value: advText, className: "dt-input h-52 font-mono text-xs" }),
          h("div", { className: "flex gap-2" },
            h(Btn, { tone: "z", onClick: async () => { try { await navigator.clipboard.writeText(advText); setMsg("Copiado para a área de transferência."); } catch (e) {} } }, "Copiar Texto"),
            h(Btn, { tone: "c", onClick: baixarAdv }, h(Icon, { name: "download", size: 14 }), "Baixar Este Arquivo")
          )
        )
      ),
      msg && h("div", { className: "fg-pri text-sm font-semibold", role: "status" }, msg)
    )
  );
}

function SimModal({ game, npc, aba, onClose }) {
  const cfg = game.config;
  const sc = cfg.cenas.find(c => c.id === aba);
  const ex = !sc ? cfg.arvores_extras.find(e => e.id === aba) : null;
  const isScene = !!sc;
  const rootChoicesOnly = !isScene && ex?.modo_raiz !== "fala";
  const nos = isScene ? (npc.cenas?.[aba]?.nos || []) : (npc.extras?.[aba]?.nos || []);
  const by = {};
  A(nos).forEach(n => { by[n.id] = n; });
  const rootId = nos[0]?.id || "Entrada";
  const defState = defaultLeafName(cfg);

  const initialNpcNat = (() => {
    const s1v = npc.cenas?.D3?.veredito?.verdade;
    if (s1v === "Sintético" || /sint[eé]tic|ia\b/i.test(S(npc.npc.tipo))) return "Sintético";
    return "Humano";
  })();

  const [npcNatureza, setNpcNatureza] = useState(initialNpcNat);
  const [visHerdada, setVisHerdada] = useState(defState);
  const [ferramenta] = useState(!isScene ? aba.toLowerCase() : "nenhuma");
  const [ownedEvs, setOwnedEvs] = useState(() => new Set(A(npc.evidencias).map(e => e.id)));
  const [curId, setCurId] = useState(rootId);
  const [visited, setVisited] = useState(() => new Set([rootId]));
  const [log, setLog] = useState([]);
  const [desconf, setDesconf] = useState(0);

  const playerName = game.nome_jogador || "Jogador";
  const fmt = txt => S(txt).replace(/\[nome\]/g, playerName);

  const makeCtx = ov => ({
    npcNatureza,
    visao: visHerdada,
    ferramenta,
    ownedEvs,
    desconf,
    customTrue: true,
    ...(ov || {})
  });

  const resolveFala = (n, ctx) => {
    if (!n) return { text: "", ifHit: null };
    for (const fc of A(n.fala_condicional)) {
      if (S(fc.fala).trim() && evalCondInSim(fc.cond, ctx)) {
        return { text: fmt(fc.fala), ifHit: condHumanLabel(fc.cond) };
      }
    }
    if (isScene && sc.aberturas && cfg.modulos.aberturas_dinamicas && cfg.estados_folha.length > 0 && n.id === rootId && n.aberturas) {
      const sk = stateKey(ctx.visao || defState);
      const defSk = stateKey(defState);
      return { text: fmt(n.aberturas[sk] || n.aberturas[defSk] || n.fala_npc), ifHit: null };
    }
    return { text: fmt(n.fala_npc), ifHit: null };
  };

  const advanceThroughIfs = (startId, ctx) => {
    const steps = [];
    let curr = by[startId];
    let guard = 0;
    while (curr && curr.condicional && guard < 12) {
      guard += 1;
      const res = evalCondInSim(curr.condicional.cond, ctx);
      const nextId = res ? curr.condicional.se_verdadeiro : curr.condicional.se_falso;
      steps.push({
        role: "sys",
        text: "IF: " + condHumanLabel(curr.condicional.cond) + " -> " + (res ? "VERDADEIRO" : "FALSO") + " (" + (nextId || "?") + ")"
      });
      curr = nextId ? by[nextId] : null;
    }
    return { finalNode: curr, steps };
  };

  const reiniciar = ov => {
    const ctx = makeCtx(ov);
    const { finalNode, steps } = advanceThroughIfs(rootId, ctx);
    setCurId(finalNode?.id || rootId);
    setVisited(new Set([rootId, ...(finalNode ? [finalNode.id] : [])]));
    const d0 = finalNode?.desconfianca || 0;
    setDesconf(d0);
    const rf = resolveFala(finalNode, { ...ctx, desconf: d0 });
    const showInitialNpcMsg = finalNode && !(rootChoicesOnly && finalNode.id === rootId && !S(rf.text).trim());
    setLog([
      ...steps,
      ...(showInitialNpcMsg ? [{ role: "npc", speaker: npc.npc.falante || npc.npc.nome, text: rf.text, ifHit: rf.ifHit, nodeId: finalNode.id }] : [])
    ]);
  };

  useEffect(() => { reiniciar(); }, []);
  useEffect(() => {
    const f = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  const cur = by[curId];
  const ctxNow = makeCtx();
  const escolhas = [];
  if (cur && !cur.folha && !cur.condicional) {
    A(cur.opcoes).forEach((o, i) => {
      if (!o.proximo_no || !by[o.proximo_no]) return;
      if (o.cond && !evalCondInSim(o.cond, ctxNow)) return;
      const isReturn = o.proximo_no === rootId;
      if (!isReturn && visited.has(o.proximo_no)) return;
      escolhas.push({ texto: fmt(o.texto), dest: o.proximo_no, req: null, ifCond: o.cond ? condHumanLabel(o.cond) : null, key: "o" + i });
    });
    A(cur.desbloqueios).forEach((x, i) => {
      const destNode = by[x.no];
      if (!destNode || !ownedEvs.has(x.ev)) return;
      if (x.no !== rootId && visited.has(x.no)) return;
      escolhas.push({
        texto: fmt(destNode.confronto_evidencia?.pergunta_jogador || "(usar " + x.ev + ")"),
        dest: x.no,
        req: x.ev,
        ifCond: null,
        key: "e" + i
      });
    });
  }
  const visiveis = cfg.modulos.export_turing_txt ? escolhas.slice(0, 4) : escolhas;

  const escolher = c => {
    const { finalNode, steps } = advanceThroughIfs(c.dest, ctxNow);
    if (!finalNode) return;
    setCurId(finalNode.id);
    setVisited(prev => new Set([...prev, c.dest, finalNode.id]));
    let nextOwned = ownedEvs;
    if (finalNode.evidencia_desbloqueada) {
      nextOwned = new Set([...ownedEvs, finalNode.evidencia_desbloqueada]);
      setOwnedEvs(nextOwned);
    }
    const nextDesc = desconf + (finalNode.desconfianca || 0);
    if (finalNode.desconfianca > 0) setDesconf(nextDesc);
    const nextVis = finalNode.folha ? finalNode.folha.visao_jogador : visHerdada;
    if (finalNode.folha && nextVis) setVisHerdada(nextVis);

    const rf = resolveFala(finalNode, { ...ctxNow, ownedEvs: nextOwned, desconf: nextDesc, visao: nextVis });
    setLog(l => [
      ...l,
      { role: "player", speaker: playerName, text: c.texto, req: c.req },
      ...steps,
      { role: "npc", speaker: npc.npc.falante || npc.npc.nome, text: rf.text, ifHit: rf.ifHit, nodeId: finalNode.id }
    ]);
  };

  return h("div", { className: "fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4", role: "dialog", "aria-modal": "true", onClick: onClose },
    h("div", { className: "w-full max-w-3xl dt-card p-5 max-h-[92vh] flex flex-col", onClick: e => e.stopPropagation() },
      h("div", { className: "flex justify-between items-center pb-3", style: { borderBottom: "1px solid var(--border-1)" } },
        h("span", { className: "text-xl font-bold fg-1" }, "Simulador · " + (npc.npc.nome || "NPC") + " · " + aba),
        h("div", { className: "flex gap-2" },
          h(Btn, { tone: "a", size: "sm", onClick: () => reiniciar() }, "Reiniciar"),
          h(Btn, { tone: "z", size: "sm", onClick: onClose }, h(Icon, { name: "close", size: 15 }))
        )
      ),
      h("div", { className: "flex flex-wrap gap-2 items-center py-2.5 text-sm", style: { borderBottom: "1px solid var(--border-1)" } },
        h("span", { className: "fg-2" }, "Natureza NPC:"),
        ["Humano", "Sintético"].map(nat =>
          h(Btn, {
            key: nat,
            tone: "p",
            size: "sm",
            on: npcNatureza === nat,
            onClick: () => { setNpcNatureza(nat); reiniciar({ npcNatureza: nat }); }
          }, nat)
        ),
        cfg.estados_folha.length > 0 && h("span", { className: "fg-2 ml-2" }, "Estado:"),
        cfg.estados_folha.map(est =>
          h(Btn, {
            key: est.nome,
            tone: est.cor || "a",
            size: "sm",
            on: visHerdada === est.nome,
            onClick: () => { setVisHerdada(est.nome); reiniciar({ visao: est.nome }); }
          }, est.nome)
        ),
        cfg.modulos.metrica_global && h("span", { className: "ml-auto fg-danger font-bold" }, (cfg.termos.metrica_nome || "Métrica") + ": " + desconf)
      ),
      cfg.modulos.inventario && A(npc.evidencias).length > 0 && h("div", { className: "flex flex-wrap gap-1.5 py-2 text-xs items-center", style: { borderBottom: "1px solid var(--border-1)" } },
        h("span", { className: "fg-2" }, "Itens em posse:"),
        A(npc.evidencias).map(e => {
          const on = ownedEvs.has(e.id);
          return h(Btn, {
            key: e.id,
            tone: on ? "c" : "z",
            size: "sm",
            onClick: () => setOwnedEvs(prev => { const n = new Set(prev); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n; })
          }, e.id);
        })
      ),
      h("div", { className: "flex-1 overflow-auto py-4 space-y-2.5 min-h-[220px]" },
        log.map((m, idx) =>
          m.role === "sys"
            ? h("div", { key: idx, className: "text-center text-xs fg-spec py-1 px-3 rounded tone-box-p" }, m.text)
            : h("div", { key: idx, className: "flex " + (m.role === "player" ? "justify-end" : "justify-start") },
                h("div", {
                  className: "max-w-[82%] rounded px-3.5 py-2.5 " + (m.role === "player" ? "tone-box-g" : ""),
                  style: m.role === "player" ? { border: "1px solid var(--pri)" } : { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-2)" }
                },
                  h("div", { className: "text-xs font-bold flex justify-between gap-4 mb-1 " + (m.role === "player" ? "fg-pri" : "fg-sec") },
                    h("span", null, m.speaker + (m.req ? " [REQ " + m.req + "]" : "") + (m.ifHit ? " [IF " + m.ifHit + "]" : "")),
                    m.nodeId && h("span", { className: "fg-3" }, m.nodeId)
                  ),
                  h("div", { className: "fg-1" }, m.text || h("span", { className: "fg-danger italic" }, "(fala vazia)"))
                )
              )
        ),
        cur?.folha && (() => {
          const tn = stateTone(cfg, cur.folha.visao_jogador);
          return h("div", { className: "rounded p-2.5 text-center font-bold uppercase text-sm " + tn.boxCls + " " + tn.textCls, style: { border: "1px solid var(--border-2)" } },
            "Fim do Diálogo" + (cur.folha.visao_jogador ? " · " + cur.folha.visao_jogador : "")
          );
        })()
      ),
      !cur?.folha && h("div", { className: "pt-3 space-y-1.5", style: { borderTop: "1px solid var(--border-1)" } },
        visiveis.length === 0 && h("div", { className: "fg-danger text-sm" }, "Sem escolhas disponíveis a partir deste nó."),
        visiveis.map((c, idx) =>
          h(Btn, {
            key: c.key,
            tone: c.req ? "c" : "z",
            extra: "w-full justify-between text-left",
            onClick: () => escolher(c)
          },
            h("span", null, (c.req ? "[REQ " + c.req + "] " : (LET[idx] + ") ")) + (c.ifCond ? "[IF " + c.ifCond + "] " : "") + (c.texto || "(opção vazia)")),
            h("span", { className: "text-xs fg-3 shrink-0" }, "-> " + c.dest)
          )
        )
      )
    )
  );
}

/* ==========================================================================
   APP PRINCIPAL
   ========================================================================== */
function App() {
  const [reg, setReg] = useState(() => loadRegistry());
  const [menuTheme, setMenuTheme] = useState(() => oneOf(lsGet(K_THEME_PREF), THEME_IDS, DEFAULT_THEME));
  const [screen, setScreen] = useState("menu");
  const [game, setGame] = useState(null);

  const [sel, setSel] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [editingTab, setEditingTab] = useState(false);
  const [renamingNpc, setRenamingNpc] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [endingsOpen, setEndingsOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState({ ok: true, at: "" });
  const headerFileRef = useRef(null);

  const activeTheme = screen === "editor" && game?.config?.theme ? game.config.theme : menuTheme;

  useEffect(() => {
    const th = oneOf(activeTheme, THEME_IDS, DEFAULT_THEME);
    document.documentElement.setAttribute("data-theme", th);
    lsSet(K_THEME_PREF, th);
  }, [activeTheme]);

  const flash = m => { setToast(m); setTimeout(() => setToast(""), 2800); };

  useEffect(() => {
    if (!game) return;
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
      if (ix >= 0) nextList[ix] = entry; else nextList.unshift(entry);
      const nextReg = { activeId: game.game_id, list: nextList };
      saveRegistry(nextReg);
      return nextReg;
    });

    const t = setTimeout(() => lsSet(K_GOOD_PREFIX + game.game_id, s), 2000);
    return () => clearTimeout(t);
  }, [game]);

  const handleOpenSaved = id => {
    const loaded = loadGameById(id);
    if (!loaded) {
      flash("Não foi possível abrir este papo salvo.");
      return;
    }
    setSel(null);
    setEditingTab(false);
    setGame(loaded);
    setScreen("editor");
  };

  const handleDeleteSaved = id => {
    lsDel(K_GAME_PREFIX + id);
    lsDel(K_GOOD_PREFIX + id);
    const nextList = reg.list.filter(x => x.id !== id);
    const nextActive = reg.activeId === id ? (nextList[0]?.id || "") : reg.activeId;
    const nextReg = { activeId: nextActive, list: nextList };
    saveRegistry(nextReg);
    setReg(nextReg);
  };

  const loadJsonIntoApp = (rawText, insideEditor) => {
    const parsed = JSON.parse(rawText);
    const det = detectImportedFile(parsed);
    setSel(null);
    setEditingTab(false);

    if (det.kind === "game") {
      const norm = normalizeGame(det.payload, menuTheme);
      setGame(norm);
      setScreen("editor");
      flash("Árvore Global carregada: " + norm.game_nome);
      return;
    }

    if (det.kind === "npc") {
      if (insideEditor && game) {
        setGame(prev => {
          const c = clone(prev);
          const imp = normalizeNpc(det.payload, c.config);
          const ix = c.npcs.findIndex(x => x.npc.id === imp.npc.id || slug(x.npc.nome) === slug(imp.npc.nome));
          if (ix >= 0) { c.npcs[ix] = imp; c.npc_ativo = ix; }
          else { c.npcs.push(imp); c.npc_ativo = c.npcs.length - 1; }
          return normalizeGame(c, c.config.theme);
        });
        flash("NPC carregado: " + det.npcName);
      } else {
        const cfg = det.isTuringNpc ? makeTuringConfig(menuTheme) : makeSimpleCleanConfig(menuTheme);
        const ng = createGameFromCustomConfig(det.gameName || ("Papo · " + det.npcName), cfg, 3);
        ng.npcs = [normalizeNpc(det.payload, ng.config)];
        ng.npc_ativo = 0;
        setGame(normalizeGame(ng, menuTheme));
        setScreen("editor");
        flash("Papo carregado: " + det.npcName);
      }
      return;
    }

    if (det.kind === "chapter_pack") {
      const baseGame = (insideEditor && game) ? clone(game) : createGameFromCustomConfig(det.gameName || "Papo Carregado", makeTuringConfig(menuTheme), 3);
      const targetIdx = baseGame.npc_ativo || 0;
      const list = A(det.payload.cenas_pack || det.payload.dias);
      list.forEach(item => {
        if (!item?.id) return;
        if (!baseGame.config.cenas.some(c => c.id === item.id)) {
          baseGame.config.cenas.push({ id: item.id, rotulo: item.rotulo || item.id, grupo: item.grupo || "", aberturas: false, matriz: false, veredito: false });
        }
        const scCfg = baseGame.config.cenas.find(c => c.id === item.id);
        const normT = normTree(item.arvore?.nos || item.nos, [N("Entrada", "Abertura", "", [])], true, !!(baseGame.config.modulos.aberturas_dinamicas && scCfg?.aberturas), baseGame.config);
        baseGame.npcs[targetIdx].cenas[item.id] = { nos: normT.nos, matriz: A(item.matriz), veredito: item.veredito || null };
      });
      if (list[0]?.id) baseGame.npcs[targetIdx].aba = list[0].id;
      setGame(normalizeGame(baseGame, menuTheme));
      setScreen("editor");
      flash("Pacote carregado.");
      return;
    }

    if (det.kind === "single_tree") {
      const baseGame = (insideEditor && game) ? clone(game) : createGameFromCustomConfig(det.gameName || "Papo Carregado", makeTuringConfig(menuTheme), 3);
      const targetIdx = baseGame.npc_ativo || 0;
      const np = baseGame.npcs[targetIdx];
      const destAba = det.targetId || np.aba || baseGame.config.cenas[0]?.id || "D1";
      const scCfg = baseGame.config.cenas.find(c => c.id === destAba);
      const exCfg = baseGame.config.arvores_extras.find(e => e.id === destAba);
      if (!scCfg && !exCfg) {
        baseGame.config.cenas.push({ id: destAba, rotulo: destAba, grupo: "", aberturas: false, matriz: false, veredito: false });
      }
      const isSc = !exCfg;
      const hasAb = !!(isSc && baseGame.config.modulos.aberturas_dinamicas && scCfg?.aberturas);
      const normT = normTree(det.payload.nos, [N(isSc ? "Entrada" : "Raiz", "Abertura", "", [])], isSc, hasAb, baseGame.config);
      if (isSc) np.cenas[destAba] = { nos: normT.nos, matriz: A(det.payload.matriz), veredito: det.payload.veredito || null };
      else np.extras[destAba] = { nos: normT.nos };
      np.aba = destAba;
      setGame(normalizeGame(baseGame, menuTheme));
      setScreen("editor");
      flash("Diálogo '" + destAba + "' carregado.");
    }
  };

  if (screen === "menu") {
    return h("div", null,
      h(TitleScreen, {
        reg,
        currentTheme: menuTheme,
        onThemeChange: th => setMenuTheme(th),
        onGoNewPapo: () => setScreen("new_papo"),
        onContinuePapo: handleOpenSaved,
        onSelectSavedPapo: handleOpenSaved,
        onDeleteSavedPapo: handleDeleteSaved,
        onLoadFileText: txt => loadJsonIntoApp(txt, false)
      }),
      toast && h("div", { className: "fixed right-5 bottom-5 z-50 dt-card px-4 py-2.5 font-semibold fg-pri", style: { borderColor: "var(--pri)" }, role: "status" }, toast)
    );
  }

  if (screen === "new_papo" || !game) {
    return h("div", null,
      h(NewPapoScreen, {
        currentTheme: menuTheme,
        onThemeChange: th => setMenuTheme(th),
        onCancel: () => setScreen("menu"),
        onConfirmCreate: (nome, cfg) => {
          const ng = createGameFromCustomConfig(nome, cfg, 3);
          setSel(null);
          setEditingTab(false);
          setGame(ng);
          setScreen("editor");
          flash("Projeto iniciado.");
        }
      }),
      toast && h("div", { className: "fixed right-5 bottom-5 z-50 dt-card px-4 py-2.5 font-semibold fg-pri", style: { borderColor: "var(--pri)" }, role: "status" }, toast)
    );
  }

  const cfg = game.config;
  const npcIdx = Math.min(game.npcs.length - 1, Math.max(0, game.npc_ativo || 0));
  const data = game.npcs[npcIdx] || game.npcs[0];

  const allAbas = [...cfg.cenas.map(c => c.id), ...cfg.arvores_extras.map(e => e.id)];
  const aba = allAbas.includes(data.aba) ? data.aba : (cfg.cenas[0]?.id || "D1");
  const curScIdx = cfg.cenas.findIndex(c => c.id === aba);
  const curSc = curScIdx >= 0 ? cfg.cenas[curScIdx] : null;
  const curEx = !curSc ? cfg.arvores_extras.find(e => e.id === aba) : null;
  const evs = A(data.evidencias);

  const updGame = fn => setGame(prev => {
    try {
      const c = clone(prev);
      fn(c);
      const next = normalizeGame(c, c.config?.theme);
      window.__turingPending = next;
      return next;
    } catch (e) {
      try { console.error(e); } catch (_) {}
      return prev;
    }
  });

  const updNpc = fn => updGame(g => { const target = g.npcs[npcIdx]; if (target) fn(target); });
  const updCena = fn => updNpc(d => { if (curSc && d.cenas?.[curSc.id]) fn(d.cenas[curSc.id]); });

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

  const adicionarNovaEtapa = () => {
    let novoIdCena = "";
    updGame(g => {
      const k = g.config.cenas.length + 1;
      novoIdCena = "D" + k;
      while (g.config.cenas.some(z => z.id === novoIdCena)) novoIdCena += "_2";
      g.config.cenas.push({
        id: novoIdCena,
        rotulo: "Dia " + k,
        grupo: "",
        aberturas: !!(g.config.modulos.aberturas_dinamicas && g.config.estados_folha.length > 0),
        matriz: false,
        veredito: false
      });
      g.npcs[npcIdx].aba = novoIdCena;
    });
    setEditingTab(true);
  };

  const adicionarNovaAbaEspecial = () => {
    let novoIdEx = "";
    updGame(g => {
      let k = g.config.arvores_extras.length + 1;
      novoIdEx = "ESPECIAL_" + k;
      while (g.config.arvores_extras.some(z => z.id === novoIdEx)) { k += 1; novoIdEx = "ESPECIAL_" + k; }
      g.config.arvores_extras.push({
        id: novoIdEx,
        rotulo: "Especial " + k,
        cor: "p",
        modo_raiz: "escolhas",
        sub: ""
      });
      g.npcs[npcIdx].aba = novoIdEx;
    });
    setEditingTab(true);
  };

  const setZ = z => setZoom(Math.min(1.5, Math.max(0.4, Math.round(z * 100) / 100)));
  const activeNos = curSc ? data.cenas?.[curSc.id]?.nos : data.extras?.[aba]?.nos;
  const activeTitulo = curSc
    ? (data.npc.nome || "NPC") + " · " + curSc.rotulo
    : (curEx?.rotulo || aba) + " · " + (data.npc.nome || "NPC");

  return h("div", { className: "min-h-screen w-full" },
    /* HEADER LIMPO EM 2 BARRAS */
    h("header", { className: "sticky top-0 z-50 dt-surface", style: { borderBottom: "1px solid var(--border-2)" } },
      /* Barra 1: Menu, Título, NPCs (+ NPC) e Ações */
      h("div", { className: "py-2 px-4 flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap", style: { borderBottom: "1px solid var(--border-1)" } },
        h(Btn, {
          tone: "z",
          size: "sm",
          extra: "shrink-0",
          onClick: () => { setMenuTheme(cfg.theme || DEFAULT_THEME); setEditingTab(false); setScreen("menu"); }
        }, h(Icon, { name: "back", size: 14 }), "Menu"),

        h("input", {
          className: "bg-transparent border-0 font-bold fg-1 px-2 py-0.5 !w-40 shrink-0 focus:outline-none",
          style: { borderBottom: "1px dashed var(--border-2)" },
          value: game.game_nome,
          title: "Nome do Projeto",
          onChange: e => updGame(g => { g.game_nome = e.target.value; })
        }),

        h("div", { className: "flex gap-1.5 flex-nowrap items-center ml-1", role: "tablist" },
          game.npcs.map((item, idx) => {
            const active = idx === npcIdx;
            const wCount = validarNpc(item, cfg).warns.length;
            if (active && renamingNpc) {
              return h("input", {
                key: idx,
                className: "dt-input !w-36 !py-1 text-sm",
                value: item.npc.nome,
                autoFocus: true,
                onBlur: () => setRenamingNpc(false),
                onKeyDown: e => { if (e.key === "Enter" || e.key === "Escape") setRenamingNpc(false); },
                onChange: e => updNpc(d => {
                  d.npc.nome = e.target.value;
                  d.npc.falante = e.target.value.split(" ")[0] || e.target.value;
                  d.npc.id = slug(d.npc.falante) || d.npc.id;
                })
              });
            }
            return h("div", { key: idx, className: "flex items-center gap-0.5" },
              h(Btn, {
                tone: active ? "g" : "z",
                size: "sm",
                on: active,
                onClick: () => { setSel(null); updGame(g => { g.npc_ativo = idx; }); }
              }, (item.npc.nome || ("NPC " + (idx + 1))) + (wCount > 0 ? " (" + wCount + ")" : "")),
              active && h(Btn, {
                tone: "z",
                size: "sm",
                extra: "!px-1.5",
                title: "Renomear este NPC",
                onClick: () => setRenamingNpc(true)
              }, h(Icon, { name: "edit", size: 12 }))
            );
          }),
          h(Btn, {
            tone: "z",
            size: "sm",
            onClick: () => {
              setSel(null);
              updGame(g => {
                g.npcs.push(blankNpcForConfig(g.config, g.npcs.length + 1));
                g.npc_ativo = g.npcs.length - 1;
              });
            }
          }, h(Icon, { name: "plus", size: 13 }), "NPC")
        ),

        h("div", { className: "flex items-center gap-2 ml-auto flex-nowrap shrink-0" },
          h("select", {
            className: "dt-input !w-48 !py-1 text-sm",
            value: cfg.theme || DEFAULT_THEME,
            title: "Tema Visual",
            onChange: e => { const th = e.target.value; setMenuTheme(th); updGame(g => { g.config.theme = th; }); }
          }, THEMES.map(t => h("option", { key: t.id, value: t.id }, t.label))),
          h(Btn, { tone: "z", size: "sm", onClick: () => setCfgOpen(true) }, h(Icon, { name: "sliders", size: 14 }), "Opções"),
          h(Btn, { tone: "c", size: "sm", onClick: () => setSimOpen(true) }, h(Icon, { name: "play", size: 12 }), "Testar"),
          h("input", {
            ref: headerFileRef,
            type: "file",
            accept: ".json,application/json",
            className: "hidden",
            onChange: ev => {
              const f = ev.target.files?.[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => {
                try { loadJsonIntoApp(String(r.result || ""), true); }
                catch (err) { flash("Erro no JSON: " + (err?.message || "inválido")); }
              };
              r.readAsText(f, "utf-8");
              ev.target.value = "";
            }
          }),
          h(Btn, { tone: "a", size: "sm", onClick: () => headerFileRef.current && headerFileRef.current.click() }, h(Icon, { name: "folder", size: 14 }), "Abrir"),
          h(Btn, { tone: "g", size: "sm", onClick: () => setSaveOpen(true) }, h(Icon, { name: "download", size: 14 }), "Salvar")
        )
      ),

      /* Barra 2: Etapas/Dias (+ Dia/Papo) | Abas Especiais (+ Aba Especial) + Ícone de Lápis */
      h("div", { className: "py-2 px-4 flex flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap" },
        h("div", { className: "flex gap-1.5 items-center flex-nowrap" },
          cfg.cenas.map(c => {
            const isAct = aba === c.id;
            return h("div", { key: c.id, className: "flex items-center gap-0.5" },
              h(Btn, {
                tone: isAct ? "a" : "z",
                size: "sm",
                on: isAct,
                onClick: () => { setSel(null); updNpc(d => { d.aba = c.id; }); }
              }, c.rotulo),
              isAct && h(Btn, {
                tone: editingTab ? "a" : "z",
                size: "sm",
                on: editingTab,
                extra: "!px-1.5",
                title: "Editar ou deletar esta etapa",
                onClick: () => setEditingTab(!editingTab)
              }, h(Icon, { name: "edit", size: 12 }))
            );
          }),
          h(Btn, { tone: "z", size: "sm", onClick: adicionarNovaEtapa }, h(Icon, { name: "plus", size: 13 }), "Dia / Papo")
        ),

        h("span", { className: "fg-3 mx-1.5" }, "|"),

        h("div", { className: "flex gap-1.5 items-center flex-nowrap" },
          cfg.arvores_extras.map(ex => {
            const isAct = aba === ex.id;
            const tn = ex.cor || "p";
            return h("div", { key: ex.id, className: "flex items-center gap-0.5" },
              h(Btn, {
                tone: isAct ? tn : "z",
                size: "sm",
                on: isAct,
                onClick: () => { setSel(null); updNpc(d => { d.aba = ex.id; }); }
              }, ex.rotulo),
              isAct && h(Btn, {
                tone: editingTab ? tn : "z",
                size: "sm",
                on: editingTab,
                extra: "!px-1.5",
                title: "Editar, renomear ou deletar esta aba especial",
                onClick: () => setEditingTab(!editingTab)
              }, h(Icon, { name: "edit", size: 12 }))
            );
          }),
          h(Btn, { tone: "p", size: "sm", onClick: adicionarNovaAbaEspecial }, h(Icon, { name: "plus", size: 13 }), "Aba Especial")
        ),

        h("div", { className: "flex items-center gap-1.5 ml-auto flex-nowrap shrink-0" },
          h("span", { role: "status", className: "mx-2 text-xs " + (saved.ok ? "fg-3" : "fg-danger") }, saved.ok ? "Salvo " + saved.at : "Sem storage"),
          h(Btn, { tone: "z", size: "sm", onClick: () => setZ(zoom - 0.1) }, h(Icon, { name: "minus", size: 12 })),
          h(Btn, { tone: "z", size: "sm", onClick: () => setZ(1) }, Math.round(zoom * 100) + "%"),
          h(Btn, { tone: "z", size: "sm", onClick: () => setZ(zoom + 0.1) }, h(Icon, { name: "plus", size: 12 }))
        )
      ),

      editingTab && h(TabInlineEditor, {
        game,
        aba,
        updGame,
        onClose: () => setEditingTab(false),
        onSelectAba: nextId => updNpc(d => { d.aba = nextId; }),
        flash
      })
    ),

    /* QUADRO DA ÁRVORE */
    h(TreeArea, {
      key: game.game_id + "|" + npcIdx + "|" + aba,
      aba,
      lineTone: curEx ? (curEx.cor || "p") : "g",
      titulo: activeTitulo,
      sub: curEx ? curEx.sub : "",
      nos: activeNos,
      evs,
      cfg,
      zoom,
      setZ,
      sel,
      setSel,
      updNodeIn,
      updTreeIn,
      onJumpNode: nid => focusNodeDom(aba, nid),
      onOpenEndingsModal: () => setEndingsOpen(true)
    }),

    /* PAINEL INFERIOR */
    h("section", { className: "p-6 dt-surface", style: { borderTop: "1px solid var(--border-2)" }, "aria-label": "Detalhes e ferramentas" },
      h(Panel, {
        title: "Ficha do NPC · " + (data.npc?.nome || "NPC"),
        tone: "g",
        defaultOpen: false,
        right: h("span", { className: "text-xs fg-3" }, "ID: " + (data.npc?.id || "npc"))
      },
        h("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-3 mb-3" },
          h("div", null,
            h(Lbl, null, "Nome do NPC"),
            h("input", { className: "dt-input", value: data.npc?.nome || "", onChange: e => updNpc(d => { d.npc.nome = e.target.value; }) })
          ),
          h("div", null,
            h(Lbl, null, "Descrição / Papel"),
            h("input", { className: "dt-input", value: data.npc?.tipo || "", placeholder: "Ex.: Humano, Sintético, Mercador...", onChange: e => updNpc(d => { d.npc.tipo = e.target.value; }) })
          ),
          h("div", null,
            h(Lbl, null, "ID de Exportação"),
            h("input", { className: "dt-input", value: data.npc?.id || "", onChange: e => updNpc(d => { d.npc.id = slug(e.target.value) || e.target.value; }) })
          ),
          h("div", null,
            h(Lbl, null, "Nome exibido nas falas"),
            h("input", { className: "dt-input", value: data.npc?.falante || "", onChange: e => updNpc(d => { d.npc.falante = e.target.value; }) })
          )
        ),
        h("div", { className: "flex gap-2" },
          h(Btn, {
            tone: "c",
            size: "sm",
            onClick: () => {
              updGame(g => {
                const copy = clone(g.npcs[npcIdx]);
                copy.npc.nome = copy.npc.nome + " (Cópia)";
                copy.npc.id = slug(copy.npc.id || "npc") + "_copia";
                g.npcs.push(copy);
                g.npc_ativo = g.npcs.length - 1;
              });
              flash("NPC duplicado.");
            }
          }, "Duplicar NPC"),
          game.npcs.length > 1 && h(ConfirmBtn, {
            tone: "r",
            size: "sm",
            ask: "Remover este NPC?",
            onConfirm: () => {
              setSel(null);
              updGame(g => {
                g.npcs.splice(npcIdx, 1);
                g.npc_ativo = Math.max(0, npcIdx - 1);
              });
            }
          }, h(Icon, { name: "trash", size: 13 }), "Remover NPC")
        )
      ),

      h(Validacao, { data, cfg, onJump: jumpTo }),
      cfg.modulos.inventario && h(Inventario, {
        data,
        cfg,
        updNpc,
        onDisableModule: () => updGame(g => { g.config.modulos.inventario = false; })
      }),
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

      h("div", { className: "flex flex-wrap gap-4 items-center mt-3 text-xs fg-2" },
        cfg.estados_folha.length > 0
          ? cfg.estados_folha.map(est => {
              const tn = TONE_MAP[est.cor] || TONE_MAP.a;
              return h("span", { key: est.nome, className: "font-semibold " + tn.textCls }, "Final: " + est.nome);
            })
          : h("span", { className: "fg-pri font-semibold" }, "Fim Simples"),
        h(Btn, { tone: "z", size: "sm", onClick: () => setEndingsOpen(true) }, h(Icon, { name: "edit", size: 12 }), "Editar Finais")
      )
    ),

    cfgOpen && h(ConfigModal, { game, updGame, onOpenEndings: () => setEndingsOpen(true), onClose: () => setCfgOpen(false) }),
    endingsOpen && h(EndingsEditModal, { game, updGame, onClose: () => setEndingsOpen(false) }),
    saveOpen && h(SaveExportModal, { game, activeNpc: data, aba, onClose: () => setSaveOpen(false), flash }),
    simOpen && h(SimModal, { game, npc: data, aba, onClose: () => setSimOpen(false) }),

    toast && h("div", { className: "fixed right-5 bottom-5 z-50 dt-card px-4 py-2.5 font-semibold fg-pri", style: { borderColor: "var(--pri)" }, role: "status" }, toast)
  );
}

/* ==========================================================================
   ERROR BOUNDARY & BOOT
   ========================================================================== */
class ErrorBoundary extends React.Component {
  constructor(p) {
    super(p);
    this.state = { err: null, info: "" };
  }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    try { console.error(err, info); } catch (e) {}
    this.setState({ info: S(info && info.componentStack).split("\n").slice(0, 8).join("\n") });
  }
  render() {
    if (!this.state.err) return this.props.children;
    const e = this.state.err;
    return h("div", { className: "max-w-3xl mx-auto mt-10 p-6 dt-card" },
      h("h1", { className: "text-2xl font-bold fg-danger m-0" }, "Erro de Renderização"),
      h("pre", { className: "dt-input my-3 overflow-auto max-h-48 whitespace-pre-wrap text-xs" }, S(e && e.message ? e.message : e) + (this.state.info ? "\n" + this.state.info : "")),
      h(Btn, { tone: "c", onClick: () => this.props.onRestore() }, "Voltar ao Menu")
    );
  }
}

function Root() {
  const [epoch, setEpoch] = useState(0);
  return h(ErrorBoundary, { key: epoch, onRestore: () => setEpoch(e => e + 1) }, h(App));
}

ReactDOM.createRoot(document.getElementById("root")).render(h(Root));
