let users = []; let piket = []; let tabungan = []; let chats = []; let driveLink = "https://drive.google.com";
let menus1 = []; let menus2 = []; let pesanan = [];
let namaK1 = "Kelompok 1"; let namaK2 = "Kelompok 2";
let waK1 = ""; let waK2 = "";
let keranjang = {}; // format: { "1_pushKey": {kelompok, key, nama, harga, qty}, ... }
let currentUser = JSON.parse(sessionStorage.getItem('app_current_user')) || null;
let firebaseReady = false; let selectedSiswaTabungan = null; let selectedChatUser = null;
let pressTimer;
let deferredPrompt;

const defaultUsers = [
  {nama:"Administrator Utama",username:"admin",password:"123",role:"admin",status:"offline"},
  {nama:"Developer Sistem",username:"dev",password:"123",role:"developer",status:"offline"}
];
const defaultPiket = [{hari:"Senin",anggota:"Fauzan, Raisya"},{hari:"Selasa",anggota:"Budi, Siti"},{hari:"Rabu",anggota:"Joko"},{hari:"Kamis",anggota:"Doni, Maya"},{hari:"Jumat",anggota:"Eko, Dian"}];

// ================= NOTIFIKASI KUSTOM =================
function showAlert(pesan, judul = "⚠️ Peringatan") {
  document.getElementById('alert-title').innerText = judul;
  document.getElementById('alert-message').innerText = pesan;
  document.getElementById('custom-alert').classList.add('show');
}
function tutupAlert() {
  document.getElementById('custom-alert').classList.remove('show');
}

// ================= PWA INSTALL =================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if(!window.matchMedia('(display-mode: standalone)').matches && !window.navigator.standalone){
    document.getElementById('btn-install-pwa').style.display = 'block';
  }
});
function installPWA() {
  if(deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        document.getElementById('btn-install-pwa').style.display = 'none';
      }
      deferredPrompt = null;
    });
  } else {
    showAlert("Untuk menginstall: Klik menu titik tiga di Chrome, lalu pilih 'Tambahkan ke Layar Utama'.");
  }
}

// ================= ANIMASI =================
function jalankanGacha() {
  document.querySelectorAll('.gacha-num').forEach(el => {
    const target = parseInt(el.getAttribute('data-target'));
    if(isNaN(target)) return;
    let current = 0;
    const step = Math.ceil(target / 60);
    const interval = setInterval(() => {
      current += step;
      if(current >= target) { current = target; clearInterval(interval); }
      el.innerText = current;
    }, 50);
  });
}
function initProgressBar() {
  const barTkj = document.getElementById('bar-tkj');
  if(!barTkj) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        barTkj.style.transition = 'width 2.5s ease-out';
        barTkj.style.width = '82%';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  const sectionTentang = barTkj.closest('.section');
  if(sectionTentang) observer.observe(sectionTentang);
}
function initScrollReveal() {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        const delay = index * 150;
        setTimeout(() => { entry.target.classList.add('active'); }, delay);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

function updateClock() {
  const now = new Date();
  const jam = String(now.getHours()).padStart(2,'0');
  const menit = String(now.getMinutes()).padStart(2,'0');
  const detik = String(now.getSeconds()).padStart(2,'0');
  const el = document.getElementById('clock-time');
  if(el) el.innerText = `${jam}:${menit}:${detik}`;
  const elDate = document.getElementById('clock-date');
  if(elDate) elDate.innerText = now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const elSalam = document.getElementById('salam-text');
  if(elSalam && currentUser) {
    const h = now.getHours();
    let salam = "Selamat Malam";
    if(h >= 4 && h < 11) salam = "Selamat Pagi";
    else if(h >= 11 && h < 15) salam = "Selamat Siang";
    else if(h >= 15 && h < 18) salam = "Selamat Sore";
    elSalam.innerText = `${salam}, ${currentUser.nama}! 👋`;
  }
}
setInterval(updateClock, 1000);

window.addEventListener('firebase-ready', () => {
  firebaseReady = true;
  updateClock();
  initFirebaseListeners();
  initScrollReveal();
  jalankanGacha();
  initProgressBar();
});

// ================= FIREBASE LISTENERS =================
function initFirebaseListeners(){
  window.fbOnValue(window.fbRef(window.db, 'users'), (snap) => {
    const data = snap.val();
    if(data){ users = Object.keys(data).map(k => ({...data[k], _key: k})); }
    else { defaultUsers.forEach(u => { window.fbSet(window.fbPush(window.fbRef(window.db, 'users')), u); }); }
    if(currentUser){ const found = users.find(u => u.username === currentUser.username); if(found){ currentUser = found; sessionStorage.setItem('app_current_user', JSON.stringify(found)); } }
    if(currentUser && currentUser.role === 'developer') renderTabelAkun();
    if(!document.getElementById('page-order').classList.contains('hidden')) renderHalamanOrder();
  });

  window.fbOnValue(window.fbRef(window.db, 'piket'), (snap) => {
    const data = snap.val();
    if(data){ piket = Object.keys(data).map(k => ({...data[k], _key: k})); }
    else { defaultPiket.forEach((p) => { window.fbSet(window.fbRef(window.db, 'piket/' + p.hari), p); }); }
    renderPiket();
    renderLandingPiket();
    if(currentUser && !document.getElementById('page-dashboard').classList.contains('hidden')) renderDashboard();
  });

  window.fbOnValue(window.fbRef(window.db, 'tabungan'), (snap) => {
    const data = snap.val();
    if(data){ tabungan = Object.keys(data).map(k => ({...data[k], _key: k})); } else { tabungan = []; }
    if(currentUser && !document.getElementById('page-tabungan').classList.contains('hidden')) renderTabungan();
  });

  window.fbOnValue(window.fbRef(window.db, 'chats'), (snap) => {
    const data = snap.val();
    if(data){ chats = Object.keys(data).map(k => ({...data[k], _key: k})); } else { chats = []; }
    if(currentUser) updateNotifBadges();
    if(currentUser && currentUser.role === 'developer') {
      if(!document.getElementById('page-inbox').classList.contains('hidden')) renderInbox();
      if(selectedChatUser && !document.getElementById('chat-dev-view').classList.contains('hidden')) renderChatDev();
    } else if(currentUser) {
      if(!document.getElementById('page-chat').classList.contains('hidden')) renderChatUser();
    }
  });

  window.fbOnValue(window.fbRef(window.db, 'settings/driveLink'), (snap) => {
    driveLink = snap.val() || "https://drive.google.com";
    if(currentUser && !document.getElementById('page-foto').classList.contains('hidden')) renderFotoPage();
  });

  // === MENU & PENGATURAN KELOMPOK ===
  window.fbOnValue(window.fbRef(window.db, 'menus/kelompok1'), (snap) => {
    const data = snap.val();
    menus1 = data ? Object.keys(data).map(k => ({...data[k], _key: k})) : [];
    if(currentUser && !document.getElementById('page-kelola-menu').classList.contains('hidden')) renderKelolaMenu();
    if(!document.getElementById('page-order').classList.contains('hidden')) renderHalamanOrder();
  });
  window.fbOnValue(window.fbRef(window.db, 'menus/kelompok2'), (snap) => {
    const data = snap.val();
    menus2 = data ? Object.keys(data).map(k => ({...data[k], _key: k})) : [];
    if(currentUser && !document.getElementById('page-kelola-menu').classList.contains('hidden')) renderKelolaMenu();
    if(!document.getElementById('page-order').classList.contains('hidden')) renderHalamanOrder();
  });
  window.fbOnValue(window.fbRef(window.db, 'settings/kelompok1Nama'), (snap) => { namaK1 = snap.val() || "Kelompok 1"; updateLabelKelompok(); });
  window.fbOnValue(window.fbRef(window.db, 'settings/kelompok2Nama'), (snap) => { namaK2 = snap.val() || "Kelompok 2"; updateLabelKelompok(); });
  window.fbOnValue(window.fbRef(window.db, 'settings/waKelompok1'), (snap) => { waK1 = snap.val() || ""; });
  window.fbOnValue(window.fbRef(window.db, 'settings/waKelompok2'), (snap) => { waK2 = snap.val() || ""; });

  window.fbOnValue(window.fbRef(window.db, 'pesanan'), (snap) => {
    const data = snap.val();
    pesanan = data ? Object.keys(data).map(k => ({...data[k], _key: k})) : [];
    if(currentUser && (currentUser.role==='admin'||currentUser.role==='developer')) {
      if(!document.getElementById('page-pesanan').classList.contains('hidden')) renderDaftarPesanan();
    }
  });

  document.getElementById('loading-overlay').classList.add('hidden');

  if(currentUser){
    document.getElementById('public-menu').classList.add('hidden');
    document.getElementById('private-menu').classList.remove('hidden');
    document.getElementById('app-section').classList.remove('hidden');
    inisialisasiSesiUI();
    showPage('page-dashboard');
    setupPresence(currentUser._key);
  } else {
    document.getElementById('public-menu').classList.remove('hidden');
    document.getElementById('private-menu').classList.add('hidden');
    showPage('page-landing');
  }
}

function setupPresence(userKey) {
  if(!userKey) return;
  const userStatusRef = window.fbRef(window.db, 'users/' + userKey + '/status');
  const connectedRef = window.fbRef(window.db, '.info/connected');
  window.fbOnValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      window.fbOnDisconnect(userStatusRef).set('offline');
      window.fbSet(userStatusRef, 'online');
    }
  });
}

