"""Swahili verb analyzer: splits an inflected verb into subject / tense / object / stem,
then produces an English gloss, a morpheme breakdown, grammar-explainer links and a
conjugation table.  Scope: the forms Kabisa teaches (m/wa + n/n subjects)."""
from __future__ import annotations

from dataclasses import dataclass, field

import english as E
from verbs import STEMS, infinitive

V = 'aeiou'

SP = {  # affirmative subject prefixes -> person
    'ni': '1s', 'u': '2s', 'a': '3s', 'tu': '1p', 'm': '2p', 'wa': '3p', 'i': 'it', 'zi': 'itp', 'ku': 'loc',
}
SP_ALLO = {'tw': '1p', 'mw': '2p', 'mu': '2p'}  # before vowels
NSP = {  # negative subject prefixes
    'si': '1s', 'hu': '2s', 'ha': '3s', 'hatu': '1p', 'ham': '2p', 'hamu': '2p', 'hawa': '3p',
    'hai': 'it', 'hazi': 'itp', 'haku': 'loc',
}
PERSON_SP = {'1s': 'ni', '2s': 'u', '3s': 'a', '1p': 'tu', '2p': 'm', '3p': 'wa', 'it': 'i', 'itp': 'zi', 'loc': 'ku'}
PERSON_NSP = {'1s': 'si', '2s': 'hu', '3s': 'ha', '1p': 'hatu', '2p': 'ham', '3p': 'hawa', 'it': 'hai', 'itp': 'hazi', 'loc': 'haku'}
PERSON_LABEL = {'1s': 'I', '2s': 'you', '3s': 'he/she', '1p': 'we', '2p': 'you all', '3p': 'they',
                'it': 'it (n/n)', 'itp': 'they (n/n)', 'loc': 'there/it (place)'}
OM = ['ni', 'ku', 'kw', 'm', 'mw', 'tu', 'tw', 'wa', 'i', 'zi', 'ji', 'u']

TAM = ['ngali', 'nge', 'na', 'li', 'me', 'ta', 'ki', 'ka']
TAM_LABEL = {
    'na': 'present', 'li': 'past', 'me': 'perfect (done / now-state)', 'ta': 'future',
    'nge': '"would"', 'ngali': '"would have"', 'ki': 'if / when · or "-ing" after kuwa',
    'ka': '"and then" (story sequence)',
}
TAM_TENSE = {'na': 'present', 'li': 'past', 'me': 'perfect', 'ta': 'future', 'nge': 'cond', 'ngali': 'condpast',
             'ki': 'simple', 'ka': 'past'}
REL = {'po': 'when / where', 'ye': 'who (m/wa singular)', 'o': 'who (m/wa plural)', 'yo': 'which (n/n singular)',
       'zo': 'which (n/n plural)', 'ko': 'where', 'vyo': 'how / the way'}

GRAMMAR_FOR = {
    'present': 'present-na', 'contracted': 'present-na', 'negpresent': 'negative-present', 'past': 'past-li',
    'negpast': 'negative-past', 'perfect': 'perfect-me', 'negperfect': 'perfect-negative-ja',
    'future': 'future-ta', 'negfuture': 'future-ta', 'cond': 'conditional-nge', 'negcond': 'conditional-nge',
    'condpast': 'conditional-nge', 'negcondpast': 'conditional-nge', 'ki': 'ki-po-ka', 'po': 'ki-po-ka',
    'ka': 'ki-po-ka', 'negki': 'ki-po-ka', 'habitual': 'habitual-hu-nga', 'rel': 'relatives', 'negrel': 'relatives',
    'subj': 'subjunctive', 'negsubj': 'subjunctive', 'imp': 'imperatives', 'impom': 'imperatives',
    'imppl': 'imperatives', 'inf': 'infinitive-ku', 'neginf': 'infinitive-ku',
}
EXT_LABEL = {'prep': 'prepositional (-ia/-ea: "for / to / at")', 'pass': 'passive (-wa: "be ...-ed")',
             'caus': 'causative (-isha/-esha/-za: "make / cause")', 'recip': 'reciprocal (-ana: "each other")',
             'stat': 'stative (-ika/-eka: "get / be ...-ed")'}


