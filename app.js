// ============================================================
//  تنظیمات
// ============================================================
const API_URL = 'https://kos6rrrr.pythonanywhere.com/api';
const ADMIN_ID = 8492696944;
let currentPage = 'explore';
let allPosts = [];
let currentUser = null;
let replyTo = null;
let editingPostId = null;
let currentCategory = 'all';

// ============================================================
//  راه‌اندازی
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user;
    currentUser = user;

    // آواتار کاربر
    const avatar = document.getElementById('userAvatar');
    if (user) {
        const name = user.first_name || 'کاربر';
        avatar.textContent = name.charAt(0).toUpperCase();
        if (user.id === ADMIN_ID) {
            avatar.classList.add('admin');
        }
    }

    // لود صفحه پیش‌فرض
    loadPage('explore');
    
    // لود پس‌زمینه ذخیره شده
    const savedBg = localStorage.getItem('bg_image');
    if (savedBg) {
        document.getElementById('appContainer').style.setProperty('--bg-image', `url(${savedBg})`);
    }

    // لود تم ذخیره شده
    const savedTheme = localStorage.getItem('theme') || 'dark';
    changeTheme(savedTheme);
});

// ============================================================
//  ناوبری بین صفحات
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

    // آدرس کامل و دقیق فایل
    const pageUrl = `/Miniapp/pages/${page}.html`;

    fetch(pageUrl)
        .then(res => {
            if (!res.ok) throw new Error('Page not found');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            initPage(page);
        })
        .catch(() => {
            container.innerHTML = `<div class="page active" id="page-${page}">
                <div style="text-align:center;padding:40px 0;color:var(--text-muted);">
                    <i class="ph-fill ph-warning" style="font-size:40px;display:block;margin-bottom:12px;"></i>
                    <p>خطا در بارگذاری صفحه ${titleMap[page]}</p>
                    <p style="font-size:12px;margin-top:8px;">لطفاً اتصال اینترنت را بررسی کنید.</p>
                </div>
            </div>`;
        });
}

// ============================================================
//  مقداردهی اولیه هر صفحه
// ============================================================
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
//  صفحه اکسپلور (پست‌ها)
// ============================================================
function initExplore() {
    loadPosts();
    
    // رویدادهای پنل مدیریت
    document.getElementById('publishBtn')?.addEventListener('click', handlePublish);
    document.getElementById('updateBtn')?.addEventListener('click', handleUpdate);
    
    // آپلود عکس
    document.getElementById('uploadBtn')?.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    document.getElementById('previewImg').src = ev.target.result;
                    document.getElementById('uploadPreview').classList.add('show');
                    document.getElementById('postImage').value = ev.target.result;
                    document.getElementById('postImage').style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    });

    document.getElementById('removeImg')?.addEventListener('click', function() {
        document.getElementById('uploadPreview').classList.remove('show');
        document.getElementById('postImage').value = '';
        document.getElementById('postImage').style.display = 'none';
    });

    // جستجو
    document.getElementById('searchInput')?.addEventListener('input', handleSearch);
    document.getElementById('searchClear')?.addEventListener('click', clearSearch);

    // دسته‌بندی‌ها
    document.querySelectorAll('.category-tab').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.cat;
            filterPosts();
            if (window.Telegram.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
        });
    });
}

// ============================================================
//  توابع پست‌ها
// ============================================================
async function loadPosts() {
    try {
        const res = await fetch(`${API_URL}/posts`);
        if (res.ok) {
            allPosts = await res.json();
            updateStats();
        } else allPosts = [];
        filterPosts();
    } catch { allPosts = []; filterPosts(); }
}

function updateStats() {
    const totalLikes = allPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalComments = allPosts.reduce((sum, p) => sum + (p.comments || 0), 0);
    document.getElementById('statPosts').textContent = allPosts.length;
    document.getElementById('statLikes').textContent = totalLikes;
    document.getElementById('statComments').textContent = totalComments;
    document.getElementById('profilePosts').textContent = allPosts.length;
    document.getElementById('profileLikes').textContent = totalLikes;
}

function filterPosts() {
    const search = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    let filtered = allPosts;
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => (p.category || '').toLowerCase().includes(currentCategory));
    }
    if (search) {
        filtered = filtered.filter(p => (p.title || '').toLowerCase().includes(search) || (p.desc || '').toLowerCase().includes(search));
    }
    renderPosts(filtered);
}