function updateNotifBadges() {
  const globalBadge = document.getElementById('global-notif');
  if(!currentUser) return;
  let unreadCount = 0;
  if(currentUser.role === 'developer') {
    unreadCount = chats.filter(c => c.sender !== 'dev' && !c.readByDev).length;
  } else {
    unreadCount = chats.filter(c => c.username === currentUser.username && c.sender === 'dev' && !c.readByUser).length;
  }
  if(globalBadge) { globalBadge.innerText = unreadCount; globalBadge.classList.toggle('hidden', unreadCount === 0); }
}
function markReadDev() { chats.filter(c => c.sender !== 'dev' && !c.readByDev).forEach(c => { window.fbUpdate(window.fbRef(window.db, 'chats/'+c._key), {readByDev: true}); }); }
function markReadUser(uname) { chats.filter(c => c.username === uname && c.sender === 'dev' && !c.readByUser).forEach(c => { window.fbUpdate(window.fbRef(window.db, 'chats/'+c._key), {readByUser: true}); }); }

// ================= LOGIN / LOGOUT =================
function handleLogin(){
  if(!firebaseReady){ showAlert("Database belum terhubung."); return; }
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value.trim();
  const r = document.getElementById('login-role-select').value;
  const remember = document.getElementById('remember-me').checked;

  const found = users.find(x => x.username === u && x.password === p && x.role === r);
  if(!found){ showAlert("Username, Password, atau Akses Masuk salah!"); return; }

  currentUser = found; sessionStorage.setItem('app_current_user', JSON.stringify(found));
  if(remember) localStorage.setItem('remember_login', JSON.stringify({u, p, r}));
  else localStorage.removeItem('remember_login');

  if(found._key){ window.fbUpdate(window.fbRef(window.db, 'users/' + found._key), {status:'online'}); setupPresence(found._key); }

  document.getElementById('public-menu').classList.add('hidden');
  document.getElementById('private-menu').classList.remove('hidden');
  document.getElementById('app-section').classList.remove('hidden');
  inisialisasiSesiUI(); showPage('page-dashboard');
}

function handleLogout(){
  if(currentUser && currentUser._key){ window.fbUpdate(window.fbRef(window.db, 'users/' + currentUser._key), {status:'offline'}); }
  currentUser = null; sessionStorage.removeItem('app_current_user');
  document.getElementById('login-username').value=''; document.getElementById('login-password').value='';
  document.getElementById('app-section').classList.add('hidden');
  document.getElementById('public-menu').classList.remove('hidden');
  document.getElementById('private-menu').classList.add('hidden');
  showPage('page-landing');
}

window.onload = function() {
  const saved = localStorage.getItem('remember_login');
  if(saved) {
    try {
      const d = JSON.parse(saved);
      document.getElementById('login-username').value = d.u;
      document.getElementById('login-password').value = d.p;
      document.getElementById('login-role-select').value = d.r;
      document.getElementById('remember-me').checked = true;
    } catch(e) {}
  }
};

function inisialisasiSesiUI(){
  const roleText = currentUser.role==='developer'?'Developer':(currentUser.role==='admin'?'Admin':'Siswa');
  document.getElementById('nav-user-role-label').innerText=`Sistem Informasi Kelas - ${roleText}`;
  const isDev = currentUser.role==='developer';
  const isAdminOrDev = currentUser.role==='admin'||isDev;
  document.getElementById('menu-akun-btn').classList.toggle('hidden',!isDev);
  document.getElementById('menu-inbox').classList.toggle('hidden',!isDev);
  document.getElementById('menu-helpdesk').classList.toggle('hidden',isDev);
  document.getElementById('menu-pesanan').classList.toggle('hidden',!isAdminOrDev);
  document.getElementById('menu-kelola-menu').classList.toggle('hidden',!isAdminOrDev);
  ['admin-piket-form','admin-foto-form'].forEach(id=>document.getElementById(id).classList.toggle('hidden',!isDev));
  document.getElementById('tabungan-admin-view').classList.toggle('hidden',!isAdminOrDev);
  document.getElementById('tabungan-siswa-view').classList.toggle('hidden',isAdminOrDev);
  updateClock(); updateNotifBadges();
}

function toggleDropdown(){document.getElementById('dots-dropdown').classList.toggle('show');}
window.onclick=function(e){if(!e.target.matches('.dots-btn')){const d=document.getElementById('dots-dropdown');if(d&&d.classList.contains('show'))d.classList.remove('show');}};

function showPage(pageId){
  document.querySelectorAll('.page-content').forEach(el=>el.classList.add('hidden'));
  const target = document.getElementById(pageId);
  if(!target) return;
  target.classList.remove('hidden');
  document.getElementById('dots-dropdown').classList.remove('show');

  if(!currentUser && pageId !== 'page-landing' && pageId !== 'page-login' && pageId !== 'page-order') {
    showPage('page-login'); return;
  }
  if(currentUser && (pageId === 'page-landing' || pageId === 'page-login')) {
    showPage('page-dashboard'); return;
  }

  if(pageId==='page-landing'){ initScrollReveal(); jalankanGacha(); initProgressBar(); }
  if(pageId==='page-dashboard')renderDashboard();
  if(pageId==='page-piket') { renderPiket(); renderPilihanPiket(); }
  if(pageId==='page-foto')renderFotoPage();
  if(pageId==='page-tabungan')renderTabungan();
  if(pageId==='page-chat'){renderChatUser(); markReadUser(currentUser.username);}
  if(pageId==='page-inbox'){markReadDev(); renderInbox();}
  if(pageId==='page-profil')renderProfil();
  if(pageId==='page-akun')renderTabelAkun();
  if(pageId==='page-order')renderHalamanOrder();
  if(pageId==='page-kelola-menu')renderKelolaMenu();
  if(pageId==='page-pesanan')renderDaftarPesanan();
}

