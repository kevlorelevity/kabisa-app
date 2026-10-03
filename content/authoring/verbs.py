"""Verb stem lexicon.

Line format:  stem: english [; flag, flag, key=value]
  english   English base verb phrase. '{o}' marks where an object pronoun goes.
  s         stative: present -na- reads as simple present ("I want", not "I am wanting")
  mono      monosyllabic stem: keeps ku- after -na-/-li-/-me-/-ta- (anakula, nitakuja)
  me=...    English for the -me- perfect when it describes a state ("nimechoka" = I am tired)
  ext=...   derived form: prep | pass | caus | recip | stat  (links the verb-extensions explainer)
  inf=...   infinitive override (e.g. kwenda)
"""

RAW = r"""
enda: go ; inf=kuenda
ja: come ; mono, inf=kuja
la: eat ; mono, inf=kula
nywa: drink ; mono, inf=kunywa
pa: give {o} ; mono, inf=kupa
wa: be ; mono, inf=kuwa
fa: die ; mono, inf=kufa
fika: arrive
fikia: reach {o} ; ext=prep
toka: leave / come from
fanya: do
fanyia: do (something) for {o} ; ext=prep
fanywa: be done ; ext=pass
fanyika: happen ; ext=stat
taka: want ; s
penda: like ; s
pendwa: be liked ; ext=pass
pendana: love each other ; ext=recip
pendeza: look nice ; ext=caus
pendelea: prefer ; s, ext=prep
pendekeza: recommend ; ext=caus
jua: know ; s
juana: know each other ; ext=recip, s
julisha: let {o} know ; ext=caus
elewa: understand ; s
elewana: understand each other ; ext=recip
eleweka: make sense ; ext=stat, s
eleza: explain
elezea: explain to {o} ; ext=prep
elekeza: direct {o} ; ext=caus
ona: see ; s
onana: see each other ; ext=recip
onekana: seem ; ext=stat, s
onyesha: show {o} ; ext=caus
sikia: hear ; s
sikika: be audible ; ext=stat
sikiliza: listen to {o} ; ext=caus
sikiza: listen to {o}
ngoja: wait
ngojea: wait for {o} ; ext=prep
subiri: wait
subiria: wait for {o} ; ext=prep
pita: pass
pitia: pass by / go through ; ext=prep
potea: get lost ; me=be lost
poteza: lose ; ext=caus
weza: can ; s
pata: get
patana: agree (on a price) ; ext=recip
patikana: be available ; ext=stat
ita: call
itwa: be called ; ext=pass, s
ishi: live ; s
kaa: stay ; s
keti: sit down
shuka: get off
shukisha: drop {o} off ; ext=caus
shusha: lower ; ext=caus
simama: stop ; me=be standing
simamisha: stop {o} ; ext=caus
simamia: be in charge of ; ext=prep
geuka: turn
geuza: turn (something) around ; ext=caus
pinda: turn
pinduka: turn (around)
rudi: come back
rudia: repeat ; ext=prep
rudisha: give back ; ext=caus
nunua: buy
nunulia: buy (something) for {o} ; ext=prep
uza: sell
uzia: sell (something) to {o} ; ext=prep
lipa: pay
lipia: pay for ; ext=prep
lipwa: be paid ; ext=pass
punguza: reduce
pungua: go down
ongeza: add
ongezeka: increase ; ext=stat
leta: bring
letea: bring {o} (something) ; ext=prep
letwa: be brought ; ext=pass
peleka: take {o} (somewhere)
pelekea: take (something) to {o} ; ext=prep
chukua: take
chukuliwa: be taken ; ext=pass
saidia: help {o}
saidiana: help each other ; ext=recip
ambia: tell {o}
sema: say
ongea: talk
ongelea: talk about ; ext=prep
zungumza: chat
uliza: ask
jibu: answer
soma: read
somea: read to {o} ; ext=prep
andika: write
andikia: write to {o} ; ext=prep
andikwa: be written ; ext=pass
andikisha: register ; ext=caus
fundisha: teach ; ext=caus
funza: teach
jifunza: learn
anza: start
anzisha: start (something) ; ext=caus
maliza: finish
isha: run out ; me=be finished
kwisha: run out ; me=be finished
pika: cook
pikwa: be cooked ; ext=pass
kata: cut
katia: cut (something) for {o} ; ext=prep
osha: wash
safisha: clean ; ext=caus
fua: do laundry
fagia: sweep
pangusa: wipe
weka: put
wekea: keep (something) for {o} ; ext=prep
panga: arrange
pangisha: rent out ; ext=caus
fungua: open
fungulia: open (something) for {o} ; ext=prep
funguliwa: be opened ; ext=pass
funga: close
fungwa: be closed ; ext=pass
fungika: be closed ; ext=stat
washa: switch on
zima: switch off
lala: sleep ; me=be asleep
amka: wake up ; me=be awake
choka: get tired ; me=be tired
shiba: get full ; me=be full
chelewa: run late ; me=be late
chelewesha: delay {o} ; ext=caus
cheleweshwa: be delayed ; ext=pass
wahi: make it in time
furahi: be happy
furahia: enjoy ; ext=prep
furahisha: make {o} happy ; ext=caus
hitaji: need ; s
hitajika: be needed ; ext=stat
tumia: use
jaribu: try
jaribisha: try on ; ext=caus
fikiri: think ; s
fikiria: think about ; ext=prep
kumbuka: remember ; s
kumbusha: remind {o} ; ext=caus
sahau: forget
amini: trust ; s
shinda: win
shindwa: fail ; ext=pass
shindana: compete ; ext=recip
piga: hit
pigia: call {o} ; ext=prep
pigwa: be beaten ; ext=pass
pigana: fight ; ext=recip
endesha: drive ; ext=caus
egesha: park
vuka: cross
fuata: follow
panda: climb
pandisha: raise ; ext=caus
teremka: go down
ingia: get in
ingiza: put in ; ext=caus
ondoka: leave
kimbia: run
tembea: walk
tembelea: visit ; ext=prep
safiri: travel
karibia: get close to ; ext=prep
karibisha: welcome {o} ; ext=caus
omba: ask for ; s
agiza: order
agizia: order (something) for {o} ; ext=prep
pakua: serve (food)
onja: taste
nukia: smell good ; s
gusa: touch
shika: hold
kamata: arrest
kamatwa: be arrested ; ext=pass
kagua: inspect
hakikisha: make sure ; ext=caus
zingatia: stick to
vaa: wear
vua: take off
pima: measure
tosha: be enough
fanana: look alike ; ext=recip, s
linganisha: compare ; ext=caus
badilisha: change ; ext=caus
badilika: change ; ext=stat
chagua: choose
amua: decide
kubali: agree
kataa: refuse
jadili: discuss
jadiliana: negotiate ; ext=recip
bishana: argue ; ext=recip
gombana: quarrel ; ext=recip
sumbua: bother {o}
umwa: be in pain ; ext=pass
uma: bite
umia: get hurt ; me=be hurt
umiza: hurt {o} ; ext=caus
pona: get better ; me=be better
ugua: be sick
kohoa: cough
tapika: vomit
dunga: inject
tibu: treat
pumzika: rest
oga: shower
nawa: wash (hands)
cheza: play
imba: sing
cheka: laugh
chekelea: laugh at {o} ; ext=prep
lia: cry
ogopa: be scared of ; s
jali: care ; s
shangaa: be surprised
kasirika: get angry ; me=be angry ; ext=stat
tamani: wish for ; s
tarajia: expect ; s
tegemea: depend on ; s
ahidi: promise {o}
danganya: lie to {o}
iba: steal
ibiwa: be robbed ; ext=pass
lalamika: complain
onya: warn {o}
chunga: watch out
tokea: happen
haribu: damage
haribika: break down ; ext=stat, me=be broken down
tengeneza: fix
tengenezwa: be made ; ext=pass
rekebisha: fix
vunja: break
vunjika: get broken ; ext=stat, me=be broken
anguka: fall
angusha: drop ; ext=caus
kwama: get stuck ; me=be stuck
vuta: pull
vutwa: be towed ; ext=pass
sukuma: push
beba: carry
pakia: load
vuja: leak
jaa: fill up ; me=be full
jaza: fill ; ext=caus
waka: be on (lights)
ungua: burn
chemsha: boil ; ext=caus
kaanga: fry
kaangwa: be fried ; ext=pass
choma: roast
chomwa: be grilled ; ext=pass
iva: get ready ; me=be ready
oza: go bad ; me=be rotten
koroga: stir
changanya: mix
changanyikiwa: get confused ; me=be confused
nyesha: rain
nyeshewa: get rained on ; ext=pass
vuma: blow
kauka: get dry ; me=be dry
kausha: dry ; ext=caus
lowa: get soaked ; me=be soaked
kopa: borrow
kopesha: lend {o} ; ext=caus
ajiri: hire
shughulika: deal (with things)
shughulikia: deal with ; ext=prep
chapa: hammer
kosa: miss
kosea: get it wrong
samehe: forgive {o}
shukuru: thank ; s
tambulisha: introduce ; ext=caus
jitambulisha: introduce oneself
kutana: meet
kuta: find
salimia: greet {o} ; ext=prep
salimiana: greet each other ; ext=recip
oa: marry ; me=be married
olewa: get married ; ext=pass, me=be married
zaliwa: be born ; ext=pass
kua: grow
hama: move out
hamia: move to ; ext=prep
lima: farm
fuga: keep (animals)
vuna: harvest
chimba: dig
jenga: build
paka: paint
ziba: block
tuma: send
tumia: use
pokea: receive
chaji: charge
tafuta: look for
tafsiri: translate
angalia: look at
tazama: watch
nyamaza: keep quiet
tulia: calm down
harakisha: hurry ; ext=caus
songa: move over
zunguka: go around
zungusha: give {o} the runaround ; ext=caus
endelea: get on ; ext=prep
endeleza: develop ; ext=caus
wacha: leave
acha: leave
ruhusu: allow
toa: take out
toza: charge
tozwa: be charged ; ext=pass
ondoa: remove
okota: pick up
inua: lift
bidi: be necessary
faa: be suitable
husu: concern
husika: be involved ; ext=stat
tetea: defend
jitetea: defend oneself
shtakiwa: be charged (in court) ; ext=pass
tupa: throw
kawia: take long
zoea: get used to ; me=be used to
jiunga: join
changia: contribute to ; ext=prep
fanikiwa: succeed ; ext=pass
faulu: pass (an exam)
feli: fail
ponea: survive ; ext=prep
ringa: show off
jipanga: get organised
tayarisha: prepare ; ext=caus
andaa: prepare
hudumia: serve {o} ; ext=prep
thibitisha: confirm ; ext=caus
hifadhi: reserve
lewa: get drunk ; me=be drunk
pumua: breathe
mwaga: spill
mwagika: get spilled ; ext=stat
kunja: fold
shona: sew
nyoa: shave
lea: raise (a child)
lisha: feed {o} ; ext=caus
shabikia: support (a team) ; ext=prep
fahamu: understand ; s
heshimu: respect ; s
hesabu: count
fariki: pass away
zika: bury
sherehekea: celebrate ; ext=prep
alika: invite {o}
pongeza: congratulate {o}
hofia: worry about ; ext=prep, s
epuka: avoid
dumu: last
tupia: throw (something) at {o} ; ext=prep
tegea: wait for (a chance)
ponyoka: slip away
lalamikia: complain about ; ext=prep
gonga: knock
gongana: collide ; ext=recip
chapisha: print ; ext=caus
tiririka: trickle
staafu: retire
dai: claim
kodi: rent
kodisha: rent out ; ext=caus
oshwa: be washed ; ext=pass
tandika: make (the bed)
sinzia: doze off
kopi: copy
pita: pass
bonga: chat
kaza: tighten
legeza: loosen ; ext=caus
tamba: brag
shuku: suspect ; s
ngoa: pull out
fyeka: slash (grass)
tega: set (a trap)
nasa: catch
fukuza: chase away
fukuzwa: be fired ; ext=pass
fanyiwa: undergo ; ext=pass
kaguliwa: be inspected ; ext=pass
tishia: threaten {o} ; ext=prep
heshimiwa: be respected ; ext=pass
tafutwa: be wanted ; ext=pass
ombwa: be asked ; ext=pass
saidiwa: be helped ; ext=pass
ambiwa: be told ; ext=pass
ulizwa: be asked ; ext=pass
pewa: be given ; ext=pass
onwa: be seen ; ext=pass
someshwa: be educated ; ext=pass
peana: give each other ; ext=recip
bebwa: be carried ; ext=pass
chelewa: run late ; me=be late
hongwa: be bribed ; ext=pass
honga: bribe {o}
pigiwa: be called ; ext=pass
fyonza: suck
amkia: greet ; ext=prep
nunuliwa: be bought for ; ext=pass
dumisha: keep up ; ext=caus
tumaini: hope ; s
ambukiza: infect ; ext=caus
ambukizwa: be infected ; ext=pass
pigwa faini: be fined
vumilia: put up with
kumbatia: hug {o}
pumzisha: rest (something) ; ext=caus
jisikia: feel ; s
sawazisha: equalise ; ext=caus
jivunia: be proud of ; ext=prep, s
nyorosha: thrash (lit. straighten out) ; ext=caus
baki: remain ; me=be left
funga goli: score
timiza: fulfil
katika: get cut ; ext=stat
tabirika: be predictable ; ext=stat
wezekana: be possible ; ext=stat
thamini: appreciate ; s
achilia: let {o} go ; ext=prep
dhani: think ; s
kosa: miss
salimu: greet
futa: wipe
funika: cover
chafuka: get dirty ; ext=stat, me=be dirty
chafua: make (something) dirty
badili: change
vaa: wear
bariki: bless {o}
onyesha: show {o} ; ext=caus
simamishwa: be stopped ; ext=pass
zingatia: stick to
ahirisha: postpone
ahirishwa: be postponed ; ext=pass
andaliwa: be prepared ; ext=pass
letewa: be brought (something) ; ext=pass
subiriwa: be waited for ; ext=pass
ngojewa: be waited for ; ext=pass
tumiwa: be sent (something) ; ext=pass
tumia: use
tumana: send (something) via someone ; ext=recip
vutia: attract ; ext=prep
vutiwa: be interested ; ext=pass
cheza muziki: dance
"""

