// ASTELL HOME — Painel administrativo (página separada: admin.html).
// Usa o mesmo banco Supabase do app do cliente: o que é cadastrado aqui aparece lá, conforme o CPF vinculado.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => d ? new Date(String(d).slice(0, 10) + 'T00:00').toLocaleDateString('pt-BR') : '—';
const clean = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]));
function toast(m, err) { const t = $('#toast'); t.textContent = m; t.className = 'show' + (err ? ' err' : ''); setTimeout(() => t.className = '', 3500); }

let sb; try { sb = supabase.createClient(new URL(SUPABASE_URL.trim()).origin, SUPABASE_KEY.trim()); } catch (e) { sb = null; }
const view = $('#view');
const fail = m => { view.innerHTML = '<div class="card" style="margin:16px"><b>Não foi possível iniciar o painel</b><p class="mute">' + m + '</p></div>'; };
if (!sb || /COLE_AQUI/.test(SUPABASE_URL + SUPABASE_KEY)) { fail('Abra o arquivo config.js e preencha SUPABASE_URL e SUPABASE_KEY.'); throw new Error('Supabase não configurado'); }
addEventListener('error', e => { if (!view.innerHTML.trim()) fail('Erro: ' + e.message); });

const S = { stf: new Set(), urf: new Set(), logo: null, rep: null, repf: null, profile: null, res: [], cur: null, rows: {}, hf: {}, place: false, mTab: 'all', sel: { on: false, ids: new Set() }, q: '', arg: null, ownersByRes: {}, pp: 10, pages: {}, noun: null, stack: [], items: null, empties: {}, lastMenu: null, owners: [], links: [], curPlan: null };
// Aceita CLOUDINARY_UPLOAD_PRESET ou CLOUDINARY_PRESET no config.js
const CLD_NAME = typeof CLOUDINARY_CLOUD_NAME !== 'undefined' ? String(CLOUDINARY_CLOUD_NAME).trim() : '';
const CLD_PRESET = typeof CLOUDINARY_UPLOAD_PRESET !== 'undefined' ? String(CLOUDINARY_UPLOAD_PRESET).trim() : (typeof CLOUDINARY_PRESET !== 'undefined' ? String(CLOUDINARY_PRESET).trim() : '');
const CLOUD_OK = !!(CLD_NAME && CLD_PRESET) && !/COLE_AQUI/.test(CLD_NAME + CLD_PRESET);
const isVid = x => x.media_type === 'video';
const vsrc = u => String(u).replace('/upload/', '/upload/f_mp4,vc_h264,q_auto/').replace(/\.\w+$/, '.mp4');
const vposter = u => String(u).replace('/upload/', '/upload/w_480,c_limit,so_0/').replace(/\.\w+$/, '.jpg');
const vposterBig = u => String(u).replace('/upload/', '/upload/w_1600,c_limit,so_0/').replace(/\.\w+$/, '.jpg');   // capa grande para o visualizador
const cld = (u, w) => String(u).replace('/upload/', `/upload/w_${w},c_limit,q_auto,f_auto/`);
const thumbsOf = a => a && a.length ? `<div class="thumbs">${a.slice(0, 6).map(x => `<img src="${esc(cld(x.url, 240))}" alt="" loading="lazy">`).join('')}</div>` : '';

// ---------- ícones
const ico = d => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d.split('|').map(p => `<path d="${p}"/>`).join('')}</svg>`;
const IC = { drop: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z', image: 'M3 3h18v18H3z|M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z|M21 15l-5-5L5 21', casa: 'M4 21V8l8-5 8 5v13|M9 21v-6h6v6', user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M8 13h8|M8 17h8', layers: 'M12 2L2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5', shield: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z|M9 12l2 2 4-4', wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z', phones: 'M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3', clock: 'M12 6v6l4 2|M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22V12h6v10', book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20|M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z', grid: 'M3 3h7v7H3z|M14 3h7v7h-7z|M14 14h7v7h-7z|M3 14h7v7H3z', map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z|M9 3v15|M15 6v15', prefeitura: 'M3 21h18|M5 10v11|M9 10v11|M15 10v11|M19 10v11|M2 10l10-7 10 7z', banco: 'M2 6h20v12H2z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M6 12h.01|M18 12h.01', capacete: 'M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5|M14 6a6 6 0 0 1 6 6v3|M4 15v-3a6 6 0 0 1 6-6|M3 15h18v4H3z', regua: 'M3 17L17 3l4 4L7 21z|M14 6l2 2|M11 9l2 2|M8 12l2 2|M5 15l2 2', estrada: 'M4 21L8 3|M20 21L16 3|M12 4v3|M12 11v3|M12 18v3', compasso: 'M12 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z|M11 5.5L5 21|M13 5.5L19 21|M8 15h8', chart: 'M3 3v18h18|M8 17v-6|M13 17V7|M18 17v-4', star: 'M12 2l3 7 7 .6-5.3 4.6 1.7 7.3L12 17.8 5.6 21.5l1.7-7.3L2 9.6 9 9z', dbase: 'M12 8c4.4 0 8-1.1 8-2.5S16.4 3 12 3 4 4.1 4 5.5 7.6 8 12 8z|M4 5.5v6C4 12.9 7.6 14 12 14s8-1.1 8-2.5v-6|M4 11.5v6C4 18.9 7.6 20 12 20s8-1.1 8-2.5v-6' };
const GOOGLE_SVG = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

// ---------- menus (o primeiro é a tela inicial)
const MENU = [['res', 'Residências', 'casa'], ['own', 'Proprietários', 'user'], ['docs', 'Documentos', 'doc'], ['eq', 'Equipamentos', 'layers'], ['gar', 'Garantias', 'shield'], ['man', 'Inspeções Preventivas', 'wrench'], ['ast', 'Assistência', 'phones'], ['bld', 'Construção', 'home'], ['pl', 'Planta técnica', 'map'], ['rep', 'Relatórios', 'chart'], ['logo', 'Logo', 'star'], ['bk', 'Backup', 'dbase']];

// ---------- dados e campos
const addMonths = (d, m) => { const x = new Date(d + 'T00:00'); x.setMonth(x.getMonth() + m); return x; };
function wState(w) { const end = addMonths(w.start_date, w.months), days = (end - new Date()) / 864e5; return days < 0 ? ['Expirada', 'bad', end] : days < 90 ? ['Próxima do vencimento', 'warn', end] : ['Vigente', 'ok', end]; }
const DOC_CATS = ['Projeto arquitetônico', 'Projeto estrutural', 'Projeto elétrico', 'Projeto hidráulico', 'Projeto sanitário', 'Climatização', 'Cobertura', 'Memorial descritivo', 'Manuais', 'Notas e comprovantes', 'Termo de entrega', 'Garantia', 'Outros'];
const STATUS = ['Recebida', 'Em análise', 'Aguardando informações', 'Agendada', 'Em atendimento', 'Concluída', 'Encerrada'];
// situações das inspeções preventivas: valor gravado no banco → [classe de cor, rótulo do botão de filtro]
const ST = { 'Pendente': ['pend', 'Pendentes'], 'Em andamento': ['and', 'Em Andamento'], 'Concluída': ['conc', 'Concluídas'], 'Cancelada': ['canc', 'Canceladas'] };
const pickOf = (tbl, col, id, cur, map, cls, rot) => `<span class="stpick" data-stwrap><span class="badge st ${cls(cur)}">${esc(cur)}</span><button type="button" class="stbtn" data-stopen aria-label="Alterar ${rot}" aria-haspopup="true" aria-expanded="false">▾</button><ul class="stmenu" hidden>${Object.keys(map).filter(x => x !== cur).map(x => `<li><button type="button" class="stopt ${cls(x)}" data-stset="${tbl}|${col}|${id}|${x}">${x}</button></li>`).join('')}</ul></span>`;   // selo colorido + setinha que abre as outras opções
const stPick = r => { const st = ST[r.status] ? r.status : 'Pendente'; return pickOf('maintenance_tasks', 'status', r.id, st, ST, x => 'st-' + ST[x][0], 'a situação'); };
const ST_A = { 'Recebida': ['pend', 'Recebidas'], 'Em análise': ['ana', 'Em análise'], 'Agendada': ['agd', 'Agendadas'], 'Em atendimento': ['and', 'Em atendimento'], 'Concluída': ['conc', 'Concluídas'] };   // assistência técnica
const UR = { 'Crítica': 'crit', 'Alta': 'alta', 'Média': 'med', 'Baixa': 'baixa' };
const astStPick = r => pickOf('service_requests', 'status', r.id, r.status, ST_A, x => 'st-' + (ST_A[x] ? ST_A[x][0] : 'pend'), 'a situação');
const astUrPick = r => pickOf('service_requests', 'urgency', r.id, UR[r.urgency] ? r.urgency : 'Média', UR, x => 'ur-' + UR[x], 'o grau de urgência');
const urBarInner = () => Object.entries(UR).map(([k, c]) => `<button type="button" class="stf uf uf-${c}" data-urf="${k}" aria-pressed="${S.urf.has(k)}">${k}</button>`).join('');
const WST = { 'Vigente': ['conc', 'Vigentes'], 'Expirada': ['canc', 'Expiradas'] };   // garantias: situação vem do prazo; só uma por vez
const stMap = () => S.stMode || ST;
const stBarInner = () => `<button type="button" class="stf stf-all" data-stf="all" aria-pressed="${!S.stf.size}">Todas</button>` + Object.entries(stMap()).map(([k, [c, l]]) => `<button type="button" class="stf stf-${c}" data-stf="${k}" aria-pressed="${S.stf.has(k)}">${l}</button>`).join('');
const PT_CATS = ['Elétrica', 'Hidráulica', 'Gás', 'Climatização', 'Estrutura', 'Paredes', 'Equipamentos'];

const DEFREQ = ['system', 'name', 'description', 'months', 'start_date', 'event_date', 'title'];
const fld = ([k, l, t = 'text', req], v = {}) => {
  const val = v[k] ?? '', r = (req ?? DEFREQ.includes(k)) ? 'required' : '';
  if (t === 'date') return dateField(k, l, val, r === 'required');
  if (Array.isArray(t)) return `<label>${l}<select name="${k}">${t.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
  return `<label>${l}${t === 'textarea' ? `<textarea name="${k}" rows="3" ${r}>${esc(val)}</textarea>` : `<input name="${k}" type="${t}" value="${esc(val)}" ${r}${t === 'number' && /months/.test(k) ? ' min="0" step="1" inputmode="numeric" data-nonneg' : ''}>`}</label>`;
};
const RES_F = [['code', 'Código (ex.: AST-2026-002)', 'text', true], ['name', 'Nome da residência', 'text', true], ['address', 'Endereço'], ['area_m2', 'Área construída (m²)', 'number'], ['floors', 'Pavimentos', 'number'], ['build_system', 'Sistema construtivo'], ['project_no', 'Nº do projeto'], ['start_date', 'Início da obra', 'date', false], ['delivery_date', 'Entrega', 'date', false], ['tech_lead', 'Responsável técnico'], ['notes', 'Observações', 'textarea']];
const DOC_F = [['title', 'Título'], ['category', 'Categoria', DOC_CATS], ['version', 'Versão'], ['description', 'Descrição', 'text', false]];
const T = {
  warranties: { label: 'Garantias', order: 'start_date', f: [['system', 'Sistema ou componente'], ['coverage', 'Descrição da cobertura'], ['start_date', 'Data inicial', 'date'], ['months', 'Prazo (meses)', 'number'], ['notes', 'Condições e exclusões', 'textarea']],
    row: r => { const [s, c, end] = wState(r); return `<b>${esc(r.system)}</b> <span class="badge ${c}">${s}</span><p>${esc(r.coverage)}</p><span class="mute">${fmt(r.start_date)} até ${end.toLocaleDateString('pt-BR')}</span><p class="mute">${esc(r.notes)}</p>`; },
    note: 'Os prazos valem conforme contrato, fabricante e lei. As condições contratuais e legais prevalecem sobre os indicadores do aplicativo.' },
  maintenance_tasks: { label: 'Inspeções Preventivas', order: 'next_due', f: [['name', 'Tarefa'], ['system', 'Sistema'], ['frequency', 'Periodicidade (texto)'], ['last_done', 'Última execução', 'date'], ['next_due', 'Próxima data', 'date'], ['interval_months', 'Repetir a cada (meses)', 'number'], ['status', 'Situação', ['Pendente', 'Em andamento', 'Concluída', 'Cancelada']], ['instructions', 'Instruções', 'textarea']],
    row: r => { const st = r.status || 'Pendente', late = r.next_due && new Date(r.next_due + 'T00:00') < new Date() && !['Concluída', 'Cancelada'].includes(st); return `<b>${esc(r.name)}</b> ${stPick(r)}${late ? ' <span class="badge bad">Atrasada</span>' : ''}<p class="mute">${esc(r.system)} · ${esc(r.frequency)}</p>Última: ${fmt(r.last_done)} · Próxima: ${fmt(r.next_due)}<p class="mute">${esc(r.instructions)}</p>`; } },
  equipment: { label: 'Equipamentos', f: [['name', 'Nome'], ['category', 'Categoria'], ['maker', 'Fabricante'], ['model', 'Modelo'], ['serial', 'Nº de série'], ['location', 'Localização'], ['description', 'Descrição do equipamento', 'textarea', false], ['warranty_months', 'Tempo de garantia (meses)', 'number', false], ['supplier', 'Fornecedor ou loja de compra', 'text', false]],
    row: r => `<b>${esc(r.name)}</b><span class="mute">${esc(r.category)} · ${esc(r.location)}</span><p>${esc(r.maker)} ${esc(r.model)} ${r.serial ? '· Série ' + esc(r.serial) : ''}</p>${r.description ? `<p class="mute">${esc(r.description)}</p>` : ''}${r.warranty_months ? `<span class="mute meta">Garantia: ${esc(r.warranty_months)} ${+r.warranty_months === 1 ? 'mês' : 'meses'}</span>` : ''}${r.supplier ? `<span class="mute meta">Fornecedor / loja: ${esc(r.supplier)}</span>` : ''}` },
  building_items: { label: 'Construção', f: [['category', 'Seção do app', ['Estrutura', 'Sistemas', 'Materiais', 'Infraestrutura']], ['title', 'Título'], ['description', 'Descrição', 'textarea', false], ['highlights', 'Destaques (um por linha)', 'textarea']],
    row: r => `<b>${esc(r.title)}</b> <span class="badge">${esc(r.category)}</span><p class="mute">${esc(r.description)}</p><p>${esc((r.highlights || '').split('\n').filter(Boolean).join(' · '))}</p>` },
};
const fieldsFor = k => k === 'res' ? RES_F : k === 'documents' ? DOC_F : T[k].f;

