// Keep track of selected files
let selectedFiles = [];
const ALLOWED_TYPES = ['.png', '.pdf', '.jpeg', '.jpg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const API_URL = 'http://localhost:3000';

// Initialize when Marketo form is ready
MktoForms2.whenReady(function (form) {
    //Find the file upload fieldset
    const fileFieldset = Array.from(form.getFormElem().get(0).getElementsByTagName('fieldset'))
        .find(fieldset => fieldset.textContent.toLowerCase().includes('file upload'));

    if (!fileFieldset) {
        console.error('File upload fieldset not found');
        return;
    }

    //Create and inject upload interface
    const elements = createUploadInterface();
    fileFieldset.appendChild(elements.container);

    // Handle file selection
    elements.uploadButton.addEventListener('click', () => {
        elements.fileInput.click();
    });

    elements.fileInput.addEventListener('change', (event) => {
        const newFiles = Array.from(event.target.files);

        // Check if adding new files would exceed the limit
        if (selectedFiles.length + newFiles.length > 3) {
            elements.errorContainer.textContent = 'Maximum 3 files allowed';
            elements.fileInput.value = '';
            return;
        }

        // File type validation
        const invalidFiles = newFiles.filter(file => {
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            return !ALLOWED_TYPES.includes(extension);
        });
    
        if (invalidFiles.length > 0) {
            elements.errorContainer.textContent = `Invalid file type(s). Allowed types: ${ALLOWED_TYPES.join(', ')}`;
            elements.fileInput.value = '';
            return;
        }

        // File size validation
        const oversizedFiles = newFiles.filter(file => file.size > MAX_FILE_SIZE);
        
        if (oversizedFiles.length > 0) {
            elements.errorContainer.textContent = `File(s) too large. Maximum size allowed is 10MB per file`;
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

        // Reset file input so the same file can be selected again if needed
        elements.fileInput.value = '';
    });

    // Check form validation
    form.onValidate(function(isValid) {
        console.log("Form validation status:", isValid);
        if (!isValid) {
            console.log("Invalid fields:", form.getInvalidFields());
        }
    });

   // Handle form submission
    form.onSubmit(function() {
        console.log("Form onSubmit triggered");

        // Set the upload datetime
        const now = new Date().toISOString();
        form.setValues({
            'fVuploaddate': now
        });
        
        // If no files, let form submit normally
        if (selectedFiles.length === 0) {
            console.log("no files, returning true");
            return true;
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
                    thankYouContainer.innerHTML = 'Thank you for your submission. Your files have been successfully uploaded.';
                } else {
                    thankYouContainer.innerHTML = 'Thank you for your submission. Unfortunately, there was an issue processing your files. Please contact us via email.';
                }

                return true;
            })
            .catch(error => {
                console.error('Upload process error:', error);
                // Handle error case
                return true;
            });
    });

    // Add success handler to prevent redirect
    form.onSuccess(function(values, followUpUrl) {
        console.log("Form submitted successfully to Marketo");
        return false; // Prevent the redirect
    });

});


function formatFileName(fileName) {
    // Get file extension
    const ext = fileName.slice(fileName.lastIndexOf('.'));
    // Get name without extension, remove special chars and spaces
    const name = fileName.slice(0, fileName.lastIndexOf('.'))
        .replace(/[^a-zA-Z0-9]/g, '_')  // Replace special chars with underscore
        .toLowerCase();
    return name + ext;
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
            method: 'POST', //GET
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

// Create UI elements
function createUploadInterface() {
    const container = document.createElement('div');
    container.className = 'file-upload-container';

    const uploadButton = document.createElement('button');
    uploadButton.type = 'button';
    uploadButton.className = 'upload-btn';
    uploadButton.textContent = 'Upload Files';

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

