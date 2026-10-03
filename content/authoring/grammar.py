"""Grammar explainer library → content/grammar/topics.json

Blocks: ('p', text) paragraph · ('list', [items]) · ('table', caption, headers, rows) · ('tip', text) · ('sanifu', text)
Inline: **bold**, *italic*.  House rule: m/wa and n/n are the standard; other noun classes only appear
in 'sanifu' look-up notes.
"""
import json
import sys

T = []


def topic(slug, level, title, sw, summary, blocks, examples, related=(), tags=()):
    out = []
    for b in blocks:
        kind = b[0]
        if kind == 'p':
            out.append({'type': 'p', 'text': b[1]})
        elif kind == 'list':
            out.append({'type': 'list', 'items': b[1]})
        elif kind == 'table':
            out.append({'type': 'table', 'caption': b[1], 'headers': b[2], 'rows': b[3]})
        elif kind in ('tip', 'sanifu'):
            out.append({'type': kind, 'text': b[1]})
    T.append({'slug': slug, 'level': level, 'title': title, 'swahiliTitle': sw, 'summary': summary, 'blocks': out,
              'examples': [{'swahili': e[0], 'english': e[1], **({'note': e[2]} if len(e) > 2 else {})} for e in examples],
              'related': list(related), 'tags': list(tags)})


PERS = ['I', 'you', 'he / she', 'we', 'you all', 'they']

# ======================= LEVEL 1 =======================
topic('kenyan-vs-sanifu', 1, 'Kenyan Swahili vs Sanifu', 'Kiswahili cha Kenya na Sanifu',
      'Why this app teaches the Swahili people actually speak in Nairobi — and where the "Sanifu" look-ups come in.',
      [('p', '**Sanifu** ("standard") is the Swahili of textbooks, Tanzanian schools and the news. **Kenyan Swahili** is what you hear on the matatu, at the kibanda and in the office: the same language, but faster, more relaxed, and simplified in a few predictable ways.'),
       ('p', 'The biggest simplification is in **noun classes**. Sanifu has around 15 of them, each with its own agreement. Everyday Kenyan speech leans on just two: **m/wa** for people and animals, and **n/n** for nearly everything else. That\'s why you\'ll hear *gari yangu* (my car) and *kitabu hii* (this book) in Nairobi, where Sanifu says *gari langu* and *kitabu hiki*.'),
       ('table', 'The same sentence, two registers', ['Kenyan (what you\'ll hear)', 'Sanifu (what\'s "correct")', 'English'],
        [['Jina yangu ni John.', 'Jina langu ni John.', 'My name is John.'], ['Kiti ya mbele iko na mtu.', 'Kiti cha mbele kina mtu.', 'The front seat is taken.'],
         ['Naenda tao.', 'Ninakwenda mjini.', 'I\'m going to town.'], ['Gari yangu imeharibika.', 'Gari langu limeharibika.', 'My car has broken down.']]),
       ('tip', 'Kabisa teaches the **Kenyan form first** and shows the Sanifu form as a "good to know" look-up. Look for **Sanifu** in the word tooltips and vocabulary lists.'),
       ('p', 'Both are understood everywhere in Kenya. Sanifu sounds educated and a bit formal; Kenyan sounds natural and friendly. If you aim to be understood on the street — not to pass a Tanzanian exam — Kenyan first is the right call.')],
      [('Niko poa.', 'I\'m fine.', 'Kenyan — Sanifu would say Sijambo / Niko salama.'), ('Naenda kazini.', 'I\'m going to work.', 'na- is short for nina-.'),
       ('Chakula itakuja.', 'The food will come.', 'Sanifu: chakula kitakuja (ki/vi).')],
      related=['noun-classes-mwa-nn', 'sanifu-noun-classes'], tags=['basics'])

topic('greetings', 1, 'Greetings: Mambo, Habari, Hujambo', 'Salamu',
      'Who you greet decides how you greet. Casual, polite and traditional greetings — and the right answer to each.',
      [('p', 'In Kenya you always greet before anything else. There are three families of greetings, and each has a fixed answer:'),
       ('table', 'Greeting → answer', ['Greeting', 'Answer', 'When'],
        [['Mambo? / Mambo vipi?', 'Poa! / Fiti!', 'Casual: friends, young people'], ['Niaje? / Vipi? / Sasa?', 'Poa! / Fiti sana!', 'Very casual, Nairobi'],
         ['Uko aje? / Uko poa?', 'Niko poa. / Niko fiti.', 'Casual "how are you?"'], ['Habari? / Habari yako?', 'Nzuri. / Salama.', 'Polite — anyone, any time'],
         ['Habari ya asubuhi?', 'Nzuri (sana).', 'Good morning (polite)'], ['Hujambo?', 'Sijambo.', 'Traditional / coastal'],
         ['Shikamoo!', 'Marahaba.', 'Respectful greeting to an elder']]),
       ('tip', 'Every "Habari…?" is answered with **Nzuri** — even on a terrible day. The real news comes *after* the greeting.'),
       ('p', 'To several people, the casual greetings switch to plural: **Mko aje?** → **Tuko poa.** Traditional: **Hamjambo?** → **Hatujambo.**'),
       ('p', 'Goodbyes: **Kwa heri** (one person), **Kwaherini** (several), **Tuonane baadaye** (see you later), **Tutaonana** (see you).'),
       ('sanifu', '"Jambo!" is mostly said to tourists. Kenyans rarely use it with each other — try "Mambo?" or "Habari?" instead.')],
      [('Mambo? — Poa!', 'What\'s up? — Cool!'), ('Habari ya asubuhi? — Nzuri sana.', 'Good morning? — Very good.'),
       ('Uko aje? — Niko fiti.', 'How are you? — I\'m good.'), ('Hamjambo? — Hatujambo.', 'How are you all? — We\'re fine.')],
      related=['ko-location', 'question-words'], tags=['basics', 'phrases'])

topic('subject-prefixes', 1, 'Subject Prefixes: ni-, u-, a-, tu-, m-, wa-', 'Viambishi vya nafsi',
      'Every Swahili verb starts with a prefix that tells you WHO is doing it.',
      [('p', 'Swahili verbs are built like Lego. The first brick is the **subject prefix** — it does the job of English "I, you, he…". You often don\'t need the separate pronoun (mimi, wewe…) at all: *Ninaenda* already means "I am going".'),
       ('table', 'People (m/wa)', ['Person', 'Pronoun', 'Prefix', 'Example (go)'],
        [['I', 'mimi', 'ni-', 'ninaenda'], ['you', 'wewe', 'u-', 'unaenda'], ['he / she', 'yeye', 'a-', 'anaenda'],
         ['we', 'sisi', 'tu-', 'tunaenda'], ['you all', 'nyinyi', 'm-', 'mnaenda'], ['they', 'wao', 'wa-', 'wanaenda']]),
       ('table', 'Things (n/n)', ['Subject', 'Prefix', 'Example'], [['it (one thing)', 'i-', 'Matatu inaenda Kencom.'], ['they (things)', 'zi-', 'Matatu zinaenda Kencom.']]),
       ('tip', 'There is no "he" vs "she" in Swahili — **a-** covers both. Context does the work.'),
       ('p', 'The pronouns (mimi, wewe, yeye…) are used for emphasis or contrast: *Mimi ninaenda, wewe unabaki* — **I**\'m going, **you**\'re staying.')],
      [('Ninatoka Uganda.', 'I\'m from Uganda.'), ('Unaenda wapi?', 'Where are you going?'), ('Wanaishi Kampala.', 'They live in Kampala.'),
       ('Bei inapanda.', 'The price is going up.', 'i- because bei is an n/n noun.')],
      related=['present-na', 'noun-classes-mwa-nn'], tags=['verbs', 'basics'])

topic('present-na', 1, 'Present Tense -na-', 'Wakati uliopo: -na-',
      'Subject + -na- + verb = what\'s happening now (or generally). Kenyans often squeeze ni-na- into na-.',
      [('p', 'The present tense formula is: **subject prefix + -na- + verb stem**.'),
       ('table', 'kuenda (to go)', ['Person', 'Form', 'English'],
        [['I', 'ninaenda (naenda)', 'I am going'], ['you', 'unaenda', 'you are going'], ['he / she', 'anaenda', 'he/she is going'],
         ['we', 'tunaenda', 'we are going'], ['you all', 'mnaenda', 'you all are going'], ['they', 'wanaenda', 'they are going']]),
       ('p', 'It covers both "I am going" and "I go": *Ninafanya kazi Safaricom* = I work at Safaricom.'),
       ('tip', '**Kenyan shortcut:** ni-na- becomes **na-** in everyday speech: *naenda, nataka, naomba, naelewa*. You\'ll hear this far more than the full form.'),
       ('p', 'Short verbs like **kula** (eat), **kunywa** (drink) and **kuja** (come) keep their **ku-**: *ninakula, unakunywa, anakuja*.'),
       ('sanifu', 'Sanifu uses **kwenda** for "to go" (ninakwenda); Kenyans say **kuenda** (ninaenda / naenda).')],
      [('Nataka chai.', 'I want tea.'), ('Unaenda wapi?', 'Where are you going?'), ('Tunaenda Westlands.', 'We\'re going to Westlands.'),
       ('Anakula chapati.', 'He/she is eating chapati.', 'kula keeps its ku-.')],
      related=['subject-prefixes', 'negative-present', 'future-ta'], tags=['verbs', 'tenses'])

