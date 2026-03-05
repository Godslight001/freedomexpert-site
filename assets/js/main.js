(function () {
  var menuButton = document.querySelector('[data-menu-toggle]');
  var navLinks = document.querySelector('[data-nav-links]');

  if (menuButton && navLinks) {
    menuButton.addEventListener('click', function () {
      var isHidden = navLinks.classList.contains('hidden');
      if (isHidden) {
        navLinks.classList.remove('hidden');
        navLinks.classList.add('open');
      } else {
        navLinks.classList.add('hidden');
        navLinks.classList.remove('open');
      }
      menuButton.setAttribute('aria-expanded', String(!isHidden));
    });
  }

  document.querySelectorAll('[data-nav-links]').forEach(function (mobileNav) {
    var resourcesLink = mobileNav.querySelector('a[data-nav="resources"]');
    if (!resourcesLink) return;

    var resourcesItem = resourcesLink.closest('li');
    if (!resourcesItem) return;

    var resourceSubItems = [];
    var cursor = resourcesItem.nextElementSibling;
    while (cursor) {
      var subLink = cursor.querySelector('a');
      if (!subLink || subLink.textContent.trim().indexOf('-') !== 0) break;
      resourceSubItems.push(cursor);
      cursor = cursor.nextElementSibling;
    }

    if (!resourceSubItems.length) return;

    resourceSubItems.forEach(function (item) {
      item.classList.add('hidden');
    });

    resourcesLink.setAttribute('href', '#');
    resourcesLink.addEventListener('click', function (event) {
      event.preventDefault();
      var shouldOpen = resourceSubItems[0].classList.contains('hidden');
      resourceSubItems.forEach(function (item) {
        item.classList.toggle('hidden', !shouldOpen);
      });
    });
  });

  var page = document.body.getAttribute('data-page');
  if (page) {
    document.querySelectorAll('[data-nav]').forEach(function (link) {
      if (link.getAttribute('data-nav') === page) {
        link.classList.add('active');
      }
    });
  }

  var resourcesTriggers = document.querySelectorAll('[data-resources-trigger]');
  if (resourcesTriggers.length) {
    var closeAllResourcesMenus = function () {
      document.querySelectorAll('[data-resources-menu]').forEach(function (menu) {
        menu.classList.add('hidden');
      });
      resourcesTriggers.forEach(function (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
      });
    };

    resourcesTriggers.forEach(function (trigger) {
      trigger.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        var parent = trigger.closest('.relative');
        if (!parent) return;

        var menu = parent.querySelector('[data-resources-menu]');
        if (!menu) return;

        var isHidden = menu.classList.contains('hidden');
        closeAllResourcesMenus();

        if (isHidden) {
          menu.classList.remove('hidden');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });

    document.addEventListener('click', function (event) {
      if (!event.target.closest('[data-resources-trigger]') && !event.target.closest('[data-resources-menu]')) {
        closeAllResourcesMenus();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeAllResourcesMenus();
      }
    });
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach(function (element) {
    observer.observe(element);
  });
})();
