MktoForms2.whenReady(function(form) {
  const fieldsToHandle = ['fVcontactme', 'otherFieldId', 'anotherFieldId'];

  function findFormRow(element) {
    let current = element;
    while (current && !current.classList.contains('mktoFormRow')) {
      current = current.parentElement;
    }
    return current;
  }

  function hasIncompleteRequiredFields() {
    const requiredFields = form.getFormElem().find('.mktoRequired');
    return requiredFields.length > 0 && requiredFields.hasClass('mktoInvalid');
  }

  function toggleFieldRowsVisibility() {
    fieldsToHandle.forEach(fieldId => {
      const field = form.getFormElem().find(`#${fieldId}`)[0];
      if (!field) return;

      const fieldRow = findFormRow(field);
      if (fieldRow) {
        fieldRow.style.display = hasIncompleteRequiredFields() ? 'block' : 'none';
      }
    });
  }

  function attachFieldListeners(field) {
    field.removeEventListener('change', handleFieldChange);
    field.removeEventListener('blur', handleFieldChange);
    field.removeEventListener('input', handleFieldInput);
    
    field.addEventListener('change', handleFieldChange);
    field.addEventListener('blur', handleFieldChange);
    field.addEventListener('input', handleFieldInput);
  }

  function handleFieldChange() {
    form.validate();
  }

  const handleFieldInput = debounce(() => {
    form.validate();
  }, 300);

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function handleNewFields(formRow) {
    const newFields = formRow.querySelectorAll('input, select, textarea');
    newFields.forEach(attachFieldListeners);
    form.validate();
  }

  function initializeFormHandlers() {
    const hasRequiredFields = form.getFormElem().find('.mktoRequired').length > 0;
    
    fieldsToHandle.forEach(fieldId => {
      const field = form.getFormElem().find(`#${fieldId}`)[0];
      if (!field) return;

      const fieldRow = findFormRow(field);
      if (fieldRow) {
        fieldRow.style.display = hasRequiredFields ? 'block' : 'none';
      }
    });

    const formFields = form.getFormElem().find('input, select, textarea');
    formFields.each(function() {
      attachFieldListeners(this);
    });

    const formElement = form.getFormElem()[0];
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              if (node.classList && !node.classList.contains('mktoPlaceholder')) {
                const formRow = findFormRow(node);
                if (formRow) {
                  handleNewFields(formRow);
                }
              }
            }
          });
        }
      });
    });

    observer.observe(formElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    form.onValidate(function() {
      setTimeout(toggleFieldRowsVisibility, 0);
    });

    form.validate();
  }

  initializeFormHandlers();
});
