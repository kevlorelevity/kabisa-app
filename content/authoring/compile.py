"""Compile Kabisa lesson scripts (lessons/*.txt) into content/lessons/*.json.

Usage:  python3 compile.py <out_dir> [--check]

See README.md for the script format.
"""
from __future__ import annotations

import json
import re
import sys
import uuid
from pathlib import Path

import morph
from lexicon import LEX
from verbs import STEMS

NS = uuid.UUID('6f1c5e2a-9b7d-4c1e-8a53-2d4b7e9f0a11')
HERE = Path(__file__).parent
TOKEN = re.compile(r"[A-Za-zÀ-ÿ'’\-]+")
LEVEL_DIFFICULTY = {1: 'beginner', 2: 'beginner', 3: 'beginner', 4: 'medium', 5: 'medium', 6: 'medium', 7: 'medium',
                    8: 'advanced', 9: 'advanced', 10: 'advanced'}
UNKNOWN: dict[str, set] = {}


def uid(*parts) -> str:
    return str(uuid.uuid5(NS, ':'.join(str(p) for p in parts)))


# ---------------- glossing ----------------

def short_meaning(gloss: str) -> str:
    m = re.match(r'"([^"]+)"', gloss)
    if m:
        return m.group(1)
    return gloss.split(' — ')[0].split('. ')[0]


def lookup(key: str, local: dict):
    k = key.lower().replace('’', "'")
    if k in local:
        return dict(local[k])
    if k in LEX:
        e = LEX[k]
        out = {'gloss': e['gloss'], 'grammar': list(e['grammar'])}
        if e.get('sanifu'):
            out['sanifu'] = e['sanifu']
        if e.get('conjugation'):
            out['conjugation'] = e['conjugation']
        return out
    return None


def analyze_word(word: str, local: dict):
    hit = lookup(word, local)
    if hit:
        return hit
    g = morph.gloss_for(word)
    if g:
        return g
    w = word.lower()
    # locative -ni: sokoni, nyumbani, mjini
    if w.endswith('ni') and len(w) > 4:
        base = w[:-2]
        for cand in (base, base + 'a', base[:-1] + 'a' if base.endswith('e') else None):
            if cand and cand in LEX:
                return {'gloss': f'"at / in / to the {short_meaning(LEX[cand]["gloss"]).split(" / ")[0]}" — {cand} + -ni (place suffix).',
                        'grammar': ['locative-ni']}
    return None


def gloss_line(text: str, local: dict, ctx: str):
    toks = [(m.group(0), m.start(), m.end()) for m in TOKEN.finditer(text)]
    out = []
    i = 0
    while i < len(toks):
        done = False
        for n in (4, 3, 2):
            if i + n > len(toks):
                continue
            span = toks[i:i + n]
            if any(text[span[j][2]:span[j + 1][1]] != ' ' for j in range(n - 1)):
                continue
            phrase = text[span[0][1]:span[-1][2]]
            hit = lookup(phrase, local)
            if hit:
                out.append({'text': phrase, **hit})
                i += n
                done = True
                break
        if done:
            continue
        word = toks[i][0].strip("-'")
        if word:
            hit = analyze_word(word, local)
            if hit:
                out.append({'text': word, **hit})
            elif not word[0].isupper() or word.lower() in ('niaje',):
                UNKNOWN.setdefault(word.lower(), set()).add(ctx)
            else:
                UNKNOWN.setdefault(word, set()).add(ctx + ' (name?)')
        i += 1
    # continuous tenses: (ni)likuwa / (ni)mekuwa / (ni)takuwa + -ki- or -na- verb
    for a, b in zip(out, out[1:]):
        pa = morph.best_parse(a['text']) if ' ' not in a['text'] else None
        pb = morph.best_parse(b['text']) if ' ' not in b['text'] else None
        if pa and pa.stem == 'wa' and pa.kind in ('past', 'perfect', 'future') and pb and pb.kind in ('ki', 'present', 'contracted', 'perfect'):
            for w in (a, b):
                w.setdefault('grammar', [])
                if 'continuous-tenses' not in w['grammar']:
                    w['grammar'].insert(0, 'continuous-tenses')
            if pb.kind == 'ki':
                import english as E
                from verbs import STEMS as _S
                en = _S[pb.stem]['en'].replace('{o}', E.OBJ.get(pb.om, '') if pb.om else '').split()
                ing = E.forms(en[0])[1] + (' ' + ' '.join(en[1:]) if len(en) > 1 else '')
                body = b['gloss'].split('" — ', 1)[1] if '" — ' in b['gloss'] else b['gloss']
                body = body.split(' After a past kuwa')[0]
                b['gloss'] = f'"…{ing}" — {body} Here, after {a["text"]}, -ki- means "…-ing": an ongoing action.'
    # clean
    for w in out:
        if not w.get('grammar'):
            w.pop('grammar', None)
        if not w.get('sanifu'):
            w.pop('sanifu', None)
        if not w.get('conjugation'):
            w.pop('conjugation', None)
    return out


