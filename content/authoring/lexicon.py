"""Word & phrase lexicon (everything that isn't an inflected verb).

LEX[key_lowercase] = {'gloss': str, 'sanifu': str|None, 'grammar': [slugs], 'conjugation': table|None}
Multi-word keys are matched greedily (longest first) in dialogue lines.
"""
from __future__ import annotations

LEX: dict[str, dict] = {}


def add(key, gloss, sanifu=None, grammar=None, conjugation=None, override=False):
    k = key.lower()
    if k in LEX and not override:
        return
    LEX[k] = {'gloss': gloss, 'sanifu': sanifu, 'grammar': list(grammar or []), 'conjugation': conjugation}


# ---------- nouns ----------
CLASS_NAME = {'kivi': 'ki/vi', 'jima': 'ji/ma', 'mmi': 'm/mi', 'un': 'u/n', 'u': 'u-', 'pa': 'pa/ku/mu'}


def mwa(word, gloss, plural=None):
    pl = f'; plural {plural}' if plural else ''
    add(word, f'{gloss} — m/wa noun (people & animals{pl})', grammar=['noun-classes-mwa-nn'])


def nn(word, gloss, note=''):
    add(word, f'{gloss} — n/n noun (same word for one & many){(". " + note) if note else ""}',
        grammar=['noun-classes-mwa-nn'])


def other(word, gloss, cls, std, kenyan=None, plural=None):
    pl = f' (plural {plural})' if plural else ''
    add(word, f'{gloss}{pl} — Kenyans give it n/n agreement',
        sanifu=f'Sanifu: {CLASS_NAME[cls]} class — {std}', grammar=['sanifu-noun-classes'])


# people & animals (m/wa)
for w, g, pl in [
    ('mtu', 'person', 'watu'), ('watu', 'people', None), ('mtoto', 'child', 'watoto'), ('watoto', 'children', None),
    ('mteja', 'customer / client', 'wateja'), ('wateja', 'customers', None), ('mgeni', 'guest / stranger / newcomer', 'wageni'),
    ('wageni', 'guests / visitors', None), ('mwenyeji', 'local / host', 'wenyeji'), ('wenyeji', 'locals / hosts', None),
    ('mwalimu', 'teacher', 'walimu'), ('mwanafunzi', 'student', 'wanafunzi'), ('mzee', 'old man / elder (respectful "sir")', 'wazee'),
    ('wazee', 'elders / old people', None), ('mama', 'mother / respectful "madam"', None), ('baba', 'father / respectful "sir"', None),
    ('mke', 'wife', 'wake'), ('mume', 'husband', 'waume'), ('bibi', 'wife (Nairobi) / grandmother / madam', None),
    ('dada', 'sister / polite "miss"', None), ('kaka', 'brother / polite "bro"', None), ('ndugu', 'sibling / brother', None),
    ('rafiki', 'friend', 'marafiki'), ('jirani', 'neighbour', 'majirani'), ('mjomba', 'uncle (mother\'s brother)', 'wajomba'),
    ('shangazi', 'aunt (father\'s sister)', None), ('nyanya', 'grandmother (also: tomato!)', None), ('babu', 'grandfather', None),
    ('binamu', 'cousin', None), ('mzazi', 'parent', 'wazazi'), ('wazazi', 'parents', None), ('mwana', 'son / child', 'wana'),
    ('binti', 'daughter / young woman', None), ('msichana', 'girl', 'wasichana'), ('mvulana', 'boy', 'wavulana'),
    ('kijana', 'young person / young man', 'vijana'), ('vijana', 'young people', None), ('mwanamke', 'woman', 'wanawake'),
    ('mwanaume', 'man', 'wanaume'), ('dereva', 'driver', None), ('madereva', 'drivers', None), ('daktari', 'doctor', 'madaktari'),
    ('mhudumu', 'waiter / attendant', 'wahudumu'), ('mpishi', 'cook / chef', 'wapishi'), ('meneja', 'manager', None),
    ('bosi', 'boss', None), ('boss', 'boss — friendly, informal way to address a man (driver, guard, waiter)', None),
    ('polisi', 'police officer / police', None), ('askari', 'guard / officer', None), ('afande', 'officer (respectful address for police)', None),
    ('fundi', 'skilled worker / repairman (fundi wa bomba = plumber)', 'mafundi'), ('mekanika', 'mechanic', None),
    ('seremala', 'carpenter', None), ('mkulima', 'farmer', 'wakulima'), ('mwuzaji', 'seller', 'wauzaji'), ('muuzaji', 'seller', 'wauzaji'),
    ('mpangaji', 'tenant', 'wapangaji'), ('mwenye nyumba', 'landlord (lit. owner of the house)', None),
    ('mwenyewe', 'owner / oneself', 'wenyewe'), ('mfanyakazi', 'worker / employee', 'wafanyakazi'), ('mwajiri', 'employer', 'waajiri'),
    ('mwenzangu', 'my colleague / my friend (mwenzi + -angu)', 'wenzangu'), ('mwenzako', 'your colleague / your mate', None),
    ('abiria', 'passenger', None), ('mtalii', 'tourist', 'watalii'), ('kiongozi', 'leader / guide (also "boss" as a form of address)', 'viongozi'),
    ('mwanasiasa', 'politician', 'wanasiasa'), ('mheshimiwa', 'honourable (MP / politician)', 'waheshimiwa'), ('mwananchi', 'citizen', 'wananchi'),
    ('wananchi', 'citizens / ordinary people', None), ('mchumba', 'fiancé(e)', 'wachumba'), ('mgonjwa', 'sick person / patient', 'wagonjwa'),
    ('mwuguzi', 'nurse', 'wauguzi'), ('mhasibu', 'accountant', 'wahasibu'), ('mwekezaji', 'investor', 'wawekezaji'),
    ('mshirika', 'partner', 'washirika'), ('kinyozi', 'barber', None), ('mama mboga', 'the vegetable lady at the roadside stall', None),
    ('makanga', 'matatu conductor (tout)', None), ('mwizi', 'thief', 'wezi'), ('wezi', 'thieves', None), ('jamaa', 'guy / relative (n/n in Sanifu)', None),
    ('mbwa', 'dog', None), ('paka', 'cat', None), ('kuku', 'chicken', None), ('ng\'ombe', 'cow / cattle', None), ('mbuzi', 'goat', None),
    ('simba', 'lion', None), ('tembo', 'elephant', None), ('ndovu', 'elephant', None), ('twiga', 'giraffe', None),
    ('pundamilia', 'zebra', None), ('chui', 'leopard', None), ('nyati', 'buffalo', None), ('kiboko', 'hippo (ki/vi word, but animals take a-/wa-)', None),
    ('samaki', 'fish', None), ('mnyama', 'animal', 'wanyama'), ('wanyama', 'animals', None), ('ndege', 'bird / plane', None),
    ('mbu', 'mosquito', None), ('nyoka', 'snake', None), ('fisi', 'hyena', None), ('Mkenya', 'a Kenyan', 'Wakenya'),
    ('wakenya', 'Kenyans', None), ('mzungu', 'white person / foreigner', 'wazungu'), ('mwamerika', 'an American', 'Waamerika'),
    ('mmarekani', 'an American', 'Wamarekani'), ('mjerumani', 'a German', 'Wajerumani'), ('mganda', 'a Ugandan', 'Waganda'),
    ('mfaransa', 'a French person', 'Wafaransa'), ('mwingereza', 'a British person', 'Waingereza'),
]:
    if w in ('ndege',):
        nn(w, g)
    else:
        mwa(w, g, pl)

