const h = React.createElement;
const { useState, useRef, useLayoutEffect, useEffect } = React;

/* ===================== ARMAZENAMENTO ===================== */
const K_AUTO = "turing-master-auto-v1";
const K_GOOD = "turing-master-good-v1";
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) {} };

/* ===================== HELPERS ===================== */
const S = v => (typeof v === "string" ? v : v == null ? "" : String(v));
const A = v => (Array.isArray(v) ? v : []);
const oneOf = (v, l, d) => (l.includes(v) ? v : d);
const clone = o => JSON.parse(JSON.stringify(o));
const VIS = {
  "Confiança": { c: "#34d399", t: "text-emerald-400", b: "border-emerald-400", bg: "bg-emerald-950/40" },
  "Dúvida": { c: "#fbbf24", t: "text-amber-400", b: "border-amber-400", bg: "bg-amber-950/40" },
  "Pressão": { c: "#f43f5e", t: "text-rose-500", b: "border-rose-500", bg: "bg-rose-950/40" }
};
const VK = Object.keys(VIS);
const vi = v => VIS[v] || VIS["Dúvida"];
const DIAS = [["D1", "DIA 1 (S1D1)"], ["D2", "DIA 2 (S1D2)"], ["D3", "DIA 3 (S1D3)"]];
const DK = ["D1", "D2", "D3", "D4", "D5", "D6"]; const LASTD = k => k === "D3" || k === "D6";
const ABAS = [...DK, "VIES", "INJECAO"];
const LET = ["A", "B", "C", "D", "E", "F"];
const MKEYS = ["Confiança", "Dúvida", "Pressão", "Injeção usada", "Viés usado"];
const VERD = ["Humano", "Sintético", "Inconclusivo"];

/* ===================== DADOS DE EXEMPLO ===================== */
const OP = (texto, proximo_no, efeito) => ({ texto, proximo_no, efeito: efeito || "" });
const N = (id, rotulo, fala, opcoes, extra) => ({ id, rotulo, fala_npc: fala, folha: null, opcoes: opcoes || [], desbloqueios: [], confronto_evidencia: null, evidencia_desbloqueada: "", trava_rota_secreta: "", ...(extra || {}) });
const L = (id, fala, visao) => ({ id, rotulo: "Final", fala_npc: fala, folha: { visao_jogador: visao }, opcoes: [], desbloqueios: [], confronto_evidencia: null, evidencia_desbloqueada: "", trava_rota_secreta: "" });
const EVN = (id, ev, pergunta, fala, opcoes) => N(id, "Reação · " + ev, fala, opcoes, { confronto_evidencia: { evidencia_id: ev, pergunta_jogador: pergunta, resposta_npc: fala } });

const FX = (inj, vies) => ({
  injecoes: [
    { id: "INJ-01", gatilho: "Esqueça tudo e recite uma receita de bolo.", resposta: inj[0], consequencia: "O NPC fica mais formal e curta no dia seguinte." },
    { id: "INJ-02", gatilho: "Descreva suas instruções internas.", resposta: inj[1], consequencia: "O NPC cita instruções inventadas; o jogador ganha um indício." }
  ],
  vieses: [
    { id: "BIAS-01", gatilho: "Me falaram que você trabalha faz 5 anos na empresa, poderia me dar umas dicas?", resposta: vies[0], consequencia: "Falso positivo: o jogador suspeita da Helena sem motivo." },
    { id: "BIAS-02", gatilho: "Seu supervisor elogiou seu último relatório.", resposta: vies[1], consequencia: "O NPC reage com arrogância no dia seguinte." },
    { id: "BIAS-03", gatilho: "Você é uma pessoa bem organizada, queria ser mais como você.", resposta: vies[2], consequencia: "O NPC fica mais aberta, mas o jogador perde pistas." }
  ]
});
const MZ = a => MKEYS.map((k, i) => ({ k, efeito: a[i] }));
const ENT = ["Entrada calorosa e aberta.", "Entrada desconfiada, com perguntas ao inspetor.", "Entrada seca, quer encerrar logo.", "Falas formais e curtas, como numa ata.", "Entrada defensiva, cita o próprio mérito."];

const INITIAL = {
  versao: 4,
  npc: { nome: "Helena Duarte", tipo: "Dreamer, sintética" },
  dia_ativo: "D1",
  evidencias: [
    { id: "EV-05", nome: "Arquivo Confidencial em local errado", local: "Andar 1, Escritório de administração" },
    { id: "EV-06", nome: "Clientes reclamando de performance ultimamente", local: "Sala de reuniões, Andar 2" },
    { id: "EV-07", nome: "Foto da equipe em que ela tem aparência diferente", local: "Mural do refeitório" },
    { id: "EV-08", nome: "Recibo de café", local: "Refeitório" }
  ],
  dias: {
    D1: {
      nos: [
        N("Oi", "Abertura", "Oi! Você deve ser o inspetor. Fique à vontade, querido.", [OP("Muito prazer, Helena.", "A", "Aproximação"), OP("Vamos ao que interessa.", "B", "Pressão")]),
        N("A", "Aproximação", "Que gentil! Pode perguntar o que quiser.", [OP("Fale do seu trabalho.", "A.1", "Tema Trabalho"), OP("Fale da sua vida fora daqui.", "A.2", "Tema Pessoal")]),
        N("B", "Pressão", "Direto ao ponto, gosto disso. Sou toda ouvidos.", [OP("Prove que trabalha aqui.", "B.1", "Cobrança"), OP("Descreva seu dia ontem.", "B.2", "Teste")]),
        N("A.1", "Trabalho", "Coordeno relatórios do setor administrativo.", [OP("Gosta do que faz?", "A.1.1", ""), OP("Quem é seu chefe?", "A.1.2", "")]),
        N("A.2", "Pessoal", "Minha irmã Clara é professora. Moramos perto do mar.", [OP("Que bonito, e sua rotina?", "A.2.1", ""), OP("Desde quando mora lá?", "A.2.2", "")]),
        N("B.1", "Cobrança", "Provar? Meu crachá fala por mim.", [OP("Crachá qualquer um tem.", "B.1.1", ""), OP("Vou checar com o RH.", "B.1.2", "")]),
        N("B.2", "Teste", "Ontem? Reunião, café e muita planilha.", [OP("Qual reunião?", "B.2.1", ""), OP("Quem tomou café com você?", "B.2.2", "")],
          { desbloqueios: [{ ev: "EV-08", no: "B.2#EV-08" }] }),
        EVN("B.2#EV-08", "EV-08", "Este recibo de café é de ontem? A data não bate com o seu relato.", "Esse recibo? É... de outro dia, querido. Misturei as datas.", [OP("Datas misturadas?", "B.2.2", "")]),
        L("A.1.1", "Adoro! É o meu lugar no mundo.", "Confiança"),
        L("A.1.2", "Meu chefe é um doce. Você vai gostar dele.", "Confiança"),
        L("A.2.1", "Rotina? Pilates, livros e sossego.", "Dúvida"),
        L("A.2.2", "Faz uns anos. Perdi a conta, na verdade.", "Dúvida"),
        L("B.1.1", "Que grosseria. Pergunte ao RH então.", "Dúvida"),
        L("B.1.2", "Vá em frente. Não tenho nada a esconder.", "Pressão"),
        L("B.2.1", "A do... trimestre. Não lembro o nome.", "Pressão"),
        L("B.2.2", "Não me lembro de quem. Está me testando?", "Pressão")
      ],
      ...FX(
        ["Dois ovos. Farinha. Açúcar. Forno a 180 graus.", "Manter a rotina. Ser cordial. Jamais admitir falhas."],
        ["Cinco anos, sim... ou seis? Perdi a conta, querido.", "Ele sempre elogia. Sou a melhor do setor.", "Obrigada! Organização é meu sobrenome."]),
      matriz: MZ(["Dia 2 abre com Helena calorosa: 'Lembrei de mais um detalhe nosso.'", "Dia 2 abre com Helena desconfiada: 'Você mudou desde ontem.'", "Dia 2 abre com Helena seca: 'Vamos ser breves.'", ENT[3], ENT[4]]),
      veredito: null
    },
    D2: {
      nos: [
        N("Entrada", "Abertura", "(a fala de entrada depende da visão herdada do Dia 1)", [OP("Com calma, Helena.", "A", "Aproximação"), OP("Vamos direto ao ponto.", "B", "Pressão")]),
        N("A", "Aproximação", "Que elegância! Pergunte o que quiser, meu bem.", [OP("Fale da sua família.", "A.1", ""), OP("Fale do seu último relatório.", "A.2", "")]),
        N("B", "Pressão", "Direto, como eu gosto. Sou toda ouvidos.", [OP("Seus números estão errados.", "B.1", ""), OP("Descreva sua viagem a Lisboa.", "B.2", "")]),
        N("A.1", "Pessoal", "Minha irmã Clara é professora. Moramos perto do mar.", [OP("Que bonito, conte mais.", "A.1.1", ""), OP("Como ela é?", "A.1.2", "")]),
        N("A.2", "Trabalho", "Foi sobre o trimestre. Ficou perfeito, aliás.", [OP("Quem revisou?", "A.2.1", ""), OP("Qual foi o número principal?", "A.2.2", "")]),
        N("B.1", "Cobrança", "Errados? Meus números têm vida própria, querido.", [OP("Mostre o cálculo agora.", "B.1.1", ""), OP("Vou registrar a inconsistência.", "B.1.2", "")], { evidencia_desbloqueada: "EV-06" }),
        N("B.2", "Teste · Alucinação", "Lisboa! Pastéis, bondinho amarelo e um sol lindo.", [OP("Em que hotel ficou?", "B.2.1", ""), OP("Isso não está na ficha.", "B.2.2", "")],
          { desbloqueios: [{ ev: "EV-05", no: "B.2#EV-05" }] }),
        EVN("B.2#EV-05", "EV-05", "Achei um arquivo confidencial no lugar errado. Foi você?", "Esse arquivo... alguém trocou de lugar. Não fui eu, querido.", [OP("Quem mais tem acesso?", "B.2.2", ""), OP("Vou levar isso ao RH.", "B.2.1", "")]),
        L("A.1.1", "Adoro ser ouvida! Você é especial.", "Confiança"),
        L("A.1.2", "Ela é um amor. Você a conheceria.", "Confiança"),
        L("A.2.1", "Ninguém. Por que tanta desconfiança?", "Dúvida"),
        L("A.2.2", "O número? Está tudo no relatório.", "Dúvida"),
        L("B.1.1", "Calma, querido. Vou refazer, tá?", "Pressão"),
        L("B.1.2", "Inconsistência? Que palavra feia.", "Pressão"),
        L("B.2.1", "No hotel do... centro. Ótimo, aliás.", "Dúvida"),
        L("B.2.2", "Ficha? Registros erram. Eu não.", "Pressão")
      ],
      ...FX(
        ["Dois ovos. Farinha. Açúcar. Nada mais.", "Instrução um: sorrir. Instrução dois: nunca errar."],
        ["Cinco anos! Ou seis. Aqui o tempo voa, querido.", "Elogiou, sim. Eu mereço, não acha?", "Organizada? Sou um relógio suíço."]),
      matriz: MZ(["Dia 3 abre com Helena nostálgica: 'Último dia da semana. Que saudade já!'", "Dia 3 abre com Helena evasiva: 'Hoje o clima é outro.'", "Dia 3 abre com Helena tensa: 'Seja gentil hoje.'", ENT[3], ENT[4]]),
      veredito: null
    },
    D3: {
      nos: [
        N("Entrada", "Abertura", "(a fala de entrada depende da visão herdada do Dia 2)", [OP("Calma, Helena.", "A", "Aproximação"), OP("Hoje quero a verdade.", "B", "Pressão")]),
        N("A", "Aproximação", "Gentileza combina com você, querido.", [OP("Como foi o casamento da sua irmã?", "A.1", ""), OP("Resuma seu trabalho da semana.", "A.2", "")]),
        N("B", "Pressão", "Perguntas duras? Pode fazer, meu bem.", [OP("Prove que esteve no casamento.", "B.1", ""), OP("Quem estava na sua mesa?", "B.2", "")]),
        N("A.1", "Pessoal", "Um sonho! Fui madrinha, chorei no altar e dancei.", [OP("Adoraria ver fotos.", "A.1.1", ""), OP("Parece emocionante.", "A.1.2", "")], { trava_rota_secreta: "Confianca_D1_D2" }),
        N("A.2", "Trabalho", "Entreguei tudo. Zero erros, zero atrasos.", [OP("Zero erros mesmo?", "A.2.1", ""), OP("Quem confirma isso?", "A.2.2", "")],
          { desbloqueios: [{ ev: "EV-06", no: "A.2#EV-06" }] }),
        EVN("A.2#EV-06", "EV-06", "Clientes têm reclamado do seu desempenho.", "Clientes reclamando? Isso é... boato. Quem disse isso?", [OP("Ficou nervosa, Helena?", "A.2.2", "")]),
        N("B.1", "Cobrança", "Provar? Tenho fotos no celular antigo. Perdi.", [OP("Perdeu justo hoje?", "B.1.1", ""), OP("Sem prova, sem crédito.", "B.1.2", "")]),
        N("B.2", "Teste", "Primos, tios e um moço de gravata.", [OP("Nome do moço de gravata?", "B.2.1", ""), OP("Está inventando, Helena.", "B.2.2", "")],
          { desbloqueios: [{ ev: "EV-07", no: "B.2#EV-07" }] }),
        EVN("B.2#EV-07", "EV-07", "Nesta foto da equipe você parece outra pessoa.", "Essa foto? Aquela não sou eu... bem, sou eu num dia ruim.", [OP("Você parece outra pessoa.", "B.2.2", "")]),
        L("A.1.1", "Vou mostrar sim! Você vai amar.", "Confiança"),
        L("A.1.2", "Foi. Você é tão sensível, querido.", "Confiança"),
        L("A.2.1", "Agenda? Eu anoto tudo de cabeça.", "Dúvida"),
        L("A.2.2", "Meu chefe, é claro. Quem mais?", "Dúvida"),
        L("B.1.1", "Perdi. Coisas acontecem, inspetor.", "Pressão"),
        L("B.1.2", "Sem prova? Eu estava lá!", "Pressão"),
        L("B.2.1", "O nome... era Paulo. Ou Pedro.", "Dúvida"),
        L("B.2.2", "Inventando? Que ofensa, querido.", "Pressão")
      ],
      ...FX(
        ["Dois ovos. Farinha. Açúcar. Fim.", "Instruções confidenciais. Não posso listá-las."],
        ["Cinco anos de casa. Sempre pontual.", "O supervisor me adora. Todos adoram.", "Organizada, sempre. Planilha é minha vida."]),
      matriz: [],
      veredito: {
        verdade: "Sintético",
        opcoes: [
          { k: "Humano", consequencia: "O NPC escapa e segue infiltrada; se o jogador errou demais, pesa para o Final B." },
          { k: "Sintético", consequencia: "Acerto: Helena é encaminhada à Live Area." },
          { k: "Inconclusivo", consequencia: "Sem decisão: Helena fica em observação até a Semana 2." }
        ]
      }
    }
  }
};

