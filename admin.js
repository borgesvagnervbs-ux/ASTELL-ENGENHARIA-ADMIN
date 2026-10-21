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

const S = { profile: null, res: [], cur: null, rows: {}, hf: {}, place: false };
// Aceita CLOUDINARY_UPLOAD_PRESET ou CLOUDINARY_PRESET no config.js
const CLD_NAME = typeof CLOUDINARY_CLOUD_NAME !== 'undefined' ? String(CLOUDINARY_CLOUD_NAME).trim() : '';
const CLD_PRESET = typeof CLOUDINARY_UPLOAD_PRESET !== 'undefined' ? String(CLOUDINARY_UPLOAD_PRESET).trim() : (typeof CLOUDINARY_PRESET !== 'undefined' ? String(CLOUDINARY_PRESET).trim() : '');
const CLOUD_OK = !!(CLD_NAME && CLD_PRESET) && !/COLE_AQUI/.test(CLD_NAME + CLD_PRESET);
const isVid = x => x.media_type === 'video';
const vsrc = u => String(u).replace('/upload/', '/upload/f_mp4,vc_h264,q_auto/').replace(/\.\w+$/, '.mp4');
const vposter = u => String(u).replace('/upload/', '/upload/w_480,c_limit,so_0/').replace(/\.\w+$/, '.jpg');
const cld = (u, w) => String(u).replace('/upload/', `/upload/w_${w},c_limit,q_auto,f_auto/`);
const thumbsOf = a => a && a.length ? `<div class="thumbs">${a.slice(0, 6).map(x => `<img src="${esc(cld(x.url, 240))}" alt="" loading="lazy">`).join('')}</div>` : '';