// CPF
function cpfDigits(v) { return String(v || '').replace(/\D/g, '').slice(0, 11); }
function cpfMask(v) { return cpfDigits(v).replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2'); }
function cpfOk(d) { if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false; for (let t = 9; t < 11; t++) { let s = 0; for (let i = 0; i < t; i++) s += d[i] * (t + 1 - i); if ((s * 10) % 11 % 10 != d[t]) return false; } return true; }

// telefone (celular/WhatsApp): máscara (00) 00000-0000
function telDigits(v) { return String(v || '').replace(/\D/g, '').slice(0, 11); }
function telMask(v) { const d = telDigits(v); if (!d) return ''; if (d.length <= 2) return '(' + d; if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`; if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; }
const PP = [10, 25, 50];
try { const v = +localStorage.getItem('astell_pp'); if (PP.includes(v)) S.pp = v; } catch (e) { /* sem armazenamento: usa 10 */ }
const telOk = v => !v || [10, 11].includes(telDigits(v).length);


// ---------- janela de formulário (com pilha: o botão "Cadastrar" abre outra janela por cima e, ao terminar, volta ao formulário de origem com tudo preenchido)
function modal(title, body, attrs, btn = 'Salvar') {
  $('#modal').innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheethead"><b>${esc(title)}</b><button type="button" class="x" data-close aria-label="Fechar">×</button></div><form ${attrs}>${body}<button>${btn}</button><button type="button" class="ghost2" data-close>Cancelar</button></form></div>`;
  $('#modal').hidden = false; document.querySelectorAll('#modal .ownpick').forEach(refreshOwnPick); document.querySelectorAll('#modal .resmulti').forEach(refreshResMulti); initCombos();
}
const hardClose = () => { S.stack = []; $('#modal').hidden = true; $('#modal').innerHTML = ''; };
function pushModal(after) { const sheet = $('#modal').firstElementChild; if (sheet) $('#modal').removeChild(sheet); S.stack.push({ sheet, after }); }
function popModal(result) { const f = S.stack.pop(); $('#modal').innerHTML = ''; if (f && f.sheet) $('#modal').appendChild(f.sheet); $('#modal').hidden = false; if (f && f.after && result) f.after(result); }
const closeModal = () => S.stack.length ? popModal(null) : hardClose();

// escolha obrigatória de residência (com botão Cadastrar ao lado)
const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR');
const presetRes = rid => { const r = S.res.find(x => x.id === rid) || {}; return `<div class="field"><span class="lbl">Residência</span><div class="presetres"><b>${esc(r.name || '—')}</b> <span class="mute">${esc(r.code || '')}</span></div><input type="hidden" name="residence_id" value="${esc(rid)}"></div>`; };
const resField = () => S.scope ? presetRes(S.scope) : resSelect();
const resSelect = () => `<div class="field combo" data-combo="res"><span class="lbl">Residência *</span><div class="selrow"><div class="comboin"><input class="comboq" type="search" placeholder="Pesquisar residência por nome ou código…" autocomplete="off" required role="combobox" aria-expanded="false" aria-label="Pesquisar residência"><input type="hidden" name="residence_id"><ul class="combolist" role="listbox" hidden></ul></div><button type="button" data-newres>Cadastrar</button></div><p class="mute combohint">Digite parte do nome e escolha a residência na lista.</p>${S.res.length ? '' : '<p class="mute">Nenhuma residência cadastrada ainda. Use “Cadastrar” para criar a primeira.</p>'}</div>`;
const ownPickHtml = ids => `<div class="ownpick field combo" data-combo="own"><span class="lbl">Proprietários vinculados (opcional)</span><div class="selrow"><div class="comboin"><input class="comboq" type="search" placeholder="Pesquisar proprietário pelo nome…" autocomplete="off" role="combobox" aria-expanded="false" aria-label="Pesquisar proprietário"><ul class="combolist" role="listbox" hidden></ul></div><button type="button" data-newown>Cadastrar</button></div><div class="reslinked" data-ownlist></div><input type="hidden" name="owner_ids" value="${ids.join(',')}"></div>`;
function refreshOwnPick(box) {   // lista numerada dos proprietários escolhidos (a gravação acontece ao salvar a residência)
  const ids = box.querySelector('[name=owner_ids]').value.split(',').filter(Boolean), os = ids.map(id => S.owners.find(x => x.id === id)).filter(Boolean);
  box.querySelector('[data-ownlist]').innerHTML = os.length ? `<h4 class="reshead">Proprietários vinculados (${os.length})</h4><ol class="reslist">${os.map(o => `<li><div class="rname"><b>${esc(o.name)}</b><span class="mute">${esc(o.cpf_mask)}</span></div>${acts(`<button type="button" class="link" data-ownedit="${o.id}">Editar</button>`, `<button type="button" class="link danger" data-ownunlink="${o.id}">Desvincular</button>`)}</li>`).join('')}</ol>` : '<p class="mute reshead">Nenhum proprietário vinculado.</p>';
}
// lista de resultados da pesquisa: só o NOME da residência (ou do proprietário) é considerado
function comboList(box) {
  const type = box.dataset.combo, inp = box.querySelector('.comboq'), ul = box.querySelector('.combolist'); let q = norm(inp.value).trim(), items;
  if (!q) return comboClose(box);   // sem caracteres digitados: nenhuma sugestão
  if (type === 'res') {
    const cur = S.res.find(r => r.id === box.querySelector('[name=residence_id]').value); if (cur && cur.name === inp.value) return comboClose(box);   // já escolhida: nada a sugerir
    items = S.res.filter(r => !q || hit(norm(r.name + ' ' + r.code), q)).sort(byName).map(r => ({ id: r.id, label: r.name, sub: r.code }));
  } else if (type === 'resmulti') {   // residências do proprietário: não repete as que já estão na lista
    const ids = box.querySelector('[name=res_ids]').value.split(',').filter(Boolean);
    items = S.res.filter(r => !ids.includes(r.id) && (!q || hit(norm(r.name + ' ' + r.code), q))).sort(byName).map(r => ({ id: r.id, label: r.name, sub: r.code }));
  } else {
    const ids = box.querySelector('[name=owner_ids]').value.split(',').filter(Boolean);
    items = S.owners.filter(o => !ids.includes(o.id) && (!q || norm(o.name).includes(q))).sort(byName).map(o => ({ id: o.id, label: o.name, sub: o.cpf_mask }));
  }
  if (!items.length) return comboClose(box);   // nenhuma opção contém o que foi digitado: a caixa não aparece
  ul.innerHTML = items.map((it, i) => `<li role="option" data-opt="${it.id}" class="${i ? '' : 'on'}">${type === 'resmulti' || type === 'own' ? `<span class="lname"><b>${esc(it.label)}</b><span class="mute">${esc(it.sub)}</span></span><button type="button" data-addopt="${it.id}">Adicionar</button>` : `<b>${esc(it.label)}</b><span class="mute">${esc(it.sub)}</span>`}</li>`).join('');
  ul.hidden = false; inp.setAttribute('aria-expanded', 'true');
}
function comboClose(box) { const ul = box.querySelector('.combolist'); ul.hidden = true; ul.innerHTML = ''; box.querySelector('.comboq').setAttribute('aria-expanded', 'false'); }
function comboPick(box, id) {
  const inp = box.querySelector('.comboq');
  if (box.dataset.combo === 'resmulti') { const h = box.querySelector('[name=res_ids]'); h.value = [...h.value.split(',').filter(Boolean), id].join(','); inp.value = ''; refreshResMulti(box); comboClose(box); return; }
  if (box.dataset.combo === 'res') { const r = S.res.find(x => x.id === id); if (!r) return; box.querySelector('[name=residence_id]').value = id; inp.value = r.name; inp.setCustomValidity(''); }
  else { const h = box.querySelector('[name=owner_ids]'); h.value = [...h.value.split(',').filter(Boolean), id].join(','); inp.value = ''; refreshOwnPick(box); }
  comboClose(box);
}
// lista numerada das residências vinculadas ao proprietário (a gravação acontece ao clicar em Salvar)
const resMultiHtml = ids => `<div class="resmulti field combo" data-combo="resmulti"><span class="lbl">Residências vinculadas (opcional)</span><div class="selrow"><div class="comboin"><input class="comboq" type="search" placeholder="Pesquisar residência por nome ou código…" autocomplete="off" role="combobox" aria-expanded="false" aria-label="Pesquisar residência"><ul class="combolist" role="listbox" hidden></ul></div><button type="button" data-newres>Cadastrar</button></div><input type="hidden" name="res_ids" value="${ids.join(',')}"><div class="reslinked" data-reslist></div></div>`;
function refreshResMulti(box) {
  const ids = box.querySelector('[name=res_ids]').value.split(',').filter(Boolean), rs = ids.map(id => S.res.find(r => r.id === id)).filter(Boolean);
  box.querySelector('[data-reslist]').innerHTML = rs.length ? `<h4 class="reshead">Residências vinculadas (${rs.length})</h4><ol class="reslist">${rs.map(r => `<li><div class="rname"><b>${esc(r.name)}</b><span class="mute">${esc(r.code)}${r.address ? ' · ' + esc(r.address) : ''}</span></div>${acts(`<button type="button" class="link" data-reedit="${r.id}">Editar</button>`, `<button type="button" class="link danger" data-reunlink="${r.id}">Desvincular</button>`)}</li>`).join('')}</ol>` : '<p class="mute reshead">Nenhuma residência vinculada.</p>';
}
const initCombos = () => document.querySelectorAll('#modal .combo[data-combo=res] .comboq').forEach(q => q.setCustomValidity('Escolha uma residência da lista.'));

// calendário amarelo (o do navegador não aceita cor): digitar dd/mm/aaaa ou abrir o calendário
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const isoOf = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const brOf = iso => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';
function parseBr(t) { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t || ''); if (!m) return null; const d = new Date(+m[3], +m[2] - 1, +m[1]); return d.getFullYear() === +m[3] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[1] ? `${m[3]}-${m[2]}-${m[1]}` : null; }
const CAL_SVG = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
const dateField = (name, label, iso = '', req = false) => `<div class="field"><span class="lbl">${label}${req ? ' *' : ''}</span><div class="dateinp" data-date><input class="datetxt" type="text" inputmode="numeric" placeholder="dd/mm/aaaa" maxlength="10" autocomplete="off" value="${esc(brOf(iso))}" aria-label="${esc(label)}" ${req ? 'required' : ''}><button type="button" class="calbtn" data-cal aria-label="Abrir calendário — ${esc(label)}">${CAL_SVG}</button><input type="hidden" name="${name}" value="${esc(iso || '')}"><div class="calpop" hidden></div></div></div>`;
function calSet(box, iso) { box.querySelector('[type=hidden]').value = iso || ''; const t = box.querySelector('.datetxt'); t.value = brOf(iso); t.setCustomValidity(''); }
function calRender(box, y, m) {
  const pop = box.querySelector('.calpop'), sel = box.querySelector('[type=hidden]').value, n = new Date(), hoje = isoOf(n.getFullYear(), n.getMonth(), n.getDate());
  const ini = new Date(y, m, 1).getDay(), dias = new Date(y, m + 1, 0).getDate(); let cells = '<span></span>'.repeat(ini);
  for (let d = 1; d <= dias; d++) { const iso = isoOf(y, m, d); cells += `<button type="button" class="day${iso === sel ? ' sel' : ''}${iso === hoje ? ' today' : ''}" data-day="${iso}" aria-label="${d} de ${MESES[m]} de ${y}">${d}</button>`; }
  pop.dataset.y = y; pop.dataset.m = m;
  pop.innerHTML = `<div class="calhead"><button type="button" data-calnav="-12" aria-label="Ano anterior">«</button><button type="button" data-calnav="-1" aria-label="Mês anterior">‹</button><b>${MESES[m]} ${y}</b><button type="button" data-calnav="1" aria-label="Próximo mês">›</button><button type="button" data-calnav="12" aria-label="Próximo ano">»</button></div><div class="calgrid">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(x => `<i>${x}</i>`).join('')}${cells}</div><div class="calfoot"><button type="button" data-caltoday>Hoje</button><button type="button" data-calclear>Limpar</button></div>`;
}
function calOpen(box) { closeFloating(box); const v = box.querySelector('[type=hidden]').value, d = v ? new Date(v + 'T00:00') : new Date(); calRender(box, d.getFullYear(), d.getMonth()); box.querySelector('.calpop').hidden = false; }
// fecha calendários e listas de pesquisa abertos (menos o que contém `except`); devolve se fechou algo
function closeFloating(except) {
  let any = false;
  document.querySelectorAll('.calpop:not([hidden])').forEach(p => { if (!except || !p.closest('[data-date]').contains(except)) { p.hidden = true; any = true; } });
  document.querySelectorAll('.combolist:not([hidden])').forEach(u => { const b = u.closest('.combo'); if (!except || !b.contains(except)) { comboClose(b); any = true; } });
  document.querySelectorAll('.stmenu:not([hidden])').forEach(m => { if (!except || !m.closest('[data-stwrap]').contains(except)) { m.hidden = true; const b = m.parentElement.querySelector('[data-stopen]'); if (b) b.setAttribute('aria-expanded', 'false'); any = true; } });
  return any;
}
const resFormBody = (row = {}, ownerIds = [], noOwners = false) => RES_F.map(f => fld(f, row)).join('') + (noOwners ? '' : ownPickHtml(ownerIds));

const ADD = {
  res: noOwners => modal('Nova residência', resFormBody({}, [], noOwners) + (noOwners ? '<p class="mute">Ao salvar o proprietário, ele será vinculado a esta residência.</p>' : ''), 'data-form="add:res"', 'Criar residência'),
  own: () => openOwnerAdd(false),
  docs: () => modal('Enviar documento', resField() + '<label>Arquivo<input name="file" type="file" required></label>' + DOC_F.map(f => fld(f)).join(''), 'data-form="add:docs"', 'Enviar'),
  pl: () => modal('Cadastrar planta técnica', resField() + plFormBody(), 'data-form="add:pl"', 'Salvar'),
};
const telField = (name, label, v = '') => `<label>${label}<input name="${name}" class="tel" type="tel" inputmode="tel" placeholder="(00) 00000-0000" maxlength="15" value="${esc(v)}"></label>`;
function openOwnerAdd(nested) {   // nested = aberto de dentro do cadastro de residência (o vínculo é feito quando a residência for salva)
  modal('Novo proprietário', `<label>Nome<input name="name" required></label><label>CPF<input name="cpf" class="cpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" required></label><label>E-mail do proprietário (opcional, recomendado)<input name="email" type="email"></label>${telField('phone', 'Celular')}${telField('whatsapp', 'WhatsApp')}${nested ? '' : resMultiHtml([])}`, `data-form="add:own"${nested ? ' data-nested="1"' : ''}`, 'Salvar');
}
function openOwnerEdit(id, opts = {}) {
  const c = (S.owners || []).find(x => x.id === id); if (!c) return;
  const ids = (S.links || []).filter(l => l.cpf_id === id).map(l => S.res.find(r => r.id === l.residence_id)).filter(Boolean).sort(byName).map(r => r.id);
  modal('Editar proprietário', `<label>Nome<input name="name" value="${esc(c.name)}" required></label><label>CPF atual<input value="${esc(c.cpf_mask)}" disabled></label><label>Novo CPF (deixe em branco para manter)<input name="cpf" class="cpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00"></label><label>E-mail do proprietário<input name="email" type="email" value="${esc(c.expected_email || '')}"></label>${telField('phone', 'Celular', c.phone || '')}${telField('whatsapp', 'WhatsApp', c.whatsapp || '')}${opts.fromRes ? '' : resMultiHtml(ids)}`, `data-form="edit:own" data-id="${id}"`, 'Salvar');
}
function presetCat(cat) { return `<div class="field"><span class="lbl">Tipo de construção</span><div class="presetres"><b>${cat[0]}</b></div><input type="hidden" name="category" value="${cat[2]}"></div>`; }
// imagens e vídeos nos cadastros da Construção (Cloudinary; os endereços ficam na coluna "media" de building_items)
const MEDIA_T = { building_items: { vid: true, pdf: true, d3: 'Estrutura', pasta: 'construcao' }, equipment: { vid: false, pasta: 'equipamentos' }, maintenance_tasks: { vid: true, pdf: true, pasta: 'inspecoes' } };   // tabelas com imagens (e vídeos) no cadastro
const mediaKinds = (k, cat) => { const T0 = MEDIA_T[k], d3 = T0.d3 && cat === T0.d3; return d3 ? 'imagens, vídeos, PDFs e arquivos 3D' : T0.pdf ? 'imagens, vídeos e PDFs' : T0.vid ? 'imagens e vídeos' : 'imagens'; };
const accept3d = () => ',' + PL_3D.map(e => '.' + e).join(',');
const mediaHint = (k, cat) => { const T0 = MEDIA_T[k]; return `Imagens até 10 MB${T0.vid ? ', vídeos até 100 MB' : ''}${T0.pdf ? ' e PDFs até 25 MB' : ''}.` + (T0.d3 && cat === T0.d3 ? ` Arquivos 3D até 200 MB (${PL_3D.map(e => e.toUpperCase()).join(', ')}); só GLB e GLTF abrem para visualização, os demais ficam guardados para baixar.` : ''); };
const mediaItemLabel = x => (x.type === 'video' ? 'Vídeo' : x.type === 'pdf' ? 'PDF' : x.type === '3d' ? '3D' : 'Imagem') + ' · ' + (x.name || 'arquivo');
const bldMediaInput = (row, k = 'building_items', cat) => { const T0 = MEDIA_T[k], cap = mediaKinds(k, cat), base = T0.pdf ? 'image/*,video/*,application/pdf' : T0.vid ? 'image/*,video/*' : 'image/*'; return !CLOUD_OK ? cloudMissing() : (row ? `<div class="field"><span class="lbl">Arquivos atuais (${cap})</span><ul class="curfiles">${(row.media || []).map((x, i) => `<li><span class="fname">${esc(mediaItemLabel(x))}</span><label class="chk"><input type="checkbox" name="rm_media" value="${i}"> remover</label></li>`).join('') || '<li class="mute">Nenhum arquivo.</li>'}</ul></div>` : '') + `<label>${row ? 'Adicionar mais' : 'Anexar'} ${cap} (opcional; pode escolher vários)<input name="media" type="file" data-base="${base}" ${T0.d3 ? `data-d3="${T0.d3}"` : ''} accept="${base}${T0.d3 && cat === T0.d3 ? accept3d() : ''}" multiple></label><p class="mute" data-mhint="${k}">${mediaHint(k, cat)}</p>`; };
const bldThumbs = (r, k = 'building_items', soVis) => { const m = r.media || []; if (!m.length) return '';
  const vis = m.map((x, i) => [x, i]).filter(([x]) => x.type === 'image' || x.type === 'video'), pdf = soVis ? [] : m.filter(x => x.type === 'pdf'), d3 = soVis ? [] : m.filter(x => x.type === '3d');
  return (vis.length ? `<div class="bthumbs">${vis.map(([x, i]) => `<button type="button" class="bthumb" data-bm="${k}|${r.id}|${i}" aria-label="Ampliar ${x.type === 'video' ? 'vídeo' : 'imagem'}"><img src="${esc(x.type === 'video' ? vposter(x.url) : cld(x.url, 200))}" alt="" loading="lazy" draggable="false">${x.type === 'video' ? '<span class="playbadge">▶</span>' : ''}</button>`).join('')}</div>` : '') +
    (pdf.length ? `<div class="dfiles">${pdf.map(x => `<button type="button" class="link filelink" data-open="${esc(x.path)}" title="Abrir">PDF · ${esc(x.name)}</button>`).join('')}</div>` : '') +
    (d3.length ? `<div class="dfiles">${d3.map(x => `<button type="button" class="link filelink" data-v3d="${esc(x.path)}|${esc(x.name)}|${x.size || 0}" title="Ver em 3D">3D · ${esc(x.name)}</button>`).join('')}</div>` : ''); };
async function saveBld(f, o, op, k = 'building_items') {
  const picked = f.media ? [...f.media.files] : [], T0 = MEDIA_T[k], catv = (o.category || '').trim(), kind = x => /^image\//.test(x.type) ? 'image' : /^video\//.test(x.type) && T0.vid ? 'video' : x.type === 'application/pdf' && T0.pdf ? 'pdf' : T0.d3 && catv === T0.d3 && PL_3D.includes(plExt(x.name)) ? '3d' : null;
  for (const x of picked) {
    const t = kind(x); if (!t) return { error: { message: `"${x.name}" não é um tipo aceito (${mediaKinds(k, catv)}).${PL_3D.includes(plExt(x.name)) ? ' Arquivos 3D só podem ser enviados em Construção › Estrutura.' : ''}` } };
    const max = t === 'video' ? 100 : t === '3d' ? 200 : t === 'pdf' ? 25 : 10; if (x.size > max * 1048576) return { error: { message: `"${x.name}" é maior que ${max} MB.` } };
  }
  const { media, rm_media, ...fields } = o, row = op === 'edit' ? (S.rows[k] || []).find(x => x.id === f.dataset.id) : null;
  const rid = op === 'add' ? fields.residence_id : row && row.residence_id, res = S.res.find(x => x.id === rid), up = [], store = sb.storage.from('documents');
  const folder = 'astell-home/' + String(res ? res.code : 'sem-codigo').replace(/[^\w-]/g, '_') + '/' + T0.pasta, pdfPaths = () => up.filter(x => x.path).map(x => x.path);
  try {
    for (let i = 0; i < picked.length; i++) {
      toast(`Enviando ${i + 1} de ${picked.length}…`); const t = kind(picked[i]);
      if (t === 'pdf' || t === '3d') { const path = `${rid}/${T0.pasta}/${Date.now()}_${i}_${picked[i].name.replace(/[^\w.-]/g, '_')}`, r = await store.upload(path, picked[i], { contentType: t === 'pdf' ? 'application/pdf' : plExt(picked[i].name) === 'glb' ? 'model/gltf-binary' : 'application/octet-stream' }); if (r.error) throw r.error; up.push({ path, type: t, name: picked[i].name, size: picked[i].size }); }
      else { const j = await cldPost(picked[i], folder); up.push({ url: j.secure_url, type: t, name: picked[i].name, public_id: j.public_id }); }
    }
  } catch (e) { if (pdfPaths().length) await store.remove(pdfPaths()); return { error: { message: 'falha no envio de arquivo (' + e.message + ')' } }; }
  if (op === 'add') { const r = await sb.from(k).insert({ ...fields, media: up }); if (r.error && pdfPaths().length) await store.remove(pdfPaths()); return r; }
  const rm = [...f.querySelectorAll('[name=rm_media]:checked')].map(i => +i.value), old = (row && row.media) || [];
  const r = await sb.from(k).update({ ...fields, media: [...old.filter((x, i) => !rm.includes(i)), ...up] }).eq('id', f.dataset.id);
  if (r.error) { if (pdfPaths().length) await store.remove(pdfPaths()); } else { const gone = old.filter((x, i) => rm.includes(i) && x.path).map(x => x.path); if (gone.length) await store.remove(gone); }
  return r;
}
function openAdd(k) {
  if (k.startsWith('dc:')) return openDc(k.slice(3));
  if (ADD[k]) return ADD[k]();
  const cat = k === 'building_items' && S.cat ? BCATS[S.cat] : null;   // dentro de Estruturas/Materiais/Sistemas o tipo já vem definido
  modal('Adicionar — ' + (cat ? cat[0] : T[k].label), resField() + (cat ? presetCat(cat) : '') + T[k].f.filter(f => !(cat && f[0] === 'category')).map(f => fld(f)).join('') + (MEDIA_T[k] ? bldMediaInput(null, k, cat ? cat[2] : undefined) : ''), `data-form="add:${k}"`);
}
// ---------- copiar: abre o cadastro já preenchido; ao salvar vira um NOVO registro (os arquivos anexos não são copiados)
const copyNote = t => `<p class="notice">Cópia de “${esc(t || 'registro')}”. Ajuste o que precisar e salve para criar um novo cadastro. Os arquivos anexos não são copiados; anexe novamente se precisar.</p>`;
function pickCopyRes(rid) { if (S.scope) return; const box = document.querySelector('#modal [data-combo=res]'); if (box) comboPick(box, rid); }   // nos menus gerais a residência vem escolhida, mas pode ser trocada
function openCopy(k, id) {
  if (k === 'dc') { const dr = (S.rows.doc_records || []).find(r => r.id === id); return dr && openDc(Object.keys(DCATS).find(x => DCATS[x].kind === dr.kind), null, dr); }
  if (k === 'pl') { const p = S.curPlan || {}; if (p.id !== id) return; return modal('Copiar planta técnica', copyNote(p.title) + resField() + plFormBody(null, p), 'data-form="add:pl" data-iscopy="1"', 'Salvar cópia'), pickCopyRes(p.residence_id); }
  const row = (S.rows[k] || []).find(r => r.id === id); if (!row) return;
  if (k === 'documents') { modal('Copiar documento', copyNote(row.title) + resField() + '<label>Arquivo<input name="file" type="file" required></label>' + DOC_F.map(f => fld(f, row)).join(''), 'data-form="add:docs"', 'Salvar cópia'); return pickCopyRes(row.residence_id); }
  const cat = k === 'building_items' && S.cat ? BCATS[S.cat] : null;
  modal('Copiar — ' + (cat ? cat[0] : T[k].label), copyNote(TITLE[k] ? TITLE[k](row) : '') + resField() + (cat ? presetCat(cat) : '') + T[k].f.filter(f => !(cat && f[0] === 'category')).map(f => fld(f, row)).join('') + (MEDIA_T[k] ? bldMediaInput(null, k, cat ? cat[2] : row.category) : ''), `data-form="add:${k}"`, 'Salvar cópia');
  pickCopyRes(row.residence_id);
}
function openEdit(k, id, opts = {}) {
  if (k === 'res') { const r = S.res.find(x => x.id === id); if (!r) return; return modal('Editar cadastro', resFormBody(r, (S.ownersByRes[id] || []).map(o => o.id), !!opts.fromOwner), `data-form="edit:res" data-id="${id}"`, 'Salvar alterações'); }
  if (k === 'dc') { const dr = (S.rows.doc_records || []).find(r => r.id === id); return dr && openDc(Object.keys(DCATS).find(x => DCATS[x].kind === dr.kind), dr); }
  const row = (S.rows[k] || []).find(r => r.id === id); if (!row) return;
  modal('Editar', `<p class="mute">Residência: <b>${esc(resName(row.residence_id))}</b></p>` + fieldsFor(k).map(f => fld(f, row)).join('') + (MEDIA_T[k] ? bldMediaInput(row, k, row.category) : ''), `data-form="edit:${k}" data-id="${id}"`, 'Salvar alterações');
}


