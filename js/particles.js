document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('particles-bg');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particlesArray = [];
        let animationFrameId;
        let isTabActive = true;

        const mouse = { x: null, y: null, radius: 130 };

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
                this.size = Math.random() * 2 + 1;
                this.speedX = (Math.random() - 0.5) * 0.7;
                this.speedY = (Math.random() - 0.5) * 0.7;
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
                if (this.alpha > 0.85 || this.alpha < 0.2) this.pulseSpeed = -this.pulseSpeed;

                if (mouse.x !== null && mouse.y !== null) {
                    let dx = mouse.x - this.x;
                    let dy = mouse.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < mouse.radius) {
                        const force = (mouse.radius - distance) / mouse.radius;
                        const angle = Math.atan2(dy, dx);
                        this.x -= Math.cos(angle) * force * 2.5;
                        this.y -= Math.sin(angle) * force * 2.5;
                    }
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.restore();
            }
        }

        function initParticles() {
            particlesArray = [];
            const isMobile = window.innerWidth < 768;
            const maxParticles = isMobile ? 35 : 65;
            const numberOfParticles = Math.min(Math.floor((canvas.width * canvas.height) / 12000), maxParticles);
            for (let i = 0; i < numberOfParticles; i++) {
                particlesArray.push(new Particle());
            }
        }

        function connectParticles() {
            const maxDistance = 110;
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a + 1; b < particlesArray.length; b++) {
                    let dx = particlesArray[a].x - particlesArray[b].x;
                    let dy = particlesArray[a].y - particlesArray[b].y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < maxDistance) {
                        let opacity = (1 - distance / maxDistance) * 0.25;
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

    if (window.matchMedia('(pointer: fine)').matches) {
        let lastParticleTime = 0;
        document.addEventListener('mousemove', (e) => {
            const now = Date.now();
            if (now - lastParticleTime < 45) return;
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
