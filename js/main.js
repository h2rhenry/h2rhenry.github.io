document.addEventListener('DOMContentLoaded', () => {
    // Visitor Counter
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
                        throw new Error('API Error');
                    }
                })
                .catch(() => {
                    let visits = parseInt(localStorage.getItem('site_visits') || '1240', 10) + 1;
                    localStorage.setItem('site_visits', visits);
                    visitCountEl.textContent = visits.toLocaleString();
                });
        } else {
            fetch('https://api.counterapi.dev/v1/h2rhenry_portfolio/visits')
                .then(res => res.json())
                .then(data => {
                    if (data && typeof data.count !== 'undefined') {
                        visitCountEl.textContent = data.count.toLocaleString();
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
            }, 300);
        }
    }, 35);

    // Mobile Navigation Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    const menuBackdrop = document.getElementById('menu-backdrop');

    function toggleMenu() {
        const isActive = navLinks.classList.toggle('active');
        menuBackdrop.classList.toggle('active', isActive);
        document.body.style.overflow = isActive ? 'hidden' : '';
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMenu);
    if (menuBackdrop) menuBackdrop.addEventListener('click', toggleMenu);

    if (navLinks) {
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (navLinks.classList.contains('active')) toggleMenu();
            });
        });
    }

    // Multi-Language Toggle
    const langToggleBtn = document.getElementById('lang-toggle');
    const langLabel = document.getElementById('lang-label');

    function applyLanguage(lang) {
        document.documentElement.setAttribute('lang', lang);
        document.querySelectorAll('[data-vi]').forEach(el => {
            const text = el.getAttribute(lang === 'en' ? 'data-en' : 'data-vi');
            if (text !== null) el.innerHTML = text;
        });
        if (langLabel) langLabel.textContent = lang === 'en' ? 'EN' : 'VI';
        localStorage.setItem('lang', lang);
    }

    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            const currentLang = document.documentElement.getAttribute('lang') || 'vi';
            applyLanguage(currentLang === 'en' ? 'vi' : 'en');
        });
    }

    const savedLang = localStorage.getItem('lang');
    if (savedLang) {
        applyLanguage(savedLang);
    } else {
        applyLanguage('vi');
    }

    // Scroll Progress Bar & Active Nav Link
    const sections = document.querySelectorAll('section[id], header[id]');
    const navItems = document.querySelectorAll('.nav-links a');
    const scrollProgress = document.getElementById('scroll-progress');

    function updateScroll() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        if (scrollProgress) scrollProgress.style.width = pct + '%';

        let current = '';
        sections.forEach(section => {
            if (window.scrollY >= section.offsetTop - 150) {
                current = section.getAttribute('id');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${current}`) item.classList.add('active');
        });
    }

    window.addEventListener('scroll', updateScroll, { passive: true });

    // Scroll Animations
    const fadeElements = document.querySelectorAll('.fade-in-up:not(.hero)');
    const fadeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    fadeElements.forEach(el => fadeObserver.observe(el));

    // Skill Bar Animations
    const skillBars = document.querySelectorAll('.skill-bar-progress');
    const skillObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.width = entry.target.getAttribute('data-width');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    skillBars.forEach(bar => skillObserver.observe(bar));
});