topic('ko-location', 1, '-ko: Being Somewhere (Niko, Uko, Iko)', 'Mahali: -ko',
      '-ko means "be at a place" — and in Kenya, also "how you\'re doing" (Niko poa).',
      [('p', 'Use **-ko** for where someone or something is. It takes the subject prefix directly — no tense marker.'),
       ('table', 'Present', ['Who', 'Form', 'Negative'],
        [['I', 'niko', 'siko'], ['you', 'uko', 'hauko'], ['he / she', 'yuko', 'hayuko'], ['we', 'tuko', 'hatuko'],
         ['you all', 'mko', 'hamko'], ['they', 'wako', 'hawako'], ['it (n/n)', 'iko', 'haiko'], ['they (n/n)', 'ziko', 'haziko']]),
       ('p', '**Location:** *Uko wapi?* — Where are you? *Niko Westlands Mall.* — I\'m at Westlands Mall. *Stage iko wapi?* — Where is the stage?'),
       ('p', '**How you are:** *Uko aje? — Niko poa.* (How are you? — I\'m fine.)'),
       ('tip', 'Kenyans also use **-ko na** for "have": *Uko na pesa?* (Do you have money?) — Sanifu prefers *Una pesa?*'),
       ('sanifu', 'Kenyans often shorten yuko to **ako**: *Ako wapi?* (Where is he?). Sanifu: *Yuko wapi?*')],
      [('Niko hapa.', 'I\'m here.'), ('Dereva yuko wapi?', 'Where is the driver?'), ('Matatu ziko pale.', 'The matatus are over there.'),
       ('Hayuko nyumbani.', 'He/she isn\'t at home.')],
      related=['ni-copula', 'na-have', 'greetings'], tags=['verbs'])

topic('ni-copula', 1, 'Ni and Si: "Is" and "Is Not"', 'Ni / Si',
      'Ni (is, am, are) never changes. Si is its negative. Use -ko for location instead.',
      [('p', '**Ni** links two things: *Mimi ni John* (I am John), *Hii ni chai* (this is tea). It\'s the same for every person and every number.'),
       ('p', '**Si** is the negative: *Si mbali* (it\'s not far), *Mimi si dereva* (I\'m not the driver). Kenyans often say **sio**: *Sio mbali*.'),
       ('table', 'Ni vs -ko vs -na', ['Meaning', 'Swahili', 'Example'],
        [['is / am / are (identity)', 'ni', 'Yeye ni mwalimu. — She is a teacher.'], ['is (at a place)', '-ko', 'Yuko shuleni. — She is at school.'],
         ['has', '-na', 'Ana gari. — She has a car.']]),
       ('tip', '**Si …?** at the start of a sentence makes a friendly suggestion: *Si tukutane kesho?* — Why don\'t we meet tomorrow?'),
       ('p', '**Ndiyo / ndio** works like an emphatic "it is": *Ndiyo hii* — this is the one / here it is.')],
      [('Mimi ni Mkenya.', 'I am Kenyan.'), ('Si mbali.', 'It\'s not far.'), ('Hii ni bei ya mwisho.', 'This is the final price.'),
       ('Ni kweli.', 'It\'s true.')],
      related=['ko-location', 'na-have'], tags=['basics'])

topic('question-words', 1, 'Question Words: Wapi, Nini, Nani, Gani…', 'Maswali',
      'Swahili question words usually go at the END of the sentence — right where the answer would be.',
      [('table', 'The essentials', ['Word', 'Meaning', 'Example'],
        [['wapi?', 'where?', 'Unaenda wapi?'], ['nini?', 'what?', 'Unataka nini?'], ['nani?', 'who?', 'Jina yako ni nani?'],
         ['gani?', 'which / what kind?', 'Bei gani? · Upande gani?'], ['ngapi?', 'how many / how much?', 'Nauli ni ngapi?'],
         ['lini?', 'when?', 'Ulianza lini?'], ['vipi? / aje?', 'how?', 'Uko aje? · Mambo vipi?'], ['kwa nini?', 'why?', 'Kwa nini umechelewa?'],
         ['mbona?', 'how come? (surprise)', 'Mbona hujaja?'], ['-je (suffix)', 'how?', 'Ulikujaje? — How did you come?']]),
       ('p', 'Word order stays the same as a statement: *Unaenda Westlands* (you\'re going to Westlands) → *Unaenda wapi?* (you\'re going where?).'),
       ('tip', '**Je, …?** at the start turns any statement into a yes/no question: *Je, una chenji?* — Do you have change? In speech, rising intonation alone does the same.'),
       ('sanifu', 'Ngapi agrees with the noun in Sanifu (*watu wangapi, miti mingapi*). Kenyans mostly use plain **ngapi** for everything except people (wangapi).')],
      [('Jina yako ni nani?', 'What\'s your name?', 'Lit. "your name is who?"'), ('Stage iko wapi?', 'Where is the stage?'),
       ('Saa ngapi?', 'What time?'), ('Wikendi ilikuwaje?', 'How was the weekend?', '-je = how?')],
      related=['greetings', 'numbers-money'], tags=['basics'])

topic('noun-classes-mwa-nn', 1, 'Our Two Noun Classes: m/wa and n/n', 'Ngeli: m/wa na n/n',
      'Swahili nouns come in classes that control agreement. Kabisa uses two as the standard: m/wa (people) and n/n (things).',
      [('p', 'Every Swahili noun belongs to a **class**, and the class decides the prefixes on verbs, adjectives and possessives that go with it. Sanifu has many classes — but Kenyan everyday speech runs on two:'),
       ('table', 'm/wa — people & animals', ['', 'One', 'Many'],
        [['noun', 'mtoto (child)', 'watoto'], ['verb', 'mtoto anacheza', 'watoto wanacheza'], ['adjective', 'mtoto mdogo', 'watoto wadogo'],
         ['possessive', 'mtoto wangu', 'watoto wangu'], ['this / these', 'mtoto huyu', 'watoto hawa']]),
       ('table', 'n/n — things (same word for one and many)', ['', 'One', 'Many'],
        [['noun', 'nyumba (house)', 'nyumba'], ['verb', 'nyumba inauzwa', 'nyumba zinauzwa'], ['adjective', 'nyumba kubwa', 'nyumba kubwa'],
         ['possessive', 'nyumba yangu', 'nyumba zangu'], ['this / these', 'nyumba hii', 'nyumba hizi']]),
       ('p', 'Animals are nouns of many shapes (simba, mbwa, kiboko) but **always take m/wa agreement** because they\'re living: *simba anakula*, *mbwa wangu*.'),
       ('tip', '**The Kenyan rule of thumb:** if it\'s a person or animal → m/wa. Anything else → treat it as n/n (i-/zi-, yangu/zangu, hii/hizi). You\'ll be understood everywhere.'),
       ('sanifu', 'Nouns like **kitabu, gari, mti, ukuta** belong to other classes in Sanifu (ki/vi, ji/ma, m/mi, u/n). Tap a word\'s **Sanifu** note to see its standard agreement — or open "Other Noun Classes".')],
      [('Mtoto wangu anacheza.', 'My child is playing.'), ('Watoto wangu wanacheza.', 'My children are playing.'),
       ('Nyumba hii ni kubwa.', 'This house is big.'), ('Nyumba hizi ni kubwa.', 'These houses are big.')],
      related=['sanifu-noun-classes', 'adjective-agreement', 'possessives', 'demonstratives'], tags=['nouns', 'basics'])

# ======================= LEVEL 2 =======================
topic('negative-present', 2, 'Negative Present: si- … -i', 'Ukanushaji: wakati uliopo',
      'To say "I don\'t…", swap the subject prefix for its negative, drop -na-, and change the final -a to -i.',
      [('p', 'Three changes turn *ninataka* (I want) into *sitaki* (I don\'t want):'),
       ('list', ['Use the **negative subject prefix** (si-, hu-, ha-…)', 'Drop **-na-**', 'Change the final **-a → -i**']),
       ('table', 'kutaka (to want)', ['Person', 'Positive', 'Negative'],
        [['I', 'ninataka', 'sitaki'], ['you', 'unataka', 'hutaki'], ['he / she', 'anataka', 'hataki'], ['we', 'tunataka', 'hatutaki'],
         ['you all', 'mnataka', 'hamtaki'], ['they', 'wanataka', 'hawataki'], ['it (n/n)', 'inataka', 'haitaki'], ['they (n/n)', 'zinataka', 'hazitaki']]),
       ('p', 'Verbs that don\'t end in -a (borrowed from Arabic) keep their ending: *sifikiri* (I don\'t think), *sijali* (I don\'t care).'),
       ('tip', 'The three you\'ll use every day: **Sijui** (I don\'t know), **Sielewi** (I don\'t understand), **Sitaki** (I don\'t want).')],
      [('Sijui.', 'I don\'t know.'), ('Sitaki sukuma leo.', 'I don\'t want sukuma today.'), ('Hawaishi Nairobi.', 'They don\'t live in Nairobi.'),
       ('Haifai.', 'It\'s not suitable.')],
      related=['present-na', 'na-have', 'negative-past'], tags=['verbs', 'negation'])