function renderPosts(posts) {
    const container = document.getElementById('postsContainer');
    const isAdmin = currentUser && currentUser.id === ADMIN_ID;

    if (!container) return;
    if (!posts || posts.length === 0) {
        container.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px 20px;color:var(--text-muted);">
            <i class="ph-fill ph-film-slate" style="font-size:40px;display:block;margin-bottom:10px;opacity:0.4;"></i>
            <p>فیلمی پیدا نشد</p>
        </div>`;
        return;
    }

    container.innerHTML = posts.map((post, i) => `
        <div class="post-card" style="background:var(--bg-card);border-radius:var(--radius);overflow:hidden;margin-bottom:14px;border:0.5px solid var(--border-color);transition:var(--transition);animation:fadeUp 0.35s ease forwards;opacity:0;animation-delay:${i * 0.03}s;" id="post-${post.id}">
            <div class="post-image" onclick="window.open('${post.image || ''}', '_blank')" style="width:100%;aspect-ratio:16/9;background:var(--bg-secondary);overflow:hidden;position:relative;cursor:pointer;">
                ${post.image ? `<img src="${post.image}" alt="پوستر" loading="lazy" style="width:100%;height:100%;object-fit:cover;">` :
                `<div class="placeholder" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--text-muted);font-size:36px;"><i class="ph-fill ph-image"></i></div>`}
            </div>
            <div class="post-body" style="padding:12px 14px 14px;">
                <div class="post-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
                    <div class="post-title" style="font-size:16px;font-weight:700;line-height:1.3;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
                        <i class="ph-fill ph-film-script" style="color:var(--accent);font-size:16px;"></i>
                        ${post.title || 'بدون عنوان'}
                    </div>
                    <div class="post-date" style="font-size:10px;color:var(--text-muted);background:var(--bg-primary);padding:2px 10px;border-radius:var(--radius-full);flex-shrink:0;margin-right:6px;">${post.date || '---'}</div>
                </div>
                <div class="post-desc" style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${post.desc || ''}</div>
                <div class="post-footer" style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:0.5px solid var(--border-color);">
                    ${post.link ? `<a href="${post.link}" class="post-link" target="_blank" style="display:inline-flex;align-items:center;gap:4px;background:var(--accent);color:#fff;padding:6px 16px;border-radius:var(--radius-full);text-decoration:none;font-weight:600;font-size:12px;transition:var(--transition);"><i class="ph ph-download-simple"></i> دانلود</a>` :
                    `<span style="font-size:12px;color:var(--text-muted);"><i class="ph ph-link-simple"></i> لینکی نیست</span>`}
                    <div class="post-stats" style="display:flex;align-items:center;gap:14px;">
                        <span class="stat ${post.user_liked ? 'liked' : ''}" onclick="toggleLike(${post.id})" style="display:flex;align-items:center;gap:3px;font-size:12px;color:var(--text-muted);cursor:pointer;transition:var(--transition);padding:4px;border-radius:8px;">
                            <i class="${post.user_liked ? 'ph-fill' : 'ph'} ph-heart" style="font-size:15px;${post.user_liked ? 'color:#ff4757;' : ''}"></i> <span class="num" id="likes-${post.id}" style="font-weight:600;">${post.likes || 0}</span>
                        </span>
                        <span class="stat" onclick="toggleComments(${post.id})" style="display:flex;align-items:center;gap:3px;font-size:12px;color:var(--text-muted);cursor:pointer;transition:var(--transition);padding:4px;border-radius:8px;">
                            <i class="ph-fill ph-chat-circle" style="font-size:15px;"></i> <span class="num" id="comments-${post.id}" style="font-weight:600;">${post.comments || 0}</span>
                        </span>
                    </div>
                </div>
            </div>
            ${isAdmin ? `
                <div class="post-admin-controls" style="display:flex;gap:6px;padding:0 14px 14px;">
                    <button class="btn-edit" onclick="startEdit(${post.id})" style="flex:1;padding:6px;border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;background:rgba(255,215,0,0.12);color:#ffd700;transition:var(--transition);display:flex;align-items:center;justify-content:center;gap:4px;">
                        <i class="ph ph-pencil-simple"></i> ویرایش
                    </button>
                    <button class="btn-delete" onclick="deletePost(${post.id})" style="flex:1;padding:6px;border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;background:rgba(255,71,87,0.12);color:#ff4757;transition:var(--transition);display:flex;align-items:center;justify-content:center;gap:4px;">
                        <i class="ph ph-trash"></i> حذف
                    </button>
                </div>
            ` : ''}
            <div class="comments-section" id="comments-${post.id}-section" style="padding:0 14px 14px;display:none;">
                <div id="comments-list-${post.id}"></div>
                <div style="display:flex;gap:6px;padding-top:8px;">
                    <input class="comment-input" id="comment-input-${post.id}" placeholder="نظر..." style="flex:1;padding:8px 12px;border-radius:10px;border:0.5px solid var(--border-color);background:var(--bg-input);color:var(--text-primary);font-size:13px;outline:none;-webkit-user-select:text;user-select:text;">
                    <button class="comment-send" onclick="sendComment(${post.id})" style="width:36px;height:36px;border-radius:10px;border:none;background:var(--accent);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s ease;">
                        <i class="ph-fill ph-paper-plane-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // اضافه کردن انیمیشن fadeUp
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeUp {
            to { opacity: 1; transform: translateY(0); }
        }
        .post-card { transform: translateY(20px); }
    `;
    document.head.appendChild(style);
}

// ============================================================
//  لایک
// ============================================================
async function toggleLike(postId) {
    const user = window.Telegram.WebApp.initDataUnsafe?.user;
    if (!user) return;

    try {
        const res = await fetch(`${API_URL}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, user_id: user.id })
        });

        if (res.ok) {
            const result = await res.json();
            const likesSpan = document.getElementById(`likes-${postId}`);
            if (likesSpan) likesSpan.textContent = result.likes;
            const stat = document.querySelector(`#post-${postId} .post-stats .stat:first-child`);
            if (stat) {
                stat.classList.toggle('liked');
                const icon = stat.querySelector('i');
                icon.className = stat.classList.contains('liked') ? 'ph-fill ph-heart' : 'ph ph-heart';
                if (stat.classList.contains('liked')) {
                    icon.style.color = '#ff4757';
                } else {
                    icon.style.color = '';
                }
            }
            updateStats();
            if (window.Telegram.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
        }
    } catch (error) { console.error('خطا در لایک:', error); }
}