def _form(stem: str, mood: str) -> str:
    if stem.endswith('a'):
        return stem[:-1] + mood
    return stem


# form -> [(stem, mood)]
FORMS: dict[str, list[tuple[str, str]]] = {}
for _s in STEMS:
    for _m in 'aie':
        FORMS.setdefault(_form(_s, _m), []).append((_s, _m))
# Kenyan/Sanifu kw- variants of vowel stems used after tense markers
FORMS.setdefault('kwenda', []).append(('enda', 'a'))


def stem_matches(rest: str, mood: str, allow_om=True, mono_carrier=False):
    """Yield (om, stem) for rest = [om] + stem-in-mood. mono_carrier: allow ku+mono when no om."""
    out = []
    if mono_carrier and rest.startswith('ku'):
        for st, md in FORMS.get(rest[2:], []):
            if md == mood and STEMS[st].get('mono'):
                out.append((None, st))
    for st, md in FORMS.get(rest, []):
        if md == mood and not (mono_carrier and STEMS[st].get('mono')):
            out.append((None, st))
    if allow_om:
        for om in OM:
            if rest.startswith(om) and len(rest) > len(om):
                r = rest[len(om):]
                if om in ('mw', 'kw', 'tw') and r[0] not in V:
                    continue
                for st, md in FORMS.get(r, []):
                    if md == mood:
                        out.append((om, st))
    return out


@dataclass
class Parse:
    kind: str
    stem: str
    person: str | None = None
    om: str | None = None
    tam: str | None = None
    rel: str | None = None
    morphs: list = field(default_factory=list)  # [(piece, label)]
    suffix: str | None = None
    score: int = 0


def _sp_items():
    for k, v in SP.items():
        yield k, v
    for k, v in SP_ALLO.items():
        yield k, v


