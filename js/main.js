    document.addEventListener('DOMContentLoaded', () => {
        // Visitor Counter Logic
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
            const hasVisited = getCookie(COOKIE_NAME) || localStorage.getItem(COOKIE_NAME);

            if (!hasVisited) {
                fetch('https://api.counterapi.dev/v1/h2rhenry_portfolio/visits/up')
                    .then(res => res.json())
                    .then(data => {
                        if (data && typeof data.count !== 'undefined') {
                            visitCountEl.textContent = data.count.toLocaleString();
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
                fetch('https://api.counterapi.dev/v1/h2rhenry_portfolio/visits')
                    .then(res => res.json())
                    .then(data => {
                        if (data && typeof data.count !== 'undefined') {
                            visitCountEl.textContent = data.count.toLocaleString();
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

            const spotify = data.spotify;
            const activity = (data.activities || []).find(a => a.type === 0);

            if (spotify && spotifyPlayer) {
                if (discordActivity) discordActivity.textContent = lang === 'en' ? '🎧 Listening to Spotify' : '🎧 Đang nghe Spotify';
                if (spotifyArt) spotifyArt.src = spotify.album_art_url || '';
                if (spotifyTrack) spotifyTrack.textContent = spotify.song || '';
                if (spotifyArtist) spotifyArtist.textContent = spotify.artist || '';
                if (spotifyWaveform) spotifyWaveform.classList.add('playing');
                spotifyPlayer.style.display = 'flex';
                updateSpotifyProgress();
            } else {
                if (spotifyWaveform) spotifyWaveform.classList.remove('playing');
                if (spotifyPlayer) spotifyPlayer.style.display = 'none';

                if (discordActivity) {
                    if (activity) {
                        discordActivity.textContent = (lang === 'en' ? '🎮 Playing ' : '🎮 Đang chơi ') + activity.name;
                    } else {
                        const label = statusLabels[status] || statusLabels.offline;
                        discordActivity.textContent = label[lang];
                    }
                }
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

        // Nav Link Auto Close Mobile Menu
        if (navLinks) {
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
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
    });

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        });
    }
