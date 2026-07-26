// ============================================================
//  تنظیمات
// ============================================================
const API_URL = 'https://kos6rrrr.pythonanywhere.com/api';
const ADMIN_ID = 8492696944;
let currentPage = 'explore';
let allPosts = [];
let currentUser = null;
let replyTo = null;

// ============================================================
//  راه‌اندازی
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user;
    currentUser = user;

    if (user) {
        document.getElementById('userAvatar').textContent = (user.first_name || 'کاربر').charAt(0).toUpperCase();
        if (user.id === ADMIN_ID) {
            document.getElementById('userAvatar').classList.add('admin');
        }
    }

    loadPage('explore');
    loadPosts();
    loadChatMessages();
    setInterval(loadChatMessages, 8000);
});

// ============================================================
//  ناوبری
// ============================================================
function navigateTo(page) {
    if (page === currentPage) return;
    currentPage = page;
    
    document.querySelectorAll('.dock-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
        const icon = btn.querySelector('i');
        icon.className = btn.classList.contains('active') ? 
            icon.className.replace('ph', 'ph-fill') : 
            icon.className.replace('ph-fill', 'ph');
    });

    loadPage(page);
    
    if (window.Telegram.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
}

function loadPage(page) {
    const container = document.getElementById('pageContainer');
    const titleMap = {
        'explore': 'اکسپلور',
        'chat': 'چت عمومی',
        'support': 'پشتیبانی',
        'profile': 'پروفایل',
        'settings': 'تنظیمات'
    };
    document.getElementById('pageTitle').textContent = titleMap[page] || 'اونلی فا';

    // بارگذاری صفحه از فایل مربوطه
    fetch(`pages/${page}.html`)
        .then(res => res.text())
        .then(html => {
            container.innerHTML = html;
            // راه‌اندازی صفحه بعد از لود
            initPage(page);
        })
        .catch(() => {
            // اگر فایل پیدا نشد، از محتوای پیش‌فرض استفاده کن
            container.innerHTML = `<div class="page active" id="page-${page}"><div style="text-align:center;padding:40px 0;">صفحه ${titleMap[page]}</div></div>`;
            initPage(page);
        });
}

function initPage(page) {
    switch(page) {
        case 'explore': initExplore(); break;
        case 'chat': initChat(); break;
        case 'support': initSupport(); break;
        case 'profile': initProfile(); break;
        case 'settings': initSettings(); break;
    }
}

// ============================================================
//  اکسپلور
// ============================================================
function initExplore() {
    // کدهای اکسپلور (پست‌ها، لایک، کامنت)
}

// ============================================================
//  چت
// ============================================================
function initChat() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    
    if (input) {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }
    if (sendBtn) {
        sendBtn.addEventListener('click', sendChatMessage);
    }
}

// ============================================================
//  پشتیبانی (تیکت)
// ============================================================
function initSupport() {
    const newTicketBtn = document.getElementById('newTicketBtn');
    if (newTicketBtn) {
        newTicketBtn.addEventListener('click', createTicket);
    }
    loadTickets();
}

async function loadTickets() {
    try {
        const res = await fetch(`${API_URL}/tickets`);
        if (res.ok) {
            const tickets = await res.json();
            const container = document.getElementById('ticketList');
            if (!container) return;
            if (tickets.length === 0) {
                container.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px 0;">
                    <i class="ph-fill ph-ticket" style="font-size:40px;display:block;margin-bottom:12px;"></i>
                    <p>هنوز تیکتی ثبت نشده</p>
                </div>`;
                return;
            }
            container.innerHTML = tickets.map(t => `
                <div class="ticket-item" onclick="openTicket(${t.id})">
                    <div class="ticket-header">
                        <span class="ticket-id">#${t.id}</span>
                        <span class="ticket-status ${t.status}">${t.status === 'open' ? 'باز' : 'بسته شده'}</span>
                    </div>
                    <div class="ticket-subject">${t.subject}</div>
                    <div class="ticket-time">${t.date || ''}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('خطا در دریافت تیکت‌ها:', error);
    }
}

function createTicket() {
    const subject = prompt('موضوع تیکت:');
    if (!subject) return;
    const message = prompt('پیام خود را بنویسید:');
    if (!message) return;

    const user = window.Telegram.WebApp.initDataUnsafe?.user;
    if (!user) return;

    fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: user.id,
            username: user.first_name || 'کاربر',
            subject: subject,
            message: message
        })
    }).then(() => {
        loadTickets();
        alert('✅ تیکت شما ثبت شد');
    }).catch(() => alert('❌ خطا در ثبت تیکت'));
}

