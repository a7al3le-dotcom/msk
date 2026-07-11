<style>
:root {
    --bg-main: #05060a;
    --bg-grad-1: #181824;
    --bg-grad-2: #05060a;
    --bg-section: #0c0e16;
    --bg-elevated: #11121b;
    --text-main: #ffffff;
    --text-muted: #a7aec4;
    --accent: #ffd54a;
    --accent-soft: #ffe788;
    --border-soft: #262839;
    --danger: #e53935;
}

/* خلفية عامة فاخرة */
html, body {
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
}

body {
    font-family: 'Tajawal', sans-serif;
    background:
        radial-gradient(circle at 10% -10%, rgba(255, 213, 74, 0.18), transparent 55%),
        radial-gradient(circle at 90% 0%, rgba(255, 213, 74, 0.12), transparent 60%),
        linear-gradient(145deg, #05060a 0%, #090b12 40%, #05060a 100%);
    color: var(--text-main);
    display: flex;
    flex-direction: column;
    position: relative;
}

/* حاوية الشات */
#chat-container {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    backdrop-filter: blur(22px);
}

/* رسائل الشات */
#messages {
    flex: 1;
    overflow-y: auto;
    padding: 18px;
    background:
        radial-gradient(circle at top left, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0.75) 45%, rgba(0, 0, 0, 0.95) 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    scroll-behavior: smooth;
}

.msg {
    margin: 10px 0;
    display: flex;
    gap: 10px;
    align-items: center;
    direction: ltr;
    text-align: left;
    font-size: 15px;
    line-height: 1.5;
    color: var(--text-main);
    padding: 10px 12px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow:
        0 18px 40px rgba(0, 0, 0, 0.85),
        0 0 0 1px rgba(0, 0, 0, 0.7);
    transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.msg:hover {
    transform: translateY(-2px);
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 213, 74, 0.06));
    box-shadow:
        0 24px 60px rgba(0, 0, 0, 0.95),
        0 0 0 1px rgba(255, 213, 74, 0.25);
}

.sys {
    text-align: center;
    color: var(--text-muted);
    font-size: 12px;
    margin: 10px auto;
    font-style: italic;
    background: rgba(255, 255, 255, 0.04);
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
}

/* اسم المستخدم */
.user {
    font-weight: 700;
    color: var(--accent-soft);
}

/* الوقت */
.time {
    font-size: 11px;
    color: var(--text-muted);
    min-width: 32px;
    text-align: right;
}

/* منطقة الإدخال */
#inputArea {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
    background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.7));
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(20px);
}

/* مربع الإدخال */
#messageInput {
    flex: 1;
    font-size: 16px;
    height: 46px;
    padding: 0 18px;
    border-radius: 999px;
    font-family: 'Tajawal', sans-serif;
    background: rgba(10, 11, 20, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-main);
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.7),
        0 20px 50px rgba(0, 0, 0, 0.85);
    box-sizing: border-box;
    appearance: none;
    transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

#messageInput::placeholder {
    color: #6f7487;
}

#messageInput:focus {
    outline: none;
    border-color: var(--accent-soft);
    background: rgba(10, 11, 20, 0.98);
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.7),
        0 0 0 1px rgba(255, 213, 74, 0.35),
        0 24px 60px rgba(0, 0, 0, 0.95);
}

/* زر الإرسال */
#sendBtn {
    height: 46px;
    padding: 0 24px;
    border: none;
    border-radius: 999px;
    background: radial-gradient(circle at 0% 0%, #fff7d1 0%, #ffd54a 35%, #ffcf3a 60%, #c89b2a 100%);
    color: #000;
    cursor: pointer;
    font-family: 'Tajawal', sans-serif;
    font-weight: 700;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    box-shadow:
        0 18px 46px rgba(0, 0, 0, 0.9),
        0 0 0 1px rgba(0, 0, 0, 0.7);
    transition:
        transform 0.16s ease,
        box-shadow 0.16s ease,
        filter 0.16s ease;
    white-space: nowrap;
}

#sendBtn:hover {
    transform: translateY(-2px);
    filter: brightness(1.04);
    box-shadow:
        0 26px 70px rgba(0, 0, 0, 0.95),
        0 0 0 1px rgba(255, 213, 74, 0.4);
}

#sendBtn:active {
    transform: translateY(0);
    box-shadow:
        0 14px 40px rgba(0, 0, 0, 0.9),
        0 0 0 1px rgba(255, 213, 74, 0.3);
}

/* أزرار أعلى الشاشة */
#topButtons {
    position: fixed;
    top: calc(10px + env(safe-area-inset-top));
    right: calc(10px + env(safe-area-inset-right));
    display: flex;
    gap: 8px;
    z-index: 1000;
}

.btn {
    padding: 6px 12px;
    background: rgba(10, 11, 20, 0.96);
    border-radius: 999px;
    cursor: pointer;
    font-size: 15px;
    display: flex;
    align-items: center;
    color: var(--text-main);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 12px 34px rgba(0, 0, 0, 0.85);
    transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;
}

.btn:hover {
    background: rgba(25, 27, 45, 0.98);
    border-color: rgba(255, 255, 255, 0.16);
    transform: translateY(-1px);
    box-shadow: 0 18px 46px rgba(0, 0, 0, 0.95);
}

.btn .count-text {
    font-size: 13px;
    margin-right: 4px;
    color: var(--accent-soft);
    font-weight: 600;
}

/* مودالات */
#usersBox,
#setVideoModal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background:
        radial-gradient(circle at top, #181a28 0%, #05060b 55%, #020307 100%);
    padding: 22px 24px;
    border-radius: 20px;
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.95);
    z-index: 1003;
    display: none;
    max-height: 80vh;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-main);
}

/* شاشة تسجيل الدخول */
#loginScreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100dvh;
    background:
        radial-gradient(circle at top, #181a28 0%, rgba(5, 6, 10, 0.96) 50%, #020307 100%);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    box-sizing: border-box;
}

#loginBox {
    background:
        radial-gradient(circle at top left, rgba(255, 255, 255, 0.04) 0%, rgba(5, 6, 12, 0.98) 55%, #05060b 100%);
    padding: 26px 26px 22px;
    border-radius: 22px;
    text-align: center;
    min-width: 300px;
    box-shadow: 0 34px 100px rgba(0, 0, 0, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-main);
}

/* فيديو مثبت */
#pinnedVideoPlayer {
    position: fixed;
    top: calc(60px + env(safe-area-inset-top));
    left: 10px;
    width: clamp(280px, 92vw, 480px);
    background: #000;
    border-radius: 18px;
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.95);
    z-index: 998;
    display: none;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.14);
}

/* ثيم نتفلكس للفيديو يبقى كما هو تقريبًا */
.video-js.vjs-netflix-theme {
    background-color: #000;
}

/* موبايل */
@media (max-width: 600px) {
    #loginBox {
        width: 90%;
        padding: 22px 18px 18px;
    }

    #pinnedVideoPlayer {
        top: calc(60px + env(safe-area-inset-top));
        left: 50%;
        transform: translateX(-50%);
        width: 94vw;
        max-width: 94vw;
    }

    #inputArea {
        padding: 10px 10px;
        padding-bottom: calc(12px + env(safe-area-inset-bottom));
    }

    #sendBtn {
        padding: 0 18px;
        font-size: 13px;
    }
}
</style>
