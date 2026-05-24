document.getElementById('openApp').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://scansync-theta.vercel.app' });
  window.close();
});