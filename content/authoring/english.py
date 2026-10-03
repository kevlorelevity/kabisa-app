"""Tiny English verb conjugator used to turn Swahili verb analyses into readable glosses."""

IRREG = {
    # base: (3sg, ing, past, pp)
    'be': ('is', 'being', 'was', 'been'),
    'have': ('has', 'having', 'had', 'had'),
    'do': ('does', 'doing', 'did', 'done'),
    'go': ('goes', 'going', 'went', 'gone'),
    'come': ('comes', 'coming', 'came', 'come'),
    'get': ('gets', 'getting', 'got', 'got'),
    'see': ('sees', 'seeing', 'saw', 'seen'),
    'eat': ('eats', 'eating', 'ate', 'eaten'),
    'drink': ('drinks', 'drinking', 'drank', 'drunk'),
    'give': ('gives', 'giving', 'gave', 'given'),
    'take': ('takes', 'taking', 'took', 'taken'),
    'make': ('makes', 'making', 'made', 'made'),
    'know': ('knows', 'knowing', 'knew', 'known'),
    'say': ('says', 'saying', 'said', 'said'),
    'tell': ('tells', 'telling', 'told', 'told'),
    'buy': ('buys', 'buying', 'bought', 'bought'),
    'sell': ('sells', 'selling', 'sold', 'sold'),
    'bring': ('brings', 'bringing', 'brought', 'brought'),
    'think': ('thinks', 'thinking', 'thought', 'thought'),
    'find': ('finds', 'finding', 'found', 'found'),
    'leave': ('leaves', 'leaving', 'left', 'left'),
    'pay': ('pays', 'paying', 'paid', 'paid'),
    'put': ('puts', 'putting', 'put', 'put'),
    'run': ('runs', 'running', 'ran', 'run'),
    'sit': ('sits', 'sitting', 'sat', 'sat'),
    'stand': ('stands', 'standing', 'stood', 'stood'),
    'stop': ('stops', 'stopping', 'stopped', 'stopped'),
    'shop': ('shops', 'shopping', 'shopped', 'shopped'),
    'plan': ('plans', 'planning', 'planned', 'planned'),
    'cut': ('cuts', 'cutting', 'cut', 'cut'),
    'hit': ('hits', 'hitting', 'hit', 'hit'),
    'begin': ('begins', 'beginning', 'began', 'begun'),
    'swim': ('swims', 'swimming', 'swam', 'swum'),
    'write': ('writes', 'writing', 'wrote', 'written'),
    'read': ('reads', 'reading', 'read', 'read'),
    'speak': ('speaks', 'speaking', 'spoke', 'spoken'),
    'sleep': ('sleeps', 'sleeping', 'slept', 'slept'),
    'wake': ('wakes', 'waking', 'woke', 'woken'),
    'drive': ('drives', 'driving', 'drove', 'driven'),
    'ride': ('rides', 'riding', 'rode', 'ridden'),
    'meet': ('meets', 'meeting', 'met', 'met'),
    'lose': ('loses', 'losing', 'lost', 'lost'),
    'fall': ('falls', 'falling', 'fell', 'fallen'),
    'feel': ('feels', 'feeling', 'felt', 'felt'),
    'hear': ('hears', 'hearing', 'heard', 'heard'),
    'understand': ('understands', 'understanding', 'understood', 'understood'),
    'forget': ('forgets', 'forgetting', 'forgot', 'forgotten'),
    'win': ('wins', 'winning', 'won', 'won'),
    'send': ('sends', 'sending', 'sent', 'sent'),
    'spend': ('spends', 'spending', 'spent', 'spent'),
    'build': ('builds', 'building', 'built', 'built'),
    'break': ('breaks', 'breaking', 'broke', 'broken'),
    'choose': ('chooses', 'choosing', 'chose', 'chosen'),
    'grow': ('grows', 'growing', 'grew', 'grown'),
    'wear': ('wears', 'wearing', 'wore', 'worn'),
    'teach': ('teaches', 'teaching', 'taught', 'taught'),
    'catch': ('catches', 'catching', 'caught', 'caught'),
    'fight': ('fights', 'fighting', 'fought', 'fought'),
    'lie': ('lies', 'lying', 'lay', 'lain'),
    'die': ('dies', 'dying', 'died', 'died'),
    'set': ('sets', 'setting', 'set', 'set'),
    'let': ('lets', 'letting', 'let', 'let'),
    'show': ('shows', 'showing', 'showed', 'shown'),
    'fly': ('flies', 'flying', 'flew', 'flown'),
    'hold': ('holds', 'holding', 'held', 'held'),
    'keep': ('keeps', 'keeping', 'kept', 'kept'),
    'hang': ('hangs', 'hanging', 'hung', 'hung'),
    'shut': ('shuts', 'shutting', 'shut', 'shut'),
    'can': ('can', 'being able', 'could', 'been able'),
    'fit': ('fits', 'fitting', 'fitted', 'fitted'),
    'dig': ('digs', 'digging', 'dug', 'dug'),
    'beat': ('beats', 'beating', 'beat', 'beaten'),
    'bite': ('bites', 'biting', 'bit', 'bitten'),
    'hide': ('hides', 'hiding', 'hid', 'hidden'),
    'mean': ('means', 'meaning', 'meant', 'meant'),
    'lend': ('lends', 'lending', 'lent', 'lent'),
    'shine': ('shines', 'shining', 'shone', 'shone'),
    'sew': ('sews', 'sewing', 'sewed', 'sewn'),
    'sweep': ('sweeps', 'sweeping', 'swept', 'swept'),
    'throw': ('throws', 'throwing', 'threw', 'thrown'),
    'forgive': ('forgives', 'forgiving', 'forgave', 'forgiven'),
    'feed': ('feeds', 'feeding', 'fed', 'fed'),
    'rise': ('rises', 'rising', 'rose', 'risen'),
    'sing': ('sings', 'singing', 'sang', 'sung'),
    'tear': ('tears', 'tearing', 'tore', 'torn'),
    'steal': ('steals', 'stealing', 'stole', 'stolen'),
    'shake': ('shakes', 'shaking', 'shook', 'shaken'),
    'freeze': ('freezes', 'freezing', 'froze', 'frozen'),
    'fry': ('fries', 'frying', 'fried', 'fried'),
    'try': ('tries', 'trying', 'tried', 'tried'),
    'cry': ('cries', 'crying', 'cried', 'cried'),
    'dry': ('dries', 'drying', 'dried', 'dried'),
    'rent': ('rents', 'renting', 'rented', 'rented'),
    'undergo': ('undergoes', 'undergoing', 'underwent', 'undergone'),
    'equalise': ('equalises', 'equalising', 'equalised', 'equalised'),
}