topic('na-have', 2, 'Nina / Sina: Having (and "There Is")', 'Kuwa na',
      'Swahili "have" is literally "be with": ni- + -na. Kuna = there is; hakuna = there isn\'t.',
      [('table', '-na (have)', ['Person', 'Have', 'Don\'t have'],
        [['I', 'nina', 'sina'], ['you', 'una', 'huna'], ['he / she', 'ana', 'hana'], ['we', 'tuna', 'hatuna'], ['you all', 'mna', 'hamna'],
         ['they', 'wana', 'hawana'], ['it (n/n)', 'ina', 'haina'], ['they (n/n)', 'zina', 'hazina']]),
       ('p', '**Kuna** = there is / there are (lit. "the place has"): *Kuna foleni* — there\'s traffic. **Hakuna** = there isn\'t: *Hakuna shida* — no problem.'),
       ('p', 'In other tenses, use **kuwa na** (to be with): *nilikuwa na* (I had), *nitakuwa na* (I will have), *ningekuwa na* (if I had).'),
       ('tip', 'Kenyans often say **-ko na** instead: *Uko na chenji?* (Do you have change?), *Ako na gari* (She has a car). Sanifu: *Una chenji? Ana gari.*'),
       ('p', '**Haina shida / Hakuna shida / Hamna shida** — all "no problem". You\'ll hear them a hundred times a day.')],
      [('Nina watoto wawili.', 'I have two children.'), ('Sina pesa taslimu.', 'I don\'t have cash.'), ('Kuna nafasi.', 'There\'s space.'),
       ('Kulikuwa na ajali.', 'There was an accident.')],
      related=['ko-location', 'negative-present'], tags=['verbs'])

topic('possessives', 2, 'Possessives: Wangu, Yangu, Zangu', 'Vimilikishi',
      'my, your, his… = -angu, -ako, -ake, -etu, -enu, -ao, with a prefix that agrees with the THING owned.',
      [('p', 'The ending tells you **who owns** it; the first letter agrees with **what is owned**.'),
       ('table', 'Our two standard sets', ['', 'm/wa (people)', 'n/n one', 'n/n many'],
        [['my', 'wangu', 'yangu', 'zangu'], ['your', 'wako', 'yako', 'zako'], ['his / her', 'wake', 'yake', 'zake'],
         ['our', 'wetu', 'yetu', 'zetu'], ['your (pl.)', 'wenu', 'yenu', 'zenu'], ['their', 'wao', 'yao', 'zao']]),
       ('p', '*Mtoto wangu* (my child), *watoto wangu* (my children), *nyumba yangu* (my house), *nyumba zangu* (my houses).'),
       ('tip', '**Family words** (mama, baba, dada, kaka, nyanya) take the n/n form even though they\'re people: *mama yangu, dada yake*. And Kenyans use **yangu** for most things: *jina yangu, gari yangu, simu yangu*.'),
       ('p', 'Contractions are everywhere: **mamangu** (my mum), **babako** (your dad), **dadake** (his/her sister), **mwenzangu** (my colleague). And **kwangu / kwako / kwetu** = my place / your place / our home.'),
       ('p', '**Of** works the same way: *mtoto wa Kamau* (m/wa), *nyumba ya Kamau* (n/n), *habari za asubuhi* (n/n plural).'),
       ('sanifu', 'Sanifu: *jina **langu***, *gari **langu*** (ji/ma), *kitabu **changu*** (ki/vi), *mti **wangu*** (m/mi). See "Other Noun Classes".')],
      [('Huyu ni mke wangu.', 'This is my wife.'), ('Jina yangu ni John.', 'My name is John.', 'Sanifu: jina langu'),
       ('Familia yako ni kubwa!', 'Your family is big!'), ('Njoo kwangu.', 'Come to my place.')],
      related=['noun-classes-mwa-nn', 'sanifu-noun-classes', 'demonstratives'], tags=['nouns'])

topic('demonstratives', 2, 'This & That: Huyu, Hii, Yule, Ile', 'Vionyeshi',
      'Three distances (here / near you / over there), agreeing with m/wa or n/n.',
      [('table', 'This / that', ['', 'm/wa one', 'm/wa many', 'n/n one', 'n/n many'],
        [['this (here)', 'huyu', 'hawa', 'hii', 'hizi'], ['that (near you / just mentioned)', 'huyo', 'hao', 'hiyo', 'hizo'],
         ['that (over there)', 'yule', 'wale', 'ile', 'zile']]),
       ('p', 'They usually come **after** the noun: *mtu huyu* (this person), *nyumba ile* (that house). Before the noun they add emphasis: *huyu mtu* — THIS guy.'),
       ('p', '**Hii hapa / Hizi hapa** = here it is / here they are (handing something over).'),
       ('tip', '**Hii** is Kenya\'s all-purpose "this": *gari hii, kitabu hii, chakula hii*. Sanifu would say gari hili, kitabu hiki, chakula hiki.'),
       ('sanifu', 'Other Sanifu forms: ki/vi **hiki / hivi**, ji/ma **hili / haya**, m/mi **huu / hii**, u **huu**.')],
      [('Huyu ni Baraka.', 'This is Baraka.'), ('Hawa ni watoto wangu.', 'These are my children.'), ('Nyanya hizi ni tamu.', 'These tomatoes are sweet.'),
       ('Yule mdogo ni Grace.', 'That little one is Grace.')],
      related=['noun-classes-mwa-nn', 'possessives'], tags=['nouns'])

topic('numbers-money', 2, 'Numbers & Money', 'Hesabu na pesa',
      'Counting, prices, and Nairobi money slang (bob, punch, thao).',
      [('table', '1–10', ['Number', 'Swahili', 'For people (m/wa)'],
        [['1', 'moja', 'mmoja'], ['2', 'mbili', 'wawili'], ['3', 'tatu', 'watatu'], ['4', 'nne', 'wanne'], ['5', 'tano', 'watano'],
         ['6', 'sita', 'sita'], ['7', 'saba', 'saba'], ['8', 'nane', 'wanane'], ['9', 'tisa', 'tisa'], ['10', 'kumi', 'kumi']]),
       ('table', 'Bigger numbers', ['Number', 'Swahili'],
        [['20', 'ishirini'], ['30', 'thelathini'], ['40', 'arobaini'], ['50', 'hamsini'], ['60', 'sitini'], ['70', 'sabini'], ['80', 'themanini'],
         ['90', 'tisini'], ['100', 'mia moja'], ['1,000', 'elfu moja']]),
       ('p', 'Numbers join with **na**: 250 = *mia mbili na hamsini*; 1,500 = *elfu moja mia tano*.'),
       ('p', '**People** take wa- numbers: *watoto wawili* (two children). **Things** (n/n) use the plain form: *nyumba mbili, chapati tatu*.'),
       ('tip', 'Market slang: **bob** = shillings (mia tano bob), **punch** = 500, **thao** = 1,000. Asking prices: **Bei gani?** / **Ni pesa ngapi?** / **Ngapi?**'),
       ('sanifu', 'In Sanifu, numbers agree with every class: *viti viwili* (ki/vi), *miti miwili* (m/mi), *magari mawili* (ji/ma).')],
      [('Tatu kwa mia moja.', 'Three for a hundred.'), ('Ni mia mbili na hamsini.', 'It\'s 250.'), ('Nina watoto wawili.', 'I have two children.'),
       ('Nauli ni ngapi?', 'How much is the fare?')],
      related=['question-words', 'time-swahili'], tags=['vocab'])

topic('sanifu-noun-classes', 2, 'Other Noun Classes (Sanifu Look-up)', 'Ngeli nyingine',
      'A reference for the classes Kenyans mostly flatten into n/n: ki/vi, ji/ma, m/mi, u/n and the place classes.',
      [('p', 'Kabisa uses m/wa and n/n everywhere. This page is your **look-up** for when you meet a Sanifu form — on the news, in a book, or from a teacher.'),
       ('table', 'Sanifu agreement at a glance', ['Class', 'Example (one / many)', 'my', 'this', 'verb ("is coming")'],
        [['ki/vi', 'kitabu / vitabu', 'changu / vyangu', 'hiki / hivi', 'kinakuja / vinakuja'],
         ['ji/ma', 'gari / magari', 'langu / yangu', 'hili / haya', 'linakuja / yanakuja'],
         ['m/mi', 'mti / miti', 'wangu / yangu', 'huu / hii', 'unakuja / inakuja'],
         ['u/n', 'ukuta / kuta', 'wangu / zangu', 'huu / hizi', 'unakuja / zinakuja'],
         ['ku (verbs as nouns)', 'kusoma', 'kwangu', 'huku', 'kunasaidia'],
         ['pa / ku / mu (place)', 'mahali', 'pangu', 'hapa', 'pana / kuna / mna']]),
       ('table', 'What Kenyans usually say instead', ['Sanifu', 'Everyday Kenyan', 'English'],
        [['kitabu changu', 'kitabu yangu', 'my book'], ['gari hili', 'gari hii', 'this car'], ['chakula kitakuja', 'chakula itakuja', 'the food will come'],
         ['kiti cha mbele', 'kiti ya mbele', 'the front seat'], ['magari mawili', 'gari mbili', 'two cars']]),
       ('tip', 'Some Sanifu agreements survive in Kenyan speech for very common words: **maji mengi** (lots of water), **matokeo yatakuja** (results will come), **vidonge viwili** (two tablets), **mtaa wetu** (our neighbourhood).'),
       ('p', 'Tap any word marked **Sanifu** in a lesson to see its standard class and agreement.')],
      [('Kitabu changu kiko mezani.', 'My book is on the table.', 'Sanifu ki/vi. Kenyan: kitabu yangu iko kwa meza.'),
       ('Gari langu limeharibika.', 'My car has broken down.', 'Sanifu ji/ma. Kenyan: gari yangu imeharibika.'),
       ('Mti huu ni mrefu.', 'This tree is tall.', 'Sanifu m/mi. Kenyan: mti hii ni ndefu.')],
      related=['noun-classes-mwa-nn', 'kenyan-vs-sanifu', 'possessives'], tags=['nouns', 'reference'])