STEMS: dict[str, dict] = {}


def _parse():
    for line in RAW.strip().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        stem, rest = line.split(':', 1)
        parts = rest.split(';')
        eng = parts[0].strip()
        info = {'stem': stem.strip(), 'en': eng, 's': False, 'mono': False}
        for fl in parts[1:]:
            for f in fl.split(','):
                f = f.strip()
                if not f:
                    continue
                if '=' in f:
                    k, v = f.split('=', 1)
                    info[k.strip()] = v.strip()
                else:
                    info[f] = True
        STEMS.setdefault(info['stem'], info)


_parse()


def _derive_passives():
    import english as E
    V = 'aeiou'
    for st, info in list(STEMS.items()):
        if info.get('mono') or info.get('ext') == 'pass' or not st.endswith('a') or ' ' in st:
            continue
        if st[-2] in V:
            p = st[:-1] + ('liwa' if st[-2] in 'iua' else 'lewa')
        else:
            p = st[:-1] + 'wa'
        if p in STEMS:
            continue
        en = info['en'].replace('{o}', '').split()
        verb, rest = en[0], ' '.join(en[1:])
        pp = E.forms(verb)[3]
        STEMS[p] = {'stem': p, 'en': ('be ' + pp + (' ' + rest if rest else '')).strip(), 's': False, 'mono': False,
                    'ext': 'pass', 'derived': True}


_derive_passives()


def infinitive(stem: str) -> str:
    v = STEMS[stem]
    if 'inf' in v:
        return v['inf']
    return 'ku' + stem
