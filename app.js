const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const STORAGE = 'facility_mvp_v2_data';
const SESSION = 'facility_mvp_v2_login';

const seedData = {
  areas:[{id:'a1',name:'民企区域'},{id:'a2',name:'德意区域'},{id:'a3',name:'石岩区域'},{id:'a4',name:'坪山区域'}],
  buildings:[
    {id:'b1',areaId:'a1',name:'1栋',status:'待接入楼层',x:155,y:70,floors:[{id:'f11',name:'1F',layout:'默认布局',rooms:[{id:'r1',name:'配电室',x:8,y:12,w:26,h:26},{id:'r2',name:'空压机房',x:42,y:18,w:28,h:22}]}]},
    {id:'b5',areaId:'a1',name:'5栋',status:'已接入 1F/2F',x:380,y:35,floors:[{id:'f51',name:'1F',layout:'厂务平面图',rooms:[{id:'r3',name:'高压配电室',x:10,y:16,w:30,h:24},{id:'r4',name:'弱电间',x:54,y:18,w:20,h:18},{id:'r5',name:'消防泵房',x:25,y:58,w:36,h:22}]},{id:'f52',name:'2F',layout:'办公室平面图',rooms:[{id:'r6',name:'办公区',x:10,y:14,w:38,h:28},{id:'r7',name:'会议室',x:56,y:16,w:22,h:18}]}]},
    {id:'b6',areaId:'a1',name:'6栋',status:'待接入楼层',x:520,y:210,floors:[{id:'f61',name:'1F',layout:'默认布局',rooms:[{id:'r8',name:'配电间',x:18,y:20,w:30,h:22}]}]}
  ],
  assets:[
    {id:'e1',floorId:'f51',name:'AP-5F1-01',type:'配电箱',status:'正常',owner:'张工',x:28,y:30,desc:'5栋1F主配电箱'},
    {id:'e2',floorId:'f51',name:'CBL-5F1-A',type:'电缆',status:'待检查',owner:'李工',x:58,y:66,desc:'由总配电柜至空压机房'},
    {id:'e3',floorId:'f52',name:'UPS-5F2-01',type:'UPS',status:'正常',owner:'王工',x:42,y:38,desc:'办公区UPS'},
    {id:'e4',floorId:'f11',name:'BOX-1F-01',type:'电箱',status:'异常',owner:'赵工',x:38,y:46,desc:'温升偏高，待复测'}
  ]
};

let data = loadData();
let state = { areaId:'a1', buildingId:'b5', floorId:'f51', mode:'3d', selectedType:'area', selectedId:'a1', dragging:null };

function uid(prefix){ return prefix + Math.random().toString(36).slice(2,8); }
function loadData(){ try { return JSON.parse(localStorage.getItem(STORAGE)) || structuredClone(seedData); } catch { return structuredClone(seedData); } }
function saveData(){ localStorage.setItem(STORAGE, JSON.stringify(data)); $('#saveState').textContent='已保存 ' + new Date().toLocaleTimeString(); renderAll(); }
function login(){ if($('#loginUser').value==='admin' && $('#loginPass').value==='admin123'){ sessionStorage.setItem(SESSION,'1'); $('#loginPage').classList.add('hidden'); $('#app').classList.remove('hidden'); renderAll(); } else { $('#loginError').textContent='账号或密码错误'; } }
function logout(){ sessionStorage.removeItem(SESSION); location.reload(); }

function currentArea(){ return data.areas.find(a=>a.id===state.areaId); }
function currentBuilding(){ return data.buildings.find(b=>b.id===state.buildingId); }
function currentFloor(){ const b=currentBuilding(); return b?.floors.find(f=>f.id===state.floorId); }
function floorName(floorId){ for(const b of data.buildings){ const f=b.floors.find(x=>x.id===floorId); if(f) return `${b.name} ${f.name}`; } return '-'; }

function renderAll(){ renderAreas(); renderBuildings(); renderScene3d(); renderPlan(); renderDetail(); renderAssets(); updateHeader(); }
function updateHeader(){ const area=currentArea(), b=currentBuilding(), f=currentFloor(); $('#pageTitle').textContent = state.mode==='3d' ? `${area?.name||''}总览` : `${b?.name||''} ${f?.name||''} 楼层布局`; $('#breadcrumb').textContent = state.mode==='3d' ? `区域 / ${area?.name||''}` : `区域 / ${area?.name||''} / ${b?.name||''} / ${f?.name||''}`; }

