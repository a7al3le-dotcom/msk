// ===== مشغل البث المباشر – نسخة الجوال =====
(function() {
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

    async function init() {
        await loadDependencies();
        if (typeof firebase === 'undefined') {
            console.error('فشل تحميل Firebase');
            return;
        }

        const firebaseConfig = {
            apiKey: "AIzaSyB1AsEHXP05nQ8M66jYPusheLaE60q_JwU",
            authDomain: "mychat-2d881.firebaseapp.com",
            databaseURL: "https://mychat-2d881-default-rtdb.firebaseio.com"
        };
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        const db = firebase.database();

        // ===== إزالة العنصر السابق =====
        $('#livePlayerContainer').remove();

        // ===== واجهة جديدة: فقط "LIVE" وزر طي كبير =====
        $(`
        <div id="livePlayerContainer" style="
            width: 100%;
            max-width: 920px;
            margin: 8px auto;
            border-radius: 16px;
            overflow: hidden;
            background: transparent;
        ">
            <!-- رأس: LIVE + زر طي كبير -->
            <div id="playerHeader" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 18px;
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(2px);
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                cursor: pointer;
                border-radius: 16px 16px 0 0;
                transition: 0.3s;
                min-height: 60px;
            ">
                <!-- كلمة LIVE مع نقطة حية -->
                <div style="display: flex; align-items: center; gap: 14px;">
                    <span id="liveStatus" style="
                        font-size: 28px;
                        font-weight: 800;
                        color: #e74c3c;
                        letter-spacing: 2px;
                        text-shadow: 0 0 20px rgba(231, 76, 60, 0.3);
                    ">LIVE</span>
                    <span style="
                        display: inline-block;
                        width: 12px;
                        height: 12px;
                        background: #e74c3c;
                        border-radius: 50%;
                        box-shadow: 0 0 20px #e74c3c;
                        animation: pulseLive 1.4s infinite ease-in-out;
                    "></span>
                </div>

                <!-- زر الطي (كبير للجوال) -->
                <div id="toggleBtn" style="
                    font-size: 32px;
                    color: #2c3e50;
                    cursor: pointer;
                    transition: 0.3s;
                    line-height: 1;
                    padding: 8px 16px;
                    border-radius: 12px;
                    background: rgba(0,0,0,0.04);
                    min-width: 50px;
                    text-align: center;
                    font-weight: 300;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                ">▾</div>
            </div>

            <!-- جسم المشغل -->
            <div id="playerBody" style="
                display: block;
                padding: 4px 0 0 0;
                background: transparent;
            ">
                <div id="videoContainer" style="
                    width:100%;
                    aspect-ratio:16/9;
                    background: transparent;
                    border-radius: 0 0 16px 16px;
                    overflow: hidden;
                "></div>
            </div>
        </div>

        <style>
            @keyframes pulseLive {
                0% { opacity: 0.6; transform: scale(0.9); }
                50% { opacity: 1; transform: scale(1.3); }
                100% { opacity: 0.6; transform: scale(0.9); }
            }
            #toggleBtn:active {
                background: rgba(0,0,0,0.1);
                transform: scale(0.92);
            }
            #playerHeader:active {
                background: rgba(255, 255, 255, 0.08);
            }
            /* تحسينات video.js للجوال */
            .video-js {
                background: transparent !important;
            }
            .video-js .vjs-big-play-button { display: none !important; }
            .vjs-control-bar {
                background: linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%) !important;
                font-size: 14px !important;
            }
            .vjs-play-progress {
                background: linear-gradient(90deg, #e74c3c, #f39c12) !important;
            }
            /* تكبير أزرار التحكم للجوال */
            .vjs-button {
                font-size: 1.2em !important;
            }
            @media (max-width: 600px) {
                #liveStatus {
                    font-size: 24px !important;
                }
                #toggleBtn {
                    font-size: 28px !important;
                    padding: 6px 14px !important;
                    min-width: 44px !important;
                }
                #playerHeader {
                    padding: 10px 14px !important;
                    min-height: 54px !important;
                }
            }
        </style>
        `).insertBefore('#d2');

        // ===== المتغيرات والعناصر =====
        const videoContainer = document.getElementById('videoContainer');
        const toggleBtn = document.getElementById('toggleBtn');
        const playerBody = document.getElementById('playerBody');
        const liveStatus = document.getElementById('liveStatus');
        const header = document.getElementById('playerHeader');

        let playerInstance = null;
        let currentUrl = null;
        let isVisible = true;

        function disposePlayer() {
            if (playerInstance) {
                if (typeof playerInstance.dispose === 'function') playerInstance.dispose();
                else if (playerInstance.destroy) playerInstance.destroy();
                playerInstance = null;
            }
            videoContainer.innerHTML = '';
        }

        function createPlayer(source, type) {
            disposePlayer();
            videoContainer.innerHTML = '';

            if (!source) {
                videoContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#bdc3c7;font-size:16px;background:transparent;">⏸</div>`;
                liveStatus.textContent = 'LIVE';
                liveStatus.style.color = '#bdc3c7';
                liveStatus.style.textShadow = 'none';
                return;
            }

            liveStatus.textContent = 'LIVE';
            liveStatus.style.color = '#e74c3c';
            liveStatus.style.textShadow = '0 0 20px rgba(231, 76, 60, 0.3)';

            currentUrl = source;
            const isHLS = (type === 'application/x-mpegURL' || source.includes('.m3u8') || source.includes('.m3u'));

            if (isHLS && typeof Hls !== 'undefined' && Hls.isSupported()) {
                const vid = document.createElement('video');
                vid.controls = true;
                vid.autoplay = true;
                vid.muted = true;
                vid.playsInline = true;
                vid.style.width = '100%';
                vid.style.height = '100%';
                videoContainer.appendChild(vid);
                const hls = new Hls();
                hls.loadSource(source);
                hls.attachMedia(vid);
                playerInstance = { dispose: () => { hls.destroy(); vid.remove(); } };
                return;
            }

            const videoEl = document.createElement('video-js');
            videoEl.className = 'vjs-default-skin';
            videoEl.style.width = '100%';
            videoEl.style.height = '100%';
            videoContainer.appendChild(videoEl);

            const isYoutube = (type === 'video/youtube' || source.includes('youtube'));
            const options = {
                autoplay: true,
                muted: true,
                controls: true,
                aspectRatio: '16:9',
                playsinline: true,
                techOrder: isYoutube ? ['youtube'] : ['html5'],
                sources: [{ src: source, type: type || 'video/mp4' }]
            };

            try {
                const player = videojs(videoEl, options);
                playerInstance = player;
                player.on('error', () => {
                    videoContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#e74c3c;font-size:16px;background:transparent;">⚠️</div>`;
                });
            } catch(e) {
                videoContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#e74c3c;font-size:16px;background:transparent;">⚠️</div>`;
            }
        }

        function updateFromFirebase(data) {
            if (!data) {
                disposePlayer();
                videoContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#bdc3c7;font-size:16px;background:transparent;">⏸</div>`;
                liveStatus.textContent = 'LIVE';
                liveStatus.style.color = '#bdc3c7';
                liveStatus.style.textShadow = 'none';
                return;
            }

            let url = null, type = null;
            if (data.type === 'youtube' && data.id) {
                url = `https://www.youtube.com/watch?v=${data.id}`;
                type = 'video/youtube';
            } else if (data.type === 'm3u' && data.url) {
                url = data.url;
                type = 'application/x-mpegURL';
            } else if (data.type === 'direct' && data.url) {
                url = data.url;
                type = 'video/mp4';
            }

            if (url) createPlayer(url, type);
            else videoContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#f39c12;font-size:16px;background:transparent;">⚠️</div>`;
        }

        const ref = db.ref('pinned_video');
        ref.on('value', snap => updateFromFirebase(snap.val()));
        ref.once('value', snap => {
            const data = snap.val();
            if (data) updateFromFirebase(data);
        });

        function togglePlayer() {
            if (isVisible) {
                playerBody.style.display = 'none';
                toggleBtn.textContent = '▸';
                isVisible = false;
            } else {
                playerBody.style.display = 'block';
                toggleBtn.textContent = '▾';
                isVisible = true;
            }
        }

        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            togglePlayer();
        });

        header.addEventListener('click', function(e) {
            if (e.target === toggleBtn || toggleBtn.contains(e.target)) return;
            togglePlayer();
        });

        console.log('✅ مشغل البث الشفاف مع زر طي للجوال جاهز');
    }

    init().catch(err => console.error('خطأ:', err));
})();
