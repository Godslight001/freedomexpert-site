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

  var heroSlider = document.querySelector('[data-hero-slider]');
  if (heroSlider) {
    var heroSlides = Array.prototype.slice.call(heroSlider.querySelectorAll('[data-hero-slide]'));
    var heroDots = Array.prototype.slice.call(heroSlider.querySelectorAll('[data-hero-dot]'));
    var heroPrev = heroSlider.querySelector('[data-hero-prev]');
    var heroNext = heroSlider.querySelector('[data-hero-next]');
    var activeHeroIndex = heroSlides.findIndex(function (slide) {
      return slide.getAttribute('data-active') === 'true';
    });
    var heroIntervalId;

    if (activeHeroIndex < 0) {
      activeHeroIndex = 0;
    }

    var setActiveHeroSlide = function (index) {
      activeHeroIndex = (index + heroSlides.length) % heroSlides.length;

      heroSlides.forEach(function (slide, slideIndex) {
        var isActive = slideIndex === activeHeroIndex;
        slide.setAttribute('data-active', String(isActive));
        slide.setAttribute('aria-hidden', String(!isActive));
      });

      heroDots.forEach(function (dot, dotIndex) {
        var isActive = dotIndex === activeHeroIndex;
        dot.setAttribute('aria-pressed', String(isActive));
        dot.classList.toggle('bg-white', isActive);
        dot.classList.toggle('bg-white/35', !isActive);
      });
    };

    var startHeroAutoplay = function () {
      heroIntervalId = window.setInterval(function () {
        setActiveHeroSlide(activeHeroIndex + 1);
      }, 6000);
    };

    var resetHeroAutoplay = function () {
      window.clearInterval(heroIntervalId);
      startHeroAutoplay();
    };

    if (heroPrev) {
      heroPrev.addEventListener('click', function () {
        setActiveHeroSlide(activeHeroIndex - 1);
        resetHeroAutoplay();
      });
    }

    if (heroNext) {
      heroNext.addEventListener('click', function () {
        setActiveHeroSlide(activeHeroIndex + 1);
        resetHeroAutoplay();
      });
    }

    heroDots.forEach(function (dot, dotIndex) {
      dot.addEventListener('click', function () {
        setActiveHeroSlide(dotIndex);
        resetHeroAutoplay();
      });
    });

    heroSlider.addEventListener('mouseenter', function () {
      window.clearInterval(heroIntervalId);
    });

    heroSlider.addEventListener('mouseleave', function () {
      resetHeroAutoplay();
    });

    setActiveHeroSlide(activeHeroIndex);
    startHeroAutoplay();
  }

  document.querySelectorAll('[data-filter-controls]').forEach(function (controls) {
    var group = controls.getAttribute('data-filter-controls');
    if (!group) return;

    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-filter-button="' + group + '"]'));
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-filter-item="' + group + '"]'));

    if (!buttons.length || !items.length) return;

    var applyFilter = function (value) {
      var normalizedValue = value || 'all';

      buttons.forEach(function (button) {
        var isActive = button.getAttribute('data-filter-value') === normalizedValue;
        button.setAttribute('aria-pressed', String(isActive));

        if (group === 'blog') {
          button.classList.toggle('bg-[#111318]', isActive);
          button.classList.toggle('text-white', isActive);
          button.classList.toggle('bg-[#f0f2f4]', !isActive);
          button.classList.toggle('text-[#616f89]', !isActive);
        } else if (group === 'programs') {
          button.classList.toggle('border-b-2', isActive);
          button.classList.toggle('border-primary', isActive);
          button.classList.toggle('text-slate-900', isActive);
          button.classList.toggle('text-slate-500', !isActive);
        }
      });

      items.forEach(function (item) {
        var category = item.getAttribute('data-filter-category');
        var showItem = normalizedValue === 'all' || category === normalizedValue;
        item.classList.toggle('hidden', !showItem);
      });
    };

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        applyFilter(button.getAttribute('data-filter-value'));
      });
    });

    applyFilter('all');
  });

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

  var canonicalLink = document.querySelector('link[rel="canonical"]');
  var shareUrl = (canonicalLink && canonicalLink.getAttribute('href')) || window.location.href;
  var shareTitle = document.title || 'FreedomExpert';
  var shareText = shareTitle.replace(/\s*\|\s*FreedomExpert\s*$/i, '').trim();

  var shareTargets = {
    LinkedIn: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(shareUrl),
    X: 'https://x.com/intent/tweet?url=' + encodeURIComponent(shareUrl) + '&text=' + encodeURIComponent(shareText),
    'WhatsApp Channel': 'https://wa.me/?text=' + encodeURIComponent(shareText + ' ' + shareUrl)
  };

  Object.keys(shareTargets).forEach(function (label) {
    document.querySelectorAll('footer a[aria-label="' + label + '"]').forEach(function (link) {
      var shareHref = shareTargets[label];
      link.setAttribute('href', shareHref);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
  });

  var buttonShareTargets = {
    linkedin: shareTargets.LinkedIn,
    x: shareTargets.X,
    whatsapp: shareTargets['WhatsApp Channel']
  };

  document.querySelectorAll('[data-share-platform]').forEach(function (button) {
    var platform = button.getAttribute('data-share-platform');
    var shareHref = buttonShareTargets[platform];
    if (!shareHref) return;

    button.addEventListener('click', function () {
      window.open(shareHref, '_blank', 'noopener,noreferrer');
    });
  });

  var relatedArticles = [
    {
      href: '../resources/post.html',
      category: 'Spiritual',
      title: 'The Theology of Time',
      description: 'Why your calendar is a spiritual document, and how the way you allocate time reveals identity, attention, and conviction.',
      image: '../assets/images/blog/theology-of-time.jpg'
    },
    {
      href: '../resources/beyond-the-tithe.html',
      category: 'Financial',
      title: 'Beyond the Tithe',
      description: 'Living as a full-time steward of every percent begins when you realize that God owns one hundred percent.',
      image: '../assets/images/blog/beyond-the-tithe.jpg'
    },
    {
      href: '../resources/rhythm-of-rest.html',
      category: 'Spiritual',
      title: 'The Rhythm of Rest',
      description: 'Why Sabbath is a strategic advantage for high performers living in a culture that quietly worships productivity.',
      image: '../assets/images/blog/rhythm-of-rest.jpg'
    },
    {
      href: '../resources/talents-and-assets.html',
      category: 'Financial',
      title: 'Talents and Assets',
      description: 'Discovering the hidden currency of your God-given skills starts with seeing your abilities as entrusted capacity.',
      image: '../assets/images/blog/talents-and-assets.jpg'
    },
    {
      href: '../resources/psychology-of-scarcity.html',
      category: 'Personal Development',
      title: 'The Psychology of Scarcity',
      description: 'Breaking free from the never-enough mindset begins by retraining perception, gratitude, and trust.',
      image: '../assets/images/blog/psychology-of-scarcity.png'
    },
    {
      href: '../resources/energy-management.html',
      category: 'Personal Development',
      title: 'Energy Management',
      description: 'Honoring the temple through physical and spiritual vitality means stewarding energy as carefully as time or money.',
      image: '../assets/images/blog/energy-management.jpg'
    },
    {
      href: '../resources/altar-of-productivity.html',
      category: 'Spiritual',
      title: 'The Altar of Productivity',
      description: 'When efficiency becomes worship, productivity turns from meaningful diligence into a proving ground for identity.',
      image: '../assets/images/blog/altar-of-productivity.jpg'
    }
  ];

  var relatedPostsContainer = document.querySelector('[data-related-posts]');
  if (relatedPostsContainer) {
    var currentPath = window.location.pathname.replace(/\/+/g, '/');
    var normalizedCurrent = currentPath.substring(currentPath.lastIndexOf('/') + 1);
    var cards = relatedArticles.filter(function (article) {
      return article.href.substring(article.href.lastIndexOf('/') + 1) !== normalizedCurrent;
    }).slice(0, 3);

    relatedPostsContainer.innerHTML = cards.map(function (article) {
      return '<a href="' + article.href + '" class="group cursor-pointer">' +
        '<div class="aspect-video rounded-xl overflow-hidden mb-4 bg-gray-100 shadow-sm group-hover:shadow-md transition-all">' +
        '<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="' + article.image + '" alt="' + article.title + '">' +
        '</div>' +
        '<span class="text-xs font-bold text-primary uppercase tracking-widest mb-2 block">' + article.category + '</span>' +
        '<h3 class="font-bold text-xl text-gray-900 leading-tight group-hover:text-primary transition-colors">' + article.title + '</h3>' +
        '<p class="text-gray-500 text-sm mt-3 line-clamp-2">' + article.description + '</p>' +
      '</a>';
    }).join('');
  }
})();

