/* admin.js - dynamic UI logic for admin pages
   NOTE: Replace DATA_URL with your Python API endpoint or JSON file URL.
   The uploaded file path is provided below; transform it to a web URL on your server.
*/
const DATA_URL = "/mnt/data/Custom Office Templates.zip"; // <- replace this with your API endpoint (e.g. http://localhost:5000/api/admin)

// --- small DOM helpers
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// Load admin data (demo). We expect an object like:
// { users:600, brands:2, orders:144, revenue:52625.15, recentOrders:[], recentBrands:[] }
async function loadAdminData(){
  try{
    // Attempt fetch. If DATA_URL is a zip/local path you must serve it via a local server or replace DATA_URL with your API.
    const res = await fetch(DATA_URL, {cache:'no-store'});
    // If server returns JSON:
    if(res.ok){
      const contentType = res.headers.get('content-type') || "";
      if(contentType.includes('application/json')){
        const data = await res.json();
        populateAll(data);
        return;
      }
      // otherwise fallback to demo data if not JSON
    }
  }catch(err){
    // ignore fetch errors; fallback to demo
    // console.warn('Fetch error', err);
  }
  // fallback demo data
  const demo = {
    users: 600,
    brands: 2,
    orders: 144,
    revenue: 52625.15,
    recentOrders: [
      {id: 'ORD-1001', name:'John Doe', total:'₹1,299', date:'2025-11-20'},
      {id: 'ORD-1002', name:'Jane Smith', total:'₹2,499', date:'2025-11-19'}
    ],
    recentBrands:[
      {name:'Rockage', email:'yaswanthworks786@gmail.com', status:'Active'},
      {name:'ROCKAGE', email:'rockage112@gmail.com', status:'Active'}
    ],
    topBrands:[
      {name:'Rockage', revenue:52625.15},
      {name:'ROCKAGE', revenue:52625.15}
    ],
    orderStatus:{delivered:0, shipped:0, processing:0, pending:0},
    monthlyGrowth:24
  };
  populateAll(demo);
}

function populateAll(data){
  populateDashboard(data);
  populateBrandsTable(data);
  populateAnalytics(data);
}