// ================= LANDING & DASHBOARD =================
function renderLandingPiket() {
  const container = document.getElementById('landing-piket-container');
  if(!container) return;
  container.innerHTML = '';
  const hariList = ['Senin','Selasa','Rabu','Kamis','Jumat'];
  hariList.forEach(hari => {
    const data = piket.find(p=>p.hari===hari);
    const anggota = data && data.anggota ? data.anggota : '';
    container.innerHTML += `<div class="piket-item reveal" style="flex-direction:column; align-items:flex-start; gap:8px;">
      <div class="piket-hari" style="width:100%; border-bottom:1px solid var(--border); padding-bottom:5px;">📌 ${hari}</div>
      <div style="display:flex; flex-direction:column; gap:5px; width:100%;">
        ${anggota ? anggota.split(',').map(n=>`<span style="color:var(--white); font-size:0.9rem;">• ${n.trim()}</span>`).join('') : '<span style="color:var(--dim); font-size:0.9rem;">Belum ada petugas</span>'}
      </div>
    </div>`;
  });
  initScrollReveal();
}

function renderDashboard(){
  const today=new Date(); const hariIni=today.toLocaleDateString('id-ID',{weekday:'long'});
  document.getElementById('piket-hari-ini-date').innerText=today.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const list=document.getElementById('piket-hari-ini-list');list.innerHTML='';
  const hariValid=['Senin','Selasa','Rabu','Kamis','Jumat'];
  if(!hariValid.includes(hariIni)){list.innerHTML='<li style="color:var(--cream);">🎉 Hari ini libur, tidak ada piket</li>';return;}
  const data=piket.find(p=>p.hari===hariIni);
  if(!data||!data.anggota.trim()){list.innerHTML='<li style="color:var(--dim);">Belum ada petugas piket.</li>';return;}
  data.anggota.split(',').forEach(nama=>{const li=document.createElement('li');li.innerText='• '+nama.trim();li.style.color='var(--white)';li.style.marginBottom='5px';list.appendChild(li);});
}

function renderPiket(){
  const container=document.getElementById('piket-list-container');container.innerHTML='';
  const hariList=['Senin','Selasa','Rabu','Kamis','Jumat'];
  hariList.forEach(hari=>{
    const data=piket.find(p=>p.hari===hari);
    const anggota = data && data.anggota ? data.anggota : '';
    container.innerHTML += `<div style="background:#14110f; padding:15px; border-radius:10px; margin-bottom:10px; border:1px solid var(--border);">
      <h4 style="color:var(--brown); margin-bottom:8px;">📌 ${hari}</h4>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        ${anggota ? anggota.split(',').map(n=>`<span style="background:var(--card2); padding:5px 10px; border-radius:5px; border:1px solid var(--brown); font-size:0.85rem; color:var(--cream);">${n.trim()}</span>`).join('') : '<span style="color:var(--dim); font-size:0.85rem;">Belum ada petugas</span>'}
      </div>
    </div>`;
  });
}

function renderPilihanPiket() {
  const hari = document.getElementById('piket-hari').value;
  const container = document.getElementById('piket-siswa-list');
  container.innerHTML = '';
  const dataPiket = piket.find(p => p.hari === hari);
  const namaTerpilih = dataPiket ? dataPiket.anggota.split(',').map(n => n.trim()) : [];
  const siswaList = users.filter(u => u.role === 'siswa').sort((a,b) => a.nama.localeCompare(b.nama));
  if(siswaList.length === 0) {
    container.innerHTML = '<span style="color:var(--dim);font-size:0.85rem;">Belum ada akun siswa terdaftar.</span>';
    return;
  }
  siswaList.forEach(siswa => {
    const isChecked = namaTerpilih.includes(siswa.nama) ? 'checked' : '';
    container.innerHTML += `
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:0.85rem;color:var(--white);cursor:pointer;">
        <input type="checkbox" class="check-piket" value="${siswa.nama}" ${isChecked}> ${siswa.nama}
      </label>
    `;
  });
}

function simpanPiket(){
  if(currentUser.role!=='developer')return;
  const h = document.getElementById('piket-hari').value;
  const selected = Array.from(document.querySelectorAll('.check-piket:checked')).map(c => c.value);
  if(selected.length === 0){ showAlert("Pilih minimal satu siswa untuk piket!"); return; }
  const anggotaStr = selected.join(', ');
  window.fbSet(window.fbRef(window.db, 'piket/' + h), {hari:h, anggota:anggotaStr});
  showAlert("Jadwal piket " + h + " berhasil diperbarui!", "✅ Berhasil");
}

// ================= FOTO / GDRIVE =================
function renderFotoPage(){document.getElementById('gdrive-button-link').href=driveLink;document.getElementById('input-gdrive-link').value=driveLink;}
function simpanDriveLink(){
  if(currentUser.role!=='developer')return;
  const l=document.getElementById('input-gdrive-link').value.trim();
  if(!l){showAlert("Link tidak boleh kosong!");return;}
  window.fbSet(window.fbRef(window.db, 'settings/driveLink'), l); showAlert("Link berhasil diperbarui!", "✅ Berhasil");
}