# n/n nouns
for w, g in [
    ('nyumba', 'house / houses'), ('barabara', 'road'), ('meza', 'table'), ('simu', 'phone / call'), ('pesa', 'money'),
    ('bei', 'price'), ('chai', 'tea (also slang for a small bribe)'), ('kahawa', 'coffee'), ('sukari', 'sugar'), ('chumvi', 'salt'),
    ('nyama', 'meat'), ('nyama choma', 'grilled meat — a Kenyan institution'), ('ndizi', 'banana'), ('nyanya', 'tomato (also grandma!)'),
    ('karoti', 'carrot'), ('kabichi', 'cabbage'), ('sukuma', 'short for sukuma wiki — collard greens / kale'),
    ('sukuma wiki', 'collard greens — lit. "push the week", the cheap staple that gets you to payday'),
    ('mboga', 'vegetables / side dish (any stew eaten with ugali)'), ('chapati', 'chapati — Kenyan flatbread'),
    ('ugali', 'ugali — stiff maize-meal staple (u-class in Sanifu, used like n/n)'), ('safari', 'journey / trip'),
    ('kazi', 'work / job'), ('shule', 'school'), ('hospitali', 'hospital'), ('benki', 'bank'), ('ofisi', 'office'),
    ('dawa', 'medicine'), ('homa', 'fever / flu (Kenyans use it for a bad cold too)'), ('kofia', 'hat / cap'),
    ('nguo', 'clothes / a piece of clothing'), ('saa', 'hour / clock / watch / time'), ('siku', 'day'), ('wiki', 'week'),
    ('habari', 'news — the base of every formal greeting'), ('shida', 'problem / trouble'), ('njia', 'way / path / route'),
    ('ndoo', 'bucket'), ('taa', 'light / lamp'), ('mvua', 'rain'), ('baridi', 'cold'), ('jua', 'sun'),
    ('hali', 'condition / state'), ('hali ya hewa', 'the weather (lit. condition of the air)'), ('nchi', 'country'),
    ('familia', 'family'), ('kampuni', 'company'), ('biashara', 'business'), ('faida', 'profit / benefit'),
    ('gharama', 'cost(s)'), ('nauli', 'fare'), ('tiketi', 'ticket'), ('leseni', 'licence'), ('bima', 'insurance'),
    ('sheria', 'law / rule'), ('nambari', 'number'), ('namba', 'number'), ('picha', 'photo / picture'), ('menyu', 'menu'),
    ('bili', 'bill'), ('meza', 'table'), ('sahani', 'plate'), ('supu', 'soup'), ('maziwa', 'milk'), ('juisi', 'juice'),
    ('soda', 'soda'), ('bia', 'beer'), ('chupa', 'bottle'), ('glasi', 'glass'), ('sufuria', 'cooking pot'), ('nguruwe', 'pig / pork'),
    ('karatasi', 'paper'), ('kalamu', 'pen'), ('ramani', 'map'), ('kona', 'corner / bend'), ('taa za barabarani', 'traffic lights'),
    ('stage', 'matatu / bus stop ("steji")'), ('steji', 'stop / stage where matatus pick up'), ('pikipiki', 'motorbike'),
    ('bodaboda', 'motorbike taxi'), ('baiskeli', 'bicycle'), ('treni', 'train'), ('teksi', 'taxi'), ('lori', 'truck'),
    ('matatu', 'matatu — Kenya\'s shared minibus taxi'), ('ajali', 'accident'), ('foleni', 'queue / traffic jam (from French "file")'),
    ('jam', 'traffic jam (English loanword)'), ('trafiki', 'traffic'), ('kasi', 'speed'), ('injini', 'engine'), ('betri', 'battery'), ('batari', 'battery (everyday Kenyan)'),
    ('petroli', 'petrol'), ('dizeli', 'diesel'), ('pampu', 'pump'), ('tairi', 'tyre (pl. matairi)'), ('risiti', 'receipt'),
    ('dakika', 'minute'), ('sekunde', 'second'), ('robo', 'quarter'), ('nusu', 'half'), ('asubuhi', 'morning'),
    ('mchana', 'afternoon / daytime'), ('jioni', 'evening'), ('usiku', 'night (u-class, used like n/n)'), ('leo', 'today'),
    ('jana', 'yesterday'), ('kesho', 'tomorrow'), ('juzi', 'the day before yesterday'), ('kesho kutwa', 'the day after tomorrow'),
    ('bahari', 'sea / ocean'), ('pwani', 'coast'), ('nyuki', 'bee'), ('ploti', 'plot (of land)'), ('mbegu', 'seed'),
    ('ndoto', 'dream'), ('harusi', 'wedding'), ('sherehe', 'celebration / party'), ('zawadi', 'gift'), ('keki', 'cake'),
    ('aibu', 'shame / embarrassment'), ('furaha', 'happiness / joy'), ('hasira', 'anger'), ('huzuni', 'sadness'), 
    ('nguvu', 'strength / power'), ('akili', 'mind / brains / sense'), ('heshima', 'respect'), ('amani', 'peace'), ('hatari', 'danger / dangerous'),
    ('timu', 'team'), ('mechi', 'match (football)'), ('goli', 'goal'), ('ligi', 'league'), ('serikali', 'government'),
    ('siasa', 'politics'), ('kura', 'vote'), ('hongo', 'bribe'), ('faini', 'fine (penalty)'), ('kesi', 'court case'),
    ('mahakama', 'court'), ('ruhusa', 'permission'), ('nafasi', 'space / chance / opening'), ('miadi', 'appointment'),
    ('ripoti', 'report'), ('barua', 'letter'), ('barua pepe', 'email (lit. "wind letter")'), ('kodi', 'rent / tax'),
    ('deni', 'debt'), ('mshahara', 'salary (m/mi class in Sanifu)'), ('elfu', 'thousand'), ('mia', 'hundred'),
    ('shilingi', 'shilling(s)'), ('bob', 'bob — slang for shillings ("mia tano bob" = 500 bob)'), ('punch', 'punch — Kenyan slang for 500 shillings'),
    ('thao', 'thao — Kenyan slang for 1,000 shillings ("thousand")'), ('mpesa', 'M-Pesa — mobile money'), ('M-Pesa', 'M-Pesa — mobile money'),
    ('till', 'till number — the M-Pesa "Buy Goods" number'), ('chenji', 'change (money back) — from English'),
    ('wali', 'rice (cooked)'), ('pilau', 'pilau — spiced rice'), ('chips', 'chips / fries'), ('mayai', 'eggs (ji/ma in Sanifu: yai/mayai)'),
    ('mandazi', 'mandazi — sweet fried dough'), ('maharagwe', 'beans'), ('kachumbari', 'kachumbari — tomato & onion salad'),
    ('pilipili', 'chilli pepper'), ('vitunguu', 'onions (ki/vi)'), ('dhahabu', 'gold'), ('rangi', 'colour / paint'),
    ('kelele', 'noise'), ('sauti', 'voice / sound'), ('lugha', 'language'), ('methali', 'proverb'), ('hadithi', 'story'),
    ('afya', 'health'), ('damu', 'blood'), ('mafua', 'a cold / flu'), ('sindano', 'injection / needle'),
('harufu', 'smell'), ('ladha', 'taste / flavour'),
]:
    nn(w, g)