# ======================= LEVEL 3 =======================
topic('future-ta', 3, 'Future Tense -ta-', 'Wakati ujao: -ta-',
      'Swap -na- for -ta- and you\'re in the future. Negative: si-ta-, hu-ta-, ha-ta-…',
      [('table', 'kulipa (to pay)', ['Person', 'Future', 'Negative future'],
        [['I', 'nitalipa', 'sitalipa'], ['you', 'utalipa', 'hutalipa'], ['he / she', 'atalipa', 'hatalipa'], ['we', 'tutalipa', 'hatutalipa'],
         ['you all', 'mtalipa', 'hamtalipa'], ['they', 'watalipa', 'hawatalipa'], ['it (n/n)', 'italipa', 'haitalipa']]),
       ('p', 'The negative future keeps **-ta-** and the final **-a**: *sitaenda* (I won\'t go).'),
       ('p', 'Short verbs keep **ku-**: *nitakula* (I\'ll eat), *utakuja?* (will you come?), *nitakunywa* (I\'ll drink).'),
       ('tip', 'Kenyans often use the plain present for planned future: *Kesho naenda Naivasha* — Tomorrow I\'m going to Naivasha.'),
       ('p', '**Nitakuwa** = I will be: *Nitakuwa tayari* (I\'ll be ready), *Nitakuwa na pesa* (I\'ll have money).')],
      [('Nitashuka Kencom.', 'I\'ll get off at Kencom.'), ('Utakula nini?', 'What will you eat?'), ('Tutaonana Jumamosi.', 'See you on Saturday.'),
       ('Sitachelewa.', 'I won\'t be late.')],
      related=['present-na', 'past-li', 'subjunctive'], tags=['verbs', 'tenses'])

topic('imperatives', 3, 'Commands: Panda! Shuka! Njoo!', 'Amri',
      'The bare verb stem is a command. Add -eni for several people. Use usi-…-e for "don\'t".',
      [('table', 'Commands', ['Infinitive', 'To one person', 'To several', 'Don\'t!'],
        [['kupanda (get in)', 'Panda!', 'Pandeni!', 'Usipande!'], ['kushuka (get off)', 'Shuka!', 'Shukeni!', 'Usishuke!'],
         ['kusimama (stop)', 'Simama!', 'Simameni!', 'Usisimame!'], ['kungoja (wait)', 'Ngoja!', 'Ngojeni!', 'Usingoje!']]),
       ('table', 'Irregular ones', ['Verb', 'One', 'Several'],
        [['kuja (come)', 'Njoo!', 'Njooni!'], ['kuenda / kwenda (go)', 'Enda! (Kenyan) / Nenda! (Sanifu)', 'Nendeni!'],
         ['kuleta (bring)', 'Lete! / Leta!', 'Leteni!'], ['kula (eat)', 'Kula!', 'Kuleni!'], ['kunywa (drink)', 'Kunywa!', 'Kunyweni!']]),
       ('p', 'To include **me / him / them**, use the object prefix and end in **-e**: *Nipe!* (give me), *Niletee chai* (bring me tea), *Mwambie* (tell him).'),
       ('tip', 'A bare command is normal in a matatu or at a stall. For more politeness add **tafadhali** or use the subjunctive: *Uniletee chai, tafadhali* — see "Polite Requests".')],
      [('Panda haraka!', 'Get in quickly!'), ('Simama hapa, nashuka!', 'Stop here, I\'m getting off!'), ('Niletee chai.', 'Bring me tea.'),
       ('Usisahau!', 'Don\'t forget!')],
      related=['subjunctive', 'polite-requests', 'object-infixes'], tags=['verbs'])

topic('helper-verbs', 3, 'Helper Verbs: Weza, Taka, Lazima, Inabidi', 'Vitenzi visaidizi',
      'Can, want to, must, have to — followed by an infinitive (ku-) or a subjunctive.',
      [('table', 'Pattern', ['Meaning', 'Swahili', 'Next verb', 'Example'],
        [['can', '-weza', 'ku- infinitive', 'Naweza kupata chai? — Can I get tea?'], ['want to', '-taka', 'ku- infinitive', 'Nataka kulala. — I want to sleep.'],
         ['like to', '-penda', 'ku- infinitive', 'Napenda kusoma. — I like reading.'], ['must', 'lazima', 'subjunctive', 'Lazima tuondoke. — We must leave.'],
         ['it\'s necessary / have to', 'inabidi', 'subjunctive', 'Inabidi niende. — I have to go.'], ['better', 'afadhali / heri', 'subjunctive or ku-', 'Afadhali uende. — You\'d better go.']]),
       ('p', 'Negatives: *siwezi* (I can\'t), *hawezi* (he can\'t), *sitaki kuenda* (I don\'t want to go), *si lazima* (it\'s not necessary).'),
       ('tip', '**Naweza…?** is the easiest polite way to ask for anything: *Naweza kulipa kwa M-Pesa?* — Can I pay with M-Pesa?')],
      [('Unaweza kunisaidia?', 'Can you help me?'), ('Fundi hawezi kuitengeneza.', 'The mechanic can\'t fix it.'), ('Lazima uchukue risiti.', 'You must take a receipt.'),
       ('Inabidi tumwambie.', 'We\'ll have to tell him.')],
      related=['infinitive-ku', 'subjunctive'], tags=['verbs'])

topic('infinitive-ku', 3, 'The Infinitive: ku- and kuto-', 'Kitenzi-jina',
      'ku- + stem = "to …" (and "…-ing" as a noun). kuto- = "not to".',
      [('p', 'Dictionary forms start with **ku-**: *kuenda* (to go), *kula* (to eat), *kufanya* (to do). The infinitive also works as a noun: *Kusoma ni muhimu* — Reading is important.'),
       ('p', 'Object prefixes go between ku- and the stem: *kunisaidia* (to help me), *kukuona* (to see you), *kumsalimia* (to greet him).'),
       ('p', '**kuto-** makes it negative: *kutoelewa* (not understanding / misunderstanding), *kutokuwa na pesa* (not having money).'),
       ('tip', 'After **kwa** it means "for …-ing": *Asante kwa kunisaidia* — Thanks for helping me.')],
      [('Naweza kupata maharagwe?', 'Can I get beans?'), ('Asante kwa kuniwekea.', 'Thanks for keeping it for me.'), ('Kutokuwa na pesa si aibu.', 'Not having money is no shame.')],
      related=['helper-verbs', 'object-infixes'], tags=['verbs'])

topic('time-swahili', 3, 'Telling Time: Swahili Hours', 'Saa za Kiswahili',
      'The Swahili day starts at sunrise: 7 a.m. is saa moja ("the first hour"). Add or subtract six.',
      [('table', 'Clock → Swahili', ['Clock', 'Swahili', 'Clock', 'Swahili'],
        [['7:00', 'saa moja', '1:00', 'saa saba'], ['8:00', 'saa mbili', '2:00', 'saa nane'], ['9:00', 'saa tatu', '3:00', 'saa tisa'],
         ['10:00', 'saa nne', '4:00', 'saa kumi'], ['11:00', 'saa tano', '5:00', 'saa kumi na moja'], ['12:00', 'saa sita', '6:00', 'saa kumi na mbili']]),
       ('p', 'Add **asubuhi** (morning), **mchana** (afternoon), **jioni** (evening) or **usiku** (night) to be clear.'),
       ('table', 'Minutes', ['Swahili', 'Meaning', 'Example'],
        [['na robo', 'quarter past', 'saa mbili na robo = 8:15'], ['na nusu', 'half past', 'saa mbili na nusu = 8:30'],
         ['kasoro robo', 'quarter to', 'saa tatu kasoro robo = 8:45'], ['kamili', 'exactly / sharp', 'saa tatu kamili = 9:00 sharp'],
         ['na dakika kumi', 'and ten minutes', 'saa nne na dakika kumi = 10:10']]),
       ('tip', 'Trick: clock time ± 6. 10 a.m. → 10 − 6 = **saa nne**. And always check whether someone means Swahili or English time — Kenyans switch freely ("saa moja" vs "seven").'),
       ('p', '**Saa ngapi?** = What time? **Saa moja** can also mean "one hour" — context tells you.')],
      [('Tutaondoka saa moja asubuhi.', 'We\'ll leave at 7 a.m.'), ('Saa kumi na mbili na nusu.', '6:30.'), ('Saa mbili kasoro dakika tano.', '7:55.')],
      related=['numbers-money'], tags=['vocab'])

topic('locative-ni', 3, 'Places: -ni, Kwenye, Kwa', 'Mahali: -ni, kwenye, kwa',
      'Three ways to say at / in / to a place: the -ni suffix, kwenye, and the very Kenyan kwa.',
      [('p', '**-ni** on a noun = at / in / to it: *soko → sokoni* (at the market), *kazi → kazini* (at work), *nyumba → nyumbani* (at home), *jiko → jikoni* (in the kitchen).'),
       ('p', '**Kwenye** = at / on / in (very flexible): *kwenye meza* (on the table), *kwenye orodha* (on the list), *kwenye kona* (at the corner).'),
       ('p', '**Kwa** = at someone\'s place, by, with: *kwa Kevin* (at Kevin\'s), *kwa M-Pesa* (by M-Pesa), *kwa miguu* (on foot). **Kwangu / kwako / kwetu** = my place / your place / our home.'),
       ('tip', 'Kenyans use **kwa** where Sanifu prefers -ni or kwenye: *till iko kwa ukuta* (Sanifu: ukutani), *kwa kona ya kwanza* (Sanifu: kwenye kona ya kwanza).'),
       ('p', 'Names of countries and cities never take -ni: *Ninaenda Nairobi*, *Nitaenda Marekani*.')],
      [('Ninaenda kazini.', 'I\'m going to work.'), ('Weka vyombo kwenye sinki.', 'Put the dishes in the sink.'), ('Tutapita kwako.', 'We\'ll pass by your place.'),
       ('Lipa kwa M-Pesa.', 'Pay with M-Pesa.')],
      related=['ko-location', 'possessives'], tags=['prepositions'])

