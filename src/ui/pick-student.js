// ============================================================
// ВЫБОР УЧЕНИКА ДЛЯ ОТВЕТА
// ============================================================

/**
 * Выбор ученика к доске на странице журнала группы
 * - Кнопка выбирает ученика и подсвечивает его строку в журнале; других окон нет
 * - Данные берутся из API сайта: ученики группы, их оценки за учебный год и отметки "Н" на сегодня
 * - Предвзятый режим: чем меньше у ученика оценок и чем давнее последняя, тем вероятнее его выбор;
 *   кто получил оценку на последнем уроке (или уже отвечал сегодня), выбирается редко, но не исключён
 * - Случайный режим: все присутствующие равновероятны; отсутствующие сегодня не выбираются в обоих режимах
 * - За день можно выбирать много раз, но одного ученика дважды нельзя: названные хранятся по группе и дню
 * - Нажатие на кнопку при подсвеченной строке снимает подсветку (ученик остаётся названным), следующее выбирает нового
 * - Состояние дня хранится в localStorage, поэтому не пропадает при перезагрузке страницы
 */
const StudentPicker = {
    /** Ключ localStorage с выбором дня */
    STORAGE_KEY: 'MSCP_pick',

    /** Оценка не старше стольких дней учитывается в давности: дальше давность перестаёт расти */
    MAX_DAYS: 60,

    /** Через столько дней без оценок вес давности удваивается */
    RECENCY_DAYS: 14,

    /** Во сколько раз реже выбирается ученик, получивший оценку на последнем уроке */
    RECENT_FACTOR: 0.1,

    /**
     * Множитель за оценки = (1 / (1 + оценок / MARKS_HALF)) ^ MARKS_POWER
     * Квадрат (MARKS_POWER = 2) делает нехватку оценок главным признаком: давность не должна перевешивать
     * ученика с большим числом оценок
     */
    MARKS_HALF: 2,
    MARKS_POWER: 2,

    /** @type {boolean} Идёт ли сейчас загрузка данных для выбора */
    busy: false,

    /**
     * Номер группы из адреса журнала
     * @returns {number|null}
     */
    groupId() {
        const match = /\/journal\/(?:grade|my)\/(\d+)/.exec(window.location.pathname);
        return match ? Number(match[1]) : null;
    },

    /**
     * Дата из ответа сайта ДД.ММ.ГГГГ
     * @param {string} text
     * @returns {Date}
     */
    parseDate(text) {
        const [day, month, year] = text.split('.').map(Number);
        return new Date(year, month - 1, day);
    },

    /**
     * Состояние выбора этой группы за сегодня
     * @returns {{group: number, date: string, picked: number[], active: ?{name: string, why: string}}}
     *          picked — id названных учеников, active — тот, чья строка подсвечена сейчас
     */
    dayState() {
        const empty = { group: this.groupId(), date: ColleagueApi.isoDate(new Date()), picked: [], active: null };

        try {
            const saved = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || 'null');
            return saved?.group === empty.group && saved.date === empty.date ? { ...empty, ...saved } : empty;
        } catch (error) {
            return empty;
        }
    },

    /**
     * Запоминает состояние дня
     * @param {Object} state - см. dayState()
     * @returns {void}
     */
    saveState(state) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error('Не удалось сохранить выбор ученика:', error);
        }
    },

    /**
     * Загружает учеников группы с числом оценок и давностью последней
     * @param {number} groupId
     * @returns {Promise<Array<{id: number, name: string, marks: number, last: ?Date, days: ?number,
     *          recent: boolean, absent: boolean}>>}
     */
    async loadStudents(groupId) {
        const session = ColleagueApi.session();
        const today = new Date();
        const todayText = HomeworkApi.siteDate(ColleagueApi.isoDate(today));
        const startYear = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;

        const [profiles, marks, absences] = await Promise.all([
            ColleagueApi.get('/core/teacher/v1/student_profiles', {
                academic_year_id: session?.year, group_ids: groupId, with_groups: true, per_page: 150, page: 1
            }),
            this.loadMarks(groupId, `01.09.${startYear}`, `31.08.${startYear + 1}`),
            // Отметки "Н" справочные: без них выбор всё равно работает, просто без исключения отсутствующих
            ColleagueApi.get('/core/teacher/v1/attendances', {
                group_ids: groupId, academic_year_id: session?.year, start_at: todayText, stop_at: todayText, page: 1, per_page: 1000
            }).catch(error => {
                console.error('Не удалось получить отметки о пропусках:', error);
                return [];
            })
        ]);

        const byStudent = new Map();
        const dates = new Set();
        marks.filter(mark => !mark.deleted_by).forEach(mark => {
            const date = this.parseDate(mark.date);
            const entry = byStudent.get(mark.student_profile_id) ?? { count: 0, last: null, dates: new Set() };
            entry.count++;
            if (!entry.last || date > entry.last) entry.last = date;
            entry.dates.add(mark.date);
            byStudent.set(mark.student_profile_id, entry);
            dates.add(mark.date);
        });

        // Последний урок с оценками; если он сегодняшний, то и предыдущий: сегодня уже отвечавшие тоже не первые кандидаты
        const recentDates = [...dates]
            .sort((a, b) => this.parseDate(b) - this.parseDate(a))
            .slice(0, dates.has(todayText) ? 2 : 1);
        const absent = new Set(absences.filter(item => item.date === todayText).map(item => item.student_profile_id));

        return profiles
            .filter(profile => !profile.deleted && !profile.transferred)
            .map(profile => {
                const entry = byStudent.get(profile.id);
                return {
                    id: profile.id,
                    name: profile.short_name,
                    marks: entry?.count ?? 0,
                    last: entry?.last ?? null,
                    days: entry?.last ? Math.max(0, Math.round((today - entry.last) / 86400000)) : null,
                    recent: recentDates.some(date => entry?.dates.has(date)),
                    absent: absent.has(profile.id)
                };
            });
    },

    /**
     * Оценки группы за период, все страницы
     * @param {number} groupId
     * @param {string} from - ДД.ММ.ГГГГ
     * @param {string} to - ДД.ММ.ГГГГ
     * @returns {Promise<Object[]>}
     */
    async loadMarks(groupId, from, to) {
        const perPage = 300;
        const all = [];

        for (let page = 1; ; page++) {
            const marks = await ColleagueApi.get('/core/teacher/v1/marks', {
                group_ids: groupId, lesson_date_from: from, lesson_date_to: to, per_page: perPage, page
            });
            all.push(...marks);
            if (marks.length < perPage) return all;
        }
    },

    /**
     * Вес ученика при выборе
     * @param {Object} student - ученик из loadStudents()
     * @param {'biased'|'random'} mode
     * @returns {number}
     */
    weight(student, mode) {
        if (mode !== 'biased') return 1;

        const fewMarks = (1 / (1 + student.marks / this.MARKS_HALF)) ** this.MARKS_POWER;
        const days = student.days === null ? this.MAX_DAYS : Math.min(student.days, this.MAX_DAYS);
        const longAgo = 1 + days / this.RECENCY_DAYS;
        return fewMarks * longAgo * (student.recent ? this.RECENT_FACTOR : 1);
    },

    /**
     * Выбирает ученика по весам среди присутствующих, ещё не названных сегодня
     * @param {Array} students - ученики из loadStudents()
     * @param {'biased'|'random'} mode
     * @param {number[]} picked - id уже названных сегодня
     * @returns {Object|null} null, если выбирать не из кого
     */
    choose(students, mode, picked) {
        const pool = students.filter(student => !student.absent && !picked.includes(student.id));
        if (!pool.length) return null;

        const weights = pool.map(student => this.weight(student, mode));
        let point = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);

        for (let i = 0; i < pool.length; i++) {
            point -= weights[i];
            if (point < 0) return pool[i];
        }
        return pool[pool.length - 1];
    },

    /**
     * Пояснение к выбору: сколько оценок и как давно последняя
     * @param {Object} student
     * @returns {string}
     */
    describe(student) {
        const parts = [student.marks ? `оценок: ${student.marks}` : 'оценок ещё нет'];
        if (student.last) {
            const date = HomeworkApi.siteDate(ColleagueApi.isoDate(student.last)).slice(0, 5);
            parts.push(`последняя — ${date}` + (student.days ? ` (${student.days} дн. назад)` : ' (сегодня)'));
        }
        if (student.recent) parts.push('отвечал на последнем уроке');
        return parts.join(', ');
    },

    /**
     * Обработчик кнопки: если строка подсвечена, снимает подсветку (ученик остаётся названным),
     * иначе выбирает нового ученика, ещё не названного сегодня, и подсвечивает его строку
     * @param {HTMLButtonElement} button - нажатая кнопка
     * @returns {Promise<void>}
     */
    async pick(button) {
        if (this.busy) return;

        const state = this.dayState();
        if (state.active) {
            state.active = null;
            this.saveState(state);
            this.applyHighlight();
            return;
        }

        const groupId = this.groupId();
        if (!groupId) return;

        this.busy = true;
        button.disabled = true;

        try {
            const student = this.choose(await this.loadStudents(groupId), loadSettings().pickMode, state.picked);
            if (!student) {
                this.toast('Все присутствующие ученики уже были названы сегодня.');
                return;
            }

            state.picked.push(student.id);
            state.active = { name: student.name, why: this.describe(student) };
            this.saveState(state);
            this.applyHighlight(true);
        } catch (error) {
            console.error('Не удалось выбрать ученика:', error);
            this.toast(`Не удалось выбрать ученика: ${ColleagueApi.describeError(error)}`);
        } finally {
            this.busy = false;
            button.disabled = false;
        }
    },

    /**
     * Подсвечивает строку выбранного ученика и убирает подсветку с остальных
     * Вызывается и при перерисовке таблицы журнала, чтобы подсветка не пропадала
     * @param {boolean} [announce=false] - сообщить, если выбранного ученика нет в таблице журнала
     * @returns {void}
     */
    applyHighlight(announce = false) {
        const saved = this.dayState().active;
        const body = document.querySelector(CONFIG.SELECTORS.JOURNAL_TABLE)?.lastChild;
        if (!body?.rows) return;

        this.addStyles();
        let found = null;

        for (const row of body.rows) {
            const isPicked = Boolean(saved) && (row.cells[0]?.textContent ?? '').includes(saved.name);
            if (isPicked) found = row;

            if (isPicked) {
                row.dataset.mscpPicked = 'true';
                row.title = `Отвечает: ${saved.name}\n${saved.why}`;
                // Слой рамки позиционируется относительно ячейки: обычным (static) ячейкам нужен relative
                for (const cell of row.cells) {
                    if (!cell.dataset.mscpRel && getComputedStyle(cell).position === 'static') {
                        cell.style.position = 'relative';
                        cell.dataset.mscpRel = 'true';
                    }
                }
            } else if (row.dataset.mscpPicked) {
                delete row.dataset.mscpPicked;
                row.removeAttribute('title');
                for (const cell of row.cells) {
                    if (cell.dataset.mscpRel) {
                        cell.style.removeProperty('position');
                        delete cell.dataset.mscpRel;
                    }
                }
            }
        }

        if (announce && saved && !found) this.toast(`Выбран ${saved.name}, но в таблице журнала его нет.`);
    },

    /**
     * Короткое сообщение внизу экрана; нужно только для ошибок, выбор показывается в самой таблице
     * @param {string} text
     * @returns {void}
     */
    toast(text) {
        this.addStyles();
        document.querySelector('.mscp-pick-toast')?.remove();

        const toast = document.createElement('div');
        toast.className = 'mscp-pick-toast';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    },

    /**
     * Добавляет стили подсветки один раз
     * @returns {void}
     */
    addStyles() {
        if (document.getElementById('mscp-pick-styles')) return;

        const style = document.createElement('style');
        style.id = 'mscp-pick-styles';
        style.textContent = `
            /* Светло-зелёная полоса по всей строке в духе подсветки строки при наведении на сайте: слой поверх
               каждой ячейки, потому что у цветных ячеек внутри есть блоки со своим фоном */
            tr[data-mscp-picked="true"] > td::after {
                content: '';
                position: absolute;
                inset: 0;
                box-sizing: border-box;
                background: rgba(64, 192, 87, 0.14);
                border-top: 1px solid rgba(47, 158, 68, 0.85);
                border-bottom: 1px solid rgba(47, 158, 68, 0.85);
                pointer-events: none;
                z-index: 5;
            }
            .mscp-pick-toast {
                position: fixed;
                left: 50%;
                bottom: 24px;
                transform: translateX(-50%);
                padding: 10px 16px;
                border-radius: 8px;
                background: #343a40;
                color: white;
                font: 14px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
                z-index: 1100;
            }
        `;
        document.head.appendChild(style);
    }
};