# other-class nouns: Kenyan speech uses n/n agreement, Sanifu doesn't
for w, g, cls, std, pl in [
    ('gari', 'car / vehicle', 'jima', 'gari langu, gari hili, magari mawili', 'magari'),
    ('magari', 'cars', 'jima', 'magari yangu, magari haya', None),
    ('jina', 'name', 'jima', 'jina langu, jina lako', 'majina'),
    ('duka', 'shop', 'jima', 'duka langu, duka hili, maduka', 'maduka'),
    ('soko', 'market', 'jima', 'soko hili, masoko', 'masoko'),
    ('swali', 'question', 'jima', 'swali langu, maswali', 'maswali'),
    ('jambo', 'matter / thing / issue', 'jima', 'jambo hili, mambo haya', 'mambo'),
    ('jibu', 'answer', 'jima', 'jibu lako, majibu', 'majibu'),
    ('tunda', 'fruit', 'jima', 'tunda hili, matunda haya', 'matunda'),
    ('matunda', 'fruit (plural)', 'jima', 'matunda haya ni mazuri', None),
    ('embe', 'mango', 'jima', 'embe hili, maembe haya', 'maembe'),
    ('maembe', 'mangoes', 'jima', 'maembe haya ni matamu', None),
    ('parachichi', 'avocado', 'jima', 'parachichi hili, maparachichi', 'maparachichi'),
    ('nanasi', 'pineapple', 'jima', 'nanasi hili, mananasi', 'mananasi'),
    ('yai', 'egg', 'jima', 'yai hili, mayai', 'mayai'),
    ('jiko', 'stove / kitchen', 'jima', 'jiko langu, meko/majiko', None),
    ('jengo', 'building', 'jima', 'jengo hili, majengo', 'majengo'),
    ('daraja', 'bridge', 'jima', 'daraja hili, madaraja', 'madaraja'),
    ('dirisha', 'window', 'jima', 'dirisha hili, madirisha', 'madirisha'),
    ('shamba', 'farm / garden', 'jima', 'shamba langu, mashamba', 'mashamba'),
    ('wazo', 'idea', 'jima', 'wazo hili, mawazo', 'mawazo'),
    ('kosa', 'mistake', 'jima', 'kosa langu, makosa', 'makosa'),
    ('kabati', 'cupboard / wardrobe', 'jima', 'kabati la nguo', None),
    ('tairi', 'tyre', 'jima', 'tairi hili, matairi', 'matairi'),
    ('kitu', 'thing', 'kivi', 'kitu changu, vitu vyangu', 'vitu'),
    ('vitu', 'things', 'kivi', 'vitu vyangu, vitu hivi', None),
    ('kitabu', 'book', 'kivi', 'kitabu changu, vitabu vyangu', 'vitabu'),
    ('kiti', 'chair / seat', 'kivi', 'kiti changu, viti vyangu', 'viti'),
    ('chakula', 'food', 'kivi', 'chakula changu, chakula hiki', 'vyakula'),
    ('kikombe', 'cup', 'kivi', 'kikombe changu, vikombe', 'vikombe'),
    ('kijiko', 'spoon', 'kivi', 'kijiko hiki, vijiko', 'vijiko'),
    ('kisu', 'knife', 'kivi', 'kisu hiki, visu', 'visu'),
    ('chumba', 'room', 'kivi', 'chumba changu, vyumba', 'vyumba'),
    ('kitanda', 'bed', 'kivi', 'kitanda changu, vitanda', 'vitanda'),
    ('kitambulisho', 'ID card', 'kivi', 'kitambulisho changu', 'vitambulisho'),
    ('kibanda', 'roadside stall / kiosk', 'kivi', 'kibanda hiki, vibanda', 'vibanda'),
    ('kiatu', 'shoe', 'kivi', 'kiatu changu, viatu vyangu', 'viatu'),
    ('viatu', 'shoes', 'kivi', 'viatu vyangu, viatu hivi', None),
    ('kijiji', 'village', 'kivi', 'kijiji changu, vijiji', 'vijiji'),
    ('kiswahili', 'Swahili (the language)', 'kivi', 'Kiswahili changu', None),
    ('kiingereza', 'English (the language)', 'kivi', 'Kiingereza chake', None),
    ('kingereza', 'English (the language)', 'kivi', 'Kiingereza chake', None),
    ('kituo', 'station / stop', 'kivi', 'kituo cha polisi, vituo', 'vituo'),
    ('kipande', 'piece / slice', 'kivi', 'kipande hiki, vipande', 'vipande'),
    ('kidonda', 'wound / sore', 'kivi', 'kidonda changu', 'vidonda'),
    ('kichwa', 'head', 'kivi', 'kichwa changu, vichwa', 'vichwa'),
    ('kifua', 'chest', 'kivi', 'kifua changu', None),
    ('kikohozi', 'cough', 'kivi', 'kikohozi changu', None),
    ('kitambi', 'potbelly', 'kivi', 'kitambi chake', None),
    ('kiasi', 'amount / a bit', 'kivi', 'kiasi gani?', None),
    ('kidogo', 'a little / a bit', 'kivi', 'kidogo (adverb, no agreement)', None),
    ('chama', 'savings group / chama / party', 'kivi', 'chama chetu, vyama', 'vyama'),
    ('kiongozi', 'leader', 'kivi', 'kiongozi wetu (people take m/wa agreement anyway)', 'viongozi'),
    ('mji', 'town / city', 'mmi', 'mji huu, miji', 'miji'),
    ('mti', 'tree', 'mmi', 'mti huu, miti mirefu', 'miti'),
    ('mlango', 'door', 'mmi', 'mlango huu, milango', 'milango'),
    ('mkate', 'bread', 'mmi', 'mkate wangu, mikate', 'mikate'),
    ('mwaka', 'year', 'mmi', 'mwaka huu, miaka miwili', 'miaka'),
    ('miaka', 'years', 'mmi', 'miaka mitatu', None),
    ('mwezi', 'month / moon', 'mmi', 'mwezi huu, miezi miwili', 'miezi'),
    ('mkono', 'hand / arm', 'mmi', 'mkono wangu, mikono', 'mikono'),
    ('mguu', 'leg / foot', 'mmi', 'mguu wangu, miguu', 'miguu'),
    ('mgongo', 'back', 'mmi', 'mgongo wangu', 'migongo'),
    ('mto', 'river / pillow', 'mmi', 'mto huu, mito', 'mito'),
    ('mlima', 'mountain', 'mmi', 'mlima huu, milima', 'milima'),
    ('mfuko', 'bag', 'mmi', 'mfuko wangu, mifuko', 'mifuko'),
    ('mzigo', 'luggage / load', 'mmi', 'mzigo wangu, mizigo', 'mizigo'),
    ('mkutano', 'meeting', 'mmi', 'mkutano wetu, mikutano', 'mikutano'),
    ('mpango', 'plan', 'mmi', 'mpango wetu, mipango', 'mipango'),
    ('mtihani', 'exam', 'mmi', 'mtihani wangu, mitihani', 'mitihani'),
    ('mchezo', 'game / match', 'mmi', 'mchezo huu, michezo', 'michezo'),
    ('mkataba', 'contract', 'mmi', 'mkataba wetu', 'mikataba'),
    ('mkopo', 'loan', 'mmi', 'mkopo wangu, mikopo', 'mikopo'),
    ('mtaa', 'neighbourhood / estate', 'mmi', 'mtaa wetu, mitaa', 'mitaa'),
    ('mwendo', 'speed / pace', 'mmi', 'mwendo wa kasi', None),
    ('mpira', 'ball / football', 'mmi', 'mpira wetu', 'mipira'),
    ('mshahara', 'salary', 'mmi', 'mshahara wangu', 'mishahara'),
    ('mchuzi', 'stew / sauce', 'mmi', 'mchuzi huu', None),
    ('mpaka', 'border / boundary (also: until)', 'mmi', 'mpaka wa shamba', 'mipaka'),
    ('mradi', 'project', 'mmi', 'mradi wetu, miradi', 'miradi'),
    ('mwisho', 'end', 'mmi', 'mwisho wa barabara', None),
    ('mchana', 'afternoon', 'mmi', 'mchana huu', None),
    ('moto', 'fire / hot', 'mmi', 'moto mkubwa', None),
    ('mkanda', 'belt / seatbelt', 'mmi', 'mkanda wako', 'mikanda'),
    ('mzunguko', 'roundabout', 'mmi', 'mzunguko huu, mizunguko', 'mizunguko'),
    ('ukuta', 'wall', 'un', 'ukuta huu, kuta', 'kuta'),
    ('ufunguo', 'key', 'un', 'ufunguo wangu, funguo', 'funguo'),
    ('upande', 'side / direction', 'un', 'upande huu, pande', 'pande'),
    ('uwanja', 'field / ground (uwanja wa ndege = airport)', 'u', 'uwanja huu', 'nyanja'),
    ('ujumbe', 'message', 'u', 'ujumbe wangu', 'jumbe'),
    ('ukweli', 'truth', 'u', 'ukweli wenyewe', None),
    ('uongo', 'lie(s)', 'u', 'uongo mtupu', None),
    ('uchaguzi', 'election / choice', 'u', 'uchaguzi ujao', 'chaguzi'),
    ('ushauri', 'advice', 'u', 'ushauri wako', None),
    ('ugonjwa', 'illness', 'u', 'ugonjwa huu', 'magonjwa'),
    ('ujuzi', 'skills / know-how', 'u', 'ujuzi wake', None),
    ('uzoefu', 'experience', 'u', 'uzoefu wangu', None),
    ('uhakika', 'certainty', 'u', 'nina uhakika', None),
    ('utulivu', 'calm / quiet', 'u', 'utulivu zaidi', None),
    ('usalama', 'security / safety', 'u', 'usalama wetu', None),
    ('uangalifu', 'care / carefulness', 'u', 'kwa uangalifu', None),
    ('ukaguzi', 'inspection', 'u', 'ukaguzi wa gari', None),
    ('ugali', 'ugali (maize meal)', 'u', 'ugali wangu', None),
    ('uji', 'porridge', 'u', 'uji wangu', None),
    ('usiku', 'night', 'u', 'usiku huu', None),
    ('mahali', 'place', 'pa', 'mahali hapa / pale (pa-class: mahali pazuri)', None),
    ('pahali', 'place (colloquial for mahali)', 'pa', 'mahali hapa', None),
]:
    other(w, g, cls, std, plural=pl)

add('mambo', 'things / matters / issues — plural of jambo. "Mambo?" = "What\'s up?" (lit. "matters?")',
    sanifu='Sanifu: ji/ma class (jambo/mambo) — mambo yangu', grammar=['greetings'])