function renderAreas(){ $('#areaList').innerHTML=data.areas.map(a=>`<div class="nav-item ${a.id===state.areaId?'active':''}" data-area="${a.id}"><span>${a.name}</span><span>›</span></div>`).join(''); $$('[data-area]').forEach(el=>el.onclick=()=>{state.areaId=el.dataset.area; const b=data.buildings.find(x=>x.areaId===state.areaId); state.buildingId=b?.id; state.floorId=b?.floors[0]?.id; state.mode='3d'; showMode(); renderAll();}); }
function renderBuildings(){ const list=data.buildings.filter(b=>b.areaId===state.areaId); $('#buildingList').innerHTML=list.map(b=>`<div class="building-item ${b.id===state.buildingId?'active':''}" data-building="${b.id}"><b>${b.name}</b><span class="muted">${b.status}</span></div>${b.floors.map(f=>`<div class="floor-item ${f.id===state.floorId?'active':''}" data-floor="${f.id}" data-building="${b.id}">${f.name}<span>二维</span></div>`).join('')}`).join(''); $$('[data-building]').forEach(el=>el.onclick=()=>{state.buildingId=el.dataset.building; state.selectedType='building'; state.selectedId=state.buildingId; state.mode='3d'; showMode(); renderAll();}); $$('[data-floor]').forEach(el=>el.onclick=()=>{state.buildingId=el.dataset.building; state.floorId=el.dataset.floor; state.selectedType='floor'; state.selectedId=state.floorId; state.mode='2d'; showMode(); renderAll();}); }

function renderScene3d(){ const scene=$('#scene3d'); const list=data.buildings.filter(b=>b.areaId===state.areaId); scene.innerHTML='<div class="road" style="left:80px;top:250px;width:560px;height:44px;transform:rotate(25deg)"></div><div class="road" style="left:300px;top:130px;width:370px;height:42px;transform:rotate(70deg)"></div>' + list.map(b=>`<div class="building3d ${b.id===state.buildingId?'active':''}" style="left:${b.x}px;top:${b.y}px" data-b3d="${b.id}"><div class="top"></div><div class="front"></div><div class="side"></div><div class="building3d-label">${b.name}<small>${b.status}</small></div></div>`).join(''); $$('[data-b3d]').forEach(el=>el.onclick=()=>{ const b=data.buildings.find(x=>x.id===el.dataset.b3d); state.buildingId=b.id; state.floorId=b.floors[0]?.id; state.selectedType='building'; state.selectedId=b.id; renderAll(); }); }

function renderPlan(){ const floor=currentFloor(); const canvas=$('#planCanvas'); $('#planTitle').textContent = floor ? `${currentBuilding().name} ${floor.name}` : '未选择楼层'; $('#planSubtitle').textContent = floor ? `布局：${floor.layout || '未命名'}，可在管理员模式编辑房间和设施点位` : '点击左侧楼层或三维楼栋进入二维图'; canvas.className='plan-canvas'; canvas.style.backgroundImage=''; if(!floor){ canvas.innerHTML=''; return; } if(floor.image){ canvas.classList.add('has-image'); canvas.style.backgroundImage=`url(${floor.image})`; canvas.innerHTML=''; } else { canvas.innerHTML='<div class="grid-bg"></div>'; }
  canvas.innerHTML += (floor.rooms||[]).map(r=>`<div class="room" data-room="${r.id}" style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%">${r.name}</div>`).join('');
  canvas.innerHTML += data.assets.filter(a=>a.floorId===floor.id).map(a=>`<div class="asset-dot ${a.status==='异常'?'fault':a.status==='待检查'?'warn':''}" data-asset="${a.id}" title="${a.name}" style="left:${a.x}%;top:${a.y}%">${a.type.slice(0,1)}</div>`).join('');
  $$('[data-asset]').forEach(el=>el.onclick=()=>{state.selectedType='asset'; state.selectedId=el.dataset.asset; renderDetail();});
  enableDrag();
}
function enableDrag(){ $$('.asset-dot,.room').forEach(el=>{ el.onmousedown=(ev)=>{ if(!sessionStorage.getItem(SESSION))return; state.dragging={el, startX:ev.clientX, startY:ev.clientY, rect:$('#planCanvas').getBoundingClientRect(), type:el.dataset.asset?'asset':'room', id:el.dataset.asset||el.dataset.room}; ev.preventDefault(); }; }); }
document.addEventListener('mousemove',ev=>{ if(!state.dragging)return; const d=state.dragging; const x=Math.max(0,Math.min(100,((ev.clientX-d.rect.left)/d.rect.width)*100)); const y=Math.max(0,Math.min(100,((ev.clientY-d.rect.top)/d.rect.height)*100)); if(d.type==='asset'){ const a=data.assets.find(x=>x.id===d.id); a.x=Math.round(x); a.y=Math.round(y); } else { const r=currentFloor().rooms.find(x=>x.id===d.id); r.x=Math.round(x); r.y=Math.round(y); } renderPlan(); });
document.addEventListener('mouseup',()=>{ if(state.dragging){ state.dragging=null; localStorage.setItem(STORAGE, JSON.stringify(data)); $('#saveState').textContent='已拖拽保存'; }});