// ============================================================
//  کامنت‌ها
// ============================================================
async function toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}-section`);
    if (!section) return;
    if (section.style.display === 'block') { section.style.display = 'none'; return; }
    section.style.display = 'block';
    await loadComments(postId);
}

async function loadComments(postId) {
    try {
        const res = await fetch(`${API_URL}/comments/${postId}`);
        if (res.ok) {
            const comments = await res.json();
            const container = document.getElementById(`comments-list-${postId}`);
            if (!container) return;
            if (!comments.length) {
                container.innerHTML = `<p style="color:var(--text-muted);font-size:12px;padding:8px 0;">هنوز نظری نیست</p>`;
            } else {
                container.innerHTML = comments.map(c => `
                    <div style="display:flex;gap:8px;padding:8px 0;border-bottom:0.5px solid var(--border-color);">
                        <div style="width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;">${c.username ? c.username.charAt(0).toUpperCase() : '👤'}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:11px;font-weight:600;color:var(--text-primary);">${c.username || 'کاربر'}</div>
                            <div style="font-size:12px;color:var(--text-secondary);word-wrap:break-word;">${c.text}</div>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) { console.error('خطا در دریافت کامنت:', error); }
}

async function sendComment(postId) {
    const user = window.Telegram.WebApp.initDataUnsafe?.user;
    if (!user) return;
    const input = document.getElementById(`comment-input-${postId}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    try {
        const res = await fetch(`${API_URL}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, user_id: user.id, username: user.first_name || 'کاربر', text })
        });

        if (res.ok) {
            input.value = '';
            const commentsSpan = document.getElementById(`comments-${postId}`);
            if (commentsSpan) commentsSpan.textContent = (parseInt(commentsSpan.textContent) || 0) + 1;
            await loadComments(postId);
            updateStats();
            if (window.Telegram.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
        }
    } catch (error) { console.error('خطا در ارسال کامنت:', error); }
}