// ================= TABUNGAN =================
function formatRupiah(n){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n);}
function hitungSaldoPerSiswa(){
  let saldo={}; users.forEach(u=>{if(u.role==='siswa')saldo[u.nama]=0;});
  tabungan.forEach(t=>{if(saldo[t.nama]!==undefined){saldo[t.nama]+=(t.jenis==='setor'?t.nominal:-t.nominal);}});
  return saldo;
}
function renderTabungan(){
  if(currentUser.role==='siswa'){ renderTabunganSiswa(); } else { renderTabunganAdmin(); }
}
function renderTabunganAdmin(){
  const saldo=hitungSaldoPerSiswa();
  let total=0;Object.values(saldo).forEach(s=>total+=s);
  document.getElementById('total-semua-tabungan').innerText=formatRupiah(total);
  const select=document.getElementById('tab-nama'); select.innerHTML='';
  const listSiswa=document.getElementById('list-siswa-tabungan'); listSiswa.innerHTML='';
  const listIuran=document.getElementById('list-siswa-iuran'); listIuran.innerHTML='';
  Object.keys(saldo).forEach(nama=>{
    select.innerHTML+=`<option value="${nama}">${nama}</option>`;
    listSiswa.innerHTML+=`<div style="background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:15px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;" onclick="lihatRincianTabungan('${nama}')"><span style="font-weight:bold;color:var(--white);">${nama}</span><span style="color:var(--cream);font-size:.85rem;font-weight:bold;">${formatRupiah(saldo[nama])}</span></div>`;
    listIuran.innerHTML+=`<label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:.85rem;color:var(--white);cursor:pointer;"><input type="checkbox" class="check-siswa" value="${nama}"> ${nama}</label>`;
  });
  if(selectedSiswaTabungan) lihatRincianTabungan(selectedSiswaTabungan);
}
function lihatRincianTabungan(nama){
  selectedSiswaTabungan = nama;
  document.getElementById('daftar-siswa-container').classList.add('hidden');
  document.getElementById('rincian-tabungan-container').classList.remove('hidden');
  document.getElementById('rincian-nama').innerText='Rincian Tabungan: '+nama;
  document.getElementById('rincian-saldo').innerText=formatRupiah(hitungSaldoPerSiswa()[nama]||0);
  const tbody=document.getElementById('tabel-rincian-tabungan');tbody.innerHTML='';
  tabungan.filter(t=>t.nama===nama).forEach((item)=>{
    const nominalFmt=(item.jenis==='setor'?'+ ':'- ')+formatRupiah(item.nominal);
    const cls=item.jenis==='tarik'?'color:#ff6b6b;':'color:#8dd694;';
    const ket = item.keterangan ? item.keterangan : (item.jenis==='setor'?'Nabung':'Tarik');
    const aksi = currentUser.role==='developer' ? `<td data-label="Aksi"><button class="btn btn-danger btn-sm" onclick="hapusTransaksi('${item._key}')">Hapus</button></td>` : '';
    document.getElementById('th-aksi-tabungan').style.display = currentUser.role==='developer' ? 'table-cell' : 'none';
    tbody.innerHTML+=`<tr><td data-label="Tanggal">${item.tanggal}</td><td data-label="Jenis">${item.jenis==='setor'?'Setor':'Tarik'}</td><td data-label="Nominal" style="${cls}font-weight:bold;">${nominalFmt}</td><td data-label="Keterangan">${ket}</td>${aksi}</tr>`;
  });
}
function kembaliKeDaftar(){
  selectedSiswaTabungan = null;
  document.getElementById('daftar-siswa-container').classList.remove('hidden');
  document.getElementById('rincian-tabungan-container').classList.add('hidden');
  renderTabunganAdmin();
}
function tambahSetor(){
  const nama=document.getElementById('tab-nama').value; const nominal=parseInt(document.getElementById('tab-nominal').value);
  if(!nama || isNaN(nominal) || nominal<=0){showAlert("Pilih siswa dan masukkan nominal!");return;}
  const now=new Date(); const tgl=now.toLocaleDateString('id-ID')+' '+now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  window.fbSet(window.fbPush(window.fbRef(window.db, 'tabungan')), {tanggal:tgl,nama:nama,keterangan:"",nominal:nominal,jenis:"setor"});
  document.getElementById('tab-nominal').value='';
}
function toggleFormIuran(){const p=document.getElementById('form-iuran-panel');p.style.display=p.style.display==='block'?'none':'block';}
function togglePilihSemua(){const isChecked=document.getElementById('check-semua').checked;document.querySelectorAll('.check-siswa').forEach(c=>c.checked=isChecked);}
function prosesIuran(){
  const ket=document.getElementById('iuran-ket').value.trim(); const nominal=parseInt(document.getElementById('iuran-nominal').value);
  const selected=Array.from(document.querySelectorAll('.check-siswa:checked')).map(c=>c.value);
  if(!ket || isNaN(nominal)||nominal<=0 || selected.length===0){showAlert("Lengkapi data tarik dan pilih siswa!");return;}
  const now=new Date(); const tgl=now.toLocaleDateString('id-ID')+' '+now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  selected.forEach(nama=>{ window.fbSet(window.fbPush(window.fbRef(window.db, 'tabungan')), {tanggal:tgl,nama:nama,keterangan:ket,nominal:nominal,jenis:"tarik"}); });
  document.getElementById('iuran-ket').value=''; document.getElementById('iuran-nominal').value=''; document.getElementById('check-semua').checked=false;
  document.querySelectorAll('.check-siswa').forEach(c=>c.checked=false); toggleFormIuran(); showAlert("Penarikan diproses untuk "+selected.length+" siswa.", "✅ Berhasil");
}
function renderTabunganSiswa(){
  const nama = currentUser.nama; document.getElementById('total-saldo-siswa').innerText=formatRupiah(hitungSaldoPerSiswa()[nama]||0);
  const tbody=document.getElementById('tabel-siswa-sendiri');tbody.innerHTML='';
  tabungan.filter(t=>t.nama===nama).forEach((item)=>{
    const nominalFmt=(item.jenis==='setor'?'+ ':'- ')+formatRupiah(item.nominal);
    const cls=item.jenis==='tarik'?'color:#ff6b6b;':'color:#8dd694;';
    const ket = item.keterangan ? item.keterangan : (item.jenis==='setor'?'Nabung':'Tarik');
    tbody.innerHTML+=`<tr><td data-label="Tanggal">${item.tanggal}</td><td data-label="Jenis">${item.jenis==='setor'?'Setor':'Tarik'}</td><td data-label="Nominal" style="${cls}font-weight:bold;">${nominalFmt}</td><td data-label="Keterangan">${ket}</td></tr>`;
  });
}
function hapusTransaksi(key){if(currentUser.role!=='developer')return;if(confirm("Hapus transaksi ini?")){window.fbRemove(window.fbRef(window.db, 'tabungan/' + key));}}

function exportCSV(){
  if(tabungan.length===0){showAlert("Tidak ada data untuk diexport.");return;}
  let csv = "Tanggal,Nama Siswa,Jenis,Nominal,Keterangan\n";
  tabungan.forEach(t=>{ csv += `"${t.tanggal}","${t.nama}","${t.jenis}","${t.nominal}","${t.keterangan}"\n`; });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "Data_Tabungan_12TKJ3.csv"; link.click();
}

// ================= IMPORT & MANAJEMEN AKUN =================
function importAkunSiswa(){
  if(currentUser.role!=='developer') return;
  const raw = document.getElementById('import-file').value.trim();
  if(!raw){ showAlert("Kolom import masih kosong!"); return; }
  const lines = raw.split('\n');
  let berhasil = 0; let gagal = 0;
  const seen = new Set();
  lines.forEach(line => {
    if(!line.trim()) return;
    const parts = line.split(',');
    if(parts.length >= 2){
      const nama = parts[0].trim();
      const username = parts[1].trim();
      const password = parts[2] ? parts[2].trim() : "123";
      if(users.some(u => u.username === username) || seen.has(username)){
        gagal++;
      } else {
        seen.add(username);
        window.fbSet(window.fbPush(window.fbRef(window.db, 'users')), {nama:nama, username:username, password:password, role:"siswa", status:"offline"});
        berhasil++;
      }
    } else {
      gagal++;
    }
  });
  showAlert(`Import selesai!\nBerhasil: ${berhasil} akun\nGagal/Duplikat: ${gagal} akun`, "✅ Import Selesai");
  document.getElementById('import-file').value = '';
}

function renderTabelAkun(){
  if(currentUser.role!=='developer')return;
  const tbody=document.getElementById('tabel-akun-body');tbody.innerHTML='';
  users.forEach((u)=>{
    const br=u.role==='admin'?'<span style="color:var(--brown);font-weight:bold;">Admin</span>':(u.role==='developer'?'<span style="color:#ff6b6b;font-weight:bold;">Developer</span>':'<span style="color:var(--cream);">Siswa</span>');
    const bs=u.status==='online'?'<span style="color:#8dd694;font-weight:bold;">Online</span>':'<span style="color:var(--dim);">Offline</span>';
    tbody.innerHTML+=`<tr><td data-label="Nama">${u.nama}</td><td data-label="Username">${u.username}</td><td data-label="Password">${u.password}</td><td data-label="Role">${br}</td><td data-label="Status">${bs}</td><td data-label="Aksi"><button class="btn btn-primary btn-sm" onclick="editAkun('${u._key}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="hapusAkun('${u._key}')">Hapus</button></td></tr>`;
  });
}
function simpanAkun(){
  if(currentUser.role!=='developer')return;
  const n=document.getElementById('akun-nama').value.trim(); const u=document.getElementById('akun-username').value.trim(); const p=document.getElementById('akun-password').value.trim(); const r=document.getElementById('akun-role').value; const key=document.getElementById('edit-akun-index').value;
  if(!n||!u||!p){showAlert("Semua kolom wajib diisi!");return;}
  if(key==='-1'){
    if(users.some(x=>x.username===u)){showAlert("Username sudah digunakan!");return;}
    window.fbSet(window.fbPush(window.fbRef(window.db, 'users')), {nama:n,username:u,password:p,role:r,status:"offline"});
  }else{ window.fbUpdate(window.fbRef(window.db, 'users/' + key), {nama:n, username:u, password:p, role:r}); }
  resetFormAkun();
}
function editAkun(key){
  const u=users.find(x=>x._key===key); if(!u)return;
  document.getElementById('form-akun-title').innerText="Edit Akun Pengguna"; document.getElementById('edit-akun-index').value=key;
  document.getElementById('akun-nama').value=u.nama; document.getElementById('akun-username').value=u.username; document.getElementById('akun-password').value=u.password; document.getElementById('akun-role').value=u.role;
  document.getElementById('btn-batal-edit').classList.remove('hidden');
}
function hapusAkun(key){
  if(currentUser.role!=='developer')return;
  const u=users.find(x=>x._key===key); if(!u)return;
  if(u.username===currentUser.username){showAlert("Tidak dapat hapus akun aktif!");return;}
  if(confirm(`Hapus akun "${u.nama}"?`)){window.fbRemove(window.fbRef(window.db, 'users/' + key));}
}
function resetFormAkun(){
  document.getElementById('form-akun-title').innerText="Buat Akun Baru"; document.getElementById('edit-akun-index').value="-1";
  document.getElementById('akun-nama').value=''; document.getElementById('akun-username').value=''; document.getElementById('akun-password').value=''; document.getElementById('akun-role').value='siswa'; document.getElementById('btn-batal-edit').classList.add('hidden');
}

