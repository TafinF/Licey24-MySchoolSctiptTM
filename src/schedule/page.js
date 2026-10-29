// ============================================================
// СТРАНИЦА РАСПИСАНИЯ
// ============================================================

/**
 * Управляет страницей "Расписание уроков"
 * - Ставит кнопки расписания коллег и настроек справа от переключателя недель
 * - Включает вид расписания, выбранный в настройках: классический (без изменений),
 *   компактный (ScheduleCompact) или заменённый (ScheduleLayout)
 */
const SchedulePage = {
    /** @type {MutationObserver|null} Следит за перерисовкой шапки, чтобы вернуть кнопку на место */
    observer: null,

    /**
     * Запускает страницу; если уже запущена, только применяет вид расписания из настроек
     * @returns {void}
     */
    start() {
        if (!this.observer) {
            createStyles();
            this.observer = new MutationObserver(() => this.insertButton());
            this.observer.observe(document.body, { childList: true, subtree: true });
        }

        this.insertButton();
        this.applyStyle();
    },

    /**
     * Останавливает всё: кнопка убирается, расписание сайта возвращается к виду по умолчанию
     * @returns {void}
     */
    stop() {
        if (!this.observer) return;

        this.observer.disconnect();
        this.observer = null;
        ScheduleLayout.stop();
        ScheduleCompact.stop();
        document.querySelector('.mscp-button-box')?.remove();
        document.querySelector('.mscp-colleagues-box')?.remove();
        Colleagues.close();
        HomeworkDay.close();
        document.querySelector('.mscp-homework-box')?.remove();
        ScheduleLegend.stop();
    },

    /**
     * Включает вид расписания из настроек и выключает остальные
     * @returns {void}
     */
    applyStyle() {
        const style = loadSettings().scheduleStyle;

        if (style === 'compact') {
            ScheduleLayout.stop();
            ScheduleCompact.start();
        } else if (style === 'classic') {
            ScheduleLayout.stop();
            ScheduleCompact.stop();
        } else {
            ScheduleCompact.stop();
            ScheduleLayout.start();
        }

        ScheduleLegend.sync();
    },

    /**
     * Ставит кнопку настроек сразу после блока переключения недель
     * @returns {void}
     */
    insertButton() {
        if (document.querySelector('.mscp-button-box')) return;

        // Блок переключения недель: три кнопки (назад, период, вперёд) в цепочке обёрток с одним потомком.
        // Кнопка кладётся в самую внешнюю из них: рядом с ней строка шапки разносит блоки по краям
        let weekSwitch = document.querySelector(CONFIG.SELECTORS.SCHEDULE_WEEK_PREV)?.parentElement;
        while (weekSwitch?.parentElement?.childElementCount === 1) {
            weekSwitch = weekSwitch.parentElement;
        }
        if (!weekSwitch?.parentElement) return;

        const colleagues = createColleaguesButton();
        colleagues.style.marginLeft = '8px';
        const homework = createHomeworkButton();
        homework.style.marginLeft = '8px';
        const button = createSettingsButton();
        button.style.marginLeft = '8px';
        weekSwitch.append(colleagues, homework, ScheduleLegend.createButton(), button);
    }
};
