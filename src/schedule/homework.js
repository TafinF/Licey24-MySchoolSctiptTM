// ============================================================
// ДЗ НА ДЕНЬ: окно со списком уроков дня и полями для домашнего задания
// ============================================================

/**
 * Окно "ДЗ на день"
 * - Показывает уроки выбранного дня (по умолчанию сегодня): время, класс, предмет и поле для текста ДЗ
 * - Срок сдачи — ближайший следующий урок этой группы, время выполнения — DEFAULT_DURATION; изменить их в окне нельзя
 * - "Выдать" отправляет ДЗ только по урокам с заполненным текстом, по одному запросу на урок, и показывает результат у каждого
 * - Сайт не принимает выдачу задним числом, поэтому листать назад раньше сегодняшнего дня нельзя (на обеих вкладках)
 * - Уже выданное на уроке ДЗ показывается справкой и не перезаписывается: новый текст создаёт ещё одно ДЗ
 * - Вкладка "Комментарии": на каждый отмеченный урок без оценок ставится один комментарий случайному ученику группы
 */
const HomeworkDay = {
    /** Срок выполнения по умолчанию, минут */
    DEFAULT_DURATION: 15,

    /** Комментарий по умолчанию: невидимый символ (U+3164), сайт принимает его как текст */
    DEFAULT_COMMENT: 'ㅤ',

    /** @type {HTMLElement|null} Оверлей открытого окна */
    overlay: null,

    /** @type {Function|null} Обработчик Escape открытого окна */
    onKeydown: null,

    /** Что сейчас выбрано и загружено; пересоздаётся при каждом открытии */
    state: null,

    /** @type {number} Номер последней загрузки: ответ более ранней игнорируется */
    loadId: 0,

    /**
     * Открывает окно
     * @returns {void}
     */
    open() {
        if (this.overlay) return;

        createStyles();
        this.addStyles();

        this.state = {
            iso: ColleagueApi.isoDate(new Date()), tab: 'homework', commentText: this.DEFAULT_COMMENT,
            lessons: [], loading: true, sending: false, error: ''
        };

        this.overlay = document.createElement('div');
        this.overlay.className = 'mscp-modal-overlay';
        this.overlay.innerHTML = `
            <div class="mscp-hw-window">
                <div class="mscp-modal-header">
                    <h2 class="mscp-modal-title">Уроки дня</h2>
                    <button class="mscp-close-btn">&times;</button>
                </div>
                <div class="mscp-hw-tabs">
                    <button class="mscp-hw-tab" data-tab="homework">Домашнее задание</button>
                    <button class="mscp-hw-tab" data-tab="comments">Комментарии</button>
                </div>
                <div class="mscp-hw-toolbar">
                    <button class="mscp-hw-nav mscp-hw-prev" data-step="-1" title="Предыдущий день">&lsaquo;</button>
                    <input type="date" class="mscp-hw-date">
                    <button class="mscp-hw-nav" data-step="1" title="Следующий день">&rsaquo;</button>
                    <span class="mscp-hw-weekday"></span>
                </div>
                <div class="mscp-hw-commentbar">
                    <label for="mscp-hw-comment">Комментарий (по умолчанию — невидимый символ):</label>
                    <input type="text" id="mscp-hw-comment" class="mscp-hw-comment" placeholder="Текст комментария">
                </div>
                <div class="mscp-hw-list"></div>
                <div class="mscp-hw-footer">
                    <span class="mscp-hw-summary"></span>
                    <button class="mscp-hw-send"></button>
                </div>
            </div>
        `;

        const dateInput = this.overlay.querySelector('.mscp-hw-date');
        dateInput.value = this.state.iso;
        dateInput.addEventListener('change', () => {
            if (dateInput.value && this.canGoTo(dateInput.value)) this.setDay(dateInput.value);
            else dateInput.value = this.state.iso;
        });
        this.overlay.querySelectorAll('.mscp-hw-tab').forEach(button => {
            button.addEventListener('click', () => this.setTab(button.dataset.tab));
        });
        const commentInput = this.overlay.querySelector('.mscp-hw-comment');
        commentInput.value = this.state.commentText;
        commentInput.addEventListener('input', () => {
            this.state.commentText = commentInput.value;
            this.renderFooter();
        });
        this.overlay.querySelectorAll('.mscp-hw-nav').forEach(button => {
            button.addEventListener('click', () => this.shiftDay(Number(button.dataset.step)));
        });
        this.overlay.querySelector('.mscp-close-btn').addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', event => {
            if (event.target === this.overlay) this.close();
        });
        this.overlay.querySelector('.mscp-hw-send').addEventListener('click', () => {
            if (this.state.tab === 'comments') this.sendComments();
            else this.send();
        });

        this.onKeydown = event => {
            if (event.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this.onKeydown);

        document.body.appendChild(this.overlay);
        this.load();
    },

    /**
     * Закрывает окно; введённый, но не отправленный текст пропадает
     * @returns {void}
     */
    close() {
        document.removeEventListener('keydown', this.onKeydown);
        this.overlay?.remove();
        this.overlay = null;
        this.loadId++;
    },

    /**
     * Переходит на другой день
     * @param {string} iso - день в виде ГГГГ-ММ-ДД
     * @returns {void}
     */
    setDay(iso) {
        if (this.state.sending || !this.canGoTo(iso)) return;

        this.state.iso = iso;
        this.overlay.querySelector('.mscp-hw-date').value = iso;
        this.load();
    },

    /**
     * Можно ли открыть день: не раньше сегодняшнего
     * @param {string} iso - день в виде ГГГГ-ММ-ДД
     * @returns {boolean}
     */
    canGoTo(iso) {
        return iso >= ColleagueApi.isoDate(new Date());
    },

    /**
     * Переключает вкладку; день и загруженные уроки остаются теми же
     * @param {string} tab - 'homework' или 'comments'
     * @returns {void}
     */
    setTab(tab) {
        if (this.state.sending || this.state.tab === tab) return;

        this.state.tab = tab;
        this.render();
    },

    /**
     * Сдвигает день на несколько дней
     * @param {number} step - на сколько дней
     * @returns {void}
     */
    shiftDay(step) {
        const [year, month, day] = this.state.iso.split('-').map(Number);
        this.setDay(ColleagueApi.isoDate(ColleagueApi.addDays(new Date(year, month - 1, day), step)));
    },

    /**
     * Загружает уроки дня, тексты выданных ДЗ и сроки по умолчанию
     * @returns {Promise<void>}
     */
    async load() {
        const state = this.state;
        const id = ++this.loadId;
        const iso = state.iso;

        state.loading = true;
        state.error = '';
        state.lessons = [];
        this.render();

        try {
            const lessons = await HomeworkApi.getDay(iso);
            const groupIds = [...new Set(lessons.map(lesson => lesson.groupId))];
            // Без ответа сайта число оценок/комментариев неизвестно (null): урок без оценок по нему не объявляется
            const [texts, next, marks, comments] = await Promise.all([
                HomeworkApi.getTexts(lessons.flatMap(lesson => lesson.existingIds)),
                HomeworkApi.getNextDates(groupIds, iso),
                HomeworkApi.getMarkCounts(groupIds, iso).catch(() => null),
                HomeworkApi.getCommentCounts(lessons.map(lesson => lesson.id)).catch(() => null)
            ]);
            if (id !== this.loadId) return;

            state.lessons = lessons.map(lesson => {
                const marksCount = marks ? marks[lesson.id] ?? 0 : null;
                const commentsCount = comments ? comments[lesson.id] ?? 0 : null;
                return {
                    ...lesson,
                    existing: lesson.existingIds.map(homeworkId => texts[homeworkId]).filter(Boolean),
                    existingCount: lesson.existingIds.length,
                    text: '',
                    due: next[lesson.groupId] ?? '',
                    status: '',
                    message: '',
                    marksCount,
                    commentsCount,
                    // Отмечаются уроки без оценок и без комментариев: повторный запуск не плодит комментарии
                    pick: marksCount === 0 && commentsCount === 0 && lesson.ready,
                    commentStatus: '',
                    commentMessage: ''
                };
            });
        } catch (error) {
            if (id !== this.loadId) return;
            state.error = ColleagueApi.describeError(error);
        }

        state.loading = false;
        this.render();
    },

    /**
     * Можно ли выдавать ДЗ в выбранный день: сайт не принимает дату выдачи раньше сегодняшней
     * @returns {boolean}
     */
    canAssign() {
        return this.state.iso >= ColleagueApi.isoDate(new Date());
    },

    /**
     * Уроки, по которым введён текст и которые ещё не выданы в этом окне; без следующего урока группы срока сдачи нет
     * @returns {Array}
     */
    pending() {
        return this.state.lessons.filter(lesson => lesson.ready && lesson.due && lesson.text.trim() && lesson.status !== 'ok');
    },

    /**
     * Перерисовывает окно: день недели, список уроков, подвал
     * @returns {void}
     */
    render() {
        if (!this.overlay) return;

        const { iso, loading, error, lessons, tab } = this.state;
        const [year, month, day] = iso.split('-').map(Number);
        this.overlay.querySelector('.mscp-hw-weekday').textContent =
            new Date(year, month - 1, day).toLocaleDateString('ru-RU', { weekday: 'long' });

        const today = ColleagueApi.isoDate(new Date());
        const dateInput = this.overlay.querySelector('.mscp-hw-date');
        dateInput.min = today;
        this.overlay.querySelector('.mscp-hw-prev').disabled = iso <= today;
        this.overlay.querySelectorAll('.mscp-hw-tab').forEach(button => {
            button.classList.toggle('mscp-hw-tab-active', button.dataset.tab === tab);
        });
        this.overlay.querySelector('.mscp-hw-commentbar').hidden = tab !== 'comments';

        const list = this.overlay.querySelector('.mscp-hw-list');
        list.replaceChildren();

        if (loading || error || !lessons.length) {
            const note = document.createElement('div');
            note.className = error ? 'mscp-hw-empty mscp-hw-error' : 'mscp-hw-empty';
            note.textContent = loading ? 'Загрузка...' : error || 'В этот день у вас нет уроков.';
            list.append(note);
        } else {
            lessons.forEach(lesson => list.append(tab === 'comments' ? this.renderCommentLesson(lesson) : this.renderLesson(lesson)));
        }

        this.renderFooter();
    },

    /**
     * Строка урока на вкладке комментариев: галочка, время, название и сколько оценок/комментариев уже есть
     * @param {Object} lesson - урок из load()
     * @returns {HTMLElement}
     */
    renderCommentLesson(lesson) {
        const row = document.createElement('label');
        row.className = 'mscp-hw-lesson mscp-hw-commentrow';

        const check = document.createElement('input');
        check.type = 'checkbox';
        check.checked = lesson.pick;
        check.disabled = this.state.sending || !lesson.ready || lesson.marksCount === null;
        check.addEventListener('change', () => {
            lesson.pick = check.checked;
            this.renderFooter();
        });

        const time = document.createElement('span');
        time.className = 'mscp-hw-time';
        time.textContent = lesson.time;
        const title = document.createElement('span');
        title.className = 'mscp-hw-title';
        title.textContent = `${lesson.className} ${lesson.subject}`.trim();

        const marks = document.createElement('span');
        marks.className = lesson.marksCount === 0 ? 'mscp-hw-badge mscp-hw-badge-none' : 'mscp-hw-badge';
        marks.textContent = lesson.marksCount === null ? 'оценки: не удалось узнать' : `оценок: ${lesson.marksCount}`;

        const comments = document.createElement('span');
        comments.className = 'mscp-hw-badge';
        comments.textContent = lesson.commentsCount === null ? 'комментарии: не удалось узнать' : `комментариев: ${lesson.commentsCount}`;

        const status = document.createElement('span');
        status.className = `mscp-hw-status ${lesson.commentStatus ? `mscp-hw-${lesson.commentStatus}` : ''}`;
        status.textContent = lesson.commentMessage;

        row.append(check, time, title, marks, comments, status);
        return row;
    },

    /**
     * Уроки, отмеченные для комментария и ещё не получившие его в этом окне
     * @returns {Array}
     */
    pendingComments() {
        return this.state.lessons.filter(lesson => lesson.pick && lesson.ready && lesson.commentStatus !== 'ok');
    },

    /**
     * Карточка одного урока
     * @param {Object} lesson - урок из load()
     * @returns {HTMLElement}
     */
    renderLesson(lesson) {
        const row = document.createElement('div');
        row.className = 'mscp-hw-lesson';

        const head = document.createElement('div');
        head.className = 'mscp-hw-head';
        const time = document.createElement('span');
        time.className = 'mscp-hw-time';
        time.textContent = lesson.time;
        const title = document.createElement('span');
        title.className = 'mscp-hw-title';
        title.textContent = `${lesson.className} ${lesson.subject}`.trim();
        head.append(time, title);

        if (lesson.existingCount) {
            const badge = document.createElement('span');
            badge.className = 'mscp-hw-badge';
            badge.textContent = `ДЗ уже есть: ${lesson.existingCount}`;
            badge.title = lesson.existing.join('\n\n');
            head.append(badge);
        }

        const status = document.createElement('span');
        status.className = `mscp-hw-status ${lesson.status ? `mscp-hw-${lesson.status}` : ''}`;
        status.textContent = lesson.message;
        head.append(status);
        row.append(head);

        if (!lesson.ready) {
            const warning = document.createElement('div');
            warning.className = 'mscp-hw-hint';
            warning.textContent = 'Нет данных о группе или учениках: выдайте ДЗ на этот урок в журнале.';
            row.append(warning);
            return row;
        }

        const text = document.createElement('textarea');
        text.className = 'mscp-hw-text';
        text.rows = 2;
        text.placeholder = 'Текст домашнего задания (пусто — не выдавать)';
        text.value = lesson.text;
        text.disabled = this.state.sending || !lesson.due;
        text.addEventListener('input', () => {
            lesson.text = text.value;
            if (lesson.status === 'error') {
                lesson.status = '';
                lesson.message = '';
                status.className = 'mscp-hw-status';
                status.textContent = '';
            }
            this.renderFooter();
        });

        const due = document.createElement('div');
        due.className = 'mscp-hw-hint';
        due.textContent = lesson.due
            ? `Срок сдачи — следующий урок: ${HomeworkApi.siteDate(lesson.due).slice(0, 5)}`
            : 'Следующий урок группы в ближайшие недели не найден: выдайте ДЗ в журнале.';

        row.append(text, due);
        return row;
    },

    /**
     * Подвал: сколько уроков будет выдано и доступна ли кнопка
     * @returns {void}
     */
    renderFooter() {
        if (!this.overlay) return;

        if (this.state.tab === 'comments') {
            this.renderCommentFooter();
            return;
        }

        const { sending, lessons } = this.state;
        const pending = this.pending();
        const canAssign = this.canAssign();

        let summary = 'Заполните ДЗ хотя бы по одному уроку.';
        if (!canAssign) summary = 'Сайт не принимает выдачу ДЗ за прошедшие дни.';
        else if (sending) summary = 'Отправка...';
        else if (pending.length) summary = `Будет выдано ДЗ: ${pending.length}`;
        else if (lessons.some(lesson => lesson.status === 'ok')) summary = 'Готово. Можно выдать ещё.';

        this.overlay.querySelector('.mscp-hw-summary').textContent = summary;
        const send = this.overlay.querySelector('.mscp-hw-send');
        send.textContent = 'Выдать ДЗ';
        send.disabled = sending || !canAssign || !pending.length;
    },

    /**
     * Подвал вкладки комментариев: сколько будет поставлено и доступна ли кнопка
     * @returns {void}
     */
    renderCommentFooter() {
        const { sending, lessons, commentText } = this.state;
        const pending = this.pendingComments();
        const hasText = commentText.length > 0;

        let summary = 'Отметьте уроки, на которые нужен комментарий.';
        if (!hasText) summary = 'Введите текст комментария.';
        else if (sending) summary = 'Отправка...';
        else if (pending.length) summary = `Будет поставлено комментариев: ${pending.length}`;
        else if (lessons.some(lesson => lesson.commentStatus === 'ok')) summary = 'Готово.';
        else if (lessons.length && lessons.every(lesson => lesson.marksCount !== 0)) summary = 'На всех уроках дня уже есть оценки.';

        this.overlay.querySelector('.mscp-hw-summary').textContent = summary;
        const send = this.overlay.querySelector('.mscp-hw-send');
        send.textContent = 'Поставить комментарии';
        send.disabled = sending || !hasText || !pending.length;
    },

    /**
     * Отправляет ДЗ по заполненным урокам по очереди; ошибка одного урока не останавливает остальные
     * Вход, который перестал определяться, обрывает отправку: дальше запросы всё равно не пройдут
     * @returns {Promise<void>}
     */
    async send() {
        const state = this.state;
        if (state.sending) return;

        const queue = this.pending();
        if (!queue.length) return;

        state.sending = true;
        queue.forEach(lesson => {
            lesson.status = 'wait';
            lesson.message = 'в очереди';
        });
        this.render();

        for (const lesson of queue) {
            if (!this.overlay) return;

            lesson.message = 'отправка...';
            this.render();

            try {
                const created = await HomeworkApi.createHomework(lesson, lesson.text.trim(), state.iso, lesson.due, this.DEFAULT_DURATION);
                lesson.status = 'ok';
                lesson.message = 'выдано';
                lesson.existing.push(lesson.text.trim());
                lesson.existingCount++;
                if (created?.id) lesson.existingIds.push(created.id);
                lesson.text = '';
            } catch (error) {
                lesson.status = 'error';
                lesson.message = error.status === 401 || error.status === 0 ? ColleagueApi.describeError(error) : error.message;
                if (error.status === 401 || error.status === 0) break;
            }
        }

        queue.filter(lesson => lesson.status === 'wait').forEach(lesson => {
            lesson.status = '';
            lesson.message = '';
        });

        state.sending = false;
        this.render();
    },

    /**
     * Ставит комментарий случайному ученику группы на каждом отмеченном уроке, по одному запросу за раз
     * Текст берётся как введён, без обрезки пробелов: так можно поставить "пустой" комментарий
     * Вход, который перестал определяться, обрывает отправку, как в send()
     * @returns {Promise<void>}
     */
    async sendComments() {
        const state = this.state;
        if (state.sending || !state.commentText) return;

        const queue = this.pendingComments();
        if (!queue.length) return;

        const text = state.commentText;
        state.sending = true;
        queue.forEach(lesson => {
            lesson.commentStatus = 'wait';
            lesson.commentMessage = 'в очереди';
        });
        this.render();

        for (const lesson of queue) {
            if (!this.overlay) return;

            lesson.commentMessage = 'отправка...';
            this.render();

            try {
                const studentId = lesson.studentIds[Math.floor(Math.random() * lesson.studentIds.length)];
                await HomeworkApi.createComment(lesson, studentId, text);
                const name = await HomeworkApi.getStudentName(lesson, studentId);
                lesson.commentStatus = 'ok';
                lesson.commentMessage = name ? `поставлен: ${name}` : 'поставлен';
                lesson.commentsCount++;
                lesson.pick = false;
            } catch (error) {
                lesson.commentStatus = 'error';
                lesson.commentMessage = error.status === 401 || error.status === 0 ? ColleagueApi.describeError(error) : error.message;
                if (error.status === 401 || error.status === 0) break;
            }
        }

        queue.filter(lesson => lesson.commentStatus === 'wait').forEach(lesson => {
            lesson.commentStatus = '';
            lesson.commentMessage = '';
        });

        state.sending = false;
        this.render();
        // Значки "У" в расписании за окном должны сразу показать новые комментарии
        if (queue.some(lesson => lesson.commentStatus === 'ok')) ScheduleComments.reset();
    },

    /**
     * Добавляет стили окна один раз
     * @returns {void}
     */
    addStyles() {
        if (document.getElementById('mscp-homework-styles')) return;

        const style = document.createElement('style');
        style.id = 'mscp-homework-styles';
        style.textContent = `
            .mscp-hw-window {
                display: flex;
                flex-direction: column;
                width: min(760px, 96vw);
                height: min(720px, 92vh);
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                overflow: hidden;
            }
            .mscp-hw-tabs {
                flex: none;
                display: flex;
                gap: 4px;
                padding: 8px 18px 0;
                border-bottom: 1px solid #e9ecef;
            }
            .mscp-hw-tab {
                padding: 7px 14px;
                border: none;
                border-bottom: 2px solid transparent;
                background: none;
                font-size: 14px;
                color: #868e96;
                cursor: pointer;
            }
            .mscp-hw-tab:hover { color: #212529; }
            .mscp-hw-tab-active { color: #3b5bdb; border-bottom-color: #3b5bdb; font-weight: 600; }
            .mscp-hw-commentbar {
                flex: none;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 18px;
                border-bottom: 1px solid #e9ecef;
                font-size: 13px;
                color: #495057;
            }
            .mscp-hw-commentbar[hidden] { display: none; }
            .mscp-hw-comment {
                flex: 1;
                padding: 6px 10px;
                border: 1px solid #ced4da;
                border-radius: 6px;
                font: inherit;
                font-size: 13px;
            }
            .mscp-hw-commentrow {
                display: flex;
                align-items: baseline;
                gap: 10px;
                font-size: 14px;
                cursor: pointer;
            }
            .mscp-hw-badge-none { background: #fff5f5; color: #c92a2a; }
            .mscp-hw-toolbar {
                flex: none;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 18px;
                border-bottom: 1px solid #e9ecef;
                background: #f8f9fa;
            }
            .mscp-hw-nav {
                width: 32px;
                height: 32px;
                border: 1px solid #ced4da;
                border-radius: 6px;
                background: white;
                font-size: 20px;
                line-height: 1;
                cursor: pointer;
            }
            .mscp-hw-nav:hover { background: #ececec; }
            .mscp-hw-nav:disabled { opacity: 0.4; cursor: default; background: white; }
            .mscp-hw-date {
                padding: 5px 8px;
                border: 1px solid #ced4da;
                border-radius: 6px;
                font-size: 13px;
            }
            .mscp-hw-weekday {
                font-size: 13px;
                color: #868e96;
                text-transform: capitalize;
            }
            .mscp-hw-list {
                flex: 1;
                overflow-y: auto;
                padding: 12px 18px;
            }
            .mscp-hw-empty {
                padding: 40px 0;
                text-align: center;
                color: #868e96;
                font-size: 14px;
            }
            .mscp-hw-error { color: #c92a2a; }
            .mscp-hw-lesson {
                padding: 10px 0 12px;
                border-bottom: 1px solid #f1f3f5;
            }
            .mscp-hw-head {
                display: flex;
                align-items: baseline;
                gap: 10px;
                margin-bottom: 6px;
                font-size: 14px;
            }
            .mscp-hw-time { color: #868e96; font-variant-numeric: tabular-nums; }
            .mscp-hw-title { font-weight: 600; color: #212529; }
            .mscp-hw-badge {
                padding: 1px 8px;
                border-radius: 10px;
                background: #e7f5ff;
                color: #1864ab;
                font-size: 11px;
                cursor: help;
            }
            .mscp-hw-status { margin-left: auto; font-size: 12px; color: #868e96; }
            .mscp-hw-ok { color: #2b8a3e; font-weight: 600; }
            .mscp-hw-error.mscp-hw-status { color: #c92a2a; text-align: right; }
            .mscp-hw-text {
                box-sizing: border-box;
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ced4da;
                border-radius: 6px;
                font: inherit;
                font-size: 13px;
                resize: vertical;
            }
            .mscp-hw-hint { margin-top: 6px; font-size: 12px; color: #868e96; }
            .mscp-hw-footer {
                flex: none;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 12px 18px;
                border-top: 1px solid #e9ecef;
            }
            .mscp-hw-summary { font-size: 13px; color: #495057; }
            .mscp-hw-send {
                padding: 8px 18px;
                border: none;
                border-radius: 8px;
                background: #3b5bdb;
                color: white;
                font-size: 14px;
                cursor: pointer;
            }
            .mscp-hw-send:hover:not(:disabled) { background: #364fc7; }
            .mscp-hw-send:disabled { background: #adb5bd; cursor: default; }
        `;
        document.head.appendChild(style);
    }
};
