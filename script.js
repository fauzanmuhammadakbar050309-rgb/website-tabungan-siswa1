let users = []; let piket = []; let tabungan = []; let chats = []; let driveLink = "https://drive.google.com";
let menu = []; let pesanan = []; let waOrder = '';
let currentUser = JSON.parse(sessionStorage.getItem('app_current_user')) || null;
let firebaseReady = false; let selectedSiswaTabungan = null; let selectedChatUser = null;
let pressTimer;
let deferredPrompt;

const defaultUsers = [
  {nama:"Administrator Utama",username:"admin",password:"123",role:"admin",status:"offline"},
  {nama:"Developer Sistem",username:"dev",password:"123",role:"developer",status:"offline"}
];
const defaultPiket = [{hari:"Senin",anggota:"Fauzan, Raisya"},{hari:"Selasa",anggota:"Budi, Siti"},{hari:"Rabu",anggota:"Joko"},{hari:"Kamis",anggota:"Doni, Maya"},{hari:"Jumat",anggota:"Eko, Dian"}];

// ==================== HELPER UMUM ====================
function showAlert(pesan, judul = "⚠️ Peringatan") {
  document.getElementById('alert-title').innerText = judul;
  document.getElementById('alert-message').innerText = pesan;
  document.getElementById('custom-alert').classList.add('show');
}
function tutupAlert() {
  document.getElementById('custom-alert').classList.remove('show');
}
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function formatRupiah(n){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n||0);}
function konversiLinkFoto(url) {
  if (!url || typeof url !== 'string') return '';
  url = url.trim();
  if (!url) return '';
  const p1 = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const p2 = /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const p3 = /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/;
  let match = url.match(p1) || url.match(p2) || url.match(p3);
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  return url;
}

// ==================== PWA ====================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredPrompt = e;
  if(!window.matchMedia('(display-mode: standalone)').matches && !window.navigator.standalone){
    document.getElementById('btn-install-pwa').style.display = 'block';
  }
});
function installPWA() {
  if(deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') document.getElementById('btn-install-pwa').style.display = 'none';
      deferredPrompt = null;
    });
  } else {
    showAlert("Untuk menginstall: Klik menu titik tiga di Chrome, lalu pilih 'Tambahkan ke Layar Utama'.");
  }
}

// ==================== ANIMASI ====================
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

// ==================== FIREBASE READY ====================
window.addEventListener('firebase-ready', () => {
  firebaseReady = true;
  updateClock();
  initFirebaseListeners();
  initScrollReveal();
  jalankanGacha();
  initProgressBar();
});

