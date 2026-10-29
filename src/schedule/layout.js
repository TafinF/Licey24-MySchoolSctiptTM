// ============================================================
// СВОЁ РАСПИСАНИЕ
// ============================================================

/**
 * Своё недельное расписание на странице "Расписание уроков"
 * - Карточки сайта остаются в DOM скрытыми, поверх каждой рисуется своя: время (начало и конец),
 *   класс и два статуса (урок и домашнее задание цветом сайта: зелёный / красный / серый)
 * - Название предмета выносится в легенду и обозначается цветом полоски; если предмет один, оно скрыто
 * - Строки сетки = номера уроков, подписанные слева; номер, которого нет всю неделю, остаётся узким пропуском.
 *   Размеры подгоняются под окно и ширину столбцов
 * - Клик по карточке нажимает "К журналу" в меню оригинальной карточки
 * Стили действуют только пока на <body> есть класс mscp-schedule
 */
const ScheduleLayout = {
    /** @type {MutationObserver|null} Следит за перерисовкой расписания */
    observer: null,

    /** @type {number} Идентификатор запланированного пересчёта (0 — не запланирован) */
    frame: 0,

    /** Номер для уроков, у которых в карточке не нашёлся номер: они идут после всех остальных */
    UNNUMBERED: 1000,

    /** Высота пропуска вместо номера, которого нет всю неделю, в долях высоты строки урока */
    GAP_WEIGHT: 0.3,

    /** @type {HTMLElement|null} Колонка со шкалой времени (кэш) */
    axis: null,

    /** @type {boolean} Идёт ли сейчас открытие журнала через меню сайта */
    isOpening: false,

    /** @type {{showColor: boolean, showLabel: boolean, classColor: boolean, showTime: boolean}} Что показывать на карточках (из настроек) */
    options: { showColor: true, showLabel: false, classColor: true, showTime: true },

    /**
     * Читает из настроек, как помечать предметы и классы
     * @returns {void}
     */
    configure() {
        const settings = loadSettings();
        this.options = {
            showColor: settings.scheduleSubjectMark !== 'label' && settings.scheduleSubjectMark !== 'none',
            showLabel: settings.scheduleSubjectMark === 'label' || settings.scheduleSubjectMark === 'both',
            classColor: settings.scheduleClassColor !== false,
            showTime: settings.scheduleShowTime !== false
        };
    },

    /**
     * Включает своё расписание; если оно уже включено, только применяет новые настройки
     * @returns {void}
     */
    start() {
        this.configure();

        if (this.observer) {
            this.schedule();
            return;
        }

        this.addStyles();
        document.body.classList.add('mscp-schedule');

        this.observer = new MutationObserver(() => this.schedule());
        this.observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('resize', this.onResize);

        this.schedule();
    },

    /**
     * Выключает своё расписание (стили перестают действовать, расписание сайта снова видно)
     * @returns {void}
     */
    stop() {
        if (!this.observer) return;

        this.observer.disconnect();
        this.observer = null;
        window.removeEventListener('resize', this.onResize);
        document.body.classList.remove('mscp-schedule');

        // Свои карточки и легенда вне режима не стилизованы: убираем
        this.axis = null;
        document.querySelectorAll('.mscp-card, #mscp-sch-legend, .mscp-sch-rows').forEach(element => element.remove());
    },

    /** Обработчик изменения размера окна */
    onResize: () => ScheduleLayout.schedule(),

    /**
     * Откладывает пересчёт до следующего кадра
     * @returns {void}
     */
    schedule() {
        if (this.frame) return;

        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.apply();
        });
    },

    /**
     * Находит колонку со шкалой времени (подписи 07:00, 08:00, ...)
     * @returns {HTMLElement|null}
     */
    findAxis() {
        if (this.axis?.isConnected) return this.axis;

        const label = [...document.querySelectorAll('main div')].find(
            element => element.childElementCount === 0 && /^\d{2}:00$/.test(element.textContent.trim())
        );

        for (let element = label; element && element.tagName !== 'MAIN'; element = element.parentElement) {
            if (getComputedStyle(element).position === 'sticky' && element.nextElementSibling) {
                this.axis = element;
                return element;
            }
        }

        return null;
    },

    /**
     * Строит расписание: разметка сетки, карточки, легенда, размеры
     * @returns {void}
     */
    apply() {
        const axis = this.findAxis();
        const grid = axis?.nextElementSibling;
        if (!grid) return;

        axis.classList.add('mscp-sch-axis');
        grid.classList.add('mscp-sch-grid');
        grid.parentElement.previousElementSibling?.classList.add('mscp-sch-head');

        const scroller = grid.closest('main');
        const content = [...(scroller?.children ?? [])].find(child => child.contains(grid));
        content?.classList.add('mscp-sch-content');

        const entries = [];
        for (const day of grid.children) {
            day.classList.add('mscp-sch-day');
            entries.push(...this.collectDay(day));
        }

        for (const entry of entries) {
            entry.data = parseLessonCard(entry.card);
        }

        // Предметы: цвет полоски на карточке и запись в легенде; если предмет один, название не нужно
        const subjects = [...new Set(entries.map(entry => entry.data.subject).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'ru'));
        const useColors = this.options.showColor && subjects.length > 1;
        const colorOf = subject => SCHEDULE_SUBJECT_COLORS[subjects.indexOf(subject) % SCHEDULE_SUBJECT_COLORS.length];

        // Строка таблицы = номер урока; номер, которого нет ни в один день недели, остаётся узким пропуском
        const rows = this.buildRows(entries);
        for (const { slot, data, number, copy } of entries) {
            slot.classList.add('mscp-sch-slot');
            slot.style.setProperty('--mscp-row', rows.start.get(number) + copy);
            this.renderCard(slot, data, useColors && data.subject ? colorOf(data.subject) : '');
        }

        this.renderRowLabels(axis, rows.labels);

        if (content) {
            this.renderLegend(content, grid, useColors ? subjects.map(subject => ({ subject, color: colorOf(subject) })) : []);
        }

        const top = grid.getBoundingClientRect().top + (scroller?.scrollTop ?? 0);
        const height = Math.max(window.innerHeight - top - 8, rows.weight * 48);
        const columnWidth = grid.firstElementChild?.getBoundingClientRect().width || 190;

        // Масштаб содержимого (1 = класс 19px, время 12px): карточка помещается в строку и в столбец.
        // Числа — размер содержимого при масштабе 1: ширина (прямоугольник класса добавляет отступы)
        // и высота (подпись предмета и время добавляют по строке)
        const needWidth = this.options.classColor ? 142 : 132;
        const needHeight = 37 + (this.options.showLabel ? 14 : 0) + (this.options.showTime ? 15 : 0);
        const scale = Math.min(Math.max(Math.min(columnWidth / needWidth, (height / rows.weight) / needHeight), 0.6), 1.6);

        // Колонка номеров уроков (бывшая шкала времени) строится по той же сетке, что и дни
        for (const element of [grid, axis]) {
            element.style.setProperty('--mscp-tpl', rows.template);
            element.style.setProperty('--mscp-grid-h', `${Math.floor(height)}px`);
            element.style.setProperty('--mscp-u', scale.toFixed(3));
        }
        // Длинное название предмета переносится на вторую строку, если в карточке остаётся место
        grid.style.setProperty('--mscp-lines', (height / rows.weight) / scale >= needHeight + 14 ? 2 : 1);
    },

    /**
     * Собирает уроки одного дня и определяет номер урока для каждого
     * Номер определяется по времени начала и школьному звонку (CONFIG.LESSON_STARTS). Второй урок дня с тем же
     * номером (например, деление класса на группы) получает copy = 1 и встаёт в следующую строку
     * @param {HTMLElement} day - колонка дня
     * @returns {Array<{slot: HTMLElement, card: HTMLElement, number: number, copy: number}>}
     */
    collectDay(day) {
        const slots = [...day.children]
            .filter(child => child.querySelector(CONFIG.SELECTORS.SCHEDULE_CARD))
            .sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));

        const seenNumbers = new Map();

        return slots.map(slot => {
            const card = slot.querySelector(CONFIG.SELECTORS.SCHEDULE_CARD);
            // Время начала из "2. 09:30 - 10:15"; число перед точкой сайт считает внутри дня, его не берём
            const match = /^\d+\.\s*(\d{1,2}):(\d{2})/.exec(card.textContent.trim());

            // Без времени в карточке урок идёт после всех остальных, в порядке сверху вниз
            const number = match ? lessonNumberFromStart(Number(match[1]), Number(match[2])) : this.UNNUMBERED;
            const copy = seenNumbers.get(number) ?? 0;
            seenNumbers.set(number, copy + 1);

            return { slot, card, number, copy };
        });
    },

    /**
     * Раскладывает номера уроков по строкам сетки
     * От первого до последнего номера недели идут все номера подряд: если какого-то урока нет
     * ни в один день, под него остаётся узкая пустая строка, а следующие уроки не сдвигаются
     * @param {Array<{number: number, copy: number}>} entries - уроки недели
     * @returns {{template: string, start: Map<number, number>, labels: Array<{number: number|string, row: number, span: number}>, weight: number}}
     *          template — значение grid-template-rows, start — первая строка каждого номера,
     *          labels — подписи колонки номеров, weight — высота в «строках урока» (пропуск считается долей)
     */
    buildRows(entries) {
        // Сколько строк нужно номеру: максимум уроков с этим номером в один день
        const copies = new Map();
        for (const { number, copy } of entries) {
            copies.set(number, Math.max(copies.get(number) ?? 0, copy + 1));
        }

        const numbers = [...copies.keys()].filter(number => number !== this.UNNUMBERED);
        const order = [];
        for (let number = Math.min(...numbers); number <= Math.max(...numbers); number++) {
            order.push(number);
        }
        if (copies.has(this.UNNUMBERED)) order.push(this.UNNUMBERED);

        const tracks = [];
        const start = new Map();
        const labels = [];
        let weight = 0;

        for (const number of order) {
            if (!copies.has(number)) {
                tracks.push(`minmax(0, ${this.GAP_WEIGHT}fr)`);
                weight += this.GAP_WEIGHT;
                continue;
            }

            const span = copies.get(number);
            start.set(number, tracks.length + 1);
            labels.push({ number: number === this.UNNUMBERED ? '' : number, row: tracks.length + 1, span });
            for (let i = 0; i < span; i++) tracks.push('minmax(0, 1fr)');
            weight += span;
        }

        return {
            template: tracks.join(' ') || 'minmax(0, 1fr)',
            start,
            labels,
            weight: Math.max(weight, 1)
        };
    },

    /**
     * Рисует в колонке слева номера уроков (пересоздаёт только если набор подписей изменился)
     * Оригинальные подписи часов сайта скрыты стилем, наша колонка добавляется внутрь той же колонки
     * @param {HTMLElement} axis - колонка шкалы времени сайта
     * @param {Array<{number: number|string, row: number, span: number}>} labels - подписи
     * @returns {void}
     */
    renderRowLabels(axis, labels) {
        const signature = JSON.stringify(labels);
        let box = axis.querySelector(':scope > .mscp-sch-rows');
        if (box?.dataset.signature === signature) return;

        box?.remove();
        box = document.createElement('div');
        box.className = 'mscp-sch-rows';
        box.dataset.signature = signature;

        for (const { number, row, span } of labels) {
            const label = document.createElement('div');
            label.className = 'mscp-row-label';
            label.style.gridRow = `${row} / span ${span}`;
            label.textContent = number;
            box.append(label);
        }

        axis.append(box);
    },

    /**
     * Рисует свою карточку внутри ячейки сетки (пересоздаёт только если данные изменились)
     * @param {HTMLElement} slot - ячейка сетки с оригинальной карточкой сайта
     * @param {Object} data - данные урока (см. parseLessonCard)
     * @param {string} color - цвет полоски предмета, пустая строка — без полоски
     * @returns {void}
     */
    renderCard(slot, data, color) {
        // Подпись предмета нужна, только если класс показан отдельно: иначе предмет уже стоит на его месте
        const label = this.options.showLabel && data.className ? data.subject : '';
        const classBox = this.options.classColor ? classColor(data.className) : '';
        const showTime = this.options.showTime;
        const signature = JSON.stringify([data, color, label, classBox, showTime]);
        let element = slot.querySelector(':scope > .mscp-card');
        if (element?.dataset.signature === signature) return;

        element?.remove();

        const create = (tag, className, text = '') => {
            const node = document.createElement(tag);
            node.className = className;
            node.textContent = text;
            return node;
        };

        element = create('div', 'mscp-card');
        element.dataset.signature = signature;
        element.classList.toggle('mscp-card-plain', !color);
        element.classList.toggle('mscp-card-now', data.isCurrent);
        if (color) element.style.setProperty('--mscp-c', color);
        element.title = `${data.fullName}\nКлик — открыть урок в журнале`;

        const head = create('div', 'mscp-card-head');
        const classElement = create('span', 'mscp-card-class', data.className || data.subject);
        if (classBox) {
            classElement.classList.add('mscp-card-chip');
            classElement.style.setProperty('--mscp-k', classBox);
        }
        head.append(classElement);

        const badges = create('span', 'mscp-card-badges');
        badges.append(
            create('span', `mscp-badge mscp-badge-${data.journal}`, 'У'),
            create('span', `mscp-badge mscp-badge-${data.homework}`, 'ДЗ')
        );
        head.append(badges);

        element.append(head);
        if (label) element.append(create('div', 'mscp-card-subject', label));
        if (showTime) element.append(create('div', 'mscp-card-time', `${data.start}–${data.end}`));
        element.addEventListener('click', () => this.openJournal(slot));

        slot.append(element);
    },

    /**
     * Рисует легенду: цвета предметов и что значат значки
     * @param {HTMLElement} content - контейнер страницы
     * @param {HTMLElement} grid - сетка расписания (легенда встаёт перед ней)
     * @param {Array<{subject: string, color: string}>} items - предметы с цветами (пусто, если предмет один)
     * @returns {void}
     */
    renderLegend(content, grid, items) {
        const anchor = [...content.children].find(child => child.contains(grid));
        let legend = document.getElementById('mscp-sch-legend');
        const signature = JSON.stringify(items);

        if (legend?.dataset.signature === signature && legend.parentElement === content) return;

        legend?.remove();
        legend = document.createElement('div');
        legend.id = 'mscp-sch-legend';
        legend.dataset.signature = signature;

        for (const { subject, color } of items) {
            const item = document.createElement('span');
            item.className = 'mscp-legend-item';
            const swatch = document.createElement('i');
            swatch.style.background = color;
            item.append(swatch, subject);
            legend.append(item);
        }

        const key = document.createElement('span');
        key.className = 'mscp-legend-key';
        key.append('У — урок, ДЗ — домашнее задание:');
        for (const [status, text] of [['done', 'заполнено'], ['late', 'не заполнено'], ['wait', 'ещё нет']]) {
            const badge = document.createElement('span');
            badge.className = `mscp-badge mscp-badge-${status}`;
            badge.textContent = text;
            key.append(badge);
        }
        legend.append(key);

        content.insertBefore(legend, anchor);
    },

    /**
     * Открывает урок в журнале: нажимает оригинальную карточку и в её меню кнопку "К журналу"
     * Меню на это время скрыто, чтобы не мигало
     * @param {HTMLElement} slot - ячейка сетки с оригинальной карточкой сайта
     * @returns {Promise<void>}
     */
    async openJournal(slot) {
        if (this.isOpening) return;
        this.isOpening = true;
        document.body.classList.add('mscp-sch-silent');

        try {
            const original = slot.querySelector(CONFIG.SELECTORS.SCHEDULE_CARD);
            (original?.querySelector('span') ?? original)?.click();

            const button = await Utils.waitUntil(() => [...document.querySelectorAll('body > .base-Popper-root button')]
                .find(candidate => candidate.textContent.trim() === 'К журналу'), 3000);
            button.click();
        } catch (error) {
            console.error('Не удалось открыть журнал урока:', error);
        } finally {
            setTimeout(() => {
                document.body.classList.remove('mscp-sch-silent');
                this.isOpening = false;
            }, 800);
        }
    },

    /**
     * Добавляет стили своего расписания
     * @returns {void}
     */
    addStyles() {
        if (document.getElementById('mscp-schedule-styles')) return;

        const u = 'var(--mscp-u, 1)';
        const styleEl = document.createElement('style');
        styleEl.id = 'mscp-schedule-styles';
        styleEl.textContent = `
            /* Шкала времени не нужна: уроки стоят по номерам. Колонка остаётся (шапка с днями недели
               не должна съехать), но вместо часов в ней наши номера уроков на одной сетке с днями */
            body.mscp-schedule .mscp-sch-axis {
                height: var(--mscp-grid-h, 0) !important;
                overflow: hidden;
            }
            body.mscp-schedule .mscp-sch-axis > :not(.mscp-sch-rows) {
                display: none !important;
            }
            body.mscp-schedule .mscp-sch-rows {
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                grid-template-rows: var(--mscp-tpl, minmax(0, 1fr));
                height: 100%;
            }
            body.mscp-schedule .mscp-row-label {
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: calc(18px * ${u});
                font-weight: 700;
                color: #9ca3af;
            }
            body.mscp-schedule .mscp-sch-grid {
                height: auto !important;
                overflow: hidden !important;
            }
            body.mscp-schedule .mscp-sch-content {
                height: auto !important;
                min-height: 0 !important;
            }
            /* Подвал страницы ("Пользовательское соглашение") не даёт расписанию поместиться в окно.
               Он перерисовывается сайтом и теряет классы, поэтому скрываем по структуре */
            body.mscp-schedule .mscp-sch-content > :not(:has(.mscp-sch-grid)):not(#mscp-sch-legend) {
                display: none !important;
            }

            /* Семь дней делят ширину поровну (у сайта у каждого минимум 194px и обрезается воскресенье) */
            body.mscp-schedule .mscp-sch-head > :not(:first-child),
            body.mscp-schedule .mscp-sch-day {
                flex: 1 1 0 !important;
                min-width: 0 !important;
                width: auto !important;
            }

            /* Колонка дня: строки по номерам уроков (с узкими пропусками), вся высота окна */
            body.mscp-schedule .mscp-sch-day {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr);
                grid-template-rows: var(--mscp-tpl, minmax(0, 1fr));
                height: var(--mscp-grid-h, auto) !important;
            }
            body.mscp-schedule .mscp-sch-day > :not(.mscp-sch-slot) {
                display: none !important;
            }
            body.mscp-schedule .mscp-sch-slot {
                position: static !important;
                height: auto !important;
                min-height: 0;
                padding: 0 2px 2px !important;
                grid-row: var(--mscp-row);
                grid-column: 1;
            }
            /* Оригинальная карточка сайта остаётся в DOM (её меню нужно для "К журналу"), но не видна */
            body.mscp-schedule .mscp-sch-slot > :not(.mscp-card) {
                display: none !important;
            }

            /* Своя карточка */
            body.mscp-schedule .mscp-card {
                box-sizing: border-box;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: calc(4px * ${u}) calc(6px * ${u}) calc(4px * ${u}) calc(8px * ${u});
                background: #fff;
                border: 1px solid #e5e7eb;
                border-left: calc(4px * ${u}) solid var(--mscp-c, #e5e7eb);
                border-radius: calc(6px * ${u});
                overflow: hidden;
                cursor: pointer;
            }
            body.mscp-schedule .mscp-card-plain {
                border-left-width: 1px;
            }
            body.mscp-schedule .mscp-card:hover {
                border-color: #9ca3af;
                border-left-color: var(--mscp-c, #9ca3af);
            }
            body.mscp-schedule .mscp-card-now {
                box-shadow: 0 0 0 2px #3b6cf0;
            }
            body.mscp-schedule .mscp-card-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: calc(4px * ${u});
            }
            body.mscp-schedule .mscp-card-class {
                font-size: calc(19px * ${u});
                line-height: 1.1;
                font-weight: 700;
                color: #111827;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            /* Цветной прямоугольник у класса */
            body.mscp-schedule .mscp-card-chip {
                padding: calc(1px * ${u}) calc(5px * ${u});
                border-radius: calc(4px * ${u});
                background: var(--mscp-k);
                color: #fff;
            }
            body.mscp-schedule .mscp-card-subject {
                font-size: calc(11px * ${u});
                line-height: 1.2;
                color: #374151;
                overflow: hidden;
                word-break: break-word;
                display: -webkit-box;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: var(--mscp-lines, 1);
            }
            body.mscp-schedule .mscp-card-time {
                font-size: calc(12px * ${u});
                line-height: 1.2;
                color: #6b7280;
                white-space: nowrap;
            }
            body.mscp-schedule .mscp-card-badges {
                display: flex;
                gap: calc(3px * ${u});
                flex: none;
            }

            /* Статусы в цветах значков сайта: зелёный, красный, серый */
            body.mscp-schedule .mscp-badge {
                font-size: calc(11px * ${u});
                font-weight: 600;
                line-height: 1;
                padding: calc(3px * ${u}) calc(5px * ${u});
                border-radius: calc(5px * ${u});
            }
            body.mscp-schedule .mscp-badge-done {
                background: rgba(22, 207, 3, 0.21);
                color: #005e15;
            }
            body.mscp-schedule .mscp-badge-late {
                background: rgba(255, 19, 19, 0.11);
                color: #a60000;
            }
            body.mscp-schedule .mscp-badge-wait {
                background: rgba(11, 33, 66, 0.09);
                color: #44506d;
            }

            /* Легенда над сеткой */
            #mscp-sch-legend {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 4px 14px;
                padding: 6px 12px;
                font-size: 12px;
                color: #4b5563;
            }
            #mscp-sch-legend .mscp-legend-item {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            #mscp-sch-legend .mscp-legend-item i {
                width: 10px;
                height: 10px;
                border-radius: 3px;
            }
            #mscp-sch-legend .mscp-legend-key {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-left: auto;
            }
            #mscp-sch-legend .mscp-badge {
                font-size: 11px;
                padding: 3px 6px;
                border-radius: 5px;
            }

            /* Меню оригинальной карточки скрыто, пока оно нужно только для кнопки "К журналу" */
            body.mscp-sch-silent > .base-Popper-root {
                visibility: hidden !important;
            }
        `;
        document.head.appendChild(styleEl);
    }
};
