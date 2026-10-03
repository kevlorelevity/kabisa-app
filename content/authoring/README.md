# Kabisa content authoring

Lessons (levels 1–10) and grammar explainers are written as compact text and
compiled to the JSON the app reads. Requires Python 3.10+ (no packages).

```
python3 content/authoring/compile.py content/lessons                  # lessons/*.txt → content/lessons/*.json
python3 content/authoring/grammar.py content/grammar/topics.json       # grammar explainers
```

The two hand-authored Uber lessons (`uber-nairobi*.json`, Level 1 lessons 1–2) are
NOT generated — `upgrade_legacy.py` was run once to add their level / theme /
grammar links. Edit those JSON files directly.

## Lesson script format (`lessons/L01.txt` … `L10.txt`)

```
@lesson market-mama-mboga            # id (= URL slug; keep stable — scores are keyed on it)
title: Mama Mboga's Kibanda
level: 2                             # 1–10 (content/levels.json)
index: 3                             # optional position within the level
theme: market                        # recurring theme (uber, market, food, health, …)
category: food-drink
culture: Paragraph shown under "Context".
start: One-line scene setter.
grammar: negative-present, na-have  # focus explainers (slugs in grammar.py)
gl: Nataka = "I want" — short for ninataka. #present-na      # lesson-only gloss; #slug links an explainer
gl: kiti ya mbele = the front seat || Sanifu: kiti cha mbele # || adds a Sanifu look-up

> Mama Mboga: Karibu! Unataka nini? | Welcome! What do you want?   # > = the other speaker (auto)
< Mteja: Nataka nyanya. | I want tomatoes.                          # < = the learner (MCQ)
  x: Unataka nyanya. ; Sina nyanya.                                  # distractors (else auto-generated)
  s: Ninataka nyanya.                                                # optional Sanifu version of the line

@practice
t: I don't want onions. | [Sitaki|Hutaki|Hataki] vitunguu. || Optional explanation
c: How many? — Four. | Unataka ngapi? — [Nne|Leo|Hapa].           # c = Swahili-only (English shown after)

@vocab
Sitaki… | I don't want… | Context line | Sanifu form | Sanifu note
```

## How glosses are produced

Every word in a line is glossed automatically:

1. lesson `gl:` entries, then `lexicon.py` (nouns, phrases, -ko/-na tables, possessives, adjectives…);
2. otherwise `morph.py` analyses the verb (subject + tense + object + stem from `verbs.py`) and writes
   the meaning, the morpheme breakdown, a conjugation table and the matching grammar explainer link.

`compile.py` prints any word it couldn't gloss — add it to `lexicon.py` / `verbs.py` (or a `gl:` line) and
re-run. House rule: m/wa and n/n are the standard agreement; other noun classes appear only as Sanifu
look-ups (`other(...)` in `lexicon.py`).

All Swahili in levels 2–10 was drafted by Claude from the seed spreadsheet and needs a content review
(Kevin / Lillian) like any authored module.