# ======================= LEVEL 4 =======================
topic('past-li', 4, 'Past Tense -li-', 'Wakati uliopita: -li-',
      'Subject + -li- + verb = something that happened. Short verbs keep ku-.',
      [('table', 'kuenda (to go)', ['Person', 'Past', 'English'],
        [['I', 'nilienda', 'I went'], ['you', 'ulienda', 'you went'], ['he / she', 'alienda', 'he/she went'], ['we', 'tulienda', 'we went'],
         ['you all', 'mlienda', 'you all went'], ['they', 'walienda', 'they went'], ['it (n/n)', 'ilienda', 'it went']]),
       ('p', 'Short verbs keep **ku-**: *nilikula* (I ate), *alikuja* (she came), *tulikunywa* (we drank).'),
       ('p', '**Nilikuwa** = I was. **Kulikuwa na** = there was / there were.'),
       ('tip', 'In a story, after the first -li- verb, Swahili often switches to **-ka-** for "and then…": *Nilifika, nikakutafuta* — I arrived and (then) looked for you. See "-ki-, -po-, -ka-".')],
      [('Nilienda Naivasha.', 'I went to Naivasha.'), ('Tuliona viboko.', 'We saw hippos.'), ('Kulikuwa na ajali.', 'There was an accident.'),
       ('Ilikuwa nzuri sana.', 'It was really good.')],
      related=['negative-past', 'perfect-me', 'ki-po-ka'], tags=['verbs', 'tenses'])

topic('negative-past', 4, 'Negative Past: si-ku-', 'Ukanushaji: wakati uliopita',
      'Negative subject + -ku- + verb (ending stays -a) = "didn\'t".',
      [('table', 'kuona (to see)', ['Person', 'Past', 'Didn\'t'],
        [['I', 'niliona', 'sikuona'], ['you', 'uliona', 'hukuona'], ['he / she', 'aliona', 'hakuona'], ['we', 'tuliona', 'hatukuona'],
         ['you all', 'mliona', 'hamkuona'], ['they', 'waliona', 'hawakuona'], ['it (n/n)', 'iliona', 'haikuona']]),
       ('p', 'Unlike the present negative, the final **-a stays**: *sikuenda* (I didn\'t go), not *sikuendi*.'),
       ('tip', 'Careful: **sioni** = I don\'t see (now), **sikuona** = I didn\'t see, **sijaona** = I haven\'t seen (yet).'),
       ('sanifu', 'With short verbs, Sanifu says *sikula* (I didn\'t eat); many Kenyans say *sikukula*. Both are understood.')],
      [('Sikuenda popote.', 'I didn\'t go anywhere.'), ('Hukuchukua simu.', 'You didn\'t pick up the phone.'), ('Hakuja.', 'He/she didn\'t come.'),
       ('Haikusaidia.', 'It didn\'t help.')],
      related=['past-li', 'negative-present', 'perfect-negative-ja'], tags=['verbs', 'negation'])

topic('object-infixes', 4, 'Object Infixes: -ni-, -ku-, -m-, -wa-', 'Viambishi vya mtendwa',
      'Me, you, him, them — tucked inside the verb, right before the stem.',
      [('p', 'Swahili puts the object **inside** the verb: subject + tense + **object** + stem. *Ni-li-**ku**-ona* = I saw **you**.'),
       ('table', 'Object markers', ['Object', 'Infix', 'Example', 'English'],
        [['me', '-ni-', 'alinipigia', 'she called me'], ['you', '-ku-', 'nilikuona', 'I saw you'], ['him / her', '-m- / -mw-', 'nilimwona', 'I saw him/her'],
         ['us', '-tu-', 'anatusaidia', 'he helps us'], ['you all / them', '-wa-', 'nitawaona', 'I\'ll see you all / them'],
         ['it (n/n)', '-i-', 'nimeiona', 'I\'ve seen it'], ['them (n/n)', '-zi-', 'nilizinunua', 'I bought them']]),
       ('p', 'Use **-mw-** before a vowel: *mwambie* (tell him), *nilimwona* (I saw him).'),
       ('p', 'With people, the object marker is almost always used, even when the person is named: *Nilimwona **Baraka*** — I saw Baraka.'),
       ('tip', 'Commands with an object end in **-e**: *Nipe* (give me), *Mwambie* (tell him), *Niletee* (bring me).')],
      [('Nilikupigia simu.', 'I called you.'), ('Ulimwona Baraka?', 'Did you see Baraka?'), ('Tuliwaona.', 'We saw them.'),
       ('Nitakupa dawa.', 'I\'ll give you medicine.')],
      related=['imperatives', 'verb-extensions'], tags=['verbs'])

# ======================= LEVEL 5 =======================
topic('perfect-me', 5, 'Perfect -me-: Has Done / Is Now', 'Wakati timilifu: -me-',
      '-me- = something has happened and still matters now. With some verbs it describes a state: nimechoka = I\'m tired.',
      [('table', 'kufika (to arrive)', ['Person', 'Perfect', 'English'],
        [['I', 'nimefika', 'I have arrived'], ['you', 'umefika', 'you have arrived'], ['he / she', 'amefika', 'he/she has arrived'],
         ['we', 'tumefika', 'we have arrived'], ['you all', 'mmefika', 'you all have arrived'], ['they', 'wamefika', 'they have arrived'],
         ['it (n/n)', 'imefika', 'it has arrived']]),
       ('p', 'Some verbs describe a **state** in -me-, so English uses "is / am":'),
       ('table', 'State verbs', ['Swahili', 'Lit.', 'Meaning'],
        [['nimechoka', 'I have tired', 'I\'m tired'], ['nimeshiba', 'I have filled', 'I\'m full'], ['amelala', 'he has slept', 'he\'s asleep'],
         ['imeisha', 'it has ended', 'it\'s finished / sold out'], ['umepotea', 'you have got lost', 'long time no see! / you\'re lost'],
         ['nimechelewa', 'I have been late', 'I\'m late'], ['gari imeharibika', 'the car has broken', 'the car is broken down']]),
       ('tip', '**Umepotea!** (lit. "you\'ve got lost") is how Kenyans say "long time no see!"'),
       ('p', 'Short verbs keep ku-: *umekula?* (have you eaten?), *amekuja* (she\'s come).')],
      [('Nimeelewa.', 'I\'ve understood.'), ('Juisi imeisha.', 'The juice is finished.'), ('Nimechoka sana.', 'I\'m very tired.'),
       ('Tumepatana!', 'Deal! (We\'ve agreed!)')],
      related=['perfect-negative-ja', 'past-li', 'wahi-ever-never'], tags=['verbs', 'tenses'])

topic('perfect-negative-ja', 5, 'Not Yet: -ja- and Bado', 'Bado: -ja-',
      'Negative subject + -ja- + verb = hasn\'t (yet). Often with bado.',
      [('table', 'kufika (to arrive)', ['Person', 'Not yet'],
        [['I', 'sijafika'], ['you', 'hujafika'], ['he / she', 'hajafika'], ['we', 'hatujafika'], ['you all', 'hamjafika'], ['they', 'hawajafika'],
         ['it (n/n)', 'haijafika']]),
       ('p', '**Bado** = still / (not) yet. *Bado hajafika* = She hasn\'t arrived yet. On its own, *Bado!* = Not yet!'),
       ('p', 'Short verbs: *sijala* (I haven\'t eaten — Kenyans also say *sijakula*), *hajaja* (he hasn\'t come).'),
       ('tip', 'Answer a -me- question with -ja-: *Umekula? — Bado sijala.* (Have you eaten? — Not yet.)')],
      [('Bado sijamwona.', 'I haven\'t seen her yet.'), ('Sijaona jina lako.', 'I haven\'t seen your name.'), ('Haijaisha.', 'It hasn\'t run out yet.'),
       ('Sijaamua bado.', 'I haven\'t decided yet.')],
      related=['perfect-me', 'negative-past', 'wahi-ever-never'], tags=['verbs', 'negation'])

topic('wahi-ever-never', 5, '-wahi: Ever and Never', 'Kuwahi',
      '-wahi + infinitive = "ever". Sijawahi kuona = I\'ve never seen.',
      [('p', 'On its own, **kuwahi** means "to be on time / make it": *Leo nimewahi!* — Today I made it on time!'),
       ('p', 'As a helper verb before an infinitive, it means **ever**:'),
       ('table', '-wahi + ku-verb', ['Swahili', 'English'],
        [['Umewahi kuona simba?', 'Have you ever seen a lion?'], ['Nimewahi kuishi Kampala.', 'I have (once) lived in Kampala.'],
         ['Sijawahi kulipa elfu mbili.', 'I\'ve never paid two thousand.'], ['Hutawahi kujenga nyumba kama hii.', 'You\'ll never build a house like this.'],
         ['Usiwahi kufanya hivyo!', 'Never do that!']]),
       ('tip', '**Sijawahi** (I\'ve never) is one of the most useful words for a newcomer: *Sijawahi kula mutura!* — I\'ve never eaten mutura!')],
      [('Umewahi kuenda Mombasa?', 'Have you ever been to Mombasa?'), ('Sijawahi.', 'Never.'), ('Amewahi kufanya kazi Kampala.', 'She has worked in Kampala before.')],
      related=['perfect-me', 'perfect-negative-ja', 'helper-verbs'], tags=['verbs'])