function renderDetail(){ let html=''; if(state.selectedType==='asset'){ const a=data.assets.find(x=>x.id===state.selectedId); if(a) html=kv({名称:a.name,类型:a.type,状态:a.status,负责人:a.owner,位置:floorName(a.floorId),说明:a.desc}); }
 else if(state.selectedType==='floor'){ const f=currentFloor(); if(f) html=kv({楼栋:currentBuilding().name,楼层:f.name,布局:f.layout,房间数:(f.rooms||[]).length,设施数:data.assets.filter(a=>a.floorId===f.id).length}); }
 else if(state.selectedType==='building'){ const b=currentBuilding(); if(b) html=kv({楼栋:b.name,状态:b.status,楼层数:b.floors.length,所属区域:currentArea()?.name}); }
 else { const a=currentArea(); html=kv({区域:a?.name,楼栋数:data.buildings.filter(b=>b.areaId===a?.id).length}); }
 $('#detailBox').innerHTML=html || '<span class="muted">请选择对象</span>'; }
function kv(obj){ return Object.entries(obj).map(([k,v])=>`<div class="kv"><b>${k}</b><span>${v??'-'}</span></div>`).join(''); }
function renderAssets(){ const q=$('#searchInput').value.trim().toLowerCase(); let assets=data.assets.filter(a=>!state.floorId || a.floorId===state.floorId); if(q) assets=data.assets.filter(a=>(a.name+a.type+a.owner+floorName(a.floorId)).toLowerCase().includes(q)); $('#assetTable').innerHTML='<div class="row head"><div>名称</div><div>类型</div><div>位置</div><div>状态</div></div>' + assets.map(a=>`<div class="row" data-table-asset="${a.id}"><div><b>${a.name}</b><br><span class="muted">${a.owner||''}</span></div><div>${a.type}</div><div>${floorName(a.floorId)}</div><div><span class="badge ${a.status==='异常'?'fault':a.status==='待检查'?'warn':''}">${a.status}</span></div></div>`).join(''); $$('[data-table-asset]').forEach(el=>el.onclick=()=>{ const a=data.assets.find(x=>x.id===el.dataset.tableAsset); state.selectedType='asset'; state.selectedId=a.id; state.floorId=a.floorId; const b=data.buildings.find(x=>x.floors.some(f=>f.id===a.floorId)); state.buildingId=b.id; state.mode='2d'; showMode(); renderAll(); }); }
function showMode(){ $('#view3d').classList.toggle('hidden', state.mode!=='3d'); $('#view2d').classList.toggle('hidden', state.mode!=='2d'); $('#mode3dBtn').classList.toggle('active', state.mode==='3d'); $('#mode2dBtn').classList.toggle('active', state.mode==='2d'); updateHeader(); }

function modal(title, fields, onSave){ $('#modalTitle').textContent=title; $('#modalBody').innerHTML=`<div class="form-grid">${fields.map(f=>`<div class="field ${f.full?'full':''}"><label>${f.label}</label>${f.type==='textarea'?`<textarea id="m_${f.name}">${f.value||''}</textarea>`:f.type==='select'?`<select id="m_${f.name}">${f.options.map(o=>`<option ${o===(f.value||'')?'selected':''}>${o}</option>`).join('')}</select>`:`<input id="m_${f.name}" value="${f.value||''}" />`}</div>`).join('')}</div>`; $('#modal').classList.remove('hidden'); $('#modalOk').onclick=()=>{ const values={}; fields.forEach(f=>values[f.name]=$(`#m_${f.name}`).value); $('#modal').classList.add('hidden'); onSave(values); }; }
$('#modalClose').onclick=$('#modalCancel').onclick=()=>$('#modal').classList.add('hidden');