def forms(base: str):
    if base in IRREG:
        return IRREG[base]
    if base.endswith(('s', 'sh', 'ch', 'x', 'z', 'o')):
        s3 = base + 'es'
    elif base.endswith('y') and base[-2] not in 'aeiou':
        s3 = base[:-1] + 'ies'
    else:
        s3 = base + 's'
    if base.endswith('ie'):
        ing = base[:-2] + 'ying'
    elif base.endswith('e') and not base.endswith(('ee', 'ye', 'oe')):
        ing = base[:-1] + 'ing'
    else:
        ing = base + 'ing'
    if base.endswith('e'):
        past = base + 'd'
    elif base.endswith('y') and base[-2] not in 'aeiou':
        past = base[:-1] + 'ied'
    else:
        past = base + 'ed'
    return (s3, ing, past, past)


SUBJ = {
    '1s': 'I', '2s': 'you', '3s': 'he/she', '1p': 'we', '2p': 'you all', '3p': 'they',
    'it': 'it', 'itp': 'they', 'loc': 'there',
}
OBJ = {
    'ni': 'me', 'ku': 'you', 'kw': 'you', 'm': 'him/her', 'mw': 'him/her', 'mu': 'him/her',
    'tu': 'us', 'tw': 'us', 'wa': 'them / you all', 'i': 'it', 'zi': 'them (things)',
    'ji': 'REFL', 'ki': 'it', 'vi': 'them (things)', 'li': 'it', 'u': 'it', 'ya': 'them (things)',
}
REFL = {'1s': 'myself', '2s': 'yourself', '3s': 'himself/herself', '1p': 'ourselves',
        '2p': 'yourselves', '3p': 'themselves', 'it': 'itself', 'itp': 'themselves', None: 'oneself'}