def parse_all(tok: str) -> list[Parse]:
    t = tok.lower()
    res: list[Parse] = []

    def add(p: Parse):
        p.score = len(p.morphs)
        res.append(p)

    def om_m(om):
        return [(om, f'object: {E.OBJ.get(om, om)}' if om != 'ji' else 'reflexive: -self')] if om else []

    # infinitive
    for pre, kind in (('kuto', 'neginf'), ('ku', 'inf'), ('kw', 'inf')):
        if t.startswith(pre):
            r = t[len(pre):]
            if pre == 'kw' and (not r or r[0] not in V):
                continue
            for om, st in stem_matches(r, 'a'):
                if pre == 'kw' and om:
                    continue
                add(Parse(kind, st, om=om, morphs=[(pre, 'infinitive "to"' if kind == 'inf' else 'not (infinitive)')] + om_m(om) + [(st, '')]))
            if pre == 'ku':
                for st, md in FORMS.get(r, []):
                    if md == 'a' and STEMS[st].get('mono'):
                        add(Parse('inf', st, morphs=[('ku', 'infinitive "to"'), (st, '')]))
    # imperatives
    for st, md in FORMS.get(t, []):
        if md == 'a' and not STEMS[st].get('mono'):
            add(Parse('imp', st, morphs=[(st, '')]))
    if t.endswith('eni'):
        for st, md in FORMS.get(t[:-2], []):
            if md == 'e':
                add(Parse('imppl', st, morphs=[(t[:-2], 'subjunctive -e'), ('ni', 'SUFFIX plural: to several people')]))
    for om in OM:
        if t.startswith(om):
            for st, md in FORMS.get(t[len(om):], []):
                if md == 'e' and '{o}' in STEMS[st]['en']:
                    add(Parse('impom', st, om=om, morphs=om_m(om) + [(t[len(om):], 'subjunctive -e: polite command')]))
    # affirmative subject prefix forms
    for sp, person in _sp_items():
        if not t.startswith(sp):
            continue
        r1 = t[len(sp):]
        if sp in SP_ALLO and (not r1 or r1[0] not in V):
            # tw/mw only directly before a vowel stem (subjunctive) — e.g. twende
            pass
        sp_m = [(sp, f'subject: {PERSON_LABEL[person]}')]
        for tam in TAM:
            if not r1.startswith(tam) or sp in SP_ALLO:
                continue
            r2 = r1[len(tam):]
            tam_m = [(tam, TAM_LABEL[tam])]
            if tam in ('ki',):
                for st, md in FORMS.get(r2, []):
                    if md == 'a' and STEMS[st].get('mono'):
                        add(Parse('ki', st, person=person, tam=tam, morphs=sp_m + tam_m + [(st, '')]))
            for om, st in stem_matches(r2, 'a', mono_carrier=True):
                kind = {'na': 'present', 'li': 'past', 'me': 'perfect', 'ta': 'future', 'nge': 'cond',
                        'ngali': 'condpast', 'ki': 'ki', 'ka': 'ka'}[tam]
                add(Parse(kind, st, person=person, om=om, tam=tam, morphs=sp_m + tam_m + om_m(om) + [(st, '')]))
            # relatives / po
            relbase = r2
            pre_rel = []
            if tam == 'ta' and r2.startswith('ka'):
                relbase = r2[2:]
                pre_rel = [('ka', '(future + relative)')]
            if tam in ('na', 'li', 'ta'):
                for rel in REL:
                    if relbase.startswith(rel):
                        r3 = relbase[len(rel):]
                        for om, st in stem_matches(r3, 'a', mono_carrier=True):
                            kind = 'po' if rel in ('po', 'ko', 'vyo') else 'rel'
                            add(Parse(kind, st, person=person, om=om, tam=tam, rel=rel,
                                      morphs=sp_m + tam_m + pre_rel + [(rel, REL[rel])] + om_m(om) + [(st, '')]))
        # negative forms built on the affirmative prefix: -si-
        if r1.startswith('si') and sp not in SP_ALLO:
            r2 = r1[2:]
            si_m = [('si', 'not')]
            for sub, kind in (('ngali', 'negcondpast'), ('nge', 'negcond'), ('po', 'negki')):
                if r2.startswith(sub):
                    for om, st in stem_matches(r2[len(sub):], 'a', mono_carrier=False):
                        add(Parse(kind, st, person=person, om=om, tam=sub,
                                  morphs=sp_m + si_m + [(sub, TAM_LABEL.get(sub, 'if / when'))] + om_m(om) + [(st, '')]))
            for rel in ('ye', 'o', 'yo', 'zo'):
                if r2.startswith(rel):
                    for om, st in stem_matches(r2[len(rel):], 'a'):
                        add(Parse('negrel', st, person=person, om=om, rel=rel,
                                  morphs=sp_m + si_m + [(rel, REL[rel])] + om_m(om) + [(st, '')]))
            for om, st in stem_matches(r2, 'e'):
                add(Parse('negsubj', st, person=person, om=om, morphs=sp_m + si_m + om_m(om) + [(r2[len(om or ''):], 'subjunctive -e')]))
        # subjunctive
        for om, st in stem_matches(r1, 'e'):
            if sp in ('mu',):
                continue
            if sp in SP_ALLO and om is None and r1[0] not in V:
                continue
            p = Parse('subj', st, person=person, om=om, morphs=sp_m + om_m(om) + [(r1[len(om or ''):], 'subjunctive -e')])
            add(p)
    # negative subject prefixes
    for nsp, person in NSP.items():
        if not t.startswith(nsp):
            continue
        r1 = t[len(nsp):]
        n_m = [(nsp, f'negative subject: not {PERSON_LABEL[person]}')]
        for om, st in stem_matches(r1, 'i'):
            add(Parse('negpresent', st, person=person, om=om, morphs=n_m + om_m(om) + [(r1[len(om or ''):], 'negative ends in -i')]))
        for sub, kind, lab in (('ku', 'negpast', 'past (negative)'), ('ja', 'negperfect', 'not yet'),
                               ('ta', 'negfuture', 'future'), ('nge', 'negcond', '"would"')):
            if r1.startswith(sub):
                r2 = r1[len(sub):]
                for om, st in stem_matches(r2, 'a', mono_carrier=(sub != 'ku')):
                    add(Parse(kind, st, person=person, om=om, morphs=n_m + [(sub, lab)] + om_m(om) + [(st, '')]))
                if sub == 'ja':  # sijala, hajaja
                    for st, md in FORMS.get(r2, []):
                        if md == 'a' and STEMS[st].get('mono'):
                            add(Parse(kind, st, person=person, morphs=n_m + [(sub, lab), (st, '')]))
                if sub == 'ku':  # Kenyan sikukula / sikuja
                    for st, md in FORMS.get(r2, []):
                        if md == 'a' and STEMS[st].get('mono'):
                            add(Parse(kind, st, person=person, morphs=n_m + [(sub, lab), (st, '')]))
                    if r2.startswith('ku'):
                        for st, md in FORMS.get(r2[2:], []):
                            if md == 'a' and STEMS[st].get('mono'):
                                add(Parse(kind, st, person=person, morphs=n_m + [(sub, lab), ('ku', ''), (st, '')]))
    # habitual hu-
    if t.startswith('hu'):
        for om, st in stem_matches(t[2:], 'a', mono_carrier=True):
            add(Parse('habitual', st, om=om, morphs=[('hu', 'habitual: usually / regularly')] + om_m(om) + [(st, '')]))
    # Kenyan contracted 1sg present: naenda, nataka, nakupenda
    if t.startswith('na') and len(t) > 3:
        for om, st in stem_matches(t[2:], 'a', mono_carrier=True):
            add(Parse('contracted', st, person='1s', om=om, tam='na',
                      morphs=[('na', 'short for nina-: I + present')] + om_m(om) + [(st, '')]))
    return res


