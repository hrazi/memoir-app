// Drag-and-drop reorderable list

export function makeDraggable(container, { onReorder, itemSelector = '.drag-item', handleSelector = '.drag-handle' } = {}) {
  let dragItem = null;
  let dragIndex = -1;

  container.addEventListener('dragstart', (e) => {
    const item = e.target.closest(itemSelector);
    if (!item) return;
    dragItem = item;
    dragIndex = getIndex(item);
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  });

  container.addEventListener('dragend', (e) => {
    const item = e.target.closest(itemSelector);
    if (item) item.classList.remove('dragging');
    container.querySelectorAll(itemSelector).forEach(el => el.classList.remove('drag-over'));
    dragItem = null;
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const item = e.target.closest(itemSelector);
    if (!item || item === dragItem) return;
    container.querySelectorAll(itemSelector).forEach(el => el.classList.remove('drag-over'));
    item.classList.add('drag-over');
  });

  container.addEventListener('dragleave', (e) => {
    const item = e.target.closest(itemSelector);
    if (item) item.classList.remove('drag-over');
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    const target = e.target.closest(itemSelector);
    if (!target || !dragItem || target === dragItem) return;
    target.classList.remove('drag-over');

    const items = [...container.querySelectorAll(itemSelector)];
    const fromIndex = dragIndex;
    const toIndex = getIndex(target);

    // Get IDs in new order
    const ids = items.map(el => el.dataset.id);
    const [movedId] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, movedId);

    onReorder?.(ids);
  });

  function getIndex(item) {
    return [...container.querySelectorAll(itemSelector)].indexOf(item);
  }

  // Make items draggable
  container.querySelectorAll(itemSelector).forEach(item => {
    item.setAttribute('draggable', 'true');
  });
}
