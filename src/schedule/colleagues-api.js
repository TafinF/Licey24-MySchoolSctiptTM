// ============================================================
// РАСПИСАНИЕ КОЛЛЕГ: запросы к API сайта и кеш в localStorage
// ============================================================

/**
 * Получает списки учителей и классов школы и недельное расписание любого учителя или класса
 * - Вход берётся у самого сайта: токен из cookie, год и школа из его localStorage, пароли не нужны
 * - Всё полученное кладётся в localStorage (ключ CONFIG.COLLEAGUES.CACHE_KEY), чтобы не гонять лишние запросы:
 *   списки учителей и классов живут неделю, текущая и будущие недели — несколько часов, прошедшие недели не меняются
 * - Если сайт не ответил, а в кеше есть устаревшие данные, отдаются они с пометкой stale
 * - Закреплённые учителя и классы, последний выбор и режим лежат отдельным ключом: сброс кеша их не трогает
 */
const ColleagueApi = {
    /** @type {{teachers: ?{key: string, at: number, list: Array}, classes: ?{key: string, at: number, list: Array}, weeks: Object}|null} Кеш в памяти, зеркало localStorage */
    store: null,

    /**
     * Читает значение cookie
     * @param {string} name - имя cookie
     * @returns {string} значение; пустая строка, если cookie нет
     */
    readCookie(name) {
        const part = document.cookie.split('; ').find(item => item.startsWith(`${name}=`));
        return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
    },

    /**
     * Читает JSON из localStorage сайта
     * @param {string} key - ключ
     * @returns {*} значение; null, если ключа нет или он не JSON
     */
    readSiteValue(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (error) {
            return null;
        }
    },

    /**
     * Данные текущего входа: токен, учебный год, школа и профиль учителя
     * @returns {{token: string, year: number, school: number, profile: number}|null} null, если вход не определён
     */
    session() {
        const info = this.readSiteValue('profileInfo');
        const year = Number(this.readSiteValue('MES_API_YEAR_ID') ?? this.readSiteValue('currentAcademicYear')?.id);
        const profile = Number(info?.id ?? this.readCookie('profile_id'));
        const token = this.readCookie('aupd_token');

        if (!token || !year || !info?.school_id || !profile) return null;
        return { token, year, school: info.school_id, profile };
    },

    /**
     * GET-запрос к API сайта
     * @param {string} path - путь после /api/ej
     * @param {Object} params - параметры запроса
     * @returns {Promise<Array>} тело ответа
     * @throws {Error} с полем status (0 — вход не определён, иначе код ответа сайта)
     */
    async get(path, params) {
        const session = this.session();
        if (!session) throw Object.assign(new Error('Не удалось определить вход'), { status: 0 });

        const response = await fetch(`/api/ej${path}?${new URLSearchParams(params)}`, {
            headers: {
                'Auth-Token': session.token,
                'Profile-Id': String(session.profile),
                'x-mes-subsystem': 'teacherweb',
                Accept: 'application/json'
            }
        });
        if (!response.ok) throw Object.assign(new Error(`Сайт ответил ${response.status}`), { status: response.status });

        return response.json();
    },

    /**
     * Понятное сообщение об ошибке запроса
     * @param {Error} error - ошибка из get()
     * @returns {string}
     */
    describeError(error) {
        if (error.status === 0) return 'Не удалось определить вход. Обновите страницу.';
        if (error.status === 401) return 'Вход устарел. Обновите страницу или войдите заново.';
        if (error.status === 403) return 'У вашей учётной записи нет доступа к расписанию этого учителя.';
        return `Не удалось получить данные: ${error.message}`;
    },

    // ---------- даты ----------

    /**
     * Дата в виде ГГГГ-ММ-ДД по местному времени (toISOString сдвигает день по UTC)
     * @param {Date} date
     * @returns {string}
     */
    isoDate(date) {
        const pad = value => String(value).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    },

    /**
     * Прибавляет дни, время обнуляется
     * @param {Date} date
     * @param {number} days
     * @returns {Date}
     */
    addDays(date, days) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
    },

    /**
     * Понедельник недели, в которую входит дата
     * @param {Date} date
     * @returns {Date}
     */
    weekStart(date) {
        return this.addDays(date, -((date.getDay() + 6) % 7));
    },

    // ---------- кеш ----------

    /**
     * Кеш из памяти; при первом обращении читается из localStorage
     * @returns {{teachers: ?Object, classes: ?Object, weeks: Object}}
     */
    load() {
        if (this.store) return this.store;

        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem(CONFIG.COLLEAGUES.CACHE_KEY));
        } catch (error) {
            console.error('Ошибка чтения кеша расписаний:', error);
        }

        this.store = { teachers: saved?.teachers ?? null, classes: saved?.classes ?? null, weeks: saved?.weeks ?? {} };
        return this.store;
    },

    /**
     * Сохраняет кеш; лишние старые недели удаляются, при нехватке места убирается половина недель
     * @returns {void}
     */
    save() {
        const weeks = this.store.weeks;
        const keys = Object.keys(weeks).sort((a, b) => weeks[a].at - weeks[b].at);
        keys.slice(0, Math.max(0, keys.length - CONFIG.COLLEAGUES.MAX_WEEKS)).forEach(key => delete weeks[key]);

        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                localStorage.setItem(CONFIG.COLLEAGUES.CACHE_KEY, JSON.stringify(this.store));
                return;
            } catch (error) {
                const oldest = Object.keys(weeks).sort((a, b) => weeks[a].at - weeks[b].at);
                oldest.slice(0, Math.ceil(oldest.length / 2)).forEach(key => delete weeks[key]);
            }
        }
    },

    /**
     * Полностью очищает кеш расписаний (закреплённые учителя и классы остаются)
     * @returns {void}
     */
    clear() {
        this.store = { teachers: null, classes: null, weeks: {} };
        try {
            localStorage.removeItem(CONFIG.COLLEAGUES.CACHE_KEY);
        } catch (error) {
            console.error('Ошибка очистки кеша расписаний:', error);
        }
    },

    /**
     * Закреплённые и последние выбранные учитель и класс, последний открытый режим
     * @returns {{ids: number[], last: ?number, classIds: number[], lastClass: ?number, mode: string}}
     *          ids и last — учителя, classIds и lastClass — классы, mode — 'teachers' или 'classes'
     */
    loadFavorites() {
        try {
            const saved = JSON.parse(localStorage.getItem(CONFIG.COLLEAGUES.FAVORITES_KEY));
            return {
                ids: saved?.ids ?? [],
                last: saved?.last ?? null,
                classIds: saved?.classIds ?? [],
                lastClass: saved?.lastClass ?? null,
                mode: saved?.mode === 'classes' ? 'classes' : 'teachers'
            };
        } catch (error) {
            return { ids: [], last: null, classIds: [], lastClass: null, mode: 'teachers' };
        }
    },

    /**
     * @param {{ids: number[], last: ?number, classIds: number[], lastClass: ?number, mode: string}} favorites
     * @returns {void}
     */
    saveFavorites(favorites) {
        try {
            localStorage.setItem(CONFIG.COLLEAGUES.FAVORITES_KEY, JSON.stringify(favorites));
        } catch (error) {
            console.error('Ошибка сохранения списка учителей:', error);
        }
    },

    // ---------- данные ----------

    /**
     * Список из кеша, если он свежий, иначе запрос; при неудаче — устаревший список из кеша
     * @param {'teachers'|'classes'} slot - какой список
     * @param {function(number, number): Promise<Array>} fetchList - запрос списка, получает учебный год и школу
     * @param {boolean} force - игнорировать кеш
     * @returns {Promise<{list: Array, at: number, stale: boolean}>}
     */
    async getList(slot, fetchList, force) {
        const { year, school } = this.session() ?? {};
        const key = `${school}-${year}`;
        const cached = this.load()[slot];
        const usable = cached?.key === key ? cached : null;

        if (usable && !force && Date.now() - usable.at < CONFIG.COLLEAGUES.TEACHERS_TTL_MS) {
            return { list: usable.list, at: usable.at, stale: false };
        }

        try {
            const list = await fetchList(year, school);
            const store = this.load();
            store[slot] = { key, at: Date.now(), list };
            this.save();
            return { list, at: store[slot].at, stale: false };
        } catch (error) {
            if (usable) return { list: usable.list, at: usable.at, stale: true };
            throw error;
        }
    },

    /**
     * Список учителей школы (по 100 на страницу)
     * @param {boolean} [force=false] - игнорировать кеш
     * @returns {Promise<{list: Array<{id: number, name: string, subjects: string}>, at: number, stale: boolean}>}
     */
    getTeachers(force = false) {
        return this.getList('teachers', async (year, school) => {
            const profiles = [];
            for (let page = 1; page <= 20; page++) {
                const data = await this.get('/core/teacher/v1/teacher_profiles', {
                    academic_year_id: year, school_id: school, per_page: 100, page
                });
                profiles.push(...data);
                if (data.length < 100) break;
            }

            return profiles
                .filter(profile => !profile.deleted && !profile.virtual)
                .map(profile => ({
                    id: profile.id,
                    name: profile.name,
                    subjects: (profile.subjects ?? []).map(subject => subject.name).slice(0, 3).join(', ')
                }))
                .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        }, force);
    },

    /**
     * Список классов школы, по параллелям
     * @param {boolean} [force=false] - игнорировать кеш
     * @returns {Promise<{list: Array<{id: number, name: string, level: number, hint: string}>, at: number, stale: boolean}>}
     */
    getClasses(force = false) {
        return this.getList('classes', async (year, school) => {
            const units = await this.get('/core/teacher/v1/class_units', {
                academic_year_id: year, school_id: school, per_page: 200
            });

            return units
                .map(unit => ({
                    id: unit.id,
                    name: unit.name,
                    level: Number.parseInt(unit.name, 10) || unit.class_level_id || 0,
                    hint: unit.student_count ? `${unit.student_count} уч.` : ''
                }))
                .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ru'));
        }, force);
    },

    /**
     * Уроки учителя или класса за неделю по дням и номерам уроков школьного звонка
     * Отменённые уроки и уроки, перенесённые на другую дату, не берутся: сайт отдаёт их на старом месте
     * @param {{type: 'teacher'|'class', id: number}} owner - чьё расписание: учителя или класса
     * @param {Date} monday - понедельник нужной недели
     * @param {boolean} [force=false] - игнорировать кеш
     * @returns {Promise<{days: Object<string, Array<[number, string, string, string, string]>>, at: number, stale: boolean, fromCache: boolean}>}
     *          days: {ГГГГ-ММ-ДД: [[номер урока, время начала, класс, предмет, учитель], ...]}
     */
    async getWeek(owner, monday, force = false) {
        const isClass = owner.type === 'class';
        const from = this.isoDate(monday);
        const to = this.isoDate(this.addDays(monday, 6));
        // Ключ учителя без приставки: недели, сохранённые до появления классов, остаются в силе
        const key = `${isClass ? 'c' : ''}${owner.id}|${from}`;
        const cached = this.load().weeks[key];

        // Прошедшая неделя не меняется, остальные устаревают
        const isPast = to < this.isoDate(new Date());
        const isFresh = cached && (isPast || Date.now() - cached.at < CONFIG.COLLEAGUES.WEEK_TTL_MS);
        if (isFresh && !force) return { days: cached.days, at: cached.at, stale: false, fromCache: true };

        try {
            const items = [];
            for (let page = 1; page <= 5; page++) {
                const data = await this.get('/plan/teacher/v1/schedule_items', {
                    academic_year_id: this.session()?.year,
                    ...(isClass ? { class_unit_id: owner.id } : { teacher_id: owner.id }),
                    from, to, with_group_class_subject_info: true, per_page: 300, page
                });
                items.push(...data);
                if (data.length < 300) break;
            }

            const days = this.compactWeek(items);
            this.load().weeks[key] = { at: Date.now(), days };
            this.save();
            return { days, at: this.load().weeks[key].at, stale: false, fromCache: false };
        } catch (error) {
            if (cached) return { days: cached.days, at: cached.at, stale: true, fromCache: true };
            throw error;
        }
    },

    /**
     * "Байч Екатерина Юрьевна" → "Байч Е.Ю."
     * @param {?string} fullName - ФИО полностью
     * @returns {string} пустая строка, если имени нет
     */
    shortName(fullName) {
        const [surname, ...rest] = (fullName ?? '').trim().split(/\s+/);
        return [surname, rest.map(part => `${part[0]}.`).join('')].filter(Boolean).join(' ');
    },

    /**
     * Сворачивает ответ сайта в короткий вид для кеша
     * Номер урока считается по времени начала: поле lesson_number в ответе не школьный номер
     * @param {Array} items - записи schedule_items
     * @returns {Object<string, Array<[number, string, string, string, string]>>}
     */
    compactWeek(items) {
        const pad = value => String(value).padStart(2, '0');
        const days = {};

        items.forEach(item => {
            if (item.cancelled || item.transferred_to_date) return;

            const [year, month, day] = item.date;
            const [hours, minutes] = item.time;
            const iso = `${year}-${pad(month)}-${pad(day)}`;

            (days[iso] ??= []).push([
                lessonNumberFromStart(hours, minutes),
                `${pad(hours)}:${pad(minutes)}`,
                item.class_unit_name ?? '',
                item.subject_name ?? '',
                this.shortName(item.teacher_name)
            ]);
        });

        Object.values(days).forEach(lessons => lessons.sort((a, b) => a[1].localeCompare(b[1])));
        return days;
    }
};