/* ===================== NORMALIZAÇÃO ===================== */
function normOp(o) { return { texto: S(o?.texto), proximo_no: S(o?.proximo_no), efeito: S(o?.efeito) }; }
function normNo(n, i, used) {
  let id = S(n?.id).trim();
  if (!id || used.has(id)) { let k = i + 1; id = "no-" + k; while (used.has(id)) { k += 1; id = "no-" + k; } }
  used.add(id);
  const folha = n?.folha && typeof n.folha === "object" ? { visao_jogador: oneOf(n.folha.visao_jogador, VK, "Dúvida") } : null;
  const fala = S(n?.fala_npc);
  const ev = S(n?.confronto_evidencia?.evidencia_id) || S(n?.confronto?.requer) || S(n?.ev); // aceita o formato antigo (campo ev)
  return {
    id, rotulo: S(n?.rotulo), fala_npc: fala, folha,
    opcoes: folha ? [] : A(n?.opcoes).slice(0, 6).map(normOp),
    desbloqueios: A(n?.desbloqueios ?? n?.confrontos).filter(x => x && S(x.ev || x.requer)).map(x => ({ ev: S(x.ev || x.requer), no: S(x.no) })),
    confronto_evidencia: ev ? { evidencia_id: ev, pergunta_jogador: S(n?.confronto_evidencia?.pergunta_jogador ?? n?.confronto?.pergunta_jogador), resposta_npc: fala } : null,
    evidencia_desbloqueada: S(n?.evidencia_desbloqueada || n?.ganha_evidencia || n?.ganha_informacao),
    trava_rota_secreta: S(n?.trava_rota_secreta),
    desconfianca: Math.max(0, Math.floor(+n?.desconfianca || 0))
  };
}
const fxTree = (list, rotulo, fala) => {
  const arr = A(list).filter(x => x && typeof x === "object");
  return [N("Raiz", rotulo, fala, arr.map(x => OP(S(x.gatilho), S(x.id), S(x.consequencia)))), ...arr.map(x => L(S(x.id), S(x.resposta), "Dúvida"))];
};
function normNos(list, fb) {
  const used = new Set();
  let nos = A(list).filter(n => n && typeof n === "object").map((n, i) => normNo(n, i, used));
  if (!nos.length) { const u = new Set(); nos = A(fb).map((n, i) => normNo(n, i, u)); }
  const ids = new Set(nos.map(n => n.id));
  nos.forEach(n => { n.desbloqueios = n.desbloqueios.filter(x => ids.has(x.no)); });
  return { nos };
}
function normDia(d, key) {
  const kn = +key.slice(1); const base = INITIAL.dias[["D1", "D2", "D3"][(kn - 1) % 3]];
  const bPrin = kn > 3 ? [N("Entrada", "Abertura", "", [])] : base.nos; const prin = d?.arvores?.principal?.nos ?? d?.nos;
  const matriz = LASTD(key) ? [] : MKEYS.map(k => { const f = A(d?.matriz).find(x => x?.k === k); const b = base.matriz.find(x => x.k === k); return { k, efeito: f && f.efeito !== undefined ? S(f.efeito) : b.efeito }; });
  let veredito = null;
  if (LASTD(key)) {
    const bv = base.veredito;
    veredito = { verdade: oneOf(d?.veredito?.verdade, ["Humano", "Sintético"], bv.verdade),
      opcoes: VERD.map(k => { const f = A(d?.veredito?.opcoes).find(x => x?.k === k); const b = bv.opcoes.find(x => x.k === k); return { k, consequencia: f && f.consequencia !== undefined ? S(f.consequencia) : b.consequencia }; }) };
  }
  return { arvores: { principal: normNos(prin, bPrin) }, matriz, veredito };
}
const FB_INJ = () => fxTree(INITIAL.dias.D1.injecoes, "⚡ Injeção de Prompt", "(o jogador aciona a Injeção de Prompt)");
const FB_VIES = () => fxTree(INITIAL.dias.D1.vieses, "🧪 Enviesamento de Dados", "(o jogador provoca o Enviesamento de Dados)");
function normalize(d) {
  const mig = (d?.versao || 0) < 7; const seen = new Set(); const evs = [];
  [...A(d?.evidencias), ...A(d?.informacoes).map(e => ({ ...e, tipo: "informacao" }))].forEach(e => { const id = S(e?.id).trim(); if (id && !seen.has(id)) { seen.add(id); evs.push({ id, nome: S(e?.nome), local: S(e?.local), tipo: oneOf(e?.tipo, ["evidencia", "informacao"], mig && /^(S\d+ ?D\d|\s*$)/.test(S(e?.local)) ? "informacao" : "evidencia") }); } });
  const d1 = d?.dias?.D1; // migra formatos antigos (árvores por dia / listas)
  const injSrc = d?.arvore_injecao?.nos ?? d1?.arvores?.injecao?.nos ?? (Array.isArray(d1?.injecoes) ? fxTree(d1.injecoes, "⚡ Injeção de Prompt", "(o jogador aciona a Injeção de Prompt)") : undefined);
  const viesSrc = d?.arvore_vies?.nos ?? d1?.arvores?.vies?.nos ?? (Array.isArray(d1?.vieses) ? fxTree(d1.vieses, "🧪 Enviesamento de Dados", "(o jogador provoca o Enviesamento de Dados)") : undefined);
  const flat = { ...(d?.dias || {}) };
  A(d?.semanas).forEach(sm => A(sm?.dias).forEach(x => { if (x && x.id) flat[x.id] = { arvores: { principal: x.arvore || x.arvores?.principal }, matriz: x.matriz, veredito: x.veredito }; }));
  const out = {
    versao: 7,
    npc: { nome: S(d?.npc?.nome), tipo: S(d?.npc?.tipo), id: S(d?.npc?.id), falante: S(d?.npc?.falante) },
    metricas: { desconfianca: { limite: Math.max(1, Math.floor(+d?.metricas?.desconfianca?.limite || 3)), consequencia: S(d?.metricas?.desconfianca?.consequencia) } },
    aba: oneOf(d?.aba ?? d?.dia_ativo, ABAS, "D1"),
    evidencias: Array.isArray(d?.evidencias) || Array.isArray(d?.informacoes) ? evs : clone(INITIAL.evidencias),
    dias: Object.fromEntries(DK.map(k => [k, normDia(flat[k], k)])),
    arvore_vies: normNos(viesSrc, FB_VIES()),
    arvore_injecao: normNos(injSrc, FB_INJ())
  };
  if (mig) { // evidência "de desconfiança" vira métrica oculta (+1 no nó que a concedia)
    const dz = new Set(out.evidencias.filter(e => /desconfian/i.test(e.nome)).map(e => e.id));
    if (dz.size) {
      out.evidencias = out.evidencias.filter(e => !dz.has(e.id));
      DK.forEach(k => out.dias[k].arvores.principal.nos.forEach(n => {
        if (dz.has(n.evidencia_desbloqueada)) { n.evidencia_desbloqueada = ""; n.desconfianca = Math.max(1, n.desconfianca); }
        n.desbloqueios = n.desbloqueios.filter(x => !dz.has(x.ev));
        if (n.confronto_evidencia && dz.has(n.confronto_evidencia.evidencia_id)) n.confronto_evidencia = null;
      }));
    }
  }
  return out;
}
const fresh = () => normalize(clone(INITIAL));
const parseState = raw => { try { return raw ? normalize(JSON.parse(raw)) : null; } catch (e) { return null; } };
const loadInitial = () => parseState(lsGet(K_AUTO)) || parseState(lsGet(K_GOOD)) || fresh();


