# Промпты для картинок · эпизод 1

Генерировать в приложении Gemini (Nano Banana), потом прислать картинку в чат с Claude
или загрузить в эту папку на GitHub. Промпты на английском — так модель точнее держит стиль.

## Общий хвост для каждого промпта
Добавлять в конец каждого запроса, чтобы все картинки были в одном стиле:

> Modern anime visual novel art, painterly background like an anime feature film, soft cinematic light,
> high detail, 16:9. No text, no letters, no signs with writing, no logos.

«No text» важен: модель пишет японский с ошибками (成田空港 в Кансае, «MUOYA»), а игра учит языку —
все надписи мы накладываем кодом.

## Фоны (16:9)

| Файл | Промпт |
|---|---|
| `bg/menu.jpg` | A small Shinto shrine on a hill at night in spring: a huge cherry blossom tree in full bloom on the left, red torii gate on the right, glowing stone lanterns, a big full moon, petals in the air, town lights far below. Empty dark sky on the left for the game title. No people. |
| `bg/grandma-room.jpg` | A cozy old apartment room in Russia on a winter evening: wooden table under a warm yellow lamp, lace tablecloth, an open old tin box with a tiny silver bell on a red cord, half of an old black-and-white photo and a folded letter, frosty window with snow, bookshelves, a cup of tea. Soft sepia tone, light film grain. No people. |
| `bg/plane.jpg` | View from an airplane seat toward the oval window during landing at dusk: Osaka bay coastline with sparkling city lights below, blue and orange evening sky, the wing visible. Seat back and armrest in the soft dark foreground. No people. |
| `bg/airport.jpg` | **Arrivals** hall of a big Japanese international airport at **sunset**: huge glass windows, warm orange and violet sky, a plane taking off far away, polished floor with reflections. A few small blurred people far in the background only; the lower center of the image is an empty floor area for a character. Information boards are blank glowing panels without readable text. |
| `bg/car-night.jpg` | Inside a family car at night, view from the back seat toward the front: dashboard glow, windshield showing a long bridge over the sea with orange street lights, rear-view mirror, reflections on the windows. No people. |
| `bg/genkan.jpg` | The genkan entrance of a modern Japanese family house in the evening: stone floor with neatly placed shoes, raised wooden step, slippers, a shoe cabinet with a small vase of flowers, a sliding door half open to a warmly lit hallway. No people. |
| `bg/room-night.jpg` | A small Japanese tatami guest room at night: futon on the tatami, low wooden desk with a small lamp, shoji window open to a moonlit night with a mountain silhouette and cherry blossoms, a suitcase and a backpack in the corner. Blue moonlight mixed with warm lamp light. No people. |

## Персонажи (2:3, на белом фоне)

Правило: сначала сделать **одну базовую картинку персонажа**, потом в том же чате Gemini просить
эмоции, прикладывая базовую как образец: «Same character, identical design and outfit, same framing,
plain white background. Change only the expression: …».

Хвост для персонажей:
> Visual novel character sprite, standing, front view, framed from mid-thigh up, isolated on a plain
> pure white background, no shadow, nothing else in frame. Modern anime style, clean lineart, soft cel shading. No text.

| Персонаж | База | Эмоции |
|---|---|---|
| Сакура | ✅ Grok, `src/sakura-grok/` | smile · happy · surprised · embarrassed · sad |
| `chars/hiroshi` | Japanese father in his late 40s, short black hair with a little grey, rectangular glasses, kind tired face, grey business suit with a loosened blue tie, car keys in hand. | спокойный · улыбка · смущённый смех · серьёзный |
| `chars/yumiko` | Japanese mother in her mid 40s, shoulder-length dark brown hair tied back loosely, gentle eyes, soft orange cardigan over a cream blouse, white apron. | улыбка · радостное удивление · смех |
| `chars/kenta` | Japanese boy, 12 years old, messy spiky black hair, mischievous grin, green dinosaur-print pajamas. | хитрая улыбка · восторг («медведи!») · подозрительный прищур |
| `chars/vera` | Russian grandmother, about 70, short silver hair, round glasses, warm wise smile, burgundy knitted cardigan over a cream blouse. | тёплая улыбка · грусть-воспоминание |
| `chars/suzuki` | Japanese taxi driver, about 60, white gloves, dark uniform cap and jacket, polite face. | вежливое недоумение · смех |

## Что уже есть

| Файл | Откуда | Заметки |
|---|---|---|
| `bg/menu.jpg`, `grandma-room.jpg`, `plane.jpg`, `airport.jpg`, `car-night.jpg`, `genkan.jpg`, `room-night.jpg` | Gemini | ✅ все фоны эпизода 1 |
| `chars/hiroshi/calm.png`, `smile.png` | Gemini, вырезаны `tools/cutout.py` из `src/hiroshi-sheet.jpg` | ✅ |
| Хироси: смущённый смех, серьёзный | Gemini | ✗ на листе русские подписи поверх фигуры и обрубленная рука — перегенерировать по одному на картинку |
| `chars/suzuki/` calm, smile, laugh, serious | Gemini | ✅ |
| `chars/vera/` smile, happy, laugh, gentle | Gemini | ✅ |
| `chars/yumiko/` calm, smile, embarrassed, sad | Gemini | ✅ подписи на листе вырезаны автоматически |
| `chars/kenta/` smirk, grin, laugh, sulky | Gemini | ✅ возраст в сценарии поменяли на 12 под эту картинку |
| `src/girl-cardigan.jpg` | Gemini | будущая **молодая Вера, 1976** — для сцен-воспоминаний (акты 4–5, эпилог); ключ на шее — от жестяной коробки |
| `bg/airport-gemini.jpg` | Gemini | запасной: зал вылета днём, табло с ошибками в тексте |
| Сакура × 6 | Canva | лежат в Canva, нужно скачать и загрузить сюда |

## Вырезание фона
`python3 tools/cutout.py src.jpg out.png [--box x0 y0 x1 y1]` — нейросеть rembg (модель isnet-anime),
чисто обрабатывает пряди волос. Для листов с несколькими позами — `--box` на каждую.
Генераторы, которые хорошо справились: Gemini (фоны, взрослые персонажи), Grok (Сакура).