# ---------- places & names ----------
for w, g in [
    ('Nairobi', 'Nairobi'), ('Westlands', 'Westlands — busy Nairobi neighbourhood'), ('Westie', 'Westie — casual short form of Westlands'),
    ('Kilimani', 'Kilimani — Nairobi neighbourhood'), ('Karen', 'Karen — leafy Nairobi suburb'), ('Sarit', 'Sarit Centre — mall in Westlands'),
    ('CBD', 'CBD — Nairobi city centre'), ('tao', 'town — Sheng for the city centre ("naenda tao")'), ('Mombasa', 'Mombasa — the coastal city'),
    ('Kisumu', 'Kisumu — city on Lake Victoria'), ('Nakuru', 'Nakuru'), ('Naivasha', 'Naivasha'), ('Kenya', 'Kenya'), ('Uganda', 'Uganda'),
    ('Tanzania', 'Tanzania'), ('Marekani', 'America (USA)'), ('Ujerumani', 'Germany'), ('Uingereza', 'Britain / England'),
    ('Ulaya', 'Europe'), ('Safaricom', 'Safaricom — Kenya\'s big mobile network'), ('Waiyaki Way', 'Waiyaki Way — the big road through Westlands'),
    ('Thika Road', 'Thika Road — superhighway out of Nairobi'), ('Mombasa Road', 'Mombasa Road'), ('Ngong Road', 'Ngong Road'),
    ('Yaya', 'Yaya Centre — mall in Kilimani'), ('Junction', 'The Junction — mall on Ngong Road'), ('Kibera', 'Kibera'),
    ('Gikomba', 'Gikomba — huge open-air second-hand market'), ('Marikiti', 'Marikiti — Nairobi\'s wholesale fruit & veg market'),
    ('Kencom', 'Kencom — big matatu/bus stop in the CBD'), ('Ngong', 'Ngong'), ('Rongai', 'Rongai'), ('Kiambu', 'Kiambu'),
    ('Mama Njeri', 'Mama Njeri — "Njeri\'s mother": women are often called by their child\'s name'),
    ('Kamau', 'Kamau (name)'), ('John', 'John (name)'), ('Wanjiku', 'Wanjiku (name)'), ('Otieno', 'Otieno (name)'),
    ('Achieng', 'Achieng (name)'), ('Mwangi', 'Mwangi (name)'), ('Njeri', 'Njeri (name)'), ('Baraka', 'Baraka (name)'),
    ('Wafula', 'Wafula (name)'), ('Amina', 'Amina (name)'), ('Juma', 'Juma (name)'), ('Kevo', 'Kevo (nickname)'),
    ('Mall', 'Mall — English loanword; context tells you which mall'), ('roundabout', 'roundabout (English loanword — Sanifu: mzunguko)'),
    ('Gor Mahia', 'Gor Mahia — Kenya\'s most famous football club ("K\'Ogalo")'), ('AFC', 'AFC Leopards — Gor\'s big rivals ("Ingwe")'),
    ('Ingwe', 'Ingwe — nickname for AFC Leopards'), ('K\'Ogalo', 'K\'Ogalo — nickname for Gor Mahia'), ('Arsenal', 'Arsenal'),
    ('Kasarani', 'Kasarani — the national stadium'), ('Nyayo', 'Nyayo Stadium'),
]:
    add(w, g)

# ---------- function words ----------
FUNC = r"""
na | and / with
au | or
ama | or (Kenyan, also "otherwise")
lakini | but
ila | except / but
pia | also / too
tu | just / only
sana | very / a lot
kabisa | totally / completely — "Kabisa!" = "Absolutely!"
kidogo | a little / a bit
zaidi | more
kuliko | than (comparisons) | | comparatives
kama | like / as / if
kama vile | such as / just like
kwa | by / with / at / for / to (very flexible — see explainer) | | locative-ni
kwa sababu | because | | conjunctions-kwamba
kwa sababu ya | because of | | conjunctions-kwamba
kwa nini | why? | | question-words
kwa hivyo | so / therefore | | conjunctions-kwamba
kwa hiyo | so / therefore | | conjunctions-kwamba
kwamba | that (as in "he said that…") | | conjunctions-kwamba
ili | so that (followed by subjunctive) | | subjunctive, conjunctions-kwamba
ingawa | although | | conjunctions-kwamba
hata | even / (not) at all | | conjunctions-kwamba
hata hivyo | even so / despite that | | conjunctions-kwamba
badala ya | instead of | | conjunctions-kwamba
baada ya | after
kabla ya | before
halafu | then / and then
kisha | then / after that
bado | still / not yet | | perfect-negative-ja
tena | again
sasa | now — also a greeting: "Sasa?" = "What's up now?"
sasa hivi | right now / just now
hivi karibuni | soon / recently
baadaye | later
mapema | early
haraka | quickly / hurry
polepole | slowly / gently
pole pole | slowly / gently
mbele | ahead / in front
mbele ya | in front of
nyuma | behind / back
nyuma ya | behind
karibu | near / welcome / almost
karibu na | close to / near | | locative-ni
mbali | far
mbali na | far from | | locative-ni
juu | up / on top
juu ya | on top of / about
chini | down / below
chini ya | under / below / less than
ndani | inside
ndani ya | inside (of)
nje | outside
nje ya | outside (of)
kando ya | beside / alongside
pembeni | at the side / aside
katikati | in the middle
kati ya | between
kushoto | left
kulia | right (also "to cry")
moja kwa moja | straight on / directly
upande wa kushoto | on the left-hand side
upande wa kulia | on the right-hand side
hapa | here
hapo | there (near you / just mentioned)
pale | there (over there)
huko | there (far / that place)
kule | over there
hapa hapa | right here
wapi | where? | | question-words
nini | what? | | question-words
nani | who? | | question-words
gani | which? / what kind? | | question-words
ngapi | how many? / how much? | | question-words, numbers-money
lini | when? | | question-words
vipi | how? — "Vipi?" alone = "How's it?" | | question-words, greetings
aje | how? (Kenyan) — "Uko aje?" = how are you? | | question-words, greetings
je | (question marker) — "Je, …?" turns a statement into a yes/no question | | question-words
mbona | why on earth? / how come? | | question-words
namna gani | how? / in what way? | | question-words
kiasi gani | how much (uncountable)? | | question-words, numbers-money
bei gani | what price? / how much? | | question-words, numbers-money
pesa ngapi | how much money? | | question-words, numbers-money
ni | is / am / are | | ni-copula
si | is not / am not / are not — also "Si …?" = "Why don't you…? / Isn't it…?" | | ni-copula
sio | it's not / no (Kenyan for si) | | ni-copula
ndio | yes / it's (that) — "Ndio hii" = "here it is" | | ni-copula
ndiyo | yes / it's (that) | | ni-copula
ndiyo hii | here it is / this is it | | ni-copula
poa | cool / fine — from kupoa, "to cool down" | | greetings
poa sana | very cool / really good | | greetings
fiti | fine (from English "fit") | | greetings
sawa | okay / alright (lit. "equal")
sawa sawa | alright, alright / perfectly fine
safi | clean / great / sorted
shwari | calm / all good
salama | fine / safe / peaceful | | greetings
nzuri | good / fine — the standard answer to habari | | greetings
njema | good (n/n agreement) | | adjective-agreement
hapana | no
pole pole | slowly / gently
haraka | quickly / hurry
hii hapa | here it is | | demonstratives
hizi hapa | here they are | | demonstratives
asante | thank you
asante sana | thank you very much
asanteni | thank you (to several people)
tafadhali | please
samahani | excuse me / sorry (apology)
pole | sorry (sympathy)
pole sana | so sorry / take heart
karibu | welcome / you're welcome / come in
karibuni | welcome (to several people)
karibu tena | welcome again / come again
kwa heri | goodbye | | greetings
kwaheri | goodbye | | greetings
kwaherini | goodbye (to several people) | | greetings
tuonane | see you (lit. "let's see each other") | | greetings, subjunctive
tutaonana | we'll see each other / see you | | greetings
safari njema | have a good trip
siku njema | have a good day
usiku mwema | good night
lala salama | sleep well
mambo | what's up? (lit. "matters?") | | greetings
mambo vipi | how are things? | | greetings
niaje | what's up? — from "ni aje?" (how is it?), said fast with stress on the first syllable | | greetings
sema | "Talk to me!" — casual hello (lit. "say!") | | greetings
semaje | what do you say? / what's up? | | greetings
habari | how are you? (lit. "news?") | | greetings
habari yako | how are you? (lit. "your news?") | | greetings, possessives
habari gani | how are things? (lit. "what news?") | | greetings
habari za asubuhi | good morning (lit. "news of the morning?") | | greetings
habari ya asubuhi | good morning (lit. "news of the morning?") | | greetings
habari ya mchana | good afternoon | | greetings
habari ya jioni | good evening | | greetings
habari za kazi | how's work? | | greetings
nzuri | good / fine — the standard answer to habari | | greetings
nzuri sana | very good | | greetings
salama | fine / peaceful | | greetings
fiti | fine (from English "fit") | | greetings
shikamoo | respectful greeting to an elder | | greetings
marahaba | reply to shikamoo | | greetings
hujambo | how are you? (lit. "you have no matter?") — traditional greeting | | greetings
sijambo | I'm fine (lit. "I have no matter") | | greetings
hamjambo | how are you all? | | greetings
hatujambo | we're fine | | greetings
hajambo | he/she is fine | | greetings
jambo | hi — mostly said to tourists; Kenyans rarely use it with each other | | greetings
haina shida | no problem (lit. "it has no problem") | | na-have
hakuna shida | no problem (lit. "there's no problem") | | na-have
hamna shida | no problem | | na-have
hakuna matata | no worries — famous, but Kenyans say "hakuna shida" | | na-have
labda | maybe
pengine | maybe / perhaps
huenda | maybe / it might be
bila | without
bila shaka | without a doubt / of course
lazima | must / it's necessary | | helper-verbs
afadhali | better / preferably | | comparatives
heri | better (it's better that…) | | comparatives
bora | best / better / of good quality | | comparatives
kila | every / each
kila siku | every day
kila mtu | everyone
kila kitu | everything
yote | all (n/n singular agreement) | | adjective-agreement
zote | all (n/n plural agreement) | | adjective-agreement
wote | all (m/wa agreement: watu wote) | | adjective-agreement
sote | all of us | | adjective-agreement
nyote | all of you | | adjective-agreement
yoyote | any (n/n singular) | | adjective-agreement
yeyote | anyone / any (person) | | adjective-agreement
mimi | I / me | | subject-prefixes
wewe | you (one person) | | subject-prefixes
yeye | he / she / him / her | | subject-prefixes
sisi | we / us | | subject-prefixes
nyinyi | you all | | subject-prefixes
ninyi | you all | | subject-prefixes
wao | they / them | | subject-prefixes
nami | and me / with me | | subject-prefixes
nawe | and you / with you — "Nawe?" = "And you?" | | subject-prefixes
naye | and him/her / with him/her | | subject-prefixes
nao | and them / with them | | subject-prefixes
mwenyewe | himself / herself / myself (the person themselves) | | subject-prefixes
peke yangu | on my own | | possessives
peke yako | on your own | | possessives
peke yake | on his/her own | | possessives
kumbe | oh! so…! (surprise: what I believed wasn't true) | | discourse-particles
basi | so / well then / okay, that's it | | discourse-particles
yaani | I mean / that is to say | | discourse-particles
ebu | come on / let's — softens a request | | discourse-particles, polite-requests
hebu | come on / let's — softens a request | | discourse-particles, polite-requests
haya | okay then / alright | | discourse-particles
aisee | wow / I say! | | discourse-particles
sivyo | isn't it? / right? (question tag) | | discourse-particles
eeh | yes / uh-huh | | discourse-particles
aah | ah! | | discourse-particles
wee | hey you! (surprise / emphasis) | | discourse-particles
kweli | true / really | | discourse-particles
ni kweli | it's true | | ni-copula
si ndiyo | isn't that so? / right? | | discourse-particles
hivyo | like that / so | | discourse-particles
hivi | like this / about (with numbers) | | discourse-particles
vile | the way that / how | | vyo-manner
jinsi | how / the way
namna | way / manner
muda | time / a while
wakati | time / when / while
wakati mwingine | sometimes / another time
mara | times / at once
mara moja | once / immediately
mara mbili | twice
mara nyingi | often
mara kwa mara | from time to time
mara ya kwanza | the first time
mara ya mwisho | the last time
kamwe | never (ever)
zamani | long ago / in the past
siku hizi | these days
siku hizi tu | just these days
kitambo | a long while ago (Kenyan)
juzi tu | just the other day
saa ngapi | what time? | | time-swahili, question-words
saa moja | 7 o'clock (1st hour of daylight) / one hour | | time-swahili
saa mbili | 8 o'clock | | time-swahili
saa tatu | 9 o'clock | | time-swahili
saa nne | 10 o'clock | | time-swahili
saa tano | 11 o'clock | | time-swahili
saa sita | 12 o'clock (noon / midnight) | | time-swahili
saa saba | 1 o'clock | | time-swahili
saa nane | 2 o'clock | | time-swahili
saa tisa | 3 o'clock | | time-swahili
saa kumi | 4 o'clock | | time-swahili
saa kumi na moja | 5 o'clock | | time-swahili
saa kumi na mbili | 6 o'clock | | time-swahili
na nusu | and a half / half past | | time-swahili
na robo | and a quarter / quarter past | | time-swahili
kasoro robo | quarter to | | time-swahili
kamili | exactly / sharp | | time-swahili
asubuhi | morning
mchana | afternoon
jioni | evening
usiku | night
leo | today
jana | yesterday
kesho | tomorrow
juzi | the day before yesterday
wiki ijayo | next week
wiki iliyopita | last week
wiki jana | last week (Kenyan)
mwaka jana | last year
mwaka ujao | next year
mwezi ujao | next month
Jumatatu | Monday
Jumanne | Tuesday
Jumatano | Wednesday
Alhamisi | Thursday
Ijumaa | Friday
Jumamosi | Saturday
Jumapili | Sunday
wikendi | weekend
"""
for line in FUNC.strip().splitlines():
    parts = [p.strip() for p in line.split('|')]
    key, gloss = parts[0], parts[1]
    san = parts[2] if len(parts) > 2 and parts[2] else None
    gr = [g.strip() for g in parts[3].split(',')] if len(parts) > 3 and parts[3] else []
    add(key, gloss, san, gr)

