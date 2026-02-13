// Modal dialogs

const overlay = () => document.getElementById('modal-overlay');

export function showModal({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, danger = false }) {
  const el = overlay();
  el.innerHTML = `
    <div class="modal">
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary modal-cancel">${cancelText}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} modal-confirm">${confirmText}</button>
      </div>
    </div>
  `;
  el.classList.remove('hidden');
  el.querySelector('.modal-cancel').onclick = () => hideModal();
  el.querySelector('.modal-confirm').onclick = () => {
    hideModal();
    onConfirm?.();
  };
  el.onclick = (e) => { if (e.target === el) hideModal(); };
}

export function hideModal() {
  const el = overlay();
  el.classList.add('hidden');
  el.innerHTML = '';
}
