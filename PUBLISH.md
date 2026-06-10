# Как опубликовать прототип на GitHub Pages

## Шаг 1 — Создать репозиторий на GitHub

1. Открыть <https://github.com/new>.
2. Name: `citypulse-prototype` (или любое другое).
3. Public.
4. **НЕ** ставить галочки «Add README», «Add .gitignore», «Add LICENSE» — у нас они уже есть.
5. Create repository.

## Шаг 2 — Запушить локальную папку

Откройте Terminal на Mac и перейдите в папку `citypulse-prototype/`:

```bash
cd ~/Desktop/citypulse-prototype     # поправьте путь
git init -b main
git config user.email "ваш@email.com"
git config user.name "Ваше имя"
git add .
git commit -m "Initial: CityPulse prototype (vibe-coded for ПрИС lab 6)"
git remote add origin https://github.com/<ВАШ-ЛОГИН>/citypulse-prototype.git
git push -u origin main
```

Если попросит пароль — нужен **Personal Access Token** (Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token, scope `repo`). Используйте токен вместо пароля.

## Шаг 3 — Включить GitHub Pages

1. На странице вашего нового репозитория зайдите в **Settings** (верхняя панель).
2. В левом меню — **Pages**.
3. Source: **Deploy from a branch**.
4. Branch: **main** / folder: **/ (root)**.
5. Save.
6. Через 1–2 минуты вверху страницы появится зелёная панель «Your site is live at» с адресом вроде:

   ```
   https://<ВАШ-ЛОГИН>.github.io/citypulse-prototype/
   ```

Этот адрес — то, что вы вставляете в раздел «Работающий сервис» в PDF-отчёте.

## Шаг 4 — Заполнить ссылки в PDF-отчёте

В файле `Лаб 6 ПрИС - Смирнов.pdf` есть три плейсхолдера в разделе 2 «Ссылки на материалы работы». Вставить вместо плейсхолдеров:

- **Чат с БЯМ.** Откройте чат с Claude / ChatGPT, в котором вы «vibe-coded» прототип (можно взять наш диалог), нажмите кнопку **Share** — система сгенерирует публичный URL. Скопируйте его.
- **Репозиторий.** URL вида `https://github.com/<ВАШ-ЛОГИН>/citypulse-prototype`.
- **Работающий сервис.** URL Pages из Шага 3.

Чтобы заменить плейсхолдеры в PDF, не пересобирая его:
- если у вас есть Word/Pages/LibreOffice — откройте `_lab6_report.docx` (он рядом с PDF), замените тексты, экспортируйте в PDF;
- или попросите меня в новом сообщении пересобрать PDF с ваших уже готовыми ссылками — я подставлю и пересоберу за секунду.

## Шаг 5 — Проверить

- Открыть Pages-ссылку в браузере (Chrome / Safari / Firefox).
- Убедиться, что:
  - страница загрузилась, шапка «CityPulse» видна;
  - отображаются 5 карточек районов с цифрами;
  - клик по карточке меняет содержимое таблицы и графиков ниже;
  - кнопка «Получить прогноз» показывает результат с P50 и интервалом.
- Если что-то не работает — откройте DevTools (F12 → Console), посмотрите ошибки.

## Подсказки

- **Pages не обновляется.** Иногда деплой кешируется; подождите 2–3 минуты или сделайте hard refresh (Cmd+Shift+R).
- **404 после включения Pages.** Проверьте, что в Settings → Pages выбрана правильная ветка `main` и папка `/ (root)`, а в корне репозитория есть файл `index.html`.
- **Графики не рисуются.** Chart.js подгружается с CDN; если CDN заблокирован, можно скачать `chart.umd.min.js` и положить в репозиторий, поправив путь в `index.html`.