// ---------- ícones
const ico = d => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d.split('|').map(p => `<path d="${p}"/>`).join('')}</svg>`;
const IC = { casa: 'M4 21V8l8-5 8 5v13|M9 21v-6h6v6', user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M8 13h8|M8 17h8', layers: 'M12 2L2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5', shield: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z|M9 12l2 2 4-4', wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z', phones: 'M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3', clock: 'M12 6v6l4 2|M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22V12h6v10', book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20|M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z', grid: 'M3 3h7v7H3z|M14 3h7v7h-7z|M14 14h7v7h-7z|M3 14h7v7H3z', map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z|M9 3v15|M15 6v15' };
const GOOGLE_SVG = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

// ---------- menus (o primeiro é a tela inicial)
const MENU = [['res', 'Residências', 'casa'], ['own', 'Proprietários', 'user'], ['docs', 'Documentos', 'doc'], ['eq', 'Equipamentos', 'layers'], ['gar', 'Garantias', 'shield'], ['man', 'Manutenções', 'wrench'], ['ast', 'Assistência', 'phones'], ['his', 'Histórico', 'clock'], ['ctt', 'Contatos', 'book'], ['bld', 'Construção', 'home'], ['qr', 'QR Codes', 'grid'], ['pl', 'Planta técnica', 'map']];
const TABLE_OF = { eq: 'equipment', gar: 'warranties', man: 'maintenance_tasks', ctt: 'contacts', bld: 'building_items' };

// ---------- dados e campos
const addMonths = (d, m) => { const x = new Date(d + 'T00:00'); x.setMonth(x.getMonth() + m); return x; };
function wState(w) { const end = addMonths(w.start_date, w.months), days = (end - new Date()) / 864e5; return days < 0 ? ['Encerrada', 'bad', end] : days < 90 ? ['Próxima do vencimento', 'warn', end] : ['Vigente', 'ok', end]; }
const DOC_CATS = ['Projeto arquitetônico', 'Projeto estrutural', 'Projeto elétrico', 'Projeto hidráulico', 'Projeto sanitário', 'Climatização', 'Cobertura', 'Memorial descritivo', 'Manuais', 'Notas e comprovantes', 'Termo de entrega', 'Garantia', 'Outros'];
const STATUS = ['Recebida', 'Em análise', 'Aguardando informações', 'Agendada', 'Em atendimento', 'Concluída', 'Encerrada'];
const PT_CATS = ['Elétrica', 'Hidráulica', 'Gás', 'Climatização', 'Estrutura', 'Paredes', 'Equipamentos'];
const QR_T = { 'Minha casa': 'casa', 'Documentos e manuais': 'documentos', 'Equipamentos': 'equipamentos', 'Manutenção': 'manutencao', 'Planta técnica': 'planta', 'Assistência técnica': 'assistencia' };
const TBL = { residences: 'Residência', documents: 'Documento', warranties: 'Garantia', maintenance_tasks: 'Manutenção', equipment: 'Equipamento', history_events: 'Evento do histórico', contacts: 'Contato', building_items: 'Item construtivo', images: 'Imagem', floorplans: 'Planta', plan_points: 'Ponto da planta', qr_codes: 'QR Code', service_requests: 'Assistência' };
const ACT = { INSERT: 'criou', UPDATE: 'alterou', DELETE: 'excluiu' };

const DEFREQ = ['system', 'name', 'description', 'months', 'start_date', 'event_date', 'title'];
const fld = ([k, l, t = 'text', req], v = {}) => {
  const val = v[k] ?? '', r = (req ?? DEFREQ.includes(k)) ? 'required' : '';
  if (Array.isArray(t)) return `<label>${l}<select name="${k}">${t.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
  return `<label>${l}${t === 'textarea' ? `<textarea name="${k}" rows="3" ${r}>${esc(val)}</textarea>` : `<input name="${k}" type="${t}" value="${esc(val)}" ${r}>`}</label>`;
};
const RES_F = [['code', 'Código (ex.: AST-2026-002)', 'text', true], ['name', 'Nome da residência', 'text', true], ['address', 'Endereço'], ['area_m2', 'Área construída (m²)', 'number'], ['floors', 'Pavimentos', 'number'], ['build_system', 'Sistema construtivo'], ['project_no', 'Nº do projeto'], ['start_date', 'Início da obra', 'date'], ['delivery_date', 'Entrega', 'date'], ['tech_lead', 'Responsável técnico'], ['notes', 'Observações', 'textarea']];
const DOC_F = [['title', 'Título'], ['category', 'Categoria', DOC_CATS], ['version', 'Versão'], ['description', 'Descrição']];
const T = {
  warranties: { label: 'Garantias', order: 'start_date', f: [['system', 'Sistema ou componente'], ['coverage', 'Descrição da cobertura'], ['start_date', 'Data inicial', 'date'], ['months', 'Prazo (meses)', 'number'], ['notes', 'Condições e exclusões', 'textarea']],
    row: r => { const [s, c, end] = wState(r); return `<b>${esc(r.system)}</b> <span class="badge ${c}">${s}</span><p>${esc(r.coverage)}</p><span class="mute">${fmt(r.start_date)} até ${end.toLocaleDateString('pt-BR')}</span><p class="mute">${esc(r.notes)}</p>`; },
    note: 'Os prazos valem conforme contrato, fabricante e lei. As condições contratuais e legais prevalecem sobre os indicadores do aplicativo.' },
  maintenance_tasks: { label: 'Manutenções', order: 'next_due', f: [['name', 'Tarefa'], ['system', 'Sistema'], ['frequency', 'Periodicidade (texto)'], ['last_done', 'Última execução', 'date'], ['next_due', 'Próxima data', 'date'], ['interval_months', 'Repetir a cada (meses)', 'number'], ['status', 'Situação', ['Pendente', 'Em andamento', 'Concluída', 'Cancelada']], ['instructions', 'Instruções', 'textarea']],
    row: r => { const st = r.status || 'Pendente', late = r.next_due && new Date(r.next_due + 'T00:00') < new Date() && !['Concluída', 'Cancelada'].includes(st); return `<b>${esc(r.name)}</b> <span class="badge ${late ? 'bad' : st === 'Concluída' ? 'ok' : ''}">${late ? 'Atrasada' : st}</span><p class="mute">${esc(r.system)} · ${esc(r.frequency)}</p>Última: ${fmt(r.last_done)} · Próxima: ${fmt(r.next_due)}<p class="mute">${esc(r.instructions)}</p>`; } },
  equipment: { label: 'Equipamentos', f: [['name', 'Nome'], ['category', 'Categoria'], ['maker', 'Fabricante'], ['model', 'Modelo'], ['serial', 'Nº de série'], ['location', 'Localização']],
    row: r => `<b>${esc(r.name)}</b><span class="mute">${esc(r.category)} · ${esc(r.location)}</span><p>${esc(r.maker)} ${esc(r.model)} ${r.serial ? '· Série ' + esc(r.serial) : ''}</p>` },
  history_events: { label: 'Histórico', f: [['event_date', 'Data', 'date'], ['category', 'Categoria'], ['description', 'Descrição', 'textarea']], row: () => '' },
  contacts: { label: 'Contatos', f: [['name', 'Nome / empresa'], ['specialty', 'Especialidade'], ['phone', 'Telefone'], ['whatsapp', 'WhatsApp'], ['email', 'E-mail'], ['hours', 'Horário de atendimento'], ['notes', 'Instruções', 'textarea']],
    row: r => `<b>${esc(r.name)}</b><span class="mute">${esc(r.specialty)}</span><p>${esc(r.phone)} ${esc(r.whatsapp)} ${esc(r.email)}</p><span class="mute">${esc(r.hours)} ${esc(r.notes)}</span>` },
  building_items: { label: 'Construção', f: [['category', 'Seção do app', ['Estrutura', 'Sistemas', 'Materiais']], ['title', 'Título'], ['description', 'Descrição', 'textarea'], ['highlights', 'Destaques (um por linha)', 'textarea']],
    row: r => `<b>${esc(r.title)}</b> <span class="badge">${esc(r.category)}</span><p class="mute">${esc(r.description)}</p><p>${esc((r.highlights || '').split('\n').filter(Boolean).join(' · '))}</p>` },
};
const fieldsFor = k => k === 'res' ? RES_F : k === 'documents' ? DOC_F : T[k].f;

