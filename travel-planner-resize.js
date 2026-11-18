const travelFrame = document.getElementById('travel-planner-frame');
travelFrame?.addEventListener('load', () => {
  const doc = travelFrame.contentDocument;
  if (!doc) return;
  const content = doc.querySelector('#journey');
  const fit = () => { travelFrame.style.height = `${Math.ceil(content.getBoundingClientRect().height + 12)}px`; };
  new ResizeObserver(fit).observe(content);
  fit();
});