// ============================================================
//  انتشار، ویرایش و حذف پست
// ============================================================
async function handlePublish() {
    const status = document.getElementById('adminStatus');
    const btn = document.getElementById('publishBtn');
    if (!status || !btn) return;
    btn.disabled = true;
    status.textContent = '⏳ در حال انتشار...';
    status.className = 'admin-status';

    const newPost = {
        image: document.getElementById('postImage')?.value.trim() || '',
        title: document.getElementById('postTitle')?.value.trim() || '',
        category: document.getElementById('postCategory')?.value.trim() || '',
        desc: document.getElementById('postDesc')?.value.trim() || '',
        link: document.getElementById('postLink')?.value.trim() || '',
        user_id: currentUser ? currentUser.id : 0
    };

    if (!newPost.title) {
        status.textContent = '⚠️ عنوان رو وارد کن!';
        status.className = 'admin-status error';
        btn.disabled = false;
        return;
    }

    try {
        const res = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPost)
        });

        if (res.ok) {
            status.textContent = '✅ منتشر شد!';
            status.className = 'admin-status success';
            clearForm();
            loadPosts();
            if (window.Telegram.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
        } else {
            throw new Error('خطا');
        }
    } catch (error) {
        status.textContent = `❌ ${error.message}`;
        status.className = 'admin-status error';
    }
    btn.disabled = false;
}