# ---------- numbers ----------
NUM = {'moja': 1, 'mbili': 2, 'tatu': 3, 'nne': 4, 'tano': 5, 'sita': 6, 'saba': 7, 'nane': 8, 'tisa': 9, 'kumi': 10,
       'ishirini': 20, 'thelathini': 30, 'arobaini': 40, 'hamsini': 50, 'sitini': 60, 'sabini': 70, 'themanini': 80, 'tisini': 90}
for w, n_ in NUM.items():
    add(w, f'{n_} (n/n form — used for counting, money, things)', grammar=['numbers-money'])
for w, g in [('mmoja', 'one (m/wa: mtu mmoja)'), ('wawili', 'two (m/wa: watu wawili)'), ('watatu', 'three (m/wa)'),
             ('wanne', 'four (m/wa)'), ('watano', 'five (m/wa)'), ('wanane', 'eight (m/wa)'), ('mia moja', '100'),
             ('mia mbili', '200'), ('mia tatu', '300'), ('mia nne', '400'), ('mia tano', '500 — a.k.a. "punch"'),
             ('mia sita', '600'), ('mia saba', '700'), ('mia nane', '800'), ('elfu moja', '1,000 — a.k.a. "thao"'),
             ('elfu mbili', '2,000'), ('elfu tatu', '3,000'), ('elfu tano', '5,000'), ('elfu kumi', '10,000'),
             ('kwanza', 'first'), ('ya kwanza', 'the first (n/n)'), ('wa kwanza', 'the first (m/wa)'), ('ya pili', 'the second (n/n)'),
             ('ya mwisho', 'the last (n/n)'), ('wa mwisho', 'the last (m/wa)'), ('mwisho', 'end / last'),
             ('nusu kilo', 'half a kilo'), ('kilo', 'kilo'), ('kilo moja', 'one kilo'), ('robo kilo', 'a quarter kilo')]:
    add(w, g, grammar=['numbers-money'])

# ---------- copula / -ko / -na (have) ----------
KO = [('I', 'niko'), ('you', 'uko'), ('he/she', 'yuko'), ('we', 'tuko'), ('you all', 'mko'), ('they', 'wako'),
      ('it (n/n)', 'iko'), ('they (n/n)', 'ziko')]
KO_T = {'verb': '-ko (be at / be doing)', 'tense': 'Present', 'rows': [{'pronoun': p, 'form': f} for p, f in KO]}
NKO = [('I', 'siko'), ('you', 'hauko'), ('he/she', 'hayuko'), ('we', 'hatuko'), ('you all', 'hamko'), ('they', 'hawako'),
       ('it (n/n)', 'haiko'), ('they (n/n)', 'haziko')]
NKO_T = {'verb': '-ko (be at)', 'tense': 'Present, negative', 'rows': [{'pronoun': p, 'form': f} for p, f in NKO]}
for p, f in KO:
    add(f, f'"{p[0].upper() + p[1:]} {"am" if p == "I" else "is" if p in ("he/she", "it (n/n)") else "are"} (at / doing)" — {f[:-2]}- + -ko (be at a place, or how you\'re doing). "{f.capitalize()} poa" = {p} {"am" if p == "I" else "is" if p in ("he/she", "it (n/n)") else "are"} fine.',
        grammar=['ko-location'], conjugation=KO_T)
for p, f in NKO:
    add(f, f'"{p[0].upper() + p[1:]} {"am" if p == "I" else "is" if p in ("he/she", "it (n/n)") else "are"} not (here / there)" — negative of -ko.',
        grammar=['ko-location', 'negative-present'], conjugation=NKO_T)
add('kuko', '"It is (there)" — place form of -ko.', grammar=['ko-location'])
NA = [('I', 'nina'), ('you', 'una'), ('he/she', 'ana'), ('we', 'tuna'), ('you all', 'mna'), ('they', 'wana'),
      ('it (n/n)', 'ina'), ('they (n/n)', 'zina')]
NA_T = {'verb': '-na (have)', 'tense': 'Present', 'rows': [{'pronoun': p, 'form': f} for p, f in NA]}
NNA = [('I', 'sina'), ('you', 'huna'), ('he/she', 'hana'), ('we', 'hatuna'), ('you all', 'hamna'), ('they', 'hawana'),
       ('it (n/n)', 'haina'), ('they (n/n)', 'hazina')]
NNA_T = {'verb': '-na (have)', 'tense': 'Present, negative', 'rows': [{'pronoun': p, 'form': f} for p, f in NNA]}
for p, f in NA:
    add(f, f'"{p[0].upper() + p[1:]} {"has" if p in ("he/she", "it (n/n)") else "have"}" — {f[:-2] or "a"}- + -na (with). Swahili "have" is literally "be with".',
        grammar=['na-have'], conjugation=NA_T)
