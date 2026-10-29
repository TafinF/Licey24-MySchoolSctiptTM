// ============================================================
// РАСПИСАНИЕ: комментарии к урокам недели
// ============================================================

/**
 * Сколько комментариев к ученикам стоит на уроках показанной недели
 * Нужно значку "У": урок без оценок, но с комментарием помечается оранжевым.
 * - Карточка сайта не хранит id урока, поэтому урок находится по дню, времени начала и классу
 * - Неделя грузится один раз и обновляется не чаще раза в TTL; пока данных нет, комментариев считается ноль
 * - Сбой запроса не ломает расписание: комментарии просто не показываются до следующего обновления
 */
const ScheduleComments = {
    /** Через сколько миллисекунд загруженную неделю можно запросить заново */
    TTL: 60000,

    /** @type {Map<string, {loadedAt: number, counts: Map<string, number>}>} Недели по ключу "с|по" */
    weeks: new Map(),

    /**
     * Ключ урока в карточке недели
     * @param {string} iso - день в виде ГГГГ-ММ-ДД
     * @param {string} start - время начала "ЧЧ:ММ"
     * @param {string} className - класс в виде "10-А"
     * @returns {string}
     */
    key(iso, start, className) {
        return `${iso}|${start}|${className}`;
    },

    /**
     * Число комментариев на уроке; при необходимости запускает загрузку недели
     * @param {string} from - первый день недели, ГГГГ-ММ-ДД
     * @param {string} to - последний день недели, ГГГГ-ММ-ДД
     * @param {string} iso - день урока
     * @param {string} start - время начала "ЧЧ:ММ"
     * @param {string} className - класс в виде "10-А"
     * @returns {number} 0, если урок не найден или неделя ещё не загружена
     */
    count(from, to, iso, start, className) {
        const week = this.load(from, to);
        return week.counts.get(this.key(iso, start, className)) ?? 0;
    },

    /**
     * Возвращает загруженную неделю и, если она устарела, запускает обновление
     * @param {string} from
     * @param {string} to
     * @returns {{loadedAt: number, counts: Map<string, number>}}
     */
    load(from, to) {
        const id = `${from}|${to}`;
        let week = this.weeks.get(id);

        if (!week) {
            week = { loadedAt: 0, counts: new Map(), loading: false };
            this.weeks.set(id, week);
        }

        if (!week.loading && Date.now() - week.loadedAt > this.TTL) {
            week.loading = true;
            this.request(from, to)
                .then(counts => { week.counts = counts; })
                .catch(error => console.error('Не удалось загрузить комментарии к урокам недели:', error))
                .finally(() => {
                    week.loading = false;
                    week.loadedAt = Date.now();
                    ScheduleLayout.schedule();
                });
        }

        return week;
    },

    /**
     * Запрашивает уроки недели и комментарии к ним
     * @param {string} from
     * @param {string} to
     * @returns {Promise<Map<string, number>>} {ключ урока: число комментариев}, только уроки с комментариями
     */
    async request(from, to) {
        const session = ColleagueApi.session();
        const items = await ColleagueApi.get('/plan/teacher/v1/schedule_items', {
            academic_year_id: session?.year, teacher_id: session?.profile, from, to, with_group_class_subject_info: true, per_page: 300, page: 1
        });

        const byId = new Map(items.map(item => [item.id, item]));
        const found = await HomeworkApi.getCommentCounts([...byId.keys()]);
        const counts = new Map();

        for (const [lessonId, count] of Object.entries(found)) {
            const item = byId.get(Number(lessonId));
            if (!item) continue;

            const pad = value => String(value).padStart(2, '0');
            const key = this.key(HomeworkApi.itemDate(item.date), `${pad(item.time[0])}:${pad(item.time[1])}`, item.class_unit_name ?? '');
            counts.set(key, (counts.get(key) ?? 0) + count);
        }

        return counts;
    },

    /**
     * Сбрасывает загруженные недели: после новых комментариев значки обновятся при ближайшей перерисовке
     * @returns {void}
     */
    reset() {
        this.weeks.clear();
        ScheduleLayout.schedule();
    }
};
