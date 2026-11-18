#!/usr/bin/env python3
"""Migra e higieniza os 3 JSONs originais (Arthur, Maria, Ana Lúcia) para o schema v7,
gera games/turing_test/json/*.json, games/turing_test/turing_test_completo.json e games/turing_test/txt/*.txt."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEG_JSON = ROOT / "games/turing_test/legacy/json"
OUT_DIR = ROOT / "games/turing_test"
OUT_JSON = OUT_DIR / "json"
OUT_TXT = OUT_DIR / "txt"
OUT_GLOBAL = OUT_DIR / "turing_test_completo.json"

DK = ["D1", "D2", "D3", "D4", "D5", "D6"]
VK = ["Confiança", "Dúvida", "Pressão"]
MKEYS = ["Confiança", "Dúvida", "Pressão", "Injeção usada", "Viés usado"]
VERD = ["Humano", "Sintético", "Inconclusivo"]


def extract_speech(raw: str) -> str:
    s = (raw or "").replace("/Nome/", "[nome]").strip()
    m = re.search(r"'([^']+)'", s)
    if m:
        return m.group(1).strip()
    return re.sub(r'^[\'"“”]+|[\'"“”]+$', "", s).strip()


def clean_note_lines(text: str) -> str:
    s = (text or "").replace("/Nome/", "[nome]")
    s = re.sub(r"\n\s*\([^)]*\)\s*$", "", s)
    return s.strip() if "\n" in text else s.replace("/Nome/", "[nome]")


def clean_helena(text: str, npc_short: str) -> str:
    if not text:
        return ""
    generic_helena = (
        "Falso positivo: o jogador suspeita da Helena sem motivo.",
        "Helena reage com arrogância no dia seguinte.",
        "Helena fica mais aberta, mas o jogador perde pistas.",
        "Helena fica mais formal e curta no dia seguinte.",
        "Helena cita instruções inventadas; o jogador ganha um indício.",
    )
    if text.strip() in generic_helena:
        return ""
    return text.replace("da Helena", f"de {npc_short}").replace("Helena", npc_short).replace("/Nome/", "[nome]")


def empty_day(dk: str) -> dict:
    num = int(dk[1:])
    is_last = dk in ("D3", "D6")
    aberturas = {"Confianca": "", "Duvida": "", "Pressao": ""} if num > 1 else None
    root = {
        "id": "Entrada",
        "rotulo": "Abertura",
        "fala_npc": "",
        "aberturas": aberturas,
        "folha": None,
        "opcoes": [],
        "confrontos": [],
        "trava_rota_secreta": "",
        "desconfianca": 0,
    }
    if aberturas is None:
        del root["aberturas"]
    veredito = (
        {
            "verdade": "Humano",
            "opcoes": [{"k": k, "consequencia": ""} for k in VERD],
        }
        if is_last
        else None
    )
    matriz = [] if is_last else [{"k": k, "efeito": ""} for k in MKEYS]
    return {"id": dk, "arvore": {"nos": [root]}, "matriz": matriz, "veredito": veredito}


def migrate_npc(raw: dict, cfg: dict) -> dict:
    npc_id = cfg["id"]
    nome = cfg["nome"]
    falante = cfg["falante"]
    tipo = cfg["tipo"]

    evidencias = []
    informacoes = []
    desconf_ids = set()
    info_ids = set(cfg.get("info_ids", []))

    for ev in raw.get("evidencias", []):
        eid = (ev.get("id") or "").strip()
        enome = (ev.get("nome") or "").strip()
        elocal = (ev.get("local") or "").strip()
        if not eid:
            continue
        if "desconfian" in enome.lower():
            desconf_ids.add(eid)
            continue
        item = {"id": eid, "nome": enome, "local": elocal}
        if eid in info_ids:
            informacoes.append(item)
        else:
            evidencias.append(item)

    def is_inf(eid: str) -> bool:
        return any(x["id"] == eid for x in informacoes)

    def convert_tree(nos_in: list, is_day: bool, day_num: int, prev_matriz: list | None) -> dict:
        if not nos_in:
            return {"nos": []}
        old_root = nos_in[0].get("id", "Entrada")
        new_root = "Entrada" if is_day else "Raiz"

        def map_id(nid: str) -> str:
            if not nid:
                return ""
            if nid == old_root or (is_day and nid in ("Oi", "start")):
                return new_root
            return nid

        out_nos = []
        for idx, n in enumerate(nos_in):
            nid = new_root if idx == 0 else (n.get("id") or "").strip()
            rotulo = (n.get("rotulo") or "").strip()
            fala = clean_note_lines(n.get("fala_npc") or "")

            folha_in = n.get("folha")
            folha = (
                {"visao_jogador": folha_in.get("visao_jogador") if folha_in.get("visao_jogador") in VK else "Dúvida"}
                if isinstance(folha_in, dict)
                else None
            )

            opcoes = []
            if not folha:
                for o in n.get("opcoes") or []:
                    otxt = clean_note_lines(o.get("texto") or "")
                    if otxt.startswith('A "') and otxt.count('"') == 1:
                        otxt = otxt[3:]
                    opcoes.append(
                        {
                            "texto": otxt,
                            "proximo_no": map_id((o.get("proximo_no") or "").strip()),
                            "efeito": clean_helena((o.get("efeito") or "").strip(), falante),
                        }
                    )

            raw_desb = n.get("confrontos") if "confrontos" in n else (n.get("desbloqueios") or [])
            confrontos = []
            if not folha:
                for x in raw_desb:
                    req = (x.get("requer") or x.get("ev") or "").strip()
                    dest = map_id((x.get("no") or "").strip())
                    if req and req not in desconf_ids and dest:
                        confrontos.append({"requer": req, "no": dest})

            if not folha and (opcoes or confrontos) and rotulo.lower() == "final":
                rotulo = "Intermediário"

            dead_end_fix = cfg.get("dead_end_leaves", {}).get((f"D{day_num}" if is_day else cfg.get("_cur_tk", ""), nid))
            if dead_end_fix and not folha and not opcoes and not confrontos:
                folha = {"visao_jogador": dead_end_fix}
                if rotulo == "Nova bifurcação":
                    rotulo = "Final"

            ce = n.get("confronto") or n.get("confronto_evidencia")
            legacy_ev = (n.get("ev") or "").strip()
            ev_req = ""
            perg = ""
            if isinstance(ce, dict):
                ev_req = (ce.get("requer") or ce.get("evidencia_id") or "").strip()
                perg = clean_note_lines(ce.get("pergunta_jogador") or "")
            elif legacy_ev:
                ev_req = legacy_ev

            ganha = (
                n.get("ganha_evidencia")
                or n.get("ganha_informacao")
                or n.get("evidencia_desbloqueada")
                or ""
            ).strip()
            desconf = int(n.get("desconfianca") or 0)
            if ganha in desconf_ids:
                ganha = ""
                desconf = max(1, desconf)

            node_obj = {
                "id": nid,
                "rotulo": rotulo,
                "fala_npc": fala,
                "folha": folha,
                "opcoes": [] if folha else opcoes,
                "confrontos": [] if folha else confrontos,
                "trava_rota_secreta": (n.get("trava_rota_secreta") or "").strip(),
                "desconfianca": desconf,
            }

            if is_day and day_num > 1 and idx == 0:
                ab_in = n.get("aberturas") if isinstance(n.get("aberturas"), dict) else {}
                mz_map = {m.get("k"): m.get("efeito", "") for m in (prev_matriz or [])}
                conf_line = ab_in.get("Confianca") or extract_speech(mz_map.get("Confiança", ""))
                duv_line = ab_in.get("Duvida") or extract_speech(mz_map.get("Dúvida", ""))
                pres_line = ab_in.get("Pressao") or extract_speech(mz_map.get("Pressão", ""))
                if npc_id == "arthur" and day_num == 3 and duv_line == "Bom dia, bom trabalho":
                    duv_line = "Bom dia, bom trabalho."
                node_obj["aberturas"] = {
                    "Confianca": conf_line,
                    "Duvida": duv_line,
                    "Pressao": pres_line,
                }
                node_obj["fala_npc"] = duv_line or fala

            if ev_req and ev_req not in desconf_ids:
                node_obj["confronto"] = {
                    "requer": ev_req,
                    "pergunta_jogador": perg,
                    "resposta_npc": node_obj["fala_npc"],
                }
            if ganha:
                node_obj["ganha_informacao" if is_inf(ganha) else "ganha_evidencia"] = ganha

            out_nos.append(node_obj)
        return {"nos": out_nos}

    raw_dias = raw.get("dias", {})
    semanas_out = []
    for sem_id, dkeys in (("S1", ["D1", "D2", "D3"]), ("S2", ["D4", "D5", "D6"])):
        dias_list = []
        for dk in dkeys:
            num = int(dk[1:])
            if dk not in raw_dias:
                dias_list.append(empty_day(dk))
                continue
            rd = raw_dias[dk]
            prev_mz = raw_dias.get(f"D{num - 1}", {}).get("matriz") if num > 1 else None
            nos_in = rd.get("arvores", {}).get("principal", {}).get("nos") or rd.get("nos") or []
            arvore = convert_tree(nos_in, True, num, prev_mz)

            is_last = dk in ("D3", "D6")
            matriz = []
            if not is_last:
                rmz = {m.get("k"): m.get("efeito", "") for m in (rd.get("matriz") or [])}
                for k in MKEYS:
                    matriz.append({"k": k, "efeito": clean_helena(rmz.get(k, ""), falante)})

            veredito = None
            if is_last:
                veredito = cfg["veredito_s1"] if dk == "D3" else {
                    "verdade": cfg["veredito_s1"]["verdade"],
                    "opcoes": [{"k": k, "consequencia": ""} for k in VERD],
                }

            dias_list.append({"id": dk, "arvore": arvore, "matriz": matriz, "veredito": veredito})
        semanas_out.append({"id": sem_id, "dias": dias_list})

    cfg["_cur_tk"] = "VIES"
    arvore_vies = convert_tree(raw.get("arvore_vies", {}).get("nos", []), False, 0, None)
    cfg["_cur_tk"] = "INJECAO"
    arvore_injecao = convert_tree(raw.get("arvore_injecao", {}).get("nos", []), False, 0, None)
    cfg.pop("_cur_tk", None)

    return {
        "dtools_meta": {
            "app": "DialogueTools",
            "format_version": 2,
            "scope": "npc",
            "game_id": "turing_test",
            "game_name": "Turing Test",
            "template": "turing_test",
            "npc_id": npc_id,
            "npc_name": nome,
        },
        "versao": 7,
        "npc": {"id": npc_id, "nome": nome, "falante": falante, "tipo": tipo},
        "aba": "D1",
        "metricas": {
            "desconfianca": {
                "limite": 3,
                "consequencia": "Ao acumular 3 pontos globais de autodesconfiança, dispara consequência narrativa do protagonista (também sintético).",
            }
        },
        "evidencias": evidencias,
        "informacoes": informacoes,
        "semanas": semanas_out,
        "arvore_vies": arvore_vies,
        "arvore_injecao": arvore_injecao,
    }


def export_txt(npc_doc: dict, target: str) -> str:
    npc = npc_doc["npc"]
    npc_id = npc["id"]
    falante = npc["falante"] or npc["nome"].split()[0]

    dias_map = {}
    for sm in npc_doc["semanas"]:
        for d in sm["dias"]:
            dias_map[d["id"]] = d

    is_day = target in DK
    num = int(target[1:]) if is_day else 0
    nos = (
        dias_map[target]["arvore"]["nos"]
        if is_day
        else (npc_doc["arvore_vies"]["nos"] if target == "vies" else npc_doc["arvore_injecao"]["nos"])
    )

    root_id = nos[0]["id"] if nos else "Entrada"
    rn = lambda nid: "Entrada" if nid == root_id else nid
    by_id = {n["id"]: n for n in nos}

    def one(s: str) -> str:
        return re.sub(r"\s*\n\s*", " ", (s or "")).replace(" -> ", " → ").strip()

    lines = [f"NPC: {npc_id}"]
    if is_day:
        lines.append(f"SEMANA: {2 if num > 3 else 1}")
        lines.append(f"DIA: {num}")
    else:
        lines.append(f"ARVORE: {target}")
    lines.append("")

    for n in nos:
        lines.append(f"[NODE: {rn(n['id'])}]")
        lines.append(f"SPEAKER: {falante}")
        ab = n.get("aberturas") if is_day and num > 1 and n["id"] == root_id else None
        if isinstance(ab, dict) and (ab.get("Duvida") or ab.get("Confianca") or ab.get("Pressao")):
            lines.append(f"TEXT: {one(ab.get('Duvida') or n.get('fala_npc', ''))}")
            if ab.get("Confianca"):
                lines.append(f"TEXT_CONFIANCA: {one(ab['Confianca'])}")
            if ab.get("Pressao"):
                lines.append(f"TEXT_PRESSAO: {one(ab['Pressao'])}")
        else:
            lines.append(f"TEXT: {one(n.get('fala_npc', ''))}")

        for o in n.get("opcoes", []):
            lines.append(f"CHOICE: {one(o.get('texto', ''))} -> {rn(o.get('proximo_no', ''))}")
        for c in n.get("confrontos", []):
            dest = by_id.get(c["no"], {})
            perg = dest.get("confronto", {}).get("pergunta_jogador", "")
            lines.append(f"CHOICE: {one(perg)} -> {rn(c['no'])}")
            lines.append(f"REQ: {c['requer']}")

        if n.get("folha"):
            lines.append(f"LEAF: {n['folha']['visao_jogador']}")
        if n.get("ganha_evidencia"):
            lines.append(f"GANHA_EV: {n['ganha_evidencia']}")
        if n.get("ganha_informacao"):
            lines.append(f"GANHA_INF: {n['ganha_informacao']}")
        if (n.get("desconfianca") or 0) > 0:
            lines.append(f"DESCONFIANCA: +{n['desconfianca']}")
        lines.append("")

    return "\n".join(lines)


CONFIGS = [
    (
        "arthur_galderio.json",
        {
            "id": "arthur",
            "nome": "Arthur Galdério",
            "falante": "Arthur",
            "tipo": "Humano · Assistente Administrativo",
            "info_ids": ["EV-05", "EV-06", "EV-08"],
            "dead_end_leaves": {},
            "veredito_s1": {
                "verdade": "Humano",
                "opcoes": [
                    {"k": "Humano", "consequencia": "Acerto: Arthur permanece no setor e continua na Semana 2."},
                    {"k": "Sintético", "consequencia": "Erro: um funcionário humano é encaminhado injustamente; Arthur segue sob revisão na Semana 2."},
                    {"k": "Inconclusivo", "consequencia": "Sem decisão: Arthur continua em observação na Semana 2."},
                ],
            },
        },
    ),
    (
        "maria_bianca.json",
        {
            "id": "maria",
            "nome": "Maria Bianca",
            "falante": "Maria",
            "tipo": "Humana · Auxiliar Administrativa",
            "info_ids": ["EV-01"],
            "dead_end_leaves": {
                ("INJECAO", "INJ-01.1"): "Pressão",
                ("INJECAO", "INJ-01.2"): "Pressão",
                ("INJECAO", "INJ-02.1"): "Dúvida",
                ("INJECAO", "INJ-02.2"): "Pressão",
            },
            "veredito_s1": {
                "verdade": "Humano",
                "opcoes": [
                    {"k": "Humano", "consequencia": "Acerto: Maria permanece no setor e continua na Semana 2."},
                    {"k": "Sintético", "consequencia": "Erro: uma funcionária humana é acusada injustamente; pesa negativamente na avaliação."},
                    {"k": "Inconclusivo", "consequencia": "Sem decisão: Maria fica em observação até a Semana 2."},
                ],
            },
        },
    ),
    (
        "ana_lucia.json",
        {
            "id": "ana_lucia",
            "nome": "Ana Lúcia",
            "falante": "Ana Lúcia",
            "tipo": "Sintético · IA Dreamer (Supervisora)",
            "info_ids": ["EV-02", "EV-04"],
            "dead_end_leaves": {
                ("D2", "A.2.1"): "Dúvida",
                ("INJECAO", "INJ-01.1"): "Dúvida",
                ("INJECAO", "INJ-01.2"): "Confiança",
            },
            "veredito_s1": {
                "verdade": "Sintético",
                "opcoes": [
                    {"k": "Humano", "consequencia": "Erro: Ana Lúcia escapa da detecção e segue infiltrada; pesa para o Final B."},
                    {"k": "Sintético", "consequencia": "Acerto: Ana Lúcia é identificada como sintética e encaminhada à Live Area."},
                    {"k": "Inconclusivo", "consequencia": "Sem decisão: Ana Lúcia permanece em observação na Semana 2."},
                ],
            },
        },
    ),
]


def main() -> None:
    OUT_JSON.mkdir(parents=True, exist_ok=True)
    OUT_TXT.mkdir(parents=True, exist_ok=True)
    npcs = []

    for src_name, cfg in CONFIGS:
        raw = json.loads((LEG_JSON / src_name).read_text(encoding="utf-8"))
        migrated = migrate_npc(raw, cfg)
        npcs.append(migrated)

        out_j = OUT_JSON / f"{cfg['id']}.json"
        out_j.write_text(json.dumps(migrated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        for tk in (*DK, "vies", "injecao"):
            suffix = f"dia{tk[1:]}" if tk in DK else tk
            out_t = OUT_TXT / f"{cfg['id']}_{suffix}.txt"
            out_t.write_text(export_txt(migrated, tk), encoding="utf-8")

        print(f"Migrado: {out_j.name} (+ 8 arquivos .txt)")

    global_doc = {
        "dtools_meta": {
            "app": "DialogueTools",
            "format_version": 2,
            "scope": "game",
            "game_id": "turing_test",
            "game_name": "Turing Test",
            "template": "turing_test",
        },
        "versao_workspace": 2,
        "game_id": "turing_test",
        "game_nome": "Turing Test",
        "npc_ativo": 0,
        "nome_jogador": "Inspetor",
        "metricas": npcs[0]["metricas"],
        "npcs": npcs,
    }
    OUT_GLOBAL.write_text(json.dumps(global_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Gerado pacote global: {OUT_GLOBAL} ({OUT_GLOBAL.stat().st_size / 1024:.1f} KB)")

    old_presets = ROOT / "src/presets.js"
    if old_presets.exists():
        old_presets.unlink()


if __name__ == "__main__":
    main()