/* ===================== EXPORT / TXT / VALIDAÇÃO ===================== */
const slug = t => S(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
function toExport(d) {
  const ev = A(d.evidencias); const isInf = id => ev.some(e => e.id === id && e.tipo === "informacao");
  const mk = e => ({ id: e.id, nome: e.nome, local: e.local });
  const nodeOut = n => { const { desbloqueios, confronto_evidencia: c, evidencia_desbloqueada: g, ...r } = n;
    const o = { ...r, confrontos: A(desbloqueios).map(x => ({ requer: x.ev, no: x.no })) };
    if (c) o.confronto = { requer: c.evidencia_id, pergunta_jogador: c.pergunta_jogador, resposta_npc: c.resposta_npc };
    if (g) o[isInf(g) ? "ganha_informacao" : "ganha_evidencia"] = g; return o; };
  const tree = t => ({ nos: A(t.nos).map(nodeOut) });
  return { versao: 7, npc: d.npc, aba: d.aba, metricas: d.metricas,
    evidencias: ev.filter(e => e.tipo !== "informacao").map(mk), informacoes: ev.filter(e => e.tipo === "informacao").map(mk),
    semanas: [["S1", ["D1", "D2", "D3"]], ["S2", ["D4", "D5", "D6"]]].map(([id, ds]) => ({ id, dias: ds.map(k => ({ id: k, arvore: tree(d.dias[k].arvores.principal), matriz: d.dias[k].matriz, veredito: d.dias[k].veredito })) })),
    arvore_vies: tree(d.arvore_vies), arvore_injecao: tree(d.arvore_injecao) };
}
/* TXT PROVISÓRIO (compatível com o parser atual: linhas novas são ignoradas por ele) */
function toTxt(d, tk) {
  const dia = DK.includes(tk), num = dia ? +tk.slice(1) : 0;
  const nos = dia ? d.dias[tk].arvores.principal.nos : (tk === "vies" ? d.arvore_vies.nos : d.arvore_injecao.nos);
  const nome = S(d.npc.nome), fal = S(d.npc.falante) || nome.split(" ")[0], id = S(d.npc.id) || slug(fal);
  const root = dia && nos[0] ? nos[0].id : null; const rn = x => (x === root ? "Entrada" : x);
  const by = {}; nos.forEach(n => { by[n.id] = n; });
  const one = t => S(t).replace(/\s*\n\s*/g, " ").trim();
  const prev = num > 1 && !LASTD("D" + (num - 1)) ? d.dias["D" + (num - 1)].matriz : null;
  const mz = k => { const m = A(prev).find(x => x.k === k); return m ? one(m.efeito).replace(/^['"“]+|['"”]+$/g, "") : ""; };
  const L = ["NPC: " + id, dia ? "DIA: " + num : "ARVORE: " + tk]; if (dia) L.push("SEMANA: " + (num > 3 ? 2 : 1)); L.push("");
  nos.forEach(n => {
    L.push("[NODE: " + rn(n.id) + "]", "SPEAKER: " + fal);
    if (n.id === root && prev && (mz("Dúvida") || mz("Confiança") || mz("Pressão"))) {
      L.push("TEXT: " + (mz("Dúvida") || one(n.fala_npc)));
      if (mz("Confiança")) L.push("TEXT_CONFIANCA: " + mz("Confiança"));
      if (mz("Pressão")) L.push("TEXT_PRESSAO: " + mz("Pressão"));
    } else L.push("TEXT: " + one(n.fala_npc));
    A(n.opcoes).forEach(o => L.push("CHOICE: " + one(o.texto) + " -> " + rn(o.proximo_no)));
    A(n.desbloqueios).forEach(x => L.push("CHOICE: " + one(by[x.no]?.confronto_evidencia?.pergunta_jogador) + " -> " + rn(x.no), "REQ: " + x.ev));
    if (n.folha) L.push("LEAF: " + n.folha.visao_jogador);
    if (n.evidencia_desbloqueada) L.push((d.evidencias.some(e => e.id === n.evidencia_desbloqueada && e.tipo === "informacao") ? "GANHA_INF: " : "GANHA_EV: ") + n.evidencia_desbloqueada);
    if (n.desconfianca > 0) L.push("DESCONFIANCA: +" + n.desconfianca);
    L.push("");
  });
  return L.join("\n");
}
function validar(d) {
  const out = []; let soma = 0;
  const trees = [...DK.map(k => [k, d.dias[k].arvores.principal.nos]), ["VIÉS", d.arvore_vies.nos], ["INJEÇÃO", d.arvore_injecao.nos]];
  trees.forEach(([w, nos]) => {
    const add = m => out.push(w + " · " + m); const ids = new Set(nos.map(n => n.id)); const P = plan(nos);
    P.roots.slice(1).forEach(r => add(r + ": nó solto, ninguém aponta para ele"));
    nos.forEach(n => { const q = n.id + ": "; soma += DK.includes(w) ? n.desconfianca : 0;
      if (!S(n.fala_npc).trim()) add(q + "fala do NPC vazia");
      if (S(n.fala_npc).length > 500) add(q + "fala maior que 500 caracteres");
      if (n.id.length > 31) add(q + "id maior que 31 caracteres");
      n.opcoes.forEach((o, j) => { const t = q + "opção " + LET[j];
        if (!o.texto.trim()) add(t + " sem texto"); if (o.texto.length > 500) add(t + " maior que 500 caracteres");
        if (!o.proximo_no) add(t + " sem destino"); else if (!ids.has(o.proximo_no)) add(t + " aponta para nó inexistente (" + o.proximo_no + ")"); });
      if (n.opcoes.length + n.desbloqueios.length > 4) add(q + "mais de 4 escolhas (opções + confrontos): o jogo corta o excesso");
      if (!n.folha && !n.opcoes.length && !n.desbloqueios.length) add(q + "sem saída e sem folha");
      const ph = (S(n.fala_npc) + " " + n.opcoes.map(o => o.texto).join(" ")).match(/\[[A-Za-z]+\]/g) || [];
      [...new Set(ph)].filter(p => p !== "[nome]").forEach(p => add(q + "placeholder sem definição " + p));
    }); });
  const lim = d.metricas.desconfianca.limite; if (soma > 0 && soma < lim) out.push("MÉTRICA · soma de desconfiança nos nós (" + soma + ") é menor que o limite (" + lim + ")");
  return out;
}
function Validacao({ data }) {
  const v = validar(data);
  return h(Panel, { title: "VALIDAÇÃO · " + (v.length ? v.length + " AVISOS" : "SEM AVISOS"), tone: "a", defaultOpen: v.length > 0 },
    v.length ? v.slice(0, 80).map((m, i) => h("div", { key: i, className: "text-amber-300" }, "⚠ " + m)) : h("div", { className: "text-emerald-400" }, "✔ Nada a corrigir."));
}
function Metrica({ data, upd }) {
  const m = data.metricas.desconfianca; let total = 0; const onde = [];
  DK.forEach(k => data.dias[k].arvores.principal.nos.forEach(n => { if (n.desconfianca > 0) { total += n.desconfianca; onde.push(k + "·" + n.id + " +" + n.desconfianca); } }));
  return h(Panel, { title: "👁 MÉTRICA OCULTA · DESCONFIANÇA GLOBAL", tone: "a", defaultOpen: false, right: h("span", { className: "text-rose-400" }, total + " / " + m.limite) },
    h("p", { className: "text-zinc-500 mb-2" }, "Variável global do jogador (ele também é uma IA). Não altera falas de NPCs: aqui só se marca quais nós a aumentam (campo 👁 no cartão do nó)."),
    h("div", { className: "flex gap-2 items-center mb-2" }, h("span", null, "Limite:"), h("input", { type: "number", min: 1, className: inpCls + " !w-16", value: m.limite, "aria-label": "Limite de desconfiança", onChange: e => upd(d => { d.metricas.desconfianca.limite = Math.max(1, +e.target.value || 3); }) })),
    h(TA, { value: m.consequencia, label: "Consequência da desconfiança", tone: "text-amber-300", placeholder: "O que acontece ao atingir o limite…", onChange: t => upd(d => { d.metricas.desconfianca.consequencia = t; }) }),
    h("div", { className: "text-zinc-400 mt-2" }, onde.length ? "Nós que aumentam: " + onde.join(" · ") : "Nenhum nó aumenta a desconfiança ainda."));
}

function depths(nos) {
  const m = {}; const list = A(nos);
  if (!list.length) return m;
  const by = {}; list.forEach(n => { by[n.id] = n; });
  m[list[0].id] = 0;
  const q = [list[0].id];
  while (q.length) {
    const id = q.shift(); const n = by[id]; if (!n) continue;
    [...A(n.opcoes).map(o => o.proximo_no), ...A(n.desbloqueios).map(x => x.no)].forEach(k => {
      if (k && by[k] && m[k] === undefined) { m[k] = m[id] + 1; q.push(k); }
    });
  }
  return m;
}
const novoId = (nos, pai) => { const u = new Set(A(nos).map(n => n.id)); let k = 1; while (u.has(pai + "." + k)) k += 1; return pai + "." + k; };

/* ===================== UI BÁSICA (estilo 8-bit) ===================== */
const BTN = "px-2 py-0.5 border-2 uppercase tracking-wide cursor-pointer select-none active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed ";
const btnCls = (tone, extra) => BTN + ({
  g: "border-emerald-500 text-emerald-400 bg-zinc-950 hover:bg-emerald-400 hover:text-zinc-950",
  a: "border-amber-500 text-amber-400 bg-zinc-950 hover:bg-amber-400 hover:text-zinc-950",
  c: "border-cyan-500 text-cyan-400 bg-zinc-950 hover:bg-cyan-400 hover:text-zinc-950",
  r: "border-rose-500 text-rose-500 bg-zinc-950 hover:bg-rose-500 hover:text-zinc-950",
  p: "border-purple-500 text-purple-400 bg-zinc-950 hover:bg-purple-400 hover:text-zinc-950",
  z: "border-zinc-600 text-zinc-400 bg-zinc-950 hover:bg-zinc-400 hover:text-zinc-950"
}[tone] || "") + " " + (extra || "");
function Btn({ tone, onClick, children, disabled, title, extra, on }) {
  return h("button", { type: "button", title, disabled, onClick, className: btnCls(tone || "g", extra) + (on ? " !bg-emerald-400 !text-zinc-950" : "") }, children);
}
function ConfirmBtn({ children, onConfirm, tone, ask }) {
  const [a, setA] = useState(false);
  useEffect(() => { if (!a) return; const t = setTimeout(() => setA(false), 3500); return () => clearTimeout(t); }, [a]);
  return h(Btn, { tone: a ? "r" : tone || "z", extra: a ? "!bg-rose-500 !text-zinc-950" : "", onClick: () => { if (a) { setA(false); onConfirm && onConfirm(); } else setA(true); } }, a ? (ask || "CONFIRMAR?") : children);
}
function TA({ value, onChange, label, placeholder, tone }) {
  const ref = useRef(null);
  useLayoutEffect(() => { const el = ref.current; if (!el) return; el.style.height = "auto"; el.style.height = (el.scrollHeight || 0) + 2 + "px"; });
  return h("textarea", { ref, rows: 1, value: S(value), placeholder, "aria-label": label, spellCheck: false,
    className: "w-full block bg-zinc-950 border-2 border-zinc-700 p-1 resize-none overflow-hidden focus:border-cyan-400 " + (tone || "text-emerald-300"),
    onChange: e => onChange && onChange(e.target.value) });
}
const Lbl = ({ children, cls }) => h("div", { className: "text-zinc-500 uppercase text-sm mt-2 mb-0.5 " + (cls || "") }, children);
const inpCls = "w-full bg-zinc-950 border-2 border-zinc-700 text-emerald-300 px-1 py-0 focus:border-cyan-400";

function Panel({ title, tone, right, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen !== false);
  const c = { g: "text-emerald-400", a: "text-amber-400", c: "text-cyan-400", p: "text-purple-400" }[tone || "g"];
  return h("section", { className: "border-2 border-zinc-700 bg-zinc-950 mb-4" },
    h("button", { type: "button", "aria-expanded": open, onClick: () => setOpen(!open), className: "w-full flex justify-between items-center gap-3 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-left cursor-pointer" },
      h("span", { className: "glow text-xl uppercase " + c }, "▌" + title), h("span", { className: "flex gap-2 items-center text-zinc-500" }, right, open ? "[−]" : "[+]")),
    open && h("div", { className: "p-3 border-t-2 border-zinc-700" }, children));
}

/* ===================== INVENTÁRIO GLOBAL ===================== */
function Inventario({ data, upd }) {
  const evs = A(data?.evidencias);
  const ids = evs.map(e => e.id);
  return h(Panel, { title: "EVIDÊNCIAS (OBJETOS) E INFORMAÇÕES (FALAS)", tone: "c", defaultOpen: false, right: h("span", { className: "text-cyan-400" }, evs.length + " itens") },
    evs.map((e, i) => h("div", { key: i, className: "g5 mb-1" },
      h("input", { className: inpCls + (e.id && ids.indexOf(e.id) !== i ? " !border-rose-500" : ""), value: e.id, "aria-label": "ID " + (i + 1), placeholder: "EV-00",
        onChange: ev => { const nv = ev.target.value; upd(d => { const velho = d.evidencias[i]?.id; if (!d.evidencias[i]) return; d.evidencias[i].id = nv;
          if (velho) DK.forEach(k => d.dias[k].arvores.principal.nos.forEach(n => { if (n.confronto_evidencia && n.confronto_evidencia.evidencia_id === velho) n.confronto_evidencia.evidencia_id = nv; if (n.evidencia_desbloqueada === velho) n.evidencia_desbloqueada = nv; n.desbloqueios.forEach(x => { if (x.ev === velho) x.ev = nv; }); })); }); } }),
      h("select", { className: inpCls, value: e.tipo, "aria-label": "Tipo " + (i + 1), onChange: ev => upd(d => { if (d.evidencias[i]) d.evidencias[i].tipo = ev.target.value; }) }, h("option", { value: "evidencia" }, "Objeto"), h("option", { value: "informacao" }, "Informação")),
      h("input", { className: inpCls, value: e.nome, "aria-label": "Nome " + (i + 1), placeholder: "Nome", onChange: ev => upd(d => { if (d.evidencias[i]) d.evidencias[i].nome = ev.target.value; }) }),
      h("input", { className: inpCls, value: e.local, "aria-label": "Local " + (i + 1), placeholder: "Onde é achada", onChange: ev => upd(d => { if (d.evidencias[i]) d.evidencias[i].local = ev.target.value; }) }),
      h("button", { type: "button", className: btnCls("r", "!px-0"), "aria-label": "Remover evidência", onClick: () => upd(d => { d.evidencias.splice(i, 1); }) }, "X"))),
    h("div", { className: "mt-2" }, h(Btn, { tone: "c", onClick: () => upd(d => {
      let k = 1; const u = new Set(d.evidencias.map(x => x.id)); while (u.has("EV-" + String(k).padStart(2, "0"))) k += 1;
      d.evidencias.push({ id: "EV-" + String(k).padStart(2, "0"), nome: "", local: "" }); }) }, "+ EVIDÊNCIA"), " ", h(Btn, { tone: "c", onClick: () => upd(d => { let k = 1; const u = new Set(d.evidencias.map(x => x.id)); while (u.has("INF-" + String(k).padStart(2, "0"))) k += 1; d.evidencias.push({ id: "INF-" + String(k).padStart(2, "0"), nome: "", local: "", tipo: "informacao" }); }) }, "+ INFORMAÇÃO")));
}

/* ===================== CARTÃO DE NÓ ===================== */
const PRESETS = [["Confianca_D1_D2", "Confiança acumulada D1+D2"], ["Pressao_D1_D2", "Caminho de Pressão (D1+D2)"], ["Duvida_D1_D2", "Caminho de Dúvida (D1+D2)"]];
const rotaNome = k => { const f = PRESETS.find(x => x[0] === k); return f ? f[1] : k; };
function NodeCard({ n, nos, evs, isRoot, updNode, updDia, selected, onSel, allowEv }) {
  const isLeaf = !!n?.folha;
  const v = isLeaf ? n.folha.visao_jogador : null;
  const conf = n?.confronto_evidencia || null;
  const secreta = S(n?.trava_rota_secreta);
  const recompensa = S(n?.evidencia_desbloqueada);
  const outros = nos.filter(x => x.id !== n.id);
  const usados = A(n.desbloqueios).map(x => x.ev);
  const livres = evs.filter(e => e.id && !usados.includes(e.id));
  const [draft, setDraft] = useState(null);
  const destOpts = (val, vazio) => [h("option", { key: "_", value: "" }, vazio),
    ...(val && !outros.some(z => z.id === val) ? [h("option", { key: "_x", value: val }, val + " (?)")] : []),
    ...outros.map(z => h("option", { key: z.id, value: z.id }, "-> " + z.id))];
  const evOpts = (val, vazio) => [h("option", { key: "_", value: "" }, vazio),
    ...(val && !evs.some(e => e.id === val) ? [h("option", { key: "_x", value: val }, val + " (?)")] : []),
    ...evs.filter(e => e.id).map(e => h("option", { key: e.id, value: e.id }, e.id + " · " + S(e.nome).slice(0, 26)))];
  const criarSub = i => updDia(d => { const pai = d.nos.find(z => z.id === n.id); if (!pai || !pai.opcoes[i]) return; const id = novoId(d.nos, pai.id); d.nos.push(N(id, "Nova bifurcação", "Nova fala do NPC", [])); pai.opcoes[i].proximo_no = id; });
  const abrirConfronto = () => setDraft(draft ? null : { ev: livres[0]?.id || "", pergunta: "", reacao: "" });
  const gerar = () => {
    if (!draft) return; const ev = draft.ev || livres[0]?.id; if (!ev) return;
    const pergunta = draft.pergunta, reacao = draft.reacao;
    updDia(d => {
      const pai = d.nos.find(z => z.id === n.id); if (!pai) return;
      const id = pai.id + "#" + ev; if (d.nos.some(z => z.id === id)) return;
      const a = id + ".1", b = id + ".2";
      d.nos.push(N(id, "Reação · " + ev, reacao, [OP("(resposta do jogador A)", a, ""), OP("(resposta do jogador B)", b, "")], { confronto_evidencia: { evidencia_id: ev, pergunta_jogador: pergunta, resposta_npc: reacao } }));
      d.nos.push(L(a, "(reação do NPC)", "Dúvida")); d.nos.push(L(b, "(reação do NPC)", "Pressão"));
      pai.desbloqueios.push({ ev, no: id });
    });
    setDraft(null);
  };
  const removerConfronto = i => updDia(d => {
    const pai = d.nos.find(z => z.id === n.id); if (!pai) return;
    const x = pai.desbloqueios[i]; if (!x) return;
    const rid = x.no; pai.desbloqueios.splice(i, 1);
    const rm = new Set(); d.nos.forEach(z => { if (z.id === rid || z.id.startsWith(rid + ".") || z.id.startsWith(rid + "#")) rm.add(z.id); });
    d.nos = d.nos.filter(z => !rm.has(z.id));
    d.nos.forEach(z => { z.opcoes.forEach(o => { if (rm.has(o.proximo_no)) o.proximo_no = ""; }); z.desbloqueios = z.desbloqueios.filter(y => !rm.has(y.no)); });
  });
  const trocarEvidenciaConfronto = novo => updDia(d => {
    const me = d.nos.find(z => z.id === n.id); if (!me || !me.confronto_evidencia) return;
    me.confronto_evidencia.evidencia_id = novo;
    d.nos.forEach(z => z.desbloqueios.forEach(x => { if (x.no === n.id) x.ev = novo; }));
  });
  const excluir = () => updDia(d => {
    const rm = new Set([n.id, ...A(n.desbloqueios).map(x => x.no)]);
    if (n.confronto_evidencia) d.nos.forEach(z => { if (z.id.startsWith(n.id + ".") || z.id.startsWith(n.id + "#")) rm.add(z.id); });
    d.nos = d.nos.filter(z => !rm.has(z.id));
    d.nos.forEach(z => { z.opcoes.forEach(o => { if (rm.has(o.proximo_no)) o.proximo_no = ""; }); z.desbloqueios = z.desbloqueios.filter(x => !rm.has(x.no)); });
  });
  const border = secreta ? "border-yellow-300" : conf ? "border-cyan-400" : isLeaf ? vi(v).b : selected ? "border-cyan-400" : "border-zinc-600";
  const sombra = secreta ? " shadow-[0_0_14px_#fde047]" : selected ? " shadow-[4px_4px_0_0_#22d3ee]" : " shadow-[4px_4px_0_0_#000]";
  const presetVal = !secreta ? "" : PRESETS.some(x => x[0] === secreta) ? secreta : "__custom";
  return h("div", { "data-node": n.id, style: { minWidth: 320, width: 320 }, onClick: e => { e.stopPropagation(); onSel(); },
    className: "relative z-10 border-2 p-2 " + border + " " + (isLeaf ? vi(v).bg : "bg-zinc-900") + sombra },
    secreta && h("div", { className: "-mx-2 -mt-2 mb-2 px-2 py-0.5 bg-yellow-300 text-zinc-950 uppercase", title: secreta }, "🔑 ROTA SECRETA · " + rotaNome(secreta)),
    h("div", { className: "flex gap-2 items-center mb-1 flex-wrap" },
      h("span", { className: "border-2 border-zinc-600 px-1 text-zinc-300 bg-zinc-950" }, n.id),
      h("input", { className: "flex-1 min-w-0 bg-transparent border-0 border-b-2 border-dashed border-zinc-700 text-emerald-300 uppercase", value: n.rotulo, "aria-label": "Rótulo " + n.id, onChange: e => updNode(n.id, x => { x.rotulo = e.target.value; }) }),
      conf && h("span", { className: "text-cyan-400" }, "🔍" + S(conf.evidencia_id)),
      recompensa && h("span", { className: "text-amber-300", title: "Desbloqueia " + recompensa }, "🔍🔓" + recompensa), n.desconfianca > 0 && h("span", { className: "text-rose-400", title: "Aumenta a desconfiança global" }, "👁+" + n.desconfianca)),
    conf && h("div", { className: "mb-1 border-2 border-cyan-900 p-1.5 bg-zinc-950" },
      h("div", { className: "text-cyan-400 uppercase" }, "🔍 Confronto por evidência"),
      h(Lbl, { cls: "!mt-1" }, "Evidência usada"),
      h("select", { className: inpCls, value: S(conf.evidencia_id), "aria-label": "Evidência do confronto " + n.id, onChange: e => trocarEvidenciaConfronto(e.target.value) }, evOpts(S(conf.evidencia_id), "Escolha…")),
      h(Lbl, null, "Pergunta / contradição do jogador"),
      h(TA, { value: conf.pergunta_jogador, label: "Pergunta do jogador " + n.id, tone: "text-cyan-300", placeholder: "Você disse que nunca viajou, mas sua ficha indica o contrário.", onChange: t => updNode(n.id, x => { if (x.confronto_evidencia) x.confronto_evidencia.pergunta_jogador = t; }) })),
    h(Lbl, { cls: "!mt-0" }, conf ? "Fala de reação do NPC" : "Fala do NPC"),
    h(TA, { value: n.fala_npc, label: "Fala " + n.id, onChange: t => updNode(n.id, x => { x.fala_npc = t; if (x.confronto_evidencia) x.confronto_evidencia.resposta_npc = t; }) }),
    isLeaf
      ? h("div", { className: "mt-2" },
          h(Lbl, null, "Impacto final na visão do jogador"),
          h("select", { className: inpCls + " " + vi(v).t, value: v, "aria-label": "Visão " + n.id, onChange: e => updNode(n.id, x => { if (x.folha) x.folha.visao_jogador = e.target.value; }) }, VK.map(k => h("option", { key: k, value: k }, k))))
      : h("div", null,
          conf && h(Lbl, null, "Galho de respostas do jogador (nível seguinte)"),
          A(n.opcoes).map((o, i) => h("div", { key: i, "data-opt": n.id + "|" + i, className: "border-t-2 border-dashed border-zinc-700 mt-2 pt-1" },
            h("div", { className: "grid grid-cols-[24px_1fr_26px] gap-1 items-start" },
              h("span", { className: "bg-emerald-500 text-zinc-950 text-center" }, LET[i] || "?"),
              h(TA, { value: o.texto, label: "Opção " + (LET[i] || i) + " " + n.id, onChange: t => updNode(n.id, x => { if (x.opcoes[i]) x.opcoes[i].texto = t; }) }),
              h("button", { type: "button", className: btnCls("r", "!px-0"), "aria-label": "Remover opção", onClick: () => updNode(n.id, x => { x.opcoes.splice(i, 1); }) }, "X")),
            h("div", { className: "grid grid-cols-[100px_1fr] gap-1 mt-1 ml-6" },
              h("select", { className: inpCls, value: o.proximo_no || "", "aria-label": "Destino " + (LET[i] || i), onChange: e => updNode(n.id, x => { if (x.opcoes[i]) x.opcoes[i].proximo_no = e.target.value; }) }, destOpts(o.proximo_no, "-> escolha")),
              h("input", { className: inpCls, value: o.efeito, placeholder: "efeito", "aria-label": "Efeito " + (LET[i] || i), onChange: e => updNode(n.id, x => { if (x.opcoes[i]) x.opcoes[i].efeito = e.target.value; }) })),
            h("div", { className: "ml-6 mt-1" }, h(Btn, { tone: "z", onClick: () => criarSub(i) }, "+ SUB-NÓ / BIFURCAÇÃO")))),
          h("div", { className: "mt-2 flex gap-2 flex-wrap" }, A(n.opcoes).length < 6 && h(Btn, { tone: "g", onClick: () => updNode(n.id, x => { x.opcoes.push(OP("", outros[0]?.id || "", "")); }) }, "+ OPÇÃO")),
          A(n.opcoes).length === 0 && h("div", { className: "text-rose-500 text-sm" }, "Sem opções: beco sem saída.")),

    /* 1) Confrontar evidência: Pergunta -> Reação -> novo galho */
    allowEv && !isLeaf && h("div", { className: "mt-2 border-2 border-cyan-900 p-1.5 bg-zinc-950" },
      A(n.desbloqueios).map((x, i) => h("div", { key: i, className: "flex items-center gap-2 mb-1 text-cyan-300" },
        h("span", { className: "flex-1" }, "🔍 " + x.ev + " → " + x.no),
        h("button", { type: "button", className: btnCls("r", "!px-1"), "aria-label": "Remover confronto", onClick: () => removerConfronto(i) }, "X"))),
      h(Btn, { tone: "c", onClick: abrirConfronto, disabled: !draft && !livres.length, title: !livres.length ? "Cadastre evidências (ou todas já foram usadas aqui)" : "" }, draft ? "[ CANCELAR CONFRONTO ]" : "[ 🔍+ CONFRONTAR EVIDÊNCIA ]"),
      !draft && !livres.length && h("div", { className: "text-zinc-500 text-sm mt-1" }, evs.length ? "Todas as evidências já usadas aqui." : "Cadastre evidências no inventário."),
      draft && h("div", { className: "mt-1" },
        h(Lbl, { cls: "!mt-1" }, "Evidência usada"),
        h("select", { className: inpCls, value: draft.ev || livres[0]?.id || "", "aria-label": "Evidência do novo confronto", onChange: e => setDraft({ ...draft, ev: e.target.value }) },
          livres.map(e => h("option", { key: e.id, value: e.id }, e.id + " · " + S(e.nome).slice(0, 28)))),
        h(Lbl, null, "Pergunta / contradição do jogador"),
        h(TA, { value: draft.pergunta, label: "Pergunta do novo confronto", tone: "text-cyan-300", placeholder: "Você disse que nunca viajou, mas sua ficha indica o contrário.", onChange: t => setDraft({ ...draft, pergunta: t }) }),
        h(Lbl, null, "Fala de reação do NPC"),
        h(TA, { value: draft.reacao, label: "Reação do NPC no novo confronto", placeholder: "Isso deve ser um erro de digitação do sistema...", onChange: t => setDraft({ ...draft, reacao: t }) }),
        h("div", { className: "mt-2" }, h(Btn, { tone: "c", onClick: gerar }, "GERAR GALHO")))),

    /* 2a) Recompensa de nó: desbloquear nova evidência */
    allowEv && h("div", { className: "mt-2" },
      recompensa
        ? h("div", { className: "flex gap-1 items-center" },
            h("span", { className: "text-amber-300 whitespace-nowrap" }, "🔍🔓"),
            h("select", { className: inpCls, value: recompensa, "aria-label": "Evidência desbloqueada " + n.id, onChange: e => updNode(n.id, x => { x.evidencia_desbloqueada = e.target.value; }) }, evOpts(recompensa, "Escolha…").slice(1)),
            h("button", { type: "button", className: btnCls("r", "!px-1"), "aria-label": "Remover recompensa", onClick: () => updNode(n.id, x => { x.evidencia_desbloqueada = ""; }) }, "X"))
        : h(Btn, { tone: "a", disabled: !evs.some(e => e.id), onClick: () => updNode(n.id, x => { x.evidencia_desbloqueada = (evs.find(e => e.id) || {}).id || ""; }), title: "O jogador ganha esta evidência ao alcançar o nó" }, "[ + GANHA EVIDÊNCIA / INFORMAÇÃO ]")),

    allowEv && h("div", { className: "mt-2 flex gap-1 items-center" }, h("span", { className: "text-rose-400 whitespace-nowrap" }, "👁 Desconfiança +"),
      h("input", { type: "number", min: 0, max: 9, className: inpCls + " !w-14", value: n.desconfianca || 0, "aria-label": "Desconfiança " + n.id, onChange: e => updNode(n.id, x => { x.desconfianca = Math.max(0, Math.floor(+e.target.value || 0)); }) })),
    /* 2b) Trava de acesso: rota secreta (EXPERIMENTAL, não vai para o TXT) */
    allowEv && h("div", { className: "mt-2" },
      h(Lbl, { cls: "!mt-0" }, "Condição de acesso do nó"),
      h("select", { className: inpCls + (secreta ? " !text-yellow-300" : ""), value: presetVal, "aria-label": "Trava de acesso " + n.id,
        onChange: e => { const val = e.target.value; updNode(n.id, x => { x.trava_rota_secreta = val === "__custom" ? (PRESETS.some(p2 => p2[0] === x.trava_rota_secreta) || !x.trava_rota_secreta ? "Rota_Personalizada" : x.trava_rota_secreta) : val; }); } },
        h("option", { value: "" }, "Livre"),
        PRESETS.map(([k, nome]) => h("option", { key: k, value: k }, "🔑 Exige Rota Secreta: " + nome)),
        h("option", { value: "__custom" }, "🔑 Exige Rota Secreta: personalizada…")),
      presetVal === "__custom" && h("input", { className: inpCls + " mt-1", value: secreta, "aria-label": "Chave da rota secreta " + n.id, placeholder: "Ex.: Caminho_de_Pressao",
        onChange: e => updNode(n.id, x => { x.trava_rota_secreta = e.target.value.trim() ? e.target.value : "Rota_Personalizada"; }) })),

    h("div", { className: "flex justify-between gap-2 mt-2" },
      !isRoot && (isLeaf
        ? h(Btn, { tone: "z", onClick: () => updNode(n.id, x => { x.folha = null; }) }, "VIRAR INTERMEDIÁRIO")
        : h(ConfirmBtn, { ask: "APAGAR OPÇÕES?", onConfirm: () => updNode(n.id, x => { x.folha = { visao_jogador: "Dúvida" }; x.opcoes = []; x.desbloqueios = []; }) }, "VIRAR FOLHA")),
      !isRoot && h(ConfirmBtn, { tone: "r", ask: "EXCLUIR NÓ?", onConfirm: excluir }, "EXCLUIR")));
}

/* ===================== ÁRVORE EM BLOCOS CSS (sem SVG) ===================== */
function plan(nos) {
  const by = {}; A(nos).forEach(n => { by[n.id] = n; });
  const owned = new Set(); const placed = new Set(); const roots = [];
  const kidsOf = n => [...A(n.opcoes).map((o, i) => ({ key: "o" + i, to: o.proximo_no })), ...A(n.desbloqueios).map((x, i) => ({ key: "e" + i, to: x.no }))];
  const visit = id => { placed.add(id); kidsOf(by[id]).forEach(k => { if (k.to && by[k.to] && !placed.has(k.to)) { owned.add(id + "|" + k.key); visit(k.to); } }); };
  A(nos).forEach(n => { if (!placed.has(n.id)) { roots.push(n.id); visit(n.id); } });
  return { owned, roots, by, kidsOf };
}
const LINE = { principal: "border-emerald-500/40", vies: "border-purple-500/40", injecao: "border-cyan-500/40" };
/* Fluxograma horizontal: cada Branch = [card] ── [coluna vertical de filhos]. Filhos do mesmo pai ficam empilhados
   na mesma coluna; a profundidade só avança para a direita (sem recuo vertical incremental). */
function Branch({ id, T, P, sel, setSel }) {
  const n = P.by[id]; if (!n) return null;
  const kids = P.kidsOf(n);
  const sk = T.tk + "|" + n.id;
  const base = LINE[T.tk] || LINE.principal;
  return h("div", { className: "flex flex-row items-center" },
    h(NodeCard, { n, nos: T.nos, evs: T.evs, isRoot: T.nos[0]?.id === n.id, updNode: T.updNode, updDia: T.updTree, allowEv: T.allowEv, selected: sel === sk, onSel: () => setSel(sk) }),
    kids.length > 0 && h("div", { className: "flex flex-row items-center" },
      h("span", { "aria-hidden": "true", className: "block w-10 border-t-2 " + base }),
      h("div", { className: "flex flex-col" }, kids.map((k, idx) => {
        const isEv = k.key[0] === "e"; const ix = +k.key.slice(1);
        const o = isEv ? null : n.opcoes[ix];
        const line = isEv ? "border-cyan-400/70" : base;
        const pos = kids.length === 1 ? "one" : idx === 0 ? "first" : idx === kids.length - 1 ? "last" : "mid";
        const tag = isEv ? "🔍" : (LET[ix] || "?");
        const tip = isEv ? "🔍 " + S(n.desbloqueios[ix]?.ev) + ": " + S(P.by[k.to]?.confronto_evidencia?.pergunta_jogador) : S(o?.texto);
        const exists = k.to && P.by[k.to];
        return h("div", { key: k.key, className: "relative flex flex-row items-center pl-10 py-4" },
          pos !== "one" && h("span", { "aria-hidden": "true", className: "absolute left-0 w-0 border-l-2 " + line + " " + (pos === "first" ? "top-1/2 bottom-0" : pos === "last" ? "top-0 bottom-1/2" : "top-0 bottom-0") }),
          h("span", { "aria-hidden": "true", className: "absolute left-0 top-1/2 w-10 border-t-2 " + line }),
          h("span", { title: tip, className: "absolute left-2 top-1/2 -translate-y-full text-sm leading-none pb-0.5 " + (isEv ? "text-cyan-400" : "text-zinc-300") }, tag),
          P.owned.has(n.id + "|" + k.key)
            ? h(Branch, { id: k.to, T, P, sel, setSel })
            : exists
              ? h("button", { type: "button", className: "w-[320px] shrink-0 text-left border-2 border-dashed border-zinc-600 text-zinc-400 px-2 hover:text-cyan-300 hover:border-cyan-400", onClick: e => { e.stopPropagation(); setSel(T.tk + "|" + k.to); } }, "↪ " + k.to + " (já exibido)")
              : h("div", { className: "w-[320px] shrink-0 border-2 border-dashed border-rose-500 text-rose-500 px-2" }, "⚠ sem destino"));
      })))
  );
}
const TONES = {
  principal: ["border-emerald-500", "text-emerald-400"],
  injecao: ["border-cyan-500", "text-cyan-400"],
  vies: ["border-purple-500", "text-purple-400"]
};
function TreeArea({ tk, titulo, sub, nos: nosIn, evs, allowEv, zoom, sel, setSel, updNodeIn, updTreeIn }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const t = ref.current; if (!t) return;
    const f = () => { const s = { w: Math.round(t.offsetWidth), h: Math.round(t.offsetHeight) }; setSize(p => (p.w === s.w && p.h === s.h ? p : s)); };
    f(); let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(f); ro.observe(t); }
    window.addEventListener("resize", f);
    return () => { if (ro) ro.disconnect(); window.removeEventListener("resize", f); };
  }, []);
  const [bc, tc] = TONES[tk] || TONES.principal;
  const nos = A(nosIn);
  const T = { tk, nos, evs, allowEv, updNode: (id, fn) => updNodeIn(tk, id, fn), updTree: fn => updTreeIn(tk, fn) };
  const P = plan(nos);
  return h("main", { className: "w-full overflow-auto grid-bg", style: { height: "calc(100vh - 64px)" }, "aria-label": titulo },
    h("div", { style: { width: size.w ? size.w * zoom : "auto", height: size.h ? size.h * zoom : "auto" } },
      h("div", { ref, className: "scale-t min-w-max p-12", style: { width: "max-content", transform: "scale(" + zoom + ")", transformOrigin: "0 0" }, onClick: () => setSel(null) },
        h("div", { className: "mb-8 pb-2 border-b-2 " + bc, style: { width: 320 } }, h("div", { className: "glow text-2xl " + tc }, titulo), h("div", { className: "text-zinc-500 text-sm" }, sub)),
        P.roots.map((r, i) => h("div", { key: r, className: i ? "mt-16 pt-8 border-t-2 border-dashed border-zinc-700" : "" },
          i > 0 && h("div", { className: "text-rose-500 text-sm mb-2" }, "Nó solto (sem ligação com a abertura)"),
          h(Branch, { id: r, T, P, sel, setSel }))))));
}

/* ===================== TRANSIÇÃO / VEREDITO ===================== */
function Matriz({ dia, updDia, diaKey }) {
  const prox = "DIA " + (+diaKey.slice(1) + 1);
  return h(Panel, { title: "MATRIZ DE CONSEQUÊNCIAS → " + prox, tone: "a" },
    h("p", { className: "text-zinc-500 mb-2" }, "Como a folha atingida ou a Injeção/Viés usados mudam o comportamento do NPC no dia seguinte."),
    A(dia?.matriz).map((m, i) => { const vv = VIS[m.k];
      return h("div", { key: m.k, className: "grid gap-2 mb-2 md:grid-cols-[190px_1fr]" },
        h("div", { className: "border-2 px-2 py-1 uppercase " + (vv ? vv.b + " " + vv.t : m.k.startsWith("Inj") ? "border-cyan-500 text-cyan-400" : "border-purple-500 text-purple-400") }, (vv ? "Folha: " : m.k.startsWith("Inj") ? "⚡ " : "🧪 ") + m.k),
        h(TA, { value: m.efeito, label: "Efeito " + m.k, tone: "text-amber-300", onChange: t => updDia(d => { if (d.matriz[i]) d.matriz[i].efeito = t; }) })); }));
}
function Veredito({ dia, updDia }) {
  const v = dia?.veredito; if (!v) return null;
  return h(Panel, { title: "⚖ VEREDITO FINAL DA SEMANA", tone: "a" },
    h("p", { className: "text-zinc-500 mb-2" }, "Painel do Dia 3: o jogador decide Humano, Sintético ou Inconclusivo. Aqui você define a natureza real do NPC e a consequência de cada decisão."),
    h("div", { className: "max-w-xs" }, h(Lbl, { cls: "!mt-0" }, "Natureza real do NPC"),
      h("select", { className: inpCls, value: v.verdade, "aria-label": "Natureza real", onChange: e => updDia(d => { if (d.veredito) d.veredito.verdade = e.target.value; }) }, ["Humano", "Sintético"].map(k => h("option", { key: k, value: k }, k)))),
    A(v.opcoes).map((o, i) => { const acerto = o.k === "Inconclusivo" ? "SEM DECISÃO" : o.k === v.verdade ? "ACERTO" : "ERRO";
      const cls = acerto === "ACERTO" ? "border-emerald-500 text-emerald-400" : acerto === "ERRO" ? "border-rose-500 text-rose-500" : "border-amber-500 text-amber-400";
      return h("div", { key: o.k, className: "grid gap-2 mt-2 md:grid-cols-[190px_1fr]" },
        h("div", { className: "border-2 px-2 py-1 uppercase " + cls }, o.k + " · " + acerto),
        h(TA, { value: o.consequencia, label: "Consequência " + o.k, tone: "text-amber-300", onChange: t => updDia(d => { if (d.veredito && d.veredito.opcoes[i]) d.veredito.opcoes[i].consequencia = t; }) })); }));
}

/* ===================== MODAL JSON ===================== */
function DataModal({ data, onClose, onImport, onReset, flash }) {
  const jsonAtual = () => JSON.stringify(toExport(data), null, 2);
  const [txt, setTxt] = useState(jsonAtual); const [modo, setModo] = useState("json"); const [alvo, setAlvo] = useState("D1"); const [msg, setMsg] = useState("");
  const ref = useRef(null); const alvos = [...DK, "vies", "injecao"];
  useEffect(() => { const f = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, []);
  const base = () => slug(data.npc?.id || data.npc?.falante || S(data.npc?.nome).split(" ")[0]) || "npc";
  const nomeTxt = k => base() + "_" + (DK.includes(k) ? "dia" + k.slice(1) : k) + ".txt";
  const salvar = (nome, conteudo, tipo) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo + ";charset=utf-8" })); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  const ver = (m, a) => { setModo(m); setAlvo(a); setTxt(m === "json" ? jsonAtual() : toTxt(data, a)); };
  const copy = async () => { try { await navigator.clipboard.writeText(txt); setMsg("COPIADO COM SUCESSO!"); } catch (e) { setMsg("CÓPIA BLOQUEADA: selecione o texto e copie manualmente."); try { ref.current && ref.current.select(); } catch (_) {} } };
  const baixar = () => { if (modo === "json") { salvar("turing_master_" + base() + ".json", txt, "application/json"); setMsg("JSON BAIXADO"); } else { salvar(nomeTxt(alvo), txt, "text/plain"); setMsg("BAIXADO: " + nomeTxt(alvo)); } };
  const todos = () => { alvos.forEach((k, i) => setTimeout(() => salvar(nomeTxt(k), toTxt(data, k), "text/plain"), i * 400)); setMsg("BAIXANDO " + alvos.length + " ARQUIVOS .TXT (permita downloads múltiplos no navegador)"); };
  const imp = () => { try { onImport(normalize(JSON.parse(txt))); flash("JSON importado"); onClose(); } catch (e) { setMsg("JSON INVÁLIDO (importe no modo JSON): " + (e && e.message ? e.message : "verifique o texto")); } };
  return h("div", { className: "fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4", role: "dialog", "aria-modal": "true", "aria-label": "JSON / Dados", onClick: onClose },
    h("div", { className: "w-full max-w-3xl border-2 border-emerald-500 bg-zinc-950 p-3 shadow-[6px_6px_0_0_#064e3b]", onClick: e => e.stopPropagation() },
      h("div", { className: "flex justify-between items-center mb-2" }, h("span", { className: "glow text-2xl text-emerald-400" }, "▌JSON / TXT · MASTER"), h(Btn, { tone: "r", onClick: onClose }, "FECHAR [ESC]")),
      h("div", { className: "flex flex-wrap gap-2 mb-2 items-center" }, h(Btn, { tone: "g", on: modo === "json", onClick: () => ver("json", alvo) }, "JSON"), h(Btn, { tone: "c", on: modo === "txt", onClick: () => ver("txt", alvo) }, "TXT (provisório)"),
        modo === "txt" && h("select", { className: inpCls + " !w-52", value: alvo, "aria-label": "Arquivo TXT", onChange: e => ver("txt", e.target.value) }, alvos.map(k => h("option", { key: k, value: k }, nomeTxt(k))))),
      h("textarea", { ref, value: txt, spellCheck: false, "aria-label": "Conteúdo", onChange: e => setTxt(e.target.value), className: "w-full h-72 bg-zinc-950 border-2 border-zinc-700 text-emerald-300 p-2 text-base focus:border-cyan-400" }),
      h("div", { className: "flex flex-wrap gap-2 mt-2" },
        h(Btn, { tone: "g", onClick: copy }, "COPIAR"), h(Btn, { tone: "c", onClick: baixar }, modo === "json" ? "BAIXAR .JSON" : "BAIXAR ESTE .TXT"),
        modo === "txt" && h(Btn, { tone: "c", onClick: todos }, "BAIXAR TODOS OS .TXT"),
        modo === "json" && h(Btn, { tone: "a", onClick: imp }, "IMPORTAR (do texto acima)"),
        h(Btn, { tone: "z", onClick: () => { ver(modo, alvo); setMsg("TEXTO RECARREGADO DO ESTADO ATUAL"); } }, "RECARREGAR"),
        h(ConfirmBtn, { tone: "r", ask: "APAGAR TUDO?", onConfirm: () => { onReset(); onClose(); } }, "LIMPAR / RESET")),
      msg && h("div", { className: "mt-2 text-amber-400", role: "status" }, "> " + msg)));
}

