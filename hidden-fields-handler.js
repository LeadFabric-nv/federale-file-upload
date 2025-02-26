MktoForms2.whenReady(function (form) {
    const captchaDisclaimer = document.querySelector('.mktoCaptchaDisclaimer');
    if (captchaDisclaimer) {
        captchaDisclaimer.style.display = "none";
    }

    const fieldsToHandle = ['fVcontactme'];

    function findFormRow(element) {
        let current = element;
        while (current && !current.classList.contains('mktoFormRow')) {
            current = current.parentElement;
        }
        return current;
    }

    function hasIncompleteRequiredFields() {
        return form.getFormElem().find('.mktoRequired.mktoInvalid').length > 0;
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
        // Remove previous event listeners
        field.removeEventListener('blur', handleFieldBlur);
        // Just attach the blur listener for visibility toggling
        field.addEventListener('blur', handleFieldBlur);
    }

    function handleFieldBlur(event) {
        // Only toggle visibility based on required/invalid fields after the user leaves the field
        setTimeout(toggleFieldRowsVisibility, 0);
    }

    function handleNewFields(formRow) {
        formRow.querySelectorAll('input, select, textarea').forEach(attachFieldListeners);
    }

    function initializeFormHandlers() {
        // Toggle visibility of fields based on required/incomplete fields
        fieldsToHandle.forEach(fieldId => {
            const field = form.getFormElem().find(`#${fieldId}`)[0];
            if (!field) return;

            const fieldRow = findFormRow(field);
            if (fieldRow) {
                fieldRow.style.display = hasIncompleteRequiredFields() ? 'block' : 'none';
            }
        });

        // Attach blur listeners to form fields (without validation)
        form.getFormElem().find('input, select, textarea').each(function () {
            attachFieldListeners(this);
        });

        const formElement = form.getFormElem()[0];
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList && !node.classList.contains('mktoPlaceholder')) {
                        const formRow = findFormRow(node);
                        if (formRow) handleNewFields(formRow);
                    }
                });
            });
        });

        // Observe any dynamic form elements being added
        observer.observe(formElement, {
            childList: true,
            subtree: true
        });

        // Only toggle field visibility after Marketo validation (not custom validation)
        form.onValidate(function () {
            setTimeout(toggleFieldRowsVisibility, 0);
        });
    }

    initializeFormHandlers();
});