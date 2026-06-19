// ===== الكود الجديد (يحل محل الكود القديم بالكامل) =====
(function() {
    // 1. تحميل المكتبات المطلوبة إذا لم تكن موجودة
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
        // قائمة المكتبات المطلوبة
        const libs = [
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js',
            'https://vjs.zencdn.net/8.10.0/video.min.js',
            'https://cdn.jsdelivr.net/npm/videojs-youtube@3.0.1/dist/Youtube.min.js',
            'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js'
        ];
        // تحميل الـ CSS أيضاً
        if (!document.querySelector('link[href="https://vjs.zencdn.net/8.10.0/video-js.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://vjs.zencdn.net/8.10.0/video-js.css';
            document.head.appendChild(link);
        }
        for (let src of libs) {
            await loadScript(src);
        }
    }

    // 2. تنفيذ الكود الأساسي بعد تحميل المكتبات
    async function init() {
        await loadDependencies();

        // التأكد من أن Firebase جاهز
        if (typeof firebase === 'undefined') {
            console.error('فشل تحميل Firebase');
            return;
        }

        // إعداد Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyB1AsEHXP05nQ8M66jYPusheLaE60q_JwU",
            authDomain: "mychat-2d881.firebaseapp.com",
            databaseURL: "https://mychat-2d881-default-rtdb.firebaseio.com"
        };
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        const db = firebase.database();

        // ===== إدراج عناصر HTML =====
        // حذف أي نسخة سابقة من عناصر المشغل إن وجدت
        $('#pinnedVideoPlayer, #setVideoModal, #overlay').remove();

        // إضافة الكود الجديد (أيقونة التلفزيون بدلاً من الاشتراكات)
        $(`<center>
            <div style="position: static;width: 100%;" onclick="setTimeout(function(){fixSize();},800);">
                <div width="99.5%" id="design-a" style="background-color: #ffe0b6;color: #105873;border-bottom: 3px solid #105873;border-top: 3px solid #6b5f5f;padding-bottom: 2px;border-radius: 0px 0px 15px 15px;">
                    <span id="tvIcon" style="font-size:50px; cursor:pointer; display:inline-block; padding:10px;">📺</span>
                </div>
            </div>
        </center>`).insertBefore('#d2');

        // إضافة عناصر المشغل
        $('body').append(`
            <div id="pinnedVideoPlayer" style="display:none; position:fixed; top:60px; left:10px; width:360px; max-width:94vw; background:#000; border-radius:16px; box-shadow:0 26px 80px rgba(0,0,0,0.9); z-index:998; flex-direction:column; overflow:hidden;"></div>
            <div id="setVideoModal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:radial-gradient(circle at top, #181a28 0%, #05060b 55%); padding:20px; border-radius:18px; z-index:1003; min-width:300px; border:1px solid rgba(255,255,255,0.06);">
                <h4 style="color:white; margin-top:0;">تثبيت فيديو</h4>
                <input type="text" id="videoUrlInput" placeholder="رابط يوتيوب، تويتر، m3u8، mp4..." style="width:100%; padding:10px; border-radius:10px; background:rgba(5,6,12,0.95); color:white; font-size:16px; margin-bottom:10px; box-sizing:border-box; border:1px solid rgba(255,255,255,0.1);">
                <button id="submitVideoUrlBtn" style="padding:8px 18px; border-radius:999px; background:linear-gradient(135deg, #ffd54a, #ffe178); font-weight:600; border:none; cursor:pointer; color:#000;">تثبيت</button>
            </div>
            <div id="overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1001; backdrop-filter:blur(4px);"></div>
        `);

        // ===== سكربت المشغل =====
        let videoPlayerInstance = null;
        let currentVideoIndex = 0;
        let currentVideosList = [];
        let serverTimeOffset = 0;

        const pinnedVideoPlayer = document.getElementById('pinnedVideoPlayer');
        const setVideoModal = document.getElementById('setVideoModal');
        const overlay = document.getElementById('overlay');
        const videoUrlInput = document.getElementById('videoUrlInput');
        const submitVideoUrlBtn = document.getElementById('submitVideoUrlBtn');
        const tvIcon = document.getElementById('tvIcon');

        // دوال مساعدة
        function escapeHtml(str) { if(!str) return ""; return str.replace(/[&<>]/g, function(m){ if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }
        function getYoutubeVideoId(url) {
            if(!url) return null;
            const regex = /(?:youtube\.com\/shorts\/|youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
            const match = url.match(regex);
            return match ? match[1] : null;
        }
        function getTweetId(url) {
            if(!url) return null;
            const match = url.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/);
            return match ? match[1] : null;
        }
        function isDirectVideo(url) { 
            return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url) || (url.includes('video') && !url.includes('youtube') && !url.includes('twitter'));
        }

        // دوال إنشاء المشغل
        function createVideoPlayer(container, source, type, isYoutube) {
            container.innerHTML = '';
            const isHLS = (type === 'application/x-mpegURL' || source.includes('.m3u8') || source.includes('.m3u'));
            const videoTest = document.createElement('video');
            const supportsNativeHLS = !!(videoTest.canPlayType('application/vnd.apple.mpegurl') || videoTest.canPlayType('application/x-mpegURL'));
            if(isHLS && !supportsNativeHLS && typeof Hls !== 'undefined' && Hls.isSupported()) {
                const vid = document.createElement('video');
                vid.controls = true; vid.autoplay = true; vid.muted = true; vid.playsInline = true;
                vid.style.width = '100%'; vid.style.height = '100%';
                container.appendChild(vid);
                const hls = new Hls();
                hls.loadSource(source);
                hls.attachMedia(vid);
                videoPlayerInstance = { dispose: () => { hls.destroy(); vid.remove(); } };
                return;
            }
            const videoEl = document.createElement('video-js');
            videoEl.className = 'vjs-netflix-theme';
            container.appendChild(videoEl);
            const playerOptions = {
                autoplay: true, muted: true, controls: true, aspectRatio: '16:9', playsinline: true,
                techOrder: isYoutube ? ['youtube'] : ['html5'],
                sources: [{ type, src: source }]
            };
            try {
                const player = videojs(videoEl, playerOptions);
                videoPlayerInstance = player;
                player.on('error', () => { container.innerHTML = '<p style="padding:12px;color:#ff6b6b;">⚠️ فشل تشغيل الفيديو</p>'; });
            } catch(e) { container.innerHTML = '<p style="color:#ff6b6b;">خطأ في المشغل</p>'; }
        }

        function embedTwitterNative(container, tweetId) {
            container.innerHTML = '';
            container.style.background = '#15202b';
            const iframe = document.createElement('iframe');
            iframe.src = `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=dark&lang=ar`;
            iframe.style.width = '100%'; iframe.style.height = '100%'; iframe.style.minHeight = '320px';
            iframe.style.border = 'none'; iframe.setAttribute('allowfullscreen', 'true');
            container.appendChild(iframe);
            if(!window.twttr) {
                const script = document.createElement('script');
                script.src = 'https://platform.twitter.com/widgets.js';
                script.async = true;
                document.head.appendChild(script);
            }
        }

        async function fetchTwitterVideos(tweetId) {
            const videos = [];
            try {
                const res = await fetch(`https://api.fxtwitter.com/status/${tweetId}`);
                if(res.ok) {
                    const data = await res.json();
                    const media = data.tweet?.media?.videos || [];
                    for(let v of media) if(v.url) videos.push({ url: v.url, type: 'video/mp4' });
                }
            } catch(e) { console.warn(e); }
            if(videos.length) return videos;
            try {
                const res = await fetch(`https://api.vxtwitter.com/status/${tweetId}`);
                if(res.ok) {
                    const data = await res.json();
                    if(data.media_extended) {
                        for(let m of data.media_extended) {
                            if((m.type === 'video' || m.type === 'gif') && m.url) videos.push({ url: m.url, type: 'video/mp4' });
                        }
                    }
                }
            } catch(e) { console.warn(e); }
            return videos;
        }

        function createVideoSelector(container, videos) {
            const bar = document.createElement('div');
            bar.className = 'video-selector-bar';
            bar.style.cssText = 'display:flex; gap:6px; padding:8px; background:#111; overflow-x:auto;';
            videos.forEach((v, idx) => {
                const btn = document.createElement('button');
                btn.className = 'video-selector-btn' + (idx===0 ? ' active' : '');
                btn.textContent = `مقطع ${idx+1}`;
                btn.style.cssText = 'background:#222; color:white; border:1px solid #444; border-radius:4px; padding:6px 10px; cursor:pointer;';
                if(idx===0) btn.style.background = '#e50914';
                btn.onclick = () => {
                    if(idx !== currentVideoIndex && videoPlayerInstance) {
                        currentVideoIndex = idx;
                        videoPlayerInstance.src({ src: v.url, type: 'video/mp4' });
                        videoPlayerInstance.play();
                        bar.querySelectorAll('.video-selector-btn').forEach(b=>{b.style.background='#222'; b.classList.remove('active');});
                        btn.style.background = '#e50914';
                        btn.classList.add('active');
                    }
                };
                bar.appendChild(btn);
            });
            container.appendChild(bar);
        }

        // دوال السحب والتحجيم
        function makeDraggable(element, handle) {
            let startX, startY, startLeft, startTop, isDragging = false;
            const getPos = (e) => e.touches ? e.touches[0] : e;
            function onStart(e) {
                if(e.target.classList && e.target.classList.contains('close-pinned-video')) return;
                e.preventDefault();
                isDragging = true;
                const pos = getPos(e);
                startX = pos.clientX; startY = pos.clientY;
                startLeft = element.offsetLeft; startTop = element.offsetTop;
                document.addEventListener('mousemove', onMove);
                document.addEventListener('touchmove', onMove, { passive: false });
                document.addEventListener('mouseup', onEnd);
                document.addEventListener('touchend', onEnd);
            }
            function onMove(e) {
                if(!isDragging) return;
                e.preventDefault();
                const pos = getPos(e);
                let newLeft = startLeft + (pos.clientX - startX);
                let newTop = startTop + (pos.clientY - startY);
                if(window.innerWidth <= 600) return;
                newLeft = Math.min(window.innerWidth - element.offsetWidth, Math.max(0, newLeft));
                newTop = Math.min(window.innerHeight - element.offsetHeight, Math.max(0, newTop));
                element.style.left = newLeft + 'px';
                element.style.top = newTop + 'px';
                element.style.right = 'auto';
                element.style.bottom = 'auto';
            }
            function onEnd() {
                isDragging = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('mouseup', onEnd);
                document.removeEventListener('touchend', onEnd);
            }
            handle.addEventListener('mousedown', onStart);
            handle.addEventListener('touchstart', onStart, { passive: false });
        }

        function makeResizable(element, handle) {
            let startW, startH, startX, startY;
            const getPos = (e) => e.touches ? e.touches[0] : e;
            function onStart(e) {
                e.preventDefault();
                startW = element.offsetWidth; startH = element.offsetHeight;
                const pos = getPos(e);
                startX = pos.clientX; startY = pos.clientY;
                document.addEventListener('mousemove', onMove);
                document.addEventListener('touchmove', onMove, { passive: false });
                document.addEventListener('mouseup', onEnd);
                document.addEventListener('touchend', onEnd);
            }
            function onMove(e) {
                e.preventDefault();
                const pos = getPos(e);
                let newW = startW + (pos.clientX - startX);
                let newH = startH + (pos.clientY - startY);
                if(newW > 280) element.style.width = newW + 'px';
                if(newH > 200) element.style.height = newH + 'px';
            }
            function onEnd() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('touchmove', onMove);
            }
            handle.addEventListener('mousedown', onStart);
            handle.addEventListener('touchstart', onStart, { passive: false });
        }

        function closeAllModals() {
            setVideoModal.style.display = 'none';
            overlay.style.display = 'none';
        }

        // الاستماع لتغييرات الفيديو المثبت
        const pinnedVideoRef = db.ref("pinned_video");
        pinnedVideoRef.on("value", async (snap) => {
            if(videoPlayerInstance) { videoPlayerInstance.dispose(); videoPlayerInstance = null; }
            pinnedVideoPlayer.innerHTML = '';
            currentVideosList = [];
            const data = snap.val();
            if(!data) { pinnedVideoPlayer.style.display = 'none'; return; }
            pinnedVideoPlayer.style.display = 'flex';

            const header = document.createElement('div');
            header.className = 'video-header';
            header.style.cssText = 'background:#151623; padding:6px 10px; cursor:move; touch-action:none; display:flex; justify-content:space-between; align-items:center;';
            header.innerHTML = `<span style="color:white;">بث - ${escapeHtml(data.setBy || 'مجهول')}</span>`;
            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-pinned-video';
            closeBtn.style.cssText = 'background:#e53935; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; font-weight:bold; border:none; color:white; z-index:10; pointer-events:auto;';
            closeBtn.innerHTML = '✖';
            closeBtn.onclick = (e) => { e.stopPropagation(); pinnedVideoRef.remove(); };
            header.appendChild(closeBtn);

            const body = document.createElement('div');
            body.className = 'video-body';
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle';
            resizeHandle.style.cssText = 'position:absolute; width:20px; height:20px; bottom:0; right:0; cursor:nwse-resize; z-index:10;';

            pinnedVideoPlayer.appendChild(header);
            pinnedVideoPlayer.appendChild(body);
            pinnedVideoPlayer.appendChild(resizeHandle);

            makeDraggable(pinnedVideoPlayer, header);
            makeResizable(pinnedVideoPlayer, resizeHandle);

            if(data.type === 'youtube') {
                createVideoPlayer(body, `https://www.youtube.com/watch?v=${data.id}`, 'video/youtube', true);
            } else if(data.type === 'm3u') {
                createVideoPlayer(body, data.url, 'application/x-mpegURL', false);
            } else if(data.type === 'direct') {
                createVideoPlayer(body, data.url, 'video/mp4', false);
            } else if(data.type === 'twitter') {
                embedTwitterNative(body, data.id);
                const videos = await fetchTwitterVideos(data.id);
                if(videos.length) {
                    currentVideosList = videos;
                    currentVideoIndex = 0;
                    const vid = document.createElement('video');
                    vid.controls = true; vid.autoplay = true; vid.muted = true; vid.playsInline = true;
                    vid.style.width = '100%'; vid.style.height = '100%';
                    vid.src = videos[0].url;
                    body.innerHTML = '';
                    body.appendChild(vid);
                    videoPlayerInstance = { dispose: () => { vid.src = ''; vid.remove(); } };
                    if(videos.length > 1) createVideoSelector(body, videos);
                    vid.onerror = () => embedTwitterNative(body, data.id);
                }
            }
        });

        // ربط النقر على أيقونة التلفزيون
        tvIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            setVideoModal.style.display = 'block';
            overlay.style.display = 'block';
            videoUrlInput.value = '';
            videoUrlInput.focus();
        });

        overlay.addEventListener('click', closeAllModals);
        document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeAllModals(); });

        submitVideoUrlBtn.addEventListener('click', async () => {
            const url = videoUrlInput.value.trim();
            if(!url) return;
            const youtubeId = getYoutubeVideoId(url);
            const tweetId = getTweetId(url);
            let dataToSet = null;
            if(youtubeId) {
                dataToSet = { type: 'youtube', id: youtubeId, setBy: 'المستخدم' };
            } else if(tweetId) {
                dataToSet = { type: 'twitter', id: tweetId, setBy: 'المستخدم' };
            } else if(url.includes('.m3u8') || url.includes('.m3u')) {
                dataToSet = { type: 'm3u', url: url, setBy: 'المستخدم' };
            } else if(isDirectVideo(url)) {
                dataToSet = { type: 'direct', url: url, setBy: 'المستخدم' };
            } else {
                alert("رابط غير مدعوم");
                return;
            }
            await pinnedVideoRef.set(dataToSet);
            videoUrlInput.value = '';
            closeAllModals();
        });

        db.ref('.info/serverTimeOffset').on('value', snap => serverTimeOffset = snap.val() || 0);

        // إزالة الحدث القديم على #design-a
        $(document).off('click', '#design-a');
        console.log('✅ مشغل التلفزيون جاهز');
    }

    // بدء التنفيذ
    init().catch(err => console.error('خطأ في التهيئة:', err));
})();