// ============================================================
//  تنظیمات (تم شخصی)
// ============================================================
function initSettings() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    changeTheme(savedTheme);
}

function changeTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    document.querySelectorAll('.theme-option').forEach(el => {
        el.classList.toggle('active', el.id === `theme-${theme}`);
    });
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    changeTheme(current === 'dark' ? 'light' : 'dark');
}

function setBackground() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                document.getElementById('appContainer').style.setProperty('--bg-image', `url(${ev.target.result})`);
                localStorage.setItem('bg_image', ev.target.result);
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

function changeLanguage() {
    const langs = ['فارسی', 'English', 'العربية'];
    const current = document.getElementById('langDisplay')?.textContent || 'فارسی';
    const idx = langs.indexOf(current);
    const next = langs[(idx + 1) % langs.length];
    if (document.getElementById('langDisplay')) {
        document.getElementById('langDisplay').textContent = next;
    }
    localStorage.setItem('language', next);
}

// ============================================================
//  چت عمومی
// ============================================================
async function loadChatMessages() {
    try {
        const res = await fetch(`${API_URL}/chat`);
        if (res.ok) {
            const messages = await res.json();
            const container = document.getElementById('chatMessages');
            if (!container) return;
            if (messages.length === 0) {
                container.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:20px;">
                    <i class="ph-fill ph-chat-dots" style="font-size:28px;display:block;margin-bottom:8px;"></i>
                    اولین پیام رو بفرست!
                </div>`;
                return;
            }
            container.innerHTML = messages.map(m => `
                <div class="chat-msg ${m.user_id === currentUser?.id ? 'self' : 'other'}">
                    ${m.reply_text ? `<div class="reply-indicator">${m.reply_text}</div>` : ''}
                    <div class="sender">${m.username || 'کاربر'}</div>
                    <div class="text">${m.text}</div>
                    <span class="time">${m.date ? m.date.slice(0, 16).replace('T', ' ') : ''}</span>
                </div>
            `).join('');
            container.scrollTop = container.scrollHeight;
            document.getElementById('chatUsers').textContent = `${messages.length} پیام`;
        }
    } catch (error) {
        console.error('خطا در دریافت چت:', error);
    }
}

async function sendChatMessage() {
    const user = window.Telegram.WebApp.initDataUnsafe?.user;
    if (!user) return;
    const input = document.getElementById('chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                username: user.first_name || 'کاربر',
                text: text,
                reply_to: replyTo ? replyTo.id : null,
                reply_text: replyTo ? replyTo.text : null
            })
        });

        if (res.ok) {
            input.value = '';
            replyTo = null;
            await loadChatMessages();
            if (window.Telegram.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
        }
    } catch (error) {
        console.error('خطا در ارسال پیام:', error);
    }
}

// ============================================================
//  پروفایل
// ============================================================
function initProfile() {
    const user = window.Telegram.WebApp.initDataUnsafe?.user;
    if (user) {
        document.getElementById('profileName').textContent = user.first_name || 'کاربر';
        document.getElementById('profileId').textContent = user.username ? `@${user.username}` : 'کاربر';
        document.getElementById('profileAvatarImg').src = `https://ui-avatars.com/api/?name=${user.first_name || 'کاربر'}&background=10a37f&color=fff&size=200`;
    }
}

function openProfileEdit() {
    const user = window.Telegram.WebApp.initDataUnsafe?.user;
    if (!user) return;
    const name = prompt('نام جدید:', user.first_name || '');
    if (name) {
        fetch(`${API_URL}/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                first_name: name
            })
        }).then(() => {
            document.getElementById('profileName').textContent = name;
            if (window.Telegram.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
        }).catch(() => alert('❌ خطا در ویرایش پروفایل'));
    }
}

function clearAllData() {
    if (confirm('همه داده‌های محلی پاک شود؟')) {
        localStorage.clear();
        location.reload();
    }
}

// ============================================================
//  Load saved theme
// ============================================================
const savedTheme = localStorage.getItem('theme') || 'dark';
changeTheme(savedTheme);

const savedBg = localStorage.getItem('bg_image');
if (savedBg) {
    document.getElementById('appContainer').style.setProperty('--bg-image', `url(${savedBg})`);
    }