# ---------------- distractors ----------------
SWAP = {'1s': '2s', '2s': '1s', '3s': '3p', '1p': '3p', '2p': '1p', '3p': '1p', 'it': 'itp', 'itp': 'it'}


def person_swap(line: str) -> str | None:
    for m in TOKEN.finditer(line):
        w = m.group(0)
        if w.lower() in LEX:
            e = LEX[w.lower()]
            if e.get('conjugation') and e['conjugation']['rows'] and any(r['form'] == w.lower() for r in e['conjugation']['rows']):
                rows = e['conjugation']['rows']
                idx = [r['form'] for r in rows].index(w.lower())
                alt = rows[(idx + 1) % min(len(rows), 6)]['form'] if idx < 6 else rows[(idx + 1) % len(rows)]['form']
                if alt != w.lower():
                    alt = alt.capitalize() if w[0].isupper() else alt
                    return line[:m.start()] + alt + line[m.end():]
            continue
        p = morph.best_parse(w)
        if not p or p.person not in SWAP or p.suffix:
            continue
        kind = 'present' if p.kind == 'contracted' else p.kind
        if kind not in ('present', 'past', 'perfect', 'future', 'negpresent', 'negpast', 'negperfect', 'negfuture', 'cond', 'subj', 'negsubj'):
            continue
        try:
            alt = morph.make_form(kind, SWAP[p.person], p.stem, p.om)
        except Exception:
            continue
        if alt == w.lower():
            continue
        alt = alt.capitalize() if w[0].isupper() else alt
        return line[:m.start()] + alt + line[m.end():]
    return None


# ---------------- parsing ----------------