// ---------- galeria de imagens das manutenções (Cloudinary; só imagens)
async function gallery() {
  const g = S.gal;
  const { data, error } = await sb.from('images').select('*').eq('residence_id', g.resId).eq('kind', g.kind).order('created_at');
  S.imgs = (data || []).filter(x => x.ref_id === g.refId); S.galErr = error; galleryRender();
}
function galleryRender() {
  const g = S.gal, list = S.imgs || [];
  const tile = x => `<div class="gtile"><a href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${esc(cld(x.url, 400))}" alt="" loading="lazy"></a>${x.visible === false ? ' <span class="badge">Oculto do cliente</span>' : ''}${acts(`<button class="link" data-gvis="${x.id}">${x.visible === false ? 'Mostrar ao cliente' : 'Ocultar do cliente'}</button>`, `<button class="link danger" data-gdel="${x.id}">Excluir</button>`)}</div>`;
  $('#modal').innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Imagens"><div class="sheethead"><b>Imagens — ${esc(g.title)}</b><button type="button" class="x" data-close aria-label="Fechar">×</button></div>` +
    (CLOUD_OK ? '<form data-form="gal"><label>Adicionar imagens (selecione quantas quiser)<input name="imgs" type="file" accept="image/*" multiple required></label><button>Salvar</button></form><p class="mute" id="galmsg"></p>' : cloudMissing()) +
    (S.galErr ? '<p class="empty">Rode o schema_v6.sql no Supabase para habilitar as imagens.</p>' : `<h3>${list.length} imagem(ns)</h3><div class="gallery">${list.map(tile).join('') || '<p class="empty">Nenhuma imagem enviada ainda.</p>'}</div>`) + '</div>';
  $('#modal').hidden = false;
}
const cloudMissing = () => `<p class="notice">Cloudinary não configurado. Faltando no config.js: ${[!CLD_NAME && 'CLOUDINARY_CLOUD_NAME', !CLD_PRESET && 'CLOUDINARY_UPLOAD_PRESET'].filter(Boolean).join(' e ')}.</p>`;

