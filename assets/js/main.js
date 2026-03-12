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
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-JEKTATXVVjet0pvj5FOWbD0E9yK7xTPbW_qBDMCs_wK-_lppPa_aW257XVYzVNt09e9eDWEmFo-JBf9FxHFk8ONxA4UyoCa4t1QjNODIXH2BsG0dUGr_7tG4BS2Uhvj8J8RaqXV0SJTYxZrVLnkAjltphvfTOH_7KhSDHkEx0m0Da4Bdnl2zokVEhn8_mjlCHWOtNfK3QzJG93mgXjoakuAzxouxZAgFAousvKnmUSwDRTLJOx1Crmv3fCcpUzCDqGbncj_196k'
    },
    {
      href: '../resources/beyond-the-tithe.html',
      category: 'Financial',
      title: 'Beyond the Tithe',
      description: 'Living as a full-time steward of every percent begins when you realize that God owns one hundred percent.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAo-DQPDHAN9Wr1doHtRmX6gpr81D6rlFm6d0b8SxmUHJKHY5r5y2ZXa4DHARBz8ehCCpJOsnkU70DQqkhT7b9WCY-7jJjNeHQWkTpQ4EP3wJAv4spjIdIE6icDvKXrknvR-uyAJCCNb1SkrTMH__MsR1nls2bu2rEyeBCy2HraNABlF8r3b4U7YGfU5J3EFQrwt-1BlJ60QW9OWCPp3Eo6dkGMpdHePbSBKFIK4JhTRZawtc-quTNQuma1B2DUVakSwAXfynjM0OeR'
    },
    {
      href: '../resources/rhythm-of-rest.html',
      category: 'Spiritual',
      title: 'The Rhythm of Rest',
      description: 'Why Sabbath is a strategic advantage for high performers living in a culture that quietly worships productivity.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCr0Klre_sZFsICq2Cb1m0uK3nSoukSEv3RfellkYRS1oT_1pSLKkvHuM-r-SHOLvwAo2CFc82oR4nCtpIWb4UoKULcg80CJsIbxjapGAG4DEu2rw7x-iiweEpiUFkoIRdC665zlvYF6udjdEvFAvaOaDxzJPf5Pyv9Hdwh7YeCdo_EoUOwUGTmjgFELh_RlGsPzkEXE1nmIhw_8OdRlgVoD5Z-IX74Ujbt4ozgSjO-bgX70Vv5i_uIklYGKd-ET5DG0084octk1UJ-'
    },
    {
      href: '../resources/talents-and-assets.html',
      category: 'Financial',
      title: 'Talents and Assets',
      description: 'Discovering the hidden currency of your God-given skills starts with seeing your abilities as entrusted capacity.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFTE6LBPi4WpLzW-JOEIP3x0KRR4xddlC7uWIQs6_V7W12Gld5-ZZmDUSHH1W5VBQqnRR3f6nSwlSjcEenQfmL0qZDExf-Ytv0wlJfC16jorccrP-oA4KSLsoCXbSaGFJdmCvboaCO-69KP7C6fji2VbfxIy8ZXE9_GXW3-5kCnNxqUQFpEVe7KoDh10_cHFF513ICC7h4OyIo7-UVfzHmhbwn3qG5vXOwd_WZU0f02Sna-0M4C6LEhwZnjj2Q2naDVINdOerUpnV1'
    },
    {
      href: '../resources/psychology-of-scarcity.html',
      category: 'Personal Development',
      title: 'The Psychology of Scarcity',
      description: 'Breaking free from the never-enough mindset begins by retraining perception, gratitude, and trust.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBsOTn31IA5IprLWBCR64bBKguLSsx3G5rMN3sEMXxwSxGxN3f3MyIfd0T70xTZkg0K1loyl279bjrnphLZivZXlFx7s-BPcOmbzh9OgpPVyr4_8cBTjukMjRKifX853XahUCmh4ihPg8mNG56Z4mEXEtD56dPgvvC9XU6oSSv_gue6clmTNrLQqe5ImIAJk8cxf04CqGb0VdvIXyqLO-8jQIQE0zJBqoA4-OcMlBJM4jM-LL1jzHfpWdWqrT_b1YbvwpIRtAI6Gc7t'
    },
    {
      href: '../resources/energy-management.html',
      category: 'Personal Development',
      title: 'Energy Management',
      description: 'Honoring the temple through physical and spiritual vitality means stewarding energy as carefully as time or money.',
      image: '../assets/images/family.jpg'
    },
    {
      href: '../resources/altar-of-productivity.html',
      category: 'Spiritual',
      title: 'The Altar of Productivity',
      description: 'When efficiency becomes worship, productivity turns from meaningful diligence into a proving ground for identity.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmh-V8ESMqFIKoJpfvrgJLUKnSP4-XxkImZ4qHCoCFPoxil-1NLiJxfXtO5icUrPsgAS1rpeAABgkR3XCTw2F0pf69h0Vz6HmM6xGNuOwZt1oYVt10ME5_ZJOnJFlXfa3O5tLJ44qDwf95iGOTESQNl31UdDlg9hkBVS4yt5IZstrDOMGwXha_iVsIDNWFvNi5-JmeSqRRSSbUoEWcb4nM17fcNdc9sbrthIkIZ95PPdCN0FwlOr0dOP_mgmDF_T60jXvFqUcGqCV6'
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
