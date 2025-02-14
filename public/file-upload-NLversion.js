
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
            // Look for added nodes
            mutation.addedNodes.forEach(node => {
                // Check if it's an element node and a fieldset
                if (node.nodeType === 1 && node.nodeName === 'FIELDSET') {
                    // Check if this is our target fieldset
                    if (node.textContent.toLowerCase().includes('file upload')) {
                        console.log('File upload fieldset added to DOM');
                        initializeFileUpload(form, node);
                        fileUploadInitialized = true;  // Set flag when initialized
                    }
                }
            });
        });
    });

    // Configure the observer to only watch for added nodes
    const config = {
        childList: true,
        subtree: true
    };

    // Start observing the form
    observer.observe(form.getFormElem().get(0), config);

    // Check form validation
    form.onValidate(function(isValid) {
        console.log("Form validation status:", isValid);
    });

   // Handle form submission
    form.onSubmit(function() {
        console.log("Form onSubmit triggered");

        if (!fileUploadInitialized) {
            console.log("File upload not initialized, submitting form normally");
            return;
        }

        // Set the upload datetime
        const now = new Date().toISOString();
        form.setValues({
            'fVuploaddate': now
        });
        
        // If no files, let form submit normally
        if (selectedFiles.length === 0) {
            console.log("no files, returning true");
            return;
        }

        // Get email from form
        const email = form.getValues().Email;

        console.log(email);
        console.log(form.getValues().fVuploaddate);

        // Return the promise for file upload case
        return uploadFilesToBackend(selectedFiles, email)
            .then(response => {
                console.log("File upload response:", response);
                
                // Hide the form after successful form submission
                form.getFormElem().hide();
                
                // Create thank you message container
                let thankYouContainer = document.getElementById('form-thank-you');
                if (!thankYouContainer) {
                    thankYouContainer = document.createElement('div');
                    thankYouContainer.id = 'form-thank-you';
                    form.getFormElem().get(0).parentNode.insertBefore(thankYouContainer, form.getFormElem().get(0).nextSibling);
                }

                if (response.success) {
                    thankYouContainer.innerHTML = 'Dank u voor uw inzending. Uw bestanden zijn met success verzonden.';
                } else {
                    thankYouContainer.innerHTML = 'Dank u voor uw inzending. Uw informatie is verzonden maar helaas was er een probleem bij het verwerken van uw bestanden. Wij zullen contact met u opnemen.';
                }

                return true;
            })
            .catch(error => {
                console.error('Upload process error:', error);
                return false;
            });
    });

    // Add success handler to prevent redirect
    form.onSuccess(function(values, followUpUrl) {
        console.log("Form submitted successfully to Marketo");
        return false; // Prevent the redirect
    });

});

function initializeFileUpload(form, fieldset) {
    // Check if we've already initialized on this fieldset
    if (fieldset.querySelector('.file-upload-container')) {
        return;
    }

    console.log('Initializing file upload interface');
    
    // Create and append upload interface
    const elements = createUploadInterface();
    fieldset.appendChild(elements.container);

    // Handle file selection
    elements.uploadButton.addEventListener('click', () => {
        elements.fileInput.click();
    });

    elements.fileInput.addEventListener('change', (event) => {
        const newFiles = Array.from(event.target.files);

        // Check if adding new files would exceed the limit
        if (selectedFiles.length + newFiles.length > 3) {
            elements.errorContainer.textContent = 'Voeg maximum 3 bestanden toe.';
            elements.fileInput.value = '';
            return;
        }

        // File type validation
        const invalidFiles = newFiles.filter(file => {
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            return !ALLOWED_TYPES.includes(extension);
        });
    
        if (invalidFiles.length > 0) {
            elements.errorContainer.textContent = `Ongeldig bestandstype. Toegestane types: ${ALLOWED_TYPES.join(', ')}`;
            elements.fileInput.value = '';
            return;
        }

        // File size validation
        const oversizedFiles = newFiles.filter(file => file.size > MAX_FILE_SIZE);
        
        if (oversizedFiles.length > 0) {
            elements.errorContainer.textContent = `Bestand(en) te groot. De maximale grootte is 10MB per bestand.`;
            elements.fileInput.value = '';
            return;
        }

        // Check for duplicate file names
        const duplicateFiles = newFiles.filter(newFile => {
            const newFormattedName = formatFileName(newFile.name);
            return selectedFiles.some(existingFile => 
                existingFile.formattedName.toLowerCase() === newFormattedName.toLowerCase()
            );
        });

        if (duplicateFiles.length > 0) {
            elements.errorContainer.textContent = 'Dit bestand is reeds toegevoegd aan het formulier.';
            elements.fileInput.value = '';
            return;
        }

        // Add new files to our selection
        selectedFiles = [...selectedFiles, ...newFiles.map(file => ({
            originalFile: file,
            formattedName: formatFileName(file.name)
        }))];

        // Clear any previous error messages
        elements.errorContainer.textContent = '';

        // Update the display
        updateFileList(elements.fileList, elements);

        // Reset file input
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

        // Add email to form data
        formData.append('email', email);

        const response = await fetch(`${API_URL}/api/upload`, { 
            method: 'POST', 
            body: formData
        });

        const result = await response.json();
        console.log('Upload Result:', result); 
        return result;
    } catch (error) {
        console.error('Upload Error:', error); 
        return { success: false, errorDetails: { code: 'UPLOAD_FAILED', error } };
    }
}

function formatFileName(fileName) {
    // Get file extension
    const ext = fileName.slice(fileName.lastIndexOf('.'));
    // Get name without extension, remove special chars and spaces
    const name = fileName.slice(0, fileName.lastIndexOf('.'))
        .replace(/[^a-zA-Z0-9]/g, '_')  // Replace special chars with underscore
        .toLowerCase();
    return name + ext;
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

    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container';
    messageContainer.style.display = 'none';

    container.appendChild(uploadButton);
    container.appendChild(fileInput);
    container.appendChild(fileList);
    container.appendChild(errorContainer);
    container.appendChild(messageContainer);

    return {
        container,
        uploadButton,
        fileInput,
        fileList,
        errorContainer,
        messageContainer 
    };
}

// Function to update file list display
function updateFileList(fileListElement, elements) {
    fileListElement.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';

        // Add file name
        const fileName = document.createElement('span');
        fileName.textContent = `${file.originalFile.name} → ${file.formattedName}`;
        fileItem.appendChild(fileName);

        // Add remove button
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