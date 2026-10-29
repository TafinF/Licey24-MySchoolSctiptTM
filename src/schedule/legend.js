// ============================================================
// ЛЕГЕНДА РАСПИСАНИЯ
// ============================================================

/**
 * Кнопка ⓘ рядом с настройками на странице расписания и всплывающая легенда заменённого расписания:
 * цвета предметов и значение значков урока и домашнего задания
 * Кнопка видна, только пока включено заменённое расписание
 */
const ScheduleLegend = {
    /** @type {HTMLElement|null} Открытая легенда */
    popup: null,

    /**
     * Создаёт кнопку легенды
     * @returns {HTMLElement} контейнер с кнопкой
     */
    createButton() {
        const box = document.createElement('div');
        box.className = 'mscp-legend-box';
        box.style.cssText = 'box-shadow: 1px 1px 4px 0px rgba(0, 0, 0, 0.07); border-radius: 8px; display: inline-flex; margin-left: 8px;';

        const button = document.createElement('button');
        button.className = 'mscp-button';
        button.innerHTML = createInfoIcon();
        button.title = 'Обозначения в расписании';
        button.addEventListener('click', event => {
            event.stopPropagation();
            this.toggle(box);
        });
        box.appendChild(button);

        this.sync(box);
        return box;
    },

    /**
     * Показывает кнопку только при заменённом расписании; при другом виде закрывает легенду
     * @param {HTMLElement} [box] - контейнер кнопки; по умолчанию найденный на странице
     * @returns {void}
     */
    sync(box = document.querySelector('.mscp-legend-box')) {
        if (!box) return;

        const isCustom = loadSettings().scheduleStyle === 'custom';
        box.style.display = isCustom ? 'inline-flex' : 'none';
        if (!isCustom) this.close();
    },

    /**
     * Убирает кнопку и легенду
     * @returns {void}
     */
    stop() {
        this.close();
        document.querySelector('.mscp-legend-box')?.remove();
    },

    /**
     * Открывает легенду под кнопкой или закрывает, если она уже открыта
     * @param {HTMLElement} anchor - контейнер кнопки, под которым появляется легенда
     * @returns {void}
     */
    toggle(anchor) {
        if (this.popup) {
            this.close();
            return;
        }

        const popup = document.createElement('div');
        popup.className = 'mscp-legend-pop';
        popup.append(this.build());

        const rect = anchor.getBoundingClientRect();
        popup.style.top = `${Math.round(rect.bottom + 8)}px`;
        popup.style.left = `${Math.max(8, Math.min(Math.round(rect.left), window.innerWidth - 376))}px`;

        document.body.appendChild(popup);
        this.popup = popup;

        // Закрытие по клику вне легенды и по Escape; обработчики снимаются вместе с легендой
        setTimeout(() => {
            document.addEventListener('click', this.onOutside);
            document.addEventListener('keydown', this.onKey);
        });
    },

    /**
     * Закрывает легенду
     * @returns {void}
     */
    close() {
        this.popup?.remove();
        this.popup = null;
        document.removeEventListener('click', this.onOutside);
        document.removeEventListener('keydown', this.onKey);
    },

    /** Клик вне легенды закрывает её */
    onOutside: event => {
        if (!ScheduleLegend.popup?.contains(event.target)) ScheduleLegend.close();
    },

    /** Escape закрывает легенду */
    onKey: event => {
        if (event.key === 'Escape') ScheduleLegend.close();
    },

    /**
     * Строит содержимое легенды: цвета предметов недели и значение значков
     * @returns {DocumentFragment} содержимое легенды
     */
    build() {
        const fragment = document.createDocumentFragment();

        const title = document.createElement('div');
        title.className = 'mscp-legend-title';
        title.textContent = 'Обозначения в расписании';

        const legend = document.createElement('div');
        legend.className = 'mscp-legend';

        for (const { subject, color } of ScheduleLayout.legend) {
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

        fragment.append(title, legend);
        return fragment;
    }
};
