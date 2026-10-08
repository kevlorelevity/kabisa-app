"""Singular / plural of every noun that appears as key vocabulary.

NOUNS[headword_lowercase] = (singular, plural)
  - same word for one & many (n/n):  ('nyumba', 'nyumba')
  - no plural (uncountable):          ('chumvi', None)
  - plural only:                      (None, 'mafuta')
Phrases follow Kenyan agreement (kiti ya mbele → viti za mbele).

Run on its own to add `nounForms` to every content/lessons/*.json (compile.py
also does it after compiling):   python3 content/authoring/nouns.py content/lessons
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SAME = object()

_RAW: list[tuple[str, object]] = [
    # people
    ('afande', 'maafande'), ('dada / kaka', SAME), ('kaka / dada', SAME), ('fundi', 'mafundi'),
    ('fundi wa maji', 'mafundi wa maji'), ('kinyozi', 'vinyozi'), ('kiongozi', 'viongozi'), ('makanga', SAME),
    ('mekanika', SAME), ('mfanyabiashara', 'wafanyabiashara'), ('mfanyakazi / wafanyakazi', 'mfanyakazi / wafanyakazi'),
    ('mfanyikazi mpya', 'wafanyikazi wapya'), ('mfugaji / wafugaji', 'mfugaji / wafugaji'), ('mgeni rasmi', 'wageni rasmi'),
    ('mheshimiwa', 'waheshimiwa'), ('mkenya / wakenya', 'Mkenya / Wakenya'), ('mtalii / watalii', 'mtalii / watalii'),
    ('mteja / wateja', 'mteja / wateja'), ('mwalimu / walimu', 'mwalimu / walimu'), ('mwalimu mkuu', 'walimu wakuu'),
    ('mwanafunzi / wanafunzi', 'mwanafunzi / wanafunzi'), ('mwenye nyumba', 'wenye nyumba'), ('mzee / wazee', 'mzee / wazee'),
    ('rafiki wa kweli', 'marafiki wa kweli'), ('refa', 'marefa'), ('shemeji', 'mashemeji'),
    # animals (Kenyans: same word for one & many)
    ('chui', SAME), ('kiboko', 'viboko'), ('mbwa', SAME), ("ng'ombe", SAME), ('nyumbu', SAME), ('pundamilia', SAME),
    ('simba', SAME), ('tembo', SAME), ('twiga', SAME), ('ndege', SAME),
    # body
    ('jicho / macho', 'jicho / macho'), ('kichwa', 'vichwa'), ('mguu / miguu', 'mguu / miguu'),
    ('mkono / mikono', 'mkono / mikono'), ('mwili', 'miili'), ('tumbo', 'matumbo'),
    # things & places
    ('barua pepe', SAME), ('bustani', SAME), ('chapati', SAME), ('chemist', 'machemist'), ('chuo kikuu', 'vyuo vikuu'),
    ('daraja', 'madaraja'), ('darasa', 'madarasa'), ('jembe', 'majembe'), ('kalamu', SAME), ('kampuni', SAME),
    ('karakana', SAME), ('kikapu / vikapu', 'kikapu / vikapu'), ('kilima', 'vilima'), ('kioo', 'vioo'),
    ('kitabu / vitabu', 'kitabu / vitabu'), ('kiti ya mbele', 'viti za mbele'), ('kivuli', 'vivuli'), ('kivutio', 'vivutio'),
    ('kliniki', SAME), ('koti', 'makoti'), ('leseni ya kuendesha', 'leseni za kuendesha'), ('mahema', 'hema / mahema'),
    ('maua', 'ua / maua'), ('magugu', 'gugu / magugu'), ('maharagwe', 'haragwe / maharagwe'),
    ('mbuga ya wanyama', 'mbuga za wanyama'), ('menyu', SAME), ('msimu', 'misimu'),
    ('msumari / misumari', 'msumari / misumari'), ('msumeno', 'misumeno'), ('mti / miti', 'mti / miti'),
    ('mtihani', 'mitihani'), ('mto', 'mito'), ('mvua', SAME), ('mwaka', 'miaka'), ('mwavuli', 'miavuli'), ('mwiko', 'miiko'),
    ('njia', SAME), ('njia ya mkato', 'njia za mkato'), ('nguo', SAME), ('nyanya', SAME), ('nyasi', SAME), ('nyundo', SAME),
    ('ofisi', SAME), ('pasipoti / viza / tiketi', SAME), ('rangi', SAME), ('risiti', SAME), ('sabuni', SAME), ('saizi', SAME),
    ('sakafu', SAME), ('sare', SAME), ('shamba', 'mashamba'), ('shati', 'mashati'), ('shule', SAME),
    ('somo / masomo', 'somo / masomo'), ('sufuria', SAME), ('suruali', SAME), ('taa za barabarani', 'taa ya barabarani / taa za barabarani'),
    ('viatu', 'kiatu / viatu'), ('vitunguu', 'kitunguu / vitunguu'), ('vyombo', 'chombo / vyombo'), ('uamuzi', 'maamuzi'),
    ('upepo', 'pepo'),
    # ideas, work, money
    ('biashara', SAME), ('bima', SAME), ('changamoto', SAME), ('familia', SAME), ('hatari', SAME), ('karo', SAME),
    ('kazi', SAME), ('kazi ya muda', 'kazi za muda'), ('kodi', SAME), ('mandhari', SAME), ('pwani', SAME), ('serikali', SAME),
    # no plural
    ('anga', None), ('chumvi', None), ('hali ya hewa', None), ('homa', None), ('jua', None), ('kiangazi', None),
    ('kimya', None), ('stima', None), ('tao', None), ('ukaguzi', None), ('ukame', None), ('unga ya mahindi', None),
    ('utamaduni', None), ('uvumilivu', None), ('uzoefu', None),
    # plural only
    ('mafuriko', 'PLURAL'), ('mafuta', 'PLURAL'), ('maporomoko ya maji', 'PLURAL'), ('mapumziko', 'PLURAL'),
    ('matokeo', 'PLURAL'), ('mauzo', 'PLURAL'), ('mifugo', 'PLURAL'),
]


def _forms(head: str, spec: object) -> dict:
    if spec is SAME:
        return {'one': head, 'many': head}
    if spec is None:
        return {'one': head, 'many': None}
    if spec == 'PLURAL':
        return {'one': None, 'many': head}
    s = str(spec)
    if ' / ' in s and s.lower() == head.lower():  # "mti / miti" already shows both
        one, many = s.split(' / ', 1)
        return {'one': one, 'many': many}
    if ' / ' in s:  # "kiatu / viatu" — the headword is the plural
        one, many = s.split(' / ', 1)
        return {'one': one, 'many': many}
    return {'one': head, 'many': s}


NOUNS: dict[str, dict] = {}
for key, spec in _RAW:
    NOUNS[key.lower()] = _forms(key, spec)


def norm(head: str) -> str:
    return re.sub(r'[!?.…]+$', '', head.strip()).strip().lower()


def forms_for(headword: str) -> dict | None:
    f = NOUNS.get(norm(headword))
    if not f:
        return None
    # Keep the headword's own capitalisation / spelling where it is one of the forms.
    out = dict(f)
    for k in ('one', 'many'):
        if out[k] and out[k].lower() == norm(headword):
            out[k] = re.sub(r'[!?.…]+$', '', headword.strip())
    return out


def apply(lessons_dir: Path) -> int:
    n = 0
    for path in sorted(lessons_dir.glob('*.json')):
        data = json.loads(path.read_text())
        changed = False
        for v in data.get('vocabulary', []):
            f = forms_for(v.get('swahili', ''))
            if f and v.get('nounForms') != f:
                v['nounForms'] = f
                changed = True
            if f:
                n += 1
        if changed:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    return n


if __name__ == '__main__':
    print(f'{apply(Path(sys.argv[1]))} vocabulary nouns have singular / plural forms')
