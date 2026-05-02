const isGitHubPages = window.location.hostname.endsWith('github.io');

window.SKYM_CONFIG = {
    ASSISTANT_API_BASE_URL: isGitHubPages ? 'https://skymelody.onrender.com' : ''
};
