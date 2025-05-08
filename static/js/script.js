document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const fileList = document.getElementById('file-list');
    const selectedFile = document.getElementById('selected-file');
    const breadcrumb = document.getElementById('breadcrumb');
    const logEntries = document.getElementById('log-entries');
    const statusBar = document.getElementById('status-bar');
    const activityLog = document.getElementById('activity-log');
    const activityLogHeader = document.getElementById('activity-log-header');
    const expandLogButton = document.getElementById('expand-log');
    
    // Content viewers
    const textContent = document.getElementById('text-content');
    const unifiedMediaViewer = document.getElementById('unified-media-viewer');
    const metadataViewer = document.getElementById('metadata-viewer');
    const metadataContent = document.getElementById('metadata-content');
    
    // Buttons
    const downloadButton = document.getElementById('btn-download');
    const metadataButton = document.getElementById('btn-metadata');
    const closeMetadataButton = document.getElementById('btn-close-metadata');
    const reloadTargetsBtn = document.getElementById('btn-reload-targets');
    
    // All viewers array (for clearing)
    const allViewers = [textContent, unifiedMediaViewer, metadataViewer];
    
    // State variables
    let currentDirectory = '';
    let currentFile = null;
    let logExpanded = true;
    let currentFileMetadata = null;
    
    // Initialize activity log collapsed state
    activityLog.classList.add('collapsed');
    
    // Activity log expand/collapse functionality
    activityLogHeader.addEventListener('click', toggleActivityLog);
    
    // Button event listeners
    downloadButton.addEventListener('click', downloadCurrentFile);
    metadataButton.addEventListener('click', viewMetadata);
    closeMetadataButton.addEventListener('click', closeMetadata);
    if (reloadTargetsBtn) {
        reloadTargetsBtn.addEventListener('click', reloadTargetFiles);
    }
    
    function toggleActivityLog() {
        logExpanded = !logExpanded;
        if (logExpanded) {
            activityLog.classList.remove('collapsed');
            expandLogButton.classList.add('expanded');
            expandLogButton.textContent = '▲';
        } else {
            activityLog.classList.add('collapsed');
            expandLogButton.classList.remove('expanded');
            expandLogButton.textContent = '▼';
        }
    }
    
    function downloadCurrentFile() {
        if (!currentFile) return;
        
        // Create a download link and trigger click
        const downloadUrl = `/api/download/${encodeURIComponent(currentFile)}`;
        
        // Create a temporary anchor element to trigger the download
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.target = '_blank';
        downloadLink.download = ''; // This will use the server's filename
        
        // Append to body, click, and remove
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        updateStatus(`Downloading file: ${currentFile}`, 'success');
        
        // Add local log entry for download
        addLocalLogEntry({
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            action: "DOWNLOAD",
            path: currentFile,
            status: "SUCCESS"
        });
        
        // Update logs after a short delay to include the download action
        setTimeout(fetchLogs, 1000);
    }
    
    function viewMetadata() {
        if (!currentFile) return;
        
        updateStatus(`Loading metadata for: ${currentFile}`, 'info');
        
        // Add local log entry for metadata view
        addLocalLogEntry({
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            action: "METADATA",
            path: currentFile,
            status: "SUCCESS"
        });
        
        fetch('/api/metadata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filepath: currentFile }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.metadata) {
                currentFileMetadata = data.metadata;
                displayMetadata(data.metadata);
                updateStatus(data.message, 'success');
            } else {
                updateStatus(`Error loading metadata: ${data.message}`, 'error');
                
                // Add error log entry
                addLocalLogEntry({
                    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                    action: "METADATA",
                    path: currentFile,
                    status: "ERROR"
                });
            }
            
            // Update logs from server after a delay
            setTimeout(fetchLogs, 1000);
        })
        .catch(error => {
            console.error('Error:', error);
            updateStatus('Error: Failed to fetch metadata', 'error');
            
            // Add error log entry
            addLocalLogEntry({
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                action: "METADATA",
                path: currentFile,
                status: "ERROR"
            });
        });
    }
    
    function displayMetadata(metadata) {
        // Hide other viewers and show metadata viewer
        textContent.style.display = 'none';
        unifiedMediaViewer.style.display = 'none';
        metadataViewer.style.display = 'block';
        
        // Format metadata as HTML
        let html = '<div class="metadata-sections">';
        
        // Basic information section
        if (metadata.basic) {
            html += '<div class="metadata-section">';
            html += '<h4 class="metadata-section-title">Basic Information</h4>';
            html += '<table>';
            
            for (const [key, value] of Object.entries(metadata.basic)) {
                html += `<tr><th>${formatKey(key)}</th><td>${value || 'N/A'}</td></tr>`;
            }
            
            html += '</table></div>';
        }
        
        // Timestamps section
        if (metadata.timestamps) {
            html += '<div class="metadata-section">';
            html += '<h4 class="metadata-section-title">Timestamps</h4>';
            html += '<table>';
            
            for (const [key, value] of Object.entries(metadata.timestamps)) {
                html += `<tr><th>${formatKey(key)}</th><td>${value || 'N/A'}</td></tr>`;
            }
            
            html += '</table></div>';
        }
        
        // Permissions section
        if (metadata.permissions) {
            html += '<div class="metadata-section">';
            html += '<h4 class="metadata-section-title">Permissions</h4>';
            html += '<table>';
            
            for (const [key, value] of Object.entries(metadata.permissions)) {
                let displayValue = value;
                
                // For boolean values, show Yes/No
                if (typeof value === 'boolean') {
                    displayValue = value ? 'Yes' : 'No';
                }
                
                html += `<tr><th>${formatKey(key)}</th><td>${displayValue}</td></tr>`;
            }
            
            html += '</table></div>';
        }
        
        // EXIF data for images if available
        if (metadata.exif) {
            html += '<div class="metadata-section">';
            html += '<h4 class="metadata-section-title">EXIF Data</h4>';
            html += '<table>';
            
            for (const [key, value] of Object.entries(metadata.exif)) {
                html += `<tr><th>${key}</th><td>${value || 'N/A'}</td></tr>`;
            }
            
            html += '</table></div>';
        }
        
        // System information
        if (metadata.system) {
            html += '<div class="metadata-section">';
            html += '<h4 class="metadata-section-title">System Information</h4>';
            html += '<table>';
            
            for (const [key, value] of Object.entries(metadata.system)) {
                html += `<tr><th>${formatKey(key)}</th><td>${value || 'N/A'}</td></tr>`;
            }
            
            html += '</table></div>';
        }
        
        // Error messages
        if (metadata.error) {
            html += `<div class="metadata-section error">
                <h4 class="metadata-section-title">Error</h4>
                <p>${metadata.error}</p>
            </div>`;
        }
        
        html += '</div>';
        
        // Update the content
        metadataContent.innerHTML = html;
    }
    
    function closeMetadata() {
        metadataViewer.style.display = 'none';
        
        // Show the previous content again
        if (currentFile) {
            if (textContent.value) {
                textContent.style.display = 'block';
            } else {
                unifiedMediaViewer.style.display = 'block';
            }
        }
    }
    
    function formatKey(key) {
        // Convert camelCase or snake_case to Title Case with spaces
        return key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
    }
    
    // Hide all content viewers
    function hideAllViewers() {
        textContent.style.display = 'none';
        unifiedMediaViewer.style.display = 'none';
        metadataViewer.style.display = 'none';
        // Clear any previous content
        unifiedMediaViewer.innerHTML = '';
    }
    
    // Initialize the app with a fade-in effect
    document.body.style.opacity = 0;
    setTimeout(() => {
        // Initial UI setup - hide viewers until a file is selected
        hideAllViewers();
        
        // Ensure placeholder message is visible until a file is selected
        document.querySelector('.content-area').classList.remove('content-loaded');
        
        document.body.style.transition = 'opacity 0.5s ease-in-out';
        document.body.style.opacity = 1;
        loadDirectory(currentDirectory);
        fetchLogs();
        
        // Start with activity log expanded to show initial messages
        setTimeout(() => {
            toggleActivityLog();
        }, 500);
    }, 200);
    
    // Set up periodic log refresh
    setInterval(fetchLogs, 5000);
    
    // Update status with visual indicator
    function updateStatus(message, type = 'info') {
        const statusIcon = statusBar.querySelector('.status-icon');
        
        // Clear previous classes
        statusIcon.className = 'status-icon';
        
        // Add appropriate class based on message type
        if (type === 'success') {
            statusIcon.style.color = 'var(--success-color)';
        } else if (type === 'error') {
            statusIcon.style.color = 'var(--danger-color)';
        } else if (type === 'warning') {
            statusIcon.style.color = 'var(--warning-color)';
        } else if (type === 'blocked') {
            statusIcon.style.color = 'var(--danger-color)';
        } else {
            statusIcon.style.color = 'var(--primary-color)';
        }
        
        // Set the message text
        statusBar.innerHTML = `<span class="status-icon">●</span> ${message}`;
        
        // Add a subtle animation to the status bar
        statusBar.style.transform = 'translateY(2px)';
        setTimeout(() => {
            statusBar.style.transition = 'transform 0.3s ease-out';
            statusBar.style.transform = 'translateY(0)';
        }, 50);
    }
    
    // Function to load directory contents
    function loadDirectory(directory) {
        currentDirectory = directory;
        updateBreadcrumb(directory);
        
        // Disable buttons when changing directories
        downloadButton.disabled = true;
        metadataButton.disabled = true;
        
        fileList.innerHTML = '<div class="loading">Loading files...</div>';
        updateStatus(`Loading directory: ${directory || 'Drives'}`, 'info');
        
        fetch('/api/list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ directory: directory }),
        })
        .then(response => response.json())
        .then(data => {
            fileList.innerHTML = '';
            updateStatus(data.message, data.message.includes('SUCCESS') ? 'success' : 'error');
            
            // Debug output for API response
            console.log("API response:", data);
            
            if (data.items.length === 0) {
                fileList.innerHTML = '<div class="loading">No files found</div>';
                return;
            }
            
            // Sort items: drives first, then directories, then files
            const sortedItems = data.items.sort((a, b) => {
                if (a.type === b.type) {
                    return a.name.localeCompare(b.name);
                }
                if (a.type === 'drive') return -1;
                if (b.type === 'drive') return 1;
                return a.type === 'directory' ? -1 : 1;
            });
            
            // Add items with staggered animation
            sortedItems.forEach((item, index) => {
                const fileItem = document.createElement('div');
                fileItem.className = `file-item ${item.type}`;
                
                // Check if this is a target file and add class
                if (item.is_target === true) {
                    fileItem.classList.add('target-file');
                    console.log(`Target file found: ${item.name}`);
                }
                
                // Create main content area for file info
                const fileInfo = document.createElement('div');
                fileInfo.className = 'file-info';
                
                // Use icon if provided
                if (item.icon && item.type === 'file') {
                    fileInfo.innerHTML = `<span class="file-icon">${item.icon}</span> ${item.name}`;
                } else {
                    fileInfo.textContent = item.name;
                }
                
                fileItem.appendChild(fileInfo);
                
                // Add file size for files (not for directories or drives)
                if (item.type === 'file' && item.size !== undefined) {
                    const sizeSpan = document.createElement('span');
                    sizeSpan.className = 'file-size';
                    sizeSpan.textContent = formatFileSize(item.size);
                    
                    // Check if it's a large exe file
                    const isExe = item.name.toLowerCase().endsWith('.exe');
                    const isLarge = item.size > 629145600; // 600MB in bytes
                    
                    if (isExe && isLarge) {
                        sizeSpan.classList.add('large-exe');
                    }
                    
                    fileItem.appendChild(sizeSpan);
                }
                
                fileItem.dataset.path = item.path;
                fileItem.dataset.type = item.type;
                
                // Add staggered fade-in animation
                fileItem.style.opacity = '0';
                fileItem.style.transform = 'translateY(10px)';
                
                fileItem.addEventListener('click', function() {
                    const path = this.dataset.path;
                    const type = this.dataset.type;
                    
                    if (type === 'drive') {
                        // For drives, ask if the user wants to set this as the protected directory
                        const setAsProtected = confirm(`Do you want to enable write protection for "${item.name}"?\n\nIf you select "OK", the drive will be protected from write operations.`);
                        if (setAsProtected) {
                            setAllowedDirectory(path);
                        }
                        loadDirectory(path);
                    } else if (type === 'directory') {
                        loadDirectory(path);
                    } else {
                        selectFile(path);
                    }
                });
                
                fileList.appendChild(fileItem);
                
                // Trigger animation after a short delay based on index
                setTimeout(() => {
                    fileItem.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                    fileItem.style.opacity = '1';
                    fileItem.style.transform = 'translateY(0)';
                }, 50 + (index * 30));
            });
        })
        .catch(error => {
            console.error('Error:', error);
            fileList.innerHTML = `<div class="loading">Error loading files: ${error.message}</div>`;
            updateStatus('Error: Failed to load directory', 'error');
        });
    }
    
    // Function to set allowed directory (for write protection)
    function setAllowedDirectory(directory) {
        fetch('/api/set_allowed_dir', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ directory: directory }),
        })
        .then(response => response.json())
        .then(data => {
            updateStatus(data.message, 'success');
            // Show confirmation message
            alert(`Write protection enabled for: ${directory}`);
            fetchLogs();
        })
        .catch(error => {
            console.error('Error:', error);
            updateStatus('Error: Failed to set protected directory', 'error');
        });
    }
    
    // Function to update breadcrumb
    function updateBreadcrumb(path) {
        breadcrumb.innerHTML = '';
        
        // Add root item
        const rootItem = document.createElement('span');
        rootItem.className = 'breadcrumb-item';
        rootItem.textContent = 'Drives';
        rootItem.dataset.path = '';
        rootItem.addEventListener('click', function() {
            loadDirectory('');
        });
        breadcrumb.appendChild(rootItem);
        
        // If path is not empty, add path segments
        if (path) {
            let segments = [];
            // Handle Windows paths
            if (path.includes(':\\')) {
                // For Windows, split by backslash but preserve the drive letter
                const driveLetter = path.substring(0, 2);
                segments = [driveLetter].concat(path.substring(3).split('\\').filter(Boolean));
            } else {
                // For Unix-like paths
                segments = path.split('/').filter(Boolean);
                if (path.startsWith('/')) {
                    segments.unshift('/');
                }
            }
            
            let currentPath = '';
            
            segments.forEach((segment, index) => {
                if (index === 0 && segment.endsWith(':')) {
                    // This is a Windows drive letter
                    currentPath = segment + '\\';
                } else if (index === 0 && segment === '/') {
                    // This is a Unix root
                    currentPath = '/';
                } else {
                    // For Windows paths
                    if (currentPath.endsWith(':\\') || currentPath.endsWith('\\')) {
                        currentPath += segment;
                    } else if (currentPath.endsWith('/') || currentPath === '') {
                        currentPath += segment;
                    } else {
                        // Determine the separator based on platform
                        const separator = currentPath.includes(':\\') ? '\\' : '/';
                        currentPath += separator + segment;
                    }
                }
                
                const segmentItem = document.createElement('span');
                segmentItem.className = 'breadcrumb-item';
                segmentItem.textContent = segment;
                segmentItem.dataset.path = currentPath;
                segmentItem.addEventListener('click', function() {
                    loadDirectory(this.dataset.path);
                });
                
                breadcrumb.appendChild(segmentItem);
                
                // Add separator for Windows paths
                if (index < segments.length - 1 && currentPath.includes(':\\')) {
                    currentPath += '\\';
                }
            });
        }
    }
    
    // Function to select a file
    function selectFile(path) {
        currentFile = path;
        selectedFile.textContent = path;
        
        // Reset all content viewers
        hideAllViewers();
        
        // Enable action buttons
        downloadButton.disabled = false;
        metadataButton.disabled = false;
        
        // Add highlight animation
        selectedFile.style.backgroundColor = 'var(--primary-color)';
        selectedFile.style.color = 'var(--light-text)';
        setTimeout(() => {
            selectedFile.style.transition = 'background-color 0.5s ease-out, color 0.5s ease-out';
            selectedFile.style.backgroundColor = 'var(--light-bg)';
            selectedFile.style.color = 'var(--primary-color)';
        }, 300);
        
        // Hide placeholder message when content is being shown
        document.querySelector('.content-area').classList.add('content-loaded');
        
        // Log attempted write operations for demonstration purposes
        logProtectionEvent('WRITE', path);
        logProtectionEvent('DELETE', path);
        
        // Automatically read the file content
        readFile(path);
    }
    
    // Show the appropriate viewer based on file type
    function showViewer(type, data) {
        hideAllViewers();
        
        switch(type) {
            case 'text':
                textContent.style.display = 'block';
                
                // Apply special formatting for Office documents
                if (data.is_office) {
                    // Create styled display for Office documents
                    let formattedContent;
                    
                    if (data.office_type === 'word') {
                        formattedContent = formatWordDocument(data.content);
                    } else if (data.office_type === 'powerpoint') {
                        formattedContent = formatPowerPointDocument(data.content);
                    } else {
                        formattedContent = data.content;
                    }
                    
                    textContent.value = formattedContent || '';
                    textContent.classList.add('office-document');
                } else {
                    // Regular text content
                    textContent.value = data.content || '';
                    textContent.classList.remove('office-document');
                }
                break;
                
            case 'pdf':
                unifiedMediaViewer.style.display = 'block';
                
                // Create a unique URL with a query parameter to avoid duplicates
                const uniqueId = new Date().getTime();
                const pdfHtml = `
                    <object data="/api/media/${encodeURIComponent(currentFile)}?_t=${uniqueId}" type="application/pdf" width="100%" height="100%" class="pdf-object">
                        <p>Unable to display PDF. <a href="/api/media/${encodeURIComponent(currentFile)}?_t=${uniqueId}" target="_blank">Download</a> instead.</p>
                    </object>
                `;
                unifiedMediaViewer.innerHTML = pdfHtml;
                break;
                
            case 'image':
                unifiedMediaViewer.style.display = 'block';
                
                // Create a unique URL with a query parameter to avoid duplicates
                const uniqueImageId = new Date().getTime();
                const imgHtml = `
                    <div class="image-container">
                        <img src="/api/media/${encodeURIComponent(currentFile)}?_t=${uniqueImageId}" alt="Image preview" class="image-object" />
                    </div>
                `;
                unifiedMediaViewer.innerHTML = imgHtml;
                break;
                
            case 'video':
                unifiedMediaViewer.style.display = 'block';
                
                // Create a unique URL with a query parameter to avoid duplicates
                const uniqueVideoId = new Date().getTime();
                const videoHtml = `
                    <div class="video-container">
                        <video controls class="video-object">
                            <source src="/api/media/${encodeURIComponent(currentFile)}" type="${data.mimetype}">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                `;
                unifiedMediaViewer.innerHTML = videoHtml;
                break;
                
            case 'audio':
                unifiedMediaViewer.style.display = 'block';
                const audioHtml = `
                    <div class="audio-container">
                        <audio controls class="audio-object">
                            <source src="/api/media/${encodeURIComponent(currentFile)}" type="${data.mimetype}">
                            Your browser does not support the audio tag.
                        </audio>
                    </div>
                `;
                unifiedMediaViewer.innerHTML = audioHtml;
                break;
                
            default:
                // Show unsupported file viewer with metadata
                unifiedMediaViewer.style.display = 'block';
                let metadataHtml = `
                    <div class="unsupported-message">
                        <p>This file type cannot be previewed.</p>
                        <p>File metadata:</p>
                        <div class="file-metadata">
                `;
                
                if (data) {
                    metadataHtml += `<div>File type: ${data.mimetype || 'Unknown'}</div>`;
                    metadataHtml += `<div>File size: ${formatFileSize(data.size || 0)}</div>`;
                    if (data.last_modified) {
                        metadataHtml += `<div>Modified: ${data.last_modified}</div>`;
                    }
                }
                
                metadataHtml += `
                        </div>
                    </div>
                `;
                unifiedMediaViewer.innerHTML = metadataHtml;
                break;
        }
    }
    
    // Format file size in human-readable format
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Function to log protection events (simulating attempts to write/delete)
    function logProtectionEvent(operation, filepath) {
        // Add local log entry immediately
        addLocalLogEntry({
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            action: operation,
            path: filepath,
            status: "BLOCKED"
        });
        
        // Also send to server for persistent logging
        fetch(`/api/${operation.toLowerCase()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                filepath: filepath,
                content: operation === 'WRITE' ? 'Simulated content' : null
            }),
        })
        .catch(error => {
            console.error(`Error logging ${operation} operation:`, error);
        });
    }
    
    // Function to read file
    function readFile(filepath) {
        updateStatus(`Reading file: ${filepath}`, 'info');
        
        fetch('/api/read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filepath: filepath }),
        })
        .then(response => response.json())
        .then(data => {
            updateStatus(data.message, data.data && data.data.content !== null ? 'success' : 'error');
            
            if (data.data) {
                const fileData = data.data;
                
                // Determine file type and show appropriate viewer
                if (fileData.type === 'text') {
                    showViewer('text', fileData);
                } else if (fileData.type === 'binary') {
                    const mimetype = fileData.mimetype || '';
                    
                    if (mimetype.startsWith('image/')) {
                        showViewer('image', fileData);
                    } else if (mimetype.startsWith('video/')) {
                        showViewer('video', fileData);
                    } else if (mimetype.startsWith('audio/')) {
                        showViewer('audio', fileData);
                    } else if (mimetype === 'application/pdf') {
                        showViewer('pdf', fileData);
                    } else {
                        showViewer('unsupported', fileData);
                    }
                } else {
                    showViewer('unsupported', fileData);
                }
            } else {
                textContent.style.display = 'block';
                textContent.value = 'Unable to read file content';
            }
            fetchLogs();
        })
        .catch(error => {
            console.error('Error:', error);
            updateStatus('Error: Failed to read file', 'error');
            textContent.style.display = 'block';
            textContent.value = `Error reading file: ${error.message}`;
        });
    }
    
    // Function to fetch activity logs
    function fetchLogs() {
        // Store current scroll position
        const scrollPos = logEntries.scrollTop;
        const wasAtTop = scrollPos === 0;
        
        fetch('/api/logs')
        .then(response => response.json())
        .then(data => {
            // Keep track of how many logs we had before
            const previousLogCount = logEntries.querySelectorAll('.log-entry').length;
            
            logEntries.innerHTML = '';
            
            if (data.logs.length === 0) {
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry';
                logEntry.innerHTML = '<span class="timestamp">No activity yet</span>';
                logEntries.appendChild(logEntry);
                return;
            }
            
            // Display logs in reverse chronological order (newest first)
            data.logs.slice().reverse().forEach((log, index) => {
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry';
                
                // Add animation class for new logs
                if (index < data.logs.length - previousLogCount && previousLogCount > 0) {
                    logEntry.classList.add('new-entry');
                }
                
                const timestamp = document.createElement('span');
                timestamp.className = 'timestamp';
                timestamp.textContent = log.timestamp;
                
                const action = document.createElement('span');
                action.className = `log-action ${log.action}`;
                action.textContent = log.action;
                
                const status = document.createElement('span');
                status.className = `log-action ${log.status}`;
                status.textContent = `[${log.status}]`;
                
                const path = document.createElement('span');
                path.className = 'log-path';
                path.textContent = log.path;
                
                logEntry.appendChild(timestamp);
                logEntry.appendChild(action);
                logEntry.appendChild(status);
                logEntry.appendChild(path);
                
                logEntries.appendChild(logEntry);
            });
            
            // If we were at the top or there are new logs, scroll to top
            // Otherwise maintain previous scroll position
            if (wasAtTop || data.logs.length > previousLogCount) {
                logEntries.scrollTop = 0;
            } else {
                logEntries.scrollTop = scrollPos;
            }
        })
        .catch(error => {
            console.error('Error fetching logs:', error);
        });
    }
    
    // Function to add a local log entry immediately
    function addLocalLogEntry(logData) {
        // If log is collapsed, expand it to show new entries
        if (!logExpanded) {
            toggleActivityLog();
        }
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry new-entry';
        
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = logData.timestamp;
        
        const action = document.createElement('span');
        action.className = `log-action ${logData.action}`;
        action.textContent = logData.action;
        
        const status = document.createElement('span');
        status.className = `log-action ${logData.status}`;
        status.textContent = `[${logData.status}]`;
        
        const path = document.createElement('span');
        path.className = 'log-path';
        path.textContent = logData.path;
        
        logEntry.appendChild(timestamp);
        logEntry.appendChild(action);
        logEntry.appendChild(status);
        logEntry.appendChild(path);
        
        // Add to the top of the log entries
        logEntries.insertBefore(logEntry, logEntries.firstChild);
        
        // Ensure newest entries are visible at the top
        logEntries.scrollTop = 0;
    }
    
    // Format a Word document for display
    function formatWordDocument(content) {
        if (!content) return '';
        
        // Return the content with added header info
        return "=== WORD DOCUMENT PREVIEW ===\n\n" + content;
    }
    
    // Format a PowerPoint document for display
    function formatPowerPointDocument(content) {
        if (!content) return '';
        
        // PowerPoint content is already formatted in extract_text_from_pptx function
        return content;
    }
    
    // Function to reload target files from the server
    function reloadTargetFiles() {
        updateStatus('Reloading target files...', 'info');
        
        fetch('/api/reload_targets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                updateStatus(data.message, 'success');
                
                // Refresh the current directory to update highlighting
                if (currentDirectory) {
                    loadDirectory(currentDirectory);
                }
            } else {
                updateStatus('Failed to reload target files', 'error');
            }
        })
        .catch(error => {
            console.error('Error reloading target files:', error);
            updateStatus('Error reloading target files', 'error');
        });
    }
}); 