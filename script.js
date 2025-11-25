// app.js - kullanıcı tarafı (admin paneli ayrı dosyada)
(function () {
  // sabitler
  const USERS_KEY = 'bio_users_v9';
  const LOGGED_IN_KEY = 'bio_logged_in_user_v9';
  const PRICE = 0.10;
  const COOLDOWN_MS = 1500;
  const DEFAULT_MIN_WITHDRAWAL = 60.00;
  const DEFAULT_DAILY_CLICK_LIMIT = 100;
  const DEFAULT_DAILY_EARNINGS_LIMIT = 20.00;
  const SETTINGS_KEY = 'bio_settings_v9';

  // DOM elemanları (kullanıcı tarafı)
  const appView = document.getElementById('appView');
  const mainContent = document.getElementById('mainContent');
  const authView = document.getElementById('authView');

  const clickCountEl = document.getElementById('clickCount');
  const moneyEl = document.getElementById('moneyEarned');
  const clickBtn = document.getElementById('clickBtn');
  const cooldownText = document.getElementById('cooldownText');
  const displayName = document.getElementById('displayName');
  const avatar = document.getElementById('avatar');
  const statusDesc = document.getElementById('statusDesc');
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutUsername = document.getElementById('logoutUsername');
  const clickFill = document.getElementById('clickFill');
  const earnFill = document.getElementById('earnFill');
  const clickRemainText = document.getElementById('clickRemainText');
  const earnRemainText = document.getElementById('earnRemainText');
  const limitBadge = document.getElementById('limitBadge');
  const profilePremiumBadge = document.getElementById('profilePremiumBadge');
  const activeCouponArea = document.getElementById('activeCouponArea');

  // form elements
  const firstNameInput = document.getElementById('firstname');
  const lastNameInput = document.getElementById('lastname');
  const bankSelect = document.getElementById('bankSelect');
  const ibanInput = document.getElementById('ibanInput');
  const clearIbanBtn = document.getElementById('clearIban');
  const ibanInvalid = document.getElementById('ibanInvalid');

  // auth
  const authForm = document.getElementById('authForm');
  const authUsernameInput = document.getElementById('authUsername');
  const authPasswordInput = document.getElementById('authPassword');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authMessage = document.getElementById('authMessage');
  const authTitle = document.getElementById('authTitle');
  const switchText = document.getElementById('switchText');

  // coupon / withdraw UI
  const couponInput = document.getElementById('couponInput');
  const applyCouponBtn = document.getElementById('applyCouponBtn');
  const couponInfo = document.getElementById('couponInfo');
  const withdrawBtn = document.getElementById('withdrawBtn');
  const minWithdrawalText = document.getElementById('minWithdrawalText');

  // banners / announcements
  const maintenanceBanner = document.getElementById('maintenanceBanner');
  const maintenanceReasonText = document.getElementById('maintenanceReasonText');
  const maintenanceSinceText = document.getElementById('maintenanceSinceText');
  const closeMaintBannerBtn = document.getElementById('closeMaintBannerBtn');

  const announcementBanner = document.getElementById('announcementBanner');
  const announcementTitleText = document.getElementById('announcementTitleText');
  const announcementMsgText = document.getElementById('announcementMsgText');
  const closeAnnouncementBtn = document.getElementById('closeAnnouncementBtn');

  const toastContainer = document.getElementById('toastContainer');
  const successOverlay = document.getElementById('successOverlay');
  const successDetails = document.getElementById('successDetails');

  // state
  let authMode = 'login';
  let isCooldown = false;
  let maintBannerHidden = false;

  // ---------- storage helpers ----------
  function getUsers() {
    try {
      const stored = localStorage.getItem(USERS_KEY);
      const obj = stored ? JSON.parse(stored) : {};
      Object.keys(obj).forEach(k => {
        const u = obj[k] || {};
        if (typeof u.role !== 'string') u.role = 'user';
        if (!Array.isArray(u.withdrawalRequests)) u.withdrawalRequests = [];
        u.balance = typeof u.balance === 'number' ? u.balance : (u.balance ? parseFloat(String(u.balance).replace(/[^\d.-]/g,'')) || 0 : 0);
        u.clicks = typeof u.clicks === 'number' ? u.clicks : (u.clicks ? parseInt(u.clicks,10) || 0 : 0);
        u.dailyClicks = typeof u.dailyClicks === 'number' ? u.dailyClicks : (u.dailyClicks ? parseInt(u.dailyClicks,10) || 0 : 0);
        u.dailyEarnings = typeof u.dailyEarnings === 'number' ? u.dailyEarnings : (u.dailyEarnings ? parseFloat(u.dailyEarnings) || 0 : 0);
        if (!u.dailyDate) u.dailyDate = todayDateKey();
        if (typeof u.premium !== 'boolean') u.premium = !!u.premium;
        if (typeof u.isBanned !== 'boolean') u.isBanned = !!u.isBanned;
        if (typeof u.appliedCoupon !== 'string') u.appliedCoupon = u.appliedCoupon ? String(u.appliedCoupon) : '';
        if (!u.activeCoupon) u.activeCoupon = null;
        obj[k] = u;
      });
      return obj;
    } catch (e) {
      console.error("Kullanıcı verisi yüklenirken hata oluştu:", e);
      return {};
    }
  }
  function saveUsers(users) {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch (e) { console.error(e); }
  }
  function getLoggedInUser() {
    const username = localStorage.getItem(LOGGED_IN_KEY);
    if (!username) return null;
    const users = getUsers();
    return users[username] || null;
  }
  function setLoggedInUser(user) {
    localStorage.setItem(LOGGED_IN_KEY, user ? user.username : '');
  }

  // settings
  function getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed) {
        const defaults = {
          dailyClickLimit: DEFAULT_DAILY_CLICK_LIMIT,
          dailyEarningsLimit: DEFAULT_DAILY_EARNINGS_LIMIT,
          minWithdrawalAmount: DEFAULT_MIN_WITHDRAWAL,
          coupons: [],
          maintenance: { enabled: false, reason: '', since: null },
          announcements: []
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaults));
        return defaults;
      }
      if (typeof parsed.dailyClickLimit !== 'number') parsed.dailyClickLimit = DEFAULT_DAILY_CLICK_LIMIT;
      if (typeof parsed.dailyEarningsLimit !== 'number') parsed.dailyEarningsLimit = DEFAULT_DAILY_EARNINGS_LIMIT;
      if (typeof parsed.minWithdrawalAmount !== 'number') parsed.minWithdrawalAmount = DEFAULT_MIN_WITHDRAWAL;
      if (!Array.isArray(parsed.coupons)) parsed.coupons = [];
      if (!parsed.maintenance) parsed.maintenance = { enabled: false, reason: '', since: null };
      if (!Array.isArray(parsed.announcements)) parsed.announcements = [];
      return parsed;
    } catch (e) {
      console.error(e);
      return { dailyClickLimit: DEFAULT_DAILY_CLICK_LIMIT, dailyEarningsLimit: DEFAULT_DAILY_EARNINGS_LIMIT, minWithdrawalAmount: DEFAULT_MIN_WITHDRAWAL, coupons: [], maintenance:{enabled:false,reason:'',since:null}, announcements:[] };
    }
  }
  function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { console.error(e); } }
  function getMinWithdrawalAmount() { const s = getSettings(); return typeof s.minWithdrawalAmount === 'number' ? s.minWithdrawalAmount : DEFAULT_MIN_WITHDRAWAL; }
  function getDefaultDailyClickLimit() { return getSettings().dailyClickLimit || DEFAULT_DAILY_CLICK_LIMIT; }
  function getDefaultDailyEarningsLimit() { return getSettings().dailyEarningsLimit || DEFAULT_DAILY_EARNINGS_LIMIT; }
  function isMaintenanceActive() { const s = getSettings(); return !!(s.maintenance && s.maintenance.enabled); }
  function getMaintenanceInfo() { const s = getSettings(); return s.maintenance || { enabled:false, reason:'', since:null }; }

  // ---------- UI helpers ----------
  function showMessage(el, text, isSuccess) {
    if (!el) return;
    el.textContent = text;
    el.style.display = text ? 'block' : 'none';
    el.className = 'message ' + (isSuccess ? 'success' : 'error');
  }
  function showToast(message, isSuccess = true, timeout = 3800) {
    const t = document.createElement('div');
    t.className = 'toast ' + (isSuccess ? 'success' : 'error');
    t.innerHTML = `<div style="font-size:1.2rem">${isSuccess ? '✅' : '⚠️'}</div><div style="flex:1">${message}</div>`;
    toastContainer.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .25s, transform .25s'; t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; setTimeout(()=>t.remove(),300); }, timeout);
  }
  function formatMoney(n){ return '$' + Number(n || 0).toFixed(2); }
  function pulse(el){ if (!el || !el.animate) return; el.animate([{transform:'scale(1)'},{transform:'scale(1.07)',opacity:.95},{transform:'scale(1)'}],{duration:260,easing:'cubic-bezier(.2,.8,.2,1)'}); }

  // ---------- auth / user ----------
  async function hashPassword(password) {
    if (!password) return '';
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  window.switchAuthMode = () => {
    authMode = authMode === 'login' ? 'register' : 'login';
    authTitle.textContent = authMode === 'login' ? 'Kullanıcı Girişi' : 'Yeni Hesap Oluştur';
    authSubmitBtn.textContent = authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
    authSubmitBtn.className = authMode === 'login' ? 'cta-login' : 'cta-register';
    switchText.innerHTML = authMode === 'login'
      ? 'Hesabınız yok mu? <button type="button" onclick="window.switchAuthMode()" class="link-btn">Kayıt Ol</button>'
      : 'Zaten hesabınız var mı? <button type="button" onclick="window.switchAuthMode()" class="link-btn">Giriş Yap</button>';
    showMessage(authMessage, '', false);
  };

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = authUsernameInput.value.trim();
    const password = authPasswordInput.value.trim();

    if (username.length < 3 || password.length < 6) {
      showMessage(authMessage, 'Kullanıcı adı (min 3) ve şifre (min 6) karakter olmalıdır.', false);
      return;
    }

    if (authMode === 'register') {
      await registerUser(username, password);
    } else {
      await loginUser(username, password);
    }
  });

  async function registerUser(username, password) {
    let users = getUsers();
    if (users[username]) { showMessage(authMessage, 'Bu kullanıcı adı zaten alınmış.', false); return; }
    const pwdHash = await hashPassword(password);
    users[username] = {
      username, passwordHash: pwdHash, balance:0.00, clicks:0, isBanned:false,
      firstname:'', lastname:'', bank:'', iban:'',
      withdrawalRequests: [], dailyDate: todayDateKey(), dailyClicks:0, dailyEarnings:0,
      premium:false, premiumSince:null, role:'user', appliedCoupon:'', activeCoupon:null
    };
    saveUsers(users);
    showMessage(authMessage, 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.', true);
    switchAuthMode();
  }

  async function loginUser(username, password) {
    const users = getUsers();
    const user = users[username];
    if (!user) { showMessage(authMessage, 'Kullanıcı adı veya şifre yanlış.', false); return; }
    if (user.isBanned) { showMessage(authMessage, 'Hesabınız yasaklanmıştır. Erişim engellendi.', false); return; }
    if (user.passwordHash) {
      const providedHash = await hashPassword(password);
      if (providedHash !== user.passwordHash) { showMessage(authMessage, 'Kullanıcı adı veya şifre yanlış.', false); return; }
    } else if (user.password) {
      if (user.password !== password) { showMessage(authMessage, 'Kullanıcı adı veya şifre yanlış.', false); return; }
      user.passwordHash = await hashPassword(password);
      delete user.password;
      users[username] = user; saveUsers(users);
    } else { showMessage(authMessage, 'Hatalı giriş bilgileri.', false); return; }

    ensureDailyFields(user); ensureUserFields(user); saveUsers(users);
    setLoggedInUser(user);
    showToast('Giriş başarılı', true);
    navigate();
  }

  window.logout = () => {
    setLoggedInUser(null);
    firstNameInput.value = ''; lastNameInput.value = ''; bankSelect.value = ''; ibanInput.value = ''; couponInput.value = ''; showIbanError(''); navigate();
  };

  if (logoutBtn) logoutBtn.addEventListener('click', () => window.logout());

  // ---------- user UI / render ----------
  function ensureUserFields(user) {
    if (!user) return;
    if (typeof user.role !== 'string') user.role = 'user';
    if (typeof user.appliedCoupon !== 'string') user.appliedCoupon = '';
    if (!user.withdrawalRequests) user.withdrawalRequests = [];
    if (typeof user.activeCoupon === 'undefined') user.activeCoupon = null;
  }

  function renderApp(user) {
    displayName.textContent = user.username;
    logoutUsername.textContent = user.username;
    const initials = user.username.substring(0,2).toUpperCase() || 'US';
    avatar.textContent = initials;
    if (user.firstname || user.lastname) {
      displayName.textContent = (user.firstname || '') + (user.firstname && user.lastname ? ' ' : '') + (user.lastname || '');
      const i1 = user.firstname ? user.firstname[0].toUpperCase() : '';
      const i2 = user.lastname ? user.lastname[0].toUpperCase() : '';
      avatar.textContent = (i1 + i2) || initials;
    }
    if (user.isBanned) {
      statusDesc.innerHTML = `<strong style="color: var(--accent-danger);">Yasaklı Hesap.</strong> Tıklama ve çekim işlemleri kapalıdır.`;
      clickBtn.setAttribute('data-banned','true'); clickBtn.disabled = true; withdrawBtn.disabled = true;
    } else {
      statusDesc.innerHTML = 'Giriş Başarılı. Yeni bir tıklama yapmaya hazırsınız.'; clickBtn.setAttribute('data-banned','false');
    }
    const limits = getUserLimits(user);
    if (limits.isUnlimited) limitBadge.textContent = `Günlük Limit: SINIRSIZ (PREMIUM)`; else limitBadge.textContent = `Günlük Limit: ${limits.clickLimit} tıklama / ${formatMoney(limits.earnLimit)}`;
    profilePremiumBadge.style.display = user.premium ? 'inline-block' : 'none';

    if (user.appliedCoupon) {
      const coupon = findCoupon(user.appliedCoupon);
      couponInfo.textContent = coupon ? `Uygulanan kupon: ${coupon.code} (+${coupon.percent}%)` : 'Uygulanan kupon geçersiz.';
    } else couponInfo.textContent = '';

    renderActiveCoupon(user);
    minWithdrawalText.textContent = formatMoney(getMinWithdrawalAmount());
    renderMaintenanceBanner();
  }

  function renderActiveCoupon(user) {
    const now = Date.now();
    let html = '';
    if (user.activeCoupon && user.activeCoupon.expiresAt && user.activeCoupon.expiresAt > now) {
      const secs = Math.ceil((user.activeCoupon.expiresAt - now)/1000);
      html = `<div class="coupon-active-badge">Aktif Kupon: ${user.activeCoupon.code} — ${user.activeCoupon.multiplier}x (${secs}s kaldı)</div>`;
    }
    activeCouponArea.innerHTML = html;
  }

  function calculateMoney(user) { return Number(user.balance || 0); }
  function getUserLimits(user) {
    if (user && user.premium) return { clickLimit: Infinity, earnLimit: Infinity, isUnlimited:true };
    return { clickLimit: getDefaultDailyClickLimit(), earnLimit: getDefaultDailyEarningsLimit(), isUnlimited:false };
  }

  // withdrawal eligibility
  function checkWithdrawalEligibility(user) {
    const currentMoney = calculateMoney(user);
    const reasons = [];
    const settings = getSettings();
    const maintenance = !!(settings.maintenance && settings.maintenance.enabled);
    if (maintenance) reasons.push('Sunucu bakımdadır.');
    if (user.isBanned) reasons.push('Hesabınız yasaklı.');
    if (!user.bank || String(user.bank).trim() === '') reasons.push('Banka seçimi yapılmamış.');
    if (!user.iban || !validateIban(user.iban)) reasons.push('Geçerli bir IBAN girilmemiş.');
    if (currentMoney < getMinWithdrawalAmount()) reasons.push(`Minimum çekim tutarına ulaşılamadı (${formatMoney(getMinWithdrawalAmount())}).`);
    return { eligible: reasons.length === 0, currentMoney, reasons, maintenance };
  }

  function updateWithdrawalButton(user) {
    const res = checkWithdrawalEligibility(user);
    const eligible = res.eligible;
    const currentMoney = res.currentMoney;
    const reasons = res.reasons || [];
    const maintenance = res.maintenance;
    if (eligible) {
      withdrawBtn.textContent = formatMoney(currentMoney) + ' Çekim Talep Et';
      withdrawBtn.disabled = false; withdrawBtn.title = 'Çekim yap';
    } else {
      let reasonText = maintenance ? 'Bakım: Çekim Kapalı' : (reasons[0] || 'Çekim şartları sağlanmadı');
      withdrawBtn.textContent = reasonText; withdrawBtn.disabled = true; withdrawBtn.title = reasons.join(' • ');
    }
    withdrawBtn.style.background = eligible ? 'var(--accent-success)' : 'var(--bg-card)';
    withdrawBtn.style.color = eligible ? 'var(--bg-deep)' : 'var(--text-muted)';
    withdrawBtn.style.border = eligible ? 'none' : '1px solid rgba(255,255,255,0.1)';
    withdrawBtn.style.boxShadow = eligible ? '0 6px 20px rgba(0, 255, 140, 0.25)' : 'none';
  }

  function render() {
    const user = getLoggedInUser();
    if (!user) return;
    const currentMoney = calculateMoney(user);
    clickCountEl.textContent = user.clicks;
    moneyEl.textContent = formatMoney(currentMoney);
    updateWithdrawalButton(user);
    const dailyClicks = user.dailyClicks || 0;
    const dailyEarn = user.dailyEarnings || 0;
    const limits = getUserLimits(user);
    if (limits.isUnlimited) {
      clickFill.style.width = '100%'; earnFill.style.width = '100%';
      clickRemainText.textContent = 'Sınırsız'; earnRemainText.textContent = 'Sınırsız';
      clickFill.style.background = 'linear-gradient(90deg,#FFD400,#FF9A00)'; earnFill.style.background = 'linear-gradient(90deg,#FFD400,#FF9A00)';
    } else {
      const clickPct = Math.min(100, Math.round((dailyClicks / limits.clickLimit) * 100));
      const earnPct = Math.min(100, Math.round((dailyEarn / limits.earnLimit) * 100));
      clickFill.style.width = clickPct + '%'; earnFill.style.width = earnPct + '%';
      clickRemainText.textContent = `${dailyClicks}/${limits.clickLimit}`; earnRemainText.textContent = `${formatMoney(dailyEarn)} / ${formatMoney(limits.earnLimit)}`;
    }

    if (!user.isBanned) {
      const maintenance = isMaintenanceActive();
      clearExpiredUserCoupon(user);
      clickBtn.disabled = isCooldown || maintenance || ( !limits.isUnlimited && (user.dailyClicks >= limits.clickLimit || user.dailyEarnings >= limits.earnLimit) );
      if (maintenance) { clickBtn.setAttribute('aria-disabled','true'); clickBtn.setAttribute('data-maintenance','true'); }
      else { clickBtn.removeAttribute('data-maintenance'); if (!limits.isUnlimited && (user.dailyClicks >= limits.clickLimit || user.dailyEarnings >= limits.earnLimit)) clickBtn.setAttribute('aria-disabled','true'); else clickBtn.removeAttribute('aria-disabled'); }
    }
    renderApp(user);
  }

  // click handler
  clickBtn.addEventListener('click', () => {
    const user = getLoggedInUser();
    if (!user || user.isBanned || isCooldown) return;
    if (isMaintenanceActive()) { showToast('Sunucu bakımdadır. Tıklama işlemleri geçici olarak kapalı.', false); return; }

    ensureDailyFields(user); resetDailyIfNeeded(user);
    const limits = getUserLimits(user);
    clearExpiredUserCoupon(user);
    const active = user.activeCoupon;
    const multiplier = (active && active.multiplier && active.expiresAt && active.expiresAt > Date.now()) ? Number(active.multiplier) : 1;

    if (!limits.isUnlimited && (user.dailyClicks || 0) >= limits.clickLimit) { showToast('Günlük tıklama limitinize ulaştınız.', false); render(); return; }
    if (!limits.isUnlimited && (((user.dailyEarnings || 0) + (PRICE * multiplier)) > limits.earnLimit)) { showToast('Günlük kazanç limitinize ulaşmak üzeresiniz. Bu tıklama eklenemez.', false); render(); return; }

    let users = getUsers();
    const addClicks = Math.max(1, Math.floor(multiplier));
    const addMoney = PRICE * multiplier;

    users[user.username].clicks += addClicks;
    users[user.username].balance += addMoney;
    users[user.username].dailyClicks = (users[user.username].dailyClicks || 0) + addClicks;
    users[user.username].dailyEarnings = (users[user.username].dailyEarnings || 0) + addMoney;

    saveUsers(users); setLoggedInUser(users[user.username]);
    render(); pulse(clickCountEl); pulse(moneyEl);

    isCooldown = true; clickBtn.disabled = true; clickBtn.setAttribute('aria-pressed','true');
    document.getElementById('clickBtnText').textContent = 'İŞLENİYOR...'; cooldownText.style.display = 'inline';
    let timer = COOLDOWN_MS;
    const interval = setInterval(() => {
      timer -= 100;
      cooldownText.textContent = `(${Math.ceil(timer/1000)}s)`;
      if (timer <= 0) { clearInterval(interval); isCooldown = false; if (!user.isBanned) clickBtn.disabled = false; clickBtn.setAttribute('aria-pressed','false'); document.getElementById('clickBtnText').textContent = 'TIKLA VE KAZAN'; cooldownText.style.display = 'none'; }
    }, 100);
  });

  // ---------- withdrawal ----------
  function generateId(prefix='') { return prefix + Date.now().toString(36) + Math.random().toString(36).substring(2,8); }

  withdrawBtn.addEventListener('click', () => {
    const user = getLoggedInUser(); if (!user) return;
    const { eligible, currentMoney, reasons, maintenance } = checkWithdrawalEligibility(user);
    if (!eligible) { const msg = (reasons && reasons.length) ? reasons.join(' • ') : (maintenance ? 'Sunucu bakımdadır.' : 'Çekim yapılamıyor.'); showToast(msg, false, 5000); return; }

    let users = getUsers();
    const storedIban = prettyIban(user.iban || '');
    const selectedBank = user.bank || '';
    const originalBalance = Number(users[user.username].balance) || 0;
    let amt = originalBalance;
    let appliedCouponCode = user.appliedCoupon || '';
    let appliedCoupon = appliedCouponCode ? findCoupon(appliedCouponCode) : null;
    let bonus = 0;
    if (appliedCoupon && isCouponValid(appliedCoupon)) {
      bonus = appliedCoupon.percent || 0;
      if (typeof appliedCoupon.uses === 'number' && appliedCoupon.uses > 0) {
        appliedCoupon.uses = appliedCoupon.uses - 1;
        const s = getSettings(); const idx = s.coupons.findIndex(c => c.code === appliedCoupon.code); if (idx >= 0) { s.coupons[idx] = appliedCoupon; saveSettings(s); }
      }
      amt = parseFloat((originalBalance * (1 + (bonus/100))).toFixed(2));
    } else appliedCouponCode = '';

    const req = { id: generateId('wr_'), username: user.username, amount: amt, bank: selectedBank, iban: normalizeIban(user.iban || ''), createdAt: new Date().toISOString(), status:'pending', originalBalance: originalBalance, couponApplied: appliedCouponCode, couponBonusPercent: bonus };

    if (!users[user.username].withdrawalRequests) users[user.username].withdrawalRequests = [];
    users[user.username].withdrawalRequests.push(req);
    users[user.username].balance = 0.00;
    users[user.username].appliedCoupon = '';
    saveUsers(users); setLoggedInUser(users[user.username]);
    render();

    successDetails.innerHTML = `<p>Çekim Tutarı: <strong style="color: var(--accent-success);">${formatMoney(amt)}</strong></p>${bonus?`<p style="color:var(--text-muted)">Kupon Bonus: <strong>+${bonus}%</strong></p>`:''}<p>Banka: <strong>${selectedBank}</strong></p><p>IBAN: <strong>${storedIban}</strong></p><p>Talep ID: <strong>${req.id}</strong></p>`;
    successOverlay.style.display = 'flex';
    showToast('Çekim talebi oluşturuldu. Admin onayı bekleniyor.', true, 3500);
  });

  window.closeSuccessOverlay = () => { successOverlay.style.display = 'none'; };

  // ---------- personal data ----------
  function saveUserSpecificData(key, value) {
    const user = getLoggedInUser(); if (!user) return;
    let users = getUsers(); if (!users[user.username]) return;
    users[user.username][key] = value; saveUsers(users); setLoggedInUser(users[user.username]);
    if (key === 'bank' || key === 'iban' || key === 'appliedCoupon' || key === 'activeCoupon') updateWithdrawalButton(users[user.username]);
  }

  firstNameInput.addEventListener('input', (e) => { saveUserSpecificData('firstname', e.target.value.trim()); renderApp(getLoggedInUser()); });
  lastNameInput.addEventListener('input', (e) => { saveUserSpecificData('lastname', e.target.value.trim()); renderApp(getLoggedInUser()); });
  bankSelect.addEventListener('change', (e) => { saveUserSpecificData('bank', e.target.value); });

  // IBAN helpers
  const IBAN_REGEX = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/i;
  const TR_IBAN_REGEX = /^TR\d{24}$/i;
  function normalizeIban(raw){ return raw ? raw.replace(/\s+/g, '').toUpperCase() : ''; }
  function prettyIban(raw){ const s = normalizeIban(raw); if (s.length===0) return ''; return s.match(/.{1,4}/g).join(' ').trim(); }

  function ibanMod97(iban) {
    const rearranged = iban.slice(4) + iban.slice(0,4);
    let expanded = '';
    for (let i=0;i<rearranged.length;i++){
      const ch = rearranged[i];
      if (ch >= 'A' && ch <= 'Z') expanded += (ch.charCodeAt(0) - 55).toString();
      else expanded += ch;
    }
    let remainder = 0; let str = expanded;
    while (str.length) {
      const piece = (remainder.toString() + str.slice(0,9));
      remainder = parseInt(piece,10) % 97;
      str = str.slice(9);
    }
    return remainder === 1;
  }

  function validateIban(raw){
    const n = normalizeIban(raw);
    if (!n) return false;
    if (n.startsWith('TR')) {
      if (!TR_IBAN_REGEX.test(n)) return false;
      if (n.length !== 26) return false;
      try { return ibanMod97(n); } catch(e) { return false; }
    }
    if (!IBAN_REGEX.test(n) || n.length < 15 || n.length > 34) return false;
    try { return ibanMod97(n); } catch(e) { return false; }
  }

  function showIbanError(msg){
    if(!ibanInvalid) return;
    if(!msg){ ibanInvalid.style.display = 'none'; ibanInvalid.textContent = ''; return; }
    ibanInvalid.style.display = 'block'; ibanInvalid.textContent = msg;
  }

  ibanInput.addEventListener('input', (e) => {
    const formatted = prettyIban(e.target.value);
    e.target.value = formatted;
    const raw = normalizeIban(formatted);
    saveUserSpecificData('iban', raw);
    if(raw.length === 0) showIbanError('');
    else {
      if(raw.startsWith('TR') && raw.length < 26) showIbanError('TR IBAN için 26 karakter bekleniyor.');
      else if (raw.length > 34) showIbanError('IBAN çok uzun görünüyor.');
      else if(validateIban(raw)) showIbanError('');
      else showIbanError('Geçersiz IBAN (checksum veya format hatası).');
    }
    try { ibanInput.selectionStart = ibanInput.selectionEnd = ibanInput.value.length; } catch(e){}
  });

  clearIbanBtn.addEventListener('click', () => {
    ibanInput.value = ''; saveUserSpecificData('iban',''); showIbanError(''); ibanInput.focus();
  });

  // ---------- coupons (user apply) ----------
  function findCoupon(code) {
    if (!code) return null;
    const s = getSettings(); return s.coupons.find(c => c.code.toUpperCase() === code.toUpperCase()) || null;
  }
  function isCouponValid(coupon) {
    if (!coupon) return false;
    if (coupon.uses !== null && typeof coupon.uses === 'number' && coupon.uses <= 0) return false;
    return true;
  }

  applyCouponBtn.addEventListener('click', () => {
    const user = getLoggedInUser(); if (!user) return;
    const code = couponInput.value.trim(); if (!code) { showToast('Kupon kodu girin.', false); return; }
    const coupon = findCoupon(code); if (!coupon) { showToast('Geçersiz kupon.', false); return; }
    if (!isCouponValid(coupon)) { showToast('Kupon artık geçerli değil (kullanım sayısı dolmuş).', false); return; }

    if (coupon.type === 'click_bonus') {
      const durationSec = Number(coupon.durationSeconds) || 60;
      const multiplier = Number(coupon.multiplier) || 2;
      const expiresAt = Date.now() + durationSec*1000;
      if (typeof coupon.uses === 'number' && coupon.uses > 0) {
        coupon.uses = coupon.uses - 1; const s = getSettings(); const idx = s.coupons.findIndex(c=>c.code===coupon.code); if (idx>=0){ s.coupons[idx]=coupon; saveSettings(s); }
      }
      saveUserSpecificData('activeCoupon', { code: coupon.code, type: coupon.type, multiplier, expiresAt });
      renderApp(getLoggedInUser()); showToast(`Kupon uygulandı: ${coupon.code} — ${multiplier}x tıklama ${durationSec}s boyunca.`, true); couponInput.value=''; return;
    }

    saveUserSpecificData('appliedCoupon', coupon.code); showToast(`Kupon ${coupon.code} uygulandı. +${coupon.percent}% bonus (çekimde).`, true);
  });

  // ---------- announcements ----------
  function getAnnouncements() { const s = getSettings(); return Array.isArray(s.announcements) ? s.announcements : []; }
  function renderAnnouncementsInApp() {
    const anns = getAnnouncements(); if (!anns || anns.length === 0) { announcementBanner.style.display = 'none'; return; }
    const now = Date.now();
    const visible = anns.filter(a => a.visible && (!a.expiresAt || a.expiresAt > now)).sort((a,b) => { if (a.sticky === b.sticky) return new Date(b.createdAt) - new Date(a.createdAt); return a.sticky ? -1 : 1; });
    if (!visible || visible.length === 0) { announcementBanner.style.display = 'none'; return; }
    const ann = visible[0];
    const hideKey = `announcement_hidden_${ann.id}_${localUserKey()}`;
    if (localStorage.getItem(hideKey) === 'true') { announcementBanner.style.display = 'none'; return; }
    announcementTitleText.textContent = ann.title; announcementMsgText.textContent = ann.message; announcementBanner.style.display = 'flex';
  }
  closeAnnouncementBtn.addEventListener('click', () => {
    const anns = getAnnouncements(); if (!anns || anns.length===0) { announcementBanner.style.display='none'; return; }
    const now = Date.now(); const visible = anns.filter(a=>a.visible && (!a.expiresAt || a.expiresAt > now)).sort((a,b) => { if (a.sticky === b.sticky) return new Date(b.createdAt) - new Date(a.createdAt); return a.sticky ? -1 : 1; });
    if (!visible || visible.length===0) { announcementBanner.style.display='none'; return; }
    const ann = visible[0]; const hideKey = `announcement_hidden_${ann.id}_${localUserKey()}`; localStorage.setItem(hideKey,'true'); announcementBanner.style.display='none';
  });

  function localUserKey() {
    const u = getLoggedInUser(); if (u && u.username) return u.username;
    let deviceId = localStorage.getItem('bio_device_id_v1'); if (!deviceId) { deviceId = 'dev_' + generateId(); localStorage.setItem('bio_device_id_v1', deviceId); } return deviceId;
  }

  // ---------- maintenance banner ----------
  function updateMaintenanceUI() {
    const info = getMaintenanceInfo();
    const maintenanceStatusText = document.getElementById('maintenanceStatusText'); // may not exist in user bundle
    if (maintenanceStatusText) maintenanceStatusText.textContent = info.enabled ? `Bakım etkinleştirildi. Sebep: ${info.reason || '(belirtilmemiş)'} — Başlangıç: ${info.since}` : 'Bakım kapalı.';
    if (info.enabled && !maintBannerHidden) {
      maintenanceReasonText.textContent = info.reason || 'Planlı bakım';
      maintenanceSinceText.textContent = info.since ? `Başladı: ${new Date(info.since).toLocaleString()}` : '';
      maintenanceBanner.style.display = 'flex';
    } else maintenanceBanner.style.display = 'none';
  }
  closeMaintBannerBtn && closeMaintBannerBtn.addEventListener('click', () => { maintBannerHidden = true; maintenanceBanner.style.display = 'none'; });

  // ---------- daily limits ----------
  function todayDateKey() { return new Date().toISOString().slice(0,10); }
  function ensureDailyFields(user) { if (!user) return; if (!user.dailyDate) user.dailyDate = todayDateKey(); if (typeof user.dailyClicks !== 'number') user.dailyClicks = 0; if (typeof user.dailyEarnings !== 'number') user.dailyEarnings = 0; if (typeof user.premium !== 'boolean') user.premium = false; }
  function resetDailyIfNeeded(user) {
    if (!user) return;
    const users = getUsers();
    ensureDailyFields(user);
    const today = todayDateKey();
    if (user.dailyDate !== today) {
      user.dailyDate = today; user.dailyClicks = 0; user.dailyEarnings = 0; users[user.username] = user; saveUsers(users);
    }
  }

  // ---------- coupon expiry ----------
  function clearExpiredUserCoupon(user) {
    if (!user || !user.activeCoupon) return;
    if (user.activeCoupon.expiresAt && user.activeCoupon.expiresAt <= Date.now()) saveUserSpecificData('activeCoupon', null);
  }

  // ---------- misc ----------
  function formatMoneyLocal(n){ return formatMoney(n); }

  // ---------- navigation ----------
  function showView(view) {
    mainContent.style.display = view === 'app' ? 'grid' : 'none';
    authView.style.display = view === 'auth' ? 'block' : 'none';
    appView.style.display = view === 'app' || view === 'auth' ? 'block' : 'none';
    renderAnnouncementsInApp();
  }

  function navigate() {
    const user = getLoggedInUser();
    if (user) {
      ensureDailyFields(user); ensureUserFields(user); resetDailyIfNeeded(user);
      showView('app');
      firstNameInput.value = user.firstname || ''; lastNameInput.value = user.lastname || '';
      bankSelect.value = user.bank || ''; ibanInput.value = prettyIban(user.iban || '');
      couponInput.value = user.appliedCoupon || '';
      renderApp(user); render();
    } else { showView('auth'); }
  }

  // ---------- coupon admin/listing helpers (user-visible list optional) ----------
  function renderCouponsListForAdminlessUI() {
    // optional: nothing for now. Coupon application is supported, admin creates coupons in separate admin panel.
  }

  // ---------- utils ----------
  function generateIdSimple(prefix='') { return prefix + Date.now().toString(36) + Math.random().toString(36).substring(2,8); }

  // ---------- initial setup ----------
  window.addEventListener('resize', () => { try { renderAnnouncementsInApp(); } catch(e){} });

  // initialize
  updateMaintenanceUI();
  renderAnnouncementsInApp();
  navigate();

  // expose small helpers for console/testing
  window._app = { getUsers, getSettings, saveSettings, formatMoney };

})();