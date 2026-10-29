// ============================================================
// ДЗ НА ДЕНЬ: запросы к API сайта
// ============================================================

/**
 * Запросы окна "ДЗ на день": уроки дня, ближайшие уроки групп, выдача ДЗ
 * - Вход берётся у самого сайта (ColleagueApi.session()): токен из cookie, пароли не нужны
 * - Предмет и состав группы берутся из списка групп учителя: для выдачи ДЗ сайту нужны subject_id и student_ids
 * - Выдача — тот же POST, что делает интерфейс сайта; повторный PUT после него не нужен (так сделано и в проекте журнала)
 */
const HomeworkApi = {
    /** Сколько дней вперёд искать следующий урок группы для срока сдачи */
    NEXT_LESSON_DAYS: 21,

    /** @type {Map<number, Object>|null} Группы учителя по id; хранятся, пока открыта страница */
    groups: null,

    /**
     * Дата ГГГГ-ММ-ДД в формате сайта для записи (ДД.ММ.ГГГГ)
     * @param {string} iso
     * @returns {string}
     */
    siteDate(iso) {
        const [year, month, day] = iso.split('-');
        return `${day}.${month}.${year}`;
    },

    /**
     * Дата из ответа сайта [год, месяц, день] в виде ГГГГ-ММ-ДД
     * @param {number[]} date
     * @returns {string}
     */
    itemDate(date) {
        const pad = value => String(value).padStart(2, '0');
        return `${date[0]}-${pad(date[1])}-${pad(date[2])}`;
    },

    /**
     * Запись на сайт: JSON-запрос с теми же заголовками, что у ColleagueApi.get()
     * @param {string} path - путь после /api/ej
     * @param {Object} body - тело запроса
     * @returns {Promise<Object>} тело ответа
     * @throws {Error} с полем status (0 — вход не определён) и message — текстом ошибки сайта, если он есть
     */
    async post(path, body) {
        const session = ColleagueApi.session();
        if (!session) throw Object.assign(new Error('Не удалось определить вход'), { status: 0 });

        const response = await fetch(`/api/ej${path}`, {
            method: 'POST',
            headers: {
                'Auth-Token': session.token,
                'Profile-Id': String(session.profile),
                'x-mes-subsystem': 'teacherweb',
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            // Сайт пишет причину отказа в тело ответа, например "Дата выдачи домашнего задания не может быть раньше текущей даты"
            const reason = await response.text().then(text => {
                try {
                    const data = JSON.parse(text);
                    return data.message ?? data.errors?.join?.('; ') ?? data.error ?? '';
                } catch (error) {
                    return '';
                }
            }).catch(() => '');
            throw Object.assign(new Error(reason || `Сайт ответил ${response.status}`), { status: response.status });
        }

        return response.json();
    },

    /**
     * Группы учителя (предмет и состав)
     * @returns {Promise<Map<number, Object>>}
     */
    async getGroups() {
        if (this.groups) return this.groups;

        const session = ColleagueApi.session();
        const list = await ColleagueApi.get('/plan/teacher/v1/groups', {
            academic_year_id: session?.year, school_id: session?.school, teacher_ids: session?.profile
        });

        this.groups = new Map(list.map(group => [group.id, group]));
        return this.groups;
    },

    /**
     * Уроки учителя за день по времени начала; отменённые и перенесённые на другую дату не берутся
     * @param {string} iso - день в виде ГГГГ-ММ-ДД
     * @returns {Promise<Array<{id: number, groupId: number, time: string, className: string, subject: string,
     *          subjectId: ?number, studentIds: number[], existingIds: number[], ready: boolean}>>}
     *          ready — false, если группы нет в списке групп учителя: выдать ДЗ без состава нельзя
     */
    async getDay(iso) {
        const session = ColleagueApi.session();
        const [items, groups] = await Promise.all([
            ColleagueApi.get('/plan/teacher/v1/schedule_items', {
                academic_year_id: session?.year, teacher_id: session?.profile, from: iso, to: iso,
                with_lesson_info: true, with_group_class_subject_info: true, per_page: 300, page: 1
            }),
            this.getGroups()
        ]);

        const pad = value => String(value).padStart(2, '0');
        return items
            .filter(item => !item.cancelled && !item.transferred_to_date)
            .map(item => {
                const group = groups.get(item.group_id);
                return {
                    id: item.id,
                    groupId: item.group_id,
                    time: `${pad(item.time[0])}:${pad(item.time[1])}`,
                    className: item.class_unit_name ?? group?.class_unit_name ?? '',
                    subject: item.subject_name ?? group?.subject_name ?? '',
                    subjectId: group?.subject_id ?? item.subject_id ?? null,
                    studentIds: group?.student_ids ?? [],
                    existingIds: (item.homeworks_to_give ?? []).map(homework => homework.id),
                    ready: Boolean(group?.subject_id ?? item.subject_id) && Boolean(group?.student_ids?.length)
                };
            })
            .sort((a, b) => a.time.localeCompare(b.time));
    },

    /**
     * Тексты уже выданных ДЗ
     * @param {number[]} ids - id ДЗ
     * @returns {Promise<Object<number, string>>} {id ДЗ: текст}; пусто, если сайт не ответил (это справка, не ошибка)
     */
    async getTexts(ids) {
        if (!ids.length) return {};

        try {
            const homeworks = await ColleagueApi.get('/core/teacher/v1/homeworks', { ids: ids.join(','), with_entries: true });
            return Object.fromEntries(homeworks.map(homework => [
                homework.id,
                (homework.homework_entries ?? []).map(entry => entry.description).filter(Boolean).join(' / ')
            ]));
        } catch (error) {
            console.error('Не удалось получить тексты выданных ДЗ:', error);
            return {};
        }
    },

    /**
     * Ближайший урок после дня у каждой группы: по умолчанию к нему назначается срок сдачи
     * @param {number[]} groupIds
     * @param {string} iso - день в виде ГГГГ-ММ-ДД
     * @returns {Promise<Object<number, string>>} {id группы: ГГГГ-ММ-ДД}; группы без урока в ближайшие недели не попадают
     */
    async getNextDates(groupIds, iso) {
        if (!groupIds.length) return {};

        const [year, month, day] = iso.split('-').map(Number);
        const start = new Date(year, month - 1, day);
        const next = {};

        try {
            const items = await ColleagueApi.get('/plan/teacher/v1/schedule_items', {
                academic_year_id: ColleagueApi.session()?.year, group_ids: groupIds.join(','),
                from: ColleagueApi.isoDate(ColleagueApi.addDays(start, 1)),
                to: ColleagueApi.isoDate(ColleagueApi.addDays(start, this.NEXT_LESSON_DAYS)),
                per_page: 300, page: 1
            });

            items.filter(item => !item.cancelled && !item.transferred_to_date).forEach(item => {
                const date = this.itemDate(item.date);
                if (!next[item.group_id] || date < next[item.group_id]) next[item.group_id] = date;
            });
        } catch (error) {
            console.error('Не удалось найти следующие уроки групп:', error);
        }

        return next;
    },

    /**
     * Сколько оценок стоит на каждом уроке дня; удалённые оценки не считаются
     * @param {number[]} groupIds
     * @param {string} iso - день в виде ГГГГ-ММ-ДД
     * @returns {Promise<Object<number, number>>} {id урока: число оценок}; уроки без оценок не попадают
     * @throws {Error} если сайт не ответил: тогда "нет оценок" утверждать нельзя
     */
    async getMarkCounts(groupIds, iso) {
        if (!groupIds.length) return {};

        const date = this.siteDate(iso);
        const perPage = 300;
        const counts = {};

        for (let page = 1; ; page++) {
            const marks = await ColleagueApi.get('/core/teacher/v1/marks', {
                group_ids: groupIds.join(','), lesson_date_from: date, lesson_date_to: date,
                with_non_numeric_entries: true, per_page: perPage, page
            });

            marks.filter(mark => !mark.deleted_by).forEach(mark => {
                counts[mark.schedule_lesson_id] = (counts[mark.schedule_lesson_id] ?? 0) + 1;
            });
            if (marks.length < perPage) return counts;
        }
    },

    /**
     * Сколько комментариев к ученикам уже стоит на каждом уроке
     * @param {number[]} lessonIds
     * @returns {Promise<Object<number, number>>} {id урока: число комментариев}
     * @throws {Error} если сайт не ответил
     */
    async getCommentCounts(lessonIds) {
        const chunk = 50;
        const counts = {};

        for (let start = 0; start < lessonIds.length; start += chunk) {
            const comments = await ColleagueApi.get('/core/teacher/v1/lesson_comments', {
                schedule_lesson_ids: lessonIds.slice(start, start + chunk).join(','), page: 1, per_page: 1000
            });
            comments.forEach(comment => {
                counts[comment.schedule_lesson_id] = (counts[comment.schedule_lesson_id] ?? 0) + 1;
            });
        }

        return counts;
    },

    /**
     * Фамилия и имя ученика для сообщения о результате; справка, поэтому сбой не ошибка
     * @param {Object} lesson - урок из getDay()
     * @param {number} studentId
     * @returns {Promise<string>} "Фамилия Имя" или пустая строка
     */
    async getStudentName(lesson, studentId) {
        try {
            const profiles = await ColleagueApi.get('/core/teacher/v1/student_profiles', {
                academic_year_id: ColleagueApi.session()?.year, group_ids: lesson.groupId,
                with_groups: true, per_page: 150, page: 1
            });
            return profiles.find(profile => profile.id === studentId)?.short_name ?? '';
        } catch (error) {
            console.error('Не удалось получить имя ученика:', error);
            return '';
        }
    },

    /**
     * Ставит комментарий ученику на уроке
     * @param {Object} lesson - урок из getDay()
     * @param {number} studentId
     * @param {string} text - текст комментария
     * @returns {Promise<Object>} созданный комментарий
     */
    createComment(lesson, studentId, text) {
        return this.post('/core/teacher/v1/lesson_comments', {
            comment: text,
            student_id: studentId,
            schedule_lesson_id: lesson.id,
            teacher_id: ColleagueApi.session()?.profile,
            subject_id: lesson.subjectId
        });
    },

    /**
     * Выдаёт ДЗ на уроке
     * @param {Object} lesson - урок из getDay()
     * @param {string} text - текст ДЗ
     * @param {string} assignedIso - день урока, ГГГГ-ММ-ДД
     * @param {string} dueIso - срок сдачи, ГГГГ-ММ-ДД
     * @param {number} duration - ожидаемое время выполнения, минут
     * @returns {Promise<Object>} созданное ДЗ
     */
    createHomework(lesson, text, assignedIso, dueIso, duration) {
        return this.post('/core/teacher/v1/homeworks', {
            group_id: lesson.groupId,
            teacher_id: ColleagueApi.session()?.profile,
            date_assigned_on: this.siteDate(assignedIso),
            date_prepared_for: this.siteDate(dueIso),
            subject_id: lesson.subjectId,
            homework_entries: [{
                description: text,
                duration,
                student_ids: lesson.studentIds,
                attachment_ids: [],
                attachments: [],
                scripts: null
            }]
        });
    }
};