// envia vários arquivos ao Cloudinary e grava os links no Supabase; devolve quantos deram certo e quais falharam
async function uploadFiles(files, g, msg) {
  const res = S.res.find(r => r.id === g.resId), failed = []; let ok = 0;
  const folder = 'astell-home/' + String(res ? res.code : g.resId).replace(/[^\w-]/g, '_') + '/' + g.kind;
  for (let i = 0; i < files.length; i++) {
    const file = files[i]; if (msg) msg.textContent = `Enviando ${i + 1} de ${files.length}...`;
    try {
      const vid = /^video\//.test(file.type || ''), img = /^image\//.test(file.type || '');
      if (!img && !(vid && g.kind === 'residence')) throw new Error(g.kind === 'residence' ? 'envie apenas imagens ou vídeos' : 'envie apenas imagens');
      const max = vid ? 100 : 10; if (file.size > max * 1024 * 1024) throw new Error('maior que ' + max + ' MB');
      const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', CLD_PRESET); fd.append('folder', folder);
      const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLD_NAME}/auto/upload`, { method: 'POST', body: fd });
      const j = await resp.json(); if (!resp.ok) throw new Error((j.error && j.error.message) || 'erro no envio');
      const { error } = await sb.from('images').insert({ residence_id: g.resId, kind: g.kind, ref_id: g.refId || null, url: j.secure_url, public_id: j.public_id, ...(vid ? { media_type: 'video' } : {}) });
      if (error) throw error; ok++;
    } catch (e) { toast(`Falha em "${file.name}": ${e.message}`, 1); failed.push(file); }
  }
  if (msg) msg.textContent = '';
  return { ok, failed };
}
const savedMsg = n => n + (n === 1 ? ' arquivo salvo.' : ' arquivos salvos.');
async function uploadImages(form) {   // galeria das manutenções
  const r = await uploadFiles([...form.imgs.files], S.gal, $('#galmsg'));
  if (r.ok) toast(savedMsg(r.ok));
  await gallery(); render();
}

// ---------- tela de upload (Residências): arrastar e soltar ou escolher no computador
function openUpload(resId) {
  const r = S.res.find(x => x.id === resId); if (!r) return;
  S.up = { resId, files: [] };
  $('#modal').innerHTML = `<div class="sheet big" role="dialog" aria-modal="true" aria-label="Upload de imagens e vídeos"><div class="sheethead"><b>Upload de imagens e vídeos — ${esc(r.name)}</b><button type="button" class="x" data-close aria-label="Fechar">×</button></div>` +
    (CLOUD_OK ? '<div id="drop" class="dropzone"><p><b>Arraste imagens ou vídeos para cá</b></p><p class="mute">ou</p><button type="button" data-pickfiles>Selecionar arquivos do computador</button><input id="fileIn" type="file" accept="image/*,video/*" multiple hidden></div><div id="stage"></div><button type="button" data-savefiles disabled>Salvar</button><p class="mute" id="galmsg"></p><p class="notice">Imagens até 10 MB e vídeos até 100 MB. Você pode adicionar quantos arquivos quiser.</p>' : cloudMissing()) + '</div>';
  $('#modal').hidden = false;
}
function renderStage() {
  const f = S.up.files, st = $('#stage'); if (!st) return;
  st.innerHTML = f.length ? `<h3>${f.length} ${f.length === 1 ? 'arquivo' : 'arquivos'} para salvar</h3>` + f.map((x, i) => `<div class="stagerow">${/^image\//.test(x.type) ? `<img src="${URL.createObjectURL(x)}" alt="">` : '<span class="vthumb">▶</span>'}<span class="sname">${esc(x.name)} <small class="mute">· ${(x.size / 1048576).toFixed(1)} MB</small></span><button type="button" class="x" data-unstage="${i}" aria-label="Remover da lista">×</button></div>`).join('') : '';
  const b = $('[data-savefiles]'); if (b) b.disabled = !f.length;
}
function stageFiles(list) {
  if (!S.up) return;
  list.forEach(f => {
    const vid = /^video\//.test(f.type), img = /^image\//.test(f.type);
    if (!img && !vid) return toast(`"${f.name}" não é imagem nem vídeo.`, 1);
    const max = vid ? 100 : 10; if (f.size > max * 1024 * 1024) return toast(`"${f.name}" é maior que ${max} MB.`, 1);
    S.up.files.push(f);
  });
  renderStage();
}
async function saveStaged() {
  const u = S.up; if (!u || !u.files.length) return;
  const b = $('[data-savefiles]'); b.disabled = true;
  const r = await uploadFiles(u.files, { kind: 'residence', refId: null, resId: u.resId }, $('#galmsg'));
  if (r.ok) toast(savedMsg(r.ok));
  u.files = r.failed;
  if (!r.failed.length) { if (!S.cur || S.cur.id !== u.resId) { S.cur = S.res.find(x => x.id === u.resId); } S.mTab = 'all'; closeModal(); await render(); } else renderStage();
}

// ---------- imagens e vídeos da residência selecionada (tela Residências): abas, seleção e exclusão em lote
async function loadMedia() {
  if (!S.cur) { S.mediaRows = []; return; }
  const { data, error } = await sb.from('images').select('*').eq('residence_id', S.cur.id).eq('kind', 'residence').order('created_at', { ascending: false });
  S.mediaRows = data || []; S.mediaErr = error;
}
const resetSel = () => { S.sel = { on: false, ids: new Set() }; };
const renderMedia = () => { const b = $('#mediabox'); if (b) b.innerHTML = mediaPanel(); };
const mediaShown = () => { const list = S.mediaRows || [], tab = S.mTab || 'all'; return { all: list, img: list.filter(x => !isVid(x)), vid: list.filter(isVid) }[tab] || list; };
function mediaPanel() {
  const list = S.mediaRows || [], vids = list.filter(isVid), pics = list.filter(x => !isVid(x)), tab = S.mTab || 'all', shown = mediaShown(), sel = S.sel, n = sel.ids.size;
  const tile = x => { const ck = sel.ids.has(x.id), vid = isVid(x);
    return `<div class="gtile mtile${ck ? ' picked' : ''}"><div class="mwrap"><img src="${esc(vid ? vposter(x.url) : cld(x.url, 300))}" alt="" loading="lazy" draggable="false" data-mi="${x.id}">${vid ? '<span class="playbadge">▶</span><span class="badge vb">Vídeo</span>' : ''}${sel.on ? `<div class="cover" data-selid="${x.id}"></div><input type="checkbox" class="selbox" data-selid="${x.id}" ${ck ? 'checked' : ''} aria-label="Selecionar ${vid ? 'vídeo' : 'imagem'}">` : ''}</div><div class="mfoot">${x.visible === false ? '<span class="badge">Oculto</span>' : '<span></span>'}<button type="button" class="link" data-mvis="${x.id}" title="${x.visible === false ? 'Mostrar ao cliente' : 'Ocultar do cliente'}">${x.visible === false ? 'Mostrar' : 'Ocultar'}</button></div></div>`; };
  const tabs = `<div class="tabs three" role="tablist">${[['all', 'Todos', list.length], ['img', 'Imagens', pics.length], ['vid', 'Vídeos', vids.length]].map(([k, l, c]) => `<button type="button" role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-mtab="${k}">${l} (${c})</button>`).join('')}</div>`;
  const tools = `<div class="mtools"><span class="mute">${shown.length} ${shown.length === 1 ? 'item' : 'itens'}</span><span class="mbtns">${sel.on ? `<button type="button" class="btn-danger" data-seldel ${n ? '' : 'disabled'}>Excluir${n ? ` (${n})` : ''}</button><button type="button" class="ghost2" data-selmode>Cancelar</button>` : `<button type="button" class="ghost2" data-selmode ${shown.length ? '' : 'disabled'}>Selecionar</button>`}</span></div>`;
  const empty = tab === 'img' ? 'Nenhuma imagem enviada ainda.' : tab === 'vid' ? 'Nenhum vídeo enviado ainda.' : 'Nada enviado ainda. Use "Upload de imagens e vídeos".';
  return `<div class="mcenter"><button type="button" class="up" data-upl="res:${S.cur.id}">Upload de imagens e vídeos</button>` +
    (S.mediaErr ? '<p class="empty">Rode o schema_v6.sql (e o v7) no Supabase para habilitar as imagens e vídeos.</p>' : tabs + tools + '<p class="mute mhint">Dê dois cliques em uma imagem, ou um clique em um vídeo, para ampliar.</p>' + `<div class="mgrid">${shown.map(tile).join('') || `<p class="empty">${empty}</p>`}</div>`) + '</div>';
}
// visualizador: abre por cima da tela, na ordem da aba escolhida, com setas em carrossel
function lbShow() {
  const L = S.lb, x = L.list[L.i], lb = $('#lb'); lb.hidden = false;
  const media = isVid(x) ? `<video controls playsinline preload="metadata" src="${esc(vsrc(x.url))}" poster="${esc(vposterBig(x.url))}"></video>` : `<img src="${esc(cld(x.url, 1800))}" alt="">`;
  lb.innerHTML = `<button type="button" class="lbx" data-lbx aria-label="Fechar">×</button>${L.list.length > 1 ? '<button type="button" class="lbn l" data-lbn="-1" aria-label="Mídia anterior">‹</button><button type="button" class="lbn r" data-lbn="1" aria-label="Próxima mídia">›</button>' : ''}<div class="lbbox">${media}</div><div class="lbcap">${L.i + 1} / ${L.list.length} · ${isVid(x) ? 'Vídeo' : 'Imagem'}</div>`;
}
const lbClose = () => { const lb = $('#lb'); lb.hidden = true; lb.innerHTML = ''; };
function lbOpen(id) { const list = mediaShown(), i = list.findIndex(x => x.id === id); if (i >= 0) lbOpenList(list, i); }
function lbOpenList(list, i) {
  const lb = $('#lb'), novo = lb.hidden; S.lb = { list, i }; lbShow();
  if (novo) { lb.classList.add('fresh'); setTimeout(() => lb.classList.remove('fresh'), 600); }   // por 0,6 s ignora cliques (evita fechar ou dar play sem querer num duplo clique)
}
function lbMove(n) { const L = S.lb; L.i = (L.i + n + L.list.length) % L.list.length; lbShow(); }


// ---------- dados auxiliares: residências e proprietários
const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const cmp = s => s.replace(/[^a-z0-9]/g, '');   // ignora hífen, espaço e pontuação (ex.: "ast2026002" acha "AST-2026-002")
const hit = (hay, q) => hay.includes(q) || (cmp(q) && cmp(hay).includes(cmp(q)));
async function reloadRes() { const { data } = await sb.from('residences').select('*').order('created_at', { ascending: false }); S.res = data || []; }
async function loadOwners() {
  const [{ data: cl }, { data: lk }] = await Promise.all([sb.from('client_cpfs').select('*').order('created_at', { ascending: false }), sb.from('cpf_residences').select('cpf_id,residence_id')]);
  S.owners = cl || []; S.links = lk || []; S.ownersByRes = {};
  S.links.forEach(l => { const c = S.owners.find(x => x.id === l.cpf_id); if (c) (S.ownersByRes[l.residence_id] = S.ownersByRes[l.residence_id] || []).push(c); });
}
const resName = id => { const r = S.res.find(x => x.id === id); return r ? r.name : '—'; };
const ownNames = rid => (S.ownersByRes[rid] || []).map(o => esc(o.name)).join(', ') || '—';
// linhas que todo card de elemento mostra abaixo do título: a residência e, abaixo dela, o(s) proprietário(s)
const metaHtml = rid => `<span class="mute meta">Residência: ${esc(resName(rid))}</span><span class="mute meta">Proprietários: ${ownNames(rid)}</span>`;
const hayOf = (rid, ...extra) => { const r = S.res.find(x => x.id === rid) || {}; return norm([...extra, r.name, r.code, ...(S.ownersByRes[rid] || []).map(o => o.name)].join(' ')); };

// ---------- pesquisa dos módulos: cada tela registra seus itens e a barra de pesquisa filtra por residência, proprietário e título
const SHELL = '<p class="mute" id="mcount"></p><div id="mlist"></div><div id="pg-mlist"></div>';
function pagerHtml(id, total, pg, pages) {
  const set = [...new Set([1, pages, pg - 2, pg - 1, pg, pg + 1, pg + 2].filter(n => n >= 1 && n <= pages))].sort((x, y) => x - y); let prev = 0; const nums = [];
  set.forEach(n => { if (n - prev > 1) nums.push('<span class="dots">…</span>'); nums.push(`<button type="button" class="pgbtn${n === pg ? ' cur' : ''}" data-pg="${id}:${n}" ${n === pg ? 'aria-current="page"' : ''} aria-label="Página ${n}">${n}</button>`); prev = n; });
  return `<div class="pager" role="navigation" aria-label="Paginação"><span class="mute pginfo">${(pg - 1) * S.pp + 1}–${Math.min(total, pg * S.pp)} de ${total}</span><div class="pgnums"><button type="button" class="pgbtn" data-pg="${id}:${pg - 1}" ${pg === 1 ? 'disabled' : ''} aria-label="Página anterior">‹</button>${nums.join('')}<button type="button" class="pgbtn" data-pg="${id}:${pg + 1}" ${pg === pages ? 'disabled' : ''} aria-label="Próxima página">›</button></div><label class="pp">Por página <select data-pp aria-label="Itens por página">${PP.map(n => `<option ${n === S.pp ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>`;
}
function paintItems() {
  const q = norm(S.q).trim(), raw = S.q.trim(), noun = S.noun || ['item', 'itens'];
  Object.entries(S.items || {}).forEach(([id, items], n) => {
    const el = $('#' + id); if (!el) return;
    const list = items.filter(i => (!q || hit(i.hay, q)) && (!S.stf.size || i.st === undefined || S.stf.has(i.st)) && (!S.urf.size || i.ur === undefined || S.urf.has(i.ur))), filtrado = !!q || ((S.stf.size > 0 || S.urf.size > 0) && items.some(i => i.st !== undefined || i.ur !== undefined)), pages = Math.max(1, Math.ceil(list.length / S.pp)), pg = Math.min(Math.max(1, S.pages[id] || 1), pages);
    S.pages[id] = pg;
    el.innerHTML = list.length ? list.slice((pg - 1) * S.pp, pg * S.pp).map(i => i.html).join('') : `<p class="empty">${items.length ? (raw ? `Nada encontrado para “${esc(raw)}”${S.stf.size || S.urf.size ? ' com o filtro escolhido' : ''}.` : 'Nenhum item com o filtro escolhido.') : ((S.empties || {})[id] || 'Nada cadastrado ainda. Toque em + para adicionar.')}</p>`;
    const bar = $('#pg-' + id); if (bar) bar.innerHTML = list.length ? pagerHtml(id, list.length, pg, pages) : '';
    const c = n === 0 && $('#mcount'); if (c) c.textContent = filtrado ? `${list.length} de ${items.length} ${items.length === 1 ? noun[0] : noun[1]}` : `${items.length} ${items.length === 1 ? noun[0] : noun[1]}`;
  });
}
const setItems = (map, empties = {}) => { S.items = map; S.empties = empties; };

// ---------- Residências: lista de cards com pesquisa e tela de cadastro de cada residência
async function resList() {
  await loadOwners();
  setItems({ mlist: S.res.map(r => ({ hay: norm([r.name, r.code, ...(S.ownersByRes[r.id] || []).map(o => o.name)].join(' ')), html: `<a class="card rescard" href="#res/${r.id}"><b>${esc(r.name)}</b><span class="mute">${esc(r.code)} · ${esc(r.address || 'sem endereço')}</span><span class="mute">Proprietários: ${ownNames(r.id)}</span><span class="mute">Obra: ${fmt(r.start_date)} → ${fmt(r.delivery_date)}</span></a>` })) }, { mlist: 'Nenhuma residência cadastrada. Toque em + para adicionar a primeira.' });
  S.noun = ['residência', 'residências'];
  view.innerHTML = head('Residências', 'res') + SHELL.replace('id="mlist"', 'id="mlist" class="rescards"'); paintItems();
}
const contactLine = c => `${c.phone ? `<span class="mute meta">Celular: ${esc(c.phone)}</span>` : ''}${c.whatsapp ? `<span class="mute meta">WhatsApp: <a class="golda" href="https://wa.me/55${telDigits(c.whatsapp)}" target="_blank" rel="noopener">${esc(c.whatsapp)}</a></span>` : ''}`;
const SECTIONS = { docs: ['Documentos', 'doc'], media: ['Mídias', 'image'], eq: ['Equipamentos', 'layers'], gar: ['Garantias', 'shield'], man: ['Inspeções Preventivas', 'wrench'], ast: ['Assistências', 'phones'], bld: ['Construção', 'home'], pl: ['Plantas Técnicas', 'map'] };
const BCATS = { est: ['Estruturas', 'home', 'Estrutura'], mat: ['Materiais', 'layers', 'Materiais'], sis: ['Sistemas', 'drop', 'Sistemas'], inf: ['Infraestrutura', 'estrada', 'Infraestrutura'] };   // [rótulo do card, ícone, valor gravado no banco]
const bldTrail = () => S.scope ? [['Painel', '#res'], ['Residências', '#res'], [resName(S.scope), '#res/' + S.scope], ['Construção', '#res/' + S.scope + '/bld'], [BCATS[S.cat][0]]] : [['Painel', '#res'], ['Construção', '#bld'], [BCATS[S.cat][0]]];
function bldHub() {   // quatro cards: Estruturas, Materiais, Sistemas e Infraestrutura (no menu geral e dentro da residência)
  const base = S.scope ? `#res/${S.scope}/bld` : '#bld';
  view.innerHTML = head('Construção', 'building_items') + `<div class="modgrid">${Object.entries(BCATS).map(([k, [l, i]]) => `<a class="card rescard modcard" href="${base}/${k}">${ico(IC[i])}<b>${l}</b></a>`).join('')}</div>`;
}
async function resDetail(id) {
  const r = S.res.find(x => x.id === id);
  if (!r) { view.innerHTML = crumbs([['Painel', '#res'], ['Residências', '#res'], ['Não encontrada']]) + '<p class="empty">Residência não encontrada.</p>'; return; }
  S.cur = r; await loadOwners();
  const ow = S.ownersByRes[r.id] || [], v = x => esc(x == null || x === '' ? '—' : x);
  const info = [['Código', r.code], ['Nome da residência', r.name], ['Endereço', r.address], ['Área construída', r.area_m2 != null && r.area_m2 !== '' ? r.area_m2 + ' m²' : ''], ['Pavimentos', r.floors], ['Sistema construtivo', r.build_system], ['Nº do projeto', r.project_no], ['Início da obra', r.start_date ? fmt(r.start_date) : ''], ['Entrega', r.delivery_date ? fmt(r.delivery_date) : ''], ['Responsável técnico', r.tech_lead], ['Observações', r.notes]];
  view.innerHTML = crumbs([['Painel', '#res'], ['Residências', '#res'], [r.name]]) + `<div class="pagehead"><div><h2>${esc(r.name)}</h2><p class="mute">${esc(r.code)}</p></div><button type="button" class="up" data-edit="res:${r.id}">Editar cadastro</button></div>` +
    `<div class="detailgrid"><section class="card"><h3 style="margin-top:0">Cadastro</h3><div class="info">${info.map(([l, x]) => `<div><span class="mute">${l}</span><b>${v(x)}</b></div>`).join('')}</div></section>` +
    `<section class="card"><h3 style="margin-top:0">Proprietários (${ow.length})</h3>${ow.length ? `<ol class="numlist">${ow.map(o => `<li><b>${esc(o.name)}</b><span class="mute">${esc(o.cpf_mask)} · ${o.claimed_by ? 'Acesso ativo' : 'Aguardando primeiro acesso'}</span>${contactLine(o)}</li>`).join('')}</ol>` : '<p class="empty">Nenhum proprietário vinculado.</p>'}</section></div>` +
    `<div class="modgrid">${Object.entries(SECTIONS).map(([k, [l, i]]) => `<a class="card rescard modcard" href="#res/${r.id}/${k}">${ico(IC[i])}<b>${l}</b></a>`).join('')}</div>`;
}
// telas de cada módulo dentro da residência: só o que é dela, com o + já com a residência definida
async function resSection(id, sub) {
  const r = S.res.find(x => x.id === id); if (!r) return resDetail(id);
  S.cur = r; S.scope = id;
  if (sub === 'media') { resetSel(); await Promise.all([loadMedia(), loadOwners()]); view.innerHTML = head('Mídias', null) + `<div id="mediabox">${mediaPanel()}</div>`; return; }
  return ({ docs: () => PAGES.docs(), eq: () => listPage('equipment'), gar: () => listPage('warranties'), man: () => listPage('maintenance_tasks'), bld: () => S.cat ? listPage('building_items') : bldHub(), ast: () => PAGES.ast(), pl: () => S.plan ? plantaDetail(S.plan) : plantasList() })[sub]();
}

// ---------- páginas dos módulos (independentes: mostram tudo, por ordem de cadastro, de todas as residências)
const crumbs = items => `<div class="crumbs" role="navigation" aria-label="Caminho de navegação"><ol>${items.map(([l, h], i) => i === items.length - 1 ? `<li aria-current="page">${esc(l)}</li>` : `<li><a href="${h}">${esc(l)}</a></li>`).join('')}</ol></div>`;
const scoped = q => S.scope ? q.eq('residence_id', S.scope) : q;   // dentro de uma residência: só o que é dela
const head = (t, add, trail) => { if (S.scope && S.sub && !S.cat && !S.dcat) t = SECTIONS[S.sub][0]; return crumbs(trail || (S.scope ? [['Painel', '#res'], ['Residências', '#res'], [resName(S.scope), '#res/' + S.scope], [t]] : [['Painel', '#res'], [t]])) + `<div class="pagehead"><div><h2>${t}</h2></div>${add ? `<button class="add" data-add="${add}" aria-label="Adicionar" title="Adicionar">+</button>` : ''}</div>`; };
const acts = (...b) => `<div class="acts">${b.filter(Boolean).join('')}</div>`;
const visBtn = (k, r) => `<button class="link" data-vis="${k}:${r.id}">${r.visible ? 'Ocultar do cliente' : 'Mostrar ao cliente'}</button>`;
const hid = r => r.visible === false ? '<p><span class="badge">Oculto do cliente</span></p>' : '';
const TITLE = { warranties: r => r.system, maintenance_tasks: r => r.name, equipment: r => r.name, building_items: r => r.title };


// ---------- Documentos e Mídias de cada elemento (PDFs/3D de um lado; imagens e vídeos do outro, com a mesma organização das mídias da residência)
const EM = {
  building_items: { arr: 'media', doc: true, vid: true, pasta: 'construcao', cloud: true },
  equipment: { arr: 'media', doc: false, vid: false, pasta: 'equipamentos', cloud: true },
  maintenance_tasks: { arr: 'media', doc: true, vid: true, pasta: 'inspecoes', cloud: true },
  floorplans: { arr: 'files', doc: true, vid: true, pasta: 'plantas', cloud: true },
  doc_records: { arr: 'files', doc: true, vid: false, pasta: null, cloud: false },
  service_requests: { arr: 'media', doc: false, vid: false, pasta: 'assistencia', cloud: true },
};
const emTy = x => ['image', 'video', 'pdf', '3d'].includes(x.type) ? x.type : /^image\//.test(x.type || '') ? 'image' : x.type === 'application/pdf' ? 'pdf' : 'file';
function emSplit(k, row, imgs) {
  const m = [], d = [];
  ((row && row[EM[k].arr]) || []).forEach((x, idx) => { const t = emTy(x), o = { src: 'a', idx, key: 'a' + idx, type: t, name: x.name, url: x.url, path: x.path, size: x.size, visible: x.visible !== false }; (t === 'image' || t === 'video' ? m : d).push(o); });
  (imgs || []).forEach(x => m.push({ src: 'i', id: x.id, key: 'i' + x.id, type: 'image', url: x.url, visible: x.visible !== false, name: 'Imagem' }));
  return { m, d };
}
const emRow = (k, id) => k === 'floorplans' ? (S.curPlan && S.curPlan.id === id ? S.curPlan : null) : (S.rows[k] || []).find(r => r.id === id);
const emBtns = (k, r, nImg = 0) => { const { m, d } = emSplit(k, r, []); return acts(EM[k].doc ? `<button type="button" class="link" data-em="${k}:${r.id}:d">Documentos (${d.length})</button>` : '', `<button type="button" class="link" data-em="${k}:${r.id}:m">Mídias (${m.length + nImg})</button>`); };
async function emLoad() {
  const E = S.em, row = emRow(E.k, E.id); if (!row) return;
  if (E.k === 'maintenance_tasks') { const { data } = await sb.from('images').select('*').eq('kind', 'maintenance').eq('ref_id', E.id).order('created_at'); E.imgs = data || []; }
  const { m } = emSplit(E.k, row, E.imgs);
  await Promise.all(m.filter(x => x.path && !E.urls[x.path]).map(async x => { const { data } = await sb.storage.from('documents').createSignedUrl(x.path, 3600); if (data) E.urls[x.path] = data.signedUrl; }));
}
async function emOpen(k, id, view) { if (!emRow(k, id)) return; S.em = { k, id, view, tab: 'all', sel: { on: false, ids: new Set() }, imgs: [], urls: {} }; await emLoad(); emRender(); }
const emThumb = x => x.path ? x.url : x.type === 'video' ? vposter(x.url) : cld(x.url, 300);
function emRender() {
  const E = S.em, row = emRow(E.k, E.id), C = EM[E.k]; if (!row) return;
  const { m, d } = emSplit(E.k, row, E.imgs); m.forEach(x => { if (x.path) x.url = E.urls[x.path]; });
  const title = (row.title || row.name || 'Elemento'), vids = m.filter(x => x.type === 'video'), pics = m.filter(x => x.type === 'image'), sel = E.sel, n = sel.ids.size;
  let body;
  if (E.view === 'd') {
    const d3ok = E.k === 'building_items' && row.category === 'Estrutura';
    body = `<div class="mcenter"><button type="button" class="up" data-emup="d">Upload de documentos${d3ok ? ' e arquivos 3D' : ' (PDF)'}</button>` + (d.length ? d.map(x => `<div class="card pfile"><div class="pfhead"><b>${x.type === 'pdf' ? 'PDF' : x.type === '3d' ? '3D' : 'Arquivo'} · ${esc(x.name || 'arquivo')}</b><span class="mute">${plSize(x.size || 0)}</span></div>${acts(x.type === 'pdf' ? `<button type="button" class="link" data-open="${esc(x.path)}">Abrir</button>` : x.type === '3d' ? `<button type="button" class="link" data-v3d="${esc(x.path)}|${esc(x.name)}|${x.size || 0}">Ver em 3D</button>` : '', `<button type="button" class="link" data-dl="${esc(x.path)}|${esc(x.name)}">Baixar</button>`, `<button type="button" class="link danger" data-emdd="${x.idx}">Excluir</button>`)}</div>`).join('') : '<p class="empty">Nenhum documento enviado ainda.</p>') + '</div>';
  } else {
    const shown = { all: m, img: pics, vid: vids }[E.tab] || m;
    const tile = x => { const ck = sel.ids.has(x.key), vid = x.type === 'video';
      return `<div class="gtile mtile${ck ? ' picked' : ''}"><div class="mwrap"><img src="${esc(emThumb(x))}" alt="" loading="lazy" draggable="false" data-emi="${x.key}">${vid ? '<span class="playbadge">▶</span><span class="badge vb">Vídeo</span>' : ''}${sel.on ? `<div class="cover" data-emsid="${x.key}"></div><input type="checkbox" class="selbox" data-emsid="${x.key}" ${ck ? 'checked' : ''} aria-label="Selecionar ${vid ? 'vídeo' : 'imagem'}">` : ''}</div><div class="mfoot">${x.visible === false ? '<span class="badge">Oculto</span>' : '<span></span>'}<button type="button" class="link" data-emvis="${x.key}" title="${x.visible === false ? 'Mostrar ao cliente' : 'Ocultar do cliente'}">${x.visible === false ? 'Mostrar' : 'Ocultar'}</button></div></div>`; };
    const tabs = `<div class="tabs three" role="tablist">${[['all', 'Todos', m.length], ['img', 'Imagens', pics.length], ['vid', 'Vídeos', vids.length]].filter(t => C.vid || t[0] !== 'vid').map(([k, l, c]) => `<button type="button" role="tab" aria-selected="${E.tab === k}" class="${E.tab === k ? 'on' : ''}" data-emtab="${k}">${l} (${c})</button>`).join('')}</div>`;
    const tools = `<div class="mtools"><span class="mute">${shown.length} ${shown.length === 1 ? 'item' : 'itens'}</span><span class="mbtns">${sel.on ? `<button type="button" class="btn-danger" data-emdel ${n ? '' : 'disabled'}>Excluir${n ? ` (${n})` : ''}</button><button type="button" class="ghost2" data-emselmode>Cancelar</button>` : `<button type="button" class="ghost2" data-emselmode ${shown.length ? '' : 'disabled'}>Selecionar</button>`}</span></div>`;
    const empty = E.tab === 'img' ? 'Nenhuma imagem enviada ainda.' : E.tab === 'vid' ? 'Nenhum vídeo enviado ainda.' : 'Nada enviado ainda.';
    body = `<div class="mcenter"><button type="button" class="up" data-emup="m">Upload de imagens${C.vid ? ' e vídeos' : ''}</button>` + tabs + tools + '<p class="mute mhint">Dê dois cliques em uma imagem, ou um clique em um vídeo, para ampliar.</p>' + `<div class="mgrid">${shown.map(tile).join('') || `<p class="empty">${empty}</p>`}</div></div>`;
  }
  $('#modal').innerHTML = `<div class="sheet big emsheet" role="dialog" aria-modal="true" aria-label="${E.view === 'd' ? 'Documentos' : 'Mídias'}"><div class="sheethead"><b>${E.view === 'd' ? 'Documentos' : 'Mídias'} — ${esc(title)}</b><button type="button" class="x" data-close aria-label="Fechar">×</button></div>${body}<input type="file" id="emFile" hidden multiple></div>`;
  $('#modal').hidden = false;
}
async function emSave(patch) {   // grava o novo conteúdo da coluna de arquivos do elemento aberto
  const E = S.em, row = emRow(E.k, E.id), C = EM[E.k], r = await sb.from(E.k).update({ [C.arr]: patch }).eq('id', E.id);
  if (!r.error) row[C.arr] = patch; return r;
}
async function emUpload(files, kind) {
  const E = S.em, row = emRow(E.k, E.id), C = EM[E.k]; if (!row || !files.length) return;
  const d3ok = E.k === 'building_items' && row.category === 'Estrutura', res = S.res.find(x => x.id === row.residence_id), rid = row.residence_id, store = sb.storage.from('documents');
  const typeOf = x => kind === 'm' ? (/^image\//.test(x.type) ? 'image' : /^video\//.test(x.type) && C.vid ? 'video' : null) : (x.type === 'application/pdf' || plExt(x.name) === 'pdf' ? 'pdf' : d3ok && PL_3D.includes(plExt(x.name)) ? '3d' : null);
  for (const x of files) { const t = typeOf(x); if (!t) return toast(`"${x.name}" não é um tipo aceito aqui.`, 1); const mx = t === 'video' ? 100 : t === '3d' ? 200 : t === 'pdf' ? 25 : 10; if (x.size > mx * 1048576) return toast(`"${x.name}" é maior que ${mx} MB.`, 1); if (kind === 'm' && !C.cloud && !store) return; }
  const folder = 'astell-home/' + String(res ? res.code : 'sem-codigo').replace(/[^\w-]/g, '_') + '/' + (C.pasta || 'documentos'), up = [], sent = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const x = files[i], t = typeOf(x); toast(`Enviando ${i + 1} de ${files.length}…`);
      if (t === 'image' || t === 'video') {
        if (C.cloud) { if (!CLOUD_OK) throw new Error('Cloudinary não configurado'); const j = await cldPost(x, folder); up.push({ url: j.secure_url, type: t, name: x.name, public_id: j.public_id }); }
        else { const path = `${rid}/${row.kind || 'documentos'}/${Date.now()}_${i}_${x.name.replace(/[^\w.-]/g, '_')}`, r = await store.upload(path, x, { contentType: x.type }); if (r.error) throw r.error; sent.push(path); up.push({ path, name: x.name, type: x.type, size: x.size }); }
      } else {
        const path = `${rid}/${C.pasta || row.kind || 'documentos'}/${Date.now()}_${i}_${x.name.replace(/[^\w.-]/g, '_')}`, r = await store.upload(path, x, { contentType: t === 'pdf' ? 'application/pdf' : plExt(x.name) === 'glb' ? 'model/gltf-binary' : 'application/octet-stream' }); if (r.error) throw r.error; sent.push(path);
        up.push(C.arr === 'files' && E.k === 'doc_records' ? { path, name: x.name, type: 'application/pdf', size: x.size } : { path, type: t, name: x.name, size: x.size });
      }
    }
  } catch (e) { if (sent.length) await store.remove(sent); return toast('Falha no envio: ' + e.message, 1); }
  const r = await emSave([...(row[C.arr] || []), ...up]); if (r.error) { if (sent.length) await store.remove(sent); return toast('Não foi possível salvar: ' + r.error.message, 1); }
  toast(up.length === 1 ? 'Arquivo enviado.' : up.length + ' arquivos enviados.'); await emLoad(); emRender();
}
async function emRemove(keys) {   // keys: 'a<posição>' (colunas do elemento) ou 'i<id>' (imagens antigas das inspeções)
  const E = S.em, row = emRow(E.k, E.id), C = EM[E.k], idx = keys.filter(k => k[0] === 'a').map(k => +k.slice(1)), ids = keys.filter(k => k[0] === 'i').map(k => k.slice(1));
  if (idx.length) { const old = row[C.arr] || [], gone = old.filter((x, i) => idx.includes(i) && x.path).map(x => x.path), r = await emSave(old.filter((x, i) => !idx.includes(i))); if (r.error) return toast('Não foi possível excluir.', 1); if (gone.length) await sb.storage.from('documents').remove(gone); }
  for (const id of ids) { const r = await sb.from('images').delete().eq('id', id); if (r.error) return toast('Não foi possível excluir.', 1); }
  toast(keys.length === 1 ? 'Item excluído.' : keys.length + ' itens excluídos.'); E.sel = { on: false, ids: new Set() }; await emLoad(); emRender();
}
async function listPage(k) {
  const c = T[k], cat = k === 'building_items' && S.cat ? BCATS[S.cat] : null;
  await loadOwners();
  let qy = scoped(sb.from(k).select('*')); if (cat) qy = qy.eq('category', cat[2]);
  const { data, error } = await qy.order('created_at', { ascending: false });
  if (error) throw error; S.rows[k] = data; S.stMode = k === 'warranties' ? WST : null;
  const im = {};
  if (k === 'maintenance_tasks') { const { data: ii } = await scoped(sb.from('images').select('url,ref_id').eq('kind', 'maintenance')).order('created_at'); (ii || []).forEach(x => (im[x.ref_id] = im[x.ref_id] || []).push(x)); }
  setItems({ mlist: data.map(r => {
    const raw = c.row(r), i = raw.indexOf('</b>') + 4;
    return { st: k === 'maintenance_tasks' ? (ST[r.status] ? r.status : 'Pendente') : k === 'warranties' ? (wState(r)[0] === 'Expirada' ? 'Expirada' : 'Vigente') : undefined, hay: hayOf(r.residence_id, TITLE[k](r)), html: `<div class="card">${raw.slice(0, i)}${metaHtml(r.residence_id)}${raw.slice(i)}${hid(r)}${acts(`<button class="link" data-edit="${k}:${r.id}">Editar</button>`, `<button class="link" data-copy="${k}:${r.id}">Copiar</button>`, 'visible' in r && visBtn(k, r), `<button class="link danger" data-del="${k}:${r.id}">Excluir</button>`)}${EM[k] ? emBtns(k, r, (im[r.id] || []).length) : ''}</div>` };
  }) });
  view.innerHTML = head(cat ? cat[0] : c.label, k, cat ? bldTrail() : undefined) + (k === 'maintenance_tasks' || k === 'warranties' ? `<div class="stbar" id="stbar" role="group" aria-label="Filtrar por situação">${stBarInner()}</div>` : '') + SHELL + (c.note ? `<p class="notice">${c.note}</p>` : '');
  paintItems();
}

// ---------- Planta técnica: imagem da planta (com pontos), PDFs e arquivos 3D
const PL_3D = ['glb', 'gltf', 'obj', 'stl', 'fbx', '3ds', 'dae', 'skp', 'ifc', 'rvt', 'step', 'stp', '3dm', 'blend'];
const PL_VIEW = ['glb', 'gltf'];   // formatos que o navegador mostra (visualizador 3D); os demais podem ser baixados
const plExt = n => (String(n).split('.').pop() || '').toLowerCase();
const plKind = x => x.type === 'application/pdf' || plExt(x.name) === 'pdf' ? 'pdf' : null;   // 3D novo só em Construção › Estrutura (3D antigos continuam visíveis)
const plKind2 = x => /^image\//.test(x.type) ? 'image' : /^video\//.test(x.type) ? 'video' : plKind(x);
const plSize = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const plFormBody = (row, pre) => { const v = row || pre || {}; return `<label>Título<input name="title" value="${esc(v.title || '')}" required></label>` +
  `<label>Descrição (opcional)<textarea name="description" rows="3">${esc(v.description || '')}</textarea></label>` +
  (row ? `<div class="field"><span class="lbl">Arquivos atuais</span><ul class="curfiles">${(row.files || []).map((x, i) => `<li><span class="fname">${esc(mediaItemLabel(x))}</span><label class="chk"><input type="checkbox" name="rm_files" value="${i}"> remover</label></li>`).join('') || '<li class="mute">Nenhum arquivo.</li>'}</ul></div>` : '') +
  `<label>${row ? 'Adicionar mais arquivos' : 'Arquivos'} (PDFs, imagens e vídeos; pode escolher vários)<input name="files" type="file" accept="application/pdf,.pdf,image/*,video/*" multiple></label>` +
  `<p class="mute">PDF até 25 MB, imagens até 10 MB e vídeos até 100 MB.</p>`; };
function openPlEdit(row) { modal('Editar planta técnica', `<p class="mute">Residência: <b>${esc(resName(row.residence_id))}</b></p>` + plFormBody(row), `data-form="edit:pl" data-id="${row.id}" data-rid="${row.residence_id}"`, 'Salvar alterações'); }
async function savePl(f, o, op) {
  const picked = [...f.elements.files.files], store = sb.storage.from('documents'), row = op === 'edit' ? S.curPlan : null;
  for (const x of picked) { const t = plKind2(x); if (!t) return { error: { message: `"${x.name}" não é PDF, imagem nem vídeo.` } }; const mx = t === 'video' ? 100 : t === 'pdf' ? 25 : 10; if (x.size > mx * 1048576) return { error: { message: `"${x.name}" é maior que ${mx} MB.` } }; if ((t === 'image' || t === 'video') && !CLOUD_OK) return { error: { message: 'Imagens e vídeos precisam do Cloudinary configurado.' } }; }
  const rid = op === 'add' ? o.residence_id : row.residence_id, rm = [...f.querySelectorAll('[name=rm_files]:checked')].map(i => +i.value), old = (row && row.files) || [];
  const keep = old.filter((x, i) => !rm.includes(i)); if (!f.dataset.iscopy && !picked.length && !(row && row.path) && !keep.length) return { error: { message: 'Envie ao menos um arquivo (PDF, imagem ou vídeo).' } };
  const up = [], safe = n => n.replace(/[^\w.-]/g, '_'), sent = [], res = S.res.find(x => x.id === rid), folder = 'astell-home/' + String(res ? res.code : 'sem-codigo').replace(/[^\w-]/g, '_') + '/plantas';
  const undo = () => sent.length ? store.remove(sent) : null;
  try {
    for (let i = 0; i < picked.length; i++) {
      const x = picked[i], t = plKind2(x); toast(`Enviando arquivo ${i + 1} de ${picked.length}…`);
      if (t === 'pdf' || t === '3d') { const path = `${rid}/plantas/${Date.now()}_${i}_${safe(x.name)}`, r = await store.upload(path, x, { contentType: t === 'pdf' ? 'application/pdf' : plExt(x.name) === 'glb' ? 'model/gltf-binary' : 'application/octet-stream' }); if (r.error) throw r.error; sent.push(path); up.push({ path, type: t, name: x.name, size: x.size }); }
      else { const j = await cldPost(x, folder); up.push({ url: j.secure_url, type: t, name: x.name, size: x.size, public_id: j.public_id }); }
    }
  } catch (e) { await undo(); return { error: e }; }
  const desc = (o.description || '').trim() || null;
  if (op === 'add') { const r = await sb.from('floorplans').insert({ residence_id: rid, title: o.title, description: desc, path: null, files: up }); if (r.error) await undo(); return r; }
  const r = await sb.from('floorplans').update({ title: o.title, description: desc, files: [...keep, ...up] }).eq('id', row.id);
  if (r.error) await undo(); else { const gone = old.filter((x, i) => rm.includes(i)).map(x => x.path).filter(Boolean); if (gone.length) await store.remove(gone); }
  return r;
}
const MV_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
function loadMV() { if (window.__mvLoading) return; window.__mvLoading = true; const sc = document.createElement('script'); sc.type = 'module'; sc.src = MV_SRC; sc.onerror = () => document.querySelectorAll('.mvfail').forEach(e => { e.hidden = false; }); document.head.appendChild(sc); }
const plFileBlock = (x, url) => {
  const view3d = x.type === '3d' && PL_VIEW.includes(plExt(x.name));
  const head = `<div class="pfhead"><b>${x.type === 'pdf' ? 'PDF' : '3D'} · ${esc(x.name)}</b><span class="mute">${plSize(x.size || 0)}</span></div>`;
  const btns = acts(x.type === 'pdf' ? `<button type="button" class="link" data-open="${esc(x.path)}">Abrir em outra aba</button>` : '', `<button type="button" class="link" data-dl="${esc(x.path)}|${esc(x.name)}">Baixar</button>`);
  const body = x.type === 'pdf' ? (url ? `<details class="pdfview"><summary>Visualizar aqui</summary><iframe title="${esc(x.name)}" src="${esc(url)}" loading="lazy"></iframe></details>` : '')
    : view3d ? (url ? `<div class="mvbox"><model-viewer src="${esc(url)}" alt="${esc(x.name)}" camera-controls touch-action="pan-y" shadow-intensity="1" auto-rotate></model-viewer><p class="notice mvfail" hidden>Não foi possível abrir o visualizador 3D. Use “Baixar”.</p></div>` : '')
    : `<p class="mute">Este formato (${esc(plExt(x.name).toUpperCase())}) não abre no navegador. Use “Baixar” e abra no programa próprio.</p>`;
  return `<div class="card pfile">${head}${body}${btns}</div>`;
};
async function limparImagensPlantas() {   // remove de vez as imagens principais antigas (e os pontos marcados nelas)
  if (S.plClean) return; S.plClean = true;
  const { data } = await sb.from('floorplans').select('id,path').not('path', 'is', null); if (!data || !data.length) return;
  const paths = [];
  for (const p of data) { await sb.from('plan_points').delete().eq('floorplan_id', p.id); const r = await sb.from('floorplans').update({ path: null }).eq('id', p.id); if (!r.error) paths.push(p.path); }
  if (paths.length) await sb.storage.from('documents').remove(paths);
}
async function plantaDetail(id) {
  await loadOwners(); await limparImagensPlantas();
  const { data: fp } = await sb.from('floorplans').select('*').eq('id', id), cur = (fp || [])[0];
  const ptr = S.scope ? [['Painel', '#res'], ['Residências', '#res'], [resName(S.scope), '#res/' + S.scope], ['Plantas Técnicas', '#res/' + S.scope + '/pl']] : [['Painel', '#res'], ['Planta técnica', '#pl']];   // dentro da residência a trilha e o "voltar" continuam nela
  if (!cur) { view.innerHTML = crumbs([...ptr, ['Não encontrada']]) + '<p class="empty">Planta não encontrada.</p>'; return; }
  S.curPlan = cur;
  const files = cur.files || [], [{ data: u }, { data: pts }, ...urls] = await Promise.all([cur.path ? sb.storage.from('documents').createSignedUrl(cur.path, 3600) : Promise.resolve({ data: null }), cur.path ? sb.from('plan_points').select('*').eq('floorplan_id', id).order('created_at') : Promise.resolve({ data: [] }), ...files.map(x => x.path ? sb.storage.from('documents').createSignedUrl(x.path, 3600) : Promise.resolve({ data: null }))]);
  view.innerHTML = crumbs([...ptr, [cur.title]]) + `<div class="pagehead"><div><h2>${esc(cur.title)}</h2>${metaHtml(cur.residence_id)}${cur.description ? `<p class="mute">${esc(cur.description)}</p>` : ''}</div></div>` +
    acts(`<button class="link" data-pledit="${cur.id}">Editar</button>`, `<button class="link" data-copy="pl:${cur.id}">Copiar</button>`, `<button class="link danger" data-delplan="${cur.id}">Excluir esta planta</button>`) + emBtns('floorplans', cur) +
    (files.some(x => x.type === 'image' || x.type === 'video') ? `<h3>Imagens e vídeos</h3>${bldThumbs({ id: cur.id, media: files }, 'pm', true).replace(/data-bm="pm\|[^|]*\|/g, 'data-pm="')}` : '') +
    (files.some(x => x.type === 'pdf' || x.type === '3d') ? `<h3>Arquivos (PDF${files.some(x => x.type === '3d') ? ' e 3D' : ''})</h3>${files.map((x, i) => x.type === 'pdf' || x.type === '3d' ? plFileBlock(x, urls[i] && urls[i].data ? urls[i].data.signedUrl : '') : '').join('')}` : '') +
    '';
  if (files.some(x => x.type === '3d' && PL_VIEW.includes(plExt(x.name)))) { loadMV(); view.querySelectorAll('model-viewer').forEach(m => m.addEventListener('error', () => { const p = m.parentElement.querySelector('.mvfail'); if (p) p.hidden = false; })); }
}

// ---------- Documentos: seis pastas (cards). "Documentos gerais" é o que já existia; as outras cinco aceitam vários PDFs e imagens, com data
const DOC_FILE_MAX = 25;   // MB por arquivo
const DCATS = {
  geral: { l: 'Documentos gerais', i: 'doc' },
  pref: { l: 'Prefeitura', i: 'prefeitura', kind: 'prefeitura', f: [
    ['tipo', 'Tipo de documento', ['Alvará de construção', 'Habite-se', 'Alvará de reforma', 'Certidão de regularização', 'Averbação', 'Taxas e tributos', 'Licença ambiental', 'Outros']],
    ['processo', 'Nº do protocolo / processo'], ['orgao', 'Órgão ou setor emissor'], ['validade', 'Validade', 'date'],
    ['situacao', 'Situação', ['Em análise', 'Aprovado', 'Pendente de exigências', 'Indeferido', 'Arquivado']]] },
  banc: { l: 'Bancos', i: 'banco', kind: 'bancos', f: [
    ['instituicao', 'Banco / instituição financeira'],
    ['tipo', 'Tipo de documento', ['Contrato de financiamento', 'Avaliação do imóvel', 'Liberação / medição de parcela', 'Seguro', 'Certidão', 'Comprovante', 'Outros']],
    ['contrato', 'Nº do contrato'], ['valor', 'Valor (R$)'], ['vencimento', 'Vencimento / validade', 'date']] },
  cons: { l: 'Construtoras', i: 'capacete', kind: 'construtoras', f: [
    ['empresa', 'Construtora / empresa'], ['cnpj', 'CNPJ'],
    ['tipo', 'Tipo de documento', ['Contrato', 'ART / RRT', 'Orçamento', 'Medição', 'Cronograma', 'Diário de obra', 'Nota fiscal', 'Laudo', 'Outros']],
    ['responsavel', 'Responsável técnico'], ['numero', 'Nº do contrato / ART'], ['valor', 'Valor (R$)']] },
  plan: { l: 'Plantas Técnicas', i: 'regua', kind: 'plantas', f: [
    ['disciplina', 'Disciplina', ['Arquitetônica', 'Estrutural', 'Elétrica', 'Hidráulica', 'Sanitária', 'Gás', 'Climatização', 'Fundação', 'Cobertura', 'Outras']],
    ['prancha', 'Nº da prancha'], ['revisao', 'Revisão'], ['escala', 'Escala (ex.: 1:50)'], ['projetista', 'Projetista / responsável']] },
  arq: { l: 'Arquitetura', i: 'compasso', kind: 'arquitetura', f: [
    ['tipo', 'Tipo de documento', ['Projeto arquitetônico', 'Projeto legal', 'Projeto executivo', 'Memorial descritivo', 'Estudo preliminar', 'Detalhamento', 'Imagens 3D / maquete', 'Outros']],
    ['etapa', 'Etapa', ['Estudo preliminar', 'Anteprojeto', 'Projeto legal', 'Projeto executivo', 'Obra', 'Como construído']],
    ['escritorio', 'Escritório / arquiteto responsável'], ['registro', 'Nº do CAU / RRT'], ['versao', 'Versão / revisão']] },
};
const dcLabel = kind => (Object.values(DCATS).find(c => c.kind === kind) || { l: kind }).l;
const dcTrail = c => S.scope ? [['Painel', '#res'], ['Residências', '#res'], [resName(S.scope), '#res/' + S.scope], ['Documentos', '#res/' + S.scope + '/docs'], [c.l]] : [['Painel', '#res'], ['Documentos', '#docs'], [c.l]];
function docsHub() {   // seis cards (no menu geral e dentro da residência)
  const base = S.scope ? `#res/${S.scope}/docs` : '#docs';
  view.innerHTML = head('Documentos', null) + `<div class="modgrid">${Object.entries(DCATS).map(([k, c]) => `<a class="card rescard modcard" href="${base}/${k}">${ico(IC[c.i])}<b>${c.l}</b></a>`).join('')}</div>`;
}
function openDc(kind, row, cp) {   // cadastro (e edição, ou cópia) de um registro das cinco pastas
  const c = DCATS[kind], src = row || cp, ex = (src && src.extra) || {};
  const v = src ? { title: src.title, doc_date: src.doc_date, notes: src.notes, ...Object.fromEntries(Object.entries(ex).map(([k, x]) => ['x_' + k, x])) } : {};
  const fields = [['title', 'Título'], ['doc_date', 'Data', 'date', true], ...c.f.map(([k, l, t]) => ['x_' + k, l, t || 'text', false]), ['notes', 'Observações', 'textarea', false]];
  const atuais = row ? `<div class="field"><span class="lbl">Arquivos atuais</span><ul class="curfiles">${(row.files || []).map(x => `<li><span class="fname">${esc(x.name)}</span><label class="chk"><input type="checkbox" name="rm_files" value="${esc(x.path)}"> remover</label></li>`).join('') || '<li class="mute">Nenhum arquivo.</li>'}</ul></div>` : '';
  const arq = `<label>${row ? 'Adicionar mais arquivos' : 'Arquivos'} (PDF ou imagens${row ? '' : '; pode escolher vários'})<input name="files" type="file" accept="application/pdf,image/*" multiple ${row || cp ? '' : 'required'}></label><p class="mute">PDF e imagens, até ${DOC_FILE_MAX} MB cada.</p>`;
  modal((row ? 'Editar — ' : cp ? 'Copiar — ' : 'Adicionar — ') + c.l, (cp ? copyNote(cp.title) : '') + (row ? `<p class="mute">Residência: <b>${esc(resName(row.residence_id))}</b></p>` : resField()) + fields.map(f => fld(f, v)).join('') + atuais + arq,
    `data-form="${row ? 'edit' : 'add'}:dc" data-kind="${kind}"${row ? ` data-id="${row.id}" data-rid="${row.residence_id}"` : ''}`, row ? 'Salvar alterações' : cp ? 'Salvar cópia' : 'Salvar');
  if (cp) pickCopyRes(cp.residence_id);
}
async function dcList(key) {
  const c = DCATS[key]; await loadOwners();
  const { data, error } = await scoped(sb.from('doc_records').select('*').eq('kind', c.kind)).order('doc_date', { ascending: false });
  if (error) { view.innerHTML = head(c.l, null, dcTrail(c)) + '<p class="empty">Rode o schema_v9.sql no Supabase para habilitar esta pasta.</p>'; return; }
  S.rows.doc_records = data;
  setItems({ mlist: data.map(d => {
    const e = d.extra || {}, lines = c.f.filter(([k]) => e[k]).map(([k, l, t]) => `<span class="mute meta">${l}: ${esc(t === 'date' ? fmt(e[k]) : e[k])}</span>`).join('');
    const files = (d.files || []).map(x => `<button type="button" class="link filelink" data-open="${esc(x.path)}" title="Abrir">${x.type === 'application/pdf' ? 'PDF' : 'Imagem'} · ${esc(x.name)}</button>`).join('');
    return { hay: hayOf(d.residence_id, d.title, ...Object.values(e)), html: `<div class="card"><b>${esc(d.title)}</b>${metaHtml(d.residence_id)}<span class="mute meta">Data: ${fmt(d.doc_date)}</span>${lines}${d.notes ? `<p class="mute">${esc(d.notes)}</p>` : ''}${acts(`<button class="link" data-edit="dc:${d.id}">Editar</button>`, `<button class="link" data-copy="dc:${d.id}">Copiar</button>`, `<button class="link danger" data-deldc="${d.id}">Excluir</button>`)}${emBtns('doc_records', d)}</div>` };
  }) }, { mlist: `Nada cadastrado em ${c.l}. Toque em + para adicionar.` });
  view.innerHTML = head(c.l, 'dc:' + key, dcTrail(c)) + SHELL; paintItems();
}
async function saveDc(f, o, op) {   // envia os arquivos ao Storage e grava o registro; devolve { error } se algo falhar
  const kind = f.dataset.kind, c = DCATS[kind], picked = [...f.files.files], store = sb.storage.from('documents');
  for (const x of picked) {
    if (!(x.type === 'application/pdf' || /^image\//.test(x.type))) return { error: { message: `"${x.name}" não é PDF nem imagem.` } };
    if (x.size > DOC_FILE_MAX * 1048576) return { error: { message: `"${x.name}" é maior que ${DOC_FILE_MAX} MB.` } };
  }
  const rid = op === 'add' ? o.residence_id : f.dataset.rid, extra = {};
  c.f.forEach(([k]) => { if (o['x_' + k]) extra[k] = o['x_' + k]; });
  const base = { title: o.title, doc_date: o.doc_date, notes: o.notes || null, extra };
  const up = [], undo = () => up.length ? store.remove(up.map(x => x.path)) : null;
  try {
    for (let i = 0; i < picked.length; i++) {
      const x = picked[i], path = `${rid}/${c.kind}/${Date.now()}_${i}_${x.name.replace(/[^\w.-]/g, '_')}`;
      const r = await store.upload(path, x, { contentType: x.type }); if (r.error) throw r.error;
      up.push({ path, name: x.name, type: x.type, size: x.size });
    }
  } catch (e) { await undo(); return { error: e }; }
  if (op === 'add') { const r = await sb.from('doc_records').insert({ residence_id: rid, kind: c.kind, ...base, files: up }); if (r.error) await undo(); return r; }
  const row = (S.rows.doc_records || []).find(x => x.id === f.dataset.id) || { files: [] };
  const rm = [...f.querySelectorAll('[name=rm_files]:checked')].map(i => i.value), keep = (row.files || []).filter(x => !rm.includes(x.path));
  if (!keep.length && !up.length) return { error: { message: 'O registro precisa ter ao menos um arquivo.' } };
  const r = await sb.from('doc_records').update({ ...base, files: [...keep, ...up] }).eq('id', f.dataset.id);
  if (r.error) await undo(); else if (rm.length) await store.remove(rm);
  return r;
}
async function docsGeral() {   // a lista que já existia
  await loadOwners();
  const { data } = await scoped(sb.from('documents').select('*')).order('created_at', { ascending: false }); S.rows.documents = data || [];
  setItems({ mlist: (data || []).map(d => ({ hay: hayOf(d.residence_id, d.title), html: `<div class="card"><b>${esc(d.title)}</b>${metaHtml(d.residence_id)}<span class="mute">${esc(d.category)} · v${esc(d.version || '1')} · ${fmt(d.created_at)}</span><p>${esc(d.description)}</p>${hid(d)}${acts(`<button class="link" data-open="${esc(d.path)}">Abrir</button>`, `<button class="link" data-edit="documents:${d.id}">Editar</button>`, `<button class="link" data-copy="documents:${d.id}">Copiar</button>`, visBtn('documents', d), `<button class="link danger" data-deldoc="${d.id}|${esc(d.path)}">Excluir</button>`)}</div>` })) });
  view.innerHTML = head(DCATS.geral.l, 'docs', dcTrail(DCATS.geral)) + SHELL; paintItems();
}

// ---------- Logo (guardada no Cloudinary; o endereço fica em app_settings)
async function loadLogo() {
  try { const { data } = await sb.from('app_settings').select('value').eq('key', 'logo_url').maybeSingle(); S.logo = data && data.value ? data.value : null; } catch (e) { S.logo = null; }
  applyLogo();
}
function applyLogo() {   // troca o texto ASTELL pela logo, mantendo a legenda embaixo
  document.querySelectorAll('.logo').forEach(el => {
    if (el.dataset.orig === undefined) el.dataset.orig = el.innerHTML;
    const sp = (/<span[\s\S]*<\/span>/.exec(el.dataset.orig) || [''])[0];
    el.innerHTML = S.logo ? `<img class="logoimg" src="${esc(cld(S.logo, 360))}" alt="Astell">${sp}` : el.dataset.orig;
  });
}
async function cldPost(file, folder) {
  const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', CLD_PRESET); fd.append('folder', folder);
  const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLD_NAME}/auto/upload`, { method: 'POST', body: fd });
  const j = await resp.json(); if (!resp.ok) throw new Error((j.error && j.error.message) || 'erro no envio'); return j;
}
async function logoPage() {
  view.innerHTML = head('Logo', null) + `<div class="card logocard"><span class="lbl">Logo atual</span><div class="logoprev">${S.logo ? `<img src="${esc(cld(S.logo, 700))}" alt="Logo atual">` : '<span class="mute">Nenhuma logo cadastrada. O sistema mostra o texto ASTELL.</span>'}</div>` +
    (CLOUD_OK ? '<form data-form="logo"><label>Enviar nova logo (PNG, JPG, SVG ou WEBP, até 5 MB)<input name="file" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" required></label><button>Salvar logo</button></form>' : cloudMissing()) +
    (S.logo ? acts('<button type="button" class="link danger" data-logodel>Remover logo</button>') : '') +
    '<p class="notice">A logo aparece no topo e no menu do painel, no topo do aplicativo do cliente e nos relatórios impressos. Prefira uma imagem com fundo transparente e letras claras, porque o fundo do sistema é escuro. O arquivo antigo continua guardado no Cloudinary.</p></div>';
}

// ---------- Backup (dados em JSON e, opcionalmente, os documentos do Storage dentro de um ZIP)
const BK_TABLES = ['residences', 'client_cpfs', 'cpf_residences', 'documents', 'doc_records', 'warranties', 'maintenance_tasks', 'equipment', 'building_items', 'floorplans', 'plan_points', 'images', 'service_requests', 'history_events', 'contacts', 'qr_codes', 'app_settings'];
const BK_NOORDER = ['cpf_residences', 'app_settings'];
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipBlob(entries) {   // ZIP simples (sem compressão), nomes em UTF-8; entries = [{ name, data: Uint8Array }]
  const enc = new TextEncoder(), parts = [], cd = [], n = new Date();
  const dt = (((n.getFullYear() - 1980) << 9) | ((n.getMonth() + 1) << 5) | n.getDate()) & 0xFFFF, tm = ((n.getHours() << 11) | (n.getMinutes() << 5) | (n.getSeconds() >> 1)) & 0xFFFF;
  let off = 0, cdLen = 0;
  for (const e of entries) {
    const nm = enc.encode(e.name), crc = crc32(e.data), sz = e.data.length;
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, crc, true); h.setUint32(18, sz, true); h.setUint32(22, sz, true); h.setUint16(26, nm.length, true);
    parts.push(h.buffer, nm, e.data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true); c.setUint32(16, crc, true); c.setUint32(20, sz, true); c.setUint32(24, sz, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    cd.push(c.buffer, nm); off += 30 + nm.length + sz; cdLen += 46 + nm.length;
  }
  const end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, cdLen, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...cd, end.buffer], { type: 'application/zip' });
}
function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
const todayStr = () => { const n = new Date(); return isoOf(n.getFullYear(), n.getMonth(), n.getDate()); };
async function bkData(withHash, say) {
  const out = {}, missing = [];
  for (const t of BK_TABLES) {
    say(`Lendo os dados: ${t}…`); const rows = [];
    for (let a = 0; ; a += 1000) {
      let q = sb.from(t).select('*'); if (!BK_NOORDER.includes(t)) q = q.order('id');
      const { data, error } = await q.range(a, a + 999);
      if (error) { missing.push(t); break; } rows.push(...data); if (data.length < 1000) break;
    }
    out[t] = rows;
  }
  if (!withHash) (out.client_cpfs || []).forEach(r => { delete r.cpf_hash; });
  return { meta: { sistema: 'Astell Home', gerado_em: new Date().toISOString(), formato: 1, cpf_hash_incluido: !!withHash, tabelas_nao_encontradas: missing }, ...out };
}
const bkPaths = d => [...new Set([...(d.documents || []).map(x => x.path), ...(d.floorplans || []).map(x => x.path), ...(d.floorplans || []).flatMap(x => (x.files || []).map(f => f.path)), ...(d.doc_records || []).flatMap(x => (x.files || []).map(f => f.path)), ...['maintenance_tasks', 'building_items', 'equipment'].flatMap(t => (d[t] || []).flatMap(r => (r.media || []).map(m => m.path)))].filter(Boolean))];
async function runBackup(full, withHash) {
  const msg = $('#bkmsg'), say = t => { msg.textContent = t; }, btns = document.querySelectorAll('[data-bk]'); btns.forEach(b => b.disabled = true);
  try {
    const data = await bkData(withHash, say), json = JSON.stringify(data, null, 1), stamp = todayStr();
    if (!full) saveBlob(new Blob([json], { type: 'application/json' }), `astell-backup-dados-${stamp}.json`);
    else {
      const paths = bkPaths(data), entries = [], falhas = [], enc = new TextEncoder();
      for (let i = 0; i < paths.length; i++) {
        say(`Baixando documentos: ${i + 1} de ${paths.length}…`);
        const { data: blob, error } = await sb.storage.from('documents').download(paths[i]);
        if (error || !blob) { falhas.push(paths[i]); continue; }
        entries.push({ name: 'arquivos/' + paths[i], data: new Uint8Array(await blob.arrayBuffer()) });
      }
      const leia = `ASTELL HOME — BACKUP DE ${stamp}\n\ndados.json: todas as tabelas do sistema.\narquivos/: os documentos guardados no Supabase Storage (PDFs e imagens), com o mesmo caminho gravado nos dados.\nAs imagens e vídeos das residências ficam no Cloudinary: os endereços estão na tabela "images" do dados.json.\n${withHash ? '\nATENÇÃO: este backup contém o identificador protegido dos CPFs. Guarde em local seguro.\n' : '\nOs identificadores protegidos dos CPFs não foram incluídos.\n'}${falhas.length ? '\nArquivos que não puderam ser baixados:\n' + falhas.join('\n') + '\n' : ''}`;
      say('Montando o arquivo ZIP…');
      saveBlob(zipBlob([{ name: 'LEIAME.txt', data: enc.encode(leia) }, { name: 'dados.json', data: enc.encode(json) }, ...entries]), `astell-backup-completo-${stamp}.zip`);
      if (falhas.length) toast(`${falhas.length} arquivo(s) não puderam ser baixados. Veja o LEIAME.txt.`, 1);
    }
    try { localStorage.setItem('astell_last_backup', new Date().toISOString()); } catch (e) { /* ok */ }
    say('Backup gerado. Confira o arquivo baixado.'); toast('Backup gerado.');
    const last = $('#bklast'); if (last) last.textContent = 'Último backup neste navegador: ' + new Date().toLocaleString('pt-BR');
  } catch (e) { say(''); toast('Não foi possível gerar o backup: ' + (e.message || e), 1); }
  btns.forEach(b => b.disabled = false);
}
function backupPage() {
  let last = ''; try { const v = localStorage.getItem('astell_last_backup'); if (v) last = 'Último backup neste navegador: ' + new Date(v).toLocaleString('pt-BR'); } catch (e) { /* ok */ }
  view.innerHTML = head('Backup', null) + `<div class="card"><b>Cópia de segurança</b><p class="mute">Baixa uma cópia de tudo o que está cadastrado: residências, proprietários, documentos, equipamentos, garantias, manutenções, construção, plantas, assistências e configurações.</p>
    <label class="chk"><input type="checkbox" id="bkhash"> Incluir o identificador protegido dos CPFs</label><p class="mute">Necessário para restaurar o acesso dos proprietários. Com ele marcado, o arquivo passa a conter dados sensíveis.</p>
    <div class="acts bkbtns"><button type="button" class="up" data-bk="full">Backup completo (dados + documentos)</button><button type="button" class="ghost2" data-bk="json">Só os dados (JSON)</button></div>
    <p class="mute" id="bkmsg" role="status"></p><p class="mute" id="bklast">${esc(last)}</p></div>
    <p class="notice">O backup completo é um arquivo ZIP com o dados.json e os PDFs e imagens guardados no Supabase. As imagens e os vídeos das residências ficam no Cloudinary, e os endereços deles vão no dados.json. Quanto mais documentos, mais tempo e memória o navegador usa; se ficar pesado, baixe só os dados. Guarde o arquivo em local seguro e faça isso com frequência.</p>`;
}

// ---------- Relatórios (na tela, imprimir/PDF e CSV)
const REPS = {
  res: { l: 'Resumo por residência', date: null },
  gar: { l: 'Garantias', date: 'a data de início da garantia' },
  man: { l: 'Inspeções Preventivas', date: 'a próxima data da inspeção' },
  eq: { l: 'Equipamentos', date: null },
  doc: { l: 'Documentos (todas as pastas)', date: 'a data do documento' },
  ast: { l: 'Assistência técnica', date: 'a data de abertura' },
};
const resFilter = () => '<div class="field combo" data-combo="res"><span class="lbl">Residência (opcional)</span><div class="comboin"><input class="comboq" type="search" placeholder="Todas. Digite para escolher uma" autocomplete="off" role="combobox" aria-expanded="false" aria-label="Pesquisar residência"><input type="hidden" name="residence_id"><ul class="combolist" role="listbox" hidden></ul></div></div>';
const repNote = t => REPS[t].date ? `O período filtra por ${REPS[t].date}. Deixe em branco para incluir tudo.` : 'Este relatório não usa período.';
function reportsPage() {
  const f = S.repf || {};
  view.innerHTML = head('Relatórios', null) + `<form class="card repform" data-form="rep"><label>Tipo de relatório<select name="type">${Object.entries(REPS).map(([k, r]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${r.l}</option>`).join('')}</select></label>${resFilter()}<div class="twocol">${dateField('from', 'De', f.from || '')}${dateField('to', 'Até', f.to || '')}</div><p class="mute" id="repnote">${repNote(f.type || 'res')}</p><button>Gerar relatório</button></form><div id="repout"></div>`;
  if (S.rep) repShow();
}
async function repFetch(table, rids, dateCol, from, to) {
  const out = [];
  for (let a = 0; ; a += 1000) {
    let q = sb.from(table).select('*'); if (rids.length) q = q.in('residence_id', rids);
    if (dateCol && from) q = q.gte(dateCol, from); if (dateCol && to) q = q.lte(dateCol, to + (dateCol === 'created_at' ? 'T23:59:59' : ''));
    const { data, error } = await q.order('created_at', { ascending: false }).range(a, a + 999);
    if (error) throw error; out.push(...data); if (data.length < 1000) break;
  }
  return out;
}
async function repBuild(type, rids, from, to) {
  const rn = id => resName(id), own = id => (S.ownersByRes[id] || []).map(o => o.name).join(', ') || '—', br = d => d ? fmt(d) : '—', v = x => x == null || x === '' ? '—' : x;
  const byRes = (a, b) => rn(a.residence_id).localeCompare(rn(b.residence_id), 'pt-BR'), hoje = new Date(), aberta = m => !['Concluída', 'Cancelada'].includes(m.status || 'Pendente');
  if (type === 'res') {
    const rs = S.res.filter(r => !rids.length || rids.includes(r.id)).sort(byName);
    const [dg, dr, eq, ga, ma, as] = await Promise.all(['documents', 'doc_records', 'equipment', 'warranties', 'maintenance_tasks', 'service_requests'].map(t => repFetch(t, rids).catch(() => [])));
    const n = (arr, id, fn = () => true) => arr.filter(x => x.residence_id === id && fn(x)).length;
    return { cols: ['Residência', 'Código', 'Proprietários', 'Documentos', 'Equipamentos', 'Garantias em vigor', 'Inspeções pendentes', 'Inspeções atrasadas', 'Assistências abertas'],
      rows: rs.map(r => [r.name, r.code, own(r.id), n(dg, r.id) + n(dr, r.id), n(eq, r.id), n(ga, r.id, w => wState(w)[0] !== 'Expirada'), n(ma, r.id, aberta), n(ma, r.id, m => aberta(m) && m.next_due && new Date(m.next_due + 'T00:00') < hoje), n(as, r.id, s => !['Concluída', 'Encerrada'].includes(s.status))]) };
  }
  if (type === 'gar') return { group: 5, cols: ['Residência', 'Sistema', 'Cobertura', 'Início', 'Término', 'Situação'], rows: (await repFetch('warranties', rids, 'start_date', from, to)).sort(byRes).map(w => { const [s, , end] = wState(w); return [rn(w.residence_id), v(w.system), v(w.coverage), br(w.start_date), isNaN(end) ? '—' : end.toLocaleDateString('pt-BR'), s]; }) };
  if (type === 'man') return { group: 5, cols: ['Residência', 'Tarefa', 'Sistema', 'Última execução', 'Próxima data', 'Situação'], rows: (await repFetch('maintenance_tasks', rids, 'next_due', from, to)).sort(byRes).map(m => [rn(m.residence_id), v(m.name), v(m.system), br(m.last_done), br(m.next_due), aberta(m) && m.next_due && new Date(m.next_due + 'T00:00') < hoje ? 'Atrasada' : (m.status || 'Pendente')]) };
  if (type === 'eq') return { group: 2, cols: ['Residência', 'Equipamento', 'Categoria', 'Fabricante', 'Modelo', 'Nº de série', 'Localização', 'Garantia (meses)', 'Fornecedor / loja'], rows: (await repFetch('equipment', rids)).sort(byRes).map(e => [rn(e.residence_id), v(e.name), v(e.category), v(e.maker), v(e.model), v(e.serial), v(e.location), v(e.warranty_months), v(e.supplier)]) };
  if (type === 'ast') return { group: 3, cols: ['Residência', 'Protocolo', 'Categoria', 'Situação', 'Urgência', 'Abertura'], rows: (await repFetch('service_requests', rids, 'created_at', from, to)).sort(byRes).map(a => [rn(a.residence_id), v(a.protocol), v(a.category), v(a.status), v(a.urgency), br(a.created_at)]) };
  const [dg, dr] = await Promise.all([repFetch('documents', rids, 'created_at', from, to), repFetch('doc_records', rids, 'doc_date', from, to).catch(() => [])]);
  return { group: 1, cols: ['Residência', 'Pasta', 'Título', 'Data', 'Arquivos'], rows: [...dg.map(d => ({ r: d.residence_id, row: [rn(d.residence_id), DCATS.geral.l, v(d.title), br(d.created_at), 1] })), ...dr.map(d => ({ r: d.residence_id, row: [rn(d.residence_id), dcLabel(d.kind), v(d.title), br(d.doc_date), (d.files || []).length] }))].sort((a, b) => rn(a.r).localeCompare(rn(b.r), 'pt-BR')).map(x => x.row) };
}
function repSummary(R) {
  if (R.group == null || !R.rows.length) return '';
  const c = {}; R.rows.forEach(r => { c[r[R.group]] = (c[r[R.group]] || 0) + 1; });
  return Object.entries(c).map(([k, n]) => `${k}: ${n}`).join(' · ');
}
const repTable = R => `<div class="tblwrap"><table class="rep"><thead><tr>${R.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${R.rows.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
function repShow() {
  const R = S.rep, out = $('#repout'); if (!out || !R) return;
  const sm = repSummary(R);
  out.innerHTML = `<div class="card repres"><b>${esc(R.title)}</b><span class="mute">${esc(R.scope)} · ${esc(R.period)} · gerado em ${esc(R.when)}</span><span class="mute">${R.rows.length} ${R.rows.length === 1 ? 'linha' : 'linhas'}${sm ? ' · ' + esc(sm) : ''}</span>` +
    (R.rows.length ? acts('<button type="button" class="link" data-reprint>Imprimir / salvar em PDF</button>', '<button type="button" class="link" data-repcsv>Baixar planilha (CSV)</button>') + repTable(R) : '<p class="empty">Nenhum registro encontrado com esses filtros.</p>') + '</div>';
}
async function runReport(f) {
  const o = clean(Object.fromEntries(new FormData(f))), box = f.querySelector('.combo'), txt = box.querySelector('.comboq').value.trim();
  S.repf = { type: o.type, from: o.from || '', to: o.to || '' };
  if (txt && !o.residence_id) return toast('Escolha a residência na lista ou apague o texto do campo.', 1);
  if (o.from && o.to && o.from > o.to) return toast('A data inicial é maior que a final.', 1);
  const out = $('#repout'); out.innerHTML = '<p class="mute">Gerando…</p>';
  try {
    await loadOwners();
    const R = await repBuild(o.type, o.residence_id ? [o.residence_id] : [], o.from, o.to);
    R.title = REPS[o.type].l; R.scope = o.residence_id ? resName(o.residence_id) : 'Todas as residências';
    R.period = REPS[o.type].date ? (o.from || o.to ? `${o.from ? 'de ' + brOf(o.from) : ''} ${o.to ? 'até ' + brOf(o.to) : ''}`.trim() : 'todo o período') : 'sem período'; R.when = new Date().toLocaleString('pt-BR');
    S.rep = R; repShow();
  } catch (e) { S.rep = null; out.innerHTML = '<p class="empty">Não foi possível gerar: ' + esc(e.message || '') + '</p>'; }
}
function repCsv() {
  const R = S.rep; if (!R) return;
  const cell = x => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"';
  const txt = '﻿' + [R.cols, ...R.rows].map(r => r.map(cell).join(';')).join('\r\n');
  saveBlob(new Blob([txt], { type: 'text/csv;charset=utf-8' }), `relatorio-${R.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${todayStr()}.csv`);
}
function repPrint() {   // abre uma página própria (clara, para papel) e chama a impressão
  const R = S.rep; if (!R) return;
  const w = window.open('', '_blank'); if (!w) return toast('O navegador bloqueou a janela. Permita pop-ups para este site e tente de novo.', 1);
  const sm = repSummary(R);
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(R.title)} — Astell</title><style>body{font:13px/1.4 "Segoe UI",Arial,sans-serif;color:#111;margin:24px}h1{font-size:20px;margin:6px 0 2px}p{margin:2px 0;color:#444}img{max-height:56px;max-width:240px;display:block;margin-bottom:6px}table{border-collapse:collapse;width:100%;margin-top:14px}th,td{border:1px solid #999;padding:5px 7px;text-align:left;vertical-align:top}th{background:#eee}tr{break-inside:avoid}thead{display:table-header-group}@page{margin:14mm}</style></head><body>${S.logo ? `<img src="${esc(cld(S.logo, 400))}" alt="Astell">` : '<b style="letter-spacing:.14em">ASTELL</b>'}<h1>${esc(R.title)}</h1><p>${esc(R.scope)} · ${esc(R.period)} · gerado em ${esc(R.when)}</p><p>${R.rows.length} ${R.rows.length === 1 ? 'linha' : 'linhas'}${sm ? ' · ' + esc(sm) : ''}</p>${repTable(R)}</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => { try { w.print(); } catch (e) { /* o usuário imprime manualmente */ } }, 500);
}

const PAGES = {
  async res() { if (S.arg) return S.sub ? resSection(S.arg, S.sub) : resDetail(S.arg); return resList(); },
  async own() {
    await loadOwners();
    setItems({ mlist: S.owners.map(c => {
      const rs = S.links.filter(l => l.cpf_id === c.id).map(l => S.res.find(r => r.id === l.residence_id)).filter(Boolean);
      return { hay: norm([c.name, ...rs.map(r => r.name + ' ' + r.code)].join(' ')), html: `<div class="card"><b>${esc(c.name)}</b><span class="mute meta">Residências: ${rs.map(r => esc(r.name)).join(', ') || '—'}</span><span class="mute meta">${esc(c.cpf_mask)} · ${c.claimed_by ? 'Acesso ativo' : 'Aguardando primeiro acesso'}${c.expected_email ? ' · ' + esc(c.expected_email) : ''}</span>${contactLine(c)}${acts(`<button class="link" data-oedit="${c.id}">Editar</button>`, c.claimed_by && `<button class="link danger" data-rel="${c.id}">Liberar CPF</button>`)}</div>` };
    }) });
    view.innerHTML = head('Proprietários', 'own') + SHELL + '<p class="notice">Uma residência pode ter vários proprietários, cada um com o seu CPF. Cada um cria a própria conta no app e informa o CPF para ver a casa. Se você cadastrar o e-mail do proprietário, só a conta com esse e-mail consegue usar o CPF.</p>';
    paintItems();
  },
  async docs() { if (!S.dcat) return docsHub(); return S.dcat === 'geral' ? docsGeral() : dcList(S.dcat); },
  async rep() { await loadOwners(); reportsPage(); },
  async logo() { logoPage(); },
  async bk() { backupPage(); },
  eq: () => listPage('equipment'), gar: () => listPage('warranties'), man: () => listPage('maintenance_tasks'), bld: () => S.cat ? listPage('building_items') : bldHub(),
  async ast() {
    await loadOwners(); S.stMode = ST_A;
    const { data } = await scoped(sb.from('service_requests').select('*')).order('created_at', { ascending: false }); S.rows.service_requests = data || [];
    setItems({ mlist: (data || []).map(r => ({ st: r.status, ur: UR[r.urgency] ? r.urgency : 'Média', hay: hayOf(r.residence_id, r.protocol, r.category, r.place, r.description), html: `<div class="card"><b>${esc(r.protocol)} — ${esc(r.category)}</b>${metaHtml(r.residence_id)}<div class="pickrow"><span class="pk"><span class="mute">Situação</span>${astStPick(r)}</span><span class="pk"><span class="mute">Urgência</span>${astUrPick(r)}</span></div><p class="mute meta">Local: ${esc(r.place || '—')}</p><div class="reqdesc"><span class="lbl">O que o cliente descreveu</span><p>${esc(r.description || '—')}</p></div><p class="mute">Contato: ${esc(r.contact_time || '—')} · aberta em ${fmt(r.created_at)}</p>
      <form class="statusform" data-form="ast" data-id="${r.id}" data-rid="${r.residence_id}"><label>Assistência que será feita (o cliente vê esta informação)<textarea name="staff_note" rows="5" placeholder="Descreva a assistência que será realizada, prazos e orientações.">${esc(r.staff_note || '')}</textarea></label><button>Salvar</button></form>${emBtns('service_requests', r)}</div>` })) }, { mlist: 'Nenhuma solicitação de assistência.' });
    view.innerHTML = head('Assistência técnica', null) + `<div class="stbar" id="stbar" role="group" aria-label="Filtrar por situação">${stBarInner()}</div><div class="stbar" id="urbar" role="group" aria-label="Filtrar por urgência">${urBarInner()}</div>` + SHELL; paintItems();
  },
  async pl() { if (S.arg) return plantaDetail(S.arg); return plantasList(); },
};
async function plantasList() {
  await loadOwners(); await limparImagensPlantas();
  const { data } = await scoped(sb.from('floorplans').select('*')).order('created_at', { ascending: false });
  setItems({ mlist: (data || []).map(p => ({ hay: hayOf(p.residence_id, p.title, p.description), html: `<a class="card rescard" href="${S.scope ? `#res/${S.scope}/pl/${p.id}` : `#pl/${p.id}`}"><b>${esc(p.title)}</b>${metaHtml(p.residence_id)}${p.description ? `<span class="mute meta">${esc(p.description)}</span>` : ''}<span class="mute meta">${[...[['pdf', 'PDF', 'PDFs'], ['image', 'imagem', 'imagens'], ['video', 'vídeo', 'vídeos'], ['3d', 'arquivo 3D', 'arquivos 3D']].map(([t, a, b]) => { const n = (p.files || []).filter(x => x.type === t).length; return n ? n + ' ' + (n === 1 ? a : b) : ''; })].filter(Boolean).join(' · ') || 'Sem arquivos'}</span></a>` })) }, { mlist: 'Nenhuma planta cadastrada. Toque em + para cadastrar.' });
  view.innerHTML = head('Planta técnica', 'pl') + SHELL.replace('id="mlist"', 'id="mlist" class="rescards"'); paintItems();
}

async function render() {
  if (!S.profile || S.profile.role !== 'admin') return;
  const [key, arg, sub, cat] = (location.hash.slice(1) || 'res').split('/'), m = MENU.find(x => x[0] === key) || MENU[0]; S.menu = m[0];
  S.arg = ['res', 'pl'].includes(S.menu) ? (arg || null) : null; S.sub = S.menu === 'res' && S.arg && SECTIONS[sub] ? sub : null; S.scope = null;
  S.cat = S.menu === 'bld' && BCATS[arg] ? arg : (S.sub === 'bld' && BCATS[cat] ? cat : null);   // tipo de construção aberto (est, mat ou sis)
  S.plan = S.sub === 'pl' && cat ? cat : null;   // planta aberta dentro da residência
  S.dcat = S.menu === 'docs' && DCATS[arg] ? arg : (S.sub === 'docs' && DCATS[cat] ? cat : null);   // pasta de documentos aberta
  view.classList.toggle('wide', !!S.arg);
  $('#searchbar').hidden = (S.menu === 'res' && !!S.arg) || (S.menu === 'bld' && !S.cat) || (S.menu === 'docs' && !S.dcat) || (S.menu === 'pl' && !!S.arg) || !!S.plan || ['rep', 'logo', 'bk'].includes(S.menu);   // residência já escolhida, ou tela só com cards: a pesquisa não é necessária
  const tela = S.menu + '|' + (S.sub || '') + '|' + (S.cat || '') + '|' + (S.dcat || '');   // pesquisa e página voltam ao início ao trocar de módulo ou de seção da residência
  if (S.lastMenu !== tela) { S.q = ''; $('#resSearch').value = ''; S.lastMenu = tela; S.pages = {}; S.stf = new Set(); S.urf = new Set(); }
  S.noun = null;   // cada módulo começa com a pesquisa vazia
  document.querySelectorAll('#drawer a[data-m]').forEach(a => a.classList.toggle('on', a.dataset.m === S.menu));
  S.items = null;
  try { await PAGES[S.menu](); } catch (e) { view.innerHTML = '<p class="empty">Não foi possível carregar esta tela. ' + esc(e.message || '') + '</p>'; }
}
async function loadRes(pick) {
  await reloadRes();
  S.cur = S.res.find(r => r.id === pick) || S.res.find(r => S.cur && r.id === S.cur.id) || S.res[0] || null; render();
}


// ---------- menu lateral
function buildDrawer() {
  $('#drawer').innerHTML = `<div class="dhead"><strong class="logo">ASTELL<span>PAINEL ADMINISTRATIVO</span></strong><button type="button" class="dclose" data-dclose aria-label="Fechar menu">×</button></div><div class="dnav">${MENU.map(([k, l, i]) => `<a href="#${k}" data-m="${k}">${ico(IC[i])}<span>${l}</span></a>`).join('')}</div><div class="dfoot"><a href="index.html">${ico(IC.casa)}<span>Ver app do cliente</span></a><button type="button" class="ghost" data-out>Sair</button></div>`;
}
function drawer(open) { $('#drawer').classList.toggle('open', open); document.body.classList.toggle('nav-open', open); $('#drawer').setAttribute('aria-hidden', !open); $('#menuBtn').setAttribute('aria-expanded', open); if (open) { const x = $('#drawer .dclose'); if (x) x.focus(); } }
$('#menuBtn').onclick = () => drawer(true);   // o menu só abre aqui; para fechar é preciso clicar no X
$('#resSearch').addEventListener('input', e => {   // filtra a lista do módulo aberto (residências, ou os cards de cada módulo)
  S.q = e.target.value; const parts = (location.hash.slice(1) || 'res').split('/');
  if (parts.length === 2 && ['res', 'pl'].includes(parts[0])) location.hash = '#' + parts[0]; else { S.pages = {}; paintItems(); }
});
addEventListener('hashchange', () => { S.place = false; render(); });
addEventListener('keydown', e => {
  if (!$('#lb').hidden) { if (e.key === 'Escape') lbClose(); else if (e.key === 'ArrowRight') lbMove(1); else if (e.key === 'ArrowLeft') lbMove(-1); return; }
  if (e.key === 'Escape') { if (!closeFloating()) { const em = !!document.querySelector('#modal .emsheet'); closeModal(); if (em) render(); } }
});

// ---------- acesso
function loginScreen() {
  $('#top').hidden = true; drawer(false);
  view.innerHTML = `<div class="login"><form id="lf"><h1>ASTELL<span>PAINEL ADMINISTRATIVO</span></h1><p class="tag">Acesso restrito à equipe Astell.</p><h2>Entrar</h2>
    <button type="button" class="btn-google" id="gg">${GOOGLE_SVG}<span>Entrar com o Google</span></button><div class="or"><span>ou</span></div>
    <label>E-mail<input id="em" type="email" required autocomplete="username"></label><label>Senha<input id="pw" type="password" required autocomplete="current-password"></label>
    <button class="btn-main">Entrar no painel</button><p class="fine"><a href="index.html" style="color:#9fb5c1">Ir para o aplicativo do cliente</a></p></form></div>`;
  $('#gg').onclick = async () => { if (location.protocol === 'file:') return toast('O login com Google não funciona com o arquivo aberto direto. Abra por um endereço http ou https.', 1); const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }); if (error) toast('Não foi possível entrar com o Google.', 1); };
  $('#lf').onsubmit = async e => { e.preventDefault(); const { error } = await sb.auth.signInWithPassword({ email: $('#em').value.trim(), password: $('#pw').value }); if (error) toast('E-mail ou senha incorretos.', 1); };
}
function deniedScreen() {
  $('#top').hidden = true; drawer(false);
  view.innerHTML = `<div class="login"><form><h1>ASTELL<span>PAINEL ADMINISTRATIVO</span></h1><h2 style="margin-top:28px">Acesso restrito</h2><p class="lead">Esta conta não tem permissão de administrador. Se você é cliente, use o aplicativo.</p><a href="index.html"><button type="button" class="btn-main">Ir para o aplicativo</button></a><button type="button" class="btn-text" data-out>Sair</button></form></div>`;
}
async function start(session) {
  if (!session) { S.profile = null; S.cur = null; return loginScreen(); }
  const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  S.profile = data;
  if (!data || data.role !== 'admin') return deniedScreen();
  $('#top').hidden = false; buildDrawer(); await loadLogo(); await loadRes();
}
sb.auth.getSession().then(({ data }) => start(data.session));
sb.auth.onAuthStateChange((ev, s) => {
  if (ev === 'SIGNED_IN' && S.profile && s && S.profile.id === s.user.id) return;
  if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setTimeout(() => start(s), 0);
});


// ---------- ações
document.addEventListener('click', async e => {
  if (e.target.id === 'modal') return closeModal();
  if (e.target.id === 'lb') { if ($('#lb').classList.contains('fresh')) return; return lbClose(); }   // logo após abrir, um segundo clique do duplo clique não fecha
  if (e.target.classList && e.target.classList.contains('comboq')) comboList(e.target.closest('.combo'));
  closeFloating(e.target);   // clique fora fecha calendário e listas de pesquisa
  const el = e.target.closest('[data-lbx],[data-lbn],[data-mi],[data-dclose],[data-cal],[data-calnav],[data-day],[data-caltoday],[data-calclear],[data-pg],[data-newres],[data-newown],[data-ownunlink],[data-ownedit],[data-oedit],[data-addopt],[data-reedit],[data-reunlink],[data-upl],[data-pickfiles],[data-unstage],[data-savefiles],[data-mtab],[data-selmode],[data-selid],[data-seldel],[data-mvis],[data-gal],[data-gvis],[data-gdel],[data-add],[data-edit],[data-vis],[data-del],[data-done],[data-open],[data-rel],[data-deldoc],[data-delplan],[data-close],[data-place],[data-plan],[data-pledit],[data-dl],[data-stopen],[data-stset],[data-stf],[data-urf],[data-copy],[data-em],[data-emup],[data-emtab],[data-emselmode],[data-emsid],[data-emdel],[data-emdd],[data-emvis],[data-emi],[data-bm],[data-v3d],[data-pm],[data-deldc],[data-reprint],[data-repcsv],[data-bk],[data-logodel],[data-out]');
  if (!el) return; const d = el.dataset, done = (err, ok) => { err ? toast(err, 1) : toast(ok); render(); };
  if (d.close !== undefined) { if (S.stack.length) popModal(null); else { hardClose(); await render(); } }
  // botão "Cadastrar" ao lado do select de residência: abre o cadastro por cima e, ao salvar, volta com a nova residência já selecionada
  if (d.newres !== undefined) { const box = el.closest('.combo'); pushModal(r => comboPick(box, r.id)); ADD.res(box.dataset.combo === 'resmulti'); }
  if (d.dclose !== undefined) drawer(false);
  if (d.lbx !== undefined) lbClose();
  if (d.lbn) lbMove(+d.lbn);
  if (d.mi && !S.sel.on) {
    const mx = (S.mediaRows || []).find(x => x.id === d.mi);
    if (mx && isVid(mx)) lbOpen(d.mi);   // vídeo: um clique já amplia (sem tocar sozinho)
    else { const t = Date.now(); if (S.lastMi === d.mi && t - S.lastMiT < 450) { S.lastMi = null; lbOpen(d.mi); } else { S.lastMi = d.mi; S.lastMiT = t; } }   // imagem: dois cliques seguidos (vale também no toque do celular)
  }
  if (d.cal !== undefined) { const box = el.closest('[data-date]'), pop = box.querySelector('.calpop'); if (pop.hidden) calOpen(box); else pop.hidden = true; }
  if (d.calnav) { const box = el.closest('[data-date]'), pop = box.querySelector('.calpop'), dt = new Date(+pop.dataset.y, +pop.dataset.m + +d.calnav, 1); calRender(box, dt.getFullYear(), dt.getMonth()); }
  if (d.day) { const box = el.closest('[data-date]'); calSet(box, d.day); box.querySelector('.calpop').hidden = true; }
  if (d.caltoday !== undefined) { const box = el.closest('[data-date]'), n = new Date(); calSet(box, isoOf(n.getFullYear(), n.getMonth(), n.getDate())); box.querySelector('.calpop').hidden = true; }
  if (d.calclear !== undefined) { const box = el.closest('[data-date]'); calSet(box, ''); box.querySelector('.calpop').hidden = true; }
  if (d.pg) { const [id, n] = d.pg.split(':'); S.pages[id] = +n; paintItems(); const t = $('#' + id); if (t) window.scrollTo({ top: Math.max(0, t.getBoundingClientRect().top + scrollY - 160), behavior: 'smooth' }); }
  // botão "Cadastrar" ao lado dos proprietários (dentro do cadastro de residência)
  if (d.newown !== undefined) { const box = el.closest('.ownpick'), hid = box.querySelector('[name=owner_ids]'); pushModal(o => { hid.value = [...(hid.value ? hid.value.split(',') : []), o.id].join(','); refreshOwnPick(box); }); openOwnerAdd(true); }
  if (d.ownunlink) { const box = el.closest('.ownpick'), h = box.querySelector('[name=owner_ids]'); h.value = h.value.split(',').filter(x => x && x !== d.ownunlink).join(','); refreshOwnPick(box); }
  if (d.ownedit) { const box = el.closest('.ownpick'); pushModal(() => refreshOwnPick(box)); openOwnerEdit(d.ownedit, { fromRes: true }); }
  if (d.gal) { const [, id] = d.gal.split(':'), t = S.rows.maintenance_tasks.find(x => x.id === id); S.gal = { kind: 'maintenance', refId: id, resId: t.residence_id, title: t.name }; gallery(); }
  if (d.stopen !== undefined) { const m = el.parentElement.querySelector('.stmenu'), abrir = m.hidden; closeFloating(); m.hidden = !abrir; el.setAttribute('aria-expanded', abrir); }
  if (d.urf) { if (S.urf.has(d.urf)) S.urf.delete(d.urf); else S.urf.add(d.urf); S.pages = {}; $('#urbar').innerHTML = urBarInner(); paintItems(); }
  if (d.stset) { const [tb, col, sid, sv] = d.stset.split('|'); const { error } = await sb.from(tb).update({ [col]: sv }).eq('id', sid);
    if (!error && tb === 'service_requests' && col === 'status') { const rr = (S.rows.service_requests || []).find(x => x.id === sid); if (rr) await sb.from('history_events').insert({ residence_id: rr.residence_id, category: 'Assistência', description: 'Solicitação atualizada: ' + sv }); }
    done(error && 'Não foi possível alterar.', (col === 'urgency' ? 'Urgência alterada para ' : 'Situação alterada para ') + sv + '.'); }
  if (d.stf) { if (d.stf === 'all') S.stf = new Set(); else { if (S.stMode === WST) S.stf = S.stf.has(d.stf) ? new Set() : new Set([d.stf]); else { if (S.stf.has(d.stf)) S.stf.delete(d.stf); else S.stf.add(d.stf); if (S.stf.size === Object.keys(stMap()).length) S.stf = new Set(); } } S.pages = {}; $('#stbar').innerHTML = stBarInner(); paintItems(); }
  if (d.v3d) { const [vp, vn, vs] = d.v3d.split('|'), { data: vu } = await sb.storage.from('documents').createSignedUrl(vp, 3600); $('#modal').innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Arquivo 3D"><div class="sheethead"><b>Arquivo 3D</b><button type="button" class="x" data-close aria-label="Fechar">×</button></div>${plFileBlock({ type: '3d', name: vn, path: vp, size: +vs }, vu ? vu.signedUrl : '')}</div>`; $('#modal').hidden = false; if (PL_VIEW.includes(plExt(vn))) { loadMV(); $('#modal').querySelectorAll('model-viewer').forEach(m => m.addEventListener('error', () => { const p = m.parentElement.querySelector('.mvfail'); if (p) p.hidden = false; })); } }
  if (d.pm) { const [pi] = d.pm.split('|'), cp = S.curPlan, vis = ((cp && cp.files) || []).map((x, j) => ({ x, j })).filter(o => o.x.type === 'image' || o.x.type === 'video'); lbOpenList(vis.map(({ x, j }) => ({ id: cp.id + j, url: x.url, media_type: x.type })), Math.max(0, vis.findIndex(o => o.j === +pi))); }
  if (d.bm) { const [bk, bid, bi] = d.bm.split('|'), row = (S.rows[bk] || []).find(x => x.id === bid); if (row) { const vis = (row.media || []).map((x, j) => ({ x, j })).filter(o => o.x.type === 'image' || o.x.type === 'video'); lbOpenList(vis.map(({ x, j }) => ({ id: bid + j, url: x.url, media_type: x.type === 'video' ? 'video' : 'image' })), Math.max(0, vis.findIndex(o => o.j === +bi))); } }
  if (d.upl) openUpload(d.upl.split(':')[1]);
  if (d.pickfiles !== undefined) $('#fileIn').click();
  if (d.unstage !== undefined) { S.up.files.splice(+d.unstage, 1); renderStage(); }
  if (d.savefiles !== undefined) saveStaged();
  if (d.mtab) { S.mTab = d.mtab; resetSel(); renderMedia(); }
  if (d.selmode !== undefined) { S.sel = { on: !S.sel.on, ids: new Set() }; renderMedia(); }
  if (d.selid) { const s = S.sel.ids; if (s.has(d.selid)) s.delete(d.selid); else s.add(d.selid); renderMedia(); }
  if (d.seldel !== undefined && S.sel.ids.size) {
    const ids = [...S.sel.ids];
    if (confirm(`Excluir ${ids.length} ${ids.length === 1 ? 'item selecionado' : 'itens selecionados'}? Eles deixam de aparecer no app. Os arquivos continuam guardados no Cloudinary.`)) {
      const { error } = await sb.from('images').delete().in('id', ids);
      if (error) toast('Não foi possível excluir.', 1); else toast(ids.length === 1 ? 'Item excluído.' : ids.length + ' itens excluídos.');
      resetSel(); await loadMedia(); renderMedia();
    }
  }
  if (d.mvis) { const x = S.mediaRows.find(i => i.id === d.mvis); const { error } = await sb.from('images').update({ visible: x.visible === false }).eq('id', x.id); if (error) toast('Não foi possível alterar.', 1); await loadMedia(); renderMedia(); }
  if (d.gvis) { const x = S.imgs.find(i => i.id === d.gvis); const { error } = await sb.from('images').update({ visible: x.visible === false }).eq('id', x.id); if (error) toast('Não foi possível alterar.', 1); await gallery(); }
  if (d.gdel && confirm('Excluir esta imagem do sistema? O arquivo continua guardado no Cloudinary.')) { const { error } = await sb.from('images').delete().eq('id', d.gdel); if (error) toast('Não foi possível excluir.', 1); else toast('Imagem excluída.'); await gallery(); }
  if (d.add) openAdd(d.add);
  if (d.em) { const [ek, eid, ev] = d.em.split(':'); await emOpen(ek, eid, ev); }
  if (d.emup) { const fi = $('#emFile'); if (fi) { const C = EM[S.em.k]; fi.dataset.kind = d.emup; fi.accept = d.emup === 'm' ? (C.vid ? 'image/*,video/*' : 'image/*') : '.pdf,application/pdf' + (S.em.k === 'building_items' && (emRow(S.em.k, S.em.id) || {}).category === 'Estrutura' ? accept3d() : ''); fi.click(); } }
  if (d.emtab) { S.em.tab = d.emtab; S.em.sel = { on: false, ids: new Set() }; emRender(); }
  if (d.emselmode !== undefined) { S.em.sel = { on: !S.em.sel.on, ids: new Set() }; emRender(); }
  if (d.emsid) { const q = S.em.sel.ids; if (q.has(d.emsid)) q.delete(d.emsid); else q.add(d.emsid); emRender(); }
  if (d.emdel !== undefined && S.em.sel.ids.size && confirm(`Excluir ${S.em.sel.ids.size} ${S.em.sel.ids.size === 1 ? 'item selecionado' : 'itens selecionados'}?`)) await emRemove([...S.em.sel.ids]);
  if (d.emdd !== undefined && confirm('Excluir este documento?')) await emRemove(['a' + d.emdd]);
  if (d.emvis) { const E = S.em, row = emRow(E.k, E.id), C = EM[E.k], vis = emSplit(E.k, row, E.imgs).m.find(x => x.key === d.emvis);
    if (vis) { if (vis.src === 'i') { const r = await sb.from('images').update({ visible: !vis.visible }).eq('id', vis.id); if (r.error) toast('Não foi possível alterar.', 1); } else { const arr = (row[C.arr] || []).map((x, i) => i === vis.idx ? { ...x, visible: vis.visible ? false : true } : x); const r = await emSave(arr); if (r.error) toast('Não foi possível alterar.', 1); } await emLoad(); emRender(); } }
  if (d.emi && !S.em.sel.on) { const E = S.em, row = emRow(E.k, E.id), m = emSplit(E.k, row, E.imgs).m; m.forEach(x => { if (x.path) x.url = E.urls[x.path]; }); const shown = { all: m, img: m.filter(x => x.type === 'image'), vid: m.filter(x => x.type === 'video') }[E.tab] || m, i = shown.findIndex(x => x.key === d.emi), x = shown[i];
    const abrir = () => lbOpenList(shown.map(y => ({ id: y.key, url: y.url, media_type: y.type })), i);
    if (x && x.type === 'video') abrir(); else if (x) { const t = Date.now(); if (S.lastEmi === d.emi && t - S.lastEmiT < 450) { S.lastEmi = null; abrir(); } else { S.lastEmi = d.emi; S.lastEmiT = t; } } }
  if (d.copy) { const [ck, ...cr] = d.copy.split(':'); openCopy(ck, cr.join(':')); }
  if (d.edit) { const [k, id] = d.edit.split(':'); openEdit(k, id); }
  if (d.vis) { const [k, id] = d.vis.split(':'), r = S.rows[k].find(x => x.id === id); const { error } = await sb.from(k).update({ visible: !r.visible }).eq('id', id); done(error && 'Não foi possível alterar.', r.visible ? 'Oculto do cliente.' : 'Visível ao cliente.'); }
  if (d.del && confirm('Excluir este registro?')) { const [k, id] = d.del.split(':'), old = ((S.rows[k] || []).find(x => x.id === id) || {}).media || []; const { error } = await sb.from(k).delete().eq('id', id); const pp = old.filter(x => x.path).map(x => x.path); if (!error && pp.length) await sb.storage.from('documents').remove(pp); done(error && 'Não foi possível excluir.', 'Registro excluído.'); }
  if (d.deldoc && confirm('Excluir este documento?')) { const [id, p] = d.deldoc.split('|'); await sb.storage.from('documents').remove([p]); const { error } = await sb.from('documents').delete().eq('id', id); done(error && 'Não foi possível excluir.', 'Documento excluído.'); }
  if (d.delplan && confirm('Excluir esta planta, os arquivos dela e todos os pontos marcados nela?')) { const cp = S.curPlan, paths = cp ? [cp.path, ...(cp.files || []).map(x => x.path)].filter(Boolean) : []; const { error } = await sb.from('floorplans').delete().eq('id', d.delplan); if (!error && paths.length) await sb.storage.from('documents').remove(paths); if (error) toast('Não foi possível excluir.', 1); else { toast('Planta excluída.'); location.hash = S.scope ? '#res/' + S.scope + '/pl' : '#pl'; } }
  if (d.pledit && S.curPlan) openPlEdit(S.curPlan);
  if (d.dl) { const [dp, dn] = d.dl.split('|'); const { data, error } = await sb.storage.from('documents').createSignedUrl(dp, 60, { download: dn }); if (error) toast('Não foi possível baixar.', 1); else { const a = document.createElement('a'); a.href = data.signedUrl; a.download = dn; document.body.appendChild(a); a.click(); a.remove(); } }
  if (d.open) { const { data, error } = await sb.storage.from('documents').createSignedUrl(d.open, 60); error ? toast('Não foi possível abrir.', 1) : window.open(data.signedUrl, '_blank', 'noopener'); }
  if (d.done) {
    const t = S.rows.maintenance_tasks.find(x => x.id === d.done), today = new Date().toISOString().slice(0, 10), nx = t.interval_months ? addMonths(today, +t.interval_months).toISOString().slice(0, 10) : null;
    const { error } = await sb.from('maintenance_tasks').update({ last_done: today, next_due: nx, status: nx ? 'Pendente' : 'Concluída' }).eq('id', t.id);
    if (!error) await sb.from('history_events').insert({ residence_id: t.residence_id, category: 'Manutenção', description: 'Manutenção executada: ' + t.name });
    done(error && 'Não foi possível registrar.', 'Execução registrada.');
  }
  if (d.oedit) openOwnerEdit(d.oedit);
  if (d.addopt) comboPick(el.closest('.combo'), d.addopt);
  if (d.reunlink) { const box = el.closest('.resmulti'), h = box.querySelector('[name=res_ids]'); h.value = h.value.split(',').filter(x => x && x !== d.reunlink).join(','); refreshResMulti(box); }
  if (d.reedit) { const box = el.closest('.resmulti'); pushModal(() => refreshResMulti(box)); openEdit('res', d.reedit, { fromOwner: true }); }
  if (d.rel && confirm('Liberar este CPF? O acesso atual do cliente será removido e outro cadastro poderá usá-lo.')) { const { error } = await sb.rpc('admin_release_cpf', { p_cpf: d.rel }); done(error && 'Não foi possível liberar.', 'CPF liberado.'); }
  if (d.place !== undefined) { S.place = !S.place; render(); }
  if (d.plan && S.place) { const b = el.getBoundingClientRect(); S.pend = { x: +((e.clientX - b.left) / b.width * 100).toFixed(2), y: +((e.clientY - b.top) / b.height * 100).toFixed(2) }; modal('Novo ponto na planta', fld(['category', 'Categoria', PT_CATS]) + '<label>Identificação<input name="label" required></label><label>Detalhes<textarea name="description" rows="3"></textarea></label>', 'data-form="add:pt"', 'Salvar ponto'); }
  if (d.deldc && confirm('Excluir este registro e os arquivos dele?')) {
    const row = (S.rows.doc_records || []).find(x => x.id === d.deldc), paths = row ? (row.files || []).map(x => x.path) : [];
    const { error } = await sb.from('doc_records').delete().eq('id', d.deldc); if (!error && paths.length) await sb.storage.from('documents').remove(paths);
    done(error && 'Não foi possível excluir.', 'Registro excluído.');
  }
  if (d.reprint !== undefined) repPrint();
  if (d.repcsv !== undefined) repCsv();
  if (d.bk) runBackup(d.bk === 'full', !!($('#bkhash') && $('#bkhash').checked));
  if (d.logodel !== undefined && confirm('Remover a logo? O sistema volta a mostrar o texto ASTELL.')) { const { error } = await sb.from('app_settings').delete().eq('key', 'logo_url'); if (error) toast('Não foi possível remover.', 1); else { S.logo = null; applyLogo(); toast('Logo removida.'); render(); } }
  if (d.out !== undefined) sb.auth.signOut();
});
document.addEventListener('change', e => {
  if (e.target.id === 'emFile') { const fl = [...e.target.files], kd = e.target.dataset.kind; e.target.value = ''; emUpload(fl, kd); return; }
  if (e.target.name === 'category' && e.target.form) { const mi = e.target.form.querySelector('input[name=media][data-d3]'); if (mi) { const on = e.target.value === mi.dataset.d3; mi.accept = mi.dataset.base + (on ? accept3d() : ''); const h = e.target.form.querySelector('[data-mhint]'); if (h) h.textContent = mediaHint('building_items', e.target.value); } }
  if (e.target.name === 'type' && e.target.closest && e.target.closest('.repform')) { const n = $('#repnote'); if (n) n.textContent = repNote(e.target.value); }
  if (e.target.id === 'fileIn') { stageFiles([...e.target.files]); e.target.value = ''; }
  if (e.target.matches && e.target.matches('[data-pp]')) { S.pp = +e.target.value; try { localStorage.setItem('astell_pp', S.pp); } catch (x) { /* ok */ } S.pages = {}; paintItems(); }
});
document.addEventListener('dragover', e => { if ($('#modal').hidden) return; e.preventDefault(); const z = $('#drop'); if (z) z.classList.toggle('over', !!(e.target.closest && e.target.closest('#drop'))); });
document.addEventListener('dragleave', e => { const z = $('#drop'); if (z && !e.relatedTarget) z.classList.remove('over'); });
document.addEventListener('drop', e => { if ($('#modal').hidden) return; e.preventDefault(); const z = $('#drop'); if (z) z.classList.remove('over'); if (e.target.closest && e.target.closest('#drop') && e.dataTransfer) stageFiles([...e.dataTransfer.files]); });
document.addEventListener('input', e => {
  const t = e.target; if (!t.classList) return;
  if (t.classList.contains('cpf')) t.value = cpfMask(t.value);
  if (t.classList.contains('tel')) t.value = telMask(t.value);
  if (t.classList.contains('datetxt')) {   // dd/mm/aaaa
    const box = t.closest('[data-date]'), d = t.value.replace(/\D/g, '').slice(0, 8);
    t.value = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    const iso = parseBr(t.value); box.querySelector('[type=hidden]').value = iso || ''; t.setCustomValidity(t.value && !iso ? 'Data inválida. Use dd/mm/aaaa.' : '');
    if (iso && !box.querySelector('.calpop').hidden) calRender(box, +iso.slice(0, 4), +iso.slice(5, 7) - 1);
  }
  if (t.classList.contains('comboq')) { const box = t.closest('.combo'); if (box.dataset.combo === 'res') { box.querySelector('[name=residence_id]').value = ''; if (t.required) t.setCustomValidity('Escolha uma residência da lista.'); } comboList(box); }
});
document.addEventListener('focusin', e => { if (e.target.classList && e.target.classList.contains('comboq')) comboList(e.target.closest('.combo')); });
document.addEventListener('mousedown', e => { const li = e.target.closest && e.target.closest('.combolist li[data-opt]'); if (!li) return; e.preventDefault(); const box = li.closest('.combo'); if (!['resmulti', 'own'].includes(box.dataset.combo)) comboPick(box, li.dataset.opt); });   // na lista de residências do proprietário só o botão Adicionar escolhe
document.addEventListener('keydown', e => {   // setas, Enter e Esc dentro da pesquisa de residência/proprietário
  const q = e.target.classList && e.target.classList.contains('comboq') ? e.target : null; if (!q) return;
  const box = q.closest('.combo'), ul = box.querySelector('.combolist'), lis = [...ul.querySelectorAll('li[data-opt]')]; let i = lis.findIndex(l => l.classList.contains('on'));
  if (e.key === 'Escape' && !ul.hidden) { e.preventDefault(); comboClose(box); e.stopPropagation(); return; }   // preventDefault: o Esc nativo do campo de busca apagaria o texto
  if (e.key === 'Enter') { e.preventDefault(); if (!ul.hidden && i >= 0) comboPick(box, lis[i].dataset.opt); return; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (ul.hidden) return comboList(box); if (!lis.length) return; if (i >= 0) lis[i].classList.remove('on'); i = (i + (e.key === 'ArrowDown' ? 1 : -1) + lis.length) % lis.length; lis[i].classList.add('on'); lis[i].scrollIntoView({ block: 'nearest' }); }
});

const ownerParams = (o, cpf) => ({ p_name: o.name, p_cpf: cpf, p_email: o.email || null, ...(o.phone ? { p_phone: o.phone } : {}), ...(o.whatsapp ? { p_whatsapp: o.whatsapp } : {}) });
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
document.addEventListener('submit', async e => {
  const f = e.target, id = f.dataset.form; if (!id) return; e.preventDefault();
  if (id === 'gal') return uploadImages(f);
  const o = clean(Object.fromEntries(new FormData(f))), [op, k] = id.split(':'), nested = S.stack.length > 0; let r;
  if (id === 'rep') return runReport(f);
  if (id === 'logo') {
    const file = f.file.files[0]; if (!file) return;
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) return toast('Envie PNG, JPG, SVG ou WEBP.', 1);
    if (file.size > 5 * 1048576) return toast('A logo deve ter até 5 MB.', 1);
    const b = f.querySelector('button'); b.disabled = true; toast('Enviando a logo…');
    try {
      const j = await cldPost(file, 'astell-home/logo');
      const { error } = await sb.from('app_settings').upsert({ key: 'logo_url', value: j.secure_url, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message + ' (rode o schema_v9.sql)');
      S.logo = j.secure_url; applyLogo(); toast('Logo salva.'); render();
    } catch (err) { b.disabled = false; toast('Não foi possível salvar a logo: ' + err.message, 1); }
    return;
  }
  if (op === 'add' && (T[k] || ['docs', 'dc', 'pl'].includes(k)) && !o.residence_id) return toast('Selecione a residência (ou cadastre uma nova ao lado).', 1);
  const rid = o.residence_id;
  if (id === 'ast') { r = await sb.from('service_requests').update({ staff_note: (o.staff_note || '').trim() || null }).eq('id', f.dataset.id); }
  else if (id === 'add:res') {
    const { owner_ids, ...fields } = o; r = await sb.from('residences').insert(fields).select().single();
    if (!r.error) {
      const ids = (owner_ids || '').split(',').filter(Boolean); let linkErr = false;
      for (const oid of ids) { const l = await sb.rpc('admin_link_cpf', { p_cpf: oid, p_res: r.data.id }); if (l.error) linkErr = true; }
      await reloadRes(); const novo = r.data;
      if (linkErr) toast('Residência cadastrada, mas não foi possível vincular todos os proprietários.', 1);
      if (nested) { popModal(novo); if (!linkErr) toast('Residência cadastrada e selecionada.'); return; }
      closeModal(); await loadRes(novo.id); location.hash = '#res/' + novo.id; if (!linkErr) toast('Residência cadastrada. Complete o cadastro e envie as imagens e vídeos.'); return;
    }
  }
  else if (id === 'edit:res') {
    const { owner_ids, ...fields } = o; r = await sb.from('residences').update(fields).eq('id', f.dataset.id);
    if (!r.error) {
      if ('owner_ids' in o) {   // só sincroniza proprietários quando o campo existe (ele some ao editar a residência a partir de um proprietário)
        const antes = (S.ownersByRes[f.dataset.id] || []).map(x => x.id), depois = (owner_ids || '').split(',').filter(Boolean);
        for (const oid of depois.filter(x => !antes.includes(x))) await sb.rpc('admin_link_cpf', { p_cpf: oid, p_res: f.dataset.id });
        for (const oid of antes.filter(x => !depois.includes(x))) await sb.rpc('admin_unlink_cpf', { p_cpf: oid, p_res: f.dataset.id });
      }
      if (nested) { await reloadRes(); popModal({ id: f.dataset.id }); return toast('Dados da residência salvos.'); }
      closeModal(); await loadRes(f.dataset.id); return toast('Dados da residência salvos.');
    }
  }
  else if (id === 'add:own') {
    const cpf = cpfDigits(o.cpf); if (!cpfOk(cpf)) return toast('CPF inválido. Confira os números.', 1);
    if (!telOk(o.phone) || !telOk(o.whatsapp)) return toast('Celular ou WhatsApp inválido. Use DDD + número.', 1);
    r = await sb.rpc('admin_register_cpf', ownerParams(o, cpf));
    if (!r.error) {
      const newId = r.data;
      if (f.dataset.nested === '1') { S.owners.push({ id: newId, name: o.name, cpf_mask: '***.***.***-' + cpf.slice(-2), claimed_by: null, expected_email: o.email || null, phone: o.phone || null, whatsapp: o.whatsapp || null }); popModal({ id: newId }); return toast('Proprietário cadastrado e selecionado.'); }
      let falha = null;   // a residência é opcional: vincula todas as que estiverem na lista
      for (const rr of (o.res_ids || '').split(',').filter(Boolean)) { const l = await sb.rpc('admin_link_cpf', { p_cpf: newId, p_res: rr }); if (l.error) falha = l; }
      r = falha || { error: null };
    }
  }
  else if (id === 'edit:own') {
    const cpf = cpfDigits(o.cpf || ''); if (cpf && !cpfOk(cpf)) return toast('CPF inválido. Confira os números.', 1);
    if (!telOk(o.phone) || !telOk(o.whatsapp)) return toast('Celular ou WhatsApp inválido. Use DDD + número.', 1);
    r = await sb.rpc('admin_update_cpf', { p_id: f.dataset.id, ...ownerParams(o, null), p_cpf: cpf || null });
    if (!r.error && 'res_ids' in o) {   // vínculos: grava a diferença entre a lista de antes e a de agora (a lista não existe quando o proprietário é editado a partir de uma residência)
      const antes = S.links.filter(l => l.cpf_id === f.dataset.id).map(l => l.residence_id), depois = (o.res_ids || '').split(',').filter(Boolean); let falha = null;
      for (const rr of depois.filter(x => !antes.includes(x))) { const l = await sb.rpc('admin_link_cpf', { p_cpf: f.dataset.id, p_res: rr }); if (l.error) falha = l; }
      for (const rr of antes.filter(x => !depois.includes(x))) { const l = await sb.rpc('admin_unlink_cpf', { p_cpf: f.dataset.id, p_res: rr }); if (l.error) falha = l; }
      if (falha) r = falha;
    }
    if (!r.error && nested) { await loadOwners(); popModal({ id: f.dataset.id }); return toast('Proprietário salvo.'); }
  }
  else if (id === 'add:docs') { const file = f.file.files[0]; delete o.file; const path = `${rid}/${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`; r = await sb.storage.from('documents').upload(path, file); if (!r.error) r = await sb.from('documents').insert({ ...o, path }); }
  else if (id === 'add:dc' || id === 'edit:dc') { const b = f.querySelector('button:not([type])'); if (b) b.disabled = true; r = await saveDc(f, o, op); if (b) b.disabled = false; }
  else if (id === 'add:pl' || id === 'edit:pl') { const b = f.querySelector('button:not([type])'); if (b) b.disabled = true; r = await savePl(f, o, op); if (b) b.disabled = false; }
  else if (id === 'add:pt') r = await sb.from('plan_points').insert({ ...o, residence_id: S.curPlan.residence_id, floorplan_id: S.curPlan.id, x: S.pend.x, y: S.pend.y });
  else if (MEDIA_T[k] && (op === 'add' || op === 'edit')) { const b = f.querySelector('button:not([type])'); if (b) b.disabled = true; r = await saveBld(f, o, op, k); if (b) b.disabled = false; }
  else if (op === 'add') r = await sb.from(k).insert(o);
  else if (op === 'edit') r = await sb.from(k).update(o).eq('id', f.dataset.id);
  if (r && r.error) return toast('Não foi possível salvar: ' + r.error.message, 1);
  closeModal(); toast('Salvo com sucesso.'); await render();
});

// prazos (meses/anos): só números inteiros, nunca negativos
document.addEventListener('keydown', e => { if (e.target.matches && e.target.matches('input[data-nonneg]') && (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E' || e.key === '.' || e.key === ',')) e.preventDefault(); });
document.addEventListener('input', e => { const t = e.target; if (t.matches && t.matches('input[data-nonneg]') && t.value !== '' && !/^\d+$/.test(t.value)) t.value = t.value.replace(/\D/g, ''); });