def parse_file(path: Path):
    lessons = []
    cur = None
    section = None
    last_turn = None
    for raw in path.read_text().splitlines():
        line = raw.rstrip()
        if not line.strip() or line.strip().startswith('#'):
            continue
        s = line.strip()
        if s.startswith('@lesson'):
            cur = {'id': s.split()[1], 'turns': [], 'practice': [], 'vocab': [], 'gl': {}, 'grammar': [], 'src': path.name}
            lessons.append(cur)
            section = 'head'
            continue
        if s == '@practice':
            section = 'practice'
            continue
        if s == '@vocab':
            section = 'vocab'
            continue
        if section == 'head':
            if s.startswith(('>', '<')):
                role = 'auto' if s[0] == '>' else 'user'
                spk, rest = s[1:].split(':', 1)
                sw, en = [x.strip() for x in rest.split(' | ', 1)]
                last_turn = {'role': role, 'speaker': spk.strip(), 'swahili': sw, 'english': en, 'x': None, 's': None, 'g': {}}
                cur['turns'].append(last_turn)
                continue
            if s.startswith('x:'):
                last_turn['x'] = [x.strip() for x in s[2:].split(' ; ') if x.strip()]
                continue
            if s.startswith('s:'):
                last_turn['s'] = s[2:].strip()
                continue
            if s.startswith('g:'):
                k, v = s[2:].split('=', 1)
                last_turn['g'][k.strip().lower()] = v.strip()
                continue
            if s.startswith('gl:'):
                k, v = s[3:].split('=', 1)
                gr = []
                san = None
                if ' || ' in v:
                    v, san = v.split(' || ', 1)
                for tag in re.findall(r'#([a-z0-9\-]+)', v):
                    gr.append(tag)
                v = re.sub(r'\s*#[a-z0-9\-]+', '', v).strip()
                e = {'gloss': v, 'grammar': gr}
                if san:
                    e['sanifu'] = san.strip()
                cur['gl'][k.strip().lower()] = e
                continue
            k, v = s.split(':', 1)
            k = k.strip()
            v = v.strip()
            if k == 'grammar':
                cur['grammar'] = [x.strip() for x in v.split(',') if x.strip()]
            elif k == 'level':
                cur['level'] = int(v)
            else:
                cur[k] = v
            continue
        if section == 'practice':
            mode = {'t': 'translate', 'c': 'complete'}[s[0]]
            body = s[2:].strip()
            expl = None
            if ' || ' in body:
                body, expl = body.split(' || ', 1)
            en, sw = [x.strip() for x in body.split(' | ', 1)]
            m = re.search(r'\[([^\]]+)\]', sw)
            if not m:
                raise ValueError(f'{path.name}: practice line without [gap]: {s}')
            opts = [o.strip() for o in m.group(1).split('|')]
            cur['practice'].append({'mode': mode, 'english': en, 'before': sw[:m.start()], 'after': sw[m.end():],
                                    'options': opts, 'expl': expl})
            continue
        if section == 'vocab':
            parts = [p.strip() for p in s.split(' | ')]
            while len(parts) < 5:
                parts.append('')
            cur['vocab'].append(parts[:5])
    return lessons


def chip_feedback(text: str, local: dict) -> str | None:
    words = [m.group(0) for m in TOKEN.finditer(text)]
    if not words:
        return None
    hit = lookup(text, local) if len(words) > 1 else None
    if not hit and len(words) == 1:
        hit = analyze_word(words[0], local)
    if not hit:
        hits = [analyze_word(w, local) for w in words]
        if all(hits):
            return f'{text} = ' + ' + '.join(short_meaning(h['gloss']) for h in hits)
        return None
    return f'{text} = {short_meaning(hit["gloss"])}'


