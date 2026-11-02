// ============================================================
// ФОРМЫ КОНТРОЛЯ: сокращения запрещённых форм из справочника сайта
// ============================================================

/**
 * Справочник форм контроля предмета открытого журнала
 * - Сайт показывает в шапке журнала сокращение формы (short_name), а запрещённые формы заданы названиями
 * - Сопоставление берётся из справочника сайта; пока он не загружен (или журнал не определился) работает
 *   запасной список сокращений из CONFIG.CONTROL_FORMS.RESTRICTED
 */
const ControlForms = {
    /** @type {Map<number, Set<string>>} Номер журнала -> сокращения запрещённых форм */
    cache: new Map(),

    /** @type {Set<number>} Журналы, по которым справочник уже запрошен (удачно или нет) */
    requested: new Set(),

    /**
     * Номер журнала (группы) из адреса страницы
     * @returns {number|null} null, если это не журнал группы
     */
    groupId() {
        const match = window.location.pathname.match(/\/journal\/my\/(\d+)/);
        return match ? Number(match[1]) : null;
    },

    /**
     * Сокращения запрещённых форм текущего журнала
     * Если справочник не загружен, возвращает запасной список; загрузку запускает один раз на журнал
     * @returns {Set<string>} Сокращения как в шапке журнала
     */
    restrictedShortNames() {
        const groupId = this.groupId();
        if (groupId && !this.requested.has(groupId)) this.load(groupId);

        return this.cache.get(groupId) ?? new Set(CONFIG.CONTROL_FORMS.RESTRICTED);
    },

    /**
     * Загружает справочник форм предмета журнала и перекрашивает шапку
     * Ошибка не показывается: остаётся запасной список
     * @param {number} groupId - номер журнала (группы)
     * @returns {Promise<void>}
     */
    async load(groupId) {
        this.requested.add(groupId);

        try {
            const session = ColleagueApi.session();
            if (!session) return;

            const groups = await ColleagueApi.get('/plan/teacher/v1/groups', {
                academic_year_id: session.year, school_id: session.school, teacher_ids: session.profile
            });
            const group = groups.find(item => item.id === groupId);
            if (!group?.subject_id) return;

            const forms = await ColleagueApi.get('/core/teacher/v1/control_forms', {
                academic_year_id: session.year, subject_id: group.subject_id, per_page: 1000
            });
            const restricted = new Set(CONFIG.CONTROL_FORMS.RESTRICTED_NAMES.map(name => name.toLowerCase()));
            const shortNames = new Set(CONFIG.CONTROL_FORMS.RESTRICTED);
            forms.forEach(form => {
                if (!form.deleted_at && form.short_name && restricted.has(form.name.trim().toLowerCase())) {
                    shortNames.add(form.short_name.trim());
                }
            });

            this.cache.set(groupId, shortNames);
            highlightControlForms();
        } catch (error) {
            console.error('Не удалось загрузить формы контроля:', error);
        }
    }
};
