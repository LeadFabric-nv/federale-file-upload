// Keep track of selected files
let selectedFiles = [];
let fileUploadInitialized = false;
const ALLOWED_TYPES = ['.png', '.pdf', '.jpeg', '.jpg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const API_URL = 'https://federale-file-upload.lf-apps.com'; //Testing: http://localhost:3000

// Initialize when Marketo form is ready
MktoForms2.whenReady(function (form) {
  
    console.log('Form ready, setting up observer');

    // Create an observer instance
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.nodeName === 'FIELDSET' && node.textContent.toLowerCase().includes('file upload')) {
                    console.log('File upload fieldset added to DOM');
                    initializeFileUpload(form, node);
                    fileUploadInitialized = true;
                }
            });
        });
    });

    // Start observing the form
    observer.observe(form.getFormElem().get(0), { childList: true, subtree: true });

    // Create and insert the thank you message container
    let thankYouContainer = document.getElementById('form-thank-you');
    if (!thankYouContainer) {
        thankYouContainer = document.createElement('div');
        thankYouContainer.id = 'form-thank-you';
        thankYouContainer.style.display = 'none'; // Hidden by default
        form.getFormElem().get(0).parentNode.insertBefore(thankYouContainer, form.getFormElem().get(0).nextSibling);
    }

    // Handle form submission
    form.onSubmit(function() {
        console.log("Form onSubmit triggered");

        if (!fileUploadInitialized) {
            console.log("File upload not initialized, submitting form normally");
            return;
        }

        // Set the upload dateTime
        form.setValues({
            'fVuploaddate': new Date().toISOString();
        });

        // If no files, let form submit normally
        if (selectedFiles.length === 0) {
            console.log("no files, returning true");
            return;
        }
      
        // Get email from form
        const email = form.getValues().Email;

        return uploadFilesToBackend(selectedFiles, email)
            .then(response => {
                console.log("File upload response:", response);

                // Hide form and show thank you message
                form.getFormElem().hide();
                thankYouContainer.style.display = 'block';

                // Display appropriate message
                thankYouContainer.innerHTML = response.success 
                    ? 'Bedankt voor uw inzending. Uw bestanden zijn succesvol geüpload.'
                    : 'Bedankt voor uw inzending. Uw gegevens zijn verzonden, maar helaas is er een probleem opgetreden bij het verwerken van uw bestanden. We nemen contact met u op.';

                return true;
            })
            .catch(error => {
                console.error('Upload process error:', error);
                return false;
            });
    });

    // Handle form success
    form.onSuccess(function() {
        console.log("Form submitted successfully to Marketo");

        // Hide form and show thank you message with default message
        form.getFormElem().hide();
        thankYouContainer.style.display = 'block';
        if (!thankYouContainer.innerHTML) {
            thankYouContainer.innerHTML = 'Bedankt voor uw inzending.';
        }

        return false; // Prevent redirect
    });

});

function initializeFileUpload(form, fieldset) {
    if (fieldset.querySelector('.file-upload-container')) return;

    console.log('Initializing file upload interface');
    
    // Create and append upload interface
    const elements = createUploadInterface();
    fieldset.appendChild(elements.container);

    elements.uploadButton.addEventListener('click', () => elements.fileInput.click());

    elements.fileInput.addEventListener('change', (event) => {
        const newFiles = Array.from(event.target.files);

        if (selectedFiles.length + newFiles.length > 3) {
            elements.errorContainer.textContent = 'Een maximaal aantal van 3 bestanden is toegestaan.';
            elements.fileInput.value = '';
            return;
        }

        // Validate file type and size
        const invalidFiles = newFiles.filter(file => !ALLOWED_TYPES.includes('.' + file.name.split('.').pop().toLowerCase()));
        const oversizedFiles = newFiles.filter(file => file.size > MAX_FILE_SIZE);

        if (invalidFiles.length > 0) {
            elements.errorContainer.textContent = `Ongeldig bestandstype. Toegestane types: ${ALLOWED_TYPES.join(', ')}`;
            elements.fileInput.value = '';
            return;
        }

        if (oversizedFiles.length > 0) {
            elements.errorContainer.textContent = 'Bestand(en) te groot. Maximale bestandsgrootte is 10 MB per bestand.';
            elements.fileInput.value = '';
            return;
        }

        // Check for duplicates
        const duplicateFiles = newFiles.filter(newFile => 
            selectedFiles.some(existingFile => existingFile.formattedName.toLowerCase() === formatFileName(newFile.name).toLowerCase())
        );

        if (duplicateFiles.length > 0) {
            elements.errorContainer.textContent = 'Dit bestand is al aan het formulier toegevoegd.';
            elements.fileInput.value = '';
            return;
        }

        selectedFiles = [...selectedFiles, ...newFiles.map(file => ({
            originalFile: file,
            formattedName: formatFileName(file.name)
        }))];

        elements.errorContainer.textContent = '';
        updateFileList(elements.fileList, elements);
        elements.fileInput.value = '';
    });
}

async function uploadFilesToBackend(files, email) {
    try {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file.originalFile);
            formData.append('names', file.formattedName);
        });
        formData.append('email', email);

        const response = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData });
        return await response.json();
    } catch (error) {
        console.error('Upload Error:', error);
        return { success: false, errorDetails: { code: 'UPLOAD_FAILED', error } };
    }
}

function formatFileName(fileName) {
    const ext = fileName.slice(fileName.lastIndexOf('.'));
    return fileName.slice(0, fileName.lastIndexOf('.')).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + ext;
}

// Create UI elements
function createUploadInterface() {
    const container = document.createElement('div');
    container.className = 'file-upload-container';

    const uploadButton = document.createElement('button');
    uploadButton.type = 'button';
    uploadButton.className = 'upload-btn';
    uploadButton.textContent = 'Bestanden toevoegen';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = ALLOWED_TYPES.join(',');
    fileInput.style.display = 'none';

    const fileList = document.createElement('div');
    fileList.className = 'file-list';

    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';

    container.appendChild(uploadButton);
    container.appendChild(fileInput);
    container.appendChild(fileList);
    container.appendChild(errorContainer);

    return { container, uploadButton, fileInput, fileList, errorContainer };
}

// Update file list display
function updateFileList(fileListElement, elements) {
    fileListElement.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';

        const fileName = document.createElement('span');
        fileName.textContent = file.originalFile.name;
        fileItem.appendChild(fileName);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'remove-file';
        removeButton.textContent = '×';

        removeButton.onclick = () => {
            selectedFiles.splice(index, 1);
            elements.errorContainer.textContent = '';  
            updateFileList(fileListElement, elements);
        };
        fileItem.appendChild(removeButton);

        fileListElement.appendChild(fileItem);
    });
}