// CPF
function cpfDigits(v) { return String(v || '').replace(/\D/g, '').slice(0, 11); }
function cpfMask(v) { return cpfDigits(v).replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2'); }
function cpfOk(d) { if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false; for (let t = 9; t < 11; t++) { let s = 0; for (let i = 0; i < t; i++) s += d[i] * (t + 1 - i); if ((s * 10) % 11 % 10 != d[t]) return false; } return true; }

// ---------- janela de formulário
function modal(title, body, attrs, btn = 'Salvar') {
  $('#modal').innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheethead"><b>${esc(title)}</b><button type="button" class="x" data-close aria-label="Fechar">×</button></div><form ${attrs}>${body}<button>${btn}</button><button type="button" class="ghost2" data-close>Cancelar</button></form></div>`;
  $('#modal').hidden = false;
}
const closeModal = () => { $('#modal').hidden = true; $('#modal').innerHTML = ''; };
const ADD = {
  res: () => modal('Nova residência', RES_F.map(f => fld(f)).join(''), 'data-form="add:res"', 'Criar residência'),
  own: () => { S.back = null; openOwnerAdd(S.cur && S.cur.id); },
  docs: () => modal('Enviar documento', '<label>Arquivo<input name="file" type="file" required></label>' + DOC_F.map(f => fld(f)).join(''), 'data-form="add:docs"', 'Enviar'),
  qr: () => modal('Novo QR Code', `<label>Nome da etiqueta<input name="label" required></label>${fld(['target', 'Ao ler, abre', Object.keys(QR_T)])}`, 'data-form="add:qr"', 'Gerar'),
  pl: () => modal('Enviar planta (imagem PNG ou JPG)', '<label>Título<input name="title" required></label><label>Imagem<input name="file" type="file" accept="image/*" required></label>', 'data-form="add:pl"', 'Enviar'),
};
function openOwnerAdd(resId) {
  const r = resId && S.res.find(x => x.id === resId);
  modal('Novo proprietário', `<label>Nome<input name="name" required></label><label>CPF<input name="cpf" class="cpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" required></label><label>E-mail do proprietário (opcional, recomendado)<input name="email" type="email"></label>${r ? `<label class="chk"><input type="checkbox" name="res_id" value="${r.id}" checked> Vincular à residência ${esc(r.name)}</label>` : ''}`, 'data-form="add:own"', 'Cadastrar');
}
function openOwnerEdit(id) {
  const c = (S.owners || []).find(x => x.id === id); if (!c) return;
  const blocks = (S.links || []).filter(x => x.cpf_id === id).map(x => x.residence_id).map(rid => {
    const r = S.res.find(x => x.id === rid), co = S.links.filter(x => x.residence_id === rid).map(x => S.owners.find(o => o.id === x.cpf_id)).filter(Boolean);
    return `<div class="card"><b>${esc(r ? r.name : 'Residência')}</b> <span class="mute">${esc(r ? r.code : '')}</span><p class="mute">Proprietários: ${co.map(o => esc(o.name) + (o.id === id ? ' (este)' : '')).join(', ')}</p>${acts(`<button type="button" class="link" data-oadd="${rid}">+ Adicionar proprietário a esta residência</button>`, `<button type="button" class="link danger" data-ounlink="${id}:${rid}">Desvincular</button>`)}</div>`;
  }).join('') || '<p class="empty">Este proprietário ainda não está vinculado a nenhuma residência. Use "Vincular à residência selecionada" na lista.</p>';
  modal('Editar proprietário', `<label>Nome<input name="name" value="${esc(c.name)}" required></label><label>CPF atual<input value="${esc(c.cpf_mask)}" disabled></label><label>Novo CPF (deixe em branco para manter)<input name="cpf" class="cpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00"></label><label>E-mail do proprietário<input name="email" type="email" value="${esc(c.expected_email || '')}"></label><h3>Residências vinculadas</h3>${blocks}`, `data-form="edit:own" data-id="${id}"`, 'Salvar alterações');
}
function openAdd(k) { if (ADD[k]) return ADD[k](); modal('Adicionar — ' + T[k].label, T[k].f.map(f => fld(f)).join(''), `data-form="add:${k}"`); }
function openEdit(k, id) {
  const row = k === 'res' ? S.res.find(r => r.id === id) : (S.rows[k] || []).find(r => r.id === id); if (!row) return;
  modal('Editar', fieldsFor(k).map(f => fld(f, row)).join(''), `data-form="edit:${k}" data-id="${id}"`, 'Salvar alterações');
}

// ---------- galeria de imagens (Cloudinary)
async function gallery() {
  const g = S.gal, withVid = g.kind === 'residence';
  const { data, error } = await sb.from('images').select('*').eq('residence_id', g.resId).eq('kind', g.kind).order('created_at');
  const list = (data || []).filter(x => g.kind === 'residence' || x.ref_id === g.refId); S.imgs = list;
  const tile = x => `<div class="gtile">${isVid(x) ? `<video controls playsinline preload="metadata" poster="${esc(vposter(x.url))}" src="${esc(vsrc(x.url))}"></video><span class="badge">Vídeo</span>` : `<a href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${esc(cld(x.url, 400))}" alt="" loading="lazy"></a>`}${x.visible === false ? ' <span class="badge">Oculto do cliente</span>' : ''}${acts(`<button class="link" data-gvis="${x.id}">${x.visible === false ? 'Mostrar ao cliente' : 'Ocultar do cliente'}</button>`, `<button class="link danger" data-gdel="${x.id}">Excluir</button>`)}</div>`;
  $('#modal').innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Galeria"><div class="sheethead"><b>${withVid ? 'Imagens e vídeos' : 'Imagens'} — ${esc(g.title)}</b><button type="button" class="x" data-close aria-label="Fechar">×</button></div>` +
    (CLOUD_OK ? `<form data-form="gal"><label>${withVid ? 'Adicionar imagens e vídeos (selecione quantos quiser)' : 'Adicionar imagens (selecione quantas quiser)'}<input name="imgs" type="file" accept="${withVid ? 'image/*,video/*' : 'image/*'}" multiple required></label><button>Salvar</button></form><p class="mute" id="galmsg"></p>` : `<p class="notice">Cloudinary não configurado. Faltando no config.js: ${[!CLD_NAME && 'CLOUDINARY_CLOUD_NAME', !CLD_PRESET && 'CLOUDINARY_UPLOAD_PRESET'].filter(Boolean).join(' e ')}.</p>`) +
    (error ? '<p class="empty">Rode o schema_v6.sql no Supabase para habilitar as imagens.</p>' : `<h3>${list.length} arquivo(s)</h3><div class="gallery">${list.map(tile).join('') || '<p class="empty">Nada enviado ainda.</p>'}</div>`) + '</div>';
  $('#modal').hidden = false;
}
async function uploadImages(form) {
  const g = S.gal, files = [...form.imgs.files], res = S.res.find(r => r.id === g.resId), msg = $('#galmsg'); let ok = 0;
  const folder = 'astell-home/' + String(res ? res.code : g.resId).replace(/[^\w-]/g, '_') + '/' + g.kind;
  for (let i = 0; i < files.length; i++) {
    const file = files[i]; msg.textContent = `Enviando ${i + 1} de ${files.length}...`;
    try {
      const vid = /^video\//.test(file.type || ''), img = /^image\//.test(file.type || '');
      if (!img && !(vid && g.kind === 'residence')) throw new Error(g.kind === 'residence' ? 'envie apenas imagens ou vídeos' : 'envie apenas imagens');
      const max = vid ? 100 : 10; if (file.size > max * 1024 * 1024) throw new Error('maior que ' + max + ' MB');
      const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', CLD_PRESET); fd.append('folder', folder);
      const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLD_NAME}/auto/upload`, { method: 'POST', body: fd });
      const j = await resp.json(); if (!resp.ok) throw new Error((j.error && j.error.message) || 'erro no envio');
      const { error } = await sb.from('images').insert({ residence_id: g.resId, kind: g.kind, ref_id: g.refId || null, url: j.secure_url, public_id: j.public_id, ...(vid ? { media_type: 'video' } : {}) });
      if (error) throw error; ok++;
    } catch (e) { toast(`Falha em "${file.name}": ${e.message}`, 1); }
  }
  if (ok) toast(ok + (ok === 1 ? ' arquivo salvo.' : ' arquivos salvos.'));
  await gallery(); render();
}

// ---------- páginas
const head = (t, add, ctx = true) => `<div class="pagehead"><div><h2>${t}</h2>${ctx && S.cur ? `<p class="mute">Residência: <b>${esc(S.cur.name)}</b> — ${esc(S.cur.code)}</p>` : ''}</div>${add ? `<button class="add" data-add="${add}" aria-label="Adicionar" title="Adicionar">+</button>` : ''}</div>`;
const acts = (...b) => `<div class="acts">${b.filter(Boolean).join('')}</div>`;
const visBtn = (k, r) => `<button class="link" data-vis="${k}:${r.id}">${r.visible ? 'Ocultar do cliente' : 'Mostrar ao cliente'}</button>`;
const hid = r => r.visible === false ? '<p><span class="badge">Oculto do cliente</span></p>' : '';

async function listPage(k) {
  const c = T[k];
  const { data, error } = await sb.from(k).select('*').eq('residence_id', S.cur.id).order(c.order || 'created_at', { ascending: false });
  if (error) throw error; S.rows[k] = data;
  const im = {};
  if (k === 'maintenance_tasks') { const { data: ii } = await sb.from('images').select('url,ref_id').eq('residence_id', S.cur.id).eq('kind', 'maintenance').order('created_at'); (ii || []).forEach(x => (im[x.ref_id] = im[x.ref_id] || []).push(x)); }
  view.innerHTML = head(c.label, k) + (data.length ? data.map(r => `<div class="card">${c.row(r)}${k === 'maintenance_tasks' ? thumbsOf(im[r.id]) : ''}${hid(r)}${acts(`<button class="link" data-edit="${k}:${r.id}">Editar</button>`, 'visible' in r && visBtn(k, r), k === 'maintenance_tasks' && `<button class="link" data-done="${r.id}">Marcar como executada</button>`, k === 'maintenance_tasks' && `<button class="link" data-gal="man:${r.id}">Imagens (${(im[r.id] || []).length})</button>`, `<button class="link danger" data-del="${k}:${r.id}">Excluir</button>`)}</div>`).join('') : '<p class="empty">Nada cadastrado ainda. Toque em + para adicionar.</p>') + (c.note ? `<p class="notice">${c.note}</p>` : '');
}

const PAGES = {
  async res() {
    const { data: im } = await sb.from('images').select('*').eq('kind', 'residence').order('created_at');
    const by = {}; (im || []).forEach(x => (by[x.residence_id] = by[x.residence_id] || []).push(x));
    view.innerHTML = head('Residências', 'res', false) + (S.res.map(r => { const g = by[r.id] || []; return `<div class="card"><b>${esc(r.name)}</b> ${S.cur && S.cur.id === r.id ? '<span class="badge ok">Selecionada</span>' : ''}<span class="mute">${esc(r.code)} · ${esc(r.address || '')}</span><p class="mute">Obra: ${fmt(r.start_date)} → ${fmt(r.delivery_date)}</p>${thumbsOf(g.filter(x => !isVid(x)))}${acts(`<button class="link" data-edit="res:${r.id}">Editar</button>`, `<button class="link" data-gal="res:${r.id}">Imagens e vídeos (${g.length})</button>`, !(S.cur && S.cur.id === r.id) && `<button class="link" data-pick="${r.id}">Selecionar</button>`)}</div>`; }).join('') || '<p class="empty">Nenhuma residência cadastrada. Toque em + para adicionar a primeira.</p>') +
      '<p class="notice">A residência marcada como "Selecionada" é a que os demais menus (documentos, garantias, manutenções...) estão editando. As imagens da residência aparecem para o cliente no Início e em Minha casa.</p>';
  },
  async own() {
    const [{ data: cl }, { data: lk }] = await Promise.all([sb.from('client_cpfs').select('id,name,cpf_mask,claimed_by,expected_email').order('name'), sb.from('cpf_residences').select('cpf_id,residence_id')]);
    S.owners = cl || []; S.links = lk || [];
    const here = new Set(S.links.filter(x => S.cur && x.residence_id === S.cur.id).map(x => x.cpf_id));
    const card = c => `<div class="card"><b>${esc(c.name)}</b><span class="mute">${esc(c.cpf_mask)} · ${c.claimed_by ? 'Acesso ativo' : 'Aguardando primeiro acesso'}${c.expected_email ? ' · ' + esc(c.expected_email) : ''}</span>${acts(`<button class="link" data-oedit="${c.id}">Editar</button>`, S.cur && !here.has(c.id) && `<button class="link" data-link="${c.id}">Vincular à residência selecionada</button>`, S.cur && here.has(c.id) && `<button class="link danger" data-unlink="${c.id}">Desvincular desta residência</button>`, c.claimed_by && `<button class="link danger" data-rel="${c.id}">Liberar CPF</button>`)}</div>`;
    const mine = S.owners.filter(c => here.has(c.id)), other = S.owners.filter(c => !here.has(c.id));
    view.innerHTML = head('Proprietários', 'own', !!S.cur) + (S.cur ? `<h3>Proprietários desta residência (${mine.length})</h3>` + (mine.map(card).join('') || '<p class="empty">Nenhum proprietário vinculado ainda. Toque em + para adicionar quantos forem necessários.</p>') : '') +
      `<h3>${S.cur ? 'Outros proprietários cadastrados' : 'Proprietários cadastrados'}</h3>` + (other.map(card).join('') || '<p class="empty">Nenhum outro proprietário cadastrado.</p>') +
      '<p class="notice">Uma residência pode ter vários proprietários, cada um com o seu CPF. Cada um cria a própria conta no app e informa o CPF para ver a casa. Se você cadastrar o e-mail do proprietário, só a conta com esse e-mail consegue usar o CPF.</p>';
  },
  async docs() {
    const { data } = await sb.from('documents').select('*').eq('residence_id', S.cur.id).order('created_at', { ascending: false }); S.rows.documents = data || [];
    view.innerHTML = head('Documentos', 'docs') + ((data || []).map(d => `<div class="card"><b>${esc(d.title)}</b><span class="mute">${esc(d.category)} · v${esc(d.version || '1')} · ${fmt(d.created_at)}</span><p>${esc(d.description)}</p>${hid(d)}${acts(`<button class="link" data-open="${esc(d.path)}">Abrir</button>`, `<button class="link" data-edit="documents:${d.id}">Editar</button>`, visBtn('documents', d), `<button class="link danger" data-deldoc="${d.id}|${esc(d.path)}">Excluir</button>`)}</div>`).join('') || '<p class="empty">Nenhum documento. Toque em + para enviar o primeiro.</p>');
  },
  eq: () => listPage('equipment'), gar: () => listPage('warranties'), man: () => listPage('maintenance_tasks'), ctt: () => listPage('contacts'), bld: () => listPage('building_items'),
  async ast() {
    const { data } = await sb.from('service_requests').select('*').eq('residence_id', S.cur.id).order('created_at', { ascending: false });
    view.innerHTML = head('Assistência técnica', null) + ((data || []).map(r => `<div class="card"><b>${esc(r.protocol)}</b> <span class="badge">${esc(r.status)}</span><p>${esc(r.category)} · ${esc(r.place)} · urgência ${esc(r.urgency)}</p><p>${esc(r.description)}</p><p class="mute">Contato: ${esc(r.contact_time || '—')} · aberta em ${fmt(r.created_at)}</p>
      <form class="statusform" data-form="ast" data-id="${r.id}">${fld(['status', 'Alterar situação', STATUS], r)}<label>Comentário para o cliente<input name="staff_note" value="${esc(r.staff_note || '')}"></label><button>Atualizar</button></form></div>`).join('') || '<p class="empty">Nenhuma solicitação de assistência.</p>');
  },
  async his() {
    const rid = S.cur.id, f = S.hf;
    let q = sb.from('history_events').select('*').eq('residence_id', rid).order('event_date', { ascending: false }).limit(200);
    let a = sb.from('audit_log').select('*').eq('residence_id', rid).order('at', { ascending: false }).limit(100);
    if (f.cat) q = q.ilike('category', '%' + f.cat + '%');
    if (f.from) { q = q.gte('event_date', f.from); a = a.gte('at', f.from); }
    if (f.to) { q = q.lte('event_date', f.to); a = a.lte('at', f.to + 'T23:59:59'); }
    const [{ data: ev }, { data: au, error }, { data: pr }] = await Promise.all([q, a, sb.from('profiles').select('id,name')]);
    const who = Object.fromEntries((pr || []).map(p => [p.id, p.name]));
    const what = x => { const n = x.new_data || x.old_data || {}; if (x.action === 'UPDATE') return 'campos: ' + Object.keys(n).filter(k => k !== 'created_at' && JSON.stringify((x.old_data || {})[k]) !== JSON.stringify(n[k])).join(', '); return n.title || n.name || n.system || n.protocol || n.label || n.description || ''; };
    view.innerHTML = head('Histórico', 'history_events') + `<form class="card" data-form="hf"><b>Filtros</b><label>Categoria contém<input name="cat" value="${esc(f.cat || '')}"></label><label>De<input name="from" type="date" value="${esc(f.from || '')}"></label><label>Até<input name="to" type="date" value="${esc(f.to || '')}"></label><button>Filtrar</button><button type="button" class="ghost2" data-hclear>Limpar filtros</button></form><h3>Linha do tempo da residência</h3>` +
      ((ev || []).map(e => `<div class="card"><b>${fmt(e.event_date)}</b><span class="mute">${esc(e.category)}</span><p>${esc(e.description)}</p>${acts(`<button class="link danger" data-del="history_events:${e.id}">Excluir</button>`)}</div>`).join('') || '<p class="empty">Nenhum evento no período.</p>') +
      '<h3>Alterações registradas no sistema</h3>' + (error ? '<p class="empty">O registro de alterações ainda não está disponível. Rode o schema_v5.sql.</p>' : ((au || []).map(x => `<div class="card"><b>${esc(who[x.user_id] || 'Sistema')} ${ACT[x.action] || ''} ${esc((TBL[x.table_name] || x.table_name).toLowerCase())}</b><span class="mute">${new Date(x.at).toLocaleString('pt-BR')}</span><p class="mute">${esc(what(x))}</p></div>`).join('') || '<p class="empty">Nenhuma alteração registrada.</p>'));
  },
  async qr() {
    const { data } = await sb.from('qr_codes').select('*').eq('residence_id', S.cur.id).order('created_at');
    const base = new URL('index.html', location.href.split('#')[0]).href;
    const svg = t => { const q = qrcode(0, 'M'); q.addData(base + '#qr/' + t); q.make(); return q.createSvgTag(5, 0); };
    view.innerHTML = head('QR Codes', 'qr') + acts('<button class="link" data-print>Imprimir etiquetas</button>') + '<div class="grid">' + ((data || []).map(q => `<div class="card qr">${svg(q.token)}<b>${esc(q.label)}</b><span class="mute">Astell Home · ${esc(S.cur.code)}</span>${acts(`<button class="link danger" data-del="qr_codes:${q.id}">Excluir</button>`)}</div>`).join('') || '<p class="empty">Nenhum QR Code. Toque em + para gerar.</p>') + '</div><p class="notice">O QR leva ao app do cliente (index.html). Quem ler precisa entrar com a conta vinculada à casa para ver qualquer informação.</p>';
  },
  async pl() {
    const rid = S.cur.id;
    const [{ data: fp }, { data: pts }] = await Promise.all([sb.from('floorplans').select('*').eq('residence_id', rid).order('created_at'), sb.from('plan_points').select('*').eq('residence_id', rid)]);
    if (!(fp || []).length) return view.innerHTML = head('Planta técnica', 'pl') + '<p class="empty">Nenhuma planta enviada. Toque em + para enviar uma imagem da planta.</p>';
    const cur = fp.find(p => p.id === S.planId) || fp[0]; S.planId = cur.id;
    const { data: u } = await sb.storage.from('documents').createSignedUrl(cur.path, 3600);
    const mine = (pts || []).filter(p => p.floorplan_id === cur.id);
    view.innerHTML = head('Planta técnica', 'pl') + `<label>Planta<select id="planSel">${fp.map(p => `<option value="${p.id}" ${p.id === cur.id ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select></label>` +
      acts(`<button class="link" data-place>${S.place ? 'Parar de marcar pontos' : 'Marcar pontos na planta'}</button>`, `<button class="link danger" data-delplan="${cur.id}|${esc(cur.path)}">Excluir esta planta</button>`) + (S.place ? '<p class="notice">Toque na planta onde fica o ponto, conforme o projeto.</p>' : '') +
      `<div class="plan ${S.place ? 'placing' : ''}" style="margin-top:12px"><img data-plan="1" src="${u ? esc(u.signedUrl) : ''}" alt="${esc(cur.title)}">${mine.map(p => `<span class="pin" title="${esc(p.label)}" style="left:${p.x}%;top:${p.y}%"></span>`).join('')}</div><h3>Pontos cadastrados</h3>` +
      (mine.map(p => `<div class="card"><b>${esc(p.label)}</b><span class="mute">${esc(p.category)}</span><p>${esc(p.description)}</p>${acts(`<button class="link danger" data-del="plan_points:${p.id}">Excluir ponto</button>`)}</div>`).join('') || '<p class="empty">Nenhum ponto marcado.</p>');
  },
};

async function render() {
  if (!S.profile || S.profile.role !== 'admin') return;
  const key = location.hash.slice(1) || 'res', m = MENU.find(x => x[0] === key) || MENU[0]; S.menu = m[0];
  document.querySelectorAll('#drawer a[data-m]').forEach(a => a.classList.toggle('on', a.dataset.m === S.menu));
  if (!S.cur && !['res', 'own'].includes(S.menu)) return view.innerHTML = '<p class="empty">Crie ou selecione uma residência no menu Residências.</p>';
  try { await PAGES[S.menu](); } catch (e) { view.innerHTML = '<p class="empty">Não foi possível carregar esta tela. ' + esc(e.message || '') + '</p>'; }
}
async function loadRes(pick) {
  const { data } = await sb.from('residences').select('*').order('created_at');
  S.res = data || []; S.cur = S.res.find(r => r.id === pick) || S.res.find(r => S.cur && r.id === S.cur.id) || S.res[0] || null;
  $('#resSel').innerHTML = S.res.map(r => `<option value="${r.id}" ${S.cur && r.id === S.cur.id ? 'selected' : ''}>${esc(r.name)} — ${esc(r.code)}</option>`).join('');
  $('#resSel').hidden = S.res.length < 2; render();
}

// ---------- menu lateral
function buildDrawer() {
  $('#drawer').innerHTML = `<div class="dhead"><strong class="logo">ASTELL<span>PAINEL ADMINISTRATIVO</span></strong></div><div class="dnav">${MENU.map(([k, l, i]) => `<a href="#${k}" data-m="${k}">${ico(IC[i])}<span>${l}</span></a>`).join('')}</div><div class="dfoot"><a href="index.html">${ico(IC.casa)}<span>Ver app do cliente</span></a><button type="button" class="ghost" data-out>Sair</button></div>`;
}
function drawer(open) { $('#drawer').classList.toggle('open', open); $('#scrim').hidden = !open; $('#menuBtn').setAttribute('aria-expanded', open); }
$('#menuBtn').onclick = () => drawer(!$('#drawer').classList.contains('open'));
$('#scrim').onclick = () => drawer(false);
addEventListener('hashchange', () => { drawer(false); S.place = false; render(); });
addEventListener('keydown', e => { if (e.key === 'Escape') { drawer(false); closeModal(); } });
$('#resSel').onchange = e => { S.cur = S.res.find(r => r.id === e.target.value); S.planId = null; render(); };

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
  $('#top').hidden = false; buildDrawer(); await loadRes();
}
sb.auth.getSession().then(({ data }) => start(data.session));
sb.auth.onAuthStateChange((ev, s) => {
  if (ev === 'SIGNED_IN' && S.profile && s && S.profile.id === s.user.id) return;
  if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setTimeout(() => start(s), 0);
});

// ---------- ações
document.addEventListener('click', async e => {
  if (e.target.id === 'modal') return closeModal();
  const el = e.target.closest('[data-oedit],[data-oadd],[data-unlink],[data-ounlink],[data-gal],[data-gvis],[data-gdel],[data-add],[data-edit],[data-vis],[data-del],[data-done],[data-open],[data-pick],[data-link],[data-rel],[data-deldoc],[data-delplan],[data-close],[data-place],[data-plan],[data-print],[data-hclear],[data-out]');
  if (!el) return; const d = el.dataset, done = (err, ok) => { err ? toast(err, 1) : toast(ok); render(); };
  if (d.close !== undefined) { closeModal(); await render(); if (S.back) { const b = S.back; S.back = null; openOwnerEdit(b); } }
  if (d.gal) { const [t, id] = d.gal.split(':'); if (t === 'res') S.gal = { kind: 'residence', refId: null, resId: id, title: S.res.find(x => x.id === id).name }; else S.gal = { kind: 'maintenance', refId: id, resId: S.cur.id, title: S.rows.maintenance_tasks.find(x => x.id === id).name }; gallery(); }
  if (d.gvis) { const x = S.imgs.find(i => i.id === d.gvis); const { error } = await sb.from('images').update({ visible: x.visible === false }).eq('id', x.id); if (error) toast('Não foi possível alterar.', 1); await gallery(); }
  if (d.gdel && confirm('Excluir esta imagem do sistema? O arquivo continua guardado no Cloudinary.')) { const { error } = await sb.from('images').delete().eq('id', d.gdel); if (error) toast('Não foi possível excluir.', 1); else toast('Imagem excluída.'); await gallery(); }
  if (d.add) openAdd(d.add);
  if (d.edit) { const [k, id] = d.edit.split(':'); openEdit(k, id); }
  if (d.pick) { S.cur = S.res.find(r => r.id === d.pick); S.planId = null; $('#resSel').value = d.pick; toast('Residência selecionada: ' + S.cur.name); render(); }
  if (d.vis) { const [k, id] = d.vis.split(':'), r = S.rows[k].find(x => x.id === id); const { error } = await sb.from(k).update({ visible: !r.visible }).eq('id', id); done(error && 'Não foi possível alterar.', r.visible ? 'Oculto do cliente.' : 'Visível ao cliente.'); }
  if (d.del && confirm('Excluir este registro?')) { const [k, id] = d.del.split(':'); const { error } = await sb.from(k).delete().eq('id', id); done(error && 'Não foi possível excluir.', 'Registro excluído.'); }
  if (d.deldoc && confirm('Excluir este documento?')) { const [id, p] = d.deldoc.split('|'); await sb.storage.from('documents').remove([p]); const { error } = await sb.from('documents').delete().eq('id', id); done(error && 'Não foi possível excluir.', 'Documento excluído.'); }
  if (d.delplan && confirm('Excluir esta planta e todos os pontos marcados nela?')) { const [id, p] = d.delplan.split('|'); await sb.storage.from('documents').remove([p]); const { error } = await sb.from('floorplans').delete().eq('id', id); S.planId = null; done(error && 'Não foi possível excluir.', 'Planta excluída.'); }
  if (d.open) { const { data, error } = await sb.storage.from('documents').createSignedUrl(d.open, 60); error ? toast('Não foi possível abrir.', 1) : window.open(data.signedUrl, '_blank', 'noopener'); }
  if (d.done) {
    const t = S.rows.maintenance_tasks.find(x => x.id === d.done), today = new Date().toISOString().slice(0, 10), nx = t.interval_months ? addMonths(today, +t.interval_months).toISOString().slice(0, 10) : null;
    const { error } = await sb.from('maintenance_tasks').update({ last_done: today, next_due: nx, status: nx ? 'Pendente' : 'Concluída' }).eq('id', t.id);
    if (!error) await sb.from('history_events').insert({ residence_id: S.cur.id, category: 'Manutenção', description: 'Manutenção executada: ' + t.name });
    done(error && 'Não foi possível registrar.', 'Execução registrada.');
  }
  if (d.oedit) openOwnerEdit(d.oedit);
  if (d.oadd) { const fm = el.closest('form'); S.back = fm && fm.dataset ? fm.dataset.id : null; openOwnerAdd(d.oadd); }
  if (d.unlink && confirm('Desvincular este proprietário da residência selecionada? Ele perde o acesso a ela.')) { const { error } = await sb.rpc('admin_unlink_cpf', { p_cpf: d.unlink, p_res: S.cur.id }); done(error && 'Não foi possível desvincular.', 'Proprietário desvinculado.'); }
  if (d.ounlink && confirm('Desvincular este proprietário desta residência? Ele perde o acesso a ela.')) { const [oid, rid] = d.ounlink.split(':'); const { error } = await sb.rpc('admin_unlink_cpf', { p_cpf: oid, p_res: rid }); if (error) toast('Não foi possível desvincular.', 1); else toast('Proprietário desvinculado.'); await render(); openOwnerEdit(oid); }
  if (d.link) { const { error } = await sb.rpc('admin_link_cpf', { p_cpf: d.link, p_res: S.cur.id }); done(error && 'Não foi possível vincular.', 'Proprietário vinculado à residência.'); }
  if (d.rel && confirm('Liberar este CPF? O acesso atual do cliente será removido e outro cadastro poderá usá-lo.')) { const { error } = await sb.rpc('admin_release_cpf', { p_cpf: d.rel }); done(error && 'Não foi possível liberar.', 'CPF liberado.'); }
  if (d.place !== undefined) { S.place = !S.place; render(); }
  if (d.plan && S.place) { const b = el.getBoundingClientRect(); S.pend = { x: +((e.clientX - b.left) / b.width * 100).toFixed(2), y: +((e.clientY - b.top) / b.height * 100).toFixed(2) }; modal('Novo ponto na planta', fld(['category', 'Categoria', PT_CATS]) + '<label>Identificação<input name="label" required></label><label>Detalhes<textarea name="description" rows="3"></textarea></label>', 'data-form="add:pt"', 'Salvar ponto'); }
  if (d.print !== undefined) print();
  if (d.hclear !== undefined) { S.hf = {}; render(); }
  if (d.out !== undefined) sb.auth.signOut();
});
document.addEventListener('change', e => { if (e.target.id === 'planSel') { S.planId = e.target.value; render(); } });
document.addEventListener('input', e => { const t = e.target; if (t.classList && t.classList.contains('cpf')) t.value = cpfMask(t.value); });

document.addEventListener('submit', async e => {
  const f = e.target, id = f.dataset.form; if (!id) return; e.preventDefault();
  if (id === 'gal') return uploadImages(f);
  const o = clean(Object.fromEntries(new FormData(f))), rid = S.cur && S.cur.id, [op, k] = id.split(':'); let r;
  if (id === 'hf') { S.hf = o; return render(); }
  if (id === 'ast') { r = await sb.from('service_requests').update({ status: o.status, staff_note: o.staff_note }).eq('id', f.dataset.id); if (!r.error) await sb.from('history_events').insert({ residence_id: rid, category: 'Assistência', description: 'Solicitação atualizada: ' + o.status }); }
  else if (id === 'add:res') { r = await sb.from('residences').insert(o).select().single(); if (!r.error) { closeModal(); await loadRes(r.data.id); return toast('Residência criada e selecionada.'); } }
  else if (id === 'edit:res') { r = await sb.from('residences').update(o).eq('id', f.dataset.id); if (!r.error) { closeModal(); await loadRes(f.dataset.id); return toast('Dados da residência salvos.'); } }
  else if (id === 'add:own') { const cpf = cpfDigits(o.cpf); if (!cpfOk(cpf)) return toast('CPF inválido. Confira os números.', 1); r = await sb.rpc('admin_register_cpf', { p_name: o.name, p_cpf: cpf, p_email: o.email || null }); if (!r.error && o.res_id) r = await sb.rpc('admin_link_cpf', { p_cpf: r.data, p_res: o.res_id }); }
  else if (id === 'edit:own') { const cpf = cpfDigits(o.cpf || ''); if (cpf && !cpfOk(cpf)) return toast('CPF inválido. Confira os números.', 1); r = await sb.rpc('admin_update_cpf', { p_id: f.dataset.id, p_name: o.name, p_email: o.email || null, p_cpf: cpf || null }); }
  else if (id === 'add:docs') { const file = f.file.files[0]; delete o.file; const path = `${rid}/${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`; r = await sb.storage.from('documents').upload(path, file); if (!r.error) r = await sb.from('documents').insert({ ...o, residence_id: rid, path }); }
  else if (id === 'add:qr') r = await sb.from('qr_codes').insert({ residence_id: rid, label: o.label, target_hash: QR_T[o.target] });
  else if (id === 'add:pl') { const file = f.file.files[0], path = `${rid}/planta_${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`; r = await sb.storage.from('documents').upload(path, file); if (!r.error) r = await sb.from('floorplans').insert({ residence_id: rid, title: o.title, path }); }
  else if (id === 'add:pt') r = await sb.from('plan_points').insert({ ...o, residence_id: rid, floorplan_id: S.planId, x: S.pend.x, y: S.pend.y });
  else if (op === 'add') r = await sb.from(k).insert({ ...o, residence_id: rid });
  else if (op === 'edit') r = await sb.from(k).update(o).eq('id', f.dataset.id);
  if (r && r.error) return toast('Não foi possível salvar: ' + r.error.message, 1);
  closeModal(); toast('Salvo com sucesso.'); await render();
  if (id === 'add:own' && S.back) { const b = S.back; S.back = null; openOwnerEdit(b); }
});
