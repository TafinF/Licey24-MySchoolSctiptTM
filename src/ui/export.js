// ============================================================
// ЭКСПОРТ ЖУРНАЛА
// ============================================================

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
