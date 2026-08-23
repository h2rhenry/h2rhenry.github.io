    document.addEventListener('DOMContentLoaded', () => {
        const visitCountEl = document.getElementById('visit-count');
        if (visitCountEl) {
            const getCookie = (name) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
                return null;
            };

            const setCookie = (name, value, days = 1) => {
                const date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
            };

            const COOKIE_NAME = 'h2r_visited_portfolio';
            const COUNTER_KEY = 'h2rhenry_portfolio_visits';
            const hasVisited = getCookie(COOKIE_NAME) || localStorage.getItem(COOKIE_NAME);

            if (!hasVisited) {
                fetch(`https://countapi.mileshilliard.com/api/v1/hit/${COUNTER_KEY}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && typeof data.value !== 'undefined') {
                            const visits = Number(data.value);
                            visitCountEl.textContent = visits.toLocaleString();
                            localStorage.setItem('site_visits', visits);
                            setCookie(COOKIE_NAME, 'true', 1);
                            localStorage.setItem(COOKIE_NAME, 'true');
                        } else {
                            throw new Error('API format invalid');
                        }
                    })
                    .catch(() => {
                        let visits = parseInt(localStorage.getItem('site_visits') || '1240', 10) + 1;
                        localStorage.setItem('site_visits', visits);
                        visitCountEl.textContent = visits.toLocaleString();
                        setCookie(COOKIE_NAME, 'true', 1);
                        localStorage.setItem(COOKIE_NAME, 'true');
                    });
            } else {
                fetch(`https://countapi.mileshilliard.com/api/v1/get/${COUNTER_KEY}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && typeof data.value !== 'undefined') {
                            const visits = Number(data.value);
                            visitCountEl.textContent = visits.toLocaleString();
                            localStorage.setItem('site_visits', visits);
                        } else {
                            throw new Error('API format invalid');
                        }
                    })
                    .catch(() => {
                        let visits = parseInt(localStorage.getItem('site_visits') || '1240', 10);
                        visitCountEl.textContent = visits.toLocaleString();
                    });
            }
        }

        // Preloader Logic
        const loaderBar = document.getElementById('loader-bar');
        const loaderStatus = document.getElementById('loader-status');
        const preloader = document.getElementById('preloader');

        let progress = 0;
        const loadingInterval = setInterval(() => {
            progress += Math.floor(Math.random() * 15) + 8;
            if (progress > 100) progress = 100;
            
            if (loaderBar) loaderBar.style.width = `${progress}%`;
            if (loaderStatus) loaderStatus.innerText = `INITIALIZING SYSTEM... ${progress}%`;

            if (progress >= 100) {
                clearInterval(loadingInterval);
                setTimeout(() => {
                    if (preloader) preloader.classList.add('loaded');
                    const hero = document.querySelector('.hero');
                    if (hero) hero.classList.add('visible');
                }, 400);
            }
        }, 50);

        // Mobile Navigation Toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const navLinks = document.getElementById('nav-links');
        const menuBackdrop = document.getElementById('menu-backdrop');

        function toggleMenu() {
            const isActive = navLinks.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active', isActive);
            menuBackdrop.classList.toggle('active', isActive);
            document.body.style.overflow = isActive ? 'hidden' : '';
        }

        if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMenu);
        if (menuBackdrop) menuBackdrop.addEventListener('click', toggleMenu);

        // Multi-Language Toggle
        const langToggleBtn = document.getElementById('lang-toggle');
        const langLabel = document.getElementById('lang-label');

        function applyLanguage(lang) {
            document.documentElement.setAttribute('lang', lang);
            document.querySelectorAll('[data-vi]').forEach(el => {
                const text = el.getAttribute(lang === 'en' ? 'data-en' : 'data-vi');
                if (text !== null) el.innerHTML = text;
            });
            document.querySelectorAll('[data-aria-vi]').forEach(el => {
                const label = el.getAttribute(lang === 'en' ? 'data-aria-en' : 'data-aria-vi');
                if (label !== null) el.setAttribute('aria-label', label);
            });
            if (langLabel) langLabel.textContent = lang === 'en' ? 'EN' : 'VI';
            localStorage.setItem('lang', lang);
        }

        if (langToggleBtn) {
            langToggleBtn.addEventListener('click', () => {
                const currentLang = document.documentElement.getAttribute('lang') || 'vi';
                const nextLang = currentLang === 'en' ? 'vi' : 'en';
                applyLanguage(nextLang);
                renderDiscordStatus(lastDiscordData);
            });
        }

        const savedLang = localStorage.getItem('lang');
        if (savedLang) {
            applyLanguage(savedLang);
        } else {
            fetch('https://ipwho.is/')
                .then(res => res.json())
                .then(data => {
                    const guessedLang = (data && data.country_code && data.country_code !== 'VN') ? 'en' : 'vi';
                    applyLanguage(guessedLang);
                })
                .catch(() => applyLanguage('vi'));
        }

        // Lanyard API & Spotify Integration
        const DISCORD_USER_ID = '1320923672034148482';
        const discordAvatar = document.getElementById('discord-avatar');
        const discordDot = document.getElementById('discord-status-dot');
        const discordName = document.getElementById('discord-username');
        const discordActivity = document.getElementById('discord-activity');
        const spotifyPlayer = document.getElementById('spotify-player');
        const spotifyArt = document.getElementById('spotify-art');
        const spotifyTrack = document.getElementById('spotify-track');
        const spotifyArtist = document.getElementById('spotify-artist');
        const spotifyProgressFill = document.getElementById('spotify-progress-fill');
        const spotifyTimeCurrent = document.getElementById('spotify-time-current');
        const spotifyTimeTotal = document.getElementById('spotify-time-total');
        const spotifyWaveform = document.getElementById('spotify-waveform');
        const discordCustomStatus = document.getElementById('discord-custom-status');
        const gameCard = document.getElementById('discord-game-card');
        const gameIcon = document.getElementById('discord-game-icon');
        const gameBadge = document.getElementById('discord-game-badge');
        const gameName = document.getElementById('discord-game-name');
        const gameDetails = document.getElementById('discord-game-details');
        const gameState = document.getElementById('discord-game-state');
        const gameElapsed = document.getElementById('discord-game-elapsed');

        let lastDiscordData = null;

        function getCurrentLang() {
            return document.documentElement.getAttribute('lang') || 'vi';
        }

        const statusLabels = {
            online: { vi: 'Trực tuyến', en: 'Online' },
            idle: { vi: 'Treo máy', en: 'Idle' },
            dnd: { vi: 'Không làm phiền', en: 'Do Not Disturb' },
            offline: { vi: 'Ngoại tuyến', en: 'Offline' }
        };

        function formatMs(ms) {
            const totalSeconds = Math.max(0, Math.floor(ms / 1000));
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return minutes + ':' + String(seconds).padStart(2, '0');
        }

        function formatElapsed(ms) {
            const totalSeconds = Math.max(0, Math.floor(ms / 1000));
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;
            if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            return `${m}:${String(s).padStart(2, '0')}`;
        }

        // Ảnh Rich Presence có thể là ID app-asset của Discord, hoặc bắt đầu bằng
        // "mp:" (external media proxy) — cần dựng URL khác nhau cho từng trường hợp.
        function discordAssetUrl(applicationId, assetKey, size = 128) {
            if (!assetKey) return null;
            if (assetKey.startsWith('mp:')) {
                return `https://media.discordapp.net/${assetKey.slice(3)}`;
            }
            if (assetKey.startsWith('spotify:')) {
                return `https://i.scdn.co/image/${assetKey.slice(8)}`;
            }
            return `https://cdn.discordapp.com/app-assets/${applicationId}/${assetKey}.png?size=${size}`;
        }

        function updateSpotifyProgress() {
            if (!lastDiscordData || !lastDiscordData.spotify || !lastDiscordData.spotify.timestamps) return;
            const { start, end } = lastDiscordData.spotify.timestamps;
            if (!start || !end) return;

            const now = Date.now();
            const total = end - start;
            const elapsed = Math.min(total, Math.max(0, now - start));
            if (spotifyProgressFill) spotifyProgressFill.style.width = (elapsed / total * 100) + '%';
            if (spotifyTimeCurrent) spotifyTimeCurrent.textContent = formatMs(elapsed);
            if (spotifyTimeTotal) spotifyTimeTotal.textContent = formatMs(total);
        }

        function updateGameElapsed() {
            if (!lastDiscordData) return;
            const activity = (lastDiscordData.activities || []).find(a => a.type === 0);
            if (!activity || !activity.timestamps || !activity.timestamps.start || !gameElapsed) return;
            const lang = getCurrentLang();
            const elapsed = Date.now() - activity.timestamps.start;
            if (elapsed < 0) return;
            gameElapsed.style.display = 'block';
            gameElapsed.textContent = (lang === 'en' ? '⏱ ' : '⏱ Đã chơi ') + formatElapsed(elapsed);
        }

        // Bản đồ icon dự phòng cho các game KHÔNG có Rich Presence assets thật từ
        // Discord (ví dụ Minecraft bản vanilla: Discord chỉ tự nhận diện tên tiến
        // trình đang chạy trên máy, không gửi kèm ảnh qua API cho bên thứ ba).
        // Icon đó Henry thấy trong app Discord là do chính app tra cứu ngầm từ một
        // danh sách nội bộ, không public qua Lanyard/API nên không thể lấy tự động.
        //
        // Cách thêm game mới: lưu 1 ảnh vuông (khuyên dùng 128x128, do Henry tự
        // chuẩn bị/có quyền sử dụng) vào thư mục assets/game-icons/ trong repo,
        // rồi thêm 1 dòng vào bảng dưới — key là TÊN GAME viết thường, đúng như
        // Discord hiển thị (activity.name).
        const GAME_ICON_OVERRIDES = {
            'minecraft': '/assets/game-icons/minecraft.png',
        };

        function resolveGameIconUrl(activity) {
            const richUrl = discordAssetUrl(activity.application_id, (activity.assets || {}).large_image);
            if (richUrl) return richUrl;
            const key = (activity.name || '').trim().toLowerCase();
            return GAME_ICON_OVERRIDES[key] || null;
        }

        function renderDiscordStatus(data) {
            if (!data) return;
            const lang = getCurrentLang();
            const user = data.discord_user;

            if (user && discordName && discordAvatar) {
                discordName.textContent = user.global_name || user.username;
                discordAvatar.src = user.avatar
                    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
                    : `https://cdn.discordapp.com/embed/avatars/0.png`;
            }

            const status = data.discord_status || 'offline';
            if (discordDot) discordDot.className = 'discord-status-dot ' + status;

            const activities = data.activities || [];
            const spotify = data.spotify;
            const gameActivity = activities.find(a => a.type === 0);
            const customStatus = activities.find(a => a.type === 4);

            // --- Custom status (dòng chữ trạng thái tự đặt, có thể kèm emoji) ---
            if (discordCustomStatus) {
                if (customStatus && (customStatus.state || customStatus.emoji)) {
                    let html = '';
                    if (customStatus.emoji) {
                        if (customStatus.emoji.id) {
                            const ext = customStatus.emoji.animated ? 'gif' : 'png';
                            html += `<img class="emoji" src="https://cdn.discordapp.com/emojis/${customStatus.emoji.id}.${ext}" alt="">`;
                        } else if (customStatus.emoji.name) {
                            html += customStatus.emoji.name + ' ';
                        }
                    }
                    html += (customStatus.state || '');
                    discordCustomStatus.innerHTML = html;
                    discordCustomStatus.style.display = 'block';
                } else {
                    discordCustomStatus.style.display = 'none';
                }
            }

            // --- Trạng thái chữ ngắn gọn cạnh avatar ---
            if (discordActivity) {
                if (spotify) {
                    discordActivity.textContent = lang === 'en' ? '🎧 Listening to Spotify' : '🎧 Đang nghe Spotify';
                } else if (gameActivity) {
                    discordActivity.textContent = (lang === 'en' ? '🎮 Playing ' : '🎮 Đang chơi ') + gameActivity.name;
                } else {
                    const label = statusLabels[status] || statusLabels.offline;
                    discordActivity.textContent = label[lang];
                }
            }

            // --- Spotify player ---
            if (spotify && spotifyPlayer) {
                if (spotifyArt) spotifyArt.src = spotify.album_art_url || '';
                if (spotifyTrack) spotifyTrack.textContent = spotify.song || '';
                if (spotifyArtist) spotifyArtist.textContent = spotify.artist || '';
                if (spotifyWaveform) spotifyWaveform.classList.add('playing');
                spotifyPlayer.style.display = 'flex';
                updateSpotifyProgress();
            } else {
                if (spotifyWaveform) spotifyWaveform.classList.remove('playing');
                if (spotifyPlayer) spotifyPlayer.style.display = 'none';
            }

            // --- Game Rich Presence card (đầy đủ như popup Discord: icon, badge, details, state, thời gian) ---
            if (gameActivity && gameCard) {
                const appId = gameActivity.application_id;
                const assets = gameActivity.assets || {};
                const smallUrl = discordAssetUrl(appId, assets.small_image);
                const iconUrl = resolveGameIconUrl(gameActivity);

                if (gameIcon) {
                    gameIcon.onerror = null;
                    if (iconUrl) {
                        gameIcon.src = iconUrl;
                        gameIcon.alt = assets.large_text || gameActivity.name;
                        // Nếu icon (rich presence hoặc file tự host) lỗi/thiếu -> rơi về icon mặc định
                        gameIcon.onerror = () => {
                            gameIcon.onerror = null;
                            gameIcon.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                        };
                    } else {
                        // Không có icon rich presence lẫn icon dự phòng -> icon mặc định
                        gameIcon.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                        gameIcon.alt = gameActivity.name;
                    }
                }
                if (gameBadge) {
                    if (smallUrl) {
                        gameBadge.src = smallUrl;
                        gameBadge.alt = assets.small_text || '';
                        gameBadge.style.display = 'block';
                    } else {
                        gameBadge.style.display = 'none';
                    }
                }
                if (gameName) gameName.textContent = gameActivity.name || '';
                if (gameDetails) {
                    if (gameActivity.details) { gameDetails.textContent = gameActivity.details; gameDetails.style.display = 'block'; }
                    else gameDetails.style.display = 'none';
                }
                if (gameState) {
                    if (gameActivity.state) { gameState.textContent = gameActivity.state; gameState.style.display = 'block'; }
                    else gameState.style.display = 'none';
                }
                gameCard.style.display = 'flex';
                updateGameElapsed();
            } else if (gameCard) {
                gameCard.style.display = 'none';
                if (gameElapsed) gameElapsed.style.display = 'none';
            }
        }

        function fetchDiscordStatus() {
            fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`)
                .then(res => res.json())
                .then(json => {
                    if (json && json.success && json.data) {
                        lastDiscordData = json.data;
                        renderDiscordStatus(lastDiscordData);
                    } else {
                        if (discordActivity) discordActivity.textContent = getCurrentLang() === 'en' ? 'Status unavailable' : 'Không lấy được trạng thái';
                    }
                })
                .catch(() => {
                    if (discordActivity) discordActivity.textContent = getCurrentLang() === 'en' ? 'Status unavailable' : 'Không lấy được trạng thái';
                });
        }

        fetchDiscordStatus();
        setInterval(fetchDiscordStatus, 20000);
        setInterval(updateSpotifyProgress, 1000);
        setInterval(updateGameElapsed, 1000);

        // Smooth Scroll To Section Without Leaving #hash In The URL
        const navbarEl = document.querySelector('.navbar');

        function scrollToSection(targetEl) {
            const navbarHeight = navbarEl ? navbarEl.offsetHeight : 0;
            const targetY = targetEl.getBoundingClientRect().top + window.scrollY - navbarHeight - 10;
            window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
        }

        if (navLinks) {
            navLinks.querySelectorAll('a[href^="#"]').forEach(link => {
                link.addEventListener('click', (e) => {
                    const targetId = link.getAttribute('href').slice(1);
                    const targetEl = document.getElementById(targetId);

                    if (targetEl) {
                        e.preventDefault();
                        scrollToSection(targetEl);
                        // Xoá/không thêm #id vào URL, tránh mất thẩm mỹ
                        history.replaceState(null, '', window.location.pathname + window.location.search);
                    }

                    if (navLinks.classList.contains('active')) {
                        toggleMenu();
                    }
                });
            });
        }

        // Scroll Active Navigation Highlight
        const sections = document.querySelectorAll('header[id], section[id]');
        const navItems = document.querySelectorAll('.nav-links a');

        function updateActiveNav() {
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 140;
                if (window.scrollY >= sectionTop) {
                    current = section.getAttribute('id');
                }
            });

            navItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('href') === `#${current}`) {
                    item.classList.add('active');
                }
            });
        }

        // Intersection Observer for Smooth Fade In
        const fadeElements = document.querySelectorAll('.fade-in-up:not(.hero)');
        const fadeObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

        fadeElements.forEach(el => fadeObserver.observe(el));

        // Skill Progress Bar Animation
        const skillBars = document.querySelectorAll('.skill-bar-progress');
        const skillObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const bar = entry.target;
                    bar.style.width = bar.getAttribute('data-width');
                    observer.unobserve(bar);
                }
            });
        }, { threshold: 0.5 });

        skillBars.forEach(bar => skillObserver.observe(bar));

        // Background Particle Canvas System
        const canvas = document.getElementById('particles-bg');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            let particlesArray = [];
            let animationFrameId;
            let isTabActive = true;

            const mouse = {
                x: null,
                y: null,
                radius: 140
            };

            window.addEventListener('mousemove', (e) => {
                mouse.x = e.clientX;
                mouse.y = e.clientY;
            });

            window.addEventListener('mouseleave', () => {
                mouse.x = null;
                mouse.y = null;
            });

            function setCanvasSize() {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            class Particle {
                constructor() {
                    this.x = Math.random() * canvas.width;
                    this.y = Math.random() * canvas.height;
                    this.size = Math.random() * 2.5 + 1;
                    this.speedX = (Math.random() - 0.5) * 0.8;
                    this.speedY = (Math.random() - 0.5) * 0.8;
                    this.color = Math.random() > 0.5 ? '#00d2ff' : '#9b5de5';
                    this.baseAlpha = Math.random() * 0.5 + 0.3;
                    this.alpha = this.baseAlpha;
                    this.pulseSpeed = Math.random() * 0.015 + 0.005;
                }

                update() {
                    this.x += this.speedX;
                    this.y += this.speedY;

                    if (this.x < 0 || this.x > canvas.width) this.speedX = -this.speedX;
                    if (this.y < 0 || this.y > canvas.height) this.speedY = -this.speedY;

                    this.alpha += this.pulseSpeed;
                    if (this.alpha > 0.9 || this.alpha < 0.2) {
                        this.pulseSpeed = -this.pulseSpeed;
                    }

                    if (mouse.x !== null && mouse.y !== null) {
                        let dx = mouse.x - this.x;
                        let dy = mouse.y - this.y;
                        let distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < mouse.radius) {
                            const force = (mouse.radius - distance) / mouse.radius;
                            const angle = Math.atan2(dy, dx);
                            this.x -= Math.cos(angle) * force * 3;
                            this.y -= Math.sin(angle) * force * 3;
                        }
                    }
                }

                draw() {
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fillStyle = this.color;
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = this.color;
                    ctx.fill();
                    ctx.restore();
                }
            }

            function initParticles() {
                particlesArray = [];
                const numberOfParticles = Math.min(Math.floor((canvas.width * canvas.height) / 9000), 95);
                for (let i = 0; i < numberOfParticles; i++) {
                    particlesArray.push(new Particle());
                }
            }

            function connectParticles() {
                const maxDistance = 125;
                for (let a = 0; a < particlesArray.length; a++) {
                    for (let b = a + 1; b < particlesArray.length; b++) {
                        let dx = particlesArray[a].x - particlesArray[b].x;
                        let dy = particlesArray[a].y - particlesArray[b].y;
                        let distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < maxDistance) {
                            let opacity = (1 - distance / maxDistance) * 0.35;
                            ctx.save();
                            ctx.globalAlpha = opacity;
                            ctx.lineWidth = 1;

                            let gradient = ctx.createLinearGradient(
                                particlesArray[a].x, particlesArray[a].y,
                                particlesArray[b].x, particlesArray[b].y
                            );
                            gradient.addColorStop(0, particlesArray[a].color);
                            gradient.addColorStop(1, particlesArray[b].color);

                            ctx.strokeStyle = gradient;
                            ctx.beginPath();
                            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                            ctx.stroke();
                            ctx.restore();
                        }
                    }
                }
            }

            function animateParticles() {
                if (!isTabActive) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                for (let i = 0; i < particlesArray.length; i++) {
                    particlesArray[i].update();
                    particlesArray[i].draw();
                }

                connectParticles();
                animationFrameId = requestAnimationFrame(animateParticles);
            }

            window.addEventListener('resize', () => {
                setCanvasSize();
                initParticles();
            });

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    isTabActive = false;
                    cancelAnimationFrame(animationFrameId);
                } else {
                    isTabActive = true;
                    cancelAnimationFrame(animationFrameId);
                    animateParticles();
                }
            });

            setCanvasSize();
            initParticles();
            animateParticles();
        }

        // Scroll Progress Bar
        const scrollProgress = document.getElementById('scroll-progress');
        function updateScrollProgress() {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            if (scrollProgress) scrollProgress.style.width = pct + '%';
            updateActiveNav();
        }

        window.addEventListener('scroll', updateScrollProgress, { passive: true });
        window.addEventListener('resize', updateScrollProgress);
        updateScrollProgress();

        // Cursor Particle Effects on Desktop
        if (window.matchMedia('(pointer: fine)').matches) {
            let lastParticleTime = 0;
            document.addEventListener('mousemove', (e) => {
                const now = Date.now();
                if (now - lastParticleTime < 40) return;
                lastParticleTime = now;

                const particle = document.createElement('div');
                particle.className = 'cursor-particle';
                particle.style.left = e.clientX + 'px';
                particle.style.top = e.clientY + 'px';
                document.body.appendChild(particle);
                particle.addEventListener('animationend', () => particle.remove());
            });
        }

        // ============================================================
        // Music Player (nhạc nền website)
        //
        // HƯỚNG DẪN THÊM NHẠC:
        // 1. Tạo thư mục chứa file nhạc trong repo, ví dụ: assets/music/
        //    rồi bỏ các file .mp3 vào đó.
        // 2. Đổi giá trị MUSIC_FOLDER bên dưới thành đường dẫn thư mục đó
        //    (luôn kết thúc bằng dấu "/").
        // 3. (Tuỳ chọn) Nếu muốn để ảnh bìa trong MỘT thư mục riêng, ví dụ
        //    assets/music/covers/, đổi MUSIC_COVER_FOLDER thành đường dẫn đó.
        // 4. Thêm mỗi bài hát vào mảng PLAYLIST theo mẫu:
        //      {
        //          title: 'Tên bài hát',
        //          artist: 'Tên ca sĩ / nguồn',
        //          src: 'ten-file.mp3',      // tên file trong MUSIC_FOLDER
        //          cover: 'ten-anh-bia.jpg'  // (tuỳ chọn) tên file trong MUSIC_COVER_FOLDER
        //      }
        //    Với "cover", có 3 cách dùng:
        //      - Để trống ''            -> dùng icon đĩa nhạc mặc định.
        //      - Chỉ tên file, ví dụ 'bia1.jpg' -> tự động ghép với MUSIC_COVER_FOLDER.
        //      - Dán thẳng link ảnh online (bắt đầu bằng "http") -> dùng nguyên link đó,
        //        KHÔNG ghép với MUSIC_COVER_FOLDER.
        // Danh sách để trống -> khung nghe nhạc vẫn hiển thị nhưng ở trạng thái
        // "Chưa có bài hát", không có gì phát cho tới khi bạn điền dữ liệu.
        // ============================================================
        const MUSIC_FOLDER = 'assets/music/';
        const MUSIC_COVER_FOLDER = 'assets/music/covers/';
        const PLAYLIST = [
            { title: 'Nevada', artist: 'Vicetone', src: 'Nevada.mp3', cover: '1.webp' },
            // { title: 'Tên bài hát 2', artist: 'Nghệ sĩ', src: 'bai-hat-2.mp3', cover: '' },
        ];

        function resolveMusicCoverUrl(cover) {
            if (!cover) return '';
            if (/^https?:\/\//i.test(cover)) return cover;
            return MUSIC_COVER_FOLDER + cover;
        }

        (function initMusicPlayer() {
            const player = document.getElementById('music-player');
            if (!player) return;

            const audio = new Audio();
            audio.preload = 'metadata';

            const artWrap = document.getElementById('music-art-wrap');
            const artImg = document.getElementById('music-art');
            const artFallback = document.getElementById('music-art-fallback');
            const eq = document.getElementById('music-eq');
            const trackEl = document.getElementById('music-track');
            const artistEl = document.getElementById('music-artist');
            const timeCurrentEl = document.getElementById('music-time-current');
            const timeTotalEl = document.getElementById('music-time-total');
            const progressBg = document.getElementById('music-progress-bg');
            const progressFill = document.getElementById('music-progress-fill');
            const playBtn = document.getElementById('music-play');
            const playIcon = document.getElementById('music-play-icon');
            const prevBtn = document.getElementById('music-prev');
            const nextBtn = document.getElementById('music-next');
            const shuffleBtn = document.getElementById('music-shuffle');
            const repeatBtn = document.getElementById('music-repeat');
            const volumeSlider = document.getElementById('music-volume-slider');
            const playlistToggle = document.getElementById('music-playlist-toggle');
            const playlistEl = document.getElementById('music-playlist');

            let currentIndex = -1;
            let isShuffle = false;
            let isRepeat = false;

            function formatTime(sec) {
                if (!isFinite(sec) || sec < 0) sec = 0;
                const m = Math.floor(sec / 60);
                const s = Math.floor(sec % 60);
                return `${m}:${s.toString().padStart(2, '0')}`;
            }

            function renderEmptyPlaylist() {
                const lang = getCurrentLang();
                playlistEl.innerHTML = `<div class="music-playlist-empty" data-vi="Chưa có bài hát nào trong danh sách phát." data-en="No tracks in the playlist yet.">${lang === 'en' ? 'No tracks in the playlist yet.' : 'Chưa có bài hát nào trong danh sách phát.'}</div>`;
            }

            function renderPlaylist() {
                if (!PLAYLIST.length) {
                    renderEmptyPlaylist();
                    return;
                }
                playlistEl.innerHTML = PLAYLIST.map((track, i) => `
                    <button type="button" class="music-playlist-item${i === currentIndex ? ' active' : ''}" data-index="${i}">
                        <i class="fas ${i === currentIndex ? 'fa-volume-high' : 'fa-music'}"></i>
                        <span class="music-playlist-item-title">${track.title}</span>
                        <span class="music-playlist-item-artist">${track.artist || ''}</span>
                    </button>
                `).join('');

                playlistEl.querySelectorAll('.music-playlist-item').forEach(item => {
                    item.addEventListener('click', () => {
                        loadTrack(parseInt(item.dataset.index, 10), true);
                    });
                });
            }

            function setPlayingVisual(playing) {
                if (artWrap) artWrap.classList.toggle('playing', playing);
                if (eq) eq.classList.toggle('playing', playing);
                if (playIcon) playIcon.className = playing ? 'fas fa-pause' : 'fas fa-play';
            }

            function loadTrack(index, autoplay) {
                if (!PLAYLIST.length) return;
                if (index < 0) index = PLAYLIST.length - 1;
                if (index >= PLAYLIST.length) index = 0;
                currentIndex = index;

                const track = PLAYLIST[currentIndex];
                audio.src = MUSIC_FOLDER + track.src;
                trackEl.textContent = track.title;
                artistEl.textContent = track.artist || '';

                if (track.cover) {
                    artImg.src = resolveMusicCoverUrl(track.cover);
                    artImg.style.display = 'block';
                    artFallback.style.display = 'none';
                } else {
                    artImg.style.display = 'none';
                    artFallback.style.display = 'flex';
                }

                renderPlaylist();

                if (autoplay) {
                    audio.play().catch(() => setPlayingVisual(false));
                }
            }

            function togglePlay() {
                if (!PLAYLIST.length) return;
                if (currentIndex === -1) {
                    loadTrack(isShuffle ? Math.floor(Math.random() * PLAYLIST.length) : 0, true);
                    return;
                }
                if (audio.paused) {
                    audio.play().catch(() => {});
                } else {
                    audio.pause();
                }
            }

            function playNext(manual) {
                if (!PLAYLIST.length) return;
                if (isShuffle && PLAYLIST.length > 1) {
                    let next = currentIndex;
                    while (next === currentIndex) next = Math.floor(Math.random() * PLAYLIST.length);
                    loadTrack(next, true);
                } else {
                    loadTrack(currentIndex + 1, true);
                }
            }

            function playPrev() {
                if (!PLAYLIST.length) return;
                loadTrack(currentIndex - 1, true);
            }

            if (!PLAYLIST.length) {
                renderEmptyPlaylist();
            }

            if (playBtn) playBtn.addEventListener('click', togglePlay);
            if (nextBtn) nextBtn.addEventListener('click', () => playNext(true));
            if (prevBtn) prevBtn.addEventListener('click', playPrev);

            if (shuffleBtn) {
                shuffleBtn.addEventListener('click', () => {
                    isShuffle = !isShuffle;
                    shuffleBtn.classList.toggle('active', isShuffle);
                });
            }

            if (repeatBtn) {
                repeatBtn.addEventListener('click', () => {
                    isRepeat = !isRepeat;
                    repeatBtn.classList.toggle('active', isRepeat);
                    audio.loop = isRepeat;
                });
            }

            if (volumeSlider) {
                audio.volume = volumeSlider.value / 100;
                volumeSlider.addEventListener('input', () => {
                    audio.volume = volumeSlider.value / 100;
                });
            }

            if (playlistToggle) {
                playlistToggle.addEventListener('click', () => {
                    const isOpen = playlistEl.classList.toggle('open');
                    playlistToggle.classList.toggle('active', isOpen);
                });
            }

            if (progressBg) {
                progressBg.addEventListener('click', (e) => {
                    if (!audio.duration) return;
                    const rect = progressBg.getBoundingClientRect();
                    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                    audio.currentTime = ratio * audio.duration;
                });
            }

            audio.addEventListener('play', () => setPlayingVisual(true));
            audio.addEventListener('pause', () => setPlayingVisual(false));
            audio.addEventListener('ended', () => {
                if (!isRepeat) playNext(false);
            });

            audio.addEventListener('timeupdate', () => {
                if (!audio.duration) return;
                progressFill.style.width = (audio.currentTime / audio.duration * 100) + '%';
                timeCurrentEl.textContent = formatTime(audio.currentTime);
            });

            audio.addEventListener('loadedmetadata', () => {
                timeTotalEl.textContent = formatTime(audio.duration);
            });
        })();

        // ============================================================
        // Secret Hidden-Pages Menu
        // Kích hoạt: giữ tổ hợp phím Ctrl + Alt + Shift (Desktop)
        //            hoặc chạm nút chấm ẩn ở cuối trang (Mobile)
        // Muốn thêm trang ẩn mới? Chỉ cần thêm 1 object vào mảng bên dưới.
        // ============================================================
        const HIDDEN_PAGES = [
            {
                icon: 'fas fa-square-root-variable',
                url: "/study-corner/Newton's-binomial-theorem/",
                titleVi: 'Tam Giác Pascal & Nhị Thức Newton',
                titleEn: "Pascal's Triangle & Newton's Binomial",
                descVi: 'Mô phỏng hệ số nhị thức & khai triển Newton tới n = 50.',
                descEn: 'Binomial coefficient simulator & Newton expansion up to n = 50.'
            }
            // Thêm trang ẩn khác tại đây...
        ];

        let secretMenuBackdropEl = null;
        let secretMenuLastFocus = null;

        function buildSecretMenu() {
            if (secretMenuBackdropEl) return;

            const backdrop = document.createElement('div');
            backdrop.className = 'secret-menu-backdrop';
            backdrop.id = 'secret-menu-backdrop';

            const cardsHtml = HIDDEN_PAGES.map(page => `
                <a class="secret-menu-card" href="${page.url}">
                    <div class="secret-menu-card-icon"><i class="${page.icon}"></i></div>
                    <div class="secret-menu-card-text">
                        <h3 data-vi="${page.titleVi}" data-en="${page.titleEn}">${page.titleVi}</h3>
                        <p data-vi="${page.descVi}" data-en="${page.descEn}">${page.descVi}</p>
                    </div>
                    <i class="fas fa-arrow-right secret-menu-card-arrow"></i>
                </a>
            `).join('');

            backdrop.innerHTML = `
                <div class="secret-menu" role="dialog" aria-modal="true" aria-labelledby="secret-menu-title">
                    <button class="secret-menu-close" id="secret-menu-close" aria-label="Đóng" data-aria-vi="Đóng" data-aria-en="Close">
                        <i class="fas fa-xmark"></i>
                    </button>
                    <div class="secret-menu-header">
                        <div class="secret-menu-tag">// SYSTEM.ACCESS_GRANTED</div>
                        <h2 id="secret-menu-title" data-vi="Trang Ẩn" data-en="Hidden Pages">Trang Ẩn</h2>
                        <p data-vi="Khu vực riêng tư, không xuất hiện trong menu chính." data-en="A private area, not listed in the main menu.">Khu vực riêng tư, không xuất hiện trong menu chính.</p>
                    </div>
                    <div class="secret-menu-grid">${cardsHtml}</div>
                </div>
            `;

            document.body.appendChild(backdrop);
            secretMenuBackdropEl = backdrop;

            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) closeSecretMenu();
            });
            backdrop.querySelector('#secret-menu-close').addEventListener('click', closeSecretMenu);

            applyLanguage(getCurrentLang());
        }

        function openSecretMenu() {
            buildSecretMenu();
            secretMenuLastFocus = document.activeElement;
            secretMenuBackdropEl.classList.add('active');
            document.body.style.overflow = 'hidden';
            const closeBtn = secretMenuBackdropEl.querySelector('#secret-menu-close');
            if (closeBtn) closeBtn.focus();
        }

        function closeSecretMenu() {
            if (!secretMenuBackdropEl || !secretMenuBackdropEl.classList.contains('active')) return;
            secretMenuBackdropEl.classList.remove('active');
            document.body.style.overflow = '';
            if (secretMenuLastFocus && typeof secretMenuLastFocus.focus === 'function') {
                secretMenuLastFocus.focus();
            }
        }

        function toggleSecretMenu() {
            if (secretMenuBackdropEl && secretMenuBackdropEl.classList.contains('active')) {
                closeSecretMenu();
            } else {
                openSecretMenu();
            }
        }

        // Bắt tổ hợp phím Ctrl + Alt + Shift: chỉ kích hoạt khi CẢ BA cùng
        // chuyển sang trạng thái được giữ (tránh việc lặp lại do giữ phím lâu)
        const secretModState = { ctrl: false, alt: false, shift: false };
        let secretComboArmed = false;

        function evaluateSecretCombo() {
            const allDown = secretModState.ctrl && secretModState.alt && secretModState.shift;
            if (allDown && !secretComboArmed) {
                secretComboArmed = true;
                toggleSecretMenu();
            } else if (!allDown) {
                secretComboArmed = false;
            }
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Control') secretModState.ctrl = true;
            else if (e.key === 'Alt') secretModState.alt = true;
            else if (e.key === 'Shift') secretModState.shift = true;
            else return;
            evaluateSecretCombo();
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'Control') secretModState.ctrl = false;
            else if (e.key === 'Alt') secretModState.alt = false;
            else if (e.key === 'Shift') secretModState.shift = false;
        });

        window.addEventListener('blur', () => {
            secretModState.ctrl = secretModState.alt = secretModState.shift = false;
            secretComboArmed = false;
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeSecretMenu();
        });

        const secretAccessDot = document.getElementById('secret-access-dot');
        if (secretAccessDot) {
            secretAccessDot.addEventListener('click', toggleSecretMenu);
        }
    });

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        });

        // Khi có bản Service Worker mới giành quyền kiểm soát trang (nghĩa là
        // vừa có bản cập nhật được cài xong), tự tải lại trang MỘT LẦN để
        // người dùng luôn thấy phiên bản mới nhất mà không cần tự xoá cache.
        let swRefreshed = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (swRefreshed) return;
            swRefreshed = true;
            window.location.reload();
        });
    }