topic('adjective-agreement', 5, 'Adjectives Agree: Mzuri, Wazuri, Nzuri', 'Vivumishi',
      'Adjectives come after the noun and take its class prefix: m- / wa- for people, n/n form for things.',
      [('table', 'Common adjectives', ['Meaning', 'm/wa one', 'm/wa many', 'n/n'],
        [['good', 'mzuri', 'wazuri', 'nzuri'], ['big', 'mkubwa', 'wakubwa', 'kubwa'], ['small / young', 'mdogo', 'wadogo', 'ndogo'],
         ['tall / long', 'mrefu', 'warefu', 'ndefu'], ['short', 'mfupi', 'wafupi', 'fupi'], ['new', 'mpya', 'wapya', 'mpya'],
         ['many', '—', 'wengi', 'nyingi'], ['other', 'mwingine', 'wengine', 'nyingine'], ['bad', 'mbaya', 'wabaya', 'mbaya'],
         ['red', 'mwekundu', 'wekundu', 'nyekundu']]),
       ('p', '*Mtu mrefu* (a tall person), *watu warefu* (tall people), *barabara ndefu* (a long road).'),
       ('p', 'Some adjectives never change: **safi** (clean), **rahisi** (cheap/easy), **ghali** (expensive), **tamu** (sweet), **bora** (best).'),
       ('tip', 'For things, Kenyans default to the n/n form: *chakula nzuri*, *kitu nzuri*, *gari kubwa*. Sanifu would say chakula kizuri, kitu kizuri, gari kubwa (ji/ma).'),
       ('sanifu', 'Sanifu: ki/vi **kizuri / vizuri**, ji/ma **zuri / mazuri**, m/mi **mzuri / mizuri**.')],
      [('Ni mrefu kuliko mimi.', 'She\'s taller than me.'), ('Wafanyakazi wengi ni wapya.', 'Many of the staff are new.'),
       ('Hii nyekundu.', 'This red one.'), ('Yule mwenye nguo nyeupe.', 'The one in white clothes.')],
      related=['noun-classes-mwa-nn', 'comparatives', 'sanifu-noun-classes'], tags=['nouns'])

topic('comparatives', 5, 'Comparing: Kuliko, Zaidi, Bora', 'Ulinganisho',
      'There\'s no "-er" or "-est" in Swahili: you say "big than" (kubwa kuliko) and "big more" (kubwa zaidi).',
      [('table', 'Comparing', ['Meaning', 'Pattern', 'Example'],
        [['bigger than', 'kubwa kuliko', 'Hii ni kubwa kuliko ile.'], ['nicer / more', '… zaidi', 'Ni nzuri zaidi.'],
         ['the biggest', 'kubwa kuliko zote / wote', 'Bei nzuri kuliko zote.'], ['the very best', 'bora zaidi', 'Samaki ni bora zaidi.'],
         ['as … as / like', 'kama', 'Mrefu kama baba yake.'], ['same as', 'sawa na', 'Nataka chakula sawa na chake.'],
         ['different from', 'tofauti na', 'Ni tofauti na ile.'], ['more than (numbers)', 'zaidi ya', 'zaidi ya miaka mitano'],
         ['less than', 'chini ya', 'chini ya shilingi elfu moja']]),
       ('p', '**Afadhali** / **heri** = it\'s better (to…): *Afadhali kuchelewa kuliko kukosa* — Better late than never.'),
       ('tip', 'Use **kuliko wote** for people (the tallest of all), **kuliko zote** for n/n things.')],
      [('Kikapu hii ni kubwa kuliko ile.', 'This basket is bigger than that one.'), ('Samaki ni tamu kuliko kuku?', 'Is the fish tastier than the chicken?'),
       ('Chai ni muhimu kuliko mkutano!', 'Tea is more important than meetings!')],
      related=['adjective-agreement'], tags=['nouns'])

# ======================= LEVEL 6 =======================
topic('subjunctive', 6, 'The Subjunctive: -e for "Let / Should / So That"', 'Hali ya kuamrisha: -e',
      'Change the final -a to -e (no tense marker) for suggestions, polite requests, wishes and after ili / lazima.',
      [('p', 'Formula: **subject + (object) + stem with final -e**. No -na-, -li- or -ta-.'),
       ('table', 'kuenda → -ende', ['Person', 'Form', 'Meaning'],
        [['I', 'niende', 'let me go / should I go?'], ['you', 'uende', '(please) go / you should go'], ['he / she', 'aende', 'let him go / he should go'],
         ['we', 'twende / tuende', 'let\'s go'], ['you all', 'mwende', 'you all should go'], ['they', 'waende', 'let them go']]),
       ('p', 'Where it\'s used:'),
       ('list', ['**Suggestions:** *Twende!* (let\'s go), *Tusubiri hapa* (let\'s wait here)', '**Offers:** *Nikulipe?* (shall I pay you?), *Nikupe chai?* (shall I give you tea?)',
                 '**Polite requests:** *Uniletee chai* (please bring me tea)', '**After ili (so that):** *ili nione* (so that I can see)',
                 '**After lazima / inabidi / afadhali:** *Lazima tuondoke* (we must leave)', '**Wishes:** *Mungu akubariki* (may God bless you)']),
       ('table', 'Negative: -si- + -e', ['Swahili', 'Meaning'],
        [['usiende', 'don\'t go'], ['usijali', 'don\'t worry'], ['usiguse', 'don\'t touch'], ['tusichelewe', 'let\'s not be late'], ['msiende', 'don\'t go (you all)']]),
       ('tip', 'Verbs not ending in -a don\'t change: *tusubiri* (let\'s wait), *usisahau* (don\'t forget), *ujibu* (answer).')],
      [('Twende kwenye kivuli.', 'Let\'s go into the shade.'), ('Nimpigie fundi?', 'Shall I call a mechanic?'), ('Mwambie anipigie.', 'Tell him to call me.'),
       ('Usinilipe!', 'Don\'t pay me!')],
      related=['polite-requests', 'imperatives', 'helper-verbs'], tags=['verbs', 'moods'])

topic('polite-requests', 6, 'Polite Requests: Naomba, Uniletee, Ebu', 'Maombi ya heshima',
      'From blunt to gracious: Lete → Niletee → Uniletee → Naomba uniletee.',
      [('table', 'The politeness ladder', ['Swahili', 'Feel'],
        [['Lete chai!', 'Bring tea! (blunt command)'], ['Niletee chai.', 'Bring me tea. (normal at a kibanda)'],
         ['Uniletee chai, tafadhali.', 'Would you bring me tea, please. (polite)'], ['Naomba uniletee chai.', 'May I ask you to bring me tea. (very polite)'],
         ['Naweza kupata chai?', 'Can I get some tea? (polite, easy)']]),
       ('p', '**Naomba** (lit. "I ask / beg") is the gold standard: *Naomba maji* (may I have water), *Naomba leseni yako* (may I see your licence — what a police officer says).'),
       ('p', '**Ebu / Hebu** softens anything: *Ebu nione* (let me see), *Ebu twende* (come on, let\'s go).'),
       ('tip', '**Tafadhali** (please) is fine, but Kenyans more often use the subjunctive or naomba. Overusing tafadhali can sound stiff.')],
      [('Naomba uweke ya elfu tatu.', 'Please put in three thousand\'s worth.'), ('Uangalie matairi pia.', 'Check the tyres too, please.'), ('Ebu nione.', 'Let me see.')],
      related=['subjunctive', 'imperatives'], tags=['phrases'])

# ======================= LEVEL 7 =======================
topic('verb-extensions', 7, 'Verb Extensions: -ia, -wa, -isha, -ana, -ika', 'Mnyambuliko wa vitenzi',
      'One root, many meanings: add a suffix before the final -a to get "for", "be …-ed", "make", "each other" and "get …-ed".',
      [('table', 'The five big extensions', ['Extension', 'Meaning', 'Example'],
        [['-ia / -ea (prepositional)', 'for / to / at someone', 'leta → letea: bring FOR (niletee = bring me)'],
         ['-wa (passive)', 'be …-ed (by = na)', 'andika → andikwa: be written'], ['-isha / -esha (causative)', 'make / cause', 'simama → simamisha: make stop'],
         ['-ana (reciprocal)', 'each other', 'saidia → saidiana: help each other'], ['-ika / -eka (stative)', 'get / be …-ed (no doer)', 'vunja → vunjika: get broken']]),
       ('table', 'One verb, five ways: kufanya (do)', ['Form', 'Meaning'],
        [['fanya', 'do'], ['fanyia', 'do for (Nitakufanyia = I\'ll do it for you)'], ['fanywa', 'be done (Kazi ilifanywa na Joyce)'],
         ['fanyiwa', 'have done to you (Gari ilifanyiwa ukaguzi)'], ['fanyika', 'happen (Nini kilifanyika?)']]),
       ('p', 'Vowel harmony: stems with **a, i, u** take -ia / -isha; stems with **e, o** take -ea / -esha: *pika → pikia*, *soma → somea*, *chelewa → chelewesha*.'),
       ('tip', 'Watch the meaning shift: **tuma** = send (someone), **tumia** = send to / use. *Nitakutumia* = I\'ll send (it) to you, but *Nitakutuma* = I\'ll send YOU (on an errand)!'),
       ('p', 'Passives often take **na** for "by": *Ripoti iliandikwa na Faith* — The report was written by Faith.')],
      [('Nimekuletea begi yako.', 'I\'ve brought you your bag.'), ('Mkutano umeahirishwa.', 'The meeting has been postponed.'),
       ('Simamisha gari!', 'Pull over!'), ('Tumeelewana.', 'We understand each other.'), ('Bomba imevunjika.', 'The pipe is broken.')],
      related=['object-infixes', 'perfect-me'], tags=['verbs'])