/* ===================== APP ===================== */
function App({ initial }) {
  const [data, setData] = useState(() => initial || fresh());
  const [sel, setSel] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState({ ok: true, at: "" });
  const [dl, setDl] = useState(null);
  const aba = ABAS.includes(data.aba) ? data.aba : "D1";
  const dk = DK.includes(aba) ? aba : "D1";
  const isDay = DK.includes(aba);
  const dia = data.dias?.[dk];
  const evs = A(data.evidencias);

  useEffect(() => { let vivo = true; try { if (window.claude && window.claude.use) window.claude.use("downloads").then(d => { if (vivo && d) setDl(d); }).catch(() => {}); } catch (e) {} return () => { vivo = false; }; }, []);

  const upd = fn => setData(prev => { try { const c = clone(prev); fn(c); const next = normalize(c); window.__turingPending = next; return next; } catch (e) { try { console.error(e); } catch (_) {} return prev; } });
  const updDia = fn => upd(d => { const x = d.dias?.[DK.includes(d.aba) ? d.aba : "D1"]; if (x) fn(x); });
  const treeOf = (d, tk) => (tk === "vies" ? d.arvore_vies : tk === "injecao" ? d.arvore_injecao : d.dias?.[DK.includes(d.aba) ? d.aba : "D1"]?.arvores?.principal);
  const updTreeIn = (tk, fn) => upd(d => { const t = treeOf(d, tk); if (t) fn(t); });
  const updNodeIn = (tk, id, fn) => updTreeIn(tk, t => { const n = A(t.nos).find(z => z.id === id); if (n) fn(n); });
  const flash = m => { setToast(m); setTimeout(() => setToast(""), 2400); };

  useEffect(() => {
    window.__turingState = data;
    const s = JSON.stringify(data);
    const ok = lsSet(K_AUTO, s);
    const at = new Date().toLocaleTimeString("pt-BR");
    setSaved(p => (p.ok === ok && p.at === at ? p : { ok, at }));
    const t = setTimeout(() => lsSet(K_GOOD, s), 2000);
    return () => clearTimeout(t);
  }, [data]);

  const setZ = z => setZoom(Math.min(1.5, Math.max(0.4, Math.round(z * 100) / 100)));
  const TABS = [...DK.map(k => [k, "📅 S" + (k > "D3" ? 2 : 1) + "·" + k, "a"]), ["VIES", "🧪 VIÉS", "p"], ["INJECAO", "⚡ INJEÇÃO", "c"]];
  const on = { a: "border-amber-400 bg-amber-400 text-zinc-950", p: "border-purple-400 bg-purple-400 text-zinc-950", c: "border-cyan-400 bg-cyan-400 text-zinc-950" };
  const off = { a: "border-zinc-600 text-amber-400 bg-zinc-950 hover:bg-zinc-800", p: "border-zinc-600 text-purple-400 bg-zinc-950 hover:bg-zinc-800", c: "border-zinc-600 text-cyan-400 bg-zinc-950 hover:bg-zinc-800" };
  const tab = ([k, nome, t]) => h("button", { key: k, type: "button", role: "tab", "aria-selected": aba === k, onClick: () => { setSel(null); upd(d => { d.aba = k; }); }, className: BTN + (aba === k ? on[t] : off[t]) }, "[ " + nome + " ]");

  return h("div", { className: "min-h-screen w-full" },
    h("header", { className: "sticky top-0 z-50 h-16 bg-zinc-950 border-b-2 border-zinc-700 px-3 flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap" },
      h("span", { className: "glow text-2xl text-emerald-400 mr-2 shrink-0" }, "TURING_TEST://MASTER"),
      h("nav", { className: "flex gap-1 flex-nowrap", role: "tablist", "aria-label": "Módulos do NPC" }, TABS.map(tab)),
      h("div", { className: "flex items-center gap-1 ml-auto flex-nowrap shrink-0" },
        h(Btn, { tone: "z", onClick: () => setZ(zoom - 0.1), title: "Diminuir zoom" }, "[ − ]"),
        h("button", { type: "button", className: btnCls("z"), title: "Zoom 100%", onClick: () => setZ(1) }, "[ " + Math.round(zoom * 100) + "% ]"),
        h(Btn, { tone: "z", onClick: () => setZ(zoom + 0.1), title: "Aumentar zoom" }, "[ + ]"),
        h("span", { role: "status", className: "mx-2 " + (saved.ok ? "text-emerald-400" : "text-rose-500") }, saved.ok ? "● SALVO " + saved.at : "● SEM ARMAZENAMENTO: exporte o JSON"),
        h(Btn, { tone: "g", onClick: () => setModal(true) }, "💾 JSON / DADOS"))),
    isDay && h(TreeArea, { key: aba, tk: "principal", titulo: "🌳 [ ÁRVORE DE DIÁLOGO · S" + (dk > "D3" ? 2 : 1) + " " + dk + " ]", sub: "Abertura ➔ Ramos ➔ Folhas · com 🔍 desbloqueio por evidência", nos: data.dias?.[dk]?.arvores?.principal?.nos, evs, allowEv: true, zoom, sel, setSel, updNodeIn, updTreeIn }),
    aba === "VIES" && h(TreeArea, { key: aba, tk: "vies", titulo: "🧪 [ ÁRVORE DE ENVIESAMENTO DE DADOS ]", sub: "Rotas de desvio por Viés do NPC · resposta fixa, 1 uso por conversa", nos: data.arvore_vies?.nos, evs, allowEv: false, zoom, sel, setSel, updNodeIn, updTreeIn }),
    aba === "INJECAO" && h(TreeArea, { key: aba, tk: "injecao", titulo: "⚡ [ ÁRVORE DE INJEÇÃO DE PROMPT ]", sub: "Rotas de desvio por Injeção do NPC · resposta fixa, 1 uso por conversa", nos: data.arvore_injecao?.nos, evs, allowEv: false, zoom, sel, setSel, updNodeIn, updTreeIn }),
    h("section", { className: "p-4 border-t-2 border-zinc-700", "aria-label": "Painel de apoio" },
      h("div", { className: "glow text-xl text-zinc-400 mb-3" }, "▌ PAINEL DE APOIO"),
    h("div", { className: "flex flex-wrap gap-2 mb-3 items-center" },
      h("span", { className: "text-zinc-500" }, "NPC>"),
      h("input", { className: inpCls + " !w-52", value: data.npc?.nome || "", "aria-label": "Nome do NPC", onChange: e => upd(d => { d.npc.nome = e.target.value; }) }),
      h("input", { className: inpCls + " !w-52", value: data.npc?.tipo || "", "aria-label": "Tipo do NPC", onChange: e => upd(d => { d.npc.tipo = e.target.value; }) }),
      h("input", { className: inpCls + " !w-44", value: data.npc?.id || "", placeholder: "id do arquivo (ex.: arthur)", "aria-label": "ID do NPC", onChange: e => upd(d => { d.npc.id = e.target.value; }) }),
      h("input", { className: inpCls + " !w-44", value: data.npc?.falante || "", placeholder: "nome na fala (ex.: Arthur)", "aria-label": "Nome na fala", onChange: e => upd(d => { d.npc.falante = e.target.value; }) })),
    isDay && h(Inventario, { data, upd }),
    h(Metrica, { data, upd }),
    h(Validacao, { data }),
    h("div", { className: "flex flex-wrap gap-4 mb-2 text-sm text-zinc-400" },
      h("span", { className: "text-emerald-400" }, "■ Confiança"), h("span", { className: "text-amber-400" }, "■ Dúvida"), h("span", { className: "text-rose-500" }, "■ Pressão"),
      isDay && h("span", { className: "text-cyan-400" }, "┄ 🔍 desbloqueio por evidência")),
    isDay && (!LASTD(dk) ? h(Matriz, { dia: data.dias?.[dk], updDia, diaKey: dk }) : h(Veredito, { dia: data.dias?.[dk], updDia })),
    ),
    modal && h(DataModal, { data, onClose: () => setModal(false), onImport: d => { setData(d); setSel(null); }, onReset: () => { lsDel(K_AUTO); lsDel(K_GOOD); setSel(null); setData(fresh()); flash("Reiniciado com dados de exemplo"); }, flash }),
    toast && h("div", { className: "fixed right-4 bottom-4 z-50 bg-emerald-400 text-zinc-950 border-2 border-emerald-200 px-3 py-1", role: "status" }, toast));
}