def build_lesson(L: dict, index: int):
    lid = L['id']
    level = L['level']
    local = L['gl']
    turns = []
    user_lines = [t['swahili'] for t in L['turns'] if t['role'] == 'user']
    grammar_seen: list[str] = []

    def note_grammar(gs):
        for g in gs or []:
            if g not in grammar_seen:
                grammar_seen.append(g)

    for n, t in enumerate(L['turns']):
        loc = dict(local)
        for k, v in t['g'].items():
            loc[k] = {'gloss': v, 'grammar': []}
        words = gloss_line(t['swahili'], loc, f'{lid} turn {n + 1}')
        for w in words:
            note_grammar(w.get('grammar'))
        turn = {'id': uid(lid, 'turn', n), 'speaker': t['speaker'], 'role': t['role'], 'swahili': t['swahili'],
                'english': t['english'], 'words': words}
        if t['s']:
            turn['sanifu'] = t['s']
        if t['role'] == 'user':
            wrong = list(t['x'] or [])
            if len(wrong) < 2:
                sw = person_swap(t['swahili'])
                if sw and sw not in wrong and sw != t['swahili']:
                    wrong.append(sw)
            if len(wrong) < 2:
                my = user_lines.index(t['swahili'])
                for cand in user_lines[my + 1:] + user_lines[:my][::-1]:
                    if cand != t['swahili'] and cand not in wrong:
                        wrong.append(cand)
                        break
            opts = [{'swahili': t['swahili'], 'correct': True}] + [{'swahili': w, 'correct': False} for w in wrong[:2]]
            turn['options'] = opts
        turns.append(turn)

    practice = []
    for n, p in enumerate(L['practice']):
        ok = p['options'][0]
        opts = [{'text': ok, 'correct': True}]
        for bad in p['options'][1:]:
            o = {'text': bad, 'correct': False}
            fb = chip_feedback(bad, local)
            if fb:
                o['feedback'] = fb
            opts.append(o)
        expl = p['expl']
        okw = [m.group(0) for m in TOKEN.finditer(ok)]
        info = (lookup(ok, local) if len(okw) > 1 else None) or (analyze_word(okw[0], local) if len(okw) == 1 else None)
        if not info and len(okw) > 1:
            hits = [analyze_word(w, local) for w in okw]
            if all(hits):
                expl_auto = ' · '.join(f'{w} = {short_meaning(h["gloss"])}' for w, h in zip(okw, hits))
                info = {'gloss': expl_auto, 'grammar': sorted({g for h in hits for g in (h.get('grammar') or [])})}
                if not expl:
                    expl = expl_auto + '.'
        if not expl:
            if info:
                g = info['gloss']
                expl = f'{ok}: {g}' if not g.startswith('"') else f'{ok} = {g}'
            else:
                expl = f'{ok}.'
                UNKNOWN.setdefault(ok.lower(), set()).add(f'{lid} practice {n + 1} (no auto explanation)')
        item = {'id': uid(lid, 'practice', n), 'mode': p['mode'], 'english': p['english'], 'before': p['before'],
                'after': p['after'], 'options': opts, 'explanation': expl}
        gr = list((info or {}).get('grammar') or [])
        if gr:
            item['grammar'] = gr
            note_grammar(gr)
        practice.append(item)

    vocab = []
    for n, (sw, en, ctx, san, note) in enumerate(L['vocab']):
        v = {'id': uid(lid, 'vocab', n), 'swahili': sw, 'english': en, 'exampleContext': ctx}
        if ' ' in sw.strip() or sw.endswith(('?', '!', '…')):
            v['partOfSpeech'] = 'phrase'
        elif sw.lower().startswith(('ku', 'kw')) and morph.best_parse(sw) and morph.best_parse(sw).kind in ('inf', 'neginf'):
            v['partOfSpeech'] = 'verb'
        if san:
            v['sanifu'] = san
        if note:
            v['sanifuNote'] = note
        vocab.append(v)

    focus = [g for g in L['grammar']]
    allg = focus + [g for g in grammar_seen if g not in focus]
    return {
        'id': lid,
        'uuid': uid(lid),
        'title': L['title'],
        'category': L['category'],
        'difficulty': LEVEL_DIFFICULTY[level],
        'level': level,
        'order': level * 100 + index,
        'theme': L.get('theme'),
        'culturalNote': L['culture'],
        'startingPoint': L['start'],
        'grammarFocus': focus,
        'grammar': allg,
        'turns': turns,
        'vocabulary': vocab,
        'practice': practice,
    }


def main():
    out_dir = Path(sys.argv[1])
    files = sorted((HERE / 'lessons').glob('*.txt'))
    all_lessons = []
    for f in files:
        all_lessons += parse_file(f)
    by_level: dict[int, list] = {}
    for L in all_lessons:
        by_level.setdefault(L['level'], []).append(L)
    built = []
    for lvl, ls in sorted(by_level.items()):
        start = int(ls[0].get('index', 1)) if ls else 1
        for i, L in enumerate(ls):
            idx = int(L.get('index', i + start))
            built.append(build_lesson(L, idx))
    out_dir.mkdir(parents=True, exist_ok=True)
    for b in built:
        (out_dir / f'{b["id"]}.json').write_text(json.dumps(b, ensure_ascii=False, indent=2) + '\n')
    print(f'compiled {len(built)} lessons')
    import nouns  # singular / plural for noun vocabulary (also covers the hand-authored lessons)
    print(f'{nouns.apply(out_dir)} vocabulary nouns have singular / plural forms')
    if UNKNOWN:
        print(f'{len(UNKNOWN)} unglossed words:')
        for w, ctx in sorted(UNKNOWN.items()):
            print(f'  {w}  <- {sorted(ctx)[0]}{" (+%d)" % (len(ctx) - 1) if len(ctx) > 1 else ""}')


if __name__ == '__main__':
    main()
