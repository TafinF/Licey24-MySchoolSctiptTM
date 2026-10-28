// ============================================================
// КОМПАКТНОЕ РАСПИСАНИЕ
// ============================================================

/**
 * Сокращает название журнала до "Предмет Класс"
 * "Физика 9-В 9 кл. нем.яз. 26/27" → "Физика 9-В"
 * @param {string} name - полное название журнала
 * @returns {string} Короткое название (если формат не узнан, название без изменений)
 */
function shortenJournalName(name) {
    const match = /^(\S+)\s+(\d{1,2}\s*-\s*\S+)/.exec(name.trim());
    return match ? `${match[1]} ${match[2].replace(/\s+/g, '')}` : name.trim();
}

/**
 * Компактное расписание: страница сайта сжимается так, чтобы целиком помещаться в окно
 * - Убирает шкалу времени: уроки выстраиваются в строки по времени начала
 * - Высота строк и размер содержимого подгоняются под размер окна и ширину столбцов
 * - Название журнала сокращается, тема урока скрывается
 * - Остаются время, кабинет и значки урока и домашнего задания
 * Стили действуют только пока на <body> есть класс mscp-compact
 */
const ScheduleCompact = {
    /** @type {MutationObserver|null} Следит за перерисовкой расписания */
    observer: null,

    /** @type {number} Идентификатор запланированного пересчёта (0 — не запланирован) */
    frame: 0,

    /** @type {HTMLElement|null} Колонка со шкалой времени (кэш) */
    axis: null,

    /**
     * Включает компактное расписание
     * @returns {void}
     */
    start() {
        if (this.observer) return;

        this.addStyles();
        document.body.classList.add('mscp-compact');

        this.observer = new MutationObserver(() => this.schedule());
        this.observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('resize', this.onResize);

        this.schedule();
    },

    /**
     * Выключает компактное расписание (стили перестают действовать)
     * @returns {void}
     */
    stop() {
        if (!this.observer) return;

        this.observer.disconnect();
        this.observer = null;
        window.removeEventListener('resize', this.onResize);
        document.body.classList.remove('mscp-compact');
    },

    /** Обработчик изменения размера окна */
    onResize: () => ScheduleCompact.schedule(),

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
     * Расставляет уроки по строкам, подгоняет размеры под окно
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

        // Строка таблицы = время начала урока: в одной строке не бывает уроков с разным началом
        const entries = [];
        for (const day of grid.children) {
            day.classList.add('mscp-sch-day');
            entries.push(...this.collectDay(day));
        }

        const rowKeys = [...new Set(entries.map(entry => entry.key))].sort((a, b) => a - b);
        for (const { slot, card, key } of entries) {
            slot.classList.add('mscp-sch-slot');
            slot.style.setProperty('--mscp-row', rowKeys.indexOf(key) + 1);
            this.decorateCard(card);
        }

        const rows = Math.max(rowKeys.length, 1);
        const top = grid.getBoundingClientRect().top + (scroller?.scrollTop ?? 0);
        const height = Math.max(window.innerHeight - top - 8, rows * 48);
        const columnWidth = grid.firstElementChild?.getBoundingClientRect().width || 190;

        // Масштаб содержимого (1 = шрифт 12px/14px): карточка должна помещаться в строку и в столбец.
        // Числа — размер содержимого при масштабе 1: ширина (с кабинетом / без) и высота
        // (название и значки друг под другом / на одной линии)
        const rowHeight = height / rows;
        const stackedWithRoom = Math.min(columnWidth / 170, rowHeight / 78);
        const sharedWithRoom = Math.min(columnWidth / 170, rowHeight / 56);
        const stackedNoRoom = Math.min(columnWidth / 112, rowHeight / 78);
        const withRoom = Math.max(stackedWithRoom, sharedWithRoom);

        // В узких столбцах кабинет (он одинаков у всех уроков) уступает место более крупному тексту
        const hideRoom = stackedNoRoom > withRoom * 1.15;
        const scale = Math.min(Math.max(hideRoom ? stackedNoRoom : withRoom, 0.6), 1.8);

        grid.classList.toggle('mscp-sch-hide-room', hideRoom);
        grid.style.setProperty('--mscp-rows', rows);
        grid.style.setProperty('--mscp-grid-h', `${Math.floor(height)}px`);
        grid.style.setProperty('--mscp-u', scale.toFixed(3));
    },

    /**
     * Собирает уроки одного дня и определяет ключ строки для каждого
     * Ключ — время начала в минутах, умноженное на 10. Второй урок дня с тем же
     * началом получает ключ на единицу больше, чтобы карточки не накладывались
     * @param {HTMLElement} day - колонка дня
     * @returns {Array<{slot: HTMLElement, card: HTMLElement, key: number}>}
     */
    collectDay(day) {
        const slots = [...day.children]
            .filter(child => child.querySelector(CONFIG.SELECTORS.SCHEDULE_CARD))
            .sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));

        const seenStarts = new Map();

        return slots.map(slot => {
            const card = slot.querySelector(CONFIG.SELECTORS.SCHEDULE_CARD);
            const time = /(\d{1,2}):(\d{2})/.exec(card.textContent);

            // Без времени в карточке ставим урок после всех остальных, в порядке сверху вниз
            const start = time ? Number(time[1]) * 60 + Number(time[2]) : 1e5 + parseFloat(slot.style.top);
            const duplicates = seenStarts.get(start) ?? 0;
            seenStarts.set(start, duplicates + 1);

            return { slot, card, key: start * 10 + duplicates };
        });
    },

    /**
     * Помечает части карточки урока классами для CSS и сокращает название
     * Сам DOM сайта не меняется: название подменяется через атрибут и ::after
     * @param {HTMLElement} card - карточка урока
     * @returns {void}
     */
    decorateCard(card) {
        const root = card.firstElementChild;
        const body = root?.children[1];
        const nameBox = body?.firstElementChild;
        const nameSpan = nameBox?.firstElementChild;
        if (!nameSpan) return;

        root.classList.add('mscp-sch-root');
        body.classList.add('mscp-sch-body');
        nameBox.classList.add('mscp-sch-namebox');
        nameSpan.classList.add('mscp-sch-name');
        nameSpan.dataset.mscpShort = shortenJournalName(nameSpan.textContent);
        nameSpan.title = nameSpan.textContent.trim();

        for (const child of nameBox.children) {
            if (child !== nameSpan && child.tagName === 'SPAN') {
                child.classList.add('mscp-sch-hide');
            }
        }

        // Значки урока и ДЗ: сайт показывает либо блок под названием, либо блок внутри него
        const hasBadges = element => element.querySelector('[data-test-component$="badgeStatus"]');
        const outerIcons = [...root.children].slice(2).filter(hasBadges);
        const innerIcons = [...nameBox.children].filter(child => child.tagName === 'DIV' && hasBadges(child));

        if (outerIcons.length) {
            outerIcons[0].classList.add('mscp-sch-icons');
            innerIcons.forEach(icons => icons.classList.add('mscp-sch-hide'));
        } else {
            innerIcons.forEach(icons => {
                icons.classList.remove('mscp-sch-hide');
                icons.classList.add('mscp-sch-icons-inline');
            });
        }
    },

    /**
     * Добавляет стили компактного расписания
     * @returns {void}
     */
    addStyles() {
        if (document.getElementById('mscp-compact-styles')) return;

        const styleEl = document.createElement('style');
        styleEl.id = 'mscp-compact-styles';
        styleEl.textContent = `
            /* Шкала времени не нужна: уроки стоят по строкам времени начала.
               Колонку оставляем пустой, чтобы шапка с днями недели не съехала */
            body.mscp-compact .mscp-sch-axis {
                visibility: hidden;
                height: 0 !important;
                overflow: hidden;
            }
            body.mscp-compact .mscp-sch-grid {
                height: auto !important;
                overflow: hidden !important;
            }
            body.mscp-compact .mscp-sch-content {
                height: auto !important;
                min-height: 0 !important;
            }
            /* Подвал страницы ("Пользовательское соглашение") не даёт расписанию поместиться в окно.
               Он перерисовывается сайтом и теряет классы, поэтому скрываем по структуре */
            body.mscp-compact .mscp-sch-content > :not(:has(.mscp-sch-grid)) {
                display: none !important;
            }

            /* Семь дней делят ширину поровну (у сайта у каждого минимум 194px и обрезается воскресенье) */
            body.mscp-compact .mscp-sch-head > :not(:first-child),
            body.mscp-compact .mscp-sch-day {
                flex: 1 1 0 !important;
                min-width: 0 !important;
                width: auto !important;
            }

            /* Колонка дня: строки по числу уроков, вся высота окна */
            body.mscp-compact .mscp-sch-day {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr);
                grid-template-rows: repeat(var(--mscp-rows, 1), minmax(0, 1fr));
                height: var(--mscp-grid-h, auto) !important;
            }
            body.mscp-compact .mscp-sch-day > :not(.mscp-sch-slot) {
                display: none !important;
            }
            body.mscp-compact .mscp-sch-slot {
                position: static !important;
                height: auto !important;
                min-height: 0;
                padding: 0 2px 2px !important;
                grid-row: var(--mscp-row);
                grid-column: 1;
            }
            body.mscp-compact .mscp-sch-slot > div,
            body.mscp-compact .mscp-sch-slot > div > [data-test-component] {
                height: 100% !important;
                box-sizing: border-box;
            }

            /* Содержимое карточки. Размеры считаются от --mscp-u (масштаб, см. apply).
               Свойство zoom не используется: в сетке с zoom Chrome неверно считает выравнивание
               и на широких экранах название уезжало вниз */
            body.mscp-compact .mscp-sch-root {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) auto;
                grid-template-rows: auto minmax(0, 1fr);
                height: 100% !important;
            }

            /* Серая полоска со временем и кабинетом прижата к верху */
            body.mscp-compact .mscp-sch-root > :nth-child(1) {
                grid-column: 1 / -1;
                padding: calc(3px * var(--mscp-u, 1)) calc(6px * var(--mscp-u, 1)) calc(2px * var(--mscp-u, 1)) !important;
            }
            body.mscp-compact .mscp-sch-root > :nth-child(1) * {
                font-size: calc(12px * var(--mscp-u, 1)) !important;
                line-height: 1.3 !important;
            }
            body.mscp-compact .mscp-sch-hide-room .mscp-sch-root > :nth-child(1) > :nth-child(2) {
                display: none !important;
            }
            body.mscp-compact .mscp-sch-body,
            body.mscp-compact .mscp-sch-namebox {
                display: block !important;
                flex: none !important;
                height: auto !important;
                overflow: visible !important;
                min-width: 0;
                margin: 0 !important;
                padding: 0 !important;
            }
            /* Название сразу под серой полоской, с отступом от стенки карточки */
            body.mscp-compact .mscp-sch-body {
                grid-column: 1 / -1;
                grid-row: 2;
                align-self: start;
                padding: calc(6px * var(--mscp-u, 1)) calc(6px * var(--mscp-u, 1)) 0 !important;
            }
            /* Значки внизу справа */
            body.mscp-compact .mscp-sch-icons {
                display: block !important;
                grid-column: 2;
                grid-row: 2;
                align-self: end;
                margin: 0 calc(6px * var(--mscp-u, 1)) calc(5px * var(--mscp-u, 1)) 0 !important;
                height: auto !important;
                min-height: 0 !important;
                padding: 0 !important;
            }

            /* Значки урока и ДЗ. Обёртки сайта добавляют лишние отступы (блок получался вдвое выше значков) */
            body.mscp-compact :is(.mscp-sch-icons, .mscp-sch-icons-inline) :is(div, button) {
                margin: 0 !important;
                padding: 0 !important;
                min-height: 0 !important;
                gap: calc(4px * var(--mscp-u, 1));
            }
            body.mscp-compact :is(.mscp-sch-icons, .mscp-sch-icons-inline) [data-test-component$="badgeStatus"] {
                width: calc(21px * var(--mscp-u, 1)) !important;
                height: calc(21px * var(--mscp-u, 1)) !important;
                padding: calc(3px * var(--mscp-u, 1)) !important;
                box-sizing: border-box;
            }
            body.mscp-compact :is(.mscp-sch-icons, .mscp-sch-icons-inline) svg {
                width: calc(15px * var(--mscp-u, 1)) !important;
                height: calc(15px * var(--mscp-u, 1)) !important;
                min-width: 0 !important;
                min-height: 0 !important;
            }
            body.mscp-compact .mscp-sch-icons-inline {
                display: block !important;
            }
            body.mscp-compact .mscp-sch-hide {
                display: none !important;
            }

            /* Короткое название вместо полного */
            body.mscp-compact .mscp-sch-name {
                display: block !important;
                height: auto !important;
                max-height: none !important;
                font-size: 0 !important;
                line-height: 0 !important;
                -webkit-line-clamp: unset !important;
            }
            body.mscp-compact .mscp-sch-name::after {
                content: attr(data-mscp-short);
                display: block;
                font-size: calc(14px * var(--mscp-u, 1));
                line-height: calc(20px * var(--mscp-u, 1));
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        `;
        document.head.appendChild(styleEl);
    }
};