def _is3(p):
    return p in ('3s', 'it')


def _be_pres(p):
    return {'1s': 'am'}.get(p, 'is' if _is3(p) else 'are')


def _be_past(p):
    return 'was' if p in ('1s', '3s', 'it') else 'were'


def _split(vp):
    parts = vp.split(' ', 1)
    return parts[0], (' ' + parts[1]) if len(parts) > 1 else ''


def place_obj(rest: str, obj: str | None) -> str:
    if '{o}' in rest:
        return rest.replace('{o}', obj or '').replace('  ', ' ').rstrip()
    if obj:
        return rest + ' ' + obj
    return rest


def conj(person, tense, neg, vp, obj=None, stative=False):
    """Return an English clause like 'I am going', 'you didn't see him'."""
    if obj == 'REFL':
        obj = REFL.get(person, 'oneself')
    verb, rest = _split(vp)
    rest = place_obj(rest, obj)
    s3, ing, past, pp = forms(verb)
    S = SUBJ.get(person, '')
    is_be = verb == 'be'
    if tense == 'present':
        if is_be:
            v = _be_pres(person) + (' not' if neg else '')
            return f'{S} {v}{rest}'
        if stative or verb in ('have', 'can'):
            if verb == 'can':
                return f"{S} {'cannot' if neg else 'can'}{rest}"
            if neg:
                return f"{S} {'doesn' if _is3(person) else 'don'}'t {verb}{rest}"
            return f'{S} {s3 if _is3(person) else verb}{rest}'
        return f"{S} {_be_pres(person)}{' not' if neg else ''} {ing}{rest}"
    if tense == 'simple':
        if is_be:
            return f"{S} {_be_pres(person)}{' not' if neg else ''}{rest}"
        if neg:
            return f"{S} {'doesn' if _is3(person) else 'don'}'t {verb}{rest}"
        return f'{S} {s3 if _is3(person) else verb}{rest}'
    if tense == 'past':
        if is_be:
            return f"{S} {_be_past(person)}{'n' + chr(39) + 't' if neg else ''}{rest}"
        if verb == 'can':
            return f"{S} {'couldn' + chr(39) + 't' if neg else 'could'}{rest}"
        if neg:
            return f"{S} didn't {verb}{rest}"
        return f'{S} {past}{rest}'
    if tense == 'perfect':
        h = 'has' if _is3(person) else 'have'
        if verb == 'can':
            return f"{S} {h}{'n' + chr(39) + 't' if neg else ''} been able{rest}"
        if neg:
            return f"{S} {h}n't {pp}{rest} yet"
        return f'{S} {h} {pp}{rest}'
    if tense == 'future':
        v = 'be able' if verb == 'can' else verb
        return f"{S} {'won' + chr(39) + 't' if neg else 'will'} {v}{rest}"
    if tense == 'cond':
        v = 'be able' if verb == 'can' else verb
        return f"{S} {'wouldn' + chr(39) + 't' if neg else 'would'} {v}{rest}"
    if tense == 'condpast':
        v = 'been able' if verb == 'can' else pp
        return f"{S} {'wouldn' + chr(39) + 't' if neg else 'would'} have {v}{rest}"
    if tense == 'subj':
        v = 'be able' if verb == 'can' else verb
        if person == '1s':
            return f"let me {'not ' if neg else ''}{v}{rest} / should I {'not ' if neg else ''}{v}{rest}?"
        if person == '1p':
            return f"let's {'not ' if neg else ''}{v}{rest}"
        if person == '2s' and neg:
            return f"don't {v}{rest}"
        if person == '2s':
            return f"(please) {v}{rest}"
        return f"{S} should{'n' + chr(39) + 't' if neg else ''} {v}{rest}"
    if tense == 'imp':
        v = 'be able' if verb == 'can' else verb
        return f"{'don' + chr(39) + 't ' if neg else ''}{v}{rest}!"
    if tense == 'inf':
        v = 'be able' if verb == 'can' else verb
        return f"{'not ' if neg else ''}to {v}{rest}"
    if tense == 'ing':
        return f'{ing}{rest}'
    if tense == 'pp':
        return f'{pp}{rest}'
    raise ValueError(tense)
