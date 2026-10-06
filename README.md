# 鈴の約束 · Обещание колокольчика

Визуальная новелла с простым японским: история о колокольчике, дружбе и Японии.

- **Играть:** открыть `web/index.html` через любой статический сервер (`python3 -m http.server` в папке `web`)
  или включить GitHub Pages (Settings → Pages → ветка `main`, папка `/`).
- Сценарий: `SCENARIO.md`, эпизоды — `episodes/`. Игровые данные эпизода — `web/js/ep01.js`.
- Картинки: исходники в `assets/`, для игры — `web/img/` (собираются `python3 tools/build_web_assets.py`).
- Вырезание фона у персонажей: `python3 tools/cutout.py` (rembg, модель isnet-anime).