function startEdit(id) {
    const post = allPosts.find(p => p.id === id);
    if (!post) return;
    editingPostId = id;

    document.getElementById('postImage').value = post.image || '';
    document.getElementById('postTitle').value = post.title || '';
    document.getElementById('postCategory').value = post.category || '';
    document.getElementById('postDesc').value = post.desc || '';
    document.getElementById('postLink').value = post.link || '';

    if (post.image) {
        document.getElementById('previewImg').src = post.image;
        document.getElementById('uploadPreview').classList.add('show');
        document.getElementById('postImage').style.display = 'block';
    }

    document.getElementById('publishBtn').classList.add('hidden');
    document.getElementById('updateBtn').classList.remove('hidden');
    document.getElementById('adminStatus').textContent = '✎ ویرایش';
    document.getElementById('adminStatus').className = 'admin-status';
    document.getElementById('contentScroll')?.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleUpdate() {
    if (!editingPostId) return;
    const status = document.getElementById('adminStatus');
    const btn = document.getElementById('updateBtn');
    if (!status || !btn) return;
    btn.disabled = true;

    const updated = {
        id: editingPostId,
        image: document.getElementById('postImage')?.value.trim() || '',
        title: document.getElementById('postTitle')?.value.trim() || '',
        category: document.getElementById('postCategory')?.value.trim() || '',
        desc: document.getElementById('postDesc')?.value.trim() || '',
        link: document.getElementById('postLink')?.value.trim() || ''
    };

    if (!updated.title) {
        status.textContent = '⚠️ عنوان رو وارد کن!';
        status.className = 'admin-status error';
        btn.disabled = false;
        return;
    }

    try {
        const res = await fetch(`${API_URL}/posts/${editingPostId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });

        if (res.ok) {
            status.textContent = '✅ بروزرسانی شد!';
            status.className = 'admin-status success';
            clearForm();
            document.getElementById('publishBtn').classList.remove('hidden');
            document.getElementById('updateBtn').classList.add('hidden');
            editingPostId = null;
            loadPosts();
            if (window.Telegram.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
        } else {
            throw new Error('خطا');
        }
    } catch {
        status.textContent = '❌ خطا';
        status.className = 'admin-status error';
    }
    btn.disabled = false;
}

async function deletePost(id) {
    if (!confirm('حذف کنم؟')) return;
    try {
        const res = await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE' });
        if (res.ok) { loadPosts(); if (window.Telegram.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }}
    } catch { alert('خطا در حذف'); }
}

function clearForm() {
    ['postImage', 'postTitle', 'postCategory', 'postDesc', 'postLink'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('uploadPreview')?.classList.remove('show');
    document.getElementById('postImage')?.style.display = 'none';
    document.getElementById('adminStatus').textContent = '';
    document.getElementById('adminStatus').className = 'admin-status';
}

function handleSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    document.getElementById('searchClear').style.display = input.value.length ? 'block' : 'none';
    filterPosts();
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchClear').style.display = 'none';
    filterPosts();
}

// ============================================================
//  صفحه چت
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
    loadChatMessages();
    setInterval(loadChatMessages, 8000);
}

async function loadChatMessages() {
    try {
        const res = await fetch(`${API_URL}/chat`);
        if (res.ok) {
            const messages = await res.json();
            const container = document.getElementById('chatMessages');
            if (!container) return;
            
            const user = window.Telegram.WebApp.initDataUnsafe?.user;
            const currentUserId = user?.id || currentUser?.id;
            
            if (messages.length === 0) {
                container.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:20px;">
                    <i class="ph-fill ph-chat-dots" style="font-size:28px;display:block;margin-bottom:8px;"></i>
                    اولین پیام رو بفرست!
                </div>`;
                return;
            }
            container.innerHTML = messages.map(m => `
                <div class="chat-msg ${m.user_id === currentUserId ? 'self' : 'other'}" id="msg-${m.id}">
                    ${m.reply_text ? `<div class="reply-indicator" style="font-size:11px;opacity:0.6;padding:2px 8px;border-right:2px solid var(--accent);margin-bottom:4px;border-radius:4px;background:rgba(255,255,255,0.05);">${m.reply_text}</div>` : ''}
                    <div class="sender" style="font-size:10px;font-weight:600;opacity:0.7;margin-bottom:1px;">${m.username || 'کاربر'}</div>
                    ${m.media_type === 'image' ? `<img src="${m.media_url}" class="media" onclick="window.open('${m.media_url}','_blank')" style="max-width:200px;border-radius:8px;margin:4px 0;">` : ''}
                    ${m.media_type === 'video' ? `<video src="${m.media_url}" class="media" controls onclick="event.stopPropagation()" style="max-width:200px;border-radius:8px;margin:4px 0;"></video>` : ''}
                    ${m.text ? `<div class="text" style="word-wrap:break-word;">${m.text}</div>` : ''}
                    <span class="time" style="font-size:9px;opacity:0.4;margin-top:3px;display:block;text-align:left;">${m.date ? m.date.slice(0, 16).replace('T', ' ') : ''}</span>
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
            input.style.height = 'auto';
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
//  صفحه پشتیبانی (تیکت‌ها)
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
                <div class="ticket-item" style="background:var(--bg-card);border:0.5px solid var(--border-color);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:var(--transition);" onclick="openTicket(${t.id})">
                    <div class="ticket-header" style="display:flex;justify-content:space-between;align-items:center;">
                        <span class="ticket-id" style="font-size:12px;color:var(--text-muted);">#${t.id}</span>
                        <span class="ticket-status ${t.status}" style="font-size:10px;padding:2px 10px;border-radius:var(--radius-full);font-weight:600;${t.status === 'open' ? 'background:rgba(16,163,127,0.15);color:var(--accent);' : 'background:rgba(255,71,87,0.15);color:#ff4757;'}">${t.status === 'open' ? 'باز' : 'بسته شده'}</span>
                    </div>
                    <div class="ticket-subject" style="font-weight:600;font-size:14px;margin-top:4px;">${t.subject}</div>
                    <div class="ticket-time" style="font-size:10px;color:var(--text-muted);margin-top:4px;">${t.date || ''}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('خطا در دریافت تیکت‌ها:', error);
    }
}

function createTicket() {
    const user = window.Telegram.WebApp.initDataUnsafe?.user;
    if (!user) return;
    const subject = prompt('موضوع تیکت:');
    if (!subject) return;
    const message = prompt('پیام خود را بنویسید:');
    if (!message) return;

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

function openTicket(id) {
    alert(`تیکت #${id} باز شد`);
}

// ============================================================
//  صفحه پروفایل
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
//  صفحه تنظیمات
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
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
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
    if (document.getElementById('modal-langDisplay')) {
        document.getElementById('modal-langDisplay').textContent = next;
    }
    localStorage.setItem('language', next);
}

function openSupport() {
    const user = window.Telegram.WebApp.initDataUnsafe?.user;
    if (!user) return;
    const msg = prompt('پیام خود را به پشتیبانی بنویسید:');
    if (msg) {
        fetch(`${API_URL}/support`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                username: user.first_name || 'کاربر',
                text: msg
            })
        }).then(() => {
            alert('✅ پیام شما به پشتیبانی ارسال شد');
            if (window.Telegram.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
        }).catch(() => alert('❌ خطا در ارسال پیام'));
    }
}

// ============================================================
//  توابع عمومی
// ============================================================
function toggleSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.toggle('show');
}

// ============================================================
//  بستن منوها با کلیک خارج
// ============================================================
document.addEventListener('click', function(e) {
    const modal = document.getElementById('settingsModal');
    if (modal && modal.classList.contains('show') && !modal.contains(e.target) && !e.target.closest('.header-btn')) {
        modal.classList.remove('show');
    }
});

// ============================================================
//  بارگذاری تم ذخیره شده
// ============================================================
const savedTheme = localStorage.getItem('theme') || 'dark';
changeTheme(savedTheme);

console.log('✅ اپلیکیشن با موفقیت بارگذاری شد!');
