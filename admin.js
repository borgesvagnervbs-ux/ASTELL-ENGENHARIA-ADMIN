// ===== ASTELL HOME - PAINEL ADMINISTRATIVO =====


let sb;
try {
  const url = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '').trim();
  const key = (typeof SUPABASE_KEY !== 'undefined' ? SUPABASE_KEY : '').trim();
  if (url && key && !/COLE_AQUI/.test(url + key)) {
    sb = supabase.createClient(new URL(url).origin, key);
  } else {
    sb = null;
  }
} catch (e) {
  sb = null;
}

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const view = $('#view');

const fail = msg => {
  view.innerHTML = `<div class="card" style="margin:20px; border-color:var(--bad)">
    <b style="color:var(--bad)">Não foi possível iniciar o Painel Astell</b>
    <p class="mute">${msg}</p>
  </div>`;
};

if (!sb) {
  fail('Preencha as credenciais do Supabase no arquivo <code>config.js</code>.');
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = d => d ? new Date(d + 'T00:00').toLocaleDateString('pt-BR') : '—';
const cpfDigits = v => String(v || '').replace(/\D/g, '').slice(0, 11);
const cpfMask = v => cpfDigits(v).replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
const cpfOk = d => {
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (let t = 9; t < 11; t++) {
    let s = 0;
    for (let i = 0; i < t; i++) s += d[i] * (t + 1 - i);
    if ((s * 10) % 11 % 10 != d[t]) return false;
  }
  return true;
};

function toast(m, err) {
  const t = $('#toast');
  t.textContent = m;
  t.className = 'show' + (err ? ' err' : '');
  setTimeout(() => t.className = '', 3500);
}

const S = {
  profile: null,
  res: [],
  cur: null,
  menu: 'residences',
  rows: {},
  edit: null,
  hf: {}
};

const DOC_CATS = ['Projeto arquitetônico','Projeto estrutural','Projeto elétrico','Projeto hidráulico','Projeto sanitário','Climatização','Cobertura','Memorial descritivo','Manuais','Notas e comprovantes','Termo de entrega','Garantia','Outros'];
const REQ_CATS = ['Elétrica','Hidráulica','Cobertura','Esquadrias','Revestimentos','Pintura','Steel Frame','Equipamentos','Outros'];
const STATUS = ['Recebida','Em análise','Aguardando informações','Agendada','Em atendimento','Concluída','Encerrada'];
const QR_T = { 'Minha casa': 'casa', 'Documentos e manuais': 'documentos', 'Equipamentos': 'equipamentos', 'Manutenção': 'manutencao', 'Planta técnica': 'planta', 'Assistência técnica': 'assistencia' };
const PT_CATS = ['Elétrica','Hidráulica','Gás','Climatização','Estrutura','Paredes','Equipamentos'];

const T = {
  warranties: { label: 'Garantias', order: 'start_date', f: [['system','Sistema ou componente'],['coverage','Descrição da cobertura'],['start_date','Data inicial','date'],['months','Prazo (meses)','number'],['notes','Condições e exclusões','textarea']] },
  maintenance_tasks: { label: 'Manutenção preventiva', order: 'next_due', f: [['name','Tarefa'],['system','Sistema'],['frequency','Periodicidade'],['last_done','Última execução','date'],['next_due','Próxima data','date'],['interval_months','Repetir a cada (meses)','number'],['status','Situação',['Pendente','Em andamento','Concluída','Cancelada']],['instructions','Instruções','textarea']] },
  equipment: { label: 'Equipamentos', f: [['name','Nome'],['category','Categoria'],['maker','Fabricante'],['model','Modelo'],['serial','Nº de série'],['location','Localização']] },
  history_events: { label: 'Histórico da residência', order: 'event_date', f: [['event_date','Data','date'],['category','Categoria'],['description','Descrição','textarea']] },
  contacts: { label: 'Contatos', f: [['name','Nome / empresa'],['specialty','Especialidade'],['phone','Telefone'],['whatsapp','WhatsApp'],['email','E-mail'],['hours','Horário de atendimento'],['notes','Instruções','textarea']] },
  building_items: { label: 'Itens Construtivos (Steel Frame)', f: [['category','Categoria',['Estrutura','Sistemas','Materiais']],['title','Título'],['description','Descrição','textarea'],['highlights','Destaques (um por linha)','textarea']] }
};

const RES_F = [
  ['code', 'Código (ex.: AST-2026-002)', 'text', true],
  ['name', 'Nome da residência', 'text', true],
  ['address', 'Endereço'],
  ['area_m2', 'Área construída (m²)', 'number'],
  ['floors', 'Pavimentos', 'number'],
  ['build_system', 'Sistema construtivo'],
  ['project_no', 'Nº do projeto'],
  ['start_date', 'Início da obra', 'date'],
  ['delivery_date', 'Entrega', 'date'],
  ['tech_lead', 'Responsável técnico'],
  ['notes', 'Observações', 'textarea']
];

const MENUS = [
  { id: 'residences', label: 'Residências', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { id: 'owners', label: 'Proprietários & CPFs', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { id: 'building_items', label: 'Itens Steel Frame', icon: 'M12 2L2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5' },
  { id: 'documents', label: 'Documentos', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6' },
  { id: 'warranties', label: 'Garantias', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { id: 'maintenance_tasks', label: 'Manutenções', icon: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
  { id: 'equipment', label: 'Equipamentos', icon: 'M5 12.55a11 11 0 0 1 14.08 0|M1.42 9a16 16 0 0 1 21.16 0|M8.53 16.11a6 6 0 0 1 6.95 0|M12 20h.01' },
  { id: 'service_requests', label: 'Assistência Técnica', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9|M13.73 21a2 2 0 0 1-3.46 0' },
  { id: 'floorplans', label: 'Plantas Técnicas', icon: 'M3 3h18v18H3z|M3 9h18|M9 21V9' },
  { id: 'qr_codes', label: 'Etiquetas QR Code', icon: 'M3 3h6v6H3z|M15 3h6v6h-6z|M3 15h6v6H3z|M14 14h3v3h-3z|M18 18h3v3h-3z' },
  { id: 'contacts', label: 'Contatos Úteis', icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' },
  { id: 'history_events', label: 'Histórico & Auditoria', icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' }
];

const ico = (d, c = '') => `<svg class="ico ${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d.split('|').map(p => `<path d="${p}"/>`).join('')}</svg>`;
const sel = (name, label, opts, selectedVal = '') => `<label>${label}<select name="${name}">${opts.map(o => `<option ${o === selectedVal ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
const formOf = (id, title, inner, btn = 'Salvar') => `<details class="card"><summary>${title}</summary><form data-form="${id}">${inner}<button>${btn}</button></form></details>`;
const clean = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]));
const fld = ([k, l, t = 'text', req], v = {}) => {
  const val = v[k] ?? '', r = req ? 'required' : '';
  if (Array.isArray(t)) return sel(k, l, t, val);
  return `<label>${l}${t === 'textarea' ? `<textarea name="${k}" rows="3" ${r}>${esc(val)}</textarea>` : `<input name="${k}" type="${t}" value="${esc(val)}" ${r}>`}</label>`;
};

// Função auxiliar para upload no Cloudinary
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Erro ao enviar imagem para o Cloudinary');
  return data.secure_url;
}

function renderDrawer() {
  const drawer = $('#drawer');
  drawer.innerHTML = `
    <div class="drawer-head">
      <b>Painel Administrativo</b>
      <span class="mute">${esc(S.profile?.name || S.profile?.email)}</span>
    </div>
    <nav class="drawer-nav">
      ${MENUS.map(m => `<button class="drawer-item ${S.menu === m.id ? 'active' : ''}" data-nav="${m.id}">${ico(m.icon)} <span>${m.label}</span></button>`).join('')}
    </nav>
    <div class="drawer-foot">
      <button id="logoutBtn" class="ghost2" style="width:100%">Sair do sistema</button>
    </div>
  `;
}

function toggleDrawer(open) {
  const drawer = $('#drawer'), scrim = $('#scrim'), btn = $('#menuBtn');
  const show = open !== undefined ? open : !drawer.classList.contains('open');
  drawer.classList.toggle('open', show);
  scrim.hidden = !show;
  btn.setAttribute('aria-expanded', String(show));
}

async function renderAdmin() {
  if (!['admin', 'tech'].includes(S.profile?.role)) {
    return view.innerHTML = '<div class="card"><b class="bad">Acesso Negado</b><p>Sua conta não possui permissão de administrador.</p></div>';
  }

  renderDrawer();

  const isGlobal = ['residences', 'owners'].includes(S.menu);
  if (!isGlobal && !S.cur) {
    return view.innerHTML = `
      <div class="page-title">
        <h2>Selecione uma Residência</h2>
        <p class="mute">Você precisa selecionar uma residência no topo para gerenciar ${MENUS.find(m => m.id === S.menu)?.label.toLowerCase()}.</p>
      </div>`;
  }

  const curTitle = MENUS.find(m => m.id === S.menu)?.label || 'Painel';
  let content = `<div class="page-title"><h2>${curTitle}</h2>${S.cur ? `<span class="res-tag">${esc(S.cur.name)} (${esc(S.cur.code)})</span>` : ''}</div>`;

  switch (S.menu) {
    case 'residences': content += await viewResidences(); break;
    case 'owners': content += await viewOwners(); break;
    case 'building_items': content += await viewGenericTable('building_items'); break;
    case 'documents': content += await viewDocuments(); break;
    case 'warranties': content += await viewGenericTable('warranties'); break;
    case 'maintenance_tasks': content += await viewGenericTable('maintenance_tasks'); break;
    case 'equipment': content += await viewGenericTable('equipment'); break;
    case 'service_requests': content += await viewServiceRequests(); break;
    case 'floorplans': content += await viewFloorplans(); break;
    case 'qr_codes': content += await viewQrCodes(); break;
    case 'contacts': content += await viewGenericTable('contacts'); break;
    case 'history_events': content += await viewHistory(); break;
  }

  view.innerHTML = content;
}

async function viewResidences() {
  const list = S.res.map(r => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <b>${esc(r.name)}</b>
          <span class="mute">${esc(r.code)} · ${esc(r.address || 'Sem endereço')}</span>
        </div>
        ${S.cur?.id === r.id ? '<span class="badge ok">Selecionada</span>' : `<button class="ghost2" data-pick="${r.id}">Selecionar</button>`}
      </div>
      <p class="mute" style="margin-top:8px">Sistema: ${esc(r.build_system || 'Steel Frame')} | Entrega: ${fmt(r.delivery_date)}</p>
    </div>
  `).join('') || '<p class="empty">Nenhuma residência cadastrada.</p>';

  return formOf('newres', 'Cadastrar Nova Residência', RES_F.map(f => fld(f)).join(''), 'Criar Residência') +
    (S.cur ? formOf('editres', 'Editar Residência Selecionada (' + esc(S.cur.code) + ')', RES_F.map(f => fld(f, S.cur)).join(''), 'Salvar Alterações') : '') +
    '<h3>Residências Cadastradas</h3>' + list;
}

async function viewOwners() {
  const { data: cl } = await sb.from('client_cpfs').select('id,name,cpf_mask,claimed_by,email').order('created_at', { ascending: false });
  const { data: lk } = S.cur ? await sb.from('cpf_residences').select('cpf_id').eq('residence_id', S.cur.id) : { data: [] };
  const linked = new Set((lk || []).map(x => x.cpf_id));

  const list = (cl || []).map(c => `
    <div class="card">
      <b>${esc(c.name)}</b>
      <span class="mute">CPF: ${esc(c.cpf_mask)} ${c.email ? '· ' + esc(c.email) : ''}</span>
      <p style="margin:6px 0">${c.claimed_by ? '<span class="badge ok">Acesso Ativo</span>' : '<span class="badge">Aguardando Primeiro Acesso</span>'}</p>
      <div class="acts">
        ${linked.has(c.id) ? '<span class="badge ok">Vinculado a esta residência</span>' : S.cur ? `<button class="link" data-linkcpf="${c.id}">Vincular a esta residência</button>` : ''}
        ${c.claimed_by ? `<button class="link danger" data-rel="${c.id}">Liberar CPF / Dispositivo</button>` : ''}
      </div>
    </div>
  `).join('') || '<p class="empty">Nenhum proprietário cadastrado.</p>';

  return formOf('cpfnew', 'Cadastrar Novo Proprietário (CPF)', `
    <label>Nome Completo<input name="name" required></label>
    <label>CPF<input name="cpf" class="cpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" required></label>
    <label>E-mail do Proprietário (opcional)<input name="email" type="email"></label>
  `, 'Cadastrar Proprietário') + '<h3>Proprietários Registrados</h3>' + list;
}

async function viewGenericTable(k) {
  const c = T[k];
  const { data, error } = await sb.from(k).select('*').eq('residence_id', S.cur.id).order(c.order || 'created_at', { ascending: false });
  if (error) return '<p class="empty">Erro ao carregar dados.</p>';
  S.rows[k] = data;

  const ed = S.edit && S.edit.k === k ? data.find(r => r.id === S.edit.id) : null;
  const form = ed ? `
    <form class="card" data-form="edit:${k}" data-id="${ed.id}">
      <b>Editar ${c.label}</b>
      ${c.f.map(f => fld(f, ed)).join('')}
      <button>Salvar alterações</button>
      <button type="button" class="ghost2" data-cancel>Cancelar</button>
    </form>` : formOf(k, `Adicionar em ${c.label}`, c.f.map(f => fld(f)).join(''));

  const list = data.map(r => `
    <div class="card">
      <b>${esc(r.title || r.name || r.system || r.event_date)}</b>
      <p class="mute">${esc(r.description || r.coverage || r.instructions || r.notes || '')}</p>
      ${'visible' in r ? `<p><span class="badge ${r.visible ? 'ok' : ''}">${r.visible ? 'Visível ao cliente' : 'Oculto do cliente'}</span></p>` : ''}
      <div class="acts">
        <button class="link" data-edit="${k}:${r.id}">Editar</button>
        ${'visible' in r ? `<button class="link" data-vis="${k}:${r.id}">${r.visible ? 'Ocultar' : 'Exibir'}</button>` : ''}
        <button class="link danger" data-del="${k}:${r.id}">Excluir</button>
      </div>
    </div>
  `).join('') || '<p class="empty">Nenhum registro cadastrado nesta residência.</p>';

  return form + list;
}

async function viewDocuments() {
  const { data } = await sb.from('documents').select('*').eq('residence_id', S.cur.id).order('created_at', { ascending: false });
  S.rows.documents = data || [];

  const up = formOf('doc', 'Enviar Documento / Projeto (Cloudinary)', `
    <label>Título do Documento<input name="title" required></label>
    ${sel('category', 'Categoria', DOC_CATS)}
    <label>Versão<input name="version" placeholder="1.0"></label>
    <label>Descrição<input name="description"></label>
    <label>Arquivo (Imagem / PDF)<input name="file" type="file" required></label>
  `, 'Upload Documento');

  const list = (data || []).map(d => `
    <div class="card">
      <b>${esc(d.title)}</b>
      <span class="mute">${esc(d.category)} · v${esc(d.version || '1.0')} · ${fmt(d.created_at.slice(0, 10))}</span>
      <p>${esc(d.description || '')}</p>
      <div class="acts">
        <button class="ghost2" data-open="${esc(d.path)}">Visualizar Arquivo</button>
        <button class="link" data-vis="documents:${d.id}">${d.visible ? 'Ocultar do cliente' : 'Mostrar ao cliente'}</button>
        <button class="link danger" data-deldoc="${d.id}">Excluir</button>
      </div>
    </div>
  `).join('') || '<p class="empty">Nenhum documento cadastrado.</p>';

  return up + list;
}

async function viewServiceRequests() {
  const { data } = await sb.from('service_requests').select('*').eq('residence_id', S.cur.id).order('created_at', { ascending: false });

  const list = (data || []).map(r => `
    <div class="card">
      <div style="display:flex;justify-content:space-between">
        <b>Protocolo: ${esc(r.protocol)}</b>
        <span class="badge ${r.status === 'Concluída' ? 'ok' : 'warn'}">${esc(r.status)}</span>
      </div>
      <p><b>${esc(r.category)}</b> - ${esc(r.place)} (Urgência: ${esc(r.urgency)})</p>
      <p class="mute">${esc(r.description)}</p>
      <form data-form="upd" data-id="${r.id}" style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px">
        ${sel('status', 'Alterar Situação', STATUS, r.status)}
        <label>Observação Técnica da Astell<input name="staff_note" value="${esc(r.staff_note || '')}"></label>
        <button>Atualizar Chamado</button>
      </form>
    </div>
  `).join('') || '<p class="empty">Nenhuma solicitação de assistência registrada.</p>';

  return list;
}

async function viewFloorplans() {
  const [{ data: fp }, { data: pts }] = await Promise.all([
    sb.from('floorplans').select('*').eq('residence_id', S.cur.id).order('created_at'),
    sb.from('plan_points').select('*').eq('residence_id', S.cur.id)
  ]);

  const up = formOf('plan', 'Cadastrar Nova Planta Técnica (Cloudinary)', `
    <label>Título da Planta (ex.: Térreo, Pavimento Superior)<input name="title" required></label>
    <label>Imagem da Planta (PNG, JPG)<input name="file" type="file" accept="image/*" required></label>
  `, 'Enviar Planta');

  if (!(fp || []).length) return up + '<p class="empty">Nenhuma planta cadastrada.</p>';

  const cur = fp.find(p => p.id === S.planId) || fp[0];
  S.planId = cur.id;
  const imageUrl = cur.path; // URL direta do Cloudinary
  S.pts = (pts || []).filter(p => p.floorplan_id === cur.id);

  return up + `
    <div class="card">
      ${sel('plan_select', 'Planta Selecionada', fp.map(p => p.title), cur.title)}
      <button data-place="${cur.id}">${S.place ? 'Parar de Marcar Pontos' : 'Marcar Pontos Técnicos nesta Planta'}</button>
      ${S.place ? '<p class="notice">Clique em qualquer local na imagem abaixo para posicionar um ponto técnico (ex.: quadro elétrico, registro).</p>' : ''}
      <div class="plan ${S.place ? 'placing' : ''}" style="margin-top:12px">
        <img data-plan="1" src="${imageUrl}" alt="${esc(cur.title)}">
        ${S.pts.map(p => `<button class="pin" title="${esc(p.label)}" data-pt="${p.id}" style="left:${p.x}%;top:${p.y}%"></button>`).join('')}
      </div>
      <div id="ptbox"></div>
    </div>
  `;
}

async function viewQrCodes() {
  const { data } = await sb.from('qr_codes').select('*').eq('residence_id', S.cur.id).order('created_at');
  const base = location.href.replace('admin.html', 'index.html').split('#')[0];
  const svg = t => { const q = qrcode(0, 'M'); q.addData(base + '#qr/' + t); q.make(); return q.createSvgTag(5, 0); };

  const form = formOf('qr', 'Gerar Nova Etiqueta QR Code', `
    <label>Nome/Local da Etiqueta (ex.: Quadro Elétrico Térreo)<input name="label" required></label>
    ${sel('target', 'Ação ao Ler QR Code', Object.keys(QR_T))}
  `, 'Gerar Etiqueta');

  const list = (data || []).map(q => `
    <div class="card qr">
      ${svg(q.token)}
      <b>${esc(q.label)}</b>
      <span class="mute">Residência: ${esc(S.cur.code)}</span>
      <button class="link danger" data-del="qr_codes:${q.id}">Excluir Etiqueta</button>
    </div>
  `).join('') || '<p class="empty">Nenhum QR Code gerado.</p>';

  return form + '<button data-print style="margin-bottom:14px">Imprimir Etiquetas</button><div class="grid">' + list + '</div>';
}

async function viewHistory() {
  const rid = S.cur.id, f = S.hf || {};
  let q = sb.from('history_events').select('*').eq('residence_id', rid).order('event_date', { ascending: false }).limit(200);
  let a = sb.from('audit_log').select('*').eq('residence_id', rid).order('at', { ascending: false }).limit(100);

  if (f.cat) q = q.ilike('category', '%' + f.cat + '%');
  if (f.from) { q = q.gte('event_date', f.from); a = a.gte('at', f.from); }
  if (f.to) { q = q.lte('event_date', f.to); a = a.lte('at', f.to + 'T23:59:59'); }

  const [{ data: ev }, { data: au }, { data: pr }] = await Promise.all([q, a, sb.from('profiles').select('id,name')]);
  const who = Object.fromEntries((pr || []).map(p => [p.id, p.name]));

  const addHist = formOf('histnew', 'Adicionar Evento na Linha do Tempo', `
    <label>Data<input name="event_date" type="date" required value="${new Date().toISOString().slice(0, 10)}"></label>
    <label>Categoria<input name="category" required placeholder="Ex.: Estrutura, Pintura, Inspeção"></label>
    <label>Descrição<textarea name="description" rows="3" required></textarea></label>
  `, 'Registrar Evento');

  const evList = (ev || []).map(e => `
    <div class="card">
      <b>${fmt(e.event_date)} - ${esc(e.category)}</b>
      <p>${esc(e.description)}</p>
      <button class="link danger" data-del="history_events:${e.id}">Excluir</button>
    </div>
  `).join('') || '<p class="empty">Nenhum evento registrado.</p>';

  const auList = (au || []).map(x => `
    <div class="card">
      <b>${esc(who[x.user_id] || 'Sistema')} -> ${x.action} em ${x.table_name}</b>
      <span class="mute">${new Date(x.at).toLocaleString('pt-BR')}</span>
    </div>
  `).join('') || '<p class="empty">Sem logs de auditoria.</p>';

  return addHist + '<h3>Linha do Tempo da Obra</h3>' + evList + '<h3>Logs de Alteração (Auditoria)</h3>' + auList;
}

// Global Event Listeners
document.addEventListener('click', async e => {
  const d = e.target.dataset;

  if (e.target.id === 'menuBtn') toggleDrawer();
  if (e.target.id === 'scrim') toggleDrawer(false);
  if (d.nav) { S.menu = d.nav; S.edit = null; toggleDrawer(false); renderAdmin(); }
  if (e.target.id === 'logoutBtn') sb.auth.signOut();

  if (d.pick) {
    S.cur = S.res.find(r => r.id === d.pick);
    $('#resSel').value = d.pick;
    renderAdmin();
  }

  if (d.edit) { const [k, id] = d.edit.split(':'); S.edit = { k, id }; renderAdmin(); }
  if (d.cancel !== undefined) { S.edit = null; renderAdmin(); }
  if (d.print !== undefined) window.print();

  if (d.vis) {
    const [k, id] = d.vis.split(':');
    const r = S.rows[k].find(x => x.id === id);
    await sb.from(k).update({ visible: !r.visible }).eq('id', id);
    toast('Visibilidade alterada.');
    renderAdmin();
  }

  if (d.del && confirm('Deseja excluir este registro?')) {
    const [t, id] = d.del.split(':');
    await sb.from(t).delete().eq('id', id);
    toast('Registro excluído.');
    renderAdmin();
  }

  if (d.deldoc && confirm('Excluir este documento?')) {
    await sb.from('documents').delete().eq('id', d.deldoc);
    toast('Documento excluído.');
    renderAdmin();
  }

  if (d.linkcpf) {
    await sb.rpc('admin_link_cpf', { p_cpf: d.linkcpf, p_res: S.cur.id });
    toast('CPF vinculado à residência.');
    renderAdmin();
  }

  if (d.rel && confirm('Liberar este CPF? O acesso atual do cliente será resetado.')) {
    await sb.rpc('admin_release_cpf', { p_cpf: d.rel });
    toast('CPF liberado.');
    renderAdmin();
  }

  if (d.open) {
    window.open(d.open, '_blank');
  }

  if (d.place) {
    S.place = !S.place;
    renderAdmin();
  }

  if (d.plan && S.place) {
    const b = e.target.getBoundingClientRect();
    S.pend = {
      x: +((e.clientX - b.left) / b.width * 100).toFixed(2),
      y: +((e.clientY - b.top) / b.height * 100).toFixed(2)
    };
    $('#ptbox').innerHTML = `
      <form class="card" data-form="pt" style="margin-top:10px">
        <b>Novo Ponto na Planta</b>
        ${sel('category', 'Categoria', PT_CATS)}
        <label>Identificação / Ponto<input name="label" required placeholder="Ex.: Quadro Principal"></label>
        <label>Detalhes Técnicos<textarea name="description" rows="3"></textarea></label>
        <button>Salvar Ponto</button>
      </form>`;
  }

  if (d.pt) {
    const p = S.pts.find(x => x.id === d.pt);
    $('#ptbox').innerHTML = `
      <div class="card" style="margin-top:10px">
        <b>${esc(p.label)}</b> <span class="badge">${esc(p.category)}</span>
        <p>${esc(p.description || '')}</p>
        <button class="link danger" data-del="plan_points:${p.id}">Excluir Ponto</button>
      </div>`;
  }
});

// Forms Submit Listener
document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, id = f.dataset.form, o = clean(Object.fromEntries(new FormData(f))), rid = S.cur?.id;
  let r;

  try {
    if (id.startsWith('edit:')) {
      r = await sb.from(id.slice(5)).update(o).eq('id', f.dataset.id);
      S.edit = null;
    } else if (T[id]) {
      r = await sb.from(id).insert({ ...o, residence_id: rid });
    } else if (id === 'editres') {
      r = await sb.from('residences').update(o).eq('id', rid);
      if (!r.error) await loadRes(rid);
    } else if (id === 'newres') {
      r = await sb.from('residences').insert(o).select().single();
      if (!r.error) await loadRes(r.data.id);
    } else if (id === 'cpfnew') {
      const cpf = cpfDigits(o.cpf);
      if (!cpfOk(cpf)) return toast('CPF Inválido.', 1);
      r = await sb.rpc('admin_register_cpf', { p_name: o.name, p_cpf: cpf, p_email: o.email || null });
    } else if (id === 'doc') {
      const file = f.file.files[0];
      const imageUrl = await uploadToCloudinary(file);
      r = await sb.from('documents').insert({ residence_id: rid, title: o.title, category: o.category, version: o.version, description: o.description, path: imageUrl });
    } else if (id === 'plan') {
      const file = f.file.files[0];
      const imageUrl = await uploadToCloudinary(file);
      r = await sb.from('floorplans').insert({ residence_id: rid, title: o.title, path: imageUrl });
    } else if (id === 'pt') {
      r = await sb.from('plan_points').insert({ ...o, residence_id: rid, floorplan_id: S.planId, x: S.pend.x, y: S.pend.y });
      S.pend = null;
    } else if (id === 'qr') {
      r = await sb.from('qr_codes').insert({ residence_id: rid, label: o.label, target_hash: QR_T[o.target] });
    } else if (id === 'upd') {
      r = await sb.from('service_requests').update(o).eq('id', f.dataset.id);
    } else if (id === 'histnew') {
      r = await sb.from('history_events').insert({ ...o, residence_id: rid });
    }

    if (r?.error) return toast('Erro ao salvar: ' + r.error.message, 1);
    toast('Salvo com sucesso!');
    renderAdmin();
  } catch (err) {
    toast(err.message || 'Erro inesperado durante o upload.', 1);
  }
});

document.addEventListener('input', e => {
  if (e.target.classList?.contains('cpf')) e.target.value = cpfMask(e.target.value);
});

document.addEventListener('change', e => {
  if (e.target.name === 'plan_select') {
    const fp = S.pts || [];
    const selected = fp.find(p => p.title === e.target.value);
    if (selected) S.planId = selected.id;
    renderAdmin();
  }
});

async function loadRes(selectId) {
  const { data } = await sb.from('residences').select('*').order('created_at');
  S.res = data || [];
  const resSel = $('#resSel');
  resSel.hidden = S.res.length === 0;
  S.cur = S.res.find(r => r.id === selectId) || S.res.find(r => r.id === S.cur?.id) || S.res[0] || null;
  resSel.innerHTML = S.res.map(r => `<option value="${r.id}" ${r.id === S.cur?.id ? 'selected' : ''}>${esc(r.name)} (${esc(r.code)})</option>`).join('');
}

$('#resSel').onchange = e => {
  S.cur = S.res.find(r => r.id === e.target.value);
  renderAdmin();
};

async function initAdmin() {
  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  S.profile = profile;

  if (!['admin', 'tech'].includes(profile?.role)) {
    fail('Sua conta não possui permissão de acesso ao Painel Administrativo.');
    return;
  }

  $('#top').hidden = false;
  await loadRes();
  renderAdmin();
}

sb?.auth.onAuthStateChange((ev, session) => {
  if (ev === 'SIGNED_OUT') window.location.href = 'index.html';
});

initAdmin();