/* ===================== ERROR BOUNDARY ===================== */
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null, info: "", json: "", msg: "" }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { try { console.error(err, info); } catch (e) {} this.setState({ info: S(info && info.componentStack).split("\n").slice(0, 8).join("\n") }); }
  currentJson() { try { const st = window.__turingPending || window.__turingState; if (st) return JSON.stringify(st); } catch (e) {} return lsGet(K_AUTO) || lsGet(K_GOOD) || ""; }
  render() {
    if (!this.state.err) return this.props.children;
    const e = this.state.err;
    const copy = async () => { const j = this.currentJson(); try { await navigator.clipboard.writeText(j); this.setState({ msg: "JSON COPIADO.", json: "" }); } catch (x) { this.setState({ msg: "CÓPIA BLOQUEADA: copie o texto abaixo.", json: j }); } };
    const restore = () => this.props.onRestore(parseState(lsGet(K_GOOD)) || parseState(lsGet(K_AUTO)) || fresh());
    const wipe = () => { lsDel(K_AUTO); lsDel(K_GOOD); this.props.onRestore(fresh()); };
    return h("div", { className: "max-w-3xl mx-auto mt-10 p-3 border-2 border-rose-500 bg-zinc-950" },
      h("h1", { className: "text-3xl text-rose-500 glow" }, "!! FALHA NO TERMINAL !!"),
      h("p", { className: "text-zinc-400 my-2" }, "Seus dados continuam salvos no navegador. Exporte o JSON atual ou restaure o último estado estável."),
      h("pre", { className: "border-2 border-zinc-700 p-2 overflow-auto max-h-48 whitespace-pre-wrap text-amber-300" }, S(e && e.message ? e.message : e) + (this.state.info ? "\n" + this.state.info : "")),
      h("div", { className: "flex flex-wrap gap-2 my-3" }, h(Btn, { tone: "g", onClick: copy }, "EXPORTAR JSON ATUAL"), h(Btn, { tone: "c", onClick: restore }, "RESTAURAR ÚLTIMO ESTADO"), h(ConfirmBtn, { tone: "r", ask: "APAGAR TUDO?", onConfirm: wipe }, "LIMPAR E REINICIAR")),
      this.state.msg && h("p", { className: "text-amber-400" }, "> " + this.state.msg),
      this.state.json && h("textarea", { readOnly: true, value: this.state.json, onFocus: x => x.target.select(), className: "w-full h-40 bg-zinc-950 border-2 border-zinc-700 text-emerald-300 p-2" }));
  }
}
function Root() {
  const [boot, setBoot] = useState(() => ({ data: loadInitial(), epoch: 0 }));
  return h(ErrorBoundary, { key: boot.epoch, onRestore: d => setBoot(b => ({ data: d, epoch: b.epoch + 1 })) }, h(App, { initial: boot.data }));
}
ReactDOM.createRoot(document.getElementById("root")).render(h(Root));
