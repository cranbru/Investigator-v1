# Investigator v1 (WriteBlocker)

A Python-based digital investigation tool with a web interface that prevents write operations while allowing read operations on files and drives, providing a forensically sound way to examine digital evidence.

## Features
MJUXILTMPEXTI23UMJLFIVI= - Secure read-only access to files and directories
- Clean, user-friendly web interface that launches automatically in your browser
- Cross-platform support (Windows, Linux, and Mac)
- Automatic detection of drives and mounted volumes
- File explorer with intuitive navigation
- Content viewer with support for various file types:
  - Text files
  - Images, videos, and audio files
  - Microsoft Word documents (.docx)
  - Microsoft PowerPoint presentations (.pptx)
  - PDF documents
- Visual file type indicators with icons
- Target file highlighting based on customizable patterns
- Detailed metadata extraction for files
- Comprehensive activity logging
- Blocks all write and delete operations
- Download functionality for evidence collection

## Requirements

- Python 3.6 or later
- Flask web framework
- For Office document support:
  - python-docx (for Word documents)
  - python-pptx (for PowerPoint presentations)
- Optional: Pillow (PIL) for enhanced image metadata extraction

## Installation

1. Clone or download this repository
2. Uncomment the word and pptx lines in requirements.txt , if you want to read pptx and word files.
3. Install the required dependencies:

Use the provided requirements file:

```bash
pip install -r requirements.txt
```
Linux-specific Setup (recommended)(Use a virtual env):

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```


## Usage

Run the script:

```bash
python app.py
```

The web interface will automatically open in your default web browser at http://localhost:5000.

### Restricting to a Specific Directory

You can specify a directory to restrict access to when starting the application:

```bash
python app.py [directory_path]
```

### Target File Highlighting

Create a file named `target.txt` in the same directory as the script to define patterns for highlighting important files. Each line in this file represents a filename or pattern to highlight:

```
passwords.txt
*secret*
*.dat
confidential*
```

Patterns can include:
- Exact filenames
- Prefix matching with trailing asterisk (e.g., `log*`)
- Suffix matching with leading asterisk (e.g., `*.dat`)

## How it works

Investigator v1:
1. Presents a web interface for navigating files and directories
2. Scans and displays directory contents with file type indicators
3. Highlights files matching patterns in target.txt
4. Allows viewing file contents and metadata
5. Enables downloading files for further analysis
6. Automatically blocks and logs any write or delete operations
7. Extracts and displays text from Office documents when possible

## Use cases

- Digital forensics and incident response
- Secure evidence handling and examination
- Safe browsing of potentially compromised media
- Teaching digital forensics concepts
- Information security training
- Analyzing files without risk of modification
- IT troubleshooting where preserving file integrity is critical

## Security Notes

- This tool provides a software-based write-blocking mechanism
- For mission-critical forensic investigations, consider using this alongside hardware write-blockers
- All file access operations are logged for auditing purposes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 