for p, f in NNA:
    add(f, f'"{p[0].upper() + p[1:]} {"doesn\'t" if p in ("he/she", "it (n/n)") else "don\'t"} have" — negative of -na.',
        grammar=['na-have', 'negative-present'], conjugation=NNA_T)
add('kuna', '"There is / there are" — ku- (place) + -na (have): "the place has…"', grammar=['na-have'])
add('hakuna', '"There isn\'t / there\'s no…"', grammar=['na-have', 'negative-present'])
add('kulikuwa na', '"There was / there were"', grammar=['na-have', 'past-li'])
add('kutakuwa na', '"There will be"', grammar=['na-have', 'future-ta'])
add('kuwa na', '"to have" (lit. "to be with")', grammar=['na-have', 'infinitive-ku'])
add('nilikuwa na', '"I had" — past of nina', grammar=['na-have', 'past-li'])
add('alikuwa na', '"He/she had" — past of ana', grammar=['na-have', 'past-li'])
add('tulikuwa na', '"We had"', grammar=['na-have', 'past-li'])
add('nitakuwa na', '"I will have"', grammar=['na-have', 'future-ta'])
add('ningekuwa na', '"If I had / I would have"', grammar=['na-have', 'conditional-nge'])
add('uko na', '"You have" — Kenyan: -ko na instead of -na ("uko na pesa?")', sanifu='Sanifu: una (una pesa?)', grammar=['na-have', 'ko-location'])
add('niko na', '"I have (it on me)" — Kenyan: -ko na instead of -na', sanifu='Sanifu: nina', grammar=['na-have', 'ko-location'])
add('iko na', '"It has" — Kenyan for ina', sanifu='Sanifu: ina', grammar=['na-have', 'ko-location'])
add('ako na', '"He/she has" — Kenyan for ana ("ako na gari")', sanifu='Sanifu: ana; yuko na', grammar=['na-have', 'ko-location'])
add('ako', '"He/she is (at)" — Kenyan short for yuko', sanifu='Sanifu: yuko', grammar=['ko-location'])

# ---------- possessives ----------
POSS = {'angu': 'my', 'ako': 'your', 'ake': 'his/her', 'etu': 'our', 'enu': 'your (pl.)', 'ao': 'their'}
POSS_T = lambda pre, label: {'verb': f'possessive ({label})', 'tense': 'my · your · his/her · our · your (pl.) · their',
                             'rows': [{'pronoun': v, 'form': pre + k} for k, v in POSS.items()]}
for k, en in POSS.items():
    add('w' + k, f'"{en}" — m/wa agreement (for people: mtoto w{k}, watoto w{k}).', grammar=['possessives'],
        conjugation=POSS_T('w', 'm/wa: people'))
    add('y' + k, f'"{en}" — n/n singular agreement (nyumba y{k}). In Kenyan speech also used for family words and most things (jina y{k}, gari y{k}).',
        grammar=['possessives'], conjugation=POSS_T('y', 'n/n singular'))
    add('z' + k, f'"{en}" — n/n plural agreement (nyumba z{k}, nguo z{k}).', grammar=['possessives'],
        conjugation=POSS_T('z', 'n/n plural'))
    add('ch' + k, f'"{en}" — ki/vi agreement (Sanifu).', sanifu=f'ki/vi class (kitabu ch{k}); Kenyans often just say y{k}', grammar=['sanifu-noun-classes'])
    add('l' + k, f'"{en}" — ji/ma agreement (Sanifu).', sanifu=f'ji/ma class (gari l{k}, jina l{k}); Kenyans often say y{k}', grammar=['sanifu-noun-classes'])
for w, g in [('mamangu', 'my mother (mama + -angu)'), ('babangu', 'my father'), ('dadangu', 'my sister'), ('kakangu', 'my brother'),
             ('mamako', 'your mother'), ('babako', 'your father'), ('dadako', 'your sister'), ('kakako', 'your brother'),
             ('mamake', 'his/her mother'), ('babake', 'his/her father'), ('dadake', 'his/her sister'), ('kakake', 'his/her brother'),
             ('mwanangu', 'my child'), ('bibiyangu', 'my wife'), ('kwangu', 'my place / to me'), ('kwako', 'your place / to you'),
             ('kwake', 'his/her place'), ('kwetu', 'our place / back home'), ('kwenu', 'your (pl.) place / your home area'),
             ('kwao', 'their place')]:
    add(w, f'"{g}" — contracted possessive.', grammar=['possessives'])
add('jina yangu', '"my name" — Kenyan: n/n agreement yangu', sanifu='Sanifu: jina langu (jina is ji/ma class)', grammar=['possessives', 'sanifu-noun-classes'])
add('jina yako', '"your name"', sanifu='Sanifu: jina lako (ji/ma class)', grammar=['possessives', 'sanifu-noun-classes'])
add('jina lako', '"your name" — ji/ma agreement, as in Sanifu', sanifu='Kenyan everyday: jina yako', grammar=['possessives', 'sanifu-noun-classes'])
add('jina langu', '"my name" — ji/ma agreement, as in Sanifu', sanifu='Kenyan everyday: jina yangu', grammar=['possessives', 'sanifu-noun-classes'])
add('gari yangu', '"my car" — Kenyan n/n agreement', sanifu='Sanifu: gari langu (ji/ma class)', grammar=['possessives', 'sanifu-noun-classes'])
add('gari yako', '"your car"', sanifu='Sanifu: gari lako', grammar=['possessives', 'sanifu-noun-classes'])
add('gari hii', '"this car" — Kenyan n/n demonstrative', sanifu='Sanifu: gari hili', grammar=['demonstratives', 'sanifu-noun-classes'])
add('-a', 'of (agrees with the noun: wa / ya / za)', grammar=['possessives'])
add('wa', '"of" — m/wa agreement (mtoto wa Kamau, watu wa Nairobi)', grammar=['possessives'])
add('ya', '"of" — n/n singular agreement (nyumba ya Kamau); Kenyans use ya with most nouns', grammar=['possessives'])
add('za', '"of" — n/n plural agreement (nyumba za Kamau, habari za asubuhi)', grammar=['possessives'])
add('cha', '"of" — ki/vi agreement (kituo cha polisi, chakula cha mchana)', sanifu='ki/vi class', grammar=['sanifu-noun-classes'])
add('la', '"of" — ji/ma agreement (gari la Kamau)', sanifu='ji/ma class', grammar=['sanifu-noun-classes'])

# ---------- demonstratives ----------
for w, g in [('huyu', 'this (person) — m/wa singular'), ('hawa', 'these (people) — m/wa plural'), ('yule', 'that (person) over there'),
             ('wale', 'those (people) over there'), ('huyo', 'that (person) just mentioned'), ('hao', 'those (people) just mentioned'),
             ('hii', 'this — n/n singular (and Kenyans\' all-purpose "this")'), ('hizi', 'these — n/n plural'),
             ('ile', 'that (over there) — n/n singular'), ('zile', 'those (over there) — n/n plural'),
             ('hiyo', 'that (near you / just mentioned) — n/n singular'), ('hizo', 'those (just mentioned) — n/n plural'),
             ('hiki', 'this — ki/vi (Sanifu: kitu hiki)'), ('hili', 'this — ji/ma (Sanifu: gari hili)'), ('huu', 'this — m/mi or u (Sanifu: mti huu)'),
             ('hapa', 'here'), ('pale', 'there (visible)'), ('huko', 'there (that place)'), ('kule', 'over there')]:
    add(w, g, grammar=['demonstratives'])

