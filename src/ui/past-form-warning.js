// ============================================================
// ПЛАШКА В КАРТОЧКЕ ОЦЕНКИ: форму «только в день урока» нельзя менять на прошлую дату
// ============================================================

/** Карточки оценки: быстрая (всплывающая) и расширенная (боковая) */
const MARK_CARD_SELECTOR = '[data-test-component$="-FastPopup"], [data-test-component$="-AdvancedSidePage-sidePage"]';

/** @type {Map<number, Promise<string|null>>} Номер урока -> дата урока ГГГГ-ММ-ДД (запрос делается один раз на урок) */
const lessonDateCache = new Map();

/**
 * Выбранные в карточке формы контроля: по одной на каждую отметку
 * Берётся только выбранное значение выпадающего списка (первая строка), а не все пункты открытого списка
 * @param {HTMLElement} card - карточка оценки
 * @returns {string[]} Названия форм
 */
function getCardForms(card) {
    return [...card.querySelectorAll('[data-test-component$="selectSingleWrapper"]')]
        .filter(select => /controlform/i.test(select.getAttribute('data-test-component')))
        .map(select => select.innerText.split('\n')[0].trim())
        .filter(Boolean);
}

/**
 * Находит в карточке запрещённую форму контроля
 * @param {HTMLElement} card - карточка оценки
 * @returns {string|null} Название формы или null
 */
function findRestrictedForm(card) {
    const restricted = new Set(CONFIG.CONTROL_FORMS.RESTRICTED_NAMES.map(name => name.toLowerCase()));
    return getCardForms(card).find(form => restricted.has(form.toLowerCase())) ?? null;
}

/**
 * Дата урока, к которому открыта карточка
 * Номер урока берётся из data-test-component карточки (markCellAlteration-<ученик>_<урок>_<форма>), дата — из API сайта
 * @param {HTMLElement} card - карточка оценки
 * @returns {Promise<string|null>} Дата ГГГГ-ММ-ДД или null, если определить не удалось
 */
function getCardLessonDate(card) {
    const lessonId = Number(card.getAttribute('data-test-component').match(/^markCellAlteration-\d+_(\d+)_/)?.[1]);
    const session = ColleagueApi.session();
    if (!lessonId || !session) return Promise.resolve(null);

    if (!lessonDateCache.has(lessonId)) {
        const request = ColleagueApi.get('/plan/teacher/v1/schedule_items', {
            academic_year_id: session.year, ids: lessonId
        }).then(items => {
            const date = items[0]?.date;
            return date ? `${date[0]}-${String(date[1]).padStart(2, '0')}-${String(date[2]).padStart(2, '0')}` : null;
        });
        // Неудачный запрос не запоминаем, чтобы следующая карточка попробовала снова
        request.catch(() => lessonDateCache.delete(lessonId));
        lessonDateCache.set(lessonId, request);
    }
    return lessonDateCache.get(lessonId);
}

/**
 * Показывает или убирает плашку в карточке оценки
 * @param {HTMLElement} card - карточка оценки
 * @returns {Promise<void>}
 */
async function updatePastFormWarning(card) {
    let banner = card.querySelector('.mscp-past-warning');
    let message = '';

    if (loadSettings().warnPastRestrictedForm) {
        const form = findRestrictedForm(card);
        if (form) {
            try {
                const iso = await getCardLessonDate(card);
                if (iso && iso < ColleagueApi.isoDate(new Date())) {
                    message = `Нельзя менять: форма «${form}» ставится и меняется только в день урока (${HomeworkApi.siteDate(iso)})`;
                }
            } catch (error) {
                console.error('Не удалось определить дату урока:', error);
            }
        }
    }

    banner = card.querySelector('.mscp-past-warning');
    if (!message) {
        banner?.remove();
        return;
    }

    if (!banner) {
        createStyles();
        banner = document.createElement('div');
        banner.className = 'mscp-past-warning';
        (card.firstElementChild ?? card).prepend(banner);
    }
    if (banner.textContent !== message) banner.textContent = message;
}

/**
 * Следит за открытыми карточками оценки и обновляет в них плашку
 * Пересчёт откладывается до следующего кадра, чтобы не работать на каждое изменение страницы
 * @returns {void}
 */
function initPastFormWarning() {
    let scheduled = false;

    const observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            document.querySelectorAll(MARK_CARD_SELECTOR).forEach(updatePastFormWarning);
        });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}