function initFirebaseListeners(){
  window.fbOnValue(window.fbRef(window.db, 'users'), (snap) => {
    const data = snap.val();
    if(data){ users = Object.keys(data).map(k => ({...data[k], _key: k})); }
    else { defaultUsers.forEach(u => { window.fbSet(window.fbPush(window.fbRef(window.db, 'users')), u); }); }
    if(currentUser){ const found = users.find(u => u.username === currentUser.username); if(found){ currentUser = found; sessionStorage.setItem('app_current_user', JSON.stringify(found)); } }
    if(currentUser && currentUser.role === 'developer') renderTabelAkun();
  });

  window.fbOnValue(window.fbRef(window.db, 'piket'), (snap) => {
    const data = snap.val();
    if(data){ piket = Object.keys(data).map(k => ({...data[k], _key: k})); }
    else { defaultPiket.forEach((p) => { window.fbSet(window.fbRef(window.db, 'piket/' + p.hari), p); }); }
    renderPiket(); renderLandingPiket();
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

  // ORDER
  window.fbOnValue(window.fbRef(window.db, 'menu'), (snap) => {
    const data = snap.val();
    menu = data ? Object.keys(data).map(k => ({...data[k], _key:k})) : [];
    if(currentUser && !document.getElementById('page-kelola-menu').classList.contains('hidden')) renderKelolaMenu();
  });
  window.fbOnValue(window.fbRef(window.db, 'pesanan'), (snap) => {
    const data = snap.val();
    pesanan = data ? Object.keys(data).map(k => ({...data[k], _key:k})).sort((a,b)=> new Date(b.waktu) - new Date(a.waktu)) : [];
    updateBadgePesananBaru();
    if(currentUser && !document.getElementById('page-daftar-pesanan').classList.contains('hidden')) renderDaftarPesanan();
  });
  window.fbOnValue(window.fbRef(window.db, 'settings/waOrder'), (snap) => {
    waOrder = snap.val() || '';
    const el = document.getElementById('setting-wa-order');
    if (el) el.value = waOrder;
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
function updateBadgePesananBaru() {
  const badge = document.getElementById('badge-pesanan-baru');
  if (!badge) return;
  const jml = pesanan.filter(p => p.status === 'baru').length;
  badge.innerText = jml;
  badge.classList.toggle('hidden', jml === 0);
}
function markReadDev() { chats.filter(c => c.sender !== 'dev' && !c.readByDev).forEach(c => { window.fbUpdate(window.fbRef(window.db, 'chats/'+c._key), {readByDev: true}); }); }
function markReadUser(uname) { chats.filter(c => c.username === uname && c.sender === 'dev' && !c.readByUser).forEach(c => { window.fbUpdate(window.fbRef(window.db, 'chats/'+c._key), {readByUser: true}); }); }

// ==================== LOGIN/LOGOUT ====================
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
  localStorage.removeItem('remember_login');
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
  const isDev = currentUser.role==='developer'; const isAdminOrDev = currentUser.role==='admin'||isDev;
  document.getElementById('menu-akun-btn').classList.toggle('hidden',!isDev);
  document.getElementById('menu-inbox').classList.toggle('hidden',!isDev);
  document.getElementById('menu-helpdesk').classList.toggle('hidden',isDev);
  document.getElementById('menu-kelola-menu').classList.toggle('hidden',!isDev);
  document.getElementById('menu-daftar-pesanan').classList.toggle('hidden',!isAdminOrDev);
  document.getElementById('menu-setting-wa').classList.toggle('hidden',!isDev);
  ['admin-piket-form','admin-foto-form'].forEach(id=>document.getElementById(id).classList.toggle('hidden',!isDev));
  document.getElementById('tabungan-admin-view').classList.toggle('hidden',!isAdminOrDev);
  document.getElementById('tabungan-siswa-view').classList.toggle('hidden',isAdminOrDev);
  updateClock(); updateNotifBadges();
}

function toggleDropdown(){document.getElementById('dots-dropdown').classList.toggle('show');}
window.onclick=function(e){if(!e.target.matches('.dots-btn')){const d=document.getElementById('dots-dropdown');if(d&&d.classList.contains('show'))d.classList.remove('show');}};

function showPage(pageId){
  document.querySelectorAll('.page-content').forEach(el=>el.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');
  document.getElementById('dots-dropdown').classList.remove('show');
  
  if(!currentUser && pageId !== 'page-landing' && pageId !== 'page-login') {
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
  if(pageId==='page-inbox'){renderInbox(); markReadDev();}
  if(pageId==='page-profil')renderProfil();
  if(pageId==='page-akun')renderTabelAkun();
  if(pageId==='page-kelola-menu') renderKelolaMenu();
  if(pageId==='page-daftar-pesanan') renderDaftarPesanan();
  if(pageId==='page-setting-wa') document.getElementById('setting-wa-order').value = waOrder || '';
}

// ==================== PIKET ====================
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
    container.innerHTML += `<label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:0.85rem;color:var(--white);cursor:pointer;"><input type="checkbox" class="check-piket" value="${siswa.nama}" ${isChecked}> ${siswa.nama}</label>`;
  });
}
function simpanPiket(){
  if(currentUser.role!=='developer')return;
  const h = document.getElementById('piket-hari').value;
  const selected = Array.from(document.querySelectorAll('.check-piket:checked')).map(c => c.value);
  if(selected.length === 0){ showAlert("Pilih minimal satu siswa untuk piket!"); return; }
  window.fbSet(window.fbRef(window.db, 'piket/' + h), {hari:h, anggota:selected.join(', ')});
  showAlert("Jadwal piket " + h + " berhasil diperbarui!", "✅ Berhasil");
  renderPiket(); renderLandingPiket();
}

// ==================== FOTO / GDRIVE ====================
function renderFotoPage(){document.getElementById('gdrive-button-link').href=driveLink;document.getElementById('input-gdrive-link').value=driveLink;}
function simpanDriveLink(){
  if(currentUser.role!=='developer')return;
  const l=document.getElementById('input-gdrive-link').value.trim();
  if(!l){showAlert("Link tidak boleh kosong!");return;}
  window.fbSet(window.fbRef(window.db, 'settings/driveLink'), l); showAlert("Link berhasil diperbarui!", "✅ Berhasil");
}

// ==================== TABUNGAN ====================
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

// ==================== CHAT ====================
function startPress(key) {
  pressTimer = window.setTimeout(() => {
    if(confirm("Hapus pesan ini?")) window.fbRemove(window.fbRef(window.db, 'chats/'+key));
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
    div.innerHTML = `<div class="chat-meta"><strong>${isDev?'Developer':currentUser.nama}</strong> <span>${c.jam}</span></div><div>${escapeHtml(c.pesan)}</div>`;
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
  chats.filter(c => c.username === currentUser.username).forEach(c => {
    window.fbRemove(window.fbRef(window.db, 'chats/' + c._key));
  });
  showAlert("Room chat berhasil dihapus.", "✅ Berhasil");
}
function renderInbox(){
  const list = document.getElementById('inbox-list'); if(!list) return; list.innerHTML='';
  const grouped = {};
  chats.forEach(c => {
    if(c.sender !== 'dev') {
      if(!grouped[c.username]) grouped[c.username] = {nama: c.nama, lastMsg: c.pesan, count: 0, unread: 0};
      grouped[c.username].lastMsg = c.pesan;
      grouped[c.username].count++;
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
    div.innerHTML = `<div class="chat-meta"><strong>${isDev?'Anda (Dev)':escapeHtml(c.nama)}</strong> <span>${c.jam}</span></div><div>${escapeHtml(c.pesan)}</div>`;
    div.onmousedown = () => startPress(c._key);
    div.onmouseup = cancelPress; div.onmouseleave = cancelPress;
    div.ontouchstart = () => startPress(c._key);
    div.ontouchend = cancelPress;
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
  chats.filter(c => c.username === selectedChatUser).forEach(c => {
    window.fbRemove(window.fbRef(window.db, 'chats/' + c._key));
  });
  showAlert("Room chat berhasil dihapus.", "✅ Berhasil");
  kembaliKeInbox();
}

// ==================== PROFIL ====================
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

// ==================== AKUN ====================
function renderTabelAkun(){
  if(!currentUser || currentUser.role!=='developer')return;
  const tbody=document.getElementById('tabel-akun-body');tbody.innerHTML='';
  users.forEach((u)=>{
    const br=u.role==='admin'?'<span style="color:var(--brown);font-weight:bold;">Admin</span>':(u.role==='developer'?'<span style="color:#ff6b6b;font-weight:bold;">Developer</span>':'<span style="color:var(--cream);">Siswa</span>');
    const bs=u.status==='online'?'<span style="color:#8dd694;font-weight:bold;">Online</span>':'<span style="color:var(--dim);">Offline</span>';
    tbody.innerHTML+=`<tr><td data-label="Nama">${escapeHtml(u.nama)}</td><td data-label="Username">${escapeHtml(u.username)}</td><td data-label="Password">${escapeHtml(u.password)}</td><td data-label="Role">${br}</td><td data-label="Status">${bs}</td><td data-label="Aksi"><button class="btn btn-primary btn-sm" onclick="editAkun('${u._key}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="hapusAkun('${u._key}')">Hapus</button></td></tr>`;
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
function importAkunSiswa(){
  if(currentUser.role!=='developer') return;
  const raw = document.getElementById('import-file').value.trim();
  if(!raw){ showAlert("Kolom import masih kosong!"); return; }
  const lines = raw.split('\n'); let berhasil = 0; let gagal = 0;
  lines.forEach(line => {
    if(!line.trim()) return;
    const parts = line.split(',');
    if(parts.length >= 2){
      const nama = parts[0].trim(); const username = parts[1].trim(); const password = parts[2] ? parts[2].trim() : "123";
      if(users.some(u => u.username === username)){ gagal++; }
      else { window.fbSet(window.fbPush(window.fbRef(window.db, 'users')), {nama, username, password, role:"siswa", status:"offline"}); berhasil++; }
    } else { gagal++; }
  });
  showAlert(`Import selesai!\nBerhasil: ${berhasil} akun\nGagal/Duplikat: ${gagal} akun`, "✅ Import Selesai");
  document.getElementById('import-file').value = '';
}

// ==================== ORDER PESANAN ====================
function previewFotoDariLink() {
  const raw = document.getElementById('menu-foto-url').value;
  const url = konversiLinkFoto(raw);
  const box = document.getElementById('menu-foto-preview');
  const img = document.getElementById('menu-foto-img');
  const err = document.getElementById('menu-foto-error');
  if (!url) { box.style.display = 'none'; return; }
  img.src = url;
  img.onload = () => { box.style.display = 'block'; err.style.display = 'none'; };
  img.onerror = () => { box.style.display = 'block'; err.style.display = 'block'; };
}
function simpanMenu() {
  if (!currentUser || currentUser.role !== 'developer') return;
  const nama = document.getElementById('menu-nama').value.trim();
  const harga = parseInt(document.getElementById('menu-harga').value);
  const fotoRaw = document.getElementById('menu-foto-url').value.trim();
  const editKey = document.getElementById('edit-menu-key').value;
  if (!nama || isNaN(harga) || harga <= 0) { showAlert("Nama dan harga menu wajib diisi!"); return; }
  const foto = fotoRaw ? konversiLinkFoto(fotoRaw) : null;
  const dataMenu = { nama, harga, foto: foto || null, aktif:true, updatedAt: new Date().toISOString() };
  if (editKey) { window.fbUpdate(window.fbRef(window.db, 'menu/' + editKey), dataMenu); showAlert("Menu berhasil diperbarui!", "✅ Berhasil"); }
  else { window.fbSet(window.fbPush(window.fbRef(window.db, 'menu')), dataMenu); showAlert("Menu baru berhasil ditambahkan!", "✅ Berhasil"); }
  resetFormMenu();
}
function resetFormMenu() {
  document.getElementById('menu-nama').value = '';
  document.getElementById('menu-harga').value = '';
  document.getElementById('menu-foto-url').value = '';
  document.getElementById('menu-foto-preview').style.display = 'none';
  document.getElementById('edit-menu-key').value = '';
  document.getElementById('form-menu-title').innerText = 'Tambah Menu Baru';
  document.getElementById('btn-batal-edit-menu').classList.add('hidden');
}
function editMenu(key) {
  const m = menu.find(x => x._key === key); if (!m) return;
  document.getElementById('menu-nama').value = m.nama;
  document.getElementById('menu-harga').value = m.harga;
  document.getElementById('menu-foto-url').value = m.foto || '';
  document.getElementById('edit-menu-key').value = key;
  document.getElementById('form-menu-title').innerText = 'Edit Menu';
  document.getElementById('btn-batal-edit-menu').classList.remove('hidden');
  if (m.foto) previewFotoDariLink(); else document.getElementById('menu-foto-preview').style.display = 'none';
}
function hapusMenu(key) {
  if (!currentUser || currentUser.role !== 'developer') return;
  if (!confirm("Hapus menu ini?")) return;
  window.fbRemove(window.fbRef(window.db, 'menu/' + key));
  showAlert("Menu dihapus.", "✅ Berhasil");
}
function renderKelolaMenu() {
  const container = document.getElementById('daftar-menu-container');
  if (!container) return;
  container.innerHTML = '';
  if (menu.length === 0) { container.innerHTML = '<p style="color:var(--dim);text-align:center;grid-column:1/-1;">Belum ada menu. Tambahkan menu pertama!</p>'; return; }
  menu.forEach(m => {
    const fotoHtml = m.foto ? `<div class="menu-card-img"><img src="${escapeHtml(m.foto)}" alt="${escapeHtml(m.nama)}" loading="lazy" onerror="this.parentElement.innerHTML='🍽️'"></div>` : `<div class="menu-card-img">🍽️</div>`;
    container.innerHTML += `<div class="menu-card">${fotoHtml}<div class="menu-card-body"><h5>${escapeHtml(m.nama)}</h5><div class="harga">${formatRupiah(m.harga)}</div><div class="aksi"><button class="btn btn-primary btn-sm" onclick="editMenu('${m._key}')">✏️ Edit</button><button class="btn btn-danger btn-sm" onclick="hapusMenu('${m._key}')">🗑️ Hapus</button></div></div></div>`;
  });
}
function bukaModalOrder() {
  const menuAktif = menu.filter(m => m.aktif !== false);
  if (menuAktif.length === 0) { showAlert("Belum ada menu tersedia. Hubungi developer."); return; }
  document.getElementById('modal-order').classList.add('show');
  document.getElementById('order-nama').value = '';
  document.getElementById('order-alamat').value = '';
  document.getElementById('order-catatan').value = '';
  renderMenuOrderPublik();
  document.getElementById('order-total').innerText = 'Rp 0';
}
function tutupModalOrder() { document.getElementById('modal-order').classList.remove('show'); }
function renderMenuOrderPublik() {
  const container = document.getElementById('modal-menu-list'); if (!container) return; container.innerHTML = '';
  const menuAktif = menu.filter(m => m.aktif !== false);
  menuAktif.forEach(m => {
    const thumbHtml = m.foto ? `<div class="thumb"><img src="${escapeHtml(m.foto)}" alt="${escapeHtml(m.nama)}" onerror="this.parentElement.innerHTML='🍽️'"></div>` : `<div class="thumb">🍽️</div>`;
    container.innerHTML += `<div class="menu-item-order">${thumbHtml}<div class="menu-item-order-info"><h5>${escapeHtml(m.nama)}</h5><div class="harga">${formatRupiah(m.harga)}</div></div><input type="number" min="0" value="0" data-key="${m._key}" data-harga="${m.harga}" class="qty-order-input" onchange="hitungTotalOrder()" oninput="hitungTotalOrder()"></div>`;
  });
}
function hitungTotalOrder() {
  let total = 0;
  document.querySelectorAll('.qty-order-input').forEach(inp => { total += (parseInt(inp.value) || 0) * (parseInt(inp.dataset.harga) || 0); });
  document.getElementById('order-total').innerText = formatRupiah(total);
}
function checkoutOrder() {
  const nama = document.getElementById('order-nama').value.trim();
  const alamat = document.getElementById('order-alamat').value.trim();
  const catatan = document.getElementById('order-catatan').value.trim();
  if (!nama) { showAlert("Nama pemesan wajib diisi!"); return; }
  if (!alamat) { showAlert("Alamat wajib diisi!"); return; }
  const items = []; let total = 0;
  document.querySelectorAll('.qty-order-input').forEach(inp => {
    const qty = parseInt(inp.value) || 0;
    if (qty > 0) {
      const m = menu.find(x => x._key === inp.dataset.key);
      if (m) { const subtotal = m.harga * qty; items.push({ nama: m.nama, harga: m.harga, qty, subtotal }); total += subtotal; }
    }
  });
  if (items.length === 0) { showAlert("Pilih minimal 1 menu!"); return; }
  if (!waOrder) { showAlert("Nomor WhatsApp tujuan belum diatur. Hubungi developer."); return; }
  const now = new Date();
  const kodeOrder = 'ORD-' + now.getTime();
  const pesananData = { kode: kodeOrder, namaPemesan: nama, alamat, catatan, items, total, status: 'baru', waktu: now.toISOString(), jam: now.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}), tanggal: now.toLocaleDateString('id-ID') };
  window.fbSet(window.fbPush(window.fbRef(window.db, 'pesanan')), pesananData);
  let teks = `Halo, saya ingin memesan:\n\n`;
  items.forEach(it => { teks += `- ${it.nama} x${it.qty} = ${formatRupiah(it.subtotal)}\n`; });
  teks += `\nTotal: ${formatRupiah(total)}\n\nNama: ${nama}\nAlamat: ${alamat}\n`;
  if (catatan) teks += `Catatan: ${catatan}\n`;
  teks += `\nKode: ${kodeOrder}`;
  window.open(`https://wa.me/${waOrder}?text=${encodeURIComponent(teks)}`, '_blank');
  tutupModalOrder();
  showAlert("Pesanan berhasil dikirim ke WhatsApp!", "✅ Berhasil");
}
function renderDaftarPesanan() {
  const container = document.getElementById('daftar-pesanan-container'); if (!container) return; container.innerHTML = '';
  if (pesanan.length === 0) { container.innerHTML = '<p style="color:var(--dim);text-align:center;">Belum ada pesanan masuk.</p>'; return; }
  pesanan.forEach(p => {
    const statusClass = p.status === 'baru' ? 'baru' : (p.status === 'proses' ? 'proses' : 'selesai');
    const statusLabel = p.status === 'baru' ? '🟡 Baru' : (p.status === 'proses' ? '🟠 Proses' : '🟢 Selesai');
    const itemsHtml = (p.items || []).map(it => `<div>• ${escapeHtml(it.nama)} x${it.qty} = ${formatRupiah(it.subtotal)}</div>`).join('');
    let aksiHtml = '';
    if (p.status === 'baru') aksiHtml = `<button class="btn btn-primary btn-sm" onclick="ubahStatusPesanan('${p._key}','proses')">🟠 Proses</button>`;
    else if (p.status === 'proses') aksiHtml = `<button class="btn btn-success btn-sm" onclick="ubahStatusPesanan('${p._key}','selesai')">🟢 Selesai</button>`;
    container.innerHTML += `<div class="pesanan-card ${statusClass}"><h5>🧑 ${escapeHtml(p.namaPemesan)}</h5><div class="meta">📍 ${escapeHtml(p.alamat)} · 🕐 ${p.tanggal} ${p.jam}</div><span class="status-badge status-${statusClass}">${statusLabel}</span><div class="items">${itemsHtml}</div>${p.catatan ? `<div style="font-size:.8rem;color:var(--dim);margin-bottom:8px;">📝 ${escapeHtml(p.catatan)}</div>` : ''}<div class="total">Total: ${formatRupiah(p.total)}</div><div style="display:flex;gap:6px;flex-wrap:wrap;">${aksiHtml}</div></div>`;
  });
}
function ubahStatusPesanan(key, status) {
  const p = pesanan.find(x => x._key === key); if (!p) return;
  window.fbUpdate(window.fbRef(window.db, 'pesanan/' + key), { status });
  showAlert(`Status pesanan diubah ke "${status}".`, "✅ Berhasil");
}
function simpanSettingWA() {
  if (!currentUser || currentUser.role !== 'developer') return;
  const val = document.getElementById('setting-wa-order').value.trim();
  if (val && !/^[0-9]{10,15}$/.test(val)) { showAlert("Format nomor WA tidak valid. Gunakan 628xxx (tanpa + atau spasi)."); return; }
  window.fbSet(window.fbRef(window.db, 'settings/waOrder'), val);
  showAlert("Nomor WhatsApp berhasil disimpan!", "✅ Berhasil");
}

// ==================== ENTER SHORTCUT ====================
document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    if (!document.getElementById('page-login').classList.contains('hidden')) { handleLogin(); event.preventDefault(); return; }
    if (document.activeElement === document.getElementById('chat-input-user')) { kirimPesanUser(); event.preventDefault(); return; }
    if (document.activeElement === document.getElementById('chat-input-dev')) { kirimPesanDev(); event.preventDefault(); return; }
  }
});