def best_parse(tok: str) -> Parse | None:
    t = tok.lower()
    ps = parse_all(t)
    if not ps and len(t) > 5 and t.endswith('nga'):
        ps = [p for p in parse_all(t[:-3])]
        for p in ps:
            p.suffix = 'nga'
    if not ps and len(t) > 5 and t.endswith('ngi'):
        ps = []
        for nsp, person in NSP.items():
            if t.startswith(nsp):
                r1 = t[len(nsp):-3]
                for om, st in stem_matches(r1, 'a'):
                    ps.append(Parse('negpresent', st, person=person, om=om,
                                    morphs=[(nsp, f'not {PERSON_LABEL[person]}')] + ([(om, 'object')] if om else []) + [(st, '')],
                                    suffix='nga'))
    if not ps and len(t) > 4 and t.endswith('je'):
        ps = parse_all(t[:-2])
        for p in ps:
            p.suffix = 'je'
    if not ps:
        return None

    def rank(p: Parse):
        en = STEMS[p.stem]['en']
        pen = len(p.morphs) * 10
        if p.om and p.kind not in ('impom',):
            pen += 3
        if p.kind == 'impom':
            pen -= 2
        if p.kind == 'subj' and '{o}' in en and p.om is None and p.person == '1s' and len(t) < 7:
            pen += 15  # "nipe" is give-me, not "that I give"
        if p.kind == 'imp':
            pen -= 5
        if STEMS[p.stem].get('mono') and '{o}' in en and p.om is None and ('ku' + p.stem) in t:
            pen += 25
        if p.kind in ('inf', 'neginf'):
            pen -= 4
        if p.kind == 'contracted':
            pen += 4
        if p.kind == 'habitual':
            pen += 2
        if p.kind == 'subj' and p.person == '2p' and not t.startswith('mw'):
            pen += 6
        if p.kind in ('negpresent',) and p.person == '2s':
            pen += 1
        return pen
    ps.sort(key=rank)
    return ps[0]