// Populate dashboard widgets
function populateDashboard(data){
  const elU = $('#stat-users .num');
  const elB = $('#stat-brands .num');
  const elO = $('#stat-orders .num');
  const elR = $('#stat-revenue .num');
  if(elU) elU.textContent = data.users ?? '-';
  if(elB) elB.textContent = data.brands ?? '-';
  if(elO) elO.textContent = data.orders ?? '-';
  if(elR) elR.textContent = (data.revenue!=null) ? '₹' + Number(data.revenue).toLocaleString() : '-';

  // recent orders
  const ro = $('#recent-orders');
  if(ro && data.recentOrders){
    ro.innerHTML = data.recentOrders.map(o=>`<div class="card" style="margin-bottom:8px;padding:10px"><strong>${o.id}</strong> — ${o.name} <span style="float:right">${o.total}</span><br><small style="color:${'var(--muted)'}">${o.date}</small></div>`).join('');
  }

  // recent brands
  const rb = $('#recent-brands');
  if(rb && data.recentBrands){
    rb.innerHTML = data.recentBrands.map(b=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(0,0,0,0.03)"><div><strong>${b.name}</strong><br/><small style="color:var(--muted)">${b.email}</small></div><div><span class="status-badge">${b.status}</span></div></div>`).join('');
  }
}

// Populate brands table
function populateBrandsTable(data){
  const tbody = $('#brands-table tbody');
  if(!tbody) return;
  const brands = data.recentBrands || [
    {name:'Rockage', email:'yaswanthworks786@gmail.com', status:'Active', created:'2025-06-27'},
    {name:'ROCKAGE', email:'rockage112@gmail.com', status:'Active', created:'2025-07-01'}
  ];
  tbody.innerHTML = brands.map((b, idx) => `
    <tr>
      <td>${idx+1}</td>
      <td>
        <strong>${b.name}</strong><br/>
        <small style="color:var(--muted)">${b.products ?? 0} products</small>
      </td>
      <td>${b.email}</td>
      <td>${b.location ?? ''}</td>
      <td><span class="status-badge">${b.status}</span></td>
      <td>${b.created ?? ''}</td>
      <td style="text-align:right">
        <button class="btn-action" data-action="view" data-index="${idx}" title="View">🔍</button>
        <button class="btn-action" data-action="edit" data-index="${idx}" title="Edit">✏️</button>
        <button class="btn-action" data-action="delete" data-index="${idx}" title="Delete">🗑️</button>
      </td>
    </tr>
  `).join('');
}

// Populate analytics
function populateAnalytics(data){
  const top = $('#top-brands');
  if(top && data.topBrands){
    top.innerHTML = data.topBrands.map((b,i)=>`<li style="display:flex;justify-content:space-between;padding:10px"><div><span style="display:inline-block;width:26px;height:26px;border-radius:50%;background:rgba(122,45,240,0.12);color:var(--accent);text-align:center;line-height:26px;margin-right:8px">${i+1}</span><strong>${b.name}</strong></div><span>₹${Number(b.revenue).toLocaleString()}</span></li>`).join('');
  }
  const status = $('#order-status');
  if(status && data.orderStatus){
    status.innerHTML = Object.entries(data.orderStatus).map(([k,v])=>`<li style="display:flex;justify-content:space-between;padding:8px 10px">${capitalize(k)} <span style="color:var(--muted)">${v}</span></li>`).join('');
  }
  const mg = $('#monthly-growth');
  if(mg) mg.innerHTML = `<div style="font-size:28px;color:var(--green);font-weight:800">+${data.monthlyGrowth}%</div><div style="color:var(--muted)">vs last month</div>`;
}

function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

/* TAB behavior — highlight active tab based on current page */
function initTabs(){
  const tabs = $$('.tab');
  tabs.forEach(t=>{
    t.addEventListener('click', ()=> {
      tabs.forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      const target = t.dataset.target;
      if(target){
        // navigate to page
        window.location.href = target;
      }
    });
  });
  // highlight by url
  const path = window.location.pathname;
  tabs.forEach(t=>{
    if(path.endsWith(t.dataset.target) || path.endsWith(t.dataset.target.replace('./',''))){
      t.classList.add('active');
    }
  });
}

/* Upload boxes: preview & simple drag/drop */
function initUploads(){
  const boxes = $$('.upload-box');
  boxes.forEach(box=>{
    const input = box.querySelector('input[type=file]');
    function handleFiles(files){
      if(!files || files.length===0) return;
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e)=>{
        box.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:140px;border-radius:6px">`;
      };
      reader.readAsDataURL(file);
    }
    box.addEventListener('click', ()=> input.click());
    input.addEventListener('change', (ev)=> handleFiles(ev.target.files));
    box.addEventListener('dragover', (ev)=>{ ev.preventDefault(); box.style.borderColor = '#cfc';});
    box.addEventListener('dragleave', ()=>{ box.style.borderColor = 'rgba(0,0,0,0.08)';});
    box.addEventListener('drop', (ev)=>{ ev.preventDefault(); box.style.borderColor='rgba(0,0,0,0.08)'; handleFiles(ev.dataTransfer.files);});
  });
}

/* Brands page actions */
function initBrandActions(){
  const table = $('#brands-table');
  if(!table) return;
  table.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('.btn-action');
    if(!btn) return;
    const action = btn.dataset.action;
    const idx = btn.dataset.index;
    if(action === 'delete'){
      if(confirm('Delete this brand?')) {
        // In real app call API; here remove row visually
        const row = btn.closest('tr');
        row.parentNode.removeChild(row);
      }
    } else if(action === 'view'){
      alert('View brand (demo): index '+idx);
    } else if(action === 'edit'){
      alert('Edit brand (demo): index '+idx);
    }
  });
}

/* Search brands */
function initBrandSearch(){
  const input = $('#brand-search');
  if(!input) return;
  input.addEventListener('input', (ev)=>{
    const q = ev.target.value.toLowerCase().trim();
    const rows = $$('#brands-table tbody tr');
    rows.forEach(r=>{
      const text = r.textContent.toLowerCase();
      r.style.display = text.includes(q) ? '' : 'none';
    });
  });
}

/* Boot */
document.addEventListener('DOMContentLoaded', ()=>{
  initTabs();
  initUploads();
  initBrandActions();
  initBrandSearch();
  loadAdminData();
});
