(function(){
  'use strict';

  const STORAGE_KEY = 'devdavetevi_reservations_v1';
  const PACKAGES_KEY = 'devdavetevi_packages_v1';
  let reservations = [];
  let packages = [];
  let editingId = null;
  let editingPkgId = null;
  let activeFilter = 'all';
  let searchTerm = '';
  let currentView = 'list';
  let calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let selectedDate = null;
  let reportMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const listEl = document.getElementById('list');
  const countPill = document.getElementById('countPill');
  const searchInput = document.getElementById('searchInput');
  const filterRow = document.getElementById('filterRow');
  const viewToggle = document.getElementById('viewToggle');
  const calendarView = document.getElementById('calendarView');
  const calMonthLabel = document.getElementById('calMonthLabel');
  const calGrid = document.getElementById('calGrid');
  const calDayPanel = document.getElementById('calDayPanel');
  const calPrev = document.getElementById('calPrev');
  const calNext = document.getElementById('calNext');
  const reportView = document.getElementById('reportView');
  const reportMonthLabel = document.getElementById('reportMonthLabel');
  const reportBody = document.getElementById('reportBody');
  const reportPrev = document.getElementById('reportPrev');
  const reportNext = document.getElementById('reportNext');
  const openAddBtn = document.getElementById('openAddBtn');
  const closeSheetBtn = document.getElementById('closeSheetBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const sheet = document.getElementById('sheet');
  const scrim = document.getElementById('scrim');
  const form = document.getElementById('reservationForm');
  const sheetTitle = document.getElementById('sheetTitle');
  const paymentToggle = document.getElementById('paymentToggle');
  const confirmToggle = document.getElementById('confirmToggle');
  const priceInput = document.getElementById('price');
  const depositInput = document.getElementById('deposit');
  const remainingDisplay = document.getElementById('remainingDisplay');
  const eventDateInput = document.getElementById('eventDate');
  const eventTimeSelect = document.getElementById('eventTime');
  const timeSlotError = document.getElementById('timeSlotError');
  const packageSelect = document.getElementById('package');

  const openPackagesBtn = document.getElementById('openPackagesBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFileInput = document.getElementById('importFileInput');
  const closePackageSheetBtn = document.getElementById('closePackageSheetBtn');
  const packageSheet = document.getElementById('packageSheet');
  const pkgList = document.getElementById('pkgList');
  const addPkgBtn = document.getElementById('addPkgBtn');
  const packageForm = document.getElementById('packageForm');
  const pkgNameInput = document.getElementById('pkgName');
  const pkgDescriptionInput = document.getElementById('pkgDescription');
  const pkgPriceInput = document.getElementById('pkgPrice');
  const deletePkgBtn = document.getElementById('deletePkgBtn');
  const cancelPkgBtn = document.getElementById('cancelPkgBtn');

  const expensesSection = document.getElementById('expensesSection');
  const expPhotographer = document.getElementById('expPhotographer');
  const expCake = document.getElementById('expCake');
  const expDrinks = document.getElementById('expDrinks');
  const expSnacks = document.getElementById('expSnacks');
  const expMirror = document.getElementById('expMirror');
  const expRibbon = document.getElementById('expRibbon');
  const expStaff = document.getElementById('expStaff');
  const expenseSummaryDisplay = document.getElementById('expenseSummaryDisplay');
  const expenseInputs = [expPhotographer, expCake, expDrinks, expSnacks, expMirror, expRibbon, expStaff];

  function updateRemainingDisplay(){
    const price = Number(priceInput.value) || 0;
    const deposit = Number(depositInput.value) || 0;
    const remaining = price - deposit;
    remainingDisplay.textContent = '₺' + remaining.toLocaleString('tr-TR', { minimumFractionDigits:0, maximumFractionDigits:0 });
    remainingDisplay.classList.toggle('zero', remaining <= 0);
  }
  priceInput.addEventListener('input', updateRemainingDisplay);
  depositInput.addEventListener('input', updateRemainingDisplay);

  function updateExpenseSummary(){
    const total = expenseInputs.reduce((sum, el) => sum + (Number(el.value) || 0), 0);
    const price = Number(priceInput.value) || 0;
    const profit = price - total;
    expenseSummaryDisplay.textContent = 'Toplam Gider: ' + formatMoney(total) + ' · Net Kâr: ' + formatMoney(profit);
  }
  expenseInputs.forEach(el => el.addEventListener('input', updateExpenseSummary));
  priceInput.addEventListener('input', updateExpenseSummary);

  function refreshTimeSlotOptions(){
    const date = eventDateInput.value;
    const takenSlots = reservations
      .filter(r => r.eventDate === date && r.id !== editingId)
      .map(r => r.eventTime);

    Array.from(eventTimeSelect.options).forEach(opt => {
      opt.disabled = !!date && takenSlots.includes(opt.value);
    });

    const currentOpt = eventTimeSelect.selectedOptions[0];
    if(date && currentOpt && currentOpt.disabled){
      const nextAvailable = Array.from(eventTimeSelect.options).find(o => !o.disabled);
      if(nextAvailable) eventTimeSelect.value = nextAvailable.value;
      timeSlotError.hidden = false;
    }else{
      timeSlotError.hidden = true;
    }
  }

  eventDateInput.addEventListener('change', refreshTimeSlotOptions);
  eventTimeSelect.addEventListener('change', () => { timeSlotError.hidden = true; });

  packageSelect.addEventListener('change', () => {
    const pkg = packages.find(p => p.name === packageSelect.value);
    if(pkg){
      priceInput.value = pkg.price || '';
      updateRemainingDisplay();
    }
  });

  function uid(){
    return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
  }

  function defaultPackages(){
    return [
      { id: uid(), name:'Ekonomik Paket', description:'', price:0 },
      { id: uid(), name:'Standart Paket', description:'', price:0 },
      { id: uid(), name:'Premium Paket', description:'', price:0 },
      { id: uid(), name:'Özel Tasarım Paket', description:'', price:0 }
    ];
  }

  function loadPackages(){
    try{
      const raw = localStorage.getItem(PACKAGES_KEY);
      packages = raw ? JSON.parse(raw) : defaultPackages();
      if(!raw) savePackages();
    }catch(e){
      console.error('Paketler okunamadı:', e);
      packages = defaultPackages();
    }
  }

  function savePackages(){
    try{
      localStorage.setItem(PACKAGES_KEY, JSON.stringify(packages));
    }catch(e){
      console.error('Paketler kaydedilemedi:', e);
    }
  }

  function renderPackageOptions(){
    const current = packageSelect.value;
    packageSelect.innerHTML = packages.map(p =>
      `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)} (${formatMoney(p.price)})</option>`
    ).join('');
    if(packages.some(p => p.name === current)){
      packageSelect.value = current;
    }
  }

  function renderPackageList(){
    if(packages.length === 0){
      pkgList.innerHTML = `<div class="cal-empty-day">Henüz paket eklenmedi.</div>`;
      return;
    }
    pkgList.innerHTML = packages.map(p => `
      <div class="pkg-row" data-id="${p.id}">
        <div class="pkg-row-main">
          <div class="pkg-row-name">${escapeHtml(p.name)}</div>
          <div class="pkg-row-price">${formatMoney(p.price)}</div>
        </div>
        ${p.description ? `<div class="pkg-row-desc">${escapeHtml(p.description)}</div>` : ''}
        <div class="pkg-row-actions">
          <button type="button" class="pkg-edit" data-id="${p.id}">Düzenle</button>
          <button type="button" class="pkg-delete" data-id="${p.id}">Sil</button>
        </div>
      </div>
    `).join('');
  }

  function openPackageForm(pkg){
    editingPkgId = pkg ? pkg.id : null;
    pkgNameInput.value = pkg ? pkg.name : '';
    pkgDescriptionInput.value = pkg ? pkg.description : '';
    pkgPriceInput.value = pkg && pkg.price ? pkg.price : '';
    deletePkgBtn.style.display = pkg ? 'block' : 'none';
    packageForm.hidden = false;
    pkgNameInput.focus();
  }

  function closePackageForm(){
    editingPkgId = null;
    packageForm.hidden = true;
    packageForm.reset();
  }

  function openPackageSheet(){
    if(sheet.classList.contains('open')) closeSheet();
    closePackageForm();
    renderPackageList();
    packageSheet.classList.add('open');
    packageSheet.setAttribute('aria-hidden', 'false');
    scrim.classList.add('open');
  }

  function closePackageSheet(){
    packageSheet.classList.remove('open');
    packageSheet.setAttribute('aria-hidden', 'true');
    scrim.classList.remove('open');
    closePackageForm();
  }

  openPackagesBtn.addEventListener('click', openPackageSheet);
  closePackageSheetBtn.addEventListener('click', closePackageSheet);
  addPkgBtn.addEventListener('click', () => openPackageForm(null));
  cancelPkgBtn.addEventListener('click', closePackageForm);

  pkgList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.pkg-edit');
    const delBtn = e.target.closest('.pkg-delete');
    if(editBtn){
      const pkg = packages.find(p => p.id === editBtn.dataset.id);
      if(pkg) openPackageForm(pkg);
    }else if(delBtn){
      packages = packages.filter(p => p.id !== delBtn.dataset.id);
      savePackages();
      renderPackageList();
      renderPackageOptions();
    }
  });

  deletePkgBtn.addEventListener('click', () => {
    if(!editingPkgId) return;
    packages = packages.filter(p => p.id !== editingPkgId);
    savePackages();
    renderPackageList();
    renderPackageOptions();
    closePackageForm();
  });

  packageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = pkgNameInput.value.trim();
    if(!name) return;
    const data = {
      id: editingPkgId || uid(),
      name: name,
      description: pkgDescriptionInput.value.trim(),
      price: Number(pkgPriceInput.value) || 0
    };
    if(editingPkgId){
      const idx = packages.findIndex(p => p.id === editingPkgId);
      if(idx > -1) packages[idx] = data;
    }else{
      packages.push(data);
    }
    savePackages();
    renderPackageList();
    renderPackageOptions();
    closePackageForm();
  });

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      reservations = raw ? JSON.parse(raw) : [];
    }catch(e){
      console.error('Kayıtlar okunamadı:', e);
      reservations = [];
    }
  }

  function save(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
    }catch(e){
      console.error('Kayıtlar kaydedilemedi:', e);
    }
  }

  function formatDate(dateStr, timeStr){
    if(!dateStr) return '';
    const d = new Date(dateStr + 'T' + (timeStr || '00:00'));
    if(isNaN(d.getTime())) return dateStr;
    const opts = { day:'2-digit', month:'short', year:'numeric' };
    let out = d.toLocaleDateString('tr-TR', opts);
    if(timeStr) out += ' · ' + timeStr;
    return out;
  }

  function formatMoney(n){
    const num = Number(n) || 0;
    return '₺' + num.toLocaleString('tr-TR', { minimumFractionDigits:0, maximumFractionDigits:0 });
  }

  function paymentLabel(v){
    return v === 'paid' ? 'Ödendi' : v === 'partial' ? 'Kapora Alındı' : 'Ödeme Bekliyor';
  }
  function paymentClass(v){
    return v === 'paid' ? 'pay-paid' : v === 'partial' ? 'pay-partial' : 'pay-pending';
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function matchesFilter(r){
    if(activeFilter === 'confirmed') return r.status === 'confirmed';
    if(activeFilter === 'tentative') return r.status === 'tentative';
    if(activeFilter === 'pay-pending') return r.payment === 'pending';
    return true;
  }

  function matchesSearch(r){
    if(!searchTerm) return true;
    const hay = (r.brideName + ' ' + r.groomName + ' ' + r.package + ' ' + (r.eventType || '')).toLowerCase();
    return hay.includes(searchTerm.toLowerCase());
  }

  function render(){
    countPill.textContent = reservations.length + (reservations.length === 1 ? ' kayıt' : ' kayıt');
    if(currentView === 'calendar'){
      renderCalendar();
    }else if(currentView === 'report'){
      renderReport();
    }else{
      renderList();
    }
  }

  function renderList(){
    const filtered = reservations
      .filter(matchesFilter)
      .filter(matchesSearch)
      .slice()
      .sort((a,b) => (a.eventDate + a.eventTime).localeCompare(b.eventDate + b.eventTime));

    if(filtered.length === 0){
      listEl.innerHTML = `
        <div class="empty">
          <span class="glyph">✦</span>
          <p>${reservations.length === 0
            ? 'Henüz rezervasyon eklenmedi. Aşağıdaki düğmeyle ilk çifti kaydedin.'
            : 'Bu filtreye uyan rezervasyon bulunamadı.'}</p>
        </div>`;
      return;
    }

    listEl.innerHTML = filtered.map(r => cardHtml(r)).join('');
  }

  function totalExpenses(r){
    const e = r.expenses || {};
    return (Number(e.photographer)||0) + (Number(e.cake)||0) + (Number(e.drinks)||0) +
           (Number(e.snacks)||0) + (Number(e.mirror)||0) + (Number(e.ribbon)||0) + (Number(e.staff)||0);
  }

  function cardHtml(r){
    return `
      <article class="card" data-id="${r.id}" tabindex="0" role="button" aria-label="${escapeHtml(r.brideName)} ve ${escapeHtml(r.groomName)} rezervasyonunu düzenle">
        <div class="card-top">
          <div class="card-names">${escapeHtml(r.brideName)} &amp; ${escapeHtml(r.groomName)}</div>
          <div class="card-date">${formatDate(r.eventDate, r.eventTime)}</div>
        </div>
        <div class="badge-row">
          <span class="badge event-type">${escapeHtml(r.eventType || 'Diğer')}</span>
          <span class="badge ${r.status === 'confirmed' ? 'confirmed' : 'tentative'}">${r.status === 'confirmed' ? 'Kesin Rezervasyon' : 'Ön Görüşme'}</span>
          <span class="badge ${paymentClass(r.payment)}">${paymentLabel(r.payment)}</span>
          <span class="badge package">${escapeHtml(r.package)}</span>
        </div>
        <div class="money-row">
          <span>Fiyat: <strong>${formatMoney(r.price)}</strong></span>
          <span>Kapora: <strong>${formatMoney(r.deposit)}</strong></span>
          <span>Kalan: <strong>${formatMoney((Number(r.price)||0) - (Number(r.deposit)||0))}</strong></span>
        </div>
        ${r.status === 'confirmed' ? `<div class="money-row expense-row">
          <span>Gider: <strong>${formatMoney(totalExpenses(r))}</strong></span>
          <span>Net Kâr: <strong>${formatMoney((Number(r.price)||0) - totalExpenses(r))}</strong></span>
        </div>` : ''}
        ${r.notes ? `<div class="card-desc">${escapeHtml(r.notes)}</div>` : ''}
      </article>
    `;
  }

  function pad2(n){ return String(n).padStart(2, '0'); }
  function dateKey(d){ return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()); }

  function reservationsForCalendar(){
    return reservations.filter(matchesFilter).filter(matchesSearch);
  }

  function renderCalendar(){
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    calMonthLabel.textContent = calMonth.toLocaleDateString('tr-TR', { month:'long', year:'numeric' });

    const filtered = reservationsForCalendar();
    const byDate = {};
    filtered.forEach(r => {
      if(!r.eventDate) return;
      (byDate[r.eventDate] = byDate[r.eventDate] || []).push(r);
    });

    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - startOffset);
    const todayKey = dateKey(new Date());

    let cellsHtml = '';
    for(let i = 0; i < 42; i++){
      const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const key = dateKey(cellDate);
      const outside = cellDate.getMonth() !== month;
      const dayReservations = byDate[key] || [];
      const hasConfirmed = dayReservations.some(r => r.status === 'confirmed');
      const classes = ['cal-cell'];
      if(outside) classes.push('outside');
      if(key === todayKey) classes.push('today');
      if(selectedDate === key) classes.push('selected');
      if(hasConfirmed) classes.push('has-confirmed');

      const dots = dayReservations.slice(0,3).map(() => '<span class="dot"></span>').join('');
      cellsHtml += `<button type="button" class="${classes.join(' ')}" data-date="${key}" ${outside ? 'tabindex="-1" disabled' : ''}>
          <span>${cellDate.getDate()}</span>
          <span class="dots">${dots}</span>
        </button>`;
    }
    calGrid.innerHTML = cellsHtml;
    renderDayPanel(byDate);
  }

  function renderDayPanel(byDate){
    if(!selectedDate){
      calDayPanel.innerHTML = '';
      return;
    }
    const dayReservations = (byDate ? byDate[selectedDate] : reservationsForCalendar().filter(r => r.eventDate === selectedDate)) || [];
    const label = new Date(selectedDate + 'T00:00').toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric', weekday:'long' });

    if(dayReservations.length === 0){
      calDayPanel.innerHTML = `<div class="cal-day-panel-title">${label}</div><div class="cal-empty-day">Bu tarihte rezervasyon yok.</div>`;
      return;
    }
    calDayPanel.innerHTML = `<div class="cal-day-panel-title">${label} · ${dayReservations.length} rezervasyon</div>` +
      dayReservations.slice().sort((a,b) => a.eventTime.localeCompare(b.eventTime)).map(r => cardHtml(r)).join('');
  }

  const EXPENSE_CATEGORIES = [
    { key: 'photographer', label: 'Fotoğrafçı' },
    { key: 'cake', label: 'Pastacı' },
    { key: 'drinks', label: 'İçecek' },
    { key: 'snacks', label: 'Çerez' },
    { key: 'mirror', label: 'Ayna' },
    { key: 'ribbon', label: 'İncili Kurdele' },
    { key: 'staff', label: 'Personel' }
  ];

  function renderReport(){
    const year = reportMonth.getFullYear();
    const month = reportMonth.getMonth();
    reportMonthLabel.textContent = reportMonth.toLocaleDateString('tr-TR', { month:'long', year:'numeric' });

    const monthReservations = reservations.filter(r => {
      if(r.status !== 'confirmed' || !r.eventDate) return false;
      const d = new Date(r.eventDate + 'T00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    });

    if(monthReservations.length === 0){
      reportBody.innerHTML = `<div class="report-empty">Bu ayda kesinleşmiş rezervasyon yok.</div>`;
      return;
    }

    const categoryTotals = {};
    EXPENSE_CATEGORIES.forEach(c => { categoryTotals[c.key] = 0; });
    let totalRevenue = 0;
    let totalExpensesSum = 0;
    let totalDeposits = 0;

    monthReservations.forEach(r => {
      totalRevenue += Number(r.price) || 0;
      totalDeposits += Number(r.deposit) || 0;
      const exp = r.expenses || {};
      EXPENSE_CATEGORIES.forEach(c => {
        const v = Number(exp[c.key]) || 0;
        categoryTotals[c.key] += v;
        totalExpensesSum += v;
      });
    });

    const netProfit = totalRevenue - totalExpensesSum;

    const categoryRows = EXPENSE_CATEGORIES.map(c => `
      <div class="report-row">
        <span>${c.label}</span>
        <span class="amount">${formatMoney(categoryTotals[c.key])}</span>
      </div>
    `).join('');

    reportBody.innerHTML = `
      <div class="report-count">${monthReservations.length} kesin rezervasyon</div>
      ${categoryRows}
      <div class="report-total">
        <div class="report-row">
          <span>Toplam Gelir</span>
          <span class="amount">${formatMoney(totalRevenue)}</span>
        </div>
        <div class="report-row">
          <span>Alınan Toplam Kapora</span>
          <span class="amount">${formatMoney(totalDeposits)}</span>
        </div>
        <div class="report-row">
          <span>Toplam Gider</span>
          <span class="amount">${formatMoney(totalExpensesSum)}</span>
        </div>
        <div class="report-row profit">
          <span>Net Kâr</span>
          <span class="amount">${formatMoney(netProfit)}</span>
        </div>
      </div>
    `;
  }


  function setTogglePressed(container, value){
    container.querySelectorAll('button').forEach(btn => {
      btn.setAttribute('aria-pressed', btn.dataset.value === value ? 'true' : 'false');
    });
  }

  function getToggleValue(container){
    const active = container.querySelector('button[aria-pressed="true"]');
    return active ? active.dataset.value : null;
  }

  function openSheet(reservation){
    if(packageSheet.classList.contains('open')) closePackageSheet();
    editingId = reservation ? reservation.id : null;
    sheetTitle.textContent = reservation ? 'Rezervasyonu Düzenle' : 'Yeni Rezervasyon';
    deleteBtn.style.display = reservation ? 'block' : 'none';

    document.getElementById('brideName').value = reservation ? reservation.brideName : '';
    document.getElementById('groomName').value = reservation ? reservation.groomName : '';
    document.getElementById('phone').value = reservation ? reservation.phone : '';
    document.getElementById('email').value = reservation ? reservation.email : '';
    renderPackageOptions();
    document.getElementById('package').value = reservation ? reservation.package : (packages[0] ? packages[0].name : '');
    document.getElementById('eventType').value = reservation ? (reservation.eventType || 'Nişan') : 'Nişan';
    document.getElementById('eventDate').value = reservation ? reservation.eventDate : '';
    document.getElementById('eventTime').value = reservation ? reservation.eventTime : '10:00-12:00';
    refreshTimeSlotOptions();
    document.getElementById('notes').value = reservation ? reservation.notes : '';
    priceInput.value = reservation && reservation.price != null ? reservation.price : '';
    depositInput.value = reservation && reservation.deposit != null ? reservation.deposit : '';
    updateRemainingDisplay();

    setTogglePressed(paymentToggle, reservation ? reservation.payment : 'pending');
    setTogglePressed(confirmToggle, reservation ? reservation.status : 'tentative');

    const status = reservation ? reservation.status : 'tentative';
    expensesSection.hidden = status !== 'confirmed';
    const exp = (reservation && reservation.expenses) || {};
    expPhotographer.value = exp.photographer || '';
    expCake.value = exp.cake || '';
    expDrinks.value = exp.drinks || '';
    expSnacks.value = exp.snacks || '';
    expMirror.value = exp.mirror || '';
    expRibbon.value = exp.ribbon || '';
    expStaff.value = exp.staff || '';
    updateExpenseSummary();

    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    scrim.classList.add('open');
    setTimeout(() => document.getElementById('brideName').focus(), 250);
  }

  function closeSheet(){
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    scrim.classList.remove('open');
    editingId = null;
    form.reset();
    updateRemainingDisplay();
    timeSlotError.hidden = true;
    expensesSection.hidden = true;
  }

  // Events
  openAddBtn.addEventListener('click', () => openSheet(null));
  closeSheetBtn.addEventListener('click', closeSheet);
  cancelBtn.addEventListener('click', closeSheet);
  scrim.addEventListener('click', () => {
    if(sheet.classList.contains('open')) closeSheet();
    if(packageSheet.classList.contains('open')) closePackageSheet();
  });

  paymentToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if(!btn) return;
    setTogglePressed(paymentToggle, btn.dataset.value);
  });
  confirmToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if(!btn) return;
    setTogglePressed(confirmToggle, btn.dataset.value);
    expensesSection.hidden = btn.dataset.value !== 'confirmed';
    if(!expensesSection.hidden) updateExpenseSummary();
  });

  listEl.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if(!card) return;
    const r = reservations.find(x => x.id === card.dataset.id);
    if(r) openSheet(r);
  });
  listEl.addEventListener('keydown', (e) => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.card');
    if(!card) return;
    e.preventDefault();
    const r = reservations.find(x => x.id === card.dataset.id);
    if(r) openSheet(r);
  });

  filterRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-chip');
    if(!btn) return;
    activeFilter = btn.dataset.filter;
    filterRow.querySelectorAll('.filter-chip').forEach(c => c.setAttribute('aria-pressed', c === btn ? 'true' : 'false'));
    render();
  });

  viewToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if(!btn) return;
    currentView = btn.dataset.view;
    viewToggle.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    calendarView.hidden = currentView !== 'calendar';
    reportView.hidden = currentView !== 'report';
    listEl.hidden = currentView === 'calendar' || currentView === 'report';
    render();
  });

  calPrev.addEventListener('click', () => {
    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  calNext.addEventListener('click', () => {
    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  reportPrev.addEventListener('click', () => {
    reportMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth() - 1, 1);
    renderReport();
  });
  reportNext.addEventListener('click', () => {
    reportMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth() + 1, 1);
    renderReport();
  });

  calGrid.addEventListener('click', (e) => {
    const cell = e.target.closest('.cal-cell');
    if(!cell || cell.disabled) return;
    selectedDate = cell.dataset.date;
    renderCalendar();
  });

  calDayPanel.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if(!card) return;
    const r = reservations.find(x => x.id === card.dataset.id);
    if(r) openSheet(r);
  });

  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    render();
  });

  deleteBtn.addEventListener('click', () => {
    if(!editingId) return;
    reservations = reservations.filter(r => r.id !== editingId);
    save();
    render();
    closeSheet();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const chosenDate = document.getElementById('eventDate').value;
    const chosenTime = document.getElementById('eventTime').value;
    const conflict = reservations.some(r => r.eventDate === chosenDate && r.eventTime === chosenTime && r.id !== editingId);
    if(conflict){
      timeSlotError.hidden = false;
      return;
    }

    const data = {
      id: editingId || uid(),
      brideName: document.getElementById('brideName').value.trim(),
      groomName: document.getElementById('groomName').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      email: document.getElementById('email').value.trim(),
      package: document.getElementById('package').value,
      eventType: document.getElementById('eventType').value,
      eventDate: document.getElementById('eventDate').value,
      eventTime: document.getElementById('eventTime').value,
      price: priceInput.value === '' ? 0 : Number(priceInput.value),
      deposit: depositInput.value === '' ? 0 : Number(depositInput.value),
      payment: getToggleValue(paymentToggle) || 'pending',
      status: getToggleValue(confirmToggle) || 'tentative',
      notes: document.getElementById('notes').value.trim(),
      expenses: {
        photographer: Number(expPhotographer.value) || 0,
        cake: Number(expCake.value) || 0,
        drinks: Number(expDrinks.value) || 0,
        snacks: Number(expSnacks.value) || 0,
        mirror: Number(expMirror.value) || 0,
        ribbon: Number(expRibbon.value) || 0,
        staff: Number(expStaff.value) || 0
      }
    };

    if(editingId){
      const idx = reservations.findIndex(r => r.id === editingId);
      if(idx > -1) reservations[idx] = data;
    }else{
      reservations.push(data);
    }
    save();
    render();
    closeSheet();
  });

  async function exportData(){
    const payload = {
      exportedAt: new Date().toISOString(),
      reservations: reservations,
      packages: packages
    };
    const json = JSON.stringify(payload, null, 2);
    const stamp = new Date().toISOString().slice(0,10);
    const filename = 'davet-evi-takip-yedek-' + stamp + '.json';

    try{
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return;
    }catch(e){
      console.error('İndirme başarısız:', e);
    }
    // Yedekleme mümkün olmadıysa, kullanıcı verisini kendi kopyalayabilsin diye göster
    window.prompt('Yedek dosyası otomatik indirilemedi. Aşağıdaki metni kopyalayıp bir dosyaya kaydedebilirsin:', json);
  }

  function mergeImportedData(payload){
    let addedReservations = 0;
    let addedPackages = 0;

    if(Array.isArray(payload.reservations)){
      const existingIds = new Set(reservations.map(r => r.id));
      payload.reservations.forEach(r => {
        if(!r || typeof r !== 'object') return;
        if(existingIds.has(r.id)){
          r = Object.assign({}, r, { id: uid() });
        }
        reservations.push(r);
        addedReservations++;
      });
      save();
    }

    if(Array.isArray(payload.packages)){
      const existingNames = new Set(packages.map(p => p.name));
      payload.packages.forEach(p => {
        if(!p || typeof p !== 'object') return;
        if(existingNames.has(p.name)) return; // aynı isimde paket varsa atla
        packages.push(Object.assign({}, p, { id: uid() }));
        addedPackages++;
      });
      savePackages();
    }

    renderPackageOptions();
    render();
    alert('İçe aktarma tamamlandı: ' + addedReservations + ' rezervasyon, ' + addedPackages + ' paket eklendi.');
  }

  exportBtn.addEventListener('click', exportData);
  importBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const payload = JSON.parse(reader.result);
        mergeImportedData(payload);
      }catch(err){
        alert('Dosya okunamadı. Geçerli bir yedek (.json) dosyası seçtiğinden emin ol.');
      }
      importFileInput.value = '';
    };
    reader.readAsText(file);
  });

  // Init
  load();
  loadPackages();
  renderPackageOptions();
  render();
})();

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.error('Service worker kaydı başarısız:', err);
    });
  });
}