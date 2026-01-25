function init(resize) {

    const btnFullscreen = document.getElementById("btn-fullscreen");
    const btnFullwindow = document.getElementById("btn-fullwindow");
    const btnCloseprogram = document.getElementById("btn-closeprogram");
    const program = document.getElementById("program");
    const topbar = document.getElementById("topbar");

    btnFullscreen.addEventListener("click", () => {
        if (!document.fullscreenElement) {
            program.requestFullscreen();
            resize();
        } else {
            document.exitFullscreen();
            resize();
        }
    });

    let isFullwindow = false;

    btnFullwindow.addEventListener("click", () => {
        if (isFullwindow == false) {
            program.style.position = "fixed";
            program.style.width = "100vw";
            program.style.height = "100vh";
            program.style.left = "0";
            program.style.top = "0";
            program.style.margin = "0";
            program.style.border = "none";
            isFullwindow = true;
            resize();
        }
        else {
            program.style.position = "absolute";
            program.style.width = "70vw";
            program.style.height = "80vh";
            program.style.left = "auto";
            program.style.top = "auto";
            program.style.margin = "10vw";
            program.style.marginTop = "5vh";
            program.style.border = "10px solid gray";
            isFullwindow = false;
            resize();
        }
    });

    btnCloseprogram.addEventListener("click", () => {
        program.style.display = "none";
    });

    // Resize funkcjonalność
    let isResizing = false;
    let resizeDirection = null;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    let startLeft = 0;
    let startTop = 0;

    const RESIZE_HANDLE_SIZE = 10;

    function setupResizeHandles() {
        // Usuń stare handlery jeśli istnieją
        const oldHandles = program.querySelectorAll('.resize-handle');
        oldHandles.forEach(handle => handle.remove());

        // Prawy edge
        const rightHandle = document.createElement('div');
        rightHandle.classList.add('resize-handle');
        rightHandle.setAttribute('data-direction', 'right');
        rightHandle.style.position = 'absolute';
        rightHandle.style.right = '0';
        rightHandle.style.top = '0';
        rightHandle.style.width = RESIZE_HANDLE_SIZE + 'px';
        rightHandle.style.height = '100%';
        rightHandle.style.cursor = 'ew-resize';
        program.appendChild(rightHandle);

        // Dolny edge
        const bottomHandle = document.createElement('div');
        bottomHandle.classList.add('resize-handle');
        bottomHandle.setAttribute('data-direction', 'bottom');
        bottomHandle.style.position = 'absolute';
        bottomHandle.style.bottom = '0';
        bottomHandle.style.left = '0';
        bottomHandle.style.width = '100%';
        bottomHandle.style.height = RESIZE_HANDLE_SIZE + 'px';
        bottomHandle.style.cursor = 'ns-resize';
        program.appendChild(bottomHandle);

        // Prawy-dolny róg
        const cornerHandle = document.createElement('div');
        cornerHandle.classList.add('resize-handle');
        cornerHandle.setAttribute('data-direction', 'corner');
        cornerHandle.style.position = 'absolute';
        cornerHandle.style.bottom = '0';
        cornerHandle.style.right = '0';
        cornerHandle.style.width = RESIZE_HANDLE_SIZE + 'px';
        cornerHandle.style.height = RESIZE_HANDLE_SIZE + 'px';
        cornerHandle.style.cursor = 'nwse-resize';
        program.appendChild(cornerHandle);

        // Lewy edge
        const leftHandle = document.createElement('div');
        leftHandle.classList.add('resize-handle');
        leftHandle.setAttribute('data-direction', 'left');
        leftHandle.style.position = 'absolute';
        leftHandle.style.left = '0';
        leftHandle.style.top = '0';
        leftHandle.style.width = RESIZE_HANDLE_SIZE + 'px';
        leftHandle.style.height = '100%';
        leftHandle.style.cursor = 'ew-resize';
        program.appendChild(leftHandle);


        // Dolny-lewy róg
        const bottomLeftHandle = document.createElement('div');
        bottomLeftHandle.classList.add('resize-handle');
        bottomLeftHandle.setAttribute('data-direction', 'bottom-left');
        bottomLeftHandle.style.position = 'absolute';
        bottomLeftHandle.style.bottom = '0';
        bottomLeftHandle.style.left = '0';
        bottomLeftHandle.style.width = RESIZE_HANDLE_SIZE + 'px';
        bottomLeftHandle.style.height = RESIZE_HANDLE_SIZE + 'px';
        bottomLeftHandle.style.cursor = 'nesw-resize';
        program.appendChild(bottomLeftHandle);
    }

    setupResizeHandles();

    document.addEventListener('mousedown', (e) => {
        const handle = e.target.closest('.resize-handle');
        if (handle) {
            isResizing = true;
            resizeDirection = handle.getAttribute('data-direction');
            startX = e.clientX;
            startY = e.clientY;
            startWidth = program.offsetWidth;
            startHeight = program.offsetHeight;
            startLeft = program.offsetLeft;
            startTop = program.offsetTop;
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        const minWidth = 300;
        const minHeight = 200;

        if (resizeDirection === 'right') {
            const newWidth = Math.max(minWidth, startWidth + deltaX);
            program.style.width = newWidth + 'px';
        }
        else if (resizeDirection === 'bottom') {
            const newHeight = Math.max(minHeight, startHeight + deltaY);
            program.style.height = newHeight + 'px';
        }
        else if (resizeDirection === 'corner') {
            const newWidth = Math.max(minWidth, startWidth + deltaX);
            const newHeight = Math.max(minHeight, startHeight + deltaY);
            program.style.width = newWidth + 'px';
            program.style.height = newHeight + 'px';
        }
        else if (resizeDirection === 'left') {
            const newWidth = Math.max(minWidth, startWidth - deltaX);
            const newLeft = startLeft + (startWidth - newWidth);
            program.style.width = newWidth + 'px';
            program.style.left = newLeft + 'px';
        }
        else if (resizeDirection === 'top') {
            const newHeight = Math.max(minHeight, startHeight - deltaY);
            const newTop = startTop + (startHeight - newHeight);
            program.style.height = newHeight + 'px';
            program.style.top = newTop + 'px';
        }
        else if (resizeDirection === 'top-right') {
            const newWidth = Math.max(minWidth, startWidth + deltaX);
            const newHeight = Math.max(minHeight, startHeight - deltaY);
            const newTop = startTop + (startHeight - newHeight);
            program.style.width = newWidth + 'px';
            program.style.height = newHeight + 'px';
            program.style.top = newTop + 'px';
        }
        else if (resizeDirection === 'top-left') {
            const newWidth = Math.max(minWidth, startWidth - deltaX);
            const newHeight = Math.max(minHeight, startHeight - deltaY);
            const newLeft = startLeft + (startWidth - newWidth);
            const newTop = startTop + (startHeight - newHeight);
            program.style.width = newWidth + 'px';
            program.style.height = newHeight + 'px';
            program.style.left = newLeft + 'px';
            program.style.top = newTop + 'px';
        }
        else if (resizeDirection === 'bottom-left') {
            const newWidth = Math.max(minWidth, startWidth - deltaX);
            const newHeight = Math.max(minHeight, startHeight + deltaY);
            const newLeft = startLeft + (startWidth - newWidth);
            program.style.width = newWidth + 'px';
            program.style.height = newHeight + 'px';
            program.style.left = newLeft + 'px';
        }

        program.style.margin = '0';

        resize();
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        resizeDirection = null;
    });

    // Przesuwanie okna
    let isDragging = false;
    startX = 0;
    startY = 0;
    let startProgramX = 0;
    let startProgramY = 0;

    topbar.addEventListener("mousedown", (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        // Obecna pozycja
        const rect = program.getBoundingClientRect();
        startProgramX = rect.left;
        startProgramY = rect.top;

        topbar.style.cursor = 'grabbing';
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        const newX = startProgramX + deltaX;
        const newY = startProgramY + deltaY;

        program.style.left = newX + 'px';
        program.style.top = newY + 'px';
        program.style.margin = '0';
        resize()
    });

    //Funkcjonalności po najechaniu myszką na topbar

    document.addEventListener("mouseup", () => {
        isDragging = false;
        topbar.style.cursor = 'grab';
    });

    topbar.addEventListener("mouseenter", () => {
        if (!isDragging) {
            topbar.style.cursor = 'grab';
        }
    });

    topbar.addEventListener("mouseleave", () => {
        if (!isDragging) {
            topbar.style.cursor = 'default';
        }
    });

    document.getElementById("openApp").addEventListener("click", () => {
        program.style.display = 'block';
    });
}

export { init }