// ============================================================
// РАСПИСАНИЕ: чтение данных урока из карточки сайта
// ============================================================

/** Цвета предметов: полоска слева на карточке и пометка в легенде */
const SCHEDULE_SUBJECT_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16', '#f97316', '#64748b'];

/**
 * Определяет статус значка урока или ДЗ по цвету иконки на сайте
 * @param {string} color - цвет в формате "rgb(r, g, b)"
 * @returns {'done'|'late'|'wait'} зелёный — заполнено, красный — не заполнено, серый — ещё нет
 */
function lessonStatusFromColor(color) {
    const [red, green] = (color.match(/\d+/g) ?? []).map(Number);
    if (green > red + 40) return 'done';
    if (red > green + 60) return 'late';
    return 'wait';
}

/**
 * Подбирает цвет класса: один и тот же класс всегда получает один и тот же цвет
 * Оттенки берутся шагом "золотого угла" от номера класса, поэтому соседние классы (7-А, 7-Б) заметно различаются
 * @param {string} className - класс в виде "10-А"
 * @returns {string} цвет для CSS; пустая строка, если класс не распознан
 */
function classColor(className) {
    const match = /^(\d{1,2})-(.)/u.exec(className);
    if (!match) return '';

    const index = Number(match[1]) * 40 + match[2].toUpperCase().codePointAt(0) % 40;
    return `hsl(${Math.round(index * 137.508) % 360} 65% 42%)`;
}

/**
 * Читает данные урока из карточки сайта
 * Название журнала бывает "Физика 9-В 9 кл. нем.яз. 26/27" и "Алгебра и начала анализа 10-А":
 * класс ищется по шаблону "10-А", предмет — всё, что стоит до него
 * @param {HTMLElement} card - карточка урока сайта
 * @returns {{start: string, end: string, className: string, subject: string, fullName: string,
 *            journal: string, homework: string, isCurrent: boolean}}
 */
function parseLessonCard(card) {
    const time = /^\d+\.\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(card.textContent.trim());
    const fullName = card.firstElementChild?.children[1]?.firstElementChild?.firstElementChild?.textContent.trim() ?? '';

    const classMatch = /(?:^|\s)(\d{1,2}\s*-\s*[А-ЯЁA-Z])(?=\s|$)/iu.exec(fullName);
    const className = classMatch ? classMatch[1].replace(/\s+/g, '') : '';
    let subject = classMatch ? fullName.slice(0, classMatch.index).trim() : fullName;
    if (!subject && classMatch) {
        subject = fullName.slice(classMatch.index + classMatch[0].length).trim();
    }

    const statusOf = kind => {
        const badge = card.querySelector(`[data-test-component$="${kind}-badgeStatus"]`);
        const target = badge?.querySelector('svg') ?? badge;
        return target ? lessonStatusFromColor(getComputedStyle(target).color) : 'wait';
    };

    // Идущий сейчас урок сайт обводит синей рамкой
    const [red, green, blue] = (getComputedStyle(card.parentElement).borderTopColor.match(/\d+/g) ?? []).map(Number);

    return {
        start: time?.[1] ?? '',
        end: time?.[2] ?? '',
        className,
        subject,
        fullName,
        journal: statusOf('Book'),
        homework: statusOf('Home'),
        isCurrent: blue > red + 60 && blue > green + 20
    };
}
