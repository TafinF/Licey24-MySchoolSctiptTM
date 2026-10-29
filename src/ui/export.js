// ============================================================
// ЭКСПОРТ: журнал и токен входа
// ============================================================

/**
 * Скачивает токен входа в формате token.json проекта школьного журнала:
 * {"aupd_token": "...", "profile_id": "..."}
 * Токен и профиль берутся из cookie, куда их кладёт сайт после входа
 * @returns {{ok: boolean, daysLeft?: number}} ok — false, если cookie с токеном нет; daysLeft — сколько суток он ещё действует
 */
function downloadToken() {
    const token = ColleagueApi.readCookie('aupd_token');
    const profile = ColleagueApi.readCookie('profile_id');
    if (!token || !profile) return { ok: false };

    const link = document.createElement('a');
    const file = new Blob([JSON.stringify({ aupd_token: token, profile_id: profile }, null, 2)], { type: 'application/json' });

    link.href = URL.createObjectURL(file);
    link.download = 'token.json';
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);

    // Срок жизни — в самом токене (JWT, поле exp в секундах)
    let daysLeft;
    try {
        const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        daysLeft = (JSON.parse(atob(payload)).exp * 1000 - Date.now()) / 86400000;
    } catch (error) {
        console.error('Не удалось прочитать срок токена:', error);
    }

    return { ok: true, daysLeft };
}

/**
 * Скачивает таблицу журнала как HTML-файл
 * @returns {void}
 */
function downloadAsFile() {
    const table = document.querySelector(CONFIG.SELECTORS.JOURNAL_TABLE);
    if (!table) return;

    const link = document.createElement('a');
    const file = new Blob([table.outerHTML], { type: 'text/html' });

    link.href = URL.createObjectURL(file);
    link.download = 'journal_export.html';
    link.click();
    link.remove();
}
