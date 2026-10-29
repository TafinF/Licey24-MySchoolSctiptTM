// ============================================================
// РАСПИСАНИЕ КОЛЛЕГ И КЛАССОВ: окно с выбором и сеткой недели
// ============================================================

/**
 * Окно "Расписание коллег"
 * - Вверху слева переключатель "Учителя | Классы", ниже список с поиском и закреплением; справа сетка недели:
 *   дни и номера уроков школьного звонка
 * - У учителя в занятой ячейке класс и предмет, у класса — предмет и учитель (подгруппы идут друг под другом);
 *   свободное время зелёное
 * - Режим "Свободны вместе со мной" берёт ваше расписание и выделяет часы, свободные у обоих
 * - Открывается на неделе, которая выбрана на странице расписания; дальше недели листаются в самом окне
 * - Свободно = нет урока в расписании; внеурочка, дежурства и совещания в нём не учитываются
 */
const Colleagues = {
    /** Дней в сетке: понедельник — суббота */
    DAYS: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],

    /** Месяцы в родительном падеже: так их пишет шапка расписания */
    MONTHS: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],

    /** @type {HTMLElement|null} Оверлей открытого окна */
    overlay: null,

    /** @type {Function|null} Обработчик Escape открытого окна */
    onKeydown: null,

    /** Что сейчас выбрано и загружено; пересоздаётся при каждом открытии */
    state: null,

    /** @type {number} Номер последней загрузки: ответ более ранней игнорируется */
    loadId: 0,

    /**
     * Понедельник недели, открытой на странице расписания
     * @returns {Date} при неудаче разбора — понедельник текущей недели
     */
    pageMonday() {
        const text = document.querySelector(CONFIG.SELECTORS.SCHEDULE_WEEK_LABEL)?.textContent ?? '';
        const match = /(\d{1,2})\s+([а-яё]+)\s+(\d{4})/iu.exec(text);
        const month = match ? this.MONTHS.indexOf(match[2].toLowerCase()) : -1;

        const date = month >= 0 ? new Date(Number(match[3]), month, Number(match[1])) : new Date();
        return ColleagueApi.weekStart(date);
    },

    // ---------- выбор ----------

    /**
     * Открыт ли режим классов
     * @returns {boolean}
     */
    isClasses() {
        return this.state.mode === 'classes';
    },

    /**
     * Список текущего режима
     * @returns {Array}
     */
    items() {
        return this.isClasses() ? this.state.classes : this.state.teachers;
    },

    /**
     * Выбранные учитель или класс текущего режима
     * @returns {?number}
     */
    currentId() {
        return this.isClasses() ? this.state.classId : this.state.teacherId;
    },

    /**
     * Запоминает выбор: в окне и в закреплённых
     * @param {?number} id - учитель или класс текущего режима
     * @returns {void}
     */
    setCurrent(id) {
        const { state } = this;
        if (this.isClasses()) {
            state.classId = id;
            state.favorites.lastClass = id;
        } else {
            state.teacherId = id;
            state.favorites.last = id;
        }
        ColleagueApi.saveFavorites(state.favorites);
    },

    /**
     * Закреплённые текущего режима
     * @returns {number[]}
     */
    pinned() {
        return this.isClasses() ? this.state.favorites.classIds : this.state.favorites.ids;
    },

    /**
     * Чьё расписание запрашивать
     * @returns {{type: 'teacher'|'class', id: number}}
     */
    owner() {
        return { type: this.isClasses() ? 'class' : 'teacher', id: this.currentId() };
    },

    // ---------- открытие и загрузка ----------

    /**
     * Открывает окно
     * @returns {void}
     */
    open() {
        if (this.overlay) return;

        createStyles();
        this.addStyles();

        const favorites = ColleagueApi.loadFavorites();
        this.state = {
            mode: favorites.mode,
            teachers: [],
            classes: [],
            favorites,
            teacherId: favorites.last,
            classId: favorites.lastClass,
            monday: this.pageMonday(),
            together: false,
            filter: '',
            week: null,
            mine: null,
            loading: true,
            error: '',
            note: ''
        };

        this.overlay = document.createElement('div');
        this.overlay.className = 'mscp-modal-overlay';
        this.overlay.innerHTML = `
            <div class="mscp-col-window">
                <div class="mscp-modal-header">
                    <h2 class="mscp-modal-title">Расписание коллег и классов</h2>
                    <button class="mscp-close-btn">&times;</button>
                </div>
                <div class="mscp-col-body">
                    <div class="mscp-col-side">
                        <div class="mscp-col-modes"></div>
                        <input type="search" class="mscp-col-search">
                        <div class="mscp-col-list"></div>
                    </div>
                    <div class="mscp-col-main">
                        <div class="mscp-col-toolbar"></div>
                        <div class="mscp-col-grid"></div>
                    </div>
                </div>
                <div class="mscp-col-footer"></div>
            </div>
        `;

        this.overlay.querySelector('.mscp-close-btn').addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', event => {
            if (event.target === this.overlay) this.close();
        });
        this.overlay.querySelector('.mscp-col-search').addEventListener('input', event => {
            this.state.filter = event.target.value;
            this.renderList();
        });

        this.onKeydown = event => {
            if (event.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this.onKeydown);

        document.body.appendChild(this.overlay);
        this.render();
        this.loadList();
    },

    /**
     * Закрывает окно
     * @returns {void}
     */
    close() {
        document.removeEventListener('keydown', this.onKeydown);
        this.overlay?.remove();
        this.overlay = null;
        this.loadId++;
    },

    /**
     * Загружает список текущего режима и, если выбор уже был, его неделю
     * @returns {Promise<void>}
     */
    async loadList() {
        const { state } = this;
        const mode = state.mode;

        state.loading = true;
        state.error = '';
        state.note = '';

        try {
            const result = mode === 'classes' ? await ColleagueApi.getClasses() : await ColleagueApi.getTeachers();
            if (!this.overlay || state.mode !== mode) return;

            state[mode] = result.list;
            if (result.stale) state.note = `Список ${mode === 'classes' ? 'классов' : 'учителей'} взят из кеша: сайт не ответил.`;
            if (!result.list.some(item => item.id === this.currentId())) this.setCurrent(null);
        } catch (error) {
            if (!this.overlay || state.mode !== mode) return;
            state.error = ColleagueApi.describeError(error);
        }

        state.loading = false;
        this.render();
        if (this.currentId()) this.loadWeek();
    },

    /**
     * Загружает неделю выбранного учителя или класса (и вашу, если включён режим "вместе со мной")
     * @param {boolean} [force=false] - игнорировать кеш
     * @returns {Promise<void>}
     */
    async loadWeek(force = false) {
        const { state } = this;
        const id = ++this.loadId;
        const myId = ColleagueApi.session()?.profile;

        state.loading = true;
        state.error = '';
        this.renderGrid();

        try {
            // Свою неделю незачем брать, когда смотрим на себя
            const needMine = state.together && myId && !(!this.isClasses() && myId === this.currentId());
            const [week, mine] = await Promise.all([
                ColleagueApi.getWeek(this.owner(), state.monday, force),
                needMine ? ColleagueApi.getWeek({ type: 'teacher', id: myId }, state.monday, force) : null
            ]);
            if (id !== this.loadId) return;

            state.week = week;
            state.mine = mine;
        } catch (error) {
            if (id !== this.loadId) return;
            state.week = null;
            state.mine = null;
            state.error = ColleagueApi.describeError(error);
        }

        state.loading = false;
        this.render();
    },

    /**
     * Переключает режим: учителя или классы
     * @param {'teachers'|'classes'} mode
     * @returns {void}
     */
    setMode(mode) {
        const { state } = this;
        if (state.mode === mode) return;

        state.mode = mode;
        state.favorites.mode = mode;
        ColleagueApi.saveFavorites(state.favorites);

        state.filter = '';
        state.week = null;
        state.mine = null;
        state.error = '';
        this.loadId++;

        if (this.items().length) {
            state.loading = false;
            this.render();
            if (this.currentId()) this.loadWeek();
        } else {
            state.loading = true;
            this.render();
            this.loadList();
        }
    },

    /**
     * Выбирает учителя или класс
     * @param {number} id
     * @returns {void}
     */
    select(id) {
        this.setCurrent(id);
        this.renderList();
        this.loadWeek();
    },

    /**
     * Закрепляет учителя или класс вверху списка или снимает закрепление
     * @param {number} id
     * @returns {void}
     */
    toggleFavorite(id) {
        const ids = this.pinned();
        const index = ids.indexOf(id);

        if (index >= 0) ids.splice(index, 1);
        else ids.push(id);

        ColleagueApi.saveFavorites(this.state.favorites);
        this.renderList();
    },

    /**
     * Сдвигает неделю
     * @param {number} weeks - на сколько недель (отрицательное — назад)
     * @returns {void}
     */
    shiftWeek(weeks) {
        this.state.monday = ColleagueApi.addDays(this.state.monday, weeks * 7);
        if (this.currentId()) this.loadWeek();
        else this.renderToolbar();
    },

    // ---------- отрисовка ----------

    /**
     * Создаёт элемент
     * @param {string} tag - тег
     * @param {string} [className] - класс
     * @param {string} [text] - текст
     * @returns {HTMLElement}
     */
    el(tag, className = '', text = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text) element.textContent = text;
        return element;
    },

    /**
     * Перерисовывает всё окно
     * @returns {void}
     */
    render() {
        if (!this.overlay) return;

        this.renderModes();
        this.renderList();
        this.renderToolbar();
        this.renderGrid();
        this.renderFooter();
    },

    /**
     * Переключатель режимов и подсказка в поле поиска
     * @returns {void}
     */
    renderModes() {
        const box = this.overlay?.querySelector('.mscp-col-modes');
        if (!box) return;

        const buttons = [['teachers', 'Учителя'], ['classes', 'Классы']].map(([mode, label]) => {
            const button = this.el('button', `mscp-col-mode${this.state.mode === mode ? ' mscp-col-active-mode' : ''}`, label);
            button.addEventListener('click', () => this.setMode(mode));
            return button;
        });

        box.replaceChildren(...buttons);

        const search = this.overlay.querySelector('.mscp-col-search');
        search.placeholder = this.isClasses() ? 'Поиск класса' : 'Поиск учителя';
        search.value = this.state.filter;
    },

    /**
     * Список: закреплённые сверху, фильтр по поиску; классы разбиты по параллелям
     * @returns {void}
     */
    renderList() {
        const list = this.overlay?.querySelector('.mscp-col-list');
        if (!list) return;

        const isClasses = this.isClasses();
        const { filter, loading } = this.state;
        const currentId = this.currentId();
        const pinnedIds = this.pinned();
        const normalize = text => text.toLowerCase().replace(/ё/g, 'е');
        const query = normalize(filter.trim());
        const isPinned = id => pinnedIds.includes(id);

        const shown = this.items()
            .filter(item => !query || normalize(`${item.name} ${item.subjects ?? ''}`).includes(query))
            .sort((a, b) => Number(isPinned(b.id)) - Number(isPinned(a.id)));

        const children = [];
        let group = null;
        shown.forEach(item => {
            if (isClasses) {
                const heading = isPinned(item.id) ? 'Закреплённые' : `${item.level}-е классы`;
                if (heading !== group) {
                    group = heading;
                    children.push(this.el('div', 'mscp-col-group', heading));
                }
            }

            const row = this.el('div', `mscp-col-item${item.id === currentId ? ' mscp-col-active' : ''}`);
            const star = this.el('button', `mscp-col-star${isPinned(item.id) ? ' mscp-col-pinned' : ''}`, '★');
            star.title = isPinned(item.id) ? 'Убрать из закреплённых' : 'Закрепить вверху списка';
            star.addEventListener('click', event => {
                event.stopPropagation();
                this.toggleFavorite(item.id);
            });

            const text = this.el('div', 'mscp-col-name');
            text.append(this.el('div', '', item.name), this.el('div', 'mscp-col-subjects', isClasses ? item.hint : item.subjects));
            row.append(text, star);
            row.addEventListener('click', () => this.select(item.id));
            children.push(row);
        });

        if (!shown.length && !loading) {
            children.push(this.el('div', 'mscp-col-empty', this.items().length ? 'Ничего не нашлось' : 'Список пуст'));
        }

        list.replaceChildren(...children);
    },

    /**
     * Панель над сеткой: кто выбран, переключатель недель, режим "вместе со мной", обновление
     * @returns {void}
     */
    renderToolbar() {
        const toolbar = this.overlay?.querySelector('.mscp-col-toolbar');
        if (!toolbar) return;

        const { monday, together } = this.state;
        const currentId = this.currentId();
        const isClasses = this.isClasses();
        const sunday = ColleagueApi.addDays(monday, 6);
        const format = date => date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });

        const prev = this.el('button', 'mscp-btn-action mscp-col-week', '‹');
        const next = this.el('button', 'mscp-btn-action mscp-col-week', '›');
        prev.title = 'Предыдущая неделя';
        next.title = 'Следующая неделя';
        prev.addEventListener('click', () => this.shiftWeek(-1));
        next.addEventListener('click', () => this.shiftWeek(1));

        const label = this.el('div', 'mscp-col-period', `${format(monday)} – ${format(sunday)}.${sunday.getFullYear()}`);

        const selected = this.items().find(item => item.id === currentId);
        const title = selected ? (isClasses ? `Класс ${selected.name}` : selected.name)
            : (isClasses ? 'Выберите класс в списке' : 'Выберите учителя в списке');
        const who = this.el('div', 'mscp-col-who', title);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'mscp-checkbox';
        checkbox.checked = together;
        checkbox.addEventListener('change', () => {
            this.state.together = checkbox.checked;
            if (this.currentId()) this.loadWeek();
        });
        const togetherLabel = this.el('label', 'mscp-label');
        togetherLabel.append(checkbox, 'Свободны вместе со мной');

        const refresh = this.el('button', 'mscp-btn-action mscp-col-refresh', 'Обновить');
        refresh.title = 'Запросить неделю у сайта, не глядя в кеш';
        refresh.disabled = !currentId;
        refresh.addEventListener('click', () => this.loadWeek(true));

        toolbar.replaceChildren(who, prev, label, next, togetherLabel, refresh);
    },

    /**
     * Сетка недели
     * @returns {void}
     */
    renderGrid() {
        const grid = this.overlay?.querySelector('.mscp-col-grid');
        if (!grid) return;

        const { loading, error, week, mine, monday } = this.state;
        const isClasses = this.isClasses();

        if (error) return grid.replaceChildren(this.el('div', 'mscp-col-message mscp-col-error', error));
        if (loading) return grid.replaceChildren(this.el('div', 'mscp-col-message', 'Загрузка…'));
        if (!this.currentId() || !week) {
            return grid.replaceChildren(this.el('div', 'mscp-col-message',
                isClasses ? 'Выберите класс в списке слева.' : 'Выберите учителя в списке слева.'));
        }

        const dates = this.DAYS.map((_, index) => ColleagueApi.addDays(monday, index));
        const today = ColleagueApi.isoDate(new Date());

        // Строк не меньше, чем номеров в школьном звонке; больше — если у кого-то есть поздние уроки
        let rows = CONFIG.LESSON_STARTS.length;
        [week, mine].forEach(source => Object.values(source?.days ?? {}).forEach(lessons => {
            lessons.forEach(lesson => { rows = Math.max(rows, lesson[0]); });
        }));

        const table = this.el('table', 'mscp-col-table');
        const head = table.createTHead().insertRow();
        head.insertCell().className = 'mscp-col-corner';
        dates.forEach((date, index) => {
            const cell = head.insertCell();
            cell.className = `mscp-col-day${ColleagueApi.isoDate(date) === today ? ' mscp-col-today' : ''}`;
            cell.textContent = `${this.DAYS[index]} ${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
        });

        const body = table.createTBody();
        for (let number = 1; number <= rows; number++) {
            const row = body.insertRow();
            const label = row.insertCell();
            label.className = 'mscp-col-number';
            label.append(this.el('b', '', String(number)), this.el('span', '', CONFIG.LESSON_STARTS[number - 1] ?? ''));

            dates.forEach(date => {
                const iso = ColleagueApi.isoDate(date);
                const theirs = (week.days[iso] ?? []).filter(lesson => lesson[0] === number);
                const mineHere = (mine?.days[iso] ?? []).filter(lesson => lesson[0] === number);
                row.append(this.renderCell(theirs, mineHere, Boolean(mine)));
            });
        }

        grid.replaceChildren(table);
    },

    /**
     * Ячейка сетки
     * @param {Array} theirs - уроки выбранного учителя или класса в этот час
     * @param {Array} mineHere - ваши уроки в этот час
     * @param {boolean} together - включён ли режим "вместе со мной"
     * @returns {HTMLElement}
     */
    renderCell(theirs, mineHere, together) {
        const cell = this.el('td');
        const isClasses = this.isClasses();

        if (theirs.length) {
            cell.className = 'mscp-col-busy';
            theirs.forEach(([, , className, subject, teacher]) => {
                const card = this.el('div', 'mscp-col-lesson');
                card.style.borderLeftColor = this.subjectColor(subject);

                if (isClasses) {
                    // У класса важно, какой предмет и кто ведёт; подгруппы — отдельные карточки друг под другом
                    card.append(this.el('span', 'mscp-col-subject-main', subject), this.el('span', 'mscp-col-teacher', teacher));
                    card.title = [subject, teacher].filter(Boolean).join(' — ');
                } else {
                    // У метагрупп (потоков) названия класса нет
                    if (className) {
                        const chip = this.el('span', 'mscp-col-class', className);
                        chip.style.background = classColor(className) || '#868e96';
                        card.append(chip);
                    }
                    card.append(this.el('span', 'mscp-col-subject', subject));
                    card.title = `${className} ${subject}`.trim();
                }

                cell.append(card);
            });
        } else if (together && mineHere.length) {
            cell.className = 'mscp-col-mine';
            cell.textContent = `у вас: ${mineHere.map(lesson => lesson[2]).filter(Boolean).join(', ') || 'урок'}`;
        } else {
            cell.className = together ? 'mscp-col-both' : 'mscp-col-free';
            cell.textContent = together ? '✓' : '';
        }

        return cell;
    },

    /**
     * Цвет предмета для полоски на карточке: один предмет — один цвет
     * @param {string} subject - название предмета
     * @returns {string}
     */
    subjectColor(subject) {
        let hash = 0;
        for (const char of subject) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
        return SCHEDULE_SUBJECT_COLORS[hash % SCHEDULE_SUBJECT_COLORS.length];
    },

    /**
     * Нижняя строка: откуда данные, подсказка и сброс кеша
     * @returns {void}
     */
    renderFooter() {
        const footer = this.overlay?.querySelector('.mscp-col-footer');
        if (!footer) return;

        const { week, note, together } = this.state;
        const parts = [];

        if (week) {
            const time = new Date(week.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            parts.push(week.stale ? `Сайт не ответил, показаны данные из кеша от ${time}.`
                : week.fromCache ? `Из кеша, обновлено ${time}.` : `Загружено с сайта ${time}.`);
        }
        if (note) parts.push(note);

        if (this.isClasses()) {
            parts.push(together
                ? '✓ — свободны и вы, и класс. Свободно значит «нет урока в расписании».'
                : 'Зелёное — у класса нет урока в расписании.');
        } else {
            parts.push(together
                ? '✓ — свободны оба. Свободно значит «нет урока в расписании».'
                : 'Зелёное — у коллеги нет урока в расписании: внеурочка и дежурства не учитываются.');
        }

        const clear = this.el('button', 'mscp-btn-action mscp-col-clear', 'Сбросить кеш');
        clear.title = 'Удалить сохранённые списки и расписания. Закреплённые останутся.';
        clear.addEventListener('click', () => {
            ColleagueApi.clear();
            this.state.teachers = [];
            this.state.classes = [];
            this.state.week = null;
            this.state.mine = null;
            this.render();
            this.loadList();
        });

        footer.replaceChildren(this.el('div', 'mscp-col-hint', parts.join(' ')), clear);
    },

    // ---------- стили ----------

    /**
     * Добавляет стили окна (один раз)
     * @returns {void}
     */
    addStyles() {
        if (document.getElementById('mscp-colleagues-styles')) return;

        const style = document.createElement('style');
        style.id = 'mscp-colleagues-styles';
        style.textContent = `
            .mscp-col-window {
                display: flex;
                flex-direction: column;
                width: min(1100px, 96vw);
                height: min(720px, 92vh);
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                overflow: hidden;
            }
            .mscp-col-body {
                flex: 1;
                display: flex;
                min-height: 0;
            }
            .mscp-col-side {
                width: 260px;
                flex: none;
                display: flex;
                flex-direction: column;
                border-right: 1px solid #e9ecef;
                background: #f8f9fa;
            }
            .mscp-col-modes {
                display: flex;
                margin: 12px 12px 0;
                padding: 2px;
                background: #e9ecef;
                border-radius: 8px;
            }
            .mscp-col-mode {
                flex: 1;
                padding: 6px 0;
                border: none;
                border-radius: 6px;
                background: none;
                color: #495057;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
            }
            .mscp-col-active-mode {
                background: white;
                color: #333;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
            }
            .mscp-col-search {
                margin: 10px 12px;
                padding: 8px 10px;
                border: 1px solid #ced4da;
                border-radius: 6px;
                font-size: 13px;
            }
            .mscp-col-list {
                flex: 1;
                overflow-y: auto;
                padding: 0 6px 12px;
            }
            .mscp-col-group {
                padding: 8px 8px 2px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                color: #868e96;
            }
            .mscp-col-item {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 8px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                color: #333;
            }
            .mscp-col-item:hover {
                background: #e9ecef;
            }
            .mscp-col-active, .mscp-col-active:hover {
                background: #dbe4ff;
            }
            .mscp-col-name {
                flex: 1;
                min-width: 0;
            }
            .mscp-col-subjects {
                font-size: 11px;
                color: #868e96;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .mscp-col-star {
                border: none;
                background: none;
                cursor: pointer;
                font-size: 16px;
                color: #ced4da;
                line-height: 1;
            }
            .mscp-col-star:hover { color: #f59f00; }
            .mscp-col-pinned { color: #f59f00; }
            .mscp-col-empty {
                padding: 12px;
                font-size: 13px;
                color: #868e96;
            }
            .mscp-col-main {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
            }
            .mscp-col-toolbar {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
                padding: 10px 14px;
                border-bottom: 1px solid #e9ecef;
            }
            .mscp-col-who {
                flex: 1 1 100%;
                font-size: 15px;
                font-weight: 600;
                color: #333;
            }
            .mscp-col-week {
                flex: none !important;
                width: 32px;
                padding: 4px 0 !important;
                font-size: 16px !important;
            }
            .mscp-col-period {
                font-size: 13px;
                color: #495057;
                min-width: 120px;
                text-align: center;
            }
            .mscp-col-refresh, .mscp-col-clear {
                flex: none !important;
                padding: 6px 12px !important;
            }
            .mscp-col-refresh:disabled { opacity: 0.5; cursor: default; }
            .mscp-col-grid {
                flex: 1;
                overflow: auto;
                padding: 10px 14px;
            }
            .mscp-col-message {
                padding: 40px 0;
                text-align: center;
                color: #868e96;
                font-size: 14px;
            }
            .mscp-col-error { color: #c92a2a; }
            .mscp-col-table {
                width: 100%;
                table-layout: fixed;
                border-collapse: separate;
                border-spacing: 4px;
                font-size: 12px;
            }
            .mscp-col-table td, .mscp-col-table th {
                padding: 0;
                vertical-align: middle;
            }
            .mscp-col-corner, .mscp-col-number { width: 56px; }
            .mscp-col-day {
                padding: 4px 0 !important;
                text-align: center;
                font-weight: 600;
                color: #495057;
            }
            .mscp-col-today { color: #496be8; }
            .mscp-col-number {
                text-align: center;
                color: #868e96;
            }
            .mscp-col-number b {
                display: block;
                font-size: 14px;
                color: #495057;
            }
            .mscp-col-table tbody td {
                height: 50px;
                border-radius: 6px;
                text-align: center;
            }
            .mscp-col-free { background: #e6f6ea; }
            .mscp-col-both { background: #8fd3a3; color: #1b5e30; font-size: 16px; font-weight: 700; }
            .mscp-col-mine { background: #f1f3f5; color: #868e96; font-size: 11px; }
            .mscp-col-busy {
                background: white;
                border: 1px solid #dee2e6;
                text-align: left !important;
            }
            .mscp-col-lesson {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 2px;
                padding: 3px 6px;
                border-left: 4px solid #496be8;
                color: #333;
            }
            .mscp-col-lesson + .mscp-col-lesson {
                border-top: 1px solid #f1f3f5;
            }
            .mscp-col-class {
                flex: none;
                padding: 1px 5px;
                border-radius: 4px;
                color: white;
                font-weight: 600;
            }
            .mscp-col-subject, .mscp-col-subject-main, .mscp-col-teacher {
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .mscp-col-subject { font-size: 11px; }
            .mscp-col-subject-main {
                font-weight: 600;
                display: -webkit-box;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 2;
                white-space: normal;
                line-height: 1.2;
            }
            .mscp-col-teacher { font-size: 11px; color: #868e96; }
            .mscp-col-footer {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 16px;
                border-top: 1px solid #e9ecef;
                background: #f8f9fa;
            }
            .mscp-col-hint {
                flex: 1;
                font-size: 12px;
                color: #6c757d;
                line-height: 1.4;
            }
            @media (max-width: 760px) {
                .mscp-col-body { flex-direction: column; }
                .mscp-col-side { width: auto; max-height: 30%; border-right: none; border-bottom: 1px solid #e9ecef; }
            }
        `;
        document.head.appendChild(style);
    }
};
