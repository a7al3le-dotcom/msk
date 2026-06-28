var oldRjoin = rjoin;

(function() {
    var ROOM_ID = "z1x6g25zss";
    var playerActive = false;
    var firebaseRef = null;
    var playerInstance = null;
    var elements = null;
    var retryTimer = null;
    var retryCount = 0;
    const MAX_RETRY = 3;
    const RETRY_DELAY = 5000;
    var currentSource = null;
    var currentType = null;

    var isDragging = false;
    var isPinching = false;
    var startX, startY, origX, origY;
    var currentScale = 1;
    var initialPinchDist = 0;
    var initialScale = 1;
    var pinchCenterX = 0, pinchCenterY = 0;
    var startLeft = 0, startTop = 0;

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async function loadDependencies() {
        const libs = [
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js',
            'https://vjs.zencdn.net/8.10.0/video.min.js',
            'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js'
        ];
        if (!document.querySelector('link[href="https://vjs.zencdn.net/8.10.0/video-js.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://vjs.zencdn.net/8.10.0/video-js.css';
            document.head.appendChild(link);
        }
        for (let src of libs) await loadScript(src);
    }

    function buildFloatingPlayer() {
        const old = document.getElementById('floatingPlayer');
        if (old) old.remove();

        const container = document.createElement('div');
        container.id = 'floatingPlayer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 320px;
            min-width: 200px;
            max-width: 90vw;
            z-index: 9999;
            background: rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 40px rgba(88,130,255,0.2);
            border: 1px solid rgba(255,255,255,0.1);
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
            transform-origin: center center;
            transition: box-shadow 0.3s;
        `;
        container.innerHTML = `
            <div id="playerHeader" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 12px;
                background: rgba(0,0,0,0.5);
                border-radius: 16px 16px 0 0;
                cursor: grab;
                touch-action: none;
            ">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span id="liveStatus" style="
                        display:inline-block;
                        width:12px; height:12px;
                        background:#ff3366;
                        border-radius:50%;
                        box-shadow:0 0 15px #ff3366;
                        animation:pulseLive 1.2s infinite;
                    "></span>
                    <span style="font-size:14px; font-weight:600; color:#fff; letter-spacing:1px;">LIVE</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <div class="control-btn" id="reloadBtn" style="
                        font-size:20px; line-height:1;
                        color:rgba(255,255,255,0.8);
                        cursor:pointer;
                        padding:2px 8px;
                        border-radius:8px;
                        background:rgba(255,255,255,0.05);
                        transition: all 0.2s;
                    ">↻</div>
                    <div class="control-btn" id="minimizeBtn" style="
                        font-size:20px; line-height:1;
                        color:rgba(255,255,255,0.8);
                        cursor:pointer;
                        padding:2px 8px;
                        border-radius:8px;
                        background:rgba(255,255,255,0.05);
                        transition: all 0.2s;
                    ">─</div>
                    <div class="control-btn" id="closeBtn" style="
                        font-size:18px; line-height:1;
                        color:rgba(255,255,255,0.8);
                        cursor:pointer;
                        padding:2px 8px;
                        border-radius:8px;
                        background:rgba(255,255,255,0.05);
                        transition: all 0.2s;
                    ">✕</div>
                </div>
            </div>
            <div id="playerBody" style="
                padding:4px 4px 4px 4px;
                background:transparent;
                border-radius: 0 0 16px 16px;
                overflow:hidden;
            ">
                <div id="videoContainer" style="
                    width:100%;
                    aspect-ratio:16/9;
                    background:radial-gradient(circle at center,#11152a 0%,#080b1a 100%);
                    border-radius:12px;
                    overflow:hidden;
                    position:relative;
                "></div>
            </div>
            <style>
                @keyframes pulseLive {
                    0%{transform:scale(0.9);opacity:0.7;}
                    50%{transform:scale(1.2);opacity:1;}
                    100%{transform:scale(0.9);opacity:0.7;}
                }
                .control-btn:hover {
                    background: rgba(255,255,255,0.15) !important;
                    color: #fff !important;
                    transform: scale(1.1);
                }
                .control-btn:active {
                    transform: scale(0.9);
                }
                .vjs-play-progress {
                    background: linear-gradient(90deg,#a8d8ea,#f8b4b4,#c084fc) !important;
                    box-shadow: 0 0 15px rgba(192,132,252,0.3);
                }
                .vjs-progress-holder {
                    background: rgba(255,255,255,0.15) !important;
                }
                .vjs-control-bar {
                    background: linear-gradient(0deg,rgba(0,0,0,0.6) 0%,transparent 100%) !important;
                    backdrop-filter: blur(4px);
                }
                #videoContainer:empty::after {
                    content:"⏳ جاري التحميل...";
                    position:absolute; top:50%; left:50%;
                    transform:translate(-50%,-50%);
                    color:rgba(255,255,255,0.4);
                    font-size:14px;
                    font-weight:300;
                    letter-spacing:1px;
                    background:linear-gradient(135deg,#a8d8ea,#c084fc);
                    -webkit-background-clip:text;
                    -webkit-text-fill-color:transparent;
                }
                .vjs-control-bar {
                    font-size: 12px;
                }
                .vjs-button {
                    padding: 4px !important;
                }
            </style>
        `;

        document.body.appendChild(container);

        const header = container.querySelector('#playerHeader');
        const body = container.querySelector('#playerBody');

        // منع التداخل مع الأزرار
        function isControlBtn(target) {
            return target.closest('.control-btn') !== null;
        }

        // أحداث السحب بالماوس (نمنع إذا كان الهدف زراً)
        header.addEventListener('mousedown', function(e) {
            if (isControlBtn(e.target)) return;
            startDrag(e);
        });
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);

        // أحداث اللمس (نمنع إذا كان الهدف زراً)
        container.addEventListener('touchstart', function(e) {
            if (isControlBtn(e.target)) return;
            handleTouchStart(e);
        }, { passive: false });
        container.addEventListener('touchmove', function(e) {
            if (isControlBtn(e.target)) return;
            handleTouchMove(e);
        }, { passive: false });
        container.addEventListener('touchend', function(e) {
            if (isControlBtn(e.target)) return;
            handleTouchEnd(e);
        }, { passive: false });

        // تكبير بعجلة الماوس
        container.addEventListener('wheel', function(e) {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const rect = container.getBoundingClientRect();
                const centerX = rect.left + rect.width/2;
                const centerY = rect.top + rect.height/2;
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                let newScale = Math.min(2, Math.max(0.5, currentScale + delta));
                const scaleFactor = newScale / currentScale;
                const newLeft = centerX - (rect.width * newScale) / 2;
                const newTop = centerY - (rect.height * newScale) / 2;
                container.style.left = newLeft + 'px';
                container.style.top = newTop + 'px';
                container.style.right = 'auto';
                container.style.transform = `scale(${newScale})`;
                currentScale = newScale;
            }
        }, { passive: false });

        // أزرار التحكم
        const reloadBtn = container.querySelector('#reloadBtn');
        const minimizeBtn = container.querySelector('#minimizeBtn');
        const closeBtn = container.querySelector('#closeBtn');
        let minimized = false;

        reloadBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.style.transform = 'rotate(360deg)';
            this.style.transition = 'transform 0.6s ease';
            setTimeout(() => { this.style.transform = ''; }, 600);
            reloadCurrent();
        });
        // منع اللمس على الزر من تفعيل السحب
        reloadBtn.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive: true });
        reloadBtn.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });

        minimizeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!minimized) {
                body.style.display = 'none';
                minimizeBtn.textContent = '▢';
                minimized = true;
            } else {
                body.style.display = 'block';
                minimizeBtn.textContent = '─';
                minimized = false;
            }
        });
        minimizeBtn.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive: true });

        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            stopAdvancedPlayer();
        });
        closeBtn.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive: true });

        return {
            container: container,
            videoContainer: container.querySelector('#videoContainer'),
            reloadBtn: reloadBtn,
            minimizeBtn: minimizeBtn,
            closeBtn: closeBtn,
            header: header,
            body: body,
            liveStatus: container.querySelector('#liveStatus')
        };
    }

    function startDrag(e) {
        if (e.button !== 0) return;
        isDragging = true;
        const rect = elements.container.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        origX = rect.left;
        origY = rect.top;
        elements.container.style.cursor = 'grabbing';
        e.preventDefault();
    }

    function onDrag(e) {
        if (!isDragging) return;
        let newX = e.clientX - startX;
        let newY = e.clientY - startY;
        elements.container.style.left = newX + 'px';
        elements.container.style.top = newY + 'px';
        elements.container.style.right = 'auto';
        elements.container.style.transform = `scale(${currentScale})`;
    }

    function stopDrag() {
        isDragging = false;
        if (elements) elements.container.style.cursor = 'grab';
    }

    function handleTouchStart(e) {
        const touches = e.touches;
        if (touches.length === 1) {
            isDragging = true;
            isPinching = false;
            const touch = touches[0];
            const rect = elements.container.getBoundingClientRect();
            startX = touch.clientX - rect.left;
            startY = touch.clientY - rect.top;
            origX = rect.left;
            origY = rect.top;
        } else if (touches.length === 2) {
            isDragging = false;
            isPinching = true;
            const t1 = touches[0];
            const t2 = touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            initialPinchDist = dist;
            initialScale = currentScale;
            const rect = elements.container.getBoundingClientRect();
            pinchCenterX = (t1.clientX + t2.clientX) / 2;
            pinchCenterY = (t1.clientY + t2.clientY) / 2;
            startLeft = parseFloat(elements.container.style.left) || rect.left;
            startTop = parseFloat(elements.container.style.top) || rect.top;
        }
        e.preventDefault();
    }

    function handleTouchMove(e) {
        const touches = e.touches;
        if (touches.length === 1 && isDragging) {
            const touch = touches[0];
            let newX = touch.clientX - startX;
            let newY = touch.clientY - startY;
            elements.container.style.left = newX + 'px';
            elements.container.style.top = newY + 'px';
            elements.container.style.right = 'auto';
            elements.container.style.transform = `scale(${currentScale})`;
            e.preventDefault();
        } else if (touches.length === 2 && isPinching) {
            const t1 = touches[0];
            const t2 = touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            if (initialPinchDist > 0) {
                const scaleFactor = dist / initialPinchDist;
                let newScale = Math.min(2, Math.max(0.5, initialScale * scaleFactor));
                const rect = elements.container.getBoundingClientRect();
                const currentWidth = rect.width;
                const currentHeight = rect.height;
                const newWidth = currentWidth * (newScale / currentScale);
                const newHeight = currentHeight * (newScale / currentScale);
                const dx = pinchCenterX - rect.left;
                const dy = pinchCenterY - rect.top;
                const newLeft = pinchCenterX - dx * (newScale / currentScale);
                const newTop = pinchCenterY - dy * (newScale / currentScale);
                elements.container.style.left = newLeft + 'px';
                elements.container.style.top = newTop + 'px';
                elements.container.style.right = 'auto';
                elements.container.style.transform = `scale(${newScale})`;
                currentScale = newScale;
                e.preventDefault();
            }
        }
    }

    function handleTouchEnd(e) {
        if (e.touches.length === 0) {
            isDragging = false;
            isPinching = false;
            initialPinchDist = 0;
        }
        if (e.touches.length === 1) {
            isPinching = false;
        }
    }

    function showMessage(text, color = 'rgba(255,255,255,0.5)') {
        disposePlayer();
        if (elements && elements.videoContainer) {
            elements.videoContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:${color};font-size:14px;background:transparent;text-shadow:0 0 10px rgba(0,0,0,0.5);">${text}</div>`;
        }
    }

    function setLiveStatus(active = true) {
        if (elements && elements.liveStatus) {
            if (active) {
                elements.liveStatus.style.background = '#ff3366';
                elements.liveStatus.style.boxShadow = '0 0 20px #ff3366, 0 0 40px rgba(255,51,102,0.3)';
            } else {
                elements.liveStatus.style.background = '#555';
                elements.liveStatus.style.boxShadow = 'none';
            }
        }
    }

    function disposePlayer() {
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
        retryCount = 0;
        if (playerInstance) {
            if (typeof playerInstance.dispose === 'function') playerInstance.dispose();
            else if (playerInstance.destroy) playerInstance.destroy();
            else if (playerInstance.remove) playerInstance.remove();
            playerInstance = null;
        }
        if (elements && elements.videoContainer) {
            elements.videoContainer.innerHTML = '';
        }
        currentSource = null;
        currentType = null;
    }

    function createHlsPlayer(source) {
        if (typeof Hls === 'undefined' || !Hls.isSupported()) {
            showMessage('⚠️ المتصفح لا يدعم HLS', '#f9a825');
            return false;
        }
        disposePlayer();
        const vid = document.createElement('video');
        vid.controls = true;
        vid.autoplay = true;
        vid.muted = true;
        vid.playsInline = true;
        vid.style.width = '100%';
        vid.style.height = '100%';
        elements.videoContainer.appendChild(vid);

        const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hls.loadSource(source);
        hls.attachMedia(vid);

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                if (retryCount < MAX_RETRY) {
                    retryCount++;
                    showMessage(`🔄 إعادة محاولة (${retryCount}/${MAX_RETRY})`, '#f9a825');
                    retryTimer = setTimeout(() => { hls.loadSource(source); }, RETRY_DELAY);
                } else {
                    showMessage('⚠️ تعذر تشغيل البث', '#ff1744');
                    setLiveStatus(false);
                }
            }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            vid.play().catch(() => {});
            setLiveStatus(true);
            retryCount = 0;
        });

        playerInstance = { dispose: () => { hls.destroy(); vid.remove(); } };
        currentSource = source;
        currentType = 'hls';
        return true;
    }

    function createYouTubePlayer(videoId) {
        disposePlayer();
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&rel=0`;
        iframe.allow = 'autoplay; encrypted-media; fullscreen';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.frameBorder = '0';
        elements.videoContainer.appendChild(iframe);
        setLiveStatus(true);

        let loadFailed = false;
        iframe.onerror = () => {
            loadFailed = true;
            if (retryCount < MAX_RETRY) {
                retryCount++;
                showMessage(`🔄 إعادة تحميل يوتيوب (${retryCount}/${MAX_RETRY})`, '#f9a825');
                retryTimer = setTimeout(() => { iframe.src = iframe.src; }, RETRY_DELAY);
            } else {
                showMessage('⚠️ فشل تحميل يوتيوب', '#ff1744');
                setLiveStatus(false);
            }
        };
        iframe.onload = () => {
            if (!loadFailed) { setLiveStatus(true); retryCount = 0; }
        };

        playerInstance = { dispose: () => { iframe.remove(); } };
        currentSource = videoId;
        currentType = 'youtube';
        return true;
    }

    function createDirectPlayer(source, mimeType = 'video/mp4') {
        disposePlayer();
        if (typeof videojs === 'undefined') {
            showMessage('⚠️ مشغل الفيديو غير متوفر', '#f9a825');
            return false;
        }

        const videoEl = document.createElement('video-js');
        videoEl.className = 'vjs-default-skin';
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        elements.videoContainer.appendChild(videoEl);

        const options = {
            autoplay: true,
            muted: true,
            controls: true,
            aspectRatio: '16:9',
            playsinline: true,
            techOrder: ['html5'],
            sources: [{ src: source, type: mimeType || 'video/mp4' }]
        };

        try {
            const player = videojs(videoEl, options);
            playerInstance = player;
            setLiveStatus(true);
            retryCount = 0;

            player.on('error', () => {
                if (retryCount < MAX_RETRY) {
                    retryCount++;
                    showMessage(`🔄 إعادة محاولة (${retryCount}/${MAX_RETRY})`, '#f9a825');
                    retryTimer = setTimeout(() => {
                        player.src({ src: source, type: mimeType });
                        player.play().catch(() => {});
                    }, RETRY_DELAY);
                } else {
                    showMessage('⚠️ فشل تشغيل الفيديو', '#ff1744');
                    setLiveStatus(false);
                }
            });

            return true;
        } catch (e) {
            showMessage('⚠️ خطأ في المشغل', '#ff1744');
            return false;
        }
    }

    function createPlayer(data) {
        disposePlayer();
        if (!data) {
            showMessage('⏸', 'rgba(255,255,255,0.3)');
            setLiveStatus(false);
            return;
        }

        let url = null, type = null;
        if (data.type === 'youtube' && data.id) {
            url = data.id;
            type = 'youtube';
        } else if (data.type === 'm3u' && data.url) {
            url = data.url;
            type = 'hls';
        } else if (data.type === 'direct' && data.url) {
            url = data.url;
            type = 'direct';
        } else {
            if (data.url) {
                if (data.url.includes('youtube.com/watch') || data.url.includes('youtu.be/')) {
                    const match = data.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
                    if (match) { url = match[1]; type = 'youtube'; }
                    else { showMessage('⚠️ رابط يوتيوب غير صالح', '#f9a825'); setLiveStatus(false); return; }
                } else if (data.url.includes('.m3u8') || data.url.includes('.m3u')) {
                    url = data.url; type = 'hls';
                } else {
                    url = data.url; type = 'direct';
                }
            } else {
                showMessage('⏸', 'rgba(255,255,255,0.3)');
                setLiveStatus(false);
                return;
            }
        }

        currentSource = url;
        currentType = type;

        let success = false;
        if (type === 'youtube') success = createYouTubePlayer(url);
        else if (type === 'hls') success = createHlsPlayer(url);
        else if (type === 'direct') success = createDirectPlayer(url, data.type === 'direct' ? data.mimeType : 'video/mp4');
        else { showMessage('⚠️ نوع غير مدعوم', '#f9a825'); setLiveStatus(false); return; }

        if (!success) { showMessage('⚠️ فشل التشغيل', '#ff1744'); setLiveStatus(false); }
        else setLiveStatus(true);
    }

    function reloadCurrent() {
        if (!currentSource) {
            if (firebaseRef) {
                firebaseRef.once('value', snap => { const data = snap.val(); if (data) createPlayer(data); });
            }
            return;
        }
        const data = { type: currentType, url: currentSource, id: currentSource };
        retryCount = 0;
        createPlayer(data);
    }

    window.startAdvancedPlayer = async function() {
        if (playerActive) return;

        try { await loadDependencies(); }
        catch (err) { console.error('فشل تحميل المكتبات:', err); return; }

        if (typeof firebase === 'undefined') { console.error('Firebase غير محمّل'); return; }

        const firebaseConfig = {
            apiKey: "AIzaSyB1AsEHXP05nQ8M66jYPusheLaE60q_JwU",
            authDomain: "mychat-2d881.firebaseapp.com",
            databaseURL: "https://mychat-2d881-default-rtdb.firebaseio.com"
        };
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        const db = firebase.database();

        stopAdvancedPlayer();

        elements = buildFloatingPlayer();

        firebaseRef = db.ref('pinned_video');
        firebaseRef.on('value', snap => {
            const data = snap.val();
            if (data) createPlayer(data);
            else { showMessage('⏸', 'rgba(255,255,255,0.3)'); setLiveStatus(false); }
        });

        firebaseRef.once('value', snap => {
            const data = snap.val();
            if (data) createPlayer(data);
            else { showMessage('⏸', 'rgba(255,255,255,0.3)'); setLiveStatus(false); }
        });

        window.addEventListener('beforeunload', () => { disposePlayer(); });

        playerActive = true;
        console.log('✅ مشغل عائم ذكي جاهز للروم:', ROOM_ID);
    };

    window.stopAdvancedPlayer = function() {
        if (firebaseRef) { firebaseRef.off(); firebaseRef = null; }
        disposePlayer();
        const container = document.getElementById('floatingPlayer');
        if (container) container.remove();
        elements = null;
        playerActive = false;
        console.log('🛑 تم إيقاف المشغل العائم');
    };

})();

rjoin = function(id) {
    oldRjoin(id);
    if (id == "z1x6g25zss") {
        if (typeof startAdvancedPlayer === 'function') {
            startAdvancedPlayer();
        }
    } else {
        if (typeof stopAdvancedPlayer === 'function') {
            stopAdvancedPlayer();
        }
    }
};