def _clean(s: str) -> str:
    return ' '.join(s.split())


def english_of(p: Parse) -> str:
    v = STEMS[p.stem]
    vp = v['en']
    st = bool(v.get('s'))
    obj = E.OBJ.get(p.om) if p.om else None
    k = p.kind
    person = p.person
    if k == 'perfect' and v.get('me') and not p.om and not p.suffix:
        return _clean(E.conj(person, 'simple', False, v['me'], None))
    if k == 'negperfect' and v.get('me') and not p.om:
        return _clean(E.conj(person, 'simple', True, v['me'], None) + ' yet')
    if k in ('present', 'contracted'):
        out = E.conj(person, 'present', False, vp, obj, st)
    elif k == 'negpresent':
        out = E.conj(person, 'present', True, vp, obj, st)
    elif k == 'past':
        out = E.conj(person, 'past', False, vp, obj)
    elif k == 'negpast':
        out = E.conj(person, 'past', True, vp, obj)
    elif k == 'perfect':
        out = E.conj(person, 'perfect', False, vp, obj)
    elif k == 'negperfect':
        out = E.conj(person, 'perfect', True, vp, obj)
    elif k == 'future':
        out = E.conj(person, 'future', False, vp, obj)
    elif k == 'negfuture':
        out = E.conj(person, 'future', True, vp, obj)
    elif k == 'cond':
        out = E.conj(person, 'cond', False, vp, obj)
    elif k == 'negcond':
        out = E.conj(person, 'cond', True, vp, obj)
    elif k == 'condpast':
        out = E.conj(person, 'condpast', False, vp, obj)
    elif k == 'negcondpast':
        out = E.conj(person, 'condpast', True, vp, obj)
    elif k == 'ki':
        out = 'if/when ' + E.conj(person, 'simple', False, vp, obj)
    elif k == 'negki':
        out = 'if ' + E.conj(person, 'simple', True, vp, obj)
    elif k == 'ka':
        out = 'and then ' + E.conj(person, 'past', False, vp, obj)
    elif k == 'po':
        tense = {'na': 'simple', 'li': 'past', 'ta': 'simple'}.get(p.tam, 'simple')
        word = {'po': 'when', 'ko': 'where', 'vyo': 'how'}[p.rel]
        out = f'{word} ' + E.conj(person, tense, False, vp, obj)
    elif k == 'rel' and (p.rel in ('yo', 'zo', 'cho', 'vyo') or person in ('1s', '2s', '1p', '2p')) and person not in ('it', 'itp'):
        tense = {'na': 'simple', 'li': 'past', 'ta': 'future'}.get(p.tam, 'simple')
        out = '(the one) which / whom ' + E.conj(person, tense, False, vp, obj)
    elif k == 'rel':
        tense = {'na': 'simple', 'li': 'past', 'ta': 'future'}.get(p.tam, 'simple')
        clause = E.conj(person, tense, False, vp, obj)
        clause = clause.split(' ', 1)[1] if ' ' in clause else clause
        if person in ('1s', '2s', '1p', '2p'):
            clause = E.conj('3s' if person in ('1s', '2s') else '3p', tense, False, vp, obj).split(' ', 1)[1]
        who = 'who' if person in ('1s', '2s', '3s', '1p', '2p', '3p') else 'which'
        out = f'(the one) {who} {clause}' if person in ('3s', '1s', '2s', 'it') else f'(the ones) {who} {clause}'
    elif k == 'negrel':
        clause = E.conj('3s' if person in ('1s', '2s', '3s', 'it') else '3p', 'simple', True, vp, obj)
        clause = clause.split(' ', 1)[1]
        out = f'(the one/ones) who {clause}'
    elif k == 'subj':
        out = E.conj(person, 'subj', False, vp, obj)
    elif k == 'negsubj':
        out = E.conj(person, 'subj', True, vp, obj)
    elif k == 'imp':
        out = E.conj(None, 'imp', False, vp, None)
    elif k == 'imppl':
        out = E.conj(None, 'imp', False, vp, None) + ' (you all)'
    elif k == 'impom':
        out = E.conj(None, 'imp', False, vp, obj)
    elif k == 'inf':
        out = E.conj(None, 'inf', False, vp, obj)
    elif k == 'neginf':
        out = E.conj(None, 'inf', True, vp, obj)
    elif k == 'habitual':
        out = 'usually ' + E.conj('1p', 'simple', False, vp, obj).split(' ', 1)[1] + ' (habit, any person)'
    else:
        out = vp
    if p.suffix == 'nga' and k in ('present', 'contracted', 'negpresent'):
        out = E.conj(person, 'simple', k == 'negpresent', vp, obj)
        out = out.replace("don't ", "don't usually ").replace("doesn't ", "doesn't usually ") if k == 'negpresent' else out + ' (regularly)'
    elif p.suffix == 'nga':
        out += ' (regularly)'
    if p.suffix == 'je':
        S = E.SUBJ.get(person, '')
        verb, rest = E._split(vp)
        rest = E.place_obj(rest, obj)
        if k == 'past' and verb == 'be':
            out = f'how {E._be_past(person)} {S}{rest}?'
        elif k == 'past':
            out = f'how did {S} {verb}{rest}?'
        elif k in ('present', 'contracted'):
            out = f'how {E._be_pres(person)} {S} {E.forms(verb)[1]}{rest}?'
        elif k == 'perfect':
            out = f"how {'has' if person in ('3s', 'it') else 'have'} {S} {E.forms(verb)[3]}{rest}?"
        elif k == 'future':
            out = f'how will {S} {verb}{rest}?'
        else:
            out = 'how: ' + out + '?'
    return _clean(out.replace('{o}', ''))


