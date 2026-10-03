"""Add level / theme / grammar links to the two hand-authored Uber lessons (Level 1, lessons 1–2)."""
import json
import sys
from pathlib import Path

import morph
from compile import analyze_word

META = {
    'uber-nairobi': {'level': 1, 'order': 101, 'theme': 'uber', 'grammarFocus': ['kenyan-vs-sanifu', 'present-na', 'subject-prefixes', 'ko-location', 'question-words']},
    'uber-nairobi-2': {'level': 1, 'order': 102, 'theme': 'uber', 'grammarFocus': ['present-na', 'possessives', 'ni-copula', 'question-words']},
}

for path in sys.argv[1:]:
    p = Path(path)
    d = json.loads(p.read_text())
    meta = META[d['id']]
    d.update({k: v for k, v in meta.items()})
    seen = list(meta['grammarFocus'])
    for t in d['turns']:
        for w in t['words']:
            hit = analyze_word(w['text'], {}) if ' ' not in w['text'] else None
            if hit is None and ' ' in w['text']:
                from compile import lookup
                hit = lookup(w['text'], {})
            gr = (hit or {}).get('grammar') or []
            if hit and hit.get('sanifu') and 'sanifu' not in w:
                w['sanifu'] = hit['sanifu']
            if gr:
                w['grammar'] = gr
                for g in gr:
                    if g not in seen:
                        seen.append(g)
    for item in d.get('practice', []):
        ok = next(o['text'] for o in item['options'] if o['correct'])
        hit = analyze_word(ok, {}) if ' ' not in ok.strip() else None
        if hit and hit.get('grammar'):
            item['grammar'] = hit['grammar']
            for g in hit['grammar']:
                if g not in seen:
                    seen.append(g)
    d['grammar'] = seen
    # keep key order tidy
    order = ['id', 'uuid', 'title', 'category', 'difficulty', 'level', 'order', 'theme', 'culturalNote', 'startingPoint',
             'grammarFocus', 'grammar', 'turns', 'vocabulary', 'practice']
    d = {k: d[k] for k in order if k in d} | {k: v for k, v in d.items() if k not in order}
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
    print(p.name, d['grammar'])