# ---------- adjectives ----------
ADJ = [
    # stem, english, m/wa sg, m/wa pl, n/n
    ('zuri', 'good / nice / beautiful', 'mzuri', 'wazuri', 'nzuri'),
    ('baya', 'bad', 'mbaya', 'wabaya', 'mbaya'),
    ('kubwa', 'big', 'mkubwa', 'wakubwa', 'kubwa'),
    ('dogo', 'small / young', 'mdogo', 'wadogo', 'ndogo'),
    ('refu', 'tall / long', 'mrefu', 'warefu', 'ndefu'),
    ('fupi', 'short', 'mfupi', 'wafupi', 'fupi'),
    ('pya', 'new', 'mpya', 'wapya', 'mpya'),
    ('zee', 'old (people)', 'mzee', 'wazee', 'zee'),
    ('ingi', 'many / a lot', 'mwingi', 'wengi', 'nyingi'),
    ('ingine', 'other / another', 'mwingine', 'wengine', 'nyingine'),
    ('tamu', 'sweet / delicious', 'mtamu', 'watamu', 'tamu'),
    ('safi', 'clean / great', 'msafi', 'wasafi', 'safi'),
    ('chafu', 'dirty', 'mchafu', 'wachafu', 'chafu'),
    ('gumu', 'hard / difficult', 'mgumu', 'wagumu', 'ngumu'),
    ('rahisi', 'easy / cheap', 'rahisi', 'rahisi', 'rahisi'),
    ('ghali', 'expensive', 'ghali', 'ghali', 'ghali'),
    ('vivu', 'lazy', 'mvivu', 'wavivu', 'vivu'),
    ('erevu', 'clever', 'mwerevu', 'werevu', 'erevu'),
    ('karimu', 'generous / hospitable', 'mkarimu', 'wakarimu', 'karimu'),
    ('pole', 'gentle / calm', 'mpole', 'wapole', 'pole'),
    ('kali', 'fierce / sharp / strict / spicy', 'mkali', 'wakali', 'kali'),
    ('gonjwa', 'sick', 'mgonjwa', 'wagonjwa', 'gonjwa'),
    ('nene', 'fat / thick', 'mnene', 'wanene', 'nene'),
    ('embamba', 'thin / narrow', 'mwembamba', 'wembamba', 'nyembamba'),
    ('eupe', 'white', 'mweupe', 'weupe', 'nyeupe'),
    ('eusi', 'black', 'mweusi', 'weusi', 'nyeusi'),
    ('ekundu', 'red', 'mwekundu', 'wekundu', 'nyekundu'),
    ('changa', 'young / immature', 'mchanga', 'wachanga', 'changa'),
    ('zima', 'whole / healthy / adult', 'mzima', 'wazima', 'nzima'),
    ('ote', 'all', 'wote', 'wote', 'yote / zote'),
    ('kuu', 'main / chief', 'mkuu', 'wakuu', 'kuu'),
    ('bovu', 'rotten / broken / bad', 'mbovu', 'wabovu', 'mbovu'),
    ('chache', 'few', 'wachache', 'wachache', 'chache'),
    ('moto', 'hot', 'moto', 'moto', 'moto'),
    ('tupu', 'empty / only', 'mtupu', 'watupu', 'tupu'),
]
for stem, en, a, b, c in ADJ:
    tbl = {'verb': f'-{stem} ({en})', 'tense': 'Agreement', 'rows': [
        {'pronoun': 'm/wa one', 'form': a}, {'pronoun': 'm/wa many', 'form': b}, {'pronoun': 'n/n', 'form': c}]}
    add(a, f'"{en}" — m/wa singular agreement (one person / animal).', grammar=['adjective-agreement'], conjugation=tbl)
    add(b, f'"{en}" — m/wa plural agreement (people / animals).', grammar=['adjective-agreement'], conjugation=tbl)
    for cc in c.split(' / '):
        add(cc, f'"{en}" — n/n agreement (things; Kenyans use it for most non-people nouns).', grammar=['adjective-agreement'], conjugation=tbl)
add('mengi', '"many / a lot" — ji/ma agreement (mambo mengi, magari mengi)', sanifu='ji/ma class', grammar=['sanifu-noun-classes'])
add('mingi', '"a lot" — Kenyan all-purpose form (pesa mingi)', sanifu='Sanifu: nyingi (pesa nyingi)', grammar=['adjective-agreement'])
add('kibichi', 'fresh / green', grammar=[])
add('kijani', 'green')
add('bluu', 'blue')
add('manjano', 'yellow')
add('kahawia', 'brown')
add('-a kudumu', 'permanent')

# misc words
MISC = r"""
fanya haraka | hurry up | | imperatives
chap chap | quickly! / chop-chop
kitu kidogo | "something small" — a bribe (euphemism)
pesa taslimu | cash
cash | cash (loanword)
bure | free / for nothing
ghali sana | very expensive | | adjective-agreement
bei nafuu | a fair / affordable price
punguza bei | lower the price | | imperatives
bei ya mwisho | final price (the "last" price)
nini tena | what else?
kitu gani | what thing? / which thing?
kitu ingine | anything else? (Kenyan)
kingine | another (thing) — ki/vi
ingine | other / another (Kenyan all-purpose)
kwanza | first (of all)
mpaka | until / up to
hadi | until / up to
tangu | since
kuhusu | about / concerning
dhidi ya | against
kama kawaida | as usual
kawaida | normal / usual
maalum | special
muhimu | important
sawa sawa | perfectly fine / exactly
sawa na | same as / equal to | | comparatives
tofauti na | different from | | comparatives
kama hii | like this one | | comparatives
zaidi ya | more than | | comparatives
chini ya | less than / under | | comparatives
angalau | at least
kabisa kabisa | absolutely totally
hasa | especially
bila shaka | of course / no doubt
pamoja | together
pamoja na | together with
peke | alone
wenyewe | themselves / the owners
siri | secret
kwa kweli | honestly / really
kwa bahati nzuri | luckily
kwa bahati mbaya | unfortunately
kwa uangalifu | carefully
kwa makini | carefully
kwa sauti | loudly / out loud
kwa kasi | fast / at speed
kwa nguvu | hard / with force
kwa mguu | on foot
kwa miguu | on foot
kwa gari | by car
kwa simu | on the phone
kwa mfano | for example
kwa jumla | in total
hapo hapo | right then / on the spot
hivi hivi | just like that / so-so
hivyo hivyo | in the same way
ndiyo sababu | that's why
nini kimetokea | what happened?
"""
for line in MISC.strip().splitlines():
    parts = [p.strip() for p in line.split('|')]
    key, gloss = parts[0], parts[1]
    san = parts[2] if len(parts) > 2 and parts[2] else None
    gr = [g.strip() for g in parts[3].split(',')] if len(parts) > 3 and parts[3] else []
    add(key, gloss, san, gr)

# loanwords & extras (grown while authoring)
for w, g in [('customer', 'customer (English — sellers call out to you this way)'), ('pili', 'second'), ('popote', 'anywhere / (not) anywhere'),
             ('vizuri', 'well / nicely'), ('tayari', 'ready / already'), ('kasoro', 'minus / to (in time: saa mbili kasoro dakika tano = 7:55)'),
             ('kona', 'corner / bend'), ('rush hour', 'rush hour (English)'), ('boot', 'car boot / trunk (English)'), ('sawa basi', 'okay then'),
             ('fresh', 'fresh (English loanword)'), ('mzima', 'whole / entire / healthy'), ('nzima', 'whole (n/n: saa nzima = a whole hour)'),
             ('yote', 'all / whole (n/n: wikendi yote = the whole weekend)')]:
    add(w, g)
add('mrembo', '"beautiful" (person) — m/wa singular. Plural warembo.', grammar=['adjective-agreement'])
add('warembo', '"beautiful" (people) — m/wa plural.', grammar=['adjective-agreement'])
add('mcheshi', '"funny" (person) — m/wa singular. Plural wacheshi.', grammar=['adjective-agreement'])
add('wacheshi', '"funny" (people) — m/wa plural.', grammar=['adjective-agreement'])
for w, g in [('lete', '"Bring!" — imperative of kuleta (also heard: leta).'), ('leta', '"Bring!" — imperative of kuleta (Kenyan; Sanifu lete).'),
             ('njoo', '"Come!" — irregular imperative of kuja.'), ('njooni', '"Come, you all!" — plural of njoo.'),
             ('nenda', '"Go!" — Sanifu imperative of kwenda. Kenyans often say "enda".'), ('nendeni', '"Go, you all!"'),
             ('enda', '"Go!" — everyday Kenyan imperative of kuenda.'), ('kula', '"Eat!" / "to eat"'), ('kunywa', '"Drink!" / "to drink"')]:
    add(w, g, grammar=['imperatives'])
other('maji', 'water', 'jima', 'maji yangu, maji haya (ma- plural of the ji/ma class)')
other('mafuta', 'oil / fuel / petrol', 'jima', 'mafuta yangu, mafuta haya')
other('maziwa', 'milk', 'jima', 'maziwa haya')
add('kingi', '"much / a lot" — ki/vi agreement (chakula kingi).', sanifu='ki/vi class; Kenyans often say "chakula mingi"', grammar=['sanifu-noun-classes'])
add('viwili', '"two" — ki/vi agreement (vidonge viwili, viti viwili).', sanifu='ki/vi class numbers: kimoja, viwili, vitatu', grammar=['sanifu-noun-classes'])
add('vitatu', '"three" — ki/vi agreement.', grammar=['sanifu-noun-classes'])
for w, g in [('majirani', 'neighbours (plural of jirani)'), ('marafiki', 'friends (plural of rafiki)'), ('viboko', 'hippos (plural of kiboko)'),
             ('muziki', 'music'), ('mpira', 'ball / football'), ('maduka', 'shops'), ('wateja', 'customers')]:
    add(w, g)
for w, g in [('aiii', 'aiii! (mock pain — "you\'re killing me!")'), ('haha', 'haha'), ('sister', 'sister — sellers\' friendly English address for a woman'),
             ('Kampala', 'Kampala — capital of Uganda'), ('Omondi', 'Omondi (name)'), ('aina', 'kind / type'),
             ('aina gani', 'what kind?')]:
    add(w, g)