# ---------------- conjugation tables ----------------

def _subj_join(sp: str, rest: str) -> str:
    if rest and rest[0] in V:
        if sp == 'tu':
            return 'tw' + rest
        if sp == 'm':
            return 'mw' + rest
    return sp + rest


def _om_join(om: str | None, rest: str) -> str:
    if not om:
        return rest
    if om == 'm' and rest[0] in V:
        return 'mw' + rest
    return om + rest


def make_form(kind: str, person: str, stem: str, om: str | None) -> str:
    mono = bool(STEMS[stem].get('mono'))
    a = _form(stem, 'a')
    i = _form(stem, 'i')
    e = _form(stem, 'e')
    car = 'ku' if mono and not om else ''
    sp = PERSON_SP[person]
    nsp = PERSON_NSP[person]
    if kind in ('present', 'past', 'perfect', 'future', 'cond', 'condpast'):
        tam = {'present': 'na', 'past': 'li', 'perfect': 'me', 'future': 'ta', 'cond': 'nge', 'condpast': 'ngali'}[kind]
        return sp + tam + _om_join(om, car + a) if not om else sp + tam + _om_join(om, a)
    if kind == 'negpresent':
        if nsp == 'ham' and (om or i)[0] in V:
            nsp = 'hamu'
        return nsp + _om_join(om, i)
    if kind == 'negpast':
        return nsp + 'ku' + _om_join(om, a)
    if kind == 'negperfect':
        return nsp + 'ja' + _om_join(om, car + a) if not om else nsp + 'ja' + _om_join(om, a)
    if kind == 'negfuture':
        return nsp + 'ta' + _om_join(om, car + a) if not om else nsp + 'ta' + _om_join(om, a)
    if kind == 'negcond':
        return sp + 'singe' + _om_join(om, a)
    if kind == 'subj':
        return _subj_join(sp, _om_join(om, e)) if om is None else sp + _om_join(om, e)
    if kind == 'negsubj':
        return sp + 'si' + _om_join(om, e)
    raise ValueError(kind)


