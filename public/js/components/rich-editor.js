// contentEditable rich text editor

export function createRichEditor(container, { placeholder = 'Start writing...', onChange, onImageUpload, initialContent = '' } = {}) {
  container.innerHTML = `
    <div class="rich-editor">
      <div class="rich-editor-toolbar">
        <button class="toolbar-btn" data-cmd="bold" title="Bold"><b>B</b></button>
        <button class="toolbar-btn" data-cmd="italic" title="Italic"><i>I</i></button>
        <div class="toolbar-divider"></div>
        <button class="toolbar-btn" data-cmd="h2" title="Heading 2">H2</button>
        <button class="toolbar-btn" data-cmd="h3" title="Heading 3">H3</button>
        <div class="toolbar-divider"></div>
        <button class="toolbar-btn" data-cmd="blockquote" title="Quote">\u201C</button>
        <button class="toolbar-btn" data-cmd="paragraph" title="Paragraph">P</button>
        ${onImageUpload ? `
          <div class="toolbar-divider"></div>
          <button class="toolbar-btn" data-cmd="image" title="Insert Image">\uD83D\uDDBC</button>
        ` : ''}
      </div>
      <div class="rich-editor-content" contenteditable="true" data-placeholder="${placeholder}"></div>
      ${onImageUpload ? '<input type="file" accept="image/*" class="rich-editor-file-input" style="display:none">' : ''}
    </div>
  `;

  const content = container.querySelector('.rich-editor-content');
  const fileInput = container.querySelector('.rich-editor-file-input');
  content.innerHTML = initialContent;

  // Toolbar actions
  container.querySelector('.rich-editor-toolbar').addEventListener('click', (e) => {
    const btn = e.target.closest('.toolbar-btn');
    if (!btn) return;
    const cmd = btn.dataset.cmd;

    if (cmd === 'image') {
      fileInput.click();
      return;
    }

    content.focus();

    switch (cmd) {
      case 'bold': document.execCommand('bold'); break;
      case 'italic': document.execCommand('italic'); break;
      case 'h2': document.execCommand('formatBlock', false, 'h2'); break;
      case 'h3': document.execCommand('formatBlock', false, 'h3'); break;
      case 'blockquote': document.execCommand('formatBlock', false, 'blockquote'); break;
      case 'paragraph': document.execCommand('formatBlock', false, 'p'); break;
    }
    updateToolbarState();
  });

  // File input handler
  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      fileInput.value = '';

      const url = await onImageUpload(file);
      if (url) {
        content.focus();
        document.execCommand('insertHTML', false, `<img src="${url}" alt="">`);
        onChange?.(content.innerHTML);
      }
    });
  }

  function updateToolbarState() {
    container.querySelectorAll('.toolbar-btn').forEach(btn => {
      const cmd = btn.dataset.cmd;
      let active = false;
      if (cmd === 'bold') active = document.queryCommandState('bold');
      else if (cmd === 'italic') active = document.queryCommandState('italic');
      btn.classList.toggle('active', active);
    });
  }

  content.addEventListener('input', () => {
    onChange?.(content.innerHTML);
  });

  content.addEventListener('keyup', updateToolbarState);
  content.addEventListener('mouseup', updateToolbarState);

  return {
    getContent: () => content.innerHTML,
    setContent: (html) => { content.innerHTML = html; },
    getTextContent: () => content.textContent,
    focus: () => content.focus(),
    appendContent: (html) => { content.innerHTML += html; onChange?.(content.innerHTML); },
    replaceContent: (html) => { content.innerHTML = html; onChange?.(content.innerHTML); },
  };
}