add('kwenye', '"at / on / in / to" — the all-purpose place word (kwenye meza = on the table).', grammar=['locative-ni'])
add('mwenye', '"the one with / who has" — m/wa singular (mtu mwenye kofia = the person with a hat). Kenyans also use it as "who".', grammar=['relatives'])
add('wenye', '"those with / who have" — m/wa plural.', grammar=['relatives'])
add('yenye', '"which has / with" — n/n singular (nyumba yenye bustani).', grammar=['relatives'])
add('zenye', '"which have / with" — n/n plural.', grammar=['relatives'])
add('vyote', '"all (of them)" — ki/vi agreement (vikapu vyote).', sanifu='ki/vi class; Kenyans often say "zote"', grammar=['sanifu-noun-classes'])
add('kinywaji', 'a drink — ki/vi noun (plural vinywaji).', sanifu='Sanifu: kinywaji changu, vinywaji', grammar=['sanifu-noun-classes'])
add('kitakuja', '"it will come" — ki/vi agreement (chakula kitakuja).', sanifu='ki/vi subject prefix ki-; Kenyans often say "itakuja"', grammar=['sanifu-noun-classes', 'future-ta'])
add('chakula chako', '"your food" — ki/vi agreement, as in Sanifu.', sanifu='Kenyans often say "chakula yako"', grammar=['possessives', 'sanifu-noun-classes'])
add('jina lako', '"your name" — ji/ma agreement (Sanifu).', sanifu='Everyday Kenyan: jina yako', grammar=['possessives', 'sanifu-noun-classes'], override=True)
for w, g in [('hmm', 'hmm…'), ('dari', 'ceiling'), ('kadi', 'card'), ('matairi', 'tyres (plural of tairi)'), ('mbao', 'wood / timber'),
             ('umeme', 'electricity (Sanifu; Kenyans say stima)'), ('stima', 'electricity / power (everyday Kenyan)')]:
    add(w, g)
for w in ['Faith', 'Sarah', 'David', 'Grace', 'Omondi', 'Mary', 'Peter', 'Musa', 'Hassan', 'Mercy', 'Kevin', 'Jane', 'Brian', 'Esther']:
    add(w, f'{w} (name)')
for w, g in [('aaah', 'aaah! (delighted surprise)'), ('aaii', 'aaii! (oh dear)'), ('nesi', 'nurse (from English)'), ('geti', 'gate (Kenyan; Sanifu lango)'),
             ('maana', 'meaning / reason'), ('ndiyo maana', 'that\'s why'), ('mjanja', 'clever / streetwise (with a wink); plural wajanja')]:
    add(w, g)
for w, g in [('ambaye', 'who — relative for one person (m/wa)'), ('ambao', 'who — relative for several people (m/wa)'),
             ('ambayo', 'which / that — n/n singular (Kenyans also use it for most things)'), ('ambazo', 'which / that — n/n plural'),
             ('ambacho', 'which — ki/vi singular (Sanifu)'), ('ambavyo', 'which — ki/vi plural (Sanifu)'), ('ambalo', 'which — ji/ma singular (Sanifu)'),
             ('ambapo', 'where — specific place'), ('ambako', 'where — general place')]:
    add(w, g, grammar=['relatives'])
for w, g in [('yalikuwa', '"they were" — ya- agreement for ma- plurals (maembe, matokeo).'), ('yatakuja', '"they will come" — ya- agreement (matokeo yatakuja).'),
             ('mabichi', '"unripe / raw" — ma- plural agreement (maembe mabichi).'), ('mazuri', '"good" — ma- plural agreement (matunda mazuri).'),
             ('mengine', '"others / some" — ma- plural agreement (maembe mengine).'), ('makubwa', '"big" — ma- plural agreement.'),
             ('yanakuja', '"they are coming" — ya- agreement.')]:
    add(w, g, sanifu='ji/ma plural agreement (ma- nouns). Kenyans keep it for nouns that start with ma-, but say "zi-/-nyingi" for most others.', grammar=['sanifu-noun-classes'])
for w, g in [('hukuwepo', '"you weren\'t there" — hu- + -ku- + -wepo (be present)'), ('nilikuwepo', '"I was there / present"'),
             ('alikuwepo', '"he/she was there"'), ('yupo', '"he/she is present (here)"'), ('nipo', '"I\'m here / present"'), ('upo', '"you are here?"'),
             ('hayupo', '"he/she isn\'t here"'), ('kuwepo', '"to be present / to be there"')]:
    add(w, g, grammar=['ko-location'])
for w, g in [('kabla', 'before'), ('kabla ya', 'before'), ('ahadi', 'promise'), ('ipi', 'which one? (n/n)'), ('iwezekanavyo', 'as … as possible (lit. "the way it is possible")'),
             ('njaa', 'hunger — tuna njaa = we\'re hungry'), ('shabiki', 'fan / supporter (plural mashabiki)'), ('nayo', 'with it (n/n) — "niko nayo" = I have it with me'),
             ('nazo', 'with them (n/n)'), ('naye', 'with him/her'), ('nasi', 'with us'), ('nanyi', 'with you all')]:
    add(w, g)
add('mitano', '"five" — m/mi agreement (miaka mitano).', sanifu='m/mi class numbers: mmoja, miwili, mitatu, mitano', grammar=['sanifu-noun-classes'])
add('miwili', '"two" — m/mi agreement (miaka miwili).', sanifu='m/mi class', grammar=['sanifu-noun-classes'])
add('mitatu', '"three" — m/mi agreement (miaka mitatu).', sanifu='m/mi class', grammar=['sanifu-noun-classes'])
add('kiko', '"it is (at)" — ki/vi agreement (chakula kiko tayari).', sanifu='ki/vi subject ki-; Kenyans often say "iko"', grammar=['sanifu-noun-classes', 'ko-location'])
add('kimefika', '"it has arrived" — ki/vi agreement (chakula kimefika).', sanifu='ki/vi subject ki-; Kenyans often say "imefika"', grammar=['sanifu-noun-classes', 'perfect-me'])
add('kizuri', '"good" — ki/vi agreement (kitu kizuri).', sanifu='ki/vi class; Kenyans often say "kitu nzuri"', grammar=['sanifu-noun-classes'])
add('zuri', '"good" — ji/ma singular agreement (jibu zuri, wazo zuri).', sanifu='ji/ma class', grammar=['sanifu-noun-classes'])
add('kibaya', '"bad" — ki/vi agreement.', sanifu='ki/vi class', grammar=['sanifu-noun-classes'])
for w, g in [('Tusker', 'Tusker — Kenya\'s best-known beer'), ('bidii', 'effort / diligence — kwa bidii = hard, diligently'), ('halisi', 'genuine / real'),
             ('mchango', 'contribution (m/mi; plural michango)'), ('mchezaji', 'player (m/wa; plural wachezaji)'), ('msimu', 'season (m/mi)'),
             ('offside', 'offside (English)'), ('zamu', 'turn — ni zamu yako = it\'s your turn'), ('kwa bidii', 'hard / diligently')]:
    add(w, g)
add('kile', '"that (thing)" — ki/vi demonstrative; also "what" in "kile anachoweza" (what he can).', sanifu='ki/vi class', grammar=['demonstratives', 'sanifu-noun-classes'])
add('anachoweza', '"what he/she can" — a- + -na- + -cho- (which, ki/vi) + -weza.', sanifu='ki/vi relative -cho-', grammar=['relatives'])
for w, g in [('sijawahi', '"I have never…" — si- + -ja- + -wahi: with a ku- verb, -wahi means "ever"'), ('hujawahi', '"You have never…"'),
             ('hajawahi', '"He/she has never…"'), ('hatujawahi', '"We have never…"'), ('hawajawahi', '"They have never…"'),
             ('umewahi', '"Have you ever…?" — u- + -me- + -wahi'), ('nimewahi', '"I have (once / before)…" — or, alone: "I made it on time"'),
             ('amewahi', '"He/she has (before)…"'), ('wamewahi', '"They have (before)…"'), ('tumewahi', '"We have (before)…"'),
             ('usiwahi', '"Never (ever)…!" — negative command'), ('sitawahi', '"I will never…"'), ('hutawahi', '"You will never…"')]:
    add(w, g, grammar=['wahi-ever-never'])
add('usijali', '"Don\'t worry" — u- + -si- + -jali (care, mind)', grammar=['subjunctive'], override=True)
add('nikiwa', '"(while) I am / being" — ni- + -ki- + -wa. Tangu nikiwa mtoto = since I was a child.', grammar=['ki-po-ka'])
for w, g in [('mwezi uliopita', 'last month (lit. "the month which passed")'), ('mwaka uliopita', 'last year'), ('uchaguzi uliopita', 'the last election'),
             ('wakati ulitupa kisogo', '"time was up" — lit. "time turned the back of its head (on us)"'),
             ('wakati umetupa kisogo', '"time\'s up" — lit. "time has turned the back of its head (on us)"')]:
    add(w, g, grammar=['idioms-proverbs'] if 'kisogo' in w else ['relatives'])