TABLE_KINDS = {
    'present': 'Present (-na-)', 'contracted': 'Present (-na-)', 'negpresent': 'Present, negative',
    'past': 'Past (-li-)', 'negpast': 'Past, negative (-ku-)', 'perfect': 'Perfect (-me-)',
    'negperfect': 'Not yet (-ja-)', 'future': 'Future (-ta-)', 'negfuture': 'Future, negative',
    'cond': 'Conditional (-nge-)', 'negcond': 'Conditional, negative', 'subj': 'Subjunctive (-e)',
    'negsubj': 'Subjunctive, negative (-si- … -e)',
}


def table_for(p: Parse, surface: str):
    if p.kind not in TABLE_KINDS or p.suffix:
        return None
    kind = 'present' if p.kind == 'contracted' else p.kind
    persons = ['1s', '2s', '3s', '1p', '2p', '3p']
    if p.person in ('it', 'itp'):
        persons += ['it', 'itp']
    rows = []
    for per in persons:
        f = make_form(kind, per, p.stem, p.om)
        if p.kind == 'contracted' and per == '1s':
            f = surface.lower()
        rows.append({'pronoun': PERSON_LABEL[per], 'form': f})
    obj = f' + object -{p.om}-' if p.om else ''
    return {'verb': f'{infinitive(p.stem)} (to {" ".join(STEMS[p.stem]["en"].replace("{o}", "").split())})',
            'tense': TABLE_KINDS[p.kind] + obj, 'rows': rows}


def gloss_for(tok: str):
    """Return dict(gloss, grammar[], conjugation?) or None."""
    p = best_parse(tok)
    if not p:
        return None
    v = STEMS[p.stem]
    meaning = english_of(p)
    pieces = []
    for piece, lab in p.morphs:
        if lab.startswith('SUFFIX'):
            pieces.append(f'-{piece} ({lab[7:]})')
            continue
        if piece == p.stem or lab == '' or lab.startswith('subjunctive') or lab.startswith('negative ends'):
            if piece == p.stem or lab:
                pieces.append(f'-{piece} ({" ".join(v["en"].replace("{o}", "").split())}{", " + lab if lab else ""})')
            else:
                pieces.append(f'-{piece}')
        else:
            pieces.append(f'{piece}- ({lab})')
    breakdown = ' + '.join(pieces)
    if p.suffix == 'nga':
        breakdown += ' + -nga (Kenyan habitual)'
    if p.suffix == 'je':
        breakdown += ' + -je (how?)'
    gl = f'"{meaning[0].upper() + meaning[1:]}" — {breakdown}. From {infinitive(p.stem)}.'
    grammar = []
    g = GRAMMAR_FOR.get(p.kind)
    if g:
        grammar.append(g)
    if p.om:
        grammar.append('object-infixes')
    if v.get('ext'):
        grammar.append('verb-extensions')
        gl += f' Extension: {EXT_LABEL[v["ext"]]}.'
    if p.stem == 'wahi':
        grammar.append('wahi-ever-never')
    if p.stem in ('weza', 'bidi'):
        grammar.append('helper-verbs')
    if p.suffix == 'nga' and 'habitual-hu-nga' not in grammar:
        grammar.append('habitual-hu-nga')
    if p.suffix == 'je':
        grammar.append('question-words')
    if p.kind == 'ki':
        gl += ' After a past kuwa (nilikuwa …) the -ki- form means "…-ing".'
    if p.kind == 'present' and p.person in ('1s',):
        gl += ' Colloquially often shortened: ni-na- → na-.'
    out = {'gloss': gl, 'grammar': grammar}
    t = table_for(p, tok)
    if t:
        out['conjugation'] = t
    return out


if __name__ == '__main__':
    import sys
    for w in sys.argv[1:]:
        p = best_parse(w)
        print(w, '->', p and (p.kind, p.person, p.om, p.stem), '|', gloss_for(w) and gloss_for(w)['gloss'])