topic('discourse-particles', 7, 'Talking Like a Kenyan: Kumbe, Basi, Yaani, Si…?', 'Viunganishi vya mazungumzo',
      'Small words that make you sound natural: surprise, rephrasing, wrapping up, and gentle suggestions.',
      [('table', 'Particles', ['Word', 'Use', 'Example'],
        [['Kumbe!', 'surprise: "oh, so…!" (what you assumed wasn\'t true)', 'Kumbe unajua Kiswahili! — Oh, so you speak Swahili!'],
         ['Basi', 'well then / so / that\'s it', 'Basi, twende. — Well then, let\'s go.'], ['Yaani', 'I mean / in other words', 'Yaani, wewe ni mteja wangu!'],
         ['Si …?', 'why don\'t…? / isn\'t it…?', 'Si tukutane kesho? — Why don\'t we meet tomorrow?'],
         ['…, sivyo?', 'right? / isn\'t it?', 'Saa moja ni seven, sivyo?'], ['Ebu / Hebu', 'come on / let me', 'Ebu nione.'],
         ['Haya', 'alright / okay then', 'Haya, sawa.'], ['Aisee', 'wow / man!', 'Aisee, mvua inanyesha!'],
         ['Wee!', 'whoa! / hey!', 'Wee! Elfu mbili?'], ['Aiii!', 'oh no! / come on!', 'Aiii, umepunguza sana!']]),
       ('tip', '**Kumbe** is one of the most Kenyan words there is. Use it when you discover something unexpected — it shows you\'re listening.')],
      [('Kumbe hujui?', 'Oh, you don\'t know?'), ('Basi, leo nakuachilia.', 'Well then, today I\'ll let you go.'), ('Si tukanywe chai?', 'Why don\'t we go have tea?')],
      related=['subjunctive', 'greetings'], tags=['phrases'])

# ======================= LEVEL 8 =======================
topic('conditional-nge', 8, 'If… Would…: -nge- and -ngali-', 'Masharti: -nge-, -ngali-',
      '-nge- = would / if (present & hypothetical). -ngali- = would have (past). Kenyans use -nge- for both.',
      [('p', 'Put **-nge-** in BOTH halves: *Ningekuwa na gari, ningenunua kilo kumi* — If I had a car, I\'d buy ten kilos.'),
       ('table', '-nge- (would)', ['Person', 'Form', 'Negative'],
        [['I', 'ningeenda', 'nisingeenda'], ['you', 'ungeenda', 'usingeenda'], ['he / she', 'angeenda', 'asingeenda'],
         ['we', 'tungeenda', 'tusingeenda'], ['they', 'wangeenda', 'wasingeenda'], ['it (n/n)', 'ingeenda', 'isingeenda / haingeenda']]),
       ('p', '**-ngali-** is the Sanifu past conditional: *Ningalijua, ningalikuja mapema* — If I had known, I would have come earlier.'),
       ('tip', '**Kenyan habit:** -nge- for the past too, often with **kama** (if) and a time word: *Kama ungemleta fundi mapema, hii haingetokea* — If you had brought the fundi earlier, this wouldn\'t have happened.'),
       ('p', '**Ningependa** (I would like) is the polite way to want something: *Ningependa kujua…* — I\'d like to know…')],
      [('Ningejua, ningekuja mapema.', 'If I\'d known, I\'d have come earlier.'), ('Ungependa chai?', 'Would you like tea?'),
       ('Kama angetimiza ahadi yake, barabara ingekuwa nzuri.', 'If he had kept his promise, the road would be good.')],
      related=['ki-po-ka', 'subjunctive'], tags=['verbs', 'moods'])

topic('ki-po-ka', 8, '-ki- (if), -po- (when), -ka- (and then)', 'Ki, Po, Ka',
      'Three little markers for stories and plans: -ki- = if/when (likely), -po- = when (that time), -ka- = and then.',
      [('table', 'The trio', ['Marker', 'Meaning', 'Example'],
        [['-ki-', 'if / when (real, likely)', 'Ukifika, nipigie. — When you arrive, call me.'],
         ['-po-', 'when (a specific time) — goes after -li-/-na-/-taka-', 'Nilipofika, nilikutafuta. — When I arrived, I looked for you.'],
         ['-ka-', 'and then (continues a past story)', 'Nilifika, nikakutafuta. — I arrived and (then) looked for you.']]),
       ('p', '**-ki- negative:** use **-si-po-**: *Usipoziba ufa, utajenga ukuta* — If you don\'t fill the crack, you\'ll build a wall.'),
       ('p', '**-po- in the future** needs **-ka-**: *atakapofika* — when he arrives.'),
       ('tip', '**-ki-** also means "…-ing" after a past kuwa: *Nilikuwa nikisoma* — I was reading. See "Continuous Tenses".'),
       ('p', 'Short verbs drop ku- with -ki-: *nikija* (if I come), *akila* (if he eats).')],
      [('Ukinunua kilo tatu, nitakupunguzia bei.', 'If you buy three kilos, I\'ll lower the price for you.'),
       ('Ilipoanza kunyesha, maji iliingia.', 'When it started raining, water came in.'), ('Nilifua nguo, nikapika.', 'I did laundry, then cooked.')],
      related=['conditional-nge', 'past-li', 'continuous-tenses'], tags=['verbs', 'clauses'])

topic('relatives', 8, 'Who / Which: Amba-, -ye-, Mwenye', 'Virejeshi',
      'Three ways to say "the person who…": ambaye (easy), -ye- inside the verb (elegant), mwenye (Kenyan & handy).',
      [('table', 'amba- + reference', ['For', 'Form', 'Example'],
        [['one person', 'ambaye', 'mama ambaye huuza mboga — the lady who sells vegetables'], ['several people', 'ambao', 'watu ambao walikuja — the people who came'],
         ['n/n one', 'ambayo', 'dawa ambayo nilipewa — the medicine I was given'], ['n/n many', 'ambazo', 'nyanya ambazo nilinunua — the tomatoes I bought']]),
       ('p', '**Inside the verb**, after -na-, -li- or -taka-: *a-na-**ye**-enda* (the one who goes), *wa-li-**o**-kuja* (those who came), *i-li-**yo**-anguka* (the one [thing] that fell). Negative: *a-si-**ye**-kubali* (the one who doesn\'t accept).'),
       ('p', '**Mwenye / wenye / yenye** = "having / with": *yule mwenye kofia* (the one with the hat), *maembe yenye sukari* (sweet mangoes). Kenyans also use **mwenye** as "who": *mtu mwenye alikuja* — the person who came.'),
       ('tip', 'Kenyans prefer **amba-** because it keeps the tense in the main verb and is easy to build. The -ye- forms sound polished — great for proverbs: *Asiyekubali kushindwa si mshindani.*'),
       ('sanifu', 'Sanifu has amba- forms for every class: ambacho, ambavyo (ki/vi), ambalo, ambayo (ji/ma), ambao, ambayo (m/mi), ambapo / ambako (place).')],
      [('Fundi ambaye ulimleta hakurekebisha vizuri.', 'The fundi you brought didn\'t fix it properly.'), ('Hakuna anayesikia.', 'No one is listening.'),
       ('Mama aliyekuuzia alikupa bei nzuri?', 'Did the lady who sold to you give you a good price?')],
      related=['noun-classes-mwa-nn', 'sanifu-noun-classes'], tags=['clauses'])

topic('habitual-hu-nga', 8, 'Habits: hu- and Kenyan -nga', 'Mazoea: hu- na -nga',
      'hu- = usually (Sanifu, any person). Kenyans also add -nga — borrowed from Luhya — to any tense.',
      [('p', '**hu-** replaces both the subject prefix and the tense: *Mimi hununua hapa* (I usually buy here), *Wao hufika jioni* (they usually arrive in the evening). Because it doesn\'t show the person, add a pronoun or noun.'),
       ('p', '**Huwa** + present = "usually …": *Huwa unakunywa maji ya kutosha?* — Do you usually drink enough water? Very common in Kenya.'),
       ('table', 'Kenyan -nga', ['Swahili', 'Meaning'],
        [['Ninaendanga Nyeri kila mwezi.', 'I go to Nyeri every month.'], ['Mimi humfunzanga Kevin.', 'I teach Kevin (regularly).'],
         ['Nitamfunzanga Kevin.', 'I will be teaching Kevin (regularly).'], ['Siendangi.', 'I don\'t usually go.'], ['Unafanyanga kazi gani?', 'What work do you do?']]),
       ('p', '**-nga** came from Luhya and works with any tense — unlike hu-, which is present only. In the negative it becomes **-ngi**: *simfunzangi*.'),
       ('tip', 'Proverbs love hu-: *Haba na haba hujaza kibaba* — little by little fills the measure.'),
       ('sanifu', 'Sanifu uses only hu-. -nga is informal Kenyan — friendly, but avoid it in formal writing.')],
      [('Mimi huwa ninanunuanga hapa.', 'I usually buy here.'), ('Wageni hufika jioni.', 'Guests usually arrive in the evening.'),
       ('Huwa sinywi maji mengi.', 'I usually don\'t drink much water.')],
      related=['present-na', 'idioms-proverbs'], tags=['verbs'])

