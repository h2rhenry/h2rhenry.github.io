document.addEventListener('DOMContentLoaded', () => {
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

        if (user && discordAvatar) {
            if (discordName) discordName.textContent = user.global_name || user.username;
            discordAvatar.src = user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
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
            spotifyPlayer.style.display = 'block';
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
                }
            })
            .catch(() => {});
    }

    fetchDiscordStatus();
    setInterval(fetchDiscordStatus, 15000);
    setInterval(updateSpotifyProgress, 1000);
});
