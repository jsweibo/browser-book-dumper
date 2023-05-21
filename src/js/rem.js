(function () {
  function resize() {
    if (innerWidth >= 320 && innerWidth <= 414) {
      document.documentElement.style.fontSize = (innerWidth / 375) * 100 + 'px';
    } else if (innerWidth > 414) {
      document.documentElement.style.fontSize = '100px';
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    resize();
  });

  window.addEventListener('resize', function () {
    resize();
  });
})();
