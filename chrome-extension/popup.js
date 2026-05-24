document.getElementById('openApp').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://scansync-pc.vercel.app' });
  window.close();
});