// ================= CHAT =================
function startPress(key) {
  pressTimer = window.setTimeout(() => {
    if(confirm("Hapus pesan ini?")) { window.fbRemove(window.fbRef(window.db, 'chats/'+key)); }
  }, 600);
}
function cancelPress() { clearTimeout(pressTimer); }

function renderChatUser(){
  const box = document.getElementById('chat-messages-user'); if(!box) return; box.innerHTML='';
  const myChats = chats.filter(c => c.username === currentUser.username).sort((a,b)=> new Date(a.waktu) - new Date(b.waktu));
  myChats.forEach(c=>{
    const isDev = c.sender === 'dev';
    const div = document.createElement('div');
    div.className = `chat-bubble ${isDev ? 'other' : 'own'}`;
    div.innerHTML = `<div class="chat-meta"><strong>${isDev?'Developer':currentUser.nama}</strong> <span>${c.jam}</span></div><div>${c.pesan}</div>`;
    div.onmousedown = () => { if(!isDev) startPress(c._key); };
    div.onmouseup = cancelPress; div.onmouseleave = cancelPress;
    div.ontouchstart = () => { if(!isDev) startPress(c._key); };
    div.ontouchend = cancelPress;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;
}
function kirimPesanUser(){
  const input = document.getElementById('chat-input-user'); const pesan = input.value.trim();
  if(!pesan) return;
  const now = new Date(); const jam = now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  window.fbSet(window.fbPush(window.fbRef(window.db, 'chats')), {username:currentUser.username, nama:currentUser.nama, pesan:pesan, jam:jam, waktu:now.toISOString(), sender:currentUser.username, readByDev:false, readByUser:true});
  input.value='';
}
function hapusRoomChatUser() {
  if(!confirm("Hapus seluruh percakapan Anda dengan Developer?")) return;
  chats.filter(c => c.username === currentUser.username).forEach(c => { window.fbRemove(window.fbRef(window.db, 'chats/' + c._key)); });
  showAlert("Room chat berhasil dihapus.", "✅ Berhasil");
}
function renderInbox(){
  const list = document.getElementById('inbox-list'); if(!list) return; list.innerHTML='';
  const grouped = {};
  chats.forEach(c => {
    if(c.sender !== 'dev') {
      if(!grouped[c.username]) grouped[c.username] = {nama: c.nama, lastMsg: c.pesan, count: 0, unread: 0};
      grouped[c.username].lastMsg = c.pesan; grouped[c.username].count++;
      if(!c.readByDev) grouped[c.username].unread++;
    }
  });
  const keys = Object.keys(grouped);
  if(keys.length === 0) { list.innerHTML = '<p style="color:var(--dim);">Belum ada pesan masuk.</p>'; return; }
  keys.forEach(uname => {
    const d = grouped[uname];
    let badgeHtml = d.unread > 0 ? `<div style="background:#7a2e2e;color:#fae3e3;padding:4px 8px;border-radius:5px;font-size:0.7rem;font-weight:bold;">${d.unread} Baru</div>` : `<div style="background:var(--card2);padding:4px 8px;border-radius:5px;font-size:0.7rem;">${d.count} Pesan</div>`;
    list.innerHTML += `<div class="inbox-item" onclick="bukaChatDev('${uname}', '${d.nama}')">
      <div style="display:flex;flex-direction:column;gap:4px;"><span style="font-weight:bold;color:var(--brown);">${d.nama} (${uname})</span><span style="font-size:.8rem;color:var(--dim);">${d.lastMsg}</span></div>
      ${badgeHtml}
    </div>`;
  });
}
function bukaChatDev(uname, nama){
  selectedChatUser = uname;
  document.getElementById('inbox-list').classList.add('hidden');
  document.getElementById('chat-dev-view').classList.remove('hidden');
  document.getElementById('chat-dev-title').innerText = 'Chat dengan ' + nama;
  markReadDev(); renderChatDev();
}
function kembaliKeInbox(){
  selectedChatUser = null;
  document.getElementById('inbox-list').classList.remove('hidden');
  document.getElementById('chat-dev-view').classList.add('hidden');
  renderInbox();
}
function renderChatDev(){
  if(!selectedChatUser) return;
  const box = document.getElementById('chat-messages-dev'); box.innerHTML='';
  const myChats = chats.filter(c => c.username === selectedChatUser).sort((a,b)=> new Date(a.waktu) - new Date(b.waktu));
  myChats.forEach(c=>{
    const isDev = c.sender === 'dev';
    const div = document.createElement('div');
    div.className = `chat-bubble ${isDev ? 'own' : 'other'}`;
    div.innerHTML = `<div class="chat-meta"><strong>${isDev?'Anda (Dev)':c.nama}</strong> <span>${c.jam}</span></div><div>${c.pesan}</div>`;
    div.onmousedown = () => startPress(c._key); div.onmouseup = cancelPress;
    div.onmouseleave = cancelPress;
    div.ontouchstart = () => startPress(c._key); div.ontouchend = cancelPress;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;
}
function kirimPesanDev(){
  if(!selectedChatUser) return;
  const input = document.getElementById('chat-input-dev'); const pesan = input.value.trim();
  if(!pesan) return;
  const targetUser = users.find(u => u.username === selectedChatUser);
  const now = new Date(); const jam = now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  window.fbSet(window.fbPush(window.fbRef(window.db, 'chats')), {username:selectedChatUser, nama:targetUser ? targetUser.nama : 'User', pesan:pesan, jam:jam, waktu:now.toISOString(), sender:'dev', readByDev:true, readByUser:false});
  input.value='';
}
function hapusRoomChatDev() {
  if(!selectedChatUser) return;
  if(!confirm("Hapus seluruh percakapan dengan user ini?")) return;
  chats.filter(c => c.username === selectedChatUser).forEach(c => { window.fbRemove(window.fbRef(window.db, 'chats/' + c._key)); });
  showAlert("Room chat berhasil dihapus.", "✅ Berhasil");
  kembaliKeInbox();
}

// ================= PROFIL =================
function renderProfil(){
  document.getElementById('profil-username').value = currentUser.username;
  document.getElementById('profil-password').value = '';
}
function simpanProfil(){
  const newUser = document.getElementById('profil-username').value.trim();
  const newPass = document.getElementById('profil-password').value.trim();
  if(!newUser){ showAlert("Username tidak boleh kosong!"); return; }
  if(newUser !== currentUser.username && users.some(u=>u.username===newUser)){ showAlert("Username sudah dipakai orang lain!"); return; }
  let updates = { username: newUser };
  if(newPass) updates.password = newPass;
  window.fbUpdate(window.fbRef(window.db, 'users/' + currentUser._key), updates);
  currentUser.username = newUser; if(newPass) currentUser.password = newPass;
  sessionStorage.setItem('app_current_user', JSON.stringify(currentUser));
  showAlert("Profil berhasil diperbarui!", "✅ Berhasil");
  renderProfil();
}

// ================= KELOLA MENU =================
function updateLabelKelompok() {
  const j1 = document.getElementById('judul-menu-k1');
  const j2 = document.getElementById('judul-menu-k2');
  if(j1) j1.innerText = 'Menu ' + namaK1;
  if(j2) j2.innerText = 'Menu ' + namaK2;
  const s1 = document.querySelector('#menu-kelompok option[value="1"]');
  const s2 = document.querySelector('#menu-kelompok option[value="2"]');
  if(s1) s1.innerText = namaK1;
  if(s2) s2.innerText = namaK2;
  const o1 = document.querySelector('#filter-kelompok option[value="1"]');
  const o2 = document.querySelector('#filter-kelompok option[value="2"]');
  if(o1) o1.innerText = namaK1;
  if(o2) o2.innerText = namaK2;
  const oj1 = document.getElementById('order-judul-k1');
  const oj2 = document.getElementById('order-judul-k2');
  if(oj1) oj1.innerText = namaK1;
  if(oj2) oj2.innerText = namaK2;
}

function renderKelolaMenu() {
  if(!currentUser) return;
  if(currentUser.role!=='admin' && currentUser.role!=='developer') return;
  const elN1 = document.getElementById('set-nama-k1');
  const elN2 = document.getElementById('set-nama-k2');
  const elW1 = document.getElementById('set-wa-k1');
  const elW2 = document.getElementById('set-wa-k2');
  if(elN1 && document.activeElement !== elN1) elN1.value = namaK1 === "Kelompok 1" ? "" : namaK1;
  if(elN2 && document.activeElement !== elN2) elN2.value = namaK2 === "Kelompok 2" ? "" : namaK2;
  if(elW1 && document.activeElement !== elW1) elW1.value = waK1;
  if(elW2 && document.activeElement !== elW2) elW2.value = waK2;

  updateLabelKelompok();
  renderListMenu('list-menu-k1', menus1, 1);
  renderListMenu('list-menu-k2', menus2, 2);
}

function renderListMenu(containerId, list, kelompok) {
  const box = document.getElementById(containerId);
  if(!box) return;
  if(list.length === 0) {
    box.innerHTML = '<p style="color:var(--dim);font-size:.85rem;">Belum ada menu.</p>';
    return;
  }
  box.innerHTML = '';
  list.slice().sort((a,b) => (a.nama||'').localeCompare(b.nama||'')).forEach(m => {
    const status = m.tersedia ? '<span style="color:#8dd694;font-size:.75rem;">✅ Tersedia</span>' : '<span style="color:#ff6b6b;font-size:.75rem;">❌ Habis</span>';
    const foto = m.foto ? `<img src="${m.foto}" alt="${m.nama}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.style.display='none'">` : '';
    box.innerHTML += `
      <div style="background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px;">
        ${foto}
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
          <div>
            <div style="font-weight:bold;color:var(--white);">${m.nama}</div>
            <div style="color:var(--cream);font-size:.85rem;">${formatRupiah(m.harga)}</div>
            ${m.deskripsi ? `<div style="color:var(--dim);font-size:.75rem;margin-top:4px;">${m.deskripsi}</div>` : ''}
          </div>
          ${status}
        </div>
        <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="editMenu('${m._key}', ${kelompok})">Edit</button>
          <button class="btn btn-secondary btn-sm" onclick="toggleMenuTersedia('${m._key}', ${kelompok}, ${m.tersedia?false:true})">${m.tersedia?'Set Habis':'Set Tersedia'}</button>
          <button class="btn btn-danger btn-sm" onclick="hapusMenu('${m._key}', ${kelompok})">Hapus</button>
        </div>
      </div>`;
  });
}

function simpanPengaturanKelompok() {
  if(!currentUser) return;
  if(currentUser.role!=='admin' && currentUser.role!=='developer') return;
  const n1 = document.getElementById('set-nama-k1').value.trim();
  const n2 = document.getElementById('set-nama-k2').value.trim();
  const w1 = document.getElementById('set-wa-k1').value.trim().replace(/[^0-9]/g,'');
  const w2 = document.getElementById('set-wa-k2').value.trim().replace(/[^0-9]/g,'');
  if((w1 && w1.length < 10) || (w2 && w2.length < 10)) { showAlert("Nomor WA tidak valid (min. 10 digit)."); return; }
  window.fbSet(window.fbRef(window.db, 'settings/kelompok1Nama'), n1 || "Kelompok 1");
  window.fbSet(window.fbRef(window.db, 'settings/kelompok2Nama'), n2 || "Kelompok 2");
  window.fbSet(window.fbRef(window.db, 'settings/waKelompok1'), w1);
  window.fbSet(window.fbRef(window.db, 'settings/waKelompok2'), w2);
  showAlert("Pengaturan kelompok disimpan.", "✅ Berhasil");
}

function simpanMenu() {
  if(!currentUser) return;
  if(currentUser.role!=='admin' && currentUser.role!=='developer') return;
  const kel = document.getElementById('menu-kelompok').value;
  const nama = document.getElementById('menu-nama').value.trim();
  const harga = parseInt(document.getElementById('menu-harga').value);
  const foto = document.getElementById('menu-foto').value.trim();
  const deskripsi = document.getElementById('menu-deskripsi').value.trim();
  const tersedia = document.getElementById('menu-tersedia').checked;
  const editKey = document.getElementById('edit-menu-key').value;
  if(!nama || isNaN(harga) || harga <= 0) { showAlert("Nama dan harga menu wajib diisi!"); return; }
  const data = { nama, harga, foto, deskripsi, tersedia };
  if(editKey) {
    window.fbUpdate(window.fbRef(window.db, 'menus/kelompok'+kel+'/'+editKey), data);
  } else {
    window.fbSet(window.fbPush(window.fbRef(window.db, 'menus/kelompok'+kel)), data);
  }
  resetFormMenu();
  showAlert("Menu disimpan.", "✅ Berhasil");
}

function editMenu(key, kel) {
  const list = kel===1 ? menus1 : menus2;
  const m = list.find(x => x._key === key);
  if(!m) return;
  document.getElementById('form-menu-title').innerText = '✏️ Edit Menu';
  document.getElementById('edit-menu-key').value = key;
  document.getElementById('menu-kelompok').value = String(kel);
  document.getElementById('menu-nama').value = m.nama || '';
  document.getElementById('menu-harga').value = m.harga || '';
  document.getElementById('menu-foto').value = m.foto || '';
  document.getElementById('menu-deskripsi').value = m.deskripsi || '';
  document.getElementById('menu-tersedia').checked = !!m.tersedia;
  document.getElementById('btn-batal-menu').classList.remove('hidden');
}

function resetFormMenu() {
  document.getElementById('form-menu-title').innerText = '➕ Tambah Menu';
  document.getElementById('edit-menu-key').value = '';
  document.getElementById('menu-nama').value = '';
  document.getElementById('menu-harga').value = '';
  document.getElementById('menu-foto').value = '';
  document.getElementById('menu-deskripsi').value = '';
  document.getElementById('menu-tersedia').checked = true;
  document.getElementById('btn-batal-menu').classList.add('hidden');
}

function toggleMenuTersedia(key, kel, val) {
  window.fbUpdate(window.fbRef(window.db, 'menus/kelompok'+kel+'/'+key), { tersedia: val });
}

function hapusMenu(key, kel) {
  if(!confirm("Hapus menu ini?")) return;
  window.fbRemove(window.fbRef(window.db, 'menus/kelompok'+kel+'/'+key));
}

// ================= HALAMAN ORDER =================
function renderHalamanOrder(){
  const j1 = document.getElementById('order-judul-k1');
  const j2 = document.getElementById('order-judul-k2');
  if(j1) j1.innerText = namaK1;
  if(j2) j2.innerText = namaK2;
  renderMenuOrder('order-list-k1', menus1, 1);
  renderMenuOrder('order-list-k2', menus2, 2);
  renderKeranjang();
}

function renderMenuOrder(containerId, list, kelompok){
  const box = document.getElementById(containerId);
  if(!box) return;
  const aktif = list.filter(m => m.tersedia);
  if(aktif.length === 0){
    box.innerHTML = '<p style="color:var(--dim);font-size:.85rem;">Belum ada menu tersedia.</p>';
    return;
  }
  box.innerHTML = '';
  aktif.slice().sort((a,b) => (a.nama||'').localeCompare(b.nama||'')).forEach(m => {
    const qty = keranjang[kelompok + '_' + m._key] ? keranjang[kelompok + '_' + m._key].qty : 0;
    const foto = m.foto ? `<img src="${m.foto}" alt="${m.nama}" onerror="this.style.display='none'">` : `<div style="width:70px;height:70px;border-radius:8px;background:#14110f;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.5rem;">🍽️</div>`;
    const kontrol = qty > 0
      ? `<div class="qty-control">
           <button onclick="ubahQty(${kelompok}, '${m._key}', -1)">−</button>
           <span class="qty-num">${qty}</span>
           <button onclick="ubahQty(${kelompok}, '${m._key}', 1)">+</button>
         </div>`
      : `<button class="btn-plus" onclick="ubahQty(${kelompok}, '${m._key}', 1)">+</button>`;
    box.innerHTML += `
      <div class="menu-card">
        ${foto}
        <div class="menu-card-info">
          <h5>${m.nama}</h5>
          <div class="menu-harga">${formatRupiah(m.harga)}</div>
          ${m.deskripsi ? `<div class="menu-desc">${m.deskripsi}</div>` : ''}
        </div>
        ${kontrol}
      </div>`;
  });
}

function ubahQty(kelompok, key, delta){
  const list = kelompok===1 ? menus1 : menus2;
  const m = list.find(x => x._key === key);
  if(!m) return;
  const id = kelompok + '_' + key;
  if(!keranjang[id]) keranjang[id] = { kelompok, key, nama: m.nama, harga: m.harga, qty: 0 };
  keranjang[id].qty += delta;
  if(keranjang[id].qty <= 0) delete keranjang[id];
  renderHalamanOrder();
}

function hapusDariKeranjang(id){
  delete keranjang[id];
  renderHalamanOrder();
}

function hitungTotalKeranjang(){
  let sub1 = 0, sub2 = 0;
  Object.keys(keranjang).forEach(id => {
    const it = keranjang[id];
    const total = it.harga * it.qty;
    if(it.kelompok === 1) sub1 += total; else sub2 += total;
  });
  return { sub1, sub2, total: sub1 + sub2 };
}

function renderKeranjang(){
  const box = document.getElementById('keranjang-list');
  if(!box) return;
  const ids = Object.keys(keranjang);
  if(ids.length === 0){
    box.innerHTML = '<p style="color:var(--dim);font-size:.85rem;">Keranjang masih kosong.</p>';
    return;
  }
  const items1 = ids.filter(id => keranjang[id].kelompok === 1);
  const items2 = ids.filter(id => keranjang[id].kelompok === 2);
  let html = '';
  if(items1.length > 0){
    html += `<div class="keranjang-group"><h5>${namaK1}</h5>`;
    let sub = 0;
    items1.forEach(id => {
      const it = keranjang[id]; const tot = it.harga * it.qty; sub += tot;
      html += `<div class="keranjang-item"><span class="nama">${it.nama} × ${it.qty}</span><span class="harga">${formatRupiah(tot)}</span><button class="hapus" onclick="hapusDariKeranjang('${id}')">✕</button></div>`;
    });
    html += `<div class="keranjang-subtotal">Subtotal: ${formatRupiah(sub)}</div></div>`;
  }
  if(items2.length > 0){
    html += `<div class="keranjang-group"><h5>${namaK2}</h5>`;
    let sub = 0;
    items2.forEach(id => {
      const it = keranjang[id]; const tot = it.harga * it.qty; sub += tot;
      html += `<div class="keranjang-item"><span class="nama">${it.nama} × ${it.qty}</span><span class="harga">${formatRupiah(tot)}</span><button class="hapus" onclick="hapusDariKeranjang('${id}')">✕</button></div>`;
    });
    html += `<div class="keranjang-subtotal">Subtotal: ${formatRupiah(sub)}</div></div>`;
  }
  const t = hitungTotalKeranjang();
  html += `<div class="keranjang-total"><span class="label">TOTAL KESELURUHAN</span><span class="nilai">${formatRupiah(t.total)}</span></div>`;
  box.innerHTML = html;
}

function generateKodePesanan(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  const rand = String(Math.floor(Math.random()*900)+100);
  return `ORD-${y}${m}${d}-${rand}`;
}

function prosesPesanan(){
  const ids = Object.keys(keranjang);
  if(ids.length === 0){ showAlert("Keranjang masih kosong."); return; }
  const nama = document.getElementById('order-nama').value.trim();
  const alamat = document.getElementById('order-alamat').value.trim();
  const hpRaw = document.getElementById('order-hp').value.trim();
  const catatan = document.getElementById('order-catatan').value.trim();
  if(!nama || !alamat || !hpRaw){ showAlert("Nama, Alamat/Kelas, dan No HP wajib diisi!"); return; }
  const hp = hpRaw.replace(/[^0-9]/g,'');
  if(hp.length < 9){ showAlert("Nomor HP tidak valid."); return; }

  const kode = generateKodePesanan();
  const waktu = new Date().toISOString();

  const items1 = ids.filter(id => keranjang[id].kelompok === 1).map(id => {
    const it = keranjang[id];
    return { nama: it.nama, harga: it.harga, qty: it.qty, subtotal: it.harga * it.qty };
  });
  const items2 = ids.filter(id => keranjang[id].kelompok === 2).map(id => {
    const it = keranjang[id];
    return { nama: it.nama, harga: it.harga, qty: it.qty, subtotal: it.harga * it.qty };
  });

  const baseData = { kodePesanan: kode, nama, alamat, noHp: hp, catatan, waktu, status: "baru" };

  if(items1.length > 0){
    const sub1 = items1.reduce((a,b)=>a+b.subtotal, 0);
    window.fbSet(window.fbPush(window.fbRef(window.db, 'pesanan')), {...baseData, kelompok: 1, items: items1, subtotal: sub1});
  }
  if(items2.length > 0){
    const sub2 = items2.reduce((a,b)=>a+b.subtotal, 0);
    window.fbSet(window.fbPush(window.fbRef(window.db, 'pesanan')), {...baseData, kelompok: 2, items: items2, subtotal: sub2});
  }

  tampilkanModalOrder(kode, nama, alamat, hp, catatan, items1, items2);
  keranjang = {};
  document.getElementById('order-nama').value = '';
  document.getElementById('order-alamat').value = '';
  document.getElementById('order-hp').value = '';
  document.getElementById('order-catatan').value = '';
  renderHalamanOrder();
}

function tampilkanModalOrder(kode, nama, alamat, hp, catatan, items1, items2){
  const modal = document.getElementById('order-modal');
  document.getElementById('order-modal-kode').innerText = 'Kode: ' + kode;

  const sub1 = items1.reduce((a,b)=>a+b.subtotal,0);
  const sub2 = items2.reduce((a,b)=>a+b.subtotal,0);
  const total = sub1 + sub2;

  let ringkasan = '';
  if(items1.length > 0){
    ringkasan += `<div style="margin-bottom:8px;"><strong style="color:var(--brown);">${namaK1}</strong><br>`;
    items1.forEach(it => { ringkasan += `${it.nama} × ${it.qty} = ${formatRupiah(it.subtotal)}<br>`; });
    ringkasan += `Subtotal: ${formatRupiah(sub1)}</div>`;
  }
  if(items2.length > 0){
    ringkasan += `<div style="margin-bottom:8px;"><strong style="color:var(--brown);">${namaK2}</strong><br>`;
    items2.forEach(it => { ringkasan += `${it.nama} × ${it.qty} = ${formatRupiah(it.subtotal)}<br>`; });
    ringkasan += `Subtotal: ${formatRupiah(sub2)}</div>`;
  }
  ringkasan += `<div style="border-top:2px solid var(--brown);padding-top:8px;margin-top:8px;font-weight:bold;color:var(--brown);">TOTAL: ${formatRupiah(total)}</div>`;
  document.getElementById('order-modal-ringkasan').innerHTML = ringkasan;

  const btnBox = document.getElementById('order-modal-buttons');
  btnBox.innerHTML = '';

  if(items1.length > 0){
    const pesan1 = buatPesanWA(kode, nama, alamat, hp, catatan, items1, sub1);
    const url1 = waK1 ? `https://wa.me/${waK1}?text=${encodeURIComponent(pesan1)}` : '';
    if(url1) btnBox.innerHTML += `<a class="wa-btn k1" href="${url1}" target="_blank" rel="noopener">📲 Kirim ke ${namaK1}</a>`;
    else btnBox.innerHTML += `<div style="color:#ff6b6b;font-size:.8rem;">⚠️ Nomor WA ${namaK1} belum diatur admin.</div>`;
  }
  if(items2.length > 0){
    const pesan2 = buatPesanWA(kode, nama, alamat, hp, catatan, items2, sub2);
    const url2 = waK2 ? `https://wa.me/${waK2}?text=${encodeURIComponent(pesan2)}` : '';
    if(url2) btnBox.innerHTML += `<a class="wa-btn k2" href="${url2}" target="_blank" rel="noopener">📲 Kirim ke ${namaK2}</a>`;
    else btnBox.innerHTML += `<div style="color:#ff6b6b;font-size:.8rem;">⚠️ Nomor WA ${namaK2} belum diatur admin.</div>`;
  }

  modal.classList.remove('hidden');
  modal.classList.add('show');
}
function tutupOrderModal(){
  const modal = document.getElementById('order-modal');
  modal.classList.remove('show');
  modal.classList.add('hidden');
}

function buatPesanWA(kode, nama, alamat, hp, catatan, items, subtotal){
  let msg = `Kode: ${kode}\nNama: ${nama}\nAlamat/Kelas: ${alamat}\nNo HP: ${hp}\nCatatan: ${catatan || '-'}\n\nPesanan:\n`;
  items.forEach(it => { msg += `- ${it.nama} x${it.qty} = ${formatRupiah(it.subtotal)}\n`; });
  msg += `\nSubtotal: ${formatRupiah(subtotal)}`;
  return msg;
}

// ================= DAFTAR PESANAN (ADMIN/DEV) =================
function renderDaftarPesanan(){
  if(!currentUser) return;
  if(currentUser.role!=='admin' && currentUser.role!=='developer') return;
  const box = document.getElementById('pesanan-list-container');
  if(!box) return;
  const fk = document.getElementById('filter-kelompok').value;
  const fs = document.getElementById('filter-status').value;
  let list = pesanan.slice().sort((a,b) => new Date(b.waktu) - new Date(a.waktu));
  if(fk !== 'all') list = list.filter(p => String(p.kelompok) === fk);
  if(fs !== 'all') list = list.filter(p => p.status === fs);
  if(list.length === 0){
    box.innerHTML = '<p style="color:var(--dim);">Tidak ada pesanan.</p>';
    return;
  }
  box.innerHTML = '';
  list.forEach(p => {
    const namaKel = p.kelompok === 1 ? namaK1 : namaK2;
    const badge = `<span class="status-badge status-${p.status}">${labelStatus(p.status)}</span>`;
    let itemsHtml = '';
    (p.items || []).forEach(it => { itemsHtml += `<div class="item-row"><span>${it.nama} × ${it.qty}</span><span>${formatRupiah(it.subtotal)}</span></div>`; });
    const tgl = new Date(p.waktu).toLocaleString('id-ID', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    box.innerHTML += `
      <div class="pesanan-card">
        <div class="pesanan-header">
          <div><div class="kode">${p.kodePesanan} · ${namaKel}</div><div class="waktu">${tgl}</div></div>
          ${badge}
        </div>
        <div class="pelanggan">
          <strong>${p.nama}</strong> · ${p.alamat}<br>
          HP: <a href="https://wa.me/${p.noHp}" target="_blank" style="color:var(--brown);text-decoration:none;">${p.noHp}</a><br>
          Catatan: ${p.catatan || '-'}
        </div>
        <div class="items">
          ${itemsHtml}
          <div class="subtotal-row"><span>Subtotal</span><span>${formatRupiah(p.subtotal)}</span></div>
        </div>
        <div class="aksi">
          <button class="btn btn-success btn-sm" onclick="ubahStatusPesanan('${p._key}', 'diproses')">🍳 Proses</button>
          <button class="btn btn-primary btn-sm" onclick="ubahStatusPesanan('${p._key}', 'selesai')">✅ Selesai</button>
          <button class="btn btn-danger btn-sm" onclick="ubahStatusPesanan('${p._key}', 'dibatalkan')">❌ Batal</button>
          <button class="btn btn-secondary btn-sm" onclick="waTerimaKasih('${p._key}')">🙏 Terima Kasih</button>
        </div>
      </div>`;
  });
}

function labelStatus(s){
  if(s==='baru') return 'Baru';
  if(s==='diproses') return 'Diproses';
  if(s==='selesai') return 'Selesai';
  if(s==='dibatalkan') return 'Dibatalkan';
  return s;
}

function ubahStatusPesanan(key, statusBaru){
  const p = pesanan.find(x => x._key === key);
  if(!p) return;
  window.fbUpdate(window.fbRef(window.db, 'pesanan/' + key), { status: statusBaru });

  if(statusBaru === 'diproses'){
    const msg = `Kode: ${p.kodePesanan}\nHalo ${p.nama}, pesanan Anda sedang diproses 🍳`;
    bukaWAKePelanggan(p.noHp, msg);
  } else if(statusBaru === 'selesai'){
    const namaKel = p.kelompok === 1 ? namaK1 : namaK2;
    let msg = `Kode: ${p.kodePesanan}\nHalo ${p.nama}, pesanan Anda sudah selesai.\nSilakan ambil ke ${namaKel}.\n\nRincian:\n`;
    (p.items||[]).forEach(it => { msg += `- ${it.nama} x${it.qty} = ${formatRupiah(it.subtotal)}\n`; });
    msg += `\nSubtotal: ${formatRupiah(p.subtotal)}\n\nTerima kasih 🙏`;
    bukaWAKePelanggan(p.noHp, msg);
  }
}

function waTerimaKasih(key){
  const p = pesanan.find(x => x._key === key);
  if(!p) return;
  const namaKel = p.kelompok === 1 ? namaK1 : namaK2;
  const msg = `Kode: ${p.kodePesanan}\nTerima kasih telah order di ${namaKel} 🙏`;
  bukaWAKePelanggan(p.noHp, msg);
}

function bukaWAKePelanggan(noHp, pesan){
  const hp = String(noHp||'').replace(/[^0-9]/g,'');
  if(!hp){ showAlert("Nomor HP pelanggan tidak valid."); return; }
  let wa = hp;
  if(wa.startsWith('0')) wa = '62' + wa.slice(1);
  window.open(`https://wa.me/${wa}?text=${encodeURIComponent(pesan)}`, '_blank');
}

// ================= ENTER UNTUK LOGIN & CHAT =================
document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    const loginPage = document.getElementById('page-login');
    if (loginPage && !loginPage.classList.contains('hidden')) { handleLogin(); event.preventDefault(); return; }
    const chatInputUser = document.getElementById('chat-input-user');
    if (document.activeElement === chatInputUser) { kirimPesanUser(); event.preventDefault(); return; }
    const chatInputDev = document.getElementById('chat-input-dev');
    if (document.activeElement === chatInputDev) { kirimPesanDev(); event.preventDefault(); return; }
  }
});