$('#loginBtn').onclick=login; $('#logoutBtn').onclick=logout; $('#mode3dBtn').onclick=()=>{state.mode='3d';showMode();renderAll();}; $('#mode2dBtn').onclick=()=>{state.mode='2d';state.selectedType='floor';state.selectedId=state.floorId;showMode();renderAll();}; $('#searchInput').oninput=renderAssets;
$('#addAreaBtn').onclick=()=>modal('新增区域',[{name:'name',label:'区域名称'}],v=>{data.areas.push({id:uid('a'),name:v.name||'新区域'});state.areaId=data.areas.at(-1).id;saveData();});
$('#addBuildingBtn').onclick=()=>modal('新增楼栋',[{name:'name',label:'楼栋名称'},{name:'status',label:'状态',value:'待接入楼层'},{name:'x',label:'三维X坐标',value:'200'},{name:'y',label:'三维Y坐标',value:'120'}],v=>{const b={id:uid('b'),areaId:state.areaId,name:v.name||'新楼栋',status:v.status||'待接入楼层',x:+v.x||200,y:+v.y||120,floors:[]};data.buildings.push(b);state.buildingId=b.id;saveData();});
$('#addFloorBtn').onclick=()=>{ const b=currentBuilding(); if(!b)return; modal('新增楼层',[{name:'name',label:'楼层名称',value:'1F'},{name:'layout',label:'布局名称',value:'默认布局'}],v=>{const f={id:uid('f'),name:v.name||'新楼层',layout:v.layout||'',rooms:[]};b.floors.push(f);b.status='已接入 '+b.floors.map(x=>x.name).join('/');state.floorId=f.id;state.mode='2d';showMode();saveData();}); };
$('#editCurrentBtn').onclick=()=>{ const f=currentFloor(); if(!f)return; modal('编辑当前楼层布局',[{name:'floor',label:'楼层名称',value:f.name},{name:'layout',label:'布局名称',value:f.layout},{name:'room',label:'新增房间名称',value:'配电室'}],v=>{f.name=v.floor;f.layout=v.layout;if(v.room)f.rooms.push({id:uid('r'),name:v.room,x:12,y:12,w:28,h:20});saveData();}); };
function addAsset(){ const f=currentFloor(); if(!f){alert('请先选择楼层');return;} modal('新增设施点位',[{name:'name',label:'设施名称',value:'AP-NEW-01'},{name:'type',label:'类型',type:'select',options:['配电箱','电箱','电缆','空压机','冷水机','UPS','消防设施'],value:'配电箱'},{name:'status',label:'状态',type:'select',options:['正常','待检查','异常'],value:'正常'},{name:'owner',label:'负责人',value:'厂务'},{name:'desc',label:'说明',type:'textarea',full:true}],v=>{data.assets.push({id:uid('e'),floorId:f.id,name:v.name,type:v.type,status:v.status,owner:v.owner,x:50,y:50,desc:v.desc});saveData();});}
$('#addAssetBtn').onclick=addAsset; $('#quickAssetBtn').onclick=addAsset;
$('#editSelectedBtn').onclick=()=>{ if(state.selectedType==='asset'){ const a=data.assets.find(x=>x.id===state.selectedId); if(!a)return; modal('编辑设施',[{name:'name',label:'设施名称',value:a.name},{name:'type',label:'类型',value:a.type},{name:'status',label:'状态',type:'select',options:['正常','待检查','异常'],value:a.status},{name:'owner',label:'负责人',value:a.owner},{name:'desc',label:'说明',type:'textarea',full:true,value:a.desc}],v=>{Object.assign(a,v);saveData();}); } else if(state.selectedType==='building'){ const b=currentBuilding(); modal('编辑楼栋',[{name:'name',label:'楼栋名称',value:b.name},{name:'status',label:'状态',value:b.status},{name:'x',label:'三维X坐标',value:b.x},{name:'y',label:'三维Y坐标',value:b.y}],v=>{b.name=v.name;b.status=v.status;b.x=+v.x;b.y=+v.y;saveData();}); } else { $('#editCurrentBtn').click(); } };
$('#uploadPlanBtn').onclick=()=>$('#planFile').click(); $('#planFile').onchange=(e)=>{ const file=e.target.files[0]; const f=currentFloor(); if(!file||!f)return; const reader=new FileReader(); reader.onload=()=>{f.image=reader.result;saveData();}; reader.readAsDataURL(file); };
$('#exportBtn').onclick=()=>{ const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='facility-data.json'; a.click(); };
$('#importBtn').onclick=()=>$('#importFile').click(); $('#importFile').onchange=(e)=>{ const file=e.target.files[0]; if(!file)return; const r=new FileReader(); r.onload=()=>{ try{data=JSON.parse(r.result);saveData();}catch{alert('JSON格式不正确');} }; r.readAsText(file); };
$('#resetBtn').onclick=()=>{ if(confirm('确认恢复示例数据？当前本地数据会被覆盖。')){ data=structuredClone(seedData); saveData(); } };

if(sessionStorage.getItem(SESSION)){ $('#loginPage').classList.add('hidden'); $('#app').classList.remove('hidden'); }
showMode(); renderAll();