# ======================= LEVEL 9 =======================
topic('continuous-tenses', 9, 'Continuous Tenses: Was / Have Been / Will Be …-ing', 'Nyakati endelevu',
      'kuwa in the past, perfect or future + a -ki- (or -na-) verb = an ongoing action.',
      [('table', 'Building them', ['Meaning', 'Pattern', 'Example'],
        [['was …-ing', 'nilikuwa + -ki- / -na-', 'Nilikuwa nikisoma. / Nilikuwa nasoma. — I was reading.'],
         ['have been …-ing', 'nimekuwa + -ki-', 'Nimekuwa nikingoja tangu Novemba. — I\'ve been waiting since November.'],
         ['will be …-ing', 'nitakuwa + -ki-', 'Nitakuwa nikifanya kazi. — I\'ll be working.'],
         ['had already …', 'nilikuwa + -me-', 'Nilikuwa nimechoka. — I was (already) tired.']]),
       ('p', 'Both parts take the subject: *Tu**me**kuwa **tu**kisubiri* — We\'ve been waiting. *Wa**li**kuwa **wa**kicheza* — They were playing.'),
       ('p', 'With **-po-**: *Nilipokuwa nikisoma chuo kikuu…* — When I was studying at university…'),
       ('tip', 'In everyday Kenyan speech, the second verb is often just present: *Nilikuwa naenda kwa kasi* — I was going fast. Both are correct.')],
      [('Tumekuwa tukisubiri kwa saa nzima.', 'We\'ve been waiting for a whole hour.'), ('Mvua imekuwa ikinyesha kila siku.', 'It\'s been raining every day.'),
       ('Nilikuwa naenda kwa kasi.', 'I was going fast.')],
      related=['ki-po-ka', 'past-li', 'perfect-me'], tags=['verbs', 'tenses'])

topic('conjunctions-kwamba', 9, 'Linking Ideas: Kwamba, Ingawa, Badala ya…', 'Viunganishi',
      'The connectors that turn sentences into stories, arguments and reported speech.',
      [('table', 'Connectors', ['Word', 'Meaning', 'Example'],
        [['kwamba', 'that (reported speech)', 'Wanasema kwamba barabara itajengwa.'], ['kwa sababu', 'because', 'Nimechelewa kwa sababu ya foleni.'],
         ['ili', 'so that (+ subjunctive)', 'ili nione vizuri'], ['ingawa', 'although', 'Ingawa tunaelewa, tuna njaa!'],
         ['hata hivyo', 'even so / however', 'Hata hivyo, bei imepanda.'], ['badala ya', 'instead of', 'badala ya kuku'],
         ['lakini / ila', 'but / except', 'Wote walikuja, ila Amani.'], ['halafu / kisha', 'then', 'Moja kwa moja, halafu kushoto.'],
         ['kwa hivyo / kwa hiyo', 'so / therefore', 'Kwa hivyo, unaweza kujitetea?'], ['ndiyo maana', 'that\'s why', 'Ndiyo maana nimerudi!'],
         ['kama', 'if / like', 'Kama ni faini, nitalipa.'], ['hata kama', 'even if', 'Nitaenda hata kama mvua inanyesha.']]),
       ('p', '**Reported speech:** keep the original tense after kwamba: *Aliniambia kwamba **atakuja*** — He told me that he **would** come (lit. "will come").'),
       ('tip', 'Kenyans often drop kwamba in speech, or use **vile**: *Aliniambia atakuja.*')],
      [('Mliniambia kwamba chakula kingekuja.', 'You told me that the food would come.'), ('Ingawa tunaelewa, hata hivyo tuna njaa.', 'Although we understand, we\'re still hungry.'),
       ('Badala ya kuku, mmeleta mbuzi.', 'Instead of chicken, you\'ve brought goat.')],
      related=['subjunctive', 'continuous-tenses'], tags=['clauses'])

topic('vyo-manner', 9, '-vyo-: "The Way" / "As"', 'Namna: -vyo-',
      'Tuck -vyo- into a verb to mean "the way / how / as": unavyotaka = the way you want.',
      [('p', 'Formula: **subject + tense + -vyo- + verb**. It turns a verb into "the way (that)…".'),
       ('table', 'Examples', ['Swahili', 'Meaning'],
        [['unavyotaka', 'the way you want / as you like'], ['unavyoweza', 'as (well as) you can'], ['ninavyoona', 'the way I see it'],
         ['alivyosema', 'the way he said / as he said'], ['haraka iwezekanavyo', 'as fast as possible']]),
       ('p', 'Kenyans also use **vile** + normal verb: *Fanya vile unataka* = Fanya unavyotaka (do as you like).'),
       ('tip', '**Ninavyoona…** (the way I see it…) is a perfect opener for giving your opinion politely.')],
      [('Tutakaa popote unavyotaka.', 'We\'ll sit wherever you like.'), ('Fanya kazi unavyoweza.', 'Do the work as best you can.'),
       ('Ninavyoona, kiongozi mzuri anasikiliza.', 'The way I see it, a good leader listens.')],
      related=['relatives', 'conjunctions-kwamba'], tags=['clauses'])

# ======================= LEVEL 10 =======================
topic('idioms-proverbs', 10, 'Methali & Idioms', 'Methali na Nahau',
      'Proverbs and idioms that Kenyans actually use — and when to drop them into conversation.',
      [('p', '**Methali** (proverbs) are everywhere in Kenya: in speeches, on matatu stickers, and in everyday arguments. Using one at the right moment shows real fluency.'),
       ('table', 'Methali', ['Proverb', 'Literal', 'Meaning'],
        [['Haraka haraka haina baraka.', 'Hurry hurry has no blessing.', 'Haste makes waste.'], ['Polepole ndio mwendo.', 'Slowly is the pace.', 'Slow and steady wins.'],
         ['Kawia ufike.', 'Delay, but arrive.', 'Better late than never.'], ['Mvumilivu hula mbivu.', 'The patient one eats ripe fruit.', 'Good things come to those who wait.'],
         ['Kidole kimoja hakivunji chawa.', 'One finger can\'t crush a louse.', 'We need each other.'], ['Haba na haba hujaza kibaba.', 'Little by little fills the measure.', 'Every bit counts.'],
         ['Usipoziba ufa utajenga ukuta.', 'If you don\'t fill the crack, you\'ll build a wall.', 'A stitch in time saves nine.'],
         ['Mtaka cha mvunguni sharti ainame.', 'Who wants what\'s under the bed must bend.', 'No pain, no gain.'],
         ['Maji yakimwagika hayazoleki.', 'Spilled water can\'t be gathered.', 'What\'s done is done.'],
         ['Fimbo ya mbali haiui nyoka.', 'A distant stick doesn\'t kill a snake.', 'Use what\'s at hand.'],
         ['Asiyekubali kushindwa si mshindani.', 'Who won\'t accept defeat is no competitor.', 'Be a good loser.'],
         ['Nipe nikupe.', 'Give me, I\'ll give you.', 'You scratch my back…'], ['Mgeni njoo, mwenyeji apone.', 'Guest, come, so the host may prosper.', 'Guests bring blessings.']]),
       ('table', 'Idioms (nahau) & Kenyan expressions', ['Expression', 'Literal', 'Meaning'],
        [['kutia chumvi', 'to add salt', 'to exaggerate'], ['kuvunja mbavu', 'to break ribs', 'to crack someone up'],
         ['Umeniwacha kwa mataa.', 'You left me at the traffic lights.', 'You left me hanging.'], ['Wakati umetupa kisogo.', 'Time has shown us the back of its head.', 'Time\'s up.'],
         ['Umepotea!', 'You\'ve got lost!', 'Long time no see!'], ['Akose achekwe!', 'Let him miss and be laughed at!', 'Of course he\'ll do it!'],
         ['Mambo ni mengi, muda ni mchache.', 'Things are many, time is little.', 'So much to do, so little time.'], ['kitu kidogo', 'something small', 'a bribe']]),
       ('tip', 'Proverbs use classic grammar: hu- habits (hula, hujaza), -ki- conditions (yakimwagika), -ye- relatives (asiyekubali) and subjunctives (ufike, apone). Tap each word in a lesson to see how it\'s built.')],
      [('Haraka haraka haina baraka.', 'Hurry hurry has no blessing.'), ('Unatia chumvi!', 'You\'re exaggerating!'), ('Kidole kimoja hakivunji chawa.', 'One finger can\'t crush a louse.')],
      related=['habitual-hu-nga', 'relatives', 'subjunctive'], tags=['phrases', 'culture'])


if __name__ == '__main__':
    slugs = [t['slug'] for t in T]
    assert len(slugs) == len(set(slugs)), 'duplicate slug'
    for t in T:
        for r in t['related']:
            assert r in slugs, (t['slug'], r)
    out = sys.argv[1]
    T.sort(key=lambda t: (t['level'], slugs.index(t['slug'])))
    with open(out, 'w') as f:
        json.dump(T, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{len(T)} grammar topics